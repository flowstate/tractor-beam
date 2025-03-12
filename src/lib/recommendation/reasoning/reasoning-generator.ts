import {
  type AllocationStrategy,
  type ReasonedAllocationStrategy,
} from '../recommendation.types'
import { COMPONENTS } from '../../constants'
import { generateQuantityReasoning } from './quantity'
import {
  generateAllocationReasoning,
  generateRiskConsiderations,
} from './allocation'
import * as fs from 'fs'
import * as path from 'path'

// Debug logging setup
const DEBUG_ENABLED = true
const DEBUG_OUTPUT_FILE = 'reasoning-debug.json'

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
 * Generates a reasoned allocation strategy from a basic allocation strategy
 * @param strategy The allocation strategy to enhance with reasoning
 * @returns Enhanced allocation strategy with reasoning
 */
export async function generateReasonedStrategy(
  strategy: AllocationStrategy
): Promise<ReasonedAllocationStrategy> {
  // Log the input strategy
  debugLog(
    {
      componentId: strategy.componentId,
      locationId: strategy.locationId,
      currentInventory: strategy.currentInventory,
      supplierAllocations: strategy.supplierAllocations.map((s) => ({
        supplierId: s.supplierId,
        percentage: s.allocationPercentage,
        reason: s.allocationReason,
      })),
      quarterlyDemand: strategy.demandForecast.quarterlyDemand.map((q) => ({
        quarter: q.quarter,
        year: q.year,
        totalRequired: q.totalRequired,
        safetyStock: q.safetyStock,
      })),
    },
    'reasoning_input_strategy'
  )

  // Generate top-level recommendation
  const topLevelRecommendation = generateTopLevelRecommendation(strategy)
  debugLog(topLevelRecommendation, 'top_level_recommendation')

  // Generate quantity reasoning from the quantity module
  const quantityReasoning = await generateQuantityReasoning(strategy)
  debugLog(quantityReasoning, 'quantity_reasoning')

  // Generate supplier allocation reasoning from the allocation module
  const allocationReasoning = generateAllocationReasoning(strategy)
  debugLog(allocationReasoning, 'allocation_reasoning')

  // Generate risk considerations from the allocation module
  const riskConsiderations = generateRiskConsiderations(strategy)
  debugLog(riskConsiderations, 'risk_considerations')

  // Ensure the building blocks are preserved in the final output
  const topLevelSuggestionPieces = strategy.topLevelSuggestionPieces
  const allocationRationaleBlocks = strategy.allocationRationaleBlocks
  const supplierComparisonBlocks = strategy.supplierComparisonBlocks

  // Combine everything into a reasoned allocation strategy
  const reasonedStrategy: ReasonedAllocationStrategy = {
    ...strategy,
    topLevelRecommendation,
    quantityReasoning,
    allocationReasoning,
    riskConsiderations,
    // Ensure building blocks are included
    topLevelSuggestionPieces,
    allocationRationaleBlocks,
    supplierComparisonBlocks,
  }

  // Log the final reasoned strategy (just the reasoning parts to keep it manageable)
  debugLog(
    {
      componentId: strategy.componentId,
      locationId: strategy.locationId,
      topLevelRecommendation,
      quantityReasoning: {
        summary: quantityReasoning.summary,
        yoyGrowthData: quantityReasoning.yoyGrowthData,
      },
      allocationReasoning: {
        summary: allocationReasoning.summary,
        supplierReasonings: allocationReasoning.supplierReasonings.map(
          (sr) => ({
            supplierId: sr.supplierId,
            summary: sr.summary,
          })
        ),
      },
      riskConsiderations: {
        summary: riskConsiderations.summary,
        factorCount: riskConsiderations.factors.length,
      },
    },
    'final_reasoned_strategy'
  )

  // Flush debug log before returning
  flushDebugLog()

  return reasonedStrategy
}

/**
 * Generates a top-level recommendation based on the allocation strategy
 * @param strategy The allocation strategy
 * @returns A concise top-level recommendation
 */
function generateTopLevelRecommendation(strategy: AllocationStrategy): string {
  const { componentId, locationId, currentInventory, demandForecast } = strategy

  // Get component name for better readability
  const componentName = COMPONENTS[componentId]?.name ?? componentId

  // Get location name (capitalize first letter)
  const locationName = locationId.charAt(0).toUpperCase() + locationId.slice(1)

  // Calculate total required units for Q1 and Q2
  const q1Required = demandForecast.quarterlyDemand[0]?.totalRequired ?? 0
  const q2Required = demandForecast.quarterlyDemand[1]?.totalRequired ?? 0

  // Adjust for current inventory
  const q1Purchase = Math.max(0, q1Required - currentInventory)
  const q2Purchase = q2Required

  // Log the calculation details
  debugLog(
    {
      componentName,
      locationName,
      currentInventory,
      q1Required,
      q2Required,
      q1Purchase,
      q2Purchase,
    },
    'top_level_recommendation_calculation'
  )

  // Generate recommendation based on purchase amounts
  if (q1Purchase <= 0) {
    return `Current inventory of ${componentName} at ${locationName} is sufficient for Q1 2025.`
  } else {
    return `Purchase ${q1Purchase} units of ${componentName} for ${locationName} for Q1 2025.`
  }
}
