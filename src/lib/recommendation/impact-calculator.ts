import type { ComponentId, LocationId } from '~/lib/types/types'
import {
  type RecommendationImpactLevel,
  type RecommendationPriority,
  type RecommendationUrgency,
} from '~/lib/types/types'
import { makeLocationComponentRecord } from '../utils'
import { calculateAllocationRisk } from './current-strategy'
import {
  calculateOpportunityScore,
  determineRecommendationImpact,
  determineRecommendationPriority,
  determineRecommendationUrgency,
} from './prioritization'
import type {
  CurrentStrategy,
  OverallRecommendedStrategy,
  StrategyImpactCalculation,
} from './recommendation.types'
import * as fs from 'fs'
import * as path from 'path'

// Debug logging setup
const DEBUG_ENABLED = true
const DEBUG_OUTPUT_FILE = 'impact-calculator-debug.json'

// Create a debug data buffer
const debugBuffer: Record<string, unknown> = {}

// Create a debug logger function that adds to the buffer
export function debugLog(data: unknown, label: string) {
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
export function flushDebugLog() {
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

// Debug constants
const DEBUG_COMPONENT = 'HYDRAULICS-MEDIUM'
const DEBUG_LOCATION = 'heartland'

/**
 * Calculates the impact of optimized recommendations compared to the current strategy
 */
export async function calculateRecommendationImpact(
  currentStrategy: CurrentStrategy,
  recommendedStrategy: OverallRecommendedStrategy
): Promise<StrategyImpactCalculation> {
  console.log('\n=== CALCULATING RECOMMENDATION IMPACT ===')

  // Log the input strategies for debugging
  debugLog(
    {
      currentStrategyLocations: Object.keys(currentStrategy.currentInventory),
      recommendedStrategyLocations: Object.keys(recommendedStrategy),
      sampleComponent: DEBUG_COMPONENT,
      sampleLocation: DEBUG_LOCATION,
    },
    'impact_calculation_input'
  )

  // Initialize quarterly structures
  const q1UnitDeltas = makeLocationComponentRecord<number>(0)
  const q1CostDeltas = makeLocationComponentRecord<number>(0)
  const q2UnitDeltas = makeLocationComponentRecord<number>(0)
  const q2CostDeltas = makeLocationComponentRecord<number>(0)

  // Initialize prioritization structures
  const urgency = makeLocationComponentRecord<RecommendationUrgency>('future')
  const impact = makeLocationComponentRecord<RecommendationImpactLevel>('low')
  const priority =
    makeLocationComponentRecord<RecommendationPriority>('standard')
  const opportunityScore = makeLocationComponentRecord<number>(0)

  // Calculate impacts for each location and component
  for (const locationId in recommendedStrategy) {
    for (const componentId in recommendedStrategy[locationId as LocationId]) {
      const typedLocationId = locationId as LocationId
      const typedComponentId = componentId as ComponentId

      // Debug flag
      const isDebugTarget =
        typedLocationId === DEBUG_LOCATION &&
        typedComponentId === DEBUG_COMPONENT

      // Get the recommended strategy for this component/location
      const strategy = recommendedStrategy[typedLocationId][typedComponentId]

      if (!strategy) {
        console.warn(`Missing strategy for ${locationId}/${componentId}`)
        continue
      }

      if (isDebugTarget) {
        console.log(
          `\n[DEBUG] Calculating impact for ${DEBUG_COMPONENT} at ${DEBUG_LOCATION}`
        )

        // Log detailed strategy information for debug target
        debugLog(
          {
            recommendedStrategy: {
              componentId: strategy.componentId,
              locationId: strategy.locationId,
              currentInventory: strategy.currentInventory,
              supplierAllocations: strategy.supplierAllocations.map((s) => ({
                supplierId: s.supplierId,
                percentage: s.allocationPercentage,
                reason: s.allocationReason,
              })),
              quarterlyDemand: strategy.demandForecast.quarterlyDemand.map(
                (q) => ({
                  quarter: q.quarter,
                  year: q.year,
                  totalRequired: q.totalRequired,
                })
              ),
              quarterlyCosts: strategy.quarterlyCosts,
            },
            currentStrategy: {
              currentInventory:
                currentStrategy.currentInventory[typedLocationId][
                  typedComponentId
                ],
              supplierAllocations:
                currentStrategy.supplierAllocations[typedLocationId][
                  typedComponentId
                ],
              quarterlyNeeds:
                currentStrategy.quarterlyNeeds[typedLocationId][
                  typedComponentId
                ],
              quarterlyCosts:
                currentStrategy.quarterlyCosts[typedLocationId][
                  typedComponentId
                ],
            },
          },
          `debug_target_strategy_${typedComponentId}_${typedLocationId}`
        )
      }

      // Extract quarterly data from current strategy
      const q1CurrentUnits =
        currentStrategy.quarterlyNeeds[typedLocationId][typedComponentId][0]
          .totalRequired
      const q1CurrentCost =
        currentStrategy.quarterlyCosts[typedLocationId][typedComponentId][0]
          .totalCost
      const q2CurrentUnits =
        currentStrategy.quarterlyNeeds[typedLocationId][typedComponentId][1]
          .totalRequired
      const q2CurrentCost =
        currentStrategy.quarterlyCosts[typedLocationId][typedComponentId][1]
          .totalCost

      // Extract quarterly data from recommended strategy
      const q1RecommendedCost = strategy.quarterlyCosts?.[0]?.totalCost ?? 0
      const q2RecommendedCost = strategy.quarterlyCosts?.[1]?.totalCost ?? 0

      // Get recommended units from demand forecast
      const q1RecommendedUnits =
        strategy.demandForecast.quarterlyDemand[0]?.totalRequired ?? 0
      const q2RecommendedUnits =
        strategy.demandForecast.quarterlyDemand[1]?.totalRequired ?? 0

      // Calculate quarterly deltas
      q1UnitDeltas[typedLocationId][typedComponentId] =
        q1RecommendedUnits - q1CurrentUnits
      q1CostDeltas[typedLocationId][typedComponentId] =
        q1RecommendedCost - q1CurrentCost
      q2UnitDeltas[typedLocationId][typedComponentId] =
        q2RecommendedUnits - q2CurrentUnits
      q2CostDeltas[typedLocationId][typedComponentId] =
        q2RecommendedCost - q2CurrentCost

      // Log quarterly calculations for all components
      debugLog(
        {
          componentId: typedComponentId,
          locationId: typedLocationId,
          q1: {
            currentUnits: q1CurrentUnits,
            recommendedUnits: q1RecommendedUnits,
            unitDelta: q1UnitDeltas[typedLocationId][typedComponentId],
            currentCost: q1CurrentCost,
            recommendedCost: q1RecommendedCost,
            costDelta: q1CostDeltas[typedLocationId][typedComponentId],
          },
          q2: {
            currentUnits: q2CurrentUnits,
            recommendedUnits: q2RecommendedUnits,
            unitDelta: q2UnitDeltas[typedLocationId][typedComponentId],
            currentCost: q2CurrentCost,
            recommendedCost: q2RecommendedCost,
            costDelta: q2CostDeltas[typedLocationId][typedComponentId],
          },
          total: {
            unitDelta:
              q1UnitDeltas[typedLocationId][typedComponentId] +
              q2UnitDeltas[typedLocationId][typedComponentId],
            costDelta:
              q1CostDeltas[typedLocationId][typedComponentId] +
              q2CostDeltas[typedLocationId][typedComponentId],
          },
        },
        `quarterly_calculations_${typedComponentId}_${typedLocationId}`
      )

      // Calculate total deltas for prioritization (not included in output)
      const totalUnitDelta =
        q1UnitDeltas[typedLocationId][typedComponentId] +
        q2UnitDeltas[typedLocationId][typedComponentId]
      const totalCostDelta =
        q1CostDeltas[typedLocationId][typedComponentId] +
        q2CostDeltas[typedLocationId][typedComponentId]

      // Calculate risk delta (positive means risk reduction)
      const recommendedRisk = await calculateAllocationRisk(
        typedComponentId,
        strategy.supplierAllocations.reduce(
          (acc, allocation) => {
            acc[allocation.supplierId] = allocation.allocationPercentage
            return acc
          },
          {} as Record<string, number>
        )
      )

      const currentRisk = await calculateAllocationRisk(
        typedComponentId,
        currentStrategy.supplierAllocations[typedLocationId][typedComponentId]
      )

      // Amplify by 1000 to make it more comparable to cost impacts
      const riskDelta = (currentRisk - recommendedRisk) * 1000

      // Log risk calculations
      debugLog(
        {
          componentId: typedComponentId,
          locationId: typedLocationId,
          currentRisk,
          recommendedRisk,
          riskDelta,
        },
        `risk_calculations_${typedComponentId}_${typedLocationId}`
      )

      // Apply prioritization logic
      urgency[typedLocationId][typedComponentId] =
        determineRecommendationUrgency(
          1, // Start with Q1
          typedComponentId
        )

      impact[typedLocationId][typedComponentId] = determineRecommendationImpact(
        totalCostDelta, // Use total cost delta for prioritization
        riskDelta,
        typedComponentId
      )

      priority[typedLocationId][typedComponentId] =
        determineRecommendationPriority(
          urgency[typedLocationId][typedComponentId],
          impact[typedLocationId][typedComponentId]
        )

      opportunityScore[typedLocationId][typedComponentId] =
        calculateOpportunityScore(
          totalCostDelta, // Use total cost delta for prioritization
          riskDelta,
          urgency[typedLocationId][typedComponentId],
          typedComponentId
        )

      // Log prioritization calculations
      debugLog(
        {
          componentId: typedComponentId,
          locationId: typedLocationId,
          totalCostDelta,
          riskDelta,
          urgency: urgency[typedLocationId][typedComponentId],
          impact: impact[typedLocationId][typedComponentId],
          priority: priority[typedLocationId][typedComponentId],
          opportunityScore: opportunityScore[typedLocationId][typedComponentId],
        },
        `prioritization_calculations_${typedComponentId}_${typedLocationId}`
      )

      // Debug output
      if (isDebugTarget) {
        console.log(
          `[DEBUG] Q1 Unit delta: ${q1UnitDeltas[typedLocationId][typedComponentId]}`
        )
        console.log(
          `[DEBUG] Q1 Cost delta: $${q1CostDeltas[typedLocationId][typedComponentId]}`
        )
        console.log(
          `[DEBUG] Q2 Unit delta: ${q2UnitDeltas[typedLocationId][typedComponentId]}`
        )
        console.log(
          `[DEBUG] Q2 Cost delta: $${q2CostDeltas[typedLocationId][typedComponentId]}`
        )
        console.log(
          `[DEBUG] Priority: ${priority[typedLocationId][typedComponentId]}`
        )
        console.log(
          `[DEBUG] Opportunity score: ${opportunityScore[typedLocationId][typedComponentId]}`
        )
      }
    }
  }

  // Log summary of all impact calculations
  debugLog(
    {
      totalQ1CostDelta: Object.keys(q1CostDeltas).reduce(
        (total, locationId) => {
          return (
            total +
            Object.values(q1CostDeltas[locationId as LocationId]).reduce(
              (sum, delta) => sum + delta,
              0
            )
          )
        },
        0
      ),
      totalQ2CostDelta: Object.keys(q2CostDeltas).reduce(
        (total, locationId) => {
          return (
            total +
            Object.values(q2CostDeltas[locationId as LocationId]).reduce(
              (sum, delta) => sum + delta,
              0
            )
          )
        },
        0
      ),
      totalCostDelta: Object.keys(q1CostDeltas).reduce((total, locationId) => {
        return (
          total +
          Object.values(q1CostDeltas[locationId as LocationId]).reduce(
            (sum, delta) => sum + delta,
            0
          ) +
          Object.values(q2CostDeltas[locationId as LocationId]).reduce(
            (sum, delta) => sum + delta,
            0
          )
        )
      }, 0),
      priorityBreakdown: {
        critical: countPriorities(priority, 'critical'),
        important: countPriorities(priority, 'important'),
        standard: countPriorities(priority, 'standard'),
        optional: countPriorities(priority, 'optional'),
      },
    },
    'impact_calculation_summary'
  )

  // Flush debug log before returning
  flushDebugLog()

  // Return the impact calculation with exactly the fields in StrategyImpactCalculation
  return {
    currentStrategy,
    recommendedStrategy,
    impact: {
      q1UnitDeltas,
      q1CostDeltas,
      q2UnitDeltas,
      q2CostDeltas,
      urgency,
      impact,
      priority,
      opportunityScore,
    },
  }
}

/**
 * Helper function to count priorities by type
 */
function countPriorities(
  priorityMap: Record<LocationId, Record<ComponentId, RecommendationPriority>>,
  priorityType: RecommendationPriority
): number {
  let count = 0
  for (const locationId in priorityMap) {
    for (const componentId in priorityMap[locationId as LocationId]) {
      if (
        priorityMap[locationId as LocationId][componentId as ComponentId] ===
        priorityType
      ) {
        count++
      }
    }
  }
  return count
}
