import { PrismaClient } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { extractHistoricalData } from '../analysis/data-extraction'
import { processModelDemandByLocation } from './location-demand-processing'
import type { ModelDemandByLocationResponse } from './visualization.types'

const prisma = new PrismaClient()

/**
 * Generates and stores model demand by location data
 * This function aggregates historical data with forecasts to create a comprehensive view
 * of model demand patterns across different locations
 */
export async function generateModelDemandByLocation(options?: {
  clearExisting?: boolean
  generateNew?: boolean
}): Promise<{ success: boolean; message: string }> {
  console.log('Starting model demand by location operation')

  try {
    // Clear existing data if requested
    if (options?.clearExisting) {
      console.log('Clearing existing model demand by location data...')
      const deleteResult = await prisma.modelDemandByLocation.deleteMany({})
      console.log(`Deleted ${deleteResult.count} existing records`)

      // If we're only clearing without generating new data, return early
      if (options.generateNew === false) {
        return {
          success: true,
          message: 'Successfully cleared model demand by location data',
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
    console.log('Processing model demand by location data...')
    const modelDemandData = await processModelDemandByLocation(
      historicalData,
      forecasts
    )

    // Save to database
    console.log('Saving model demand by location data to database...')
    await saveModelDemandByLocation(modelDemandData)

    console.log('Model demand by location generation complete!')
    return {
      success: true,
      message: 'Successfully generated model demand by location data',
    }
  } catch (error) {
    console.error('Failed to generate model demand by location data:', error)
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * Saves model demand by location data to the database
 */
async function saveModelDemandByLocation(
  data: ModelDemandByLocationResponse
): Promise<void> {
  // Set all existing records to non-default
  await prisma.modelDemandByLocation.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  })

  // Create the new record
  await prisma.modelDemandByLocation.create({
    data: {
      isDefault: true,
      locationData: data.locations as unknown as Prisma.InputJsonValue,
      highlights: data.highlights as unknown as Prisma.InputJsonValue,
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
      '--clear and --no-gen flags detected, will only clear existing data without generating new'
    )
  } else if (options.clearExisting) {
    console.log(
      '--clear flag detected, will clear existing data before generating new'
    )
  }

  generateModelDemandByLocation(options)
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
