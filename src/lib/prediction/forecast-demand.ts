// src/scripts/generate-forecasts.ts
import { PrismaClient } from '@prisma/client'
import { extractHistoricalData } from '~/lib/analysis/data-extraction'
import { getLatestAnalysisResults } from '~/lib/analysis/storage'
import { prepareDemandPredictionData } from '~/lib/prediction/demand-preparation'
import { prophetClient } from '~/lib/prediction/prophet-client'
import {
  LOCATION_IDS,
  TRACTOR_MODEL_IDS,
  type LocationId,
  type TractorModelId,
} from '~/lib/types/types'
import { type Prisma } from '@prisma/client'
import type {
  RawHistoricalData,
  AnalysisResults,
  DemandPatternAnalysis,
} from '~/lib/types/analytics.types'

const prisma = new PrismaClient()

interface ForecastGenerationOptions {
  clearExisting?: boolean
}

interface ForecastGenerationResults {
  success: number
  failed: number
  combinations: string[]
  skipped: number
  skippedCombinations: string[]
}

/**
 * Calculates the average value from an array of forecast points
 */
function calculateAverage(forecastPoints: { value: number }[]): number {
  if (forecastPoints.length === 0) return 0
  const sum = forecastPoints.reduce((acc, point) => acc + point.value, 0)
  return sum / forecastPoints.length
}

/**
 * Clears existing forecasts from the database
 */
async function clearExistingForecasts(): Promise<number> {
  console.log('Clearing existing forecasts...')
  const deleteResult = await prisma.demandForecast.deleteMany({})
  console.log(`Deleted ${deleteResult.count} existing forecast records`)
  return deleteResult.count
}

/**
 * Gets existing forecasts to avoid regenerating them
 */
async function getExistingForecasts(): Promise<Set<string>> {
  console.log('Checking for existing forecasts...')
  const existingForecasts = await prisma.demandForecast.findMany({
    select: {
      locationId: true,
      modelId: true,
      forecastData: true,
      futureMti: true,
    },
  })

  // Create a set of existing location-model pairs for quick lookup
  const existingPairs = new Set(
    existingForecasts.map((f) => `${f.locationId}-${f.modelId}`)
  )

  console.log(`Found ${existingForecasts.length} existing forecasts`)

  // Extract MTI values from the first forecast if available
  let globalMtiValues: number[] | undefined = undefined

  if (existingForecasts.length > 0 && existingForecasts[0].futureMti) {
    const mtiValues = existingForecasts[0].futureMti as unknown as number[]

    if (
      Array.isArray(mtiValues) &&
      mtiValues.every((value) => typeof value === 'number')
    ) {
      globalMtiValues = mtiValues
      console.log(
        `Using MTI values from existing forecast: ${globalMtiValues.length} values`
      )
    } else {
      console.warn(
        'Found futureMti in existing forecast but it was not a valid number array'
      )
    }
  }

  return existingPairs
}

/**
 * Generates and stores a forecast for a specific location/model combination
 */
async function generateAndStoreForecast(
  locationId: LocationId,
  modelId: TractorModelId,
  raw: RawHistoricalData,
  analysisResults: AnalysisResults,
  futurePeriods: number,
  globalMtiValues?: number[]
): Promise<boolean> {
  try {
    console.log(`Generating forecast for ${locationId}/${modelId}...`)

    // Prepare prediction request
    const predictionRequest = prepareDemandPredictionData(
      raw,
      analysisResults.demandPatterns,
      futurePeriods,
      locationId,
      modelId
    )

    // Add MTI values if we have them from a previous forecast
    if (globalMtiValues) {
      if (!predictionRequest.futureRegressors) {
        predictionRequest.futureRegressors = {}
      }
      predictionRequest.futureRegressors.mti = globalMtiValues
    }

    // Get prediction from Prophet service
    const prediction = await prophetClient.predictDemand(predictionRequest)

    // Extract the historical data used for this specific combination
    const historicalData = predictionRequest.historicalData

    // Store in database with separate arrays for MTI and inflation
    await prisma.demandForecast.create({
      data: {
        name: `${locationId}-${modelId} Forecast`,
        locationId,
        modelId,
        isDefault: true,
        createdAt: new Date(),
        summary: {
          next30DaysAvg: calculateAverage(prediction.forecast.slice(0, 30)),
          next90DaysAvg: calculateAverage(prediction.forecast),
          peakDemand: Math.max(...prediction.forecast.map((f) => f.value)),
          seasonalityStrength: prediction.metadata?.seasonalityStrength ?? 0,
          trendStrength: prediction.metadata?.trendStrength ?? 0,
        },
        // Convert arrays to Prisma-compatible JSON format
        forecastData: prediction.forecast as unknown as Prisma.InputJsonValue,
        historicalData: historicalData as unknown as Prisma.InputJsonValue,
        // Store regressors as native arrays
        futureMti: prediction.futureRegressors?.mti || [],
        futureInflation: prediction.futureRegressors?.inflation || [],
      },
    })

    console.log(`Successfully stored forecast for ${locationId}/${modelId}`)
    return true
  } catch (error) {
    console.error(`Failed to generate forecast for ${locationId}/${modelId}:`)
    console.error('Error details:', error)

    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    return false
  }
}

/**
 * Generates and stores forecasts for all location/model combinations
 */
async function generateAndStoreForecastsForAllCombinations(
  options?: ForecastGenerationOptions
): Promise<ForecastGenerationResults> {
  console.log(
    'Starting forecast generation for all location/model combinations'
  )

  try {
    // Get historical data and analysis results
    const { raw } = await extractHistoricalData()
    const analysisResults = await getLatestAnalysisResults()

    if (!analysisResults?.demandPatterns) {
      throw new Error('No demand pattern analysis available')
    }

    const futurePeriods = 365

    // Clear existing forecasts if requested
    if (options?.clearExisting) {
      await clearExistingForecasts()
    }

    // Track successful and failed forecasts
    const results: ForecastGenerationResults = {
      success: 0,
      failed: 0,
      combinations: [],
      skipped: 0,
      skippedCombinations: [],
    }

    // Get existing forecasts to avoid regenerating them
    const existingPairs = await getExistingForecasts()

    // Store MTI regressor values to reuse across all forecasts
    const globalMtiValues: number[] | undefined = undefined

    // Generate forecasts for each location/model combination
    for (const locationId of LOCATION_IDS) {
      for (const modelId of TRACTOR_MODEL_IDS) {
        // Skip if we already have a forecast for this combination
        const pairKey = `${locationId}-${modelId}`
        if (existingPairs.has(pairKey)) {
          console.log(`Skipping existing forecast for ${locationId}/${modelId}`)
          results.skipped++
          results.skippedCombinations.push(`${locationId}/${modelId}`)
          continue
        }

        const success = await generateAndStoreForecast(
          locationId,
          modelId,
          raw,
          analysisResults,
          futurePeriods,
          globalMtiValues
        )

        if (success) {
          results.success++
          results.combinations.push(`${locationId}/${modelId}`)
        } else {
          results.failed++
          console.error('Terminating process due to forecast generation error')
          process.exit(1)
        }
      }
    }

    console.log('Forecast generation complete!')
    console.log(`Successfully generated ${results.success} forecasts`)
    console.log(`Failed to generate ${results.failed} forecasts`)
    console.log(`Skipped ${results.skipped} forecasts`)

    return results
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Export the function for use in other modules
export { generateAndStoreForecastsForAllCombinations }

// If this script is run directly (not imported)
const isMainModule = import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  // Check for command line arguments
  const shouldClear = process.argv.includes('--clear')

  if (shouldClear) {
    console.log(
      '--clear flag detected, will clear existing forecasts before generating new ones'
    )
  }

  generateAndStoreForecastsForAllCombinations({ clearExisting: shouldClear })
    .then((results) => {
      console.log('Script completed successfully')
      console.log(results)
      process.exit(0)
    })
    .catch((error) => {
      console.error('Script failed:', error)
      process.exit(1)
    })
}
