import { describe, it, expect, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { calculateEnhancedSupplierAllocation } from '../supplier-allocation'
import {
  type SupplierId,
  type ComponentId,
  type LocationId,
} from '../../types/types'
import { COMPONENTS, LOCATIONS, SUPPLIERS } from '../../constants'

const prisma = new PrismaClient()

// Test configuration
let TEST_LOCATION_ID = 'west' as LocationId
let TEST_COMPONENT_ID = 'ENGINE-B' as ComponentId

describe('Enhanced Reasoning Generation', () => {
  // Skip these tests if we're in CI or if SKIP_INTEGRATION is set
  const shouldSkip =
    process.env.CI === 'true' || process.env.SKIP_INTEGRATION === 'true'

  // This ensures we have analysis data before running tests and finds a valid component-location pair
  beforeAll(async () => {
    if (shouldSkip) return

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

      const locationSuppliers = location.suppliers.map((s) => s.supplierId)

      // Try each component
      for (const componentId of Object.keys(COMPONENTS) as ComponentId[]) {
        // Check if any suppliers at this location provide this component
        const relevantSuppliers = locationSuppliers.filter((supplierId) =>
          SUPPLIERS[supplierId as SupplierId]?.components.some(
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
  })

  it('should generate enhanced reasoning for supplier allocations', async () => {
    if (shouldSkip) {
      console.log('Skipping integration test in CI environment')
      return
    }

    // Calculate enhanced supplier allocation
    const allocationStrategy = await calculateEnhancedSupplierAllocation(
      TEST_COMPONENT_ID,
      TEST_LOCATION_ID
    )

    // Verify the overall strategy
    expect(allocationStrategy).toBeDefined()
    expect(allocationStrategy.componentId).toBe(TEST_COMPONENT_ID)
    expect(allocationStrategy.locationId).toBe(TEST_LOCATION_ID)
    expect(allocationStrategy.overallStrategy).toBeDefined()
    expect(allocationStrategy.overallStrategy.length).toBeGreaterThan(10)

    // Log the overall strategy for visibility
    console.log('\nOverall Strategy:')
    console.log(allocationStrategy.overallStrategy)

    // Verify supplier allocations
    expect(allocationStrategy.supplierAllocations).toBeDefined()
    expect(allocationStrategy.supplierAllocations.length).toBeGreaterThan(0)

    // Check each allocation
    allocationStrategy.supplierAllocations.forEach((allocation) => {
      expect(allocation.supplierId).toBeDefined()
      expect(allocation.componentId).toBe(TEST_COMPONENT_ID)
      expect(allocation.locationId).toBe(TEST_LOCATION_ID)
      expect(allocation.allocationPercentage).toBeGreaterThanOrEqual(0)
      expect(allocation.allocationPercentage).toBeLessThanOrEqual(100)

      // Check enhanced reasoning
      expect(allocation.enhancedReasoning).toBeDefined()
      expect(allocation.enhancedReasoning.summary).toBeDefined()
      expect(allocation.enhancedReasoning.summary.length).toBeGreaterThan(10)

      expect(allocation.enhancedReasoning.keyFactors).toBeDefined()
      expect(
        allocation.enhancedReasoning.keyFactors.length
      ).toBeGreaterThanOrEqual(0)

      allocation.enhancedReasoning.keyFactors.forEach((factor) => {
        expect(factor.factor).toBeDefined()
        expect(factor.impact).toBeDefined()
        expect(['high', 'medium', 'low']).toContain(factor.impact)
        expect(factor.description).toBeDefined()
      })

      expect(allocation.enhancedReasoning.comparisons).toBeDefined()
      expect(allocation.enhancedReasoning.detailedExplanation).toBeDefined()
      expect(
        allocation.enhancedReasoning.detailedExplanation.length
      ).toBeGreaterThan(50)

      // Log the allocation details for visibility
      console.log(
        `\n${allocation.supplierId}: ${allocation.allocationPercentage}%`
      )
      console.log(`Summary: ${allocation.enhancedReasoning.summary}`)

      console.log('Key Factors:')
      allocation.enhancedReasoning.keyFactors.forEach((factor) => {
        console.log(
          `- ${factor.factor} (${factor.impact}): ${factor.description}`
        )
      })

      console.log('Comparisons:')
      allocation.enhancedReasoning.comparisons.forEach((comparison) => {
        console.log(`- ${comparison}`)
      })

      console.log('Detailed Explanation:')
      console.log(allocation.enhancedReasoning.detailedExplanation)
    })

    // Verify total allocation is 100%
    const totalAllocation = allocationStrategy.supplierAllocations.reduce(
      (sum, allocation) => sum + allocation.allocationPercentage,
      0
    )
    expect(totalAllocation).toBe(100)
  })
})
