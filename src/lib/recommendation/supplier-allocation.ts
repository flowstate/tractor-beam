import { getLatestAnalysisResults } from '../analysis/storage'
import { COMPONENTS, SUPPLIERS } from '../constants'
import { scoreAllSuppliers } from '../recommendation/supplier-scoring'
import { type ComponentId, type LocationId } from '../types/types'
import { type ComponentDemand, type QuarterlyDemand } from './component-demand'
import { getCurrentInventoryLevels } from './current-strategy'
import {
  type AllocationStrategy,
  type SupplierAllocation,
  type TopLevelSuggestionPieces,
} from './recommendation.types'
import * as fs from 'fs'
import * as path from 'path'

// Debug logging setup
const DEBUG_ENABLED = true
const DEBUG_OUTPUT_FILE = 'supplier-allocation-debug.json'

// Create a debug data buffer
const debugBuffer: Record<string, unknown> = {}

// Create a debug logger function that adds to the buffer
function debugLog(data: unknown, label: string) {
  if (!DEBUG_ENABLED) return

  // Add to buffer with timestamp
  debugBuffer[`${label}_${new Date().toISOString()}`] = data

  // Also log to console for immediate feedback (optional)
  console.log(
    `[DEBUG] ${label}:`,
    typeof data === 'object'
      ? JSON.stringify(data).substring(0, 200) + '...'
      : data
  )
}

// Function to write all debug data at once
function flushDebugLog() {
  if (!DEBUG_ENABLED || Object.keys(debugBuffer).length === 0) return

  // Ensure the debug directory exists
  const publicDir = path.join(process.cwd(), 'public/data')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  // Write the entire buffer to file
  const debugFilePath = path.join(publicDir, DEBUG_OUTPUT_FILE)
  fs.writeFileSync(debugFilePath, JSON.stringify(debugBuffer, null, 2))

  console.log(`[DEBUG] Wrote debug data to ${debugFilePath}`)

  // Clear the buffer
  Object.keys(debugBuffer).forEach((key) => delete debugBuffer[key])
}

/**
 * Calculates supplier allocation for a component at a location with diversification logic
 * @param componentId The component ID
 * @param locationId The location ID
 * @param demand Optional component demand data
 * @returns Array of supplier allocations
 */
export async function calculateSupplierAllocation(
  componentId: ComponentId,
  locationId: LocationId,
  demand?: ComponentDemand
): Promise<SupplierAllocation[]> {
  // Get supplier scores from our improved scoring system
  const supplierScores = await scoreAllSuppliers(componentId, locationId)

  // Add debug log for supplier scores
  debugLog(
    {
      componentId,
      locationId,
      supplierScores: supplierScores.map((s) => ({
        supplierId: s.supplierId,
        qualityScore: s.qualityScore,
        costScore: s.costScore,
        totalScore: s.totalScore,
      })),
    },
    'supplier_scores'
  )

  // Get latest analysis results for component risk data
  const analysisResults = await getLatestAnalysisResults()
  const componentRisks = analysisResults?.componentRisks

  // Calculate total score for percentage calculation
  const totalScore = supplierScores.reduce(
    (sum, score) => sum + score.totalScore,
    0
  )

  // Calculate base allocation percentages
  let allocations: SupplierAllocation[] = supplierScores.map((score) => {
    // Calculate base percentage from score
    const basePercentage = (score.totalScore / totalScore) * 100

    // Get component failure rate for this supplier if available
    const supplierFailureRate =
      componentRisks?.failureRates.byComponent[componentId]?.bySupplier[
        score.supplierId
      ] ?? 0

    // Get price per unit for this supplier-component combination
    const supplierComponent = SUPPLIERS[score.supplierId]?.components.find(
      (c) => c.componentId === componentId
    )
    const pricePerUnit = supplierComponent?.pricePerUnit ?? 0

    return {
      supplierId: score.supplierId,
      componentId,
      locationId,
      allocationPercentage: Math.round(basePercentage),
      qualityScore: score.qualityScore,
      costScore: score.costScore,
      totalScore: score.totalScore,
      componentFailureRate: supplierFailureRate,
      pricePerUnit,
      allocationReason: 'quality', // Default reason
    }
  })

  // Add debug log for initial allocations
  debugLog(
    {
      componentId,
      locationId,
      initialAllocations: allocations.map((a) => ({
        supplierId: a.supplierId,
        percentage: a.allocationPercentage,
        reason: a.allocationReason,
      })),
    },
    'initial_allocations_before_diversification'
  )

  // Apply diversification logic
  allocations = applyDiversificationRules(allocations, demand)

  // Add debug log after diversification
  debugLog(
    {
      componentId,
      locationId,
      allocationsAfterDiversification: allocations.map((a) => ({
        supplierId: a.supplierId,
        percentage: a.allocationPercentage,
        reason: a.allocationReason,
      })),
    },
    'allocations_after_diversification'
  )

  // Ensure allocations sum to 100%
  const totalAllocation = allocations.reduce(
    (sum, allocation) => sum + allocation.allocationPercentage,
    0
  )

  // Adjust if needed (due to rounding)
  if (totalAllocation !== 100 && allocations.length > 0) {
    const diff = 100 - totalAllocation
    // Add or subtract from the highest scored supplier
    allocations[0].allocationPercentage += diff
  }

  // Add debug log for final adjusted allocations
  debugLog(
    {
      componentId,
      locationId,
      totalAllocation,
      adjustedAllocations: allocations.map((a) => ({
        supplierId: a.supplierId,
        percentage: a.allocationPercentage,
        reason: a.allocationReason,
      })),
    },
    'final_adjusted_allocations'
  )

  // If demand is provided, calculate actual quantities
  if (demand) {
    // Calculate safety stock portion
    const safetyStock = demand.quarterlyDemand[0]?.safetyStock || 0
    const totalRequired = demand.quarterlyDemand[0]?.totalRequired || 0
    const baseRequired = totalRequired - safetyStock

    for (const allocation of allocations) {
      // Calculate base and safety stock quantities separately if we have a safety stock allocation
      const hasSafetyStockAllocation = allocations.some(
        (a) => a.allocationReason === 'safety'
      )

      if (
        hasSafetyStockAllocation &&
        allocation.allocationReason !== 'safety'
      ) {
        // This supplier gets base demand only
        const basePercentage =
          (allocation.allocationPercentage /
            allocations
              .filter((a) => a.allocationReason !== 'safety')
              .reduce((sum, a) => sum + a.allocationPercentage, 0)) *
          100

        allocation.quarterlyQuantities = demand.quarterlyDemand.map((qd) => {
          const quantity = Math.round(
            (qd.totalRequired - qd.safetyStock) * (basePercentage / 100)
          )
          const cost = quantity * allocation.pricePerUnit
          return {
            quarter: qd.quarter,
            year: qd.year,
            quantity,
            cost,
          }
        })
      } else if (
        hasSafetyStockAllocation &&
        allocation.allocationReason === 'safety'
      ) {
        // This supplier gets safety stock only
        allocation.quarterlyQuantities = demand.quarterlyDemand.map((qd) => {
          const quantity = Math.round(qd.safetyStock)
          const cost = quantity * allocation.pricePerUnit
          return {
            quarter: qd.quarter,
            year: qd.year,
            quantity,
            cost,
          }
        })
      } else {
        // Normal allocation
        allocation.quarterlyQuantities = demand.quarterlyDemand.map((qd) => {
          const quantity = Math.round(
            qd.totalRequired * (allocation.allocationPercentage / 100)
          )
          const cost = quantity * allocation.pricePerUnit
          return {
            quarter: qd.quarter,
            year: qd.year,
            quantity,
            cost,
          }
        })
      }

      // Calculate total cost across all quarters
      allocation.totalCost = allocation.quarterlyQuantities.reduce(
        (sum, q) => sum + (q.cost ?? 0),
        0
      )
    }

    // Add this after line 370 (after calculating quarterlyQuantities)
    // This will log the quarterly quantities for each supplier
    if (demand) {
      debugLog(
        {
          componentId,
          locationId,
          supplierAllocations: allocations.map((a) => ({
            supplierId: a.supplierId,
            percentage: a.allocationPercentage,
            reason: a.allocationReason,
            quarterlyQuantities: a.quarterlyQuantities,
            totalCost: a.totalCost,
          })),
        },
        'supplier_allocation_with_quantities'
      )
    }
  }

  return allocations
}

/**
 * Applies diversification rules to supplier allocations
 * @param allocations Initial allocations based on scores
 * @param demand Optional component demand data
 * @returns Modified allocations with diversification applied
 */
function applyDiversificationRules(
  allocations: SupplierAllocation[],
  demand?: ComponentDemand
): SupplierAllocation[] {
  // Add debug log at the beginning of the function
  debugLog(
    {
      initialAllocations: allocations.map((a) => ({
        supplierId: a.supplierId,
        score: a.totalScore,
        initialPercentage: a.allocationPercentage,
      })),
      hasDemandData: !!demand,
    },
    'diversification_input'
  )

  // If we only have one supplier, we can't diversify
  if (allocations.length <= 1) return allocations

  // Sort allocations by score (highest first)
  allocations.sort((a, b) => b.totalScore - a.totalScore)

  // Make a copy we can modify
  const result = [...allocations]

  // 1. Ensure minimum allocation for secondary suppliers
  // If top supplier has >90% allocation, cap at 90% and redistribute
  if (result[0].allocationPercentage > 90) {
    const excess = result[0].allocationPercentage - 90
    result[0].allocationPercentage = 90

    // Distribute excess to other suppliers proportionally
    const otherTotalScore = result
      .slice(1)
      .reduce((sum, a) => sum + a.totalScore, 0)
    for (let i = 1; i < result.length; i++) {
      const share = (result[i].totalScore / otherTotalScore) * excess
      result[i].allocationPercentage += Math.round(share)
      result[i].allocationReason = 'diversity'
    }

    // Add debug log after rule 1
    debugLog(
      {
        rule: 'minimum_secondary_allocation',
        topSupplierCapped: true,
        excess,
        adjustedAllocations: result.map((a) => ({
          supplierId: a.supplierId,
          percentage: a.allocationPercentage,
          reason: a.allocationReason,
        })),
      },
      'diversification_rule1_applied'
    )
  }

  // 2. Cost-based allocation for similar quality scores
  // If top two suppliers are within 10% of each other on quality but differ on cost
  if (
    result.length >= 2 &&
    Math.abs(result[0].qualityScore - result[1].qualityScore) < 10 &&
    result[1].costScore > result[0].costScore
  ) {
    // Adjust allocation to favor the more cost-effective supplier
    const costDifference = result[1].costScore - result[0].costScore
    const adjustment = Math.min(20, Math.round(costDifference / 2))

    result[0].allocationPercentage -= adjustment
    result[1].allocationPercentage += adjustment
    result[1].allocationReason = 'cost'

    // Add debug log after rule 2
    debugLog(
      {
        rule: 'cost_based_allocation',
        qualityDifference: Math.abs(
          result[0].qualityScore - result[1].qualityScore
        ),
        costDifference: costDifference,
        adjustment,
        adjustedAllocations: result.map((a) => ({
          supplierId: a.supplierId,
          percentage: a.allocationPercentage,
          reason: a.allocationReason,
        })),
      },
      'diversification_rule2_applied'
    )
  }

  // 3. Safety stock allocation to cheaper suppliers
  // If we have demand data with safety stock
  if (
    demand &&
    demand.quarterlyDemand.length > 0 &&
    demand.quarterlyDemand[0].safetyStock > 0
  ) {
    // Find the cheapest supplier with acceptable quality
    const cheapestAcceptable = [...result]
      .filter((a) => a.qualityScore > 50) // Minimum quality threshold
      .sort((a, b) => b.costScore - a.costScore)[0]

    if (cheapestAcceptable && cheapestAcceptable !== result[0]) {
      // Calculate safety stock as percentage of total
      const safetyStock = demand.quarterlyDemand[0].safetyStock
      const totalRequired = demand.quarterlyDemand[0].totalRequired
      const safetyPercentage = Math.round((safetyStock / totalRequired) * 100)

      // If safety stock is significant (>5%)
      if (safetyPercentage > 5) {
        // Find cheapest supplier's index
        const cheapestIndex = result.findIndex(
          (a) => a.supplierId === cheapestAcceptable.supplierId
        )

        // Allocate safety stock to cheapest acceptable supplier
        result[0].allocationPercentage -= safetyPercentage
        result[cheapestIndex].allocationPercentage += safetyPercentage
        result[cheapestIndex].allocationReason = 'safety'

        // Add debug log after rule 3
        debugLog(
          {
            rule: 'safety_stock_allocation',
            safetyStock,
            totalRequired,
            safetyPercentage,
            cheapestAcceptableSupplierId: cheapestAcceptable.supplierId,
            adjustedAllocations: result.map((a) => ({
              supplierId: a.supplierId,
              percentage: a.allocationPercentage,
              reason: a.allocationReason,
            })),
          },
          'diversification_rule3_applied'
        )
      }
    }
  }

  // 4. Q2-specific cost prioritization
  // If this is for Q2 (check if demand has Q2 data)
  const hasQ2Data = demand?.quarterlyDemand.some(
    (qd) => qd.quarter === 2 && qd.year === 2025
  )
  if (hasQ2Data && result.length >= 2) {
    // For Q2, give more weight to cost for suppliers with decent quality
    const q2Candidates = result.filter((a) => a.qualityScore > 60)
    if (q2Candidates.length >= 2) {
      // Sort by cost score
      q2Candidates.sort((a, b) => b.costScore - a.costScore)

      // Boost allocation to most cost-effective supplier for Q2
      const costLeader = q2Candidates[0]
      const costLeaderIndex = result.findIndex(
        (a) => a.supplierId === costLeader.supplierId
      )

      if (costLeaderIndex > 0) {
        // If not already the top supplier
        const q2Adjustment = Math.min(15, Math.round(costLeader.costScore / 5))
        result[0].allocationPercentage -= q2Adjustment
        result[costLeaderIndex].allocationPercentage += q2Adjustment
        result[costLeaderIndex].allocationReason = 'q2_cost'

        // Add debug log after rule 4
        debugLog(
          {
            rule: 'q2_cost_prioritization',
            hasQ2Data,
            q2Adjustment,
            costLeaderId: costLeader.supplierId,
            adjustedAllocations: result.map((a) => ({
              supplierId: a.supplierId,
              percentage: a.allocationPercentage,
              reason: a.allocationReason,
            })),
          },
          'diversification_rule4_applied'
        )
      }
    }
  }

  // Ensure no negative allocations
  for (const allocation of result) {
    allocation.allocationPercentage = Math.max(
      0,
      allocation.allocationPercentage
    )
  }

  // Re-sort by allocation percentage
  result.sort((a, b) => b.allocationPercentage - a.allocationPercentage)

  // Add this at line 545 (at the end of applyDiversificationRules)
  // This will log the final output of the diversification rules
  debugLog(
    {
      finalAllocations: result.map((a) => ({
        supplierId: a.supplierId,
        percentage: a.allocationPercentage,
        reason: a.allocationReason,
      })),
    },
    'diversification_output'
  )

  return result
}

/**
 * Calculates supplier allocation with inventory adjustment
 * @param componentId The component ID
 * @param locationId The location ID
 * @param demand Component demand data
 * @returns Allocation strategy with adjusted demand
 */
export async function calculateEnhancedSupplierAllocation(
  componentId: ComponentId,
  locationId: LocationId,
  demand: ComponentDemand
): Promise<AllocationStrategy> {
  // Get current inventory levels
  const currentInventoryLevels = await getCurrentInventoryLevels()
  const currentInventory = currentInventoryLevels[locationId][componentId]

  // Add debug log at the beginning
  debugLog(
    {
      componentId,
      locationId,
      currentInventory,
      originalDemand: {
        quarterlyDemand: demand.quarterlyDemand.map((q) => ({
          quarter: q.quarter,
          year: q.year,
          totalRequired: q.totalRequired,
          safetyStock: q.safetyStock,
        })),
      },
    },
    'enhanced_allocation_input'
  )

  // Get latest analysis results for component risk data
  const analysisResults = await getLatestAnalysisResults()
  const componentRisks = analysisResults?.componentRisks

  console.log(
    `[DEBUG] Adjusting demand for ${componentId} at ${locationId} with current inventory: ${currentInventory}`
  )

  // Create a deep copy of the demand to adjust for current inventory
  const adjustedDemand = {
    ...demand,
    quarterlyDemand: JSON.parse(
      JSON.stringify(demand.quarterlyDemand)
    ) as QuarterlyDemand[],
  }

  // Track remaining inventory as we process each quarter
  let remainingInventory = currentInventory

  // Adjust each quarter's demand based on available inventory
  for (const quarter of adjustedDemand.quarterlyDemand) {
    const originalRequired = quarter.totalRequired

    // If we have enough inventory to cover this quarter's demand
    if (remainingInventory >= quarter.totalRequired) {
      // Fully cover this quarter with existing inventory
      quarter.totalRequired = 0
      remainingInventory -= originalRequired
      console.log(
        `[DEBUG] Quarter ${quarter.quarter} ${quarter.year}: Fully covered by inventory. Remaining: ${remainingInventory}`
      )
    } else {
      // Partially cover this quarter's demand
      quarter.totalRequired -= remainingInventory
      console.log(
        `[DEBUG] Quarter ${quarter.quarter} ${quarter.year}: Partially covered. Original: ${originalRequired}, Adjusted: ${quarter.totalRequired}`
      )
      remainingInventory = 0
    }

    // Add debug log for each quarter's demand adjustment
    debugLog(
      {
        quarter: quarter.quarter,
        year: quarter.year,
        originalRequired,
        adjustedRequired: quarter.totalRequired,
        remainingInventory,
      },
      `quarter_demand_adjustment_q${quarter.quarter}_${quarter.year}`
    )
  }

  // Get basic allocations with the adjusted demand
  const allocations = await calculateSupplierAllocation(
    componentId,
    locationId,
    adjustedDemand
  )

  // Generate a simple overall strategy description
  let overallStrategy = ''

  if (allocations.length === 1) {
    overallStrategy = `Allocate 100% to ${allocations[0].supplierId} based on superior overall performance.`
  } else if (allocations.length === 2) {
    overallStrategy = `Split allocation between ${allocations[0].supplierId} (${allocations[0].allocationPercentage}%) and ${allocations[1].supplierId} (${allocations[1].allocationPercentage}%) based on their relative performance scores.`
  } else {
    const topSuppliers = allocations
      .slice(0, 2)
      .map((a) => `${a.supplierId} (${a.allocationPercentage}%)`)
      .join(', ')
    overallStrategy = `Distribute allocation across multiple suppliers with the majority going to ${topSuppliers} based on performance scores.`
  }

  // If current inventory covered all demand
  if (adjustedDemand.quarterlyDemand.every((q) => q.totalRequired === 0)) {
    overallStrategy = `Current inventory of ${currentInventory} units is sufficient to cover projected demand. No additional purchases required.`
  }

  // Add component failure rate and price per unit to each allocation
  const enhancedAllocations = allocations.map((allocation) => {
    // Get component failure rate for this supplier if available
    const supplierFailureRate =
      componentRisks?.failureRates.byComponent[componentId]?.bySupplier[
        allocation.supplierId
      ] ?? 0

    // Get price per unit for this supplier-component combination
    const supplierComponent = SUPPLIERS[allocation.supplierId]?.components.find(
      (c) => c.componentId === componentId
    )
    const pricePerUnit = supplierComponent?.pricePerUnit ?? 0

    return {
      ...allocation,
      componentFailureRate: supplierFailureRate,
      pricePerUnit,
    }
  })

  // Calculate quarterly costs and total cost for the strategy
  const quarterlyCosts =
    enhancedAllocations[0]?.quarterlyQuantities?.map((q) => {
      const quarterTotal = enhancedAllocations.reduce((sum, allocation) => {
        const quarterData = allocation.quarterlyQuantities?.find(
          (qq) => qq.quarter === q.quarter && qq.year === q.year
        )
        return sum + (quarterData?.cost ?? 0)
      }, 0)

      return {
        quarter: q.quarter,
        year: q.year,
        totalCost: quarterTotal,
      }
    }) ?? []

  const totalCost = enhancedAllocations.reduce(
    (sum, allocation) => sum + (allocation.totalCost ?? 0),
    0
  )

  // Add this at line 650 (after generating the overall strategy description)
  // This will log the strategy description
  debugLog(
    {
      overallStrategy,
      inventoryCoverage: adjustedDemand.quarterlyDemand.every(
        (q) => q.totalRequired === 0
      )
        ? 'full'
        : 'partial',
    },
    'strategy_description'
  )

  // Create the allocation strategy
  const strategy: AllocationStrategy = {
    componentId,
    locationId,
    overallStrategy,
    currentInventory,
    demandForecast: {
      quarterlyDemand: adjustedDemand.quarterlyDemand,
    },
    originalDemand: {
      quarterlyDemand: demand.quarterlyDemand,
    },
    supplierAllocations: enhancedAllocations,
    quarterlyCosts,
    totalCost,
  }

  // Generate TopLevelSuggestionPieces
  strategy.topLevelSuggestionPieces = generateTopLevelSuggestionPieces(
    strategy,
    componentId,
    locationId
  )

  // Add this at line 670 (after calculating adjusted demand)
  // This will log the adjusted demand and basic allocations
  debugLog(
    {
      adjustedDemand: {
        quarterlyDemand: adjustedDemand.quarterlyDemand.map((q) => ({
          quarter: q.quarter,
          year: q.year,
          totalRequired: q.totalRequired,
          safetyStock: q.safetyStock,
        })),
      },
      allocations: allocations.map((a) => ({
        supplierId: a.supplierId,
        percentage: a.allocationPercentage,
        reason: a.allocationReason,
        quarterlyQuantities: a.quarterlyQuantities,
      })),
    },
    'basic_allocations_with_adjusted_demand'
  )

  // Add this at line 720 (at the end of calculateEnhancedSupplierAllocation)
  // This will log the final enhanced allocation strategy
  debugLog(
    {
      componentId,
      locationId,
      overallStrategy,
      currentInventory,
      supplierAllocations: enhancedAllocations.map((a) => ({
        supplierId: a.supplierId,
        percentage: a.allocationPercentage,
        reason: a.allocationReason,
        quarterlyQuantities: a.quarterlyQuantities,
        totalCost: a.totalCost,
      })),
      quarterlyCosts,
      totalCost,
    },
    'final_enhanced_allocation_strategy'
  )

  // Add this at the end of the function
  flushDebugLog()

  return strategy
}

/**
 * Generates the building blocks for the top-level recommendation
 */
function generateTopLevelSuggestionPieces(
  strategy: AllocationStrategy,
  componentId: ComponentId,
  locationId: LocationId
): TopLevelSuggestionPieces {
  const { currentInventory, supplierAllocations, totalCost } = strategy

  // Get component name from COMPONENTS instead of SUPPLIERS
  const componentName = COMPONENTS[componentId]?.name ?? componentId

  // Get location name (capitalize first letter)
  const locationName = locationId.charAt(0).toUpperCase() + locationId.slice(1)

  // Get the quarter and year from the first quarterly demand
  const quarter = strategy.originalDemand.quarterlyDemand[0]?.quarter ?? 1
  const year = strategy.originalDemand.quarterlyDemand[0]?.year ?? 2025

  // Calculate purchase units (total required minus current inventory)
  const totalRequired =
    strategy.originalDemand.quarterlyDemand[0]?.totalRequired ?? 0
  const purchaseUnits = Math.max(0, totalRequired - currentInventory)

  // Calculate single supplier cost (if we used only the highest quality supplier)
  const highestQualitySupplier = [...supplierAllocations].sort(
    (a, b) => b.qualityScore - a.qualityScore
  )[0]

  const singleSupplierCost = highestQualitySupplier
    ? purchaseUnits * highestQualitySupplier.pricePerUnit
    : 0

  // Calculate savings amount
  const savingsAmount = Math.max(0, singleSupplierCost - (totalCost ?? 0))

  // Calculate supplier allocation units
  const supplierAllocationDetails = supplierAllocations.map((allocation) => {
    const units = Math.round(
      (purchaseUnits * allocation.allocationPercentage) / 100
    )

    return {
      supplierId: allocation.supplierId,
      units,
      percentage: allocation.allocationPercentage,
    }
  })

  return {
    savingsAmount,
    purchaseUnits,
    componentName,
    locationName,
    quarter,
    year,
    supplierAllocations: supplierAllocationDetails,
    singleSupplierCost,
  }
}

// Create a method that calculates enhanced supplier allocation for all components at all locations
