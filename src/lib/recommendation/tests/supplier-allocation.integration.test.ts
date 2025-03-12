import { describe, it, expect, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { InputJsonValue } from '@prisma/client/runtime/library'
import {
  type SupplierId,
  type ComponentId,
  type LocationId,
  type TractorModelId,
} from '../../types/types'
import { SUPPLIERS, TRACTOR_MODELS, LOCATIONS } from '../../constants'
import { calculateComponentDemand } from '../component-demand'
import { scoreAllSuppliers } from '../supplier-scoring'
import { calculateSupplierAllocation } from '../supplier-allocation'
import {
  prepareSupplierPerformanceData,
  predictSupplierPerformance,
} from '../../prediction/supplier-performance-prediction'

const prisma = new PrismaClient()

// Initial test configuration - we'll update these if needed
let TEST_LOCATION_ID = 'west' as LocationId
let TEST_COMPONENT_ID = 'ENGINE-B' as ComponentId

async function cleanupExistingTestData() {
  console.log('Cleaning up existing test data...')

  // Delete supplier performance forecasts
  const deletedForecasts = await prisma.supplierPerformanceForecast.deleteMany(
    {}
  )
  console.log(
    `Deleted ${deletedForecasts.count} supplier performance forecasts`
  )

  return { deletedForecasts }
}

describe('Supplier Allocation Integration', () => {
  // Skip these tests if we're in CI or if SKIP_INTEGRATION is set
  const shouldSkip =
    process.env.CI === 'true' || process.env.SKIP_INTEGRATION === 'true'

  // This ensures we have analysis data before running tests and finds a valid component-location pair
  beforeAll(async () => {
    if (shouldSkip) return

    // Clean up existing test data first
    if (process.env.CLEANUP_TEST_DATA !== 'false') {
      await cleanupExistingTestData()
    }

    // Check if we have analysis data
    const analysisCount = await prisma.supplyChainAnalysis.count()
    if (analysisCount === 0) {
      console.warn('⚠️ No supply chain analysis data found. Tests may fail.')
    }

    // Find a valid component-location pair that has suppliers
    let foundValidPair = false

    // Try each location
    for (const locationId of Object.keys(LOCATIONS) as LocationId[]) {
      // Get suppliers for this location
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { suppliers: true },
      })

      if (!location) continue

      const locationSuppliers = location.suppliers.map(
        (s) => s.supplierId
      ) as SupplierId[]

      // Try each component
      for (const componentId of Object.keys(TRACTOR_MODELS).flatMap(
        (modelId) => TRACTOR_MODELS[modelId as TractorModelId].components
      ) as ComponentId[]) {
        // Check if any suppliers at this location provide this component
        const relevantSuppliers = locationSuppliers.filter((supplierId) =>
          SUPPLIERS[supplierId]?.components.some(
            (c) => c.componentId === componentId
          )
        )

        if (relevantSuppliers.length > 0) {
          // Found a valid pair!
          TEST_LOCATION_ID = locationId
          TEST_COMPONENT_ID = componentId
          foundValidPair = true
          console.log(
            `Found valid test pair: Location=${locationId}, Component=${componentId}`
          )
          console.log(`Suppliers: ${relevantSuppliers.join(', ')}`)
          break
        }
      }

      if (foundValidPair) break
    }

    if (!foundValidPair) {
      console.warn(
        '⚠️ Could not find a valid component-location pair with suppliers. Tests will fail.'
      )
    }

    // Check if we have forecasts for the test models
    const forecastCount = await prisma.demandForecast.count({
      where: {
        locationId: TEST_LOCATION_ID,
        modelId: {
          in: Object.entries(TRACTOR_MODELS)
            .filter(([_, model]) =>
              model.components.includes(TEST_COMPONENT_ID)
            )
            .map(([id]) => id),
        },
      },
    })

    if (forecastCount === 0) {
      console.warn(
        '⚠️ No demand forecasts found for test models. Tests may fail.'
      )
      console.warn(
        'Run npx ts-node src/lib/prediction/forecast-demand.ts first'
      )
    }
  })

  it('should calculate component demand', async () => {
    if (shouldSkip) {
      console.log('Skipping integration test in CI environment')
      return
    }

    const demand = await calculateComponentDemand(
      TEST_LOCATION_ID,
      TEST_COMPONENT_ID
    )

    expect(demand).toBeDefined()
    expect(demand.componentId).toBe(TEST_COMPONENT_ID)
    expect(demand.locationId).toBe(TEST_LOCATION_ID)
    expect(demand.quarterlyDemand.length).toBeGreaterThan(0)

    // Log the demand for visibility
    console.log(
      `Component demand for ${TEST_COMPONENT_ID} at ${TEST_LOCATION_ID}:`
    )
    console.log(`- Quarters: ${demand.quarterlyDemand.length}`)
    console.log(
      `- First quarter demand: ${demand.quarterlyDemand[0]?.totalDemand || 'N/A'} units`
    )
  })

  it('should generate supplier performance predictions', async () => {
    if (shouldSkip) return

    // Get suppliers for this component at this location
    const location = await prisma.location.findUnique({
      where: { id: TEST_LOCATION_ID },
      select: { suppliers: true },
    })

    expect(location).toBeDefined()

    const locationSuppliers = location!.suppliers.map(
      (s) => s.supplierId
    ) as SupplierId[]

    // Filter suppliers that provide this component
    const relevantSuppliers = locationSuppliers.filter((supplierId) =>
      SUPPLIERS[supplierId]?.components.some(
        (c) => c.componentId === TEST_COMPONENT_ID
      )
    )

    expect(relevantSuppliers.length).toBeGreaterThan(0)
    console.log(
      `Found ${relevantSuppliers.length} suppliers for component ${TEST_COMPONENT_ID}`
    )

    // Test with the first supplier
    const testSupplierId = relevantSuppliers[0]

    // Prepare data for Prophet
    const predictionRequest = await prepareSupplierPerformanceData(
      testSupplierId,
      TEST_COMPONENT_ID,
      90
    )

    expect(predictionRequest.historicalData.length).toBeGreaterThan(0)
    console.log(
      `Prepared ${predictionRequest.historicalData.length} data points for supplier ${testSupplierId}`
    )

    // Get prediction from Prophet service
    const prediction = await predictSupplierPerformance(
      testSupplierId,
      TEST_COMPONENT_ID,
      90
    )

    expect(prediction).toBeDefined()
    expect(prediction.qualityForecast.length).toBeGreaterThan(0)
    expect(prediction.leadTimeForecast.length).toBeGreaterThan(0)

    console.log(
      `Received prediction with ${prediction.qualityForecast.length} quality points and ${prediction.leadTimeForecast.length} lead time points`
    )

    // Store the prediction
    const savedForecast = await prisma.supplierPerformanceForecast.create({
      data: {
        supplierId: testSupplierId,
        componentId: TEST_COMPONENT_ID,
        createdAt: new Date(),
        qualityForecast:
          prediction.qualityForecast as unknown as InputJsonValue,
        leadTimeForecast:
          prediction.leadTimeForecast as unknown as InputJsonValue,
        historicalData:
          predictionRequest.historicalData as unknown as InputJsonValue,
      },
    })

    expect(savedForecast).toBeDefined()
    expect(savedForecast.id).toBeDefined()

    console.log(
      `Stored prediction for supplier ${testSupplierId} with ID ${savedForecast.id}`
    )
  })

  it('should score suppliers', async () => {
    if (shouldSkip) return

    const scores = await scoreAllSuppliers(TEST_COMPONENT_ID, TEST_LOCATION_ID)

    expect(scores).toBeDefined()
    expect(scores.length).toBeGreaterThan(0)

    console.log(`Scored ${scores.length} suppliers:`)
    scores.forEach((score) => {
      console.log(
        `- ${score.supplierId}: Quality=${score.qualityScore.toFixed(1)}, LeadTime=${score.leadTimeScore.toFixed(1)}, Cost=${score.costScore.toFixed(1)}, Total=${score.totalScore.toFixed(1)}`
      )
    })

    // Verify score properties
    scores.forEach((score) => {
      expect(score.supplierId).toBeDefined()
      expect(score.componentId).toBe(TEST_COMPONENT_ID)
      expect(score.qualityScore).toBeGreaterThanOrEqual(0)
      expect(score.qualityScore).toBeLessThanOrEqual(100)
      expect(score.leadTimeScore).toBeGreaterThanOrEqual(0)
      expect(score.leadTimeScore).toBeLessThanOrEqual(100)
      expect(score.costScore).toBeGreaterThanOrEqual(0)
      expect(score.costScore).toBeLessThanOrEqual(100)
      expect(score.totalScore).toBeGreaterThanOrEqual(0)
      expect(score.totalScore).toBeLessThanOrEqual(100)
    })
  })

  it('should calculate supplier allocations', async () => {
    if (shouldSkip) return

    const allocations = await calculateSupplierAllocation(
      TEST_COMPONENT_ID,
      TEST_LOCATION_ID
    )

    expect(allocations).toBeDefined()
    expect(allocations.length).toBeGreaterThan(0)

    console.log(`Generated ${allocations.length} supplier allocations:`)
    allocations.forEach((allocation) => {
      console.log(
        `- ${allocation.supplierId}: ${allocation.allocationPercentage}% (Current=${allocation.currentScore.toFixed(1)}, Future=${allocation.futureScore.toFixed(1)}, Weighted=${allocation.weightedScore.toFixed(1)})`
      )
      console.log(`  Reasoning: ${allocation.reasoning}`)
    })

    // Verify allocation properties
    allocations.forEach((allocation) => {
      expect(allocation.supplierId).toBeDefined()
      expect(allocation.componentId).toBe(TEST_COMPONENT_ID)
      expect(allocation.locationId).toBe(TEST_LOCATION_ID)
      expect(allocation.allocationPercentage).toBeGreaterThanOrEqual(0)
      expect(allocation.allocationPercentage).toBeLessThanOrEqual(100)
      expect(allocation.currentScore).toBeGreaterThanOrEqual(0)
      expect(allocation.futureScore).toBeGreaterThanOrEqual(0)
      expect(allocation.weightedScore).toBeGreaterThanOrEqual(0)
      expect(allocation.reasoning).toBeDefined()
    })

    // Verify total allocation is 100%
    const totalAllocation = allocations.reduce(
      (sum, allocation) => sum + allocation.allocationPercentage,
      0
    )
    expect(totalAllocation).toBe(100)
  })

  it('should run the complete supplier allocation flow', async () => {
    if (shouldSkip) return

    // This test combines all the steps to verify the entire flow works together

    // Step 1: Calculate component demand
    const demand = await calculateComponentDemand(
      TEST_LOCATION_ID,
      TEST_COMPONENT_ID
    )
    expect(demand).toBeDefined()

    // Step 2: Get suppliers for this component at this location
    const location = await prisma.location.findUnique({
      where: { id: TEST_LOCATION_ID },
      select: { suppliers: true },
    })

    expect(location).toBeDefined()

    const locationSuppliers = location!.suppliers.map(
      (s) => s.supplierId
    ) as SupplierId[]

    // Filter suppliers that provide this component
    const relevantSuppliers = locationSuppliers.filter((supplierId) =>
      SUPPLIERS[supplierId]?.components.some(
        (c) => c.componentId === TEST_COMPONENT_ID
      )
    )

    expect(relevantSuppliers.length).toBeGreaterThan(0)

    // Step 3: Generate predictions for each supplier (if not already done)
    for (const supplierId of relevantSuppliers) {
      // Check if we already have a recent forecast
      const existingForecast =
        await prisma.supplierPerformanceForecast.findFirst({
          where: {
            supplierId,
            componentId: TEST_COMPONENT_ID,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        })

      if (!existingForecast) {
        // Generate a new forecast
        const predictionRequest = await prepareSupplierPerformanceData(
          supplierId,
          TEST_COMPONENT_ID,
          90
        )

        const prediction = await predictSupplierPerformance(
          supplierId,
          TEST_COMPONENT_ID,
          90
        )

        await prisma.supplierPerformanceForecast.create({
          data: {
            supplierId,
            componentId: TEST_COMPONENT_ID,
            createdAt: new Date(),
            qualityForecast:
              prediction.qualityForecast as unknown as InputJsonValue,
            leadTimeForecast:
              prediction.leadTimeForecast as unknown as InputJsonValue,
            historicalData:
              predictionRequest.historicalData as unknown as InputJsonValue,
          },
        })
      }
    }

    // Step 4: Score suppliers
    const scores = await scoreAllSuppliers(TEST_COMPONENT_ID, TEST_LOCATION_ID)
    expect(scores.length).toBeGreaterThan(0)

    // Step 5: Calculate allocations
    const allocations = await calculateSupplierAllocation(
      TEST_COMPONENT_ID,
      TEST_LOCATION_ID
    )
    expect(allocations.length).toBeGreaterThan(0)

    // Verify the allocations sum to 100%
    const totalAllocation = allocations.reduce(
      (sum, allocation) => sum + allocation.allocationPercentage,
      0
    )
    expect(totalAllocation).toBe(100)

    console.log('\n=== COMPLETE FLOW SUCCESSFUL ===')
    console.log(
      `Component: ${TEST_COMPONENT_ID}, Location: ${TEST_LOCATION_ID}`
    )
    console.log(
      `Quarterly demand: ${demand.quarterlyDemand.map((qd) => qd.totalDemand).join(', ')}`
    )
    console.log(`Suppliers scored: ${scores.length}`)
    console.log(`Allocation results:`)
    allocations.forEach((a) => {
      console.log(`- ${a.supplierId}: ${a.allocationPercentage}%`)
    })
  })
})
