import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { extractHistoricalData } from '../analysis/data-extraction'
import {
  aggregateQuarterlyDemand,
  calculateYearOverYearGrowth,
  generateHighlights,
  formatQuarterlyResponse,
} from './quarterly-demand-processing'
import type { QuarterlyDemandResponse } from './visualization.types'

const prisma = new PrismaClient()

/**
 * Generates and stores quarterly demand outlook data
 * This function aggregates historical data with forecasts to create a comprehensive view
 * of quarterly demand patterns and predictions
 */
export async function generateQuarterlyDemandOutlook(options?: {
  clearExisting?: boolean
  generateNew?: boolean
}): Promise<{ success: boolean; message: string }> {
  console.log('Starting quarterly demand outlook operation')

  try {
    // Clear existing outlooks if requested
    if (options?.clearExisting) {
      console.log('Clearing existing quarterly demand outlooks...')
      const deleteResult = await prisma.quarterlyDemandOutlook.deleteMany({})
      console.log(`Deleted ${deleteResult.count} existing outlook records`)

      // If we're only clearing without generating new data, return early
      if (options.generateNew === false) {
        return {
          success: true,
          message: 'Successfully cleared quarterly demand outlooks',
        }
      }
    }

    // Get historical data
    console.log('Extracting historical data...')
    const historicalData = await extractHistoricalData()

    // Get the latest demand forecasts
    console.log('Retrieving demand forecasts...')
    const forecasts = await prisma.demandForecast.findMany({
      where: {
        isDefault: true,
      },
    })

    if (forecasts.length === 0) {
      console.warn('No demand forecasts found. Run forecast generation first.')
      return {
        success: false,
        message: 'No demand forecasts found. Run forecast generation first.',
      }
    }

    // Process the data
    console.log('Aggregating quarterly demand data...')
    const quarterlyData = await aggregateQuarterlyDemand(
      historicalData,
      forecasts
    )

    // Calculate YoY growth
    console.log('Calculating year-over-year growth...')
    const yoyGrowth = calculateYearOverYearGrowth(quarterlyData)

    // Generate highlights based on the data
    console.log('Generating insights and highlights...')
    const highlights = generateHighlights(quarterlyData, yoyGrowth)

    // Format the response
    const outlookData = formatQuarterlyResponse(
      quarterlyData,
      yoyGrowth,
      highlights
    )

    // Save to database
    console.log('Saving quarterly demand outlook to database...')
    await saveQuarterlyDemandOutlook(outlookData)

    console.log('Quarterly demand outlook generation complete!')
    return {
      success: true,
      message: 'Successfully generated quarterly demand outlook',
    }
  } catch (error) {
    console.error('Failed to generate quarterly demand outlook:', error)
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Saves quarterly demand outlook data to the database
 */
async function saveQuarterlyDemandOutlook(
  data: QuarterlyDemandResponse
): Promise<void> {
  // Set all existing outlooks to non-default
  await prisma.quarterlyDemandOutlook.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  })

  // Create the new outlook record
  await prisma.quarterlyDemandOutlook.create({
    data: {
      isDefault: true,
      quarters: data.quarters as unknown as Prisma.InputJsonValue,
      historicalDemand: data.demandData
        .historical as unknown as Prisma.InputJsonValue,
      forecastDemand: data.demandData
        .forecast as unknown as Prisma.InputJsonValue,
      upperBound: data.demandData
        .upperBound as unknown as Prisma.InputJsonValue,
      lowerBound: data.demandData
        .lowerBound as unknown as Prisma.InputJsonValue,
      yoyGrowth: data.yoyGrowth as unknown as Prisma.InputJsonValue,
      keyPatterns: data.highlights
        .keyPatterns as unknown as Prisma.InputJsonValue,
      predictionBasis: data.highlights
        .predictionBasis as unknown as Prisma.InputJsonValue,
      businessImplications: data.highlights
        .businessImplications as unknown as Prisma.InputJsonValue,
      seasonalPeaks: data.seasonalPeaks as unknown as Prisma.InputJsonValue,
      confidenceInterval: data.modelMetadata.confidenceInterval,
      seasonalityStrength: data.modelMetadata.seasonalityStrength,
      trendStrength: data.modelMetadata.trendStrength,
      rmse: data.modelMetadata.rmse,
    },
  })
}

// If this script is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const options: {
    clearExisting?: boolean
    generateNew?: boolean
  } = {
    clearExisting: args.includes('--clear'),
    generateNew: !args.includes('--no-gen'), // Default to true unless --no-gen is specified
  }

  // If we're just clearing without generating, log that
  if (options.clearExisting && !options.generateNew) {
    console.log(
      '--clear and --no-gen flags detected, will only clear existing outlooks without generating new ones'
    )
  } else if (options.clearExisting) {
    console.log(
      '--clear flag detected, will clear existing outlooks before generating new ones'
    )
  }

  generateQuarterlyDemandOutlook(options)
    .then((result) => {
      if (result.success) {
        console.log('Script completed successfully')
        process.exit(0)
      } else {
        console.error('Script failed:', result.message)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('Script failed with unexpected error:', error)
      process.exit(1)
    })
}
