import {
  type AllocationStrategy,
  type ReasonedAllocationStrategy,
  type SupplierAllocation,
  type AllocationRationaleBlocks,
  type SupplierComparisonBlocks,
  type RiskReductionLevel,
} from '../recommendation.types'
import { SUPPLIER_QUALITY_CONFIGS, SUPPLIERS } from '../../constants'
import { debugLog } from './reasoning-generator'
import { type SupplierId } from '~/lib/types/types'

/**
 * Generates reasoning for supplier allocation
 * @param strategy The allocation strategy
 * @returns Supplier allocation reasoning object
 */
export function generateAllocationReasoning(
  strategy: AllocationStrategy
): ReasonedAllocationStrategy['allocationReasoning'] {
  const { supplierAllocations } = strategy

  // Log input data
  debugLog(
    {
      componentId: strategy.componentId,
      locationId: strategy.locationId,
      supplierAllocations: supplierAllocations.map((s) => ({
        supplierId: s.supplierId,
        percentage: s.allocationPercentage,
        reason: s.allocationReason,
        qualityScore: s.qualityScore,
        costScore: s.costScore,
      })),
    },
    'allocation_reasoning_input'
  )

  // Generate summary based on number of suppliers and allocation pattern
  let summary = ''
  if (supplierAllocations.length === 1) {
    summary = `Allocate 100% to ${supplierAllocations[0].supplierId} based on overall performance.`
  } else if (supplierAllocations.length === 2) {
    summary = `Split allocation between ${supplierAllocations[0].supplierId} (${supplierAllocations[0].allocationPercentage}%) and ${supplierAllocations[1].supplierId} (${supplierAllocations[1].allocationPercentage}%).`
  } else {
    summary = `Distribute allocation across ${supplierAllocations.length} suppliers based on performance metrics.`
  }

  // Log the summary
  debugLog(summary, 'allocation_summary')

  // Generate individual supplier reasonings (simplified)
  const supplierReasonings = supplierAllocations.map((allocation) => {
    return {
      supplierId: allocation.supplierId,
      summary: generateSupplierReasoningSummary(allocation),
    }
  })

  // Log the supplier reasonings
  debugLog(
    supplierReasonings.map((sr) => ({
      supplierId: sr.supplierId,
      summary: sr.summary,
    })),
    'supplier_reasonings'
  )

  // Generate AllocationRationaleBlocks
  strategy.allocationRationaleBlocks =
    generateAllocationRationaleBlocks(strategy)

  // Generate SupplierComparisonBlocks
  strategy.supplierComparisonBlocks = generateSupplierComparisonBlocks(strategy)

  return {
    summary,
    supplierReasonings,
  }
}

/**
 * Generates a summary reasoning for a specific supplier allocation
 * @param allocation The supplier allocation
 * @returns A concise summary of the allocation reasoning
 */
function generateSupplierReasoningSummary(
  allocation: SupplierAllocation
): string {
  switch (allocation.allocationReason) {
    case 'quality':
      return `${allocation.supplierId} receives ${allocation.allocationPercentage}% allocation due to superior quality metrics.`
    case 'cost':
      return `${allocation.supplierId} receives ${allocation.allocationPercentage}% allocation due to cost efficiency.`
    case 'diversity':
      return `${allocation.supplierId} receives ${allocation.allocationPercentage}% allocation to maintain supply chain diversity.`
    case 'safety':
      return `${allocation.supplierId} receives ${allocation.allocationPercentage}% allocation for safety stock due to cost efficiency.`
    case 'q2_cost':
      return `${allocation.supplierId} receives ${allocation.allocationPercentage}% allocation for Q2 due to cost advantages.`
    default:
      return `${allocation.supplierId} receives ${allocation.allocationPercentage}% allocation based on overall performance.`
  }
}

/**
 * Generates risk considerations for the allocation strategy
 * @param strategy The allocation strategy
 * @returns Risk considerations object
 */
export function generateRiskConsiderations(
  strategy: AllocationStrategy
): ReasonedAllocationStrategy['riskConsiderations'] {
  const { supplierAllocations, componentId } = strategy

  // Log input data
  debugLog(
    {
      componentId,
      supplierAllocations: supplierAllocations.map((s) => ({
        supplierId: s.supplierId,
        percentage: s.allocationPercentage,
        qualityScore: s.qualityScore,
        componentFailureRate: s.componentFailureRate,
      })),
    },
    'risk_considerations_input'
  )

  // Identify potential risk factors
  const factors: ReasonedAllocationStrategy['riskConsiderations']['factors'] =
    []

  // Check for supplier concentration risk
  const highestAllocation = Math.max(
    ...supplierAllocations.map((a) => a.allocationPercentage)
  )
  if (highestAllocation > 80 && supplierAllocations.length > 1) {
    factors.push({
      factor: 'Supplier concentration',
      impact: 'medium',
      mitigation:
        'Consider increasing allocation to secondary suppliers to reduce dependency risk.',
    })
  }

  // Check for quality risks
  const lowQualitySuppliers = supplierAllocations.filter(
    (a) => a.qualityScore < 60
  )
  if (lowQualitySuppliers.length > 0) {
    factors.push({
      factor: 'Quality concerns',
      impact: 'high',
      mitigation:
        'Implement additional quality checks for components from suppliers with lower quality scores.',
    })
  }

  // Check for high component failure rates
  const highFailureRateSuppliers = supplierAllocations.filter(
    (a) => a.componentFailureRate > 0.05
  )
  if (highFailureRateSuppliers.length > 0) {
    // Calculate the weighted average failure rate based on allocations
    const totalAllocation = supplierAllocations.reduce(
      (sum, s) => sum + s.allocationPercentage,
      0
    )

    const weightedFailureRate = supplierAllocations.reduce(
      (sum, s) =>
        sum +
        (s.componentFailureRate * s.allocationPercentage) / totalAllocation,
      0
    )

    // Calculate the economic impact
    const estimatedReplacementCost =
      weightedFailureRate *
      strategy.demandForecast.quarterlyDemand[0].totalRequired *
      1.2 // 120% of unit cost for replacement

    factors.push({
      factor: 'Component failure risk',
      impact: 'high',
      mitigation: `Our allocation strategy already accounts for component failure rates in the total cost of ownership analysis. The weighted average failure rate across all suppliers is ${(weightedFailureRate * 100).toFixed(2)}%, which has been factored into our safety stock calculations. The economic impact of these failures is estimated at ${estimatedReplacementCost.toFixed(0)} units, which is covered by our safety stock and contingency planning.`,
    })
  }

  // Check for seasonal risks
  const highSeasonalSuppliers = supplierAllocations.filter((a) => {
    const supplier = SUPPLIER_QUALITY_CONFIGS[a.supplierId]
    return supplier?.seasonalStrength && supplier.seasonalStrength > 0.8
  })

  if (
    highSeasonalSuppliers.length > 0 &&
    highSeasonalSuppliers[0].allocationPercentage > 70
  ) {
    factors.push({
      factor: 'Seasonal performance variability',
      impact: 'medium',
      mitigation:
        'Consider adjusting allocation percentages by quarter to account for seasonal performance patterns.',
    })
  }

  // Generate summary based on identified risks
  let summary = ''
  if (factors.length === 0) {
    summary = `The allocation strategy for ${componentId} has no significant risk factors identified.`
  } else {
    summary = `The allocation strategy for ${componentId} has ${factors.length} identified risk factor${factors.length > 1 ? 's' : ''} that should be monitored.`
  }

  // Log the identified risk factors
  debugLog(factors, 'identified_risk_factors')

  return {
    summary,
    factors,
  }
}

/**
 * Logs detailed information for specific test cases to verify our enhanced reasoning
 * @param strategy The allocation strategy being processed
 */
function logTestCaseData(strategy: AllocationStrategy): void {
  const { componentId, locationId, supplierAllocations } = strategy

  // Define our test cases
  const testCases = [
    {
      componentId: 'CHASSIS-PREMIUM',
      locationId: 'heartland',
      description:
        'High quality supplier gets lowest allocation due to cost considerations',
    },
    {
      componentId: 'ENGINE-A',
      locationId: 'south',
      description:
        'Budget supplier with deeper discount vs declining quality with premium pricing',
    },
    {
      componentId: 'HYDRAULICS-MEDIUM',
      locationId: 'west',
      description: 'Full range from budget to premium suppliers',
    },
    {
      componentId: 'CHASSIS-BASIC',
      locationId: 'south',
      description:
        'Suppliers with varied pricing strategies and quality profiles',
    },
  ]

  // Check if current strategy matches one of our test cases
  const matchedCase = testCases.find(
    (tc) => tc.componentId === componentId && tc.locationId === locationId
  )

  if (!matchedCase) return // Not a test case we're tracking

  // This is one of our test cases - log detailed information
  debugLog(
    {
      testCase: `${componentId} at ${locationId}`,
      description: matchedCase.description,
      supplierDetails: supplierAllocations.map((s) => ({
        supplierId: s.supplierId,
        allocation: s.allocationPercentage,
        qualityScore: s.qualityScore,
        costScore: s.costScore,
        failureRate: s.componentFailureRate,
        pricePerUnit: s.pricePerUnit,
      })),
    },
    `test_case_${componentId}_${locationId}`
  )

  // Calculate and log TCO for each supplier
  const supplierTCOs = supplierAllocations.map((s) => {
    // Calculate TCO using our model
    const replacementCostFactor = 1.2
    const baseCost = s.pricePerUnit
    const failureCost =
      s.pricePerUnit * s.componentFailureRate * replacementCostFactor
    const totalCost = baseCost + failureCost

    return {
      supplierId: s.supplierId,
      baseCost,
      failureCost,
      totalCost,
      costPerReliabilityPoint: totalCost / s.qualityScore,
    }
  })

  debugLog(
    {
      testCase: `${componentId} at ${locationId}`,
      tcoAnalysis: supplierTCOs,
      // Sort suppliers by TCO to see which is actually most cost-effective
      rankedByTCO: [...supplierTCOs]
        .sort((a, b) => a.totalCost - b.totalCost)
        .map((s) => s.supplierId),
      // Sort by cost-effectiveness (TCO per reliability point)
      rankedByValue: [...supplierTCOs]
        .sort((a, b) => a.costPerReliabilityPoint - b.costPerReliabilityPoint)
        .map((s) => s.supplierId),
      // Compare with actual allocation
      actualAllocation: supplierAllocations
        .sort((a, b) => b.allocationPercentage - a.allocationPercentage)
        .map((s) => s.supplierId),
    },
    `tco_analysis_${componentId}_${locationId}`
  )

  // Log seasonal risk factors
  const seasonalRisks = supplierAllocations.map((s) => {
    const config = SUPPLIER_QUALITY_CONFIGS[s.supplierId]
    return {
      supplierId: s.supplierId,
      seasonalStrength: config?.seasonalStrength || 0,
      allocation: s.allocationPercentage,
      q1Risk:
        (config?.seasonalStrength || 0) > 0.7
          ? 'high'
          : (config?.seasonalStrength || 0) > 0.4
            ? 'medium'
            : 'low',
    }
  })

  debugLog(
    {
      testCase: `${componentId} at ${locationId}`,
      seasonalRisks,
      highSeasonalSuppliers: seasonalRisks
        .filter((s) => s.seasonalStrength > 0.7)
        .map((s) => s.supplierId),
    },
    `seasonal_risk_${componentId}_${locationId}`
  )
}

/**
 * Additional test cases for logging to verify our changes work across different scenarios
 *
 * Case 1: CHASSIS-PREMIUM at heartland (our current test case)
 * - Suppliers: Bolt, Crank, Elite
 * - Interesting because: High quality supplier (Elite) gets lowest allocation due to cost considerations
 *
 * Case 2: ENGINE-A at south location
 * - Suppliers: Atlas, Bolt, Dynamo
 * - Interesting because: Atlas is a budget supplier with declining quality but offers 15% discount
 *   compared to Bolt's 12% discount. Dynamo charges a premium despite declining quality.
 * - Expected behavior: Our TCO analysis should show whether Atlas's deeper discount outweighs
 *   its quality issues compared to Bolt, and why Dynamo's premium pricing isn't justified.
 *
 * Case 3: HYDRAULICS-MEDIUM at west location
 * - Suppliers: Atlas, Crank, Elite
 * - Interesting because: Spans the full range from budget (Atlas) to balanced (Crank) to premium (Elite)
 * - Expected behavior: Should show clear TCO calculations across the quality-cost spectrum
 *
 * Case 4: CHASSIS-BASIC at south location
 * - Suppliers: Atlas, Bolt, Dynamo
 * - Interesting because: All three suppliers have different pricing strategies and quality profiles
 *   (Atlas: -15% discount, Bolt: -12.5% discount, Dynamo: +10% premium)
 * - Expected behavior: Should demonstrate how our allocation balances cost savings against quality risks
 *
 * Implementation note: To test these cases, run the recommendation engine with these
 * component-location pairs and examine the debug output to verify that:
 * 1. The TCO calculations correctly account for failure rates
 * 2. The supplier allocations are justified by the data
 * 3. The explanations clearly communicate the reasoning
 */

// No actual code changes needed here - this is just documentation for testing

/**
 * Generates the building blocks for explaining the allocation rationale
 */
function generateAllocationRationaleBlocks(
  strategy: AllocationStrategy
): AllocationRationaleBlocks {
  const { supplierAllocations, totalCost } = strategy

  // Determine primary reason based on allocation patterns
  let primaryReason: 'quality' | 'cost' | 'balance' | 'diversity' = 'balance'

  // Count allocation reasons
  const reasonCounts = {
    quality: 0,
    cost: 0,
    diversity: 0,
    safety: 0,
    q2_cost: 0,
  }

  supplierAllocations.forEach((allocation) => {
    reasonCounts[allocation.allocationReason]++
  })

  // Determine primary reason based on the most common reason
  if (
    reasonCounts.quality > reasonCounts.cost &&
    reasonCounts.quality > reasonCounts.diversity
  ) {
    primaryReason = 'quality'
  } else if (
    reasonCounts.cost > reasonCounts.quality &&
    reasonCounts.cost > reasonCounts.diversity
  ) {
    primaryReason = 'cost'
  } else if (reasonCounts.diversity > 0) {
    primaryReason = 'diversity'
  }

  // Calculate cost savings
  const highestQualitySupplier = [...supplierAllocations].sort(
    (a, b) => b.qualityScore - a.qualityScore
  )[0]

  const totalRequired =
    strategy.originalDemand.quarterlyDemand[0]?.totalRequired ?? 0
  const currentInventory = strategy.currentInventory
  const purchaseUnits = Math.max(0, totalRequired - currentInventory)

  const singleSupplierCost = highestQualitySupplier
    ? purchaseUnits * highestQualitySupplier.pricePerUnit
    : 0

  const costSavings = Math.max(0, singleSupplierCost - (totalCost ?? 0))

  // Calculate quality impact
  const weightedFailureRate = calculateWeightedFailureRate(supplierAllocations)
  const bestFailureRate = Math.min(
    ...supplierAllocations.map((s) => s.componentFailureRate)
  )
  const failureRateReduction = Math.max(
    0,
    ((bestFailureRate - weightedFailureRate) / bestFailureRate) * 100
  )

  const weightedQualityScore =
    calculateWeightedQualityScore(supplierAllocations)

  // Determine risk reduction level
  let diversificationBenefit: RiskReductionLevel = 'minimal'

  if (supplierAllocations.length === 1) {
    diversificationBenefit = 'minimal'
  } else if (supplierAllocations.length === 2) {
    const topAllocation = Math.max(
      ...supplierAllocations.map((s) => s.allocationPercentage)
    )

    if (topAllocation > 80) {
      diversificationBenefit = 'low'
    } else if (topAllocation > 60) {
      diversificationBenefit = 'moderate'
    } else {
      diversificationBenefit = 'appreciable'
    }
  } else {
    // 3 or more suppliers
    diversificationBenefit = 'high'
  }

  // Determine single supplier risk
  const singleSupplierRisk =
    supplierAllocations.length === 1
      ? `Relying solely on ${supplierAllocations[0].supplierId} introduces supply chain vulnerability.`
      : `Relying on a single supplier would increase risk of supply chain disruptions.`

  // Check for seasonal factors
  const seasonalFactors =
    reasonCounts.q2_cost > 0
      ? {
          relevantQuarter: 2,
          seasonalAdjustment:
            'Adjusted allocation for Q2 to optimize for cost efficiency.',
        }
      : undefined

  return {
    primaryReason,
    costSavings,
    qualityImpact: {
      failureRateReduction,
      reliabilityScore: weightedQualityScore,
    },
    riskReduction: {
      diversificationBenefit,
      singleSupplierRisk,
    },
    seasonalFactors,
  }
}

/**
 * Calculates weighted failure rate based on allocation percentages
 */
function calculateWeightedFailureRate(
  supplierAllocations: SupplierAllocation[]
): number {
  const totalAllocation = supplierAllocations.reduce(
    (sum, s) => sum + s.allocationPercentage,
    0
  )

  return supplierAllocations.reduce(
    (sum, s) =>
      sum + (s.componentFailureRate * s.allocationPercentage) / totalAllocation,
    0
  )
}

/**
 * Calculates weighted quality score based on allocation percentages
 */
function calculateWeightedQualityScore(
  supplierAllocations: SupplierAllocation[]
): number {
  const totalAllocation = supplierAllocations.reduce(
    (sum, s) => sum + s.allocationPercentage,
    0
  )

  return supplierAllocations.reduce(
    (sum, s) =>
      sum + (s.qualityScore * s.allocationPercentage) / totalAllocation,
    0
  )
}

/**
 * Generates the building blocks for supplier comparison
 */
function generateSupplierComparisonBlocks(
  strategy: AllocationStrategy
): SupplierComparisonBlocks {
  const { supplierAllocations } = strategy

  // Calculate total cost of ownership for each supplier
  const supplierMetrics = supplierAllocations.map((allocation) => {
    const replacementCostFactor = 1.2 // 120% of original cost to replace a failed component
    const totalCostOfOwnership =
      allocation.pricePerUnit *
      (1 + allocation.componentFailureRate * replacementCostFactor)

    return {
      supplierId: allocation.supplierId,
      price: allocation.pricePerUnit,
      qualityScore: allocation.qualityScore,
      failureRate: allocation.componentFailureRate,
      totalCostOfOwnership,
      selected: true, // All suppliers in supplierAllocations were selected
    }
  })

  // Identify key tradeoffs
  const keyTradeoffs: Array<{
    description: string
    suppliers: string[]
    impact: string
  }> = []

  // Quality vs. Cost tradeoff
  if (supplierAllocations.length > 1) {
    const sortedByQuality = [...supplierAllocations].sort(
      (a, b) => b.qualityScore - a.qualityScore
    )

    const sortedByCost = [...supplierAllocations].sort(
      (a, b) => a.pricePerUnit - b.pricePerUnit
    )

    // If highest quality is not lowest cost
    if (sortedByQuality[0].supplierId !== sortedByCost[0].supplierId) {
      const qualityDiff = (
        sortedByQuality[0].qualityScore - sortedByCost[0].qualityScore
      ).toFixed(1)

      const costDiff = (
        ((sortedByQuality[0].pricePerUnit - sortedByCost[0].pricePerUnit) /
          sortedByCost[0].pricePerUnit) *
        100
      ).toFixed(1)

      keyTradeoffs.push({
        description: `Quality vs. Cost: ${sortedByQuality[0].supplierId} offers ${qualityDiff} points higher quality at ${costDiff}% higher cost than ${sortedByCost[0].supplierId}`,
        suppliers: [sortedByQuality[0].supplierId, sortedByCost[0].supplierId],
        impact: 'significant',
      })
    }

    // Failure rate tradeoff
    const sortedByFailureRate = [...supplierAllocations].sort(
      (a, b) => a.componentFailureRate - b.componentFailureRate
    )

    if (
      sortedByFailureRate[0].supplierId !== sortedByCost[0].supplierId &&
      sortedByFailureRate[0].componentFailureRate <
        sortedByCost[0].componentFailureRate / 2
    ) {
      const failureDiff = (
        ((sortedByCost[0].componentFailureRate -
          sortedByFailureRate[0].componentFailureRate) /
          sortedByCost[0].componentFailureRate) *
        100
      ).toFixed(1)

      keyTradeoffs.push({
        description: `Reliability vs. Cost: ${sortedByFailureRate[0].supplierId} has ${failureDiff}% lower failure rate than ${sortedByCost[0].supplierId}`,
        suppliers: [
          sortedByFailureRate[0].supplierId,
          sortedByCost[0].supplierId,
        ],
        impact: 'moderate',
      })
    }
  }

  // Generate selection reasons for each supplier
  const selectionReasons: Partial<
    Record<
      SupplierId,
      {
        primaryReason:
          | 'quality'
          | 'cost'
          | 'balance'
          | 'diversity'
          | 'safety'
          | 'q2_cost'
        comparedTo: SupplierId[]
        advantageDescription: string
        disadvantageDescription?: string
      }
    >
  > = {}

  supplierAllocations.forEach((allocation) => {
    // Determine which suppliers to compare against
    const otherSuppliers = supplierAllocations
      .filter((s) => s.supplierId !== allocation.supplierId)
      .map((s) => s.supplierId)

    // Generate advantage description based on allocation reason
    let advantageDescription = ''
    let disadvantageDescription = undefined

    switch (allocation.allocationReason) {
      case 'quality':
        advantageDescription = `Superior quality metrics (${allocation.qualityScore.toFixed(1)}) and low failure rate (${(allocation.componentFailureRate * 100).toFixed(2)}%)`

        if (
          allocation.pricePerUnit >
          Math.min(...supplierAllocations.map((s) => s.pricePerUnit))
        ) {
          disadvantageDescription = `Higher price point (${allocation.pricePerUnit.toFixed(2)}) compared to budget options`
        }
        break

      case 'cost':
        advantageDescription = `Cost-effective pricing (${allocation.pricePerUnit.toFixed(2)}) with acceptable quality (${allocation.qualityScore.toFixed(1)})`

        if (
          allocation.componentFailureRate >
          Math.min(...supplierAllocations.map((s) => s.componentFailureRate))
        ) {
          disadvantageDescription = `Higher failure rate (${(allocation.componentFailureRate * 100).toFixed(2)}%) than premium options`
        }
        break

      case 'diversity':
        advantageDescription = `Provides supply chain diversification while maintaining balanced metrics`
        break

      case 'safety':
        advantageDescription = `Cost-effective option (${allocation.pricePerUnit.toFixed(2)}) for safety stock allocation`
        break

      case 'q2_cost':
        advantageDescription = `Optimized for Q2 cost efficiency (${allocation.pricePerUnit.toFixed(2)})`
        break

      default:
        advantageDescription = `Balanced performance across all metrics`
    }

    selectionReasons[allocation.supplierId] = {
      primaryReason: allocation.allocationReason,
      comparedTo: otherSuppliers,
      advantageDescription,
      disadvantageDescription,
    }
  })

  return {
    supplierMetrics,
    keyTradeoffs,
    selectionReasons,
  }
}
