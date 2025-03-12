import { PrismaClient } from '@prisma/client'
import { getLatestAnalysisResults } from '~/lib/analysis/storage'
import { getTargetInventoryLevel, LOCATIONS, SUPPLIERS } from '~/lib/constants'
import type {
  ComponentInventory,
  DailyLocationReport,
} from '~/lib/types/historicals.types'
import type {
  ComponentId,
  LocationId,
  SupplierId,
  TractorModelId,
} from '~/lib/types/types'
import { COMPONENT_IDS, LOCATION_IDS, SUPPLIER_IDS } from '~/lib/types/types'
import { calculateDailyComponentDemand } from './component-demand'
import {
  makeLocationComponentRecord,
  makeLocationComponentSupplierRecord,
  makeLocationComponentQuarterlyRecord,
} from '../utils'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Replace the DEBUG_COMPONENT and DEBUG_LOCATION constants with a more comprehensive debug approach
const DEBUG_ENABLED = true
const DEBUG_OUTPUT_FILE = 'current-strategy-debug.json'
const DEBUG_LOCATION: LocationId = 'heartland' // Only log detailed info for this location

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
 * Represents the current inventory strategy derived from historical data
 */
export interface CurrentStrategy {
  // Current inventory levels by location and component
  currentInventory: Record<LocationId, Record<ComponentId, number>>

  // Current supplier allocation percentages (0-1)
  supplierAllocations: Record<
    LocationId,
    Record<ComponentId, Record<SupplierId, number>>
  >

  // Projected inventory needs for next two quarters
  projectedNeeds: Record<LocationId, Record<ComponentId, number>>

  // Projected costs under current allocation strategy
  projectedCosts: Record<LocationId, Record<ComponentId, number>>

  // Quarterly needs
  quarterlyNeeds: Record<
    LocationId,
    Record<
      ComponentId,
      Array<{
        quarter: number
        year: number
        totalRequired: number
      }>
    >
  >

  // Quarterly costs
  quarterlyCosts: Record<
    LocationId,
    Record<
      ComponentId,
      Array<{
        quarter: number
        year: number
        totalCost: number
      }>
    >
  >
}

/**
 * Fetches the most recent location reports directly from the database
 */
export async function getLatestLocationReports(): Promise<
  DailyLocationReport[]
> {
  // Get the most recent daily report
  const latestReport = await prisma.dailyReport.findFirst({
    orderBy: {
      date: 'desc',
    },
    include: {
      locationReports: {
        include: {
          inventory: true,
          modelDemand: true,
          deliveries: true,
          failures: true,
        },
      },
    },
  })

  if (!latestReport) {
    throw new Error('No historical data found')
  }

  // Convert Prisma model to our internal type
  return latestReport.locationReports.map((report) => ({
    date: report.date,
    location: report.locationId as LocationId,
    marketTrendIndex: report.marketTrendIndex,
    inflationRate: report.inflationRate,
    modelDemand: report.modelDemand.map((md) => ({
      modelId: md.modelId as TractorModelId,
      demandUnits: md.demandUnits,
    })),
    componentInventory: report.inventory.map((inv) => ({
      supplier: inv.supplierId as SupplierId,
      componentId: inv.componentId as ComponentId,
      quantity: inv.quantity,
    })),
    deliveries: report.deliveries.map((d) => ({
      supplier: d.supplierId as SupplierId,
      componentId: d.componentId as ComponentId,
      orderSize: d.orderSize,
      leadTimeVariance: d.leadTimeVariance,
      discount: d.discount,
    })),
    componentFailures: report.failures.map((f) => ({
      supplier: f.supplierId as SupplierId,
      componentId: f.componentId as ComponentId,
      failureRate: f.failureRate,
    })),
  }))
}

/**
 * Retrieves the current inventory levels for all components at all locations
 * @returns Record of inventory levels by location and component
 */
export async function getCurrentInventoryLevels(): Promise<
  Record<LocationId, Record<ComponentId, number>>
> {
  // Get the latest location reports for current inventory levels
  const latestReports = await getLatestLocationReports()

  // Initialize result structure with all possible keys
  const currentInventory: Record<
    LocationId,
    Record<ComponentId, number>
  > = Object.fromEntries(
    LOCATION_IDS.map((locId) => [
      locId,
      Object.fromEntries(COMPONENT_IDS.map((compId) => [compId, 0])),
    ])
  ) as Record<LocationId, Record<ComponentId, number>>

  // Process each location report to get current inventory
  for (const report of latestReports) {
    const locationId = report.location

    // Group inventory by component
    const inventoryByComponent: Record<ComponentId, ComponentInventory[]> =
      {} as Record<ComponentId, ComponentInventory[]>
    COMPONENT_IDS.forEach((compId) => {
      inventoryByComponent[compId] = []
    })

    for (const inventory of report.componentInventory) {
      inventoryByComponent[inventory.componentId].push(inventory)
    }

    // Calculate current inventory for each component
    for (const [componentId, inventories] of Object.entries(
      inventoryByComponent
    )) {
      const typedComponentId = componentId as ComponentId

      // Calculate total inventory for this component
      const totalInventory = inventories.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      )
      currentInventory[locationId][typedComponentId] = totalInventory
    }
  }

  return currentInventory
}

/**
 * Extracts the current inventory strategy from historical data
 */
export async function extractCurrentStrategy(): Promise<CurrentStrategy> {
  console.log('=== EXTRACTING CURRENT STRATEGY ===')
  debugLog('Starting current strategy extraction', 'extraction_start')

  // Get current inventory levels
  const currentInventory = await getCurrentInventoryLevels()
  debugLog(currentInventory, 'current_inventory_levels')

  // Initialize result structures with all possible keys
  const supplierAllocations = makeLocationComponentSupplierRecord<number>(0)
  const projectedNeeds = makeLocationComponentRecord<number>(0)
  const projectedCosts = makeLocationComponentRecord<number>(0)

  // Initialize quarterly structures
  const quarterlyNeeds = makeLocationComponentQuarterlyRecord<{
    quarter: number
    year: number
    totalRequired: number
  }>(() => [
    { quarter: 1, year: 2025, totalRequired: 0 },
    { quarter: 2, year: 2025, totalRequired: 0 },
  ])

  const quarterlyCosts = makeLocationComponentQuarterlyRecord<{
    quarter: number
    year: number
    totalCost: number
  }>(() => [
    { quarter: 1, year: 2025, totalCost: 0 },
    { quarter: 2, year: 2025, totalCost: 0 },
  ])

  // Get the latest location reports for supplier allocations
  const latestReports = await getLatestLocationReports()
  debugLog(
    latestReports.map((r) => ({
      location: r.location,
      date: r.date,
      inventoryCount: r.componentInventory.length,
      modelDemandCount: r.modelDemand.length,
    })),
    'latest_reports_summary'
  )

  // Log which suppliers are available at each location according to constants
  const locationSupplierMap: Record<LocationId, SupplierId[]> = {} as Record<
    LocationId,
    SupplierId[]
  >
  for (const locationId of LOCATION_IDS) {
    locationSupplierMap[locationId] = LOCATIONS[locationId].suppliers
  }
  debugLog(locationSupplierMap, 'location_supplier_map')

  // Process each location report to get supplier allocations
  for (const report of latestReports) {
    const locationId = report.location
    const isDebugLocation = locationId === DEBUG_LOCATION

    if (isDebugLocation) {
      debugLog(
        {
          location: locationId,
          date: report.date,
          inventoryItems: report.componentInventory.length,
        },
        `processing_report_${locationId}`
      )
    }

    // Group inventory by component
    const inventoryByComponent: Record<ComponentId, ComponentInventory[]> =
      {} as Record<ComponentId, ComponentInventory[]>
    COMPONENT_IDS.forEach((compId) => {
      inventoryByComponent[compId] = []
    })

    for (const inventory of report.componentInventory) {
      inventoryByComponent[inventory.componentId].push(inventory)
    }

    // Log the full inventory by component for this location (only for debug location)
    if (isDebugLocation) {
      debugLog(inventoryByComponent, `inventory_by_component_${locationId}`)
    }

    // Calculate supplier allocations
    for (const [componentId, inventories] of Object.entries(
      inventoryByComponent
    )) {
      const typedComponentId = componentId as ComponentId

      // Create a fresh allocation object for this component
      // This ensures each component has its own independent allocation object
      // ONLY include suppliers that:
      // 1. Actually offer this component
      // 2. Are available at this location
      supplierAllocations[locationId][typedComponentId] = Object.fromEntries(
        SUPPLIER_IDS.filter((supplierId) => {
          const supplier = SUPPLIERS[supplierId]
          // Check if supplier offers this component
          const offersComponent = supplier.components.some(
            (c) => c.componentId === typedComponentId
          )
          // Check if supplier is available at this location
          const availableAtLocation =
            LOCATIONS[locationId].suppliers.includes(supplierId)
          // Both conditions must be true
          return offersComponent && availableAtLocation
        }).map((supplierId) => [supplierId, 0])
      ) as Record<SupplierId, number>

      // Calculate total inventory for this component
      const totalInventory = inventories.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      )

      // Only log detailed info for debug location
      if (isDebugLocation) {
        // Log which suppliers are available for this component at this location
        const availableSuppliers = LOCATIONS[locationId].suppliers.filter(
          (supplierId) =>
            SUPPLIERS[supplierId].components.some(
              (c) => c.componentId === componentId
            )
        )

        debugLog(
          {
            location: locationId,
            component: componentId,
            availableSuppliers,
            inventoryItems: inventories.map((inv) => ({
              supplier: inv.supplier,
              quantity: inv.quantity,
            })),
          },
          `allocation_calculation_${locationId}_${componentId}`
        )

        // Log before allocation calculation
        debugLog(
          {
            location: locationId,
            component: componentId,
            totalInventory,
            inventoriesBySupplier: inventories.map((inv) => ({
              supplier: inv.supplier,
              quantity: inv.quantity,
              percentageOfTotal:
                totalInventory > 0 ? (inv.quantity / totalInventory) * 100 : 0,
            })),
          },
          `pre_allocation_${locationId}_${componentId}`
        )
      }

      // Calculate supplier allocations - only for suppliers with actual inventory
      if (totalInventory > 0) {
        for (const inventory of inventories) {
          const percentage = inventory.quantity / totalInventory
          supplierAllocations[locationId][typedComponentId][
            inventory.supplier
          ] = percentage
        }
      }

      // Only log detailed info for debug location
      if (isDebugLocation) {
        // Verify total allocation is approximately 100% (accounting for floating point precision)
        const totalAllocation = Object.values(
          supplierAllocations[locationId][typedComponentId]
        ).reduce((sum, pct) => sum + pct, 0)

        // Log after allocation calculation
        debugLog(
          {
            location: locationId,
            component: componentId,
            allocations: Object.entries(
              supplierAllocations[locationId][typedComponentId]
            )
              .filter(([_, value]) => value > 0)
              .map(([supplierId, percentage]) => ({
                supplier: supplierId,
                percentage: percentage * 100,
              })),
            totalAllocation: totalAllocation * 100,
            isValid:
              Math.abs(totalAllocation - 1.0) < 0.001 || totalAllocation === 0,
          },
          `post_allocation_${locationId}_${componentId}`
        )
      }
    }

    // Add debug log after processing all components for this location
    if (isDebugLocation) {
      debugLog(
        JSON.parse(JSON.stringify(supplierAllocations[locationId])),
        `location_allocations_after_processing_${locationId}`
      )
    }
  }

  // Add debug log before starting the needs calculation
  debugLog(
    JSON.parse(JSON.stringify(supplierAllocations)),
    'supplier_allocations_before_needs_calculation'
  )

  // Now calculate projected needs and costs for each location and component
  for (const locationId of LOCATION_IDS) {
    // Add debug log at the start of processing each location
    if (locationId === DEBUG_LOCATION) {
      debugLog(
        JSON.parse(JSON.stringify(supplierAllocations[locationId])),
        `supplier_allocations_before_processing_needs_${locationId}`
      )
    }

    for (const componentId of COMPONENT_IDS) {
      // Only debug our target location
      const isDebugTarget = locationId === DEBUG_LOCATION

      // Add debug log at the start of processing each component
      if (isDebugTarget) {
        debugLog(
          JSON.parse(
            JSON.stringify(supplierAllocations[locationId][componentId])
          ),
          `supplier_allocations_before_processing_needs_${locationId}_${componentId}`
        )
      }

      try {
        if (isDebugTarget) {
          console.log(
            `\n[DEBUG] Calculating projected needs for ${componentId} at ${locationId}`
          )
        }

        // Get daily component demand using our new method
        const dailyComponentDemand = await calculateDailyComponentDemand(
          locationId,
          componentId
        )

        // Skip if no daily demand data
        if (
          !dailyComponentDemand.dailyDemand ||
          dailyComponentDemand.dailyDemand.length === 0
        ) {
          if (isDebugTarget) {
            console.log(`[DEBUG] No daily demand data found, skipping`)
          }
          continue
        }

        // Get current inventory level
        const currentInv = currentInventory[locationId][componentId]

        // Get target inventory level from constants
        const targetInventoryLevel = getTargetInventoryLevel(
          locationId,
          componentId
        )

        if (isDebugTarget) {
          console.log(`[DEBUG] Current inventory: ${currentInv}`)
          console.log(`[DEBUG] Target inventory level: ${targetInventoryLevel}`)
          console.log(
            `[DEBUG] Daily demand data points: ${dailyComponentDemand.dailyDemand.length}`
          )

          // Instead of logging each day, just log summary statistics
          const totalDemand = dailyComponentDemand.dailyDemand.reduce(
            (sum, day) => sum + day.totalDemand,
            0
          )
          const avgDailyDemand =
            totalDemand / dailyComponentDemand.dailyDemand.length

          console.log(`[DEBUG] Total demand over period: ${totalDemand}`)
          console.log(
            `[DEBUG] Average daily demand: ${avgDailyDemand.toFixed(2)}`
          )
        }

        // Initialize total purchase need
        let totalPurchaseNeed = 0

        // First, backfill to target level if needed
        if (currentInv < targetInventoryLevel) {
          totalPurchaseNeed += targetInventoryLevel - currentInv
          if (isDebugTarget) {
            console.log(
              `[DEBUG] Initial backfill needed: ${targetInventoryLevel - currentInv}`
            )
          }
        }

        // Simulate day-by-day inventory management
        let simulatedInventory = currentInv
        if (simulatedInventory < targetInventoryLevel) {
          simulatedInventory = targetInventoryLevel // Initial backfill
        }

        if (isDebugTarget) {
          console.log(
            `[DEBUG] Starting simulation with inventory: ${simulatedInventory}`
          )
        }

        // NEW: Split daily demand into quarters
        const q1Days = dailyComponentDemand.dailyDemand.filter(
          (day) => new Date(day.date).getMonth() < 3 // Jan, Feb, Mar
        )
        const q2Days = dailyComponentDemand.dailyDemand.filter(
          (day) =>
            new Date(day.date).getMonth() >= 3 &&
            new Date(day.date).getMonth() < 6 // Apr, May, Jun
        )

        // NEW: Calculate quarterly needs
        let q1PurchaseNeed = 0
        let q2PurchaseNeed = 0
        let q1SimulatedInventory = simulatedInventory
        let q2SimulatedInventory = 0 // Will be updated after Q1 simulation

        // Process Q1 days
        for (const dayDemand of q1Days) {
          // Reduce inventory by day's demand
          q1SimulatedInventory -= dayDemand.totalDemand

          // Backfill to target level
          if (q1SimulatedInventory < targetInventoryLevel) {
            const backfillAmount = targetInventoryLevel - q1SimulatedInventory
            q1PurchaseNeed += backfillAmount
            q1SimulatedInventory = targetInventoryLevel
          }
        }

        // Start Q2 with ending Q1 inventory
        q2SimulatedInventory = q1SimulatedInventory

        // Process Q2 days
        for (const dayDemand of q2Days) {
          // Reduce inventory by day's demand
          q2SimulatedInventory -= dayDemand.totalDemand

          // Backfill to target level
          if (q2SimulatedInventory < targetInventoryLevel) {
            const backfillAmount = targetInventoryLevel - q2SimulatedInventory
            q2PurchaseNeed += backfillAmount
            q2SimulatedInventory = targetInventoryLevel
          }
        }

        // Store the quarterly purchase needs
        quarterlyNeeds[locationId][componentId][0].totalRequired =
          Math.round(q1PurchaseNeed)
        quarterlyNeeds[locationId][componentId][1].totalRequired =
          Math.round(q2PurchaseNeed)

        // Store the total purchase need
        projectedNeeds[locationId][componentId] = Math.round(
          q1PurchaseNeed + q2PurchaseNeed
        )

        if (isDebugTarget) {
          console.log(
            `[DEBUG] Q1 purchase need: ${q1PurchaseNeed} (rounded to ${quarterlyNeeds[locationId][componentId][0].totalRequired})`
          )
          console.log(
            `[DEBUG] Q2 purchase need: ${q2PurchaseNeed} (rounded to ${quarterlyNeeds[locationId][componentId][1].totalRequired})`
          )
          console.log(
            `[DEBUG] Total purchase need: ${q1PurchaseNeed + q2PurchaseNeed} (rounded to ${projectedNeeds[locationId][componentId]})`
          )
        }

        // Calculate projected costs based on current supplier allocations
        let totalCost = 0
        let q1Cost = 0
        let q2Cost = 0

        // Calculate Q1 costs if we need to purchase
        if (q1PurchaseNeed > 0) {
          if (isDebugTarget) {
            console.log(
              `\n[DEBUG] Calculating Q1 costs for purchase need of ${q1PurchaseNeed} units`
            )
          }

          for (const [supplierId, percentage] of Object.entries(
            supplierAllocations[locationId][componentId]
          )) {
            // Skip suppliers with zero allocation
            if (percentage === 0) continue

            // Find the supplier's price for this component
            const supplier = SUPPLIERS[supplierId as SupplierId]
            const componentPrice =
              supplier?.components.find((c) => c.componentId === componentId)
                ?.pricePerUnit ?? 0

            // Calculate supplier's portion of the purchase (rounded up)
            const supplierPurchase = Math.ceil(q1PurchaseNeed * percentage)

            // Calculate cost for this supplier's portion
            const supplierCost = componentPrice * supplierPurchase
            q1Cost += supplierCost

            if (isDebugTarget) {
              console.log(
                `[DEBUG] Q1 - Supplier ${supplierId}: ${percentage * 100}% allocation, ${supplierPurchase} units at $${componentPrice} each = $${supplierCost}`
              )
            }
          }
        }

        // Calculate Q2 costs if we need to purchase
        if (q2PurchaseNeed > 0) {
          if (isDebugTarget) {
            console.log(
              `\n[DEBUG] Calculating Q2 costs for purchase need of ${q2PurchaseNeed} units`
            )
          }

          for (const [supplierId, percentage] of Object.entries(
            supplierAllocations[locationId][componentId]
          )) {
            // Skip suppliers with zero allocation
            if (percentage === 0) continue

            // Find the supplier's price for this component
            const supplier = SUPPLIERS[supplierId as SupplierId]
            const componentPrice =
              supplier?.components.find((c) => c.componentId === componentId)
                ?.pricePerUnit ?? 0

            // Calculate supplier's portion of the purchase (rounded up)
            const supplierPurchase = Math.ceil(q2PurchaseNeed * percentage)

            // Calculate cost for this supplier's portion
            const supplierCost = componentPrice * supplierPurchase
            q2Cost += supplierCost

            if (isDebugTarget) {
              console.log(
                `[DEBUG] Q2 - Supplier ${supplierId}: ${percentage * 100}% allocation, ${supplierPurchase} units at $${componentPrice} each = $${supplierCost}`
              )
            }
          }
        }

        // Store the quarterly costs
        quarterlyCosts[locationId][componentId][0].totalCost =
          Math.round(q1Cost)
        quarterlyCosts[locationId][componentId][1].totalCost =
          Math.round(q2Cost)

        // Store the total cost
        totalCost = q1Cost + q2Cost
        projectedCosts[locationId][componentId] = Math.round(totalCost)

        if (isDebugTarget) {
          console.log(
            `[DEBUG] Q1 projected cost: $${q1Cost} (rounded to $${quarterlyCosts[locationId][componentId][0].totalCost})`
          )
          console.log(
            `[DEBUG] Q2 projected cost: $${q2Cost} (rounded to $${quarterlyCosts[locationId][componentId][1].totalCost})`
          )
          console.log(
            `[DEBUG] Total projected cost: $${totalCost} (rounded to $${projectedCosts[locationId][componentId]})`
          )
        }

        // Add debug log after processing this component
        if (isDebugTarget) {
          debugLog(
            JSON.parse(
              JSON.stringify(supplierAllocations[locationId][componentId])
            ),
            `supplier_allocations_after_processing_needs_${locationId}_${componentId}`
          )
        }
      } catch (error) {
        console.error(
          `Error calculating projected needs for ${locationId}/${componentId}:`,
          error
        )
        // Continue with other components
      }
    }

    // Add debug log after processing all components for this location
    if (locationId === DEBUG_LOCATION) {
      debugLog(
        JSON.parse(JSON.stringify(supplierAllocations[locationId])),
        `supplier_allocations_after_processing_needs_${locationId}`
      )
    }
  }

  // Add a final debug log with the complete supplier allocations
  debugLog(
    JSON.parse(JSON.stringify(supplierAllocations)),
    'final_supplier_allocations'
  )

  // Flush all debug data to file
  flushDebugLog()

  return {
    currentInventory,
    supplierAllocations,
    projectedNeeds,
    projectedCosts,
    quarterlyNeeds,
    quarterlyCosts,
  }
}

/**
 * Calculates the cost of a specific allocation strategy
 */
export function calculateAllocationCost(
  componentId: ComponentId,
  totalUnits: number,
  allocation: Record<SupplierId, number>
): number {
  let totalCost = 0

  for (const [supplierId, percentage] of Object.entries(allocation)) {
    // Find the supplier's price for this component
    const supplier = SUPPLIERS[supplierId as SupplierId]
    const componentPrice =
      supplier?.components.find((c) => c.componentId === componentId)
        ?.pricePerUnit ?? 0

    // Calculate supplier's portion of the purchase (rounded up)
    const supplierUnits = Math.ceil(totalUnits * (percentage / 100)) // Percentage is 0-100

    // Calculate cost for this supplier's portion
    const supplierCost = componentPrice * supplierUnits
    totalCost += supplierCost
  }

  return Math.round(totalCost)
}

/**
 * Calculates the risk score for a specific allocation strategy
 * Higher score = higher risk
 */
export async function calculateAllocationRisk(
  componentId: ComponentId,
  allocation: Record<SupplierId, number>
): Promise<number> {
  // Get the latest analysis results
  const analysisResults = await getLatestAnalysisResults()

  if (!analysisResults) {
    throw new Error('No analysis results found')
  }

  let totalRisk = 0
  let totalValidPercentage = 0

  for (const [supplierId, percentage] of Object.entries(allocation)) {
    // Skip suppliers with zero allocation
    if (percentage === 0) continue

    // Skip suppliers that don't offer this component
    const supplier = SUPPLIERS[supplierId as SupplierId]
    if (!supplier.components.some((c) => c.componentId === componentId)) {
      console.warn(
        `Supplier ${supplierId} doesn't offer component ${componentId} but has allocation ${percentage}%`
      )
      continue
    }

    // Get failure rate for this supplier-component combination
    const failureRate =
      analysisResults.supplierPerformance.failureRates.bySupplierId[supplierId]
        ?.byComponent[componentId] || 0

    // Get lead time variance for this supplier
    const leadTimeVariance =
      analysisResults.supplierPerformance.leadTimeVariance.bySupplierId[
        supplierId
      ]?.overall || 0

    // Calculate risk score (weighted combination of failure rate and lead time variance)
    const riskScore = failureRate * 0.7 + leadTimeVariance * 0.3

    // Add to total risk, weighted by allocation percentage
    totalRisk += riskScore * (percentage / 100) // Percentage is 0-100
    totalValidPercentage += percentage
  }

  // If we have valid suppliers, normalize the risk based on valid percentage
  if (totalValidPercentage > 0 && totalValidPercentage < 100) {
    totalRisk = totalRisk * (100 / totalValidPercentage)
  }

  return totalRisk
}

/**
 * Derives the current strategy for a specific component at a location
 * Returns data in a format suitable for UI consumption
 */
export async function deriveCurrentStrategy(
  historicalData: DailyLocationReport[],
  locationId: LocationId,
  componentId: ComponentId
): Promise<{
  totalInventory: number
  supplierAllocation: {
    id: string
    label: string
    value: number
  }[]
}> {
  // Filter to relevant location and recent data (last quarter)
  const recentData = historicalData
    .filter((report) => report.location === locationId)
    .slice(-90)

  if (recentData.length === 0) {
    throw new Error(`No historical data found for location ${locationId}`)
  }

  // Get the most recent inventory snapshot
  const latestReport = recentData[recentData.length - 1]
  const relevantInventory = latestReport.componentInventory.filter(
    (inv) => inv.componentId === componentId
  )

  // Calculate total inventory
  const totalInventory = relevantInventory.reduce(
    (sum, inv) => sum + inv.quantity,
    0
  )

  // Initialize supplier map with all possible suppliers
  const supplierMap: Record<SupplierId, number> = Object.fromEntries(
    SUPPLIER_IDS.map((id) => [id, 0])
  ) as Record<SupplierId, number>

  // Update with actual quantities
  relevantInventory.forEach((inv) => {
    supplierMap[inv.supplier] = inv.quantity
  })

  // Convert to percentage allocation
  const supplierAllocation = Object.entries(supplierMap)
    .filter(([supplierId, _]) => {
      // Only include suppliers available at this location
      return LOCATIONS[locationId].suppliers.includes(supplierId as SupplierId)
    })
    .map(([supplierId, quantity]) => {
      const percentage = Math.round((quantity / totalInventory) * 100) || 0

      return {
        id: supplierId,
        label: supplierId,
        value: percentage,
      }
    })

  return {
    totalInventory,
    supplierAllocation,
  }
}
