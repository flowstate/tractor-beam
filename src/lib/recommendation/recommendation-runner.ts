import { PrismaClient } from '@prisma/client'
import { makeEmptyRecommendedStrategy } from '../utils'
import { calculateAllLocationsComponentDemand } from './component-demand'
import { createQuarterlyCards, saveCardCollection } from './create-cards'
import { extractCurrentStrategy } from './current-strategy'
import { calculateRecommendationImpact } from './impact-calculator'
import { generateReasonedStrategy } from './reasoning/reasoning-generator'
import type { OverallRecommendedStrategy } from './recommendation.types'
import { calculateEnhancedSupplierAllocation } from './supplier-allocation'

const prisma = new PrismaClient()

/**
 * Runs the full recommendation pipeline
 * This function orchestrates the entire process from extracting current strategy
 * to generating and saving recommendation cards
 */
export async function runRecommendationPipeline(options?: {
  clearExisting?: boolean
  generateNew?: boolean
}): Promise<{ success: boolean; message: string }> {
  console.log('Starting recommendation pipeline...')

  try {
    // Clear existing data if requested
    if (options?.clearExisting) {
      console.log('Clearing existing recommendation cards...')
      const deleteResult = await prisma.quarterlyRecommendationCard.deleteMany(
        {}
      )
      console.log(`Deleted ${deleteResult.count} existing recommendation cards`)

      // If we're only clearing without generating new data, return early
      if (options.generateNew === false) {
        return {
          success: true,
          message: 'Successfully cleared recommendation cards',
        }
      }
    }

    // Step 1: Extract current strategy
    console.log('Extracting current strategy...')
    const currentStrategy = await extractCurrentStrategy()

    // Step 2: Calculate component demand for all locations
    console.log('Calculating component demand for all locations...')
    const allComponentDemand = await calculateAllLocationsComponentDemand()

    // After calculating component demand
    console.log('All component demand structure:')
    console.log('Locations:', Array.from(allComponentDemand.keys()))
    for (const [locationId, componentDemands] of allComponentDemand.entries()) {
      console.log(
        `Components for ${locationId}:`,
        Array.from(componentDemands.keys())
      )
    }

    // Step 3: Generate recommended strategies for each location and component
    console.log('Generating recommended strategies...')
    const recommendedStrategy: OverallRecommendedStrategy =
      makeEmptyRecommendedStrategy()

    // Process each location
    for (const [locationId, componentDemands] of allComponentDemand.entries()) {
      const typedLocationId = locationId

      // Process each component at this location
      for (const [componentId, demand] of componentDemands.entries()) {
        const typedComponentId = componentId

        console.log(`Processing ${typedComponentId} at ${typedLocationId}...`)
        console.log(
          'Demand data:',
          JSON.stringify(demand, null, 2).substring(0, 200) + '...'
        )

        try {
          // Calculate enhanced supplier allocation
          const allocationStrategy = await calculateEnhancedSupplierAllocation(
            typedComponentId,
            typedLocationId,
            demand
          )

          // Generate reasoned strategy
          const reasonedStrategy =
            await generateReasonedStrategy(allocationStrategy)

          // After creating the reasoned strategy
          console.log(
            `Created strategy for ${typedComponentId} at ${typedLocationId}`
          )
          console.log('Strategy locationId:', reasonedStrategy.locationId)
          console.log('Strategy componentId:', reasonedStrategy.componentId)

          // Add to overall recommended strategy
          recommendedStrategy[typedLocationId][typedComponentId] =
            reasonedStrategy
        } catch (error) {
          console.error(
            `Error processing ${typedComponentId} at ${typedLocationId}:`,
            error
          )
          // Continue with other components
        }
      }
    }

    // Step 4: Calculate recommendation impact
    console.log('Calculating recommendation impact...')
    const impactCalculation = await calculateRecommendationImpact(
      currentStrategy,
      recommendedStrategy
    )

    // Step 5: Create quarterly cards
    console.log('Creating quarterly recommendation cards...')
    const cards = createQuarterlyCards(impactCalculation)
    cards.heartland['ENGINE-A'].forEach((card) => {
      console.log(
        `Created card for locationId: heartland, componentId: ENGINE-A, quarter: ${card.quarter}, year: ${card.year}`
      )
    })
    // Step 6: Save card collection to database
    console.log('Saving recommendation cards to database...')
    await saveCardCollection(cards)

    console.log('Recommendation pipeline completed successfully!')
    return {
      success: true,
      message: 'Successfully generated and saved recommendation cards',
    }
  } catch (error) {
    console.error('Failed to run recommendation pipeline:', error)
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    }
  } finally {
    await prisma.$disconnect()
  }
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

  runRecommendationPipeline(options)
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
