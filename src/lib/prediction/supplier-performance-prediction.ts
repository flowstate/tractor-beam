import { PrismaClient } from '@prisma/client'
import type { SupplierId, ComponentId } from '../types/types'
import { SUPPLIERS } from '../constants'
import { prophetClient } from './prophet-client'
import { getLatestAnalysisResults } from '../analysis/storage'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import fs from 'fs'
import path from 'path'
import type {
  SavedSupplierPerformanceForecast,
  SupplierPerformanceDataPoint,
  SupplierPerformancePredictionRequest,
  SupplierPerformancePredictionResponse,
} from './prediction.types'
import type { AnalysisResults } from '../types/analytics.types'

// Define a type for quality trends to avoid using 'any'
interface QualityTrend {
  direction: string
  magnitude: number
  consistency: number
  projection: {
    nextQuarter: string
    projectedQuality: number
    confidence: number
  }
  visualizationData: {
    timePoints: string[]
    qualityValues: number[]
    leadTimeValues: number[]
    combinedValues: number[]
  }
  combinedQuality: Record<string, number>
  byQuarter?: Record<string, { direction: string; magnitude: number }>
}

const prisma = new PrismaClient()

// ===== DATA PREPARATION =====

/**
 * Extracts supplier quality trends from analysis results
 */
async function extractSupplierQualityTrends(
  supplierId: SupplierId
): Promise<QualityTrend> {
  const analysisResults = await getLatestAnalysisResults()

  if (!analysisResults) {
    throw new Error('No analysis results found. Run analysis first.')
  }

  const supplierPerformance = analysisResults.supplierPerformance

  if (!supplierPerformance?.qualityTrends?.bySupplierId) {
    throw new Error('Analysis results missing supplier quality trends data')
  }

  const qualityTrends =
    supplierPerformance.qualityTrends.bySupplierId[supplierId]

  if (!qualityTrends) {
    throw new Error(`No quality trend data found for supplier ${supplierId}`)
  }

  return qualityTrends
}

/**
 * Interpolates quarterly data points to daily data points
 */
function interpolateQuarterlyToDaily(
  timePoints: string[],
  values: number[]
): { dates: string[]; values: number[] } {
  if (timePoints.length < 2) {
    throw new Error('Need at least two data points for interpolation')
  }

  // Parse quarter strings to actual dates
  const quarterDates: Date[] = timePoints.map((qStr) => {
    const [yearStr, quarterStr] = qStr.split('-')
    const year = parseInt(yearStr)
    const quarter = parseInt(quarterStr.substring(1))
    // Use middle of quarter as the reference point
    const month = (quarter - 1) * 3 + 1 // Middle month of quarter
    return new Date(year, month, 15) // Middle of middle month
  })

  // Create array of all days between first and last quarter
  const startDate = new Date(quarterDates[0])
  startDate.setDate(1) // First day of the quarter's first month
  startDate.setMonth(Math.floor(startDate.getMonth() / 3) * 3) // First month of quarter

  const endDate = new Date(quarterDates[quarterDates.length - 1])
  endDate.setMonth(Math.floor(endDate.getMonth() / 3) * 3 + 2) // Last month of quarter
  endDate.setDate(
    new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()
  ) // Last day of month

  const allDates: Date[] = []
  const allDateStrs: string[] = []
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    allDates.push(new Date(d))
    allDateStrs.push(d.toISOString().split('T')[0])
  }

  // Calculate time values in milliseconds for interpolation
  const timeValues: number[] = quarterDates.map((d) => d.getTime())
  const allTimeValues: number[] = allDates.map((d) => d.getTime())

  // Use linear interpolation
  const interpolatedValues: number[] = []

  for (const timeValue of allTimeValues) {
    // Find the segment this time belongs to
    let segmentIndex = 0
    while (
      segmentIndex < timeValues.length - 1 &&
      timeValue > timeValues[segmentIndex + 1]
    ) {
      segmentIndex++
    }

    if (segmentIndex >= timeValues.length - 1) {
      // Beyond the last point, use the last value
      interpolatedValues.push(values[values.length - 1])
      continue
    }

    // Linear interpolation
    const t1 = timeValues[segmentIndex]
    const t2 = timeValues[segmentIndex + 1]
    const v1 = values[segmentIndex]
    const v2 = values[segmentIndex + 1]

    const t = (timeValue - t1) / (t2 - t1) // Normalized time (0-1)
    const interpolatedValue = v1 + t * (v2 - v1)

    // Ensure values stay within bounds
    interpolatedValues.push(Math.max(0.6, Math.min(1.0, interpolatedValue)))
  }

  return { dates: allDateStrs, values: interpolatedValues }
}

/**
 * Creates historical data points from quality trends
 */
function createHistoricalDataPoints(
  supplierId: SupplierId,
  qualityTrends: QualityTrend
): SupplierPerformanceDataPoint[] {
  const timePoints = qualityTrends.visualizationData.timePoints
  const qualityValues = qualityTrends.visualizationData.qualityValues
  const leadTimeValues = qualityTrends.visualizationData.leadTimeValues

  const qualityInterpolation = interpolateQuarterlyToDaily(
    timePoints,
    qualityValues
  )

  const leadTimeInterpolation = interpolateQuarterlyToDaily(
    timePoints,
    leadTimeValues
  )

  // Create data points using interpolated values
  const historicalData: SupplierPerformanceDataPoint[] = []
  for (let i = 0; i < qualityInterpolation.dates.length; i++) {
    historicalData.push({
      date: qualityInterpolation.dates[i],
      supplierId,
      qualityRating: qualityInterpolation.values[i],
      leadTimeReliability: leadTimeInterpolation.values[i],
    })
  }

  // Sort by date
  return historicalData.sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Saves data to a JSON file for debugging purposes
 */
function saveDataForDebugging(
  supplierId: SupplierId,
  historicalData: SupplierPerformanceDataPoint[],
  qualityTrends: QualityTrend
): void {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const filePath = path.join(
    dataDir,
    `supplier_performance_input_${supplierId}.json`
  )

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        historicalData,
        trendInfo: {
          direction: qualityTrends.direction,
          magnitude: qualityTrends.magnitude,
          consistency: qualityTrends.consistency,
          projection: qualityTrends.projection,
        },
      },
      null,
      2
    )
  )
}

/**
 * Prepares historical supplier performance data for prediction
 * @param supplierId The supplier to predict performance for
 * @param futurePeriods Number of days to predict into the future
 * @returns A request object ready to send to Prophet
 */
export async function prepareSupplierPerformanceData(
  supplierId: SupplierId,
  futurePeriods = 90
): Promise<SupplierPerformancePredictionRequest> {
  console.log(`Preparing data for supplier ${supplierId}`)

  try {
    const qualityTrends = await extractSupplierQualityTrends(supplierId)
    const historicalData = createHistoricalDataPoints(supplierId, qualityTrends)

    console.log(`Prepared ${historicalData.length} data points for prediction`)

    saveDataForDebugging(supplierId, historicalData, qualityTrends)

    return {
      historicalData,
      futurePeriods,
      supplierId,
    }
  } catch (error) {
    console.error(`Failed to prepare data for supplier ${supplierId}:`, error)
    throw error
  }
}

/**
 * Predicts future supplier performance using Prophet
 * @param supplierId The supplier to predict performance for
 * @param futurePeriods Number of days to predict into the future
 * @returns Predicted supplier performance
 */
export async function predictSupplierPerformance(
  supplierId: SupplierId,
  futurePeriods = 90
): Promise<SupplierPerformancePredictionResponse> {
  // Prepare the data for prediction
  const predictionRequest = await prepareSupplierPerformanceData(
    supplierId,
    futurePeriods
  )

  // Call Prophet service to get predictions
  return prophetClient.predictSupplierPerformance(predictionRequest)
}

/**
 * Checks if forecasts already exist for suppliers
 */
async function getExistingSupplierForecasts(): Promise<Set<string>> {
  console.log('Checking for existing supplier performance forecasts...')

  const existingForecasts = await prisma.supplierPerformanceForecast.findMany({
    select: {
      supplierId: true,
    },
    distinct: ['supplierId'],
  })

  const existingSuppliers = new Set(existingForecasts.map((f) => f.supplierId))

  console.log(`Found forecasts for ${existingSuppliers.size} suppliers`)

  return existingSuppliers
}

/**
 * Generates and stores a forecast for a single supplier
 */
async function generateAndStoreSupplierForecast(
  supplierId: SupplierId,
  futurePeriods: number
): Promise<boolean> {
  try {
    console.log(`Generating forecast for ${supplierId}...`)

    // Get prediction from Prophet service
    const prediction = await predictSupplierPerformance(
      supplierId,
      futurePeriods
    )

    // Prepare the data for storage
    const predictionRequest = await prepareSupplierPerformanceData(
      supplierId,
      futurePeriods
    )

    // Store in database
    await prisma.supplierPerformanceForecast.create({
      data: {
        supplierId,
        createdAt: new Date(),
        qualityForecast:
          prediction.qualityForecast as unknown as InputJsonValue,
        leadTimeForecast:
          prediction.leadTimeForecast as unknown as InputJsonValue,
        historicalData:
          predictionRequest.historicalData as unknown as InputJsonValue,
      },
    })

    console.log(`Successfully stored forecast for ${supplierId}`)
    return true
  } catch (error) {
    console.error(`Failed to generate forecast for ${supplierId}:`, error)
    return false
  }
}

/**
 * Generates and stores supplier performance forecasts for all suppliers
 * @param options Optional parameters
 * @returns Results of the forecast generation
 */
export async function generateAndStoreSupplierPerformanceForecasts(options?: {
  clearExisting?: boolean
  futurePeriods?: number
}): Promise<{
  success: number
  failed: number
  suppliers: string[]
  skipped: number
  skippedSuppliers: string[]
}> {
  console.log('Starting supplier performance forecast generation')

  try {
    // Clear existing forecasts if requested
    if (options?.clearExisting) {
      console.log('Clearing existing supplier performance forecasts...')
      const deleteResult = await prisma.supplierPerformanceForecast.deleteMany(
        {}
      )
      console.log(`Deleted ${deleteResult.count} existing forecast records`)
    }

    // Track results
    const results = {
      success: 0,
      failed: 0,
      suppliers: [] as string[],
      skipped: 0,
      skippedSuppliers: [] as string[],
    }

    // Get existing forecasts to avoid regenerating them
    const existingSuppliers = await getExistingSupplierForecasts()

    // Get all suppliers from SUPPLIERS constant
    const supplierIds = Object.keys(SUPPLIERS) as SupplierId[]
    console.log(`Found ${supplierIds.length} suppliers to process`)

    // Generate forecasts for each supplier
    for (const supplierId of supplierIds) {
      // Skip if we already have a forecast for this supplier
      if (existingSuppliers.has(supplierId)) {
        console.log(`Skipping existing forecast for ${supplierId}`)
        results.skipped++
        results.skippedSuppliers.push(supplierId)
        continue
      }

      const success = await generateAndStoreSupplierForecast(
        supplierId,
        options?.futurePeriods ?? 181
      )

      if (success) {
        results.success++
        results.suppliers.push(supplierId)
      } else {
        results.failed++
      }
    }

    console.log('Supplier performance forecast generation complete!')
    console.log(`Successfully generated ${results.success} forecasts`)
    console.log(`Failed to generate ${results.failed} forecasts`)
    console.log(`Skipped ${results.skipped} forecasts`)

    return results
  } finally {
    // No need to disconnect from Prisma here as it might be used elsewhere
  }
}

/**
 * Gets the latest supplier performance forecast for a specific supplier
 * @param supplierId The supplier ID
 * @returns The latest forecast or null if none exists
 */
export async function getLatestSupplierPerformanceForecast(
  supplierId: SupplierId
): Promise<SavedSupplierPerformanceForecast | null> {
  const forecast = await prisma.supplierPerformanceForecast.findFirst({
    where: {
      supplierId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return forecast as unknown as SavedSupplierPerformanceForecast | null
}
