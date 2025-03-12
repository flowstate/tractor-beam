import {
  type HistoricalData,
  type SupplierPerformanceAnalysis,
  type DemandPatternAnalysis,
  type ComponentRiskAnalysis,
  type InventoryParameterAnalysis,
} from '../types/analytics.types'
import { calculateMean, calculateStdDev } from './utils'

/**
 * Component demand data derived from model demand
 */
interface ComponentDemandData {
  byComponentLocationDay: Record<string, Record<string, Record<string, number>>> // componentId -> locationId -> dateString -> demand
  statistics: {
    byComponentLocation: Record<
      string,
      Record<
        string,
        {
          mean: number
          stdDev: number
          byQuarter: Record<number, { mean: number; stdDev: number }>
        }
      >
    >
  }
}

/**
 * Calculates inventory optimization parameters based on other analysis results
 * - Determines optimal inventory levels by component, location, and season
 * - Calculates reorder points
 * - Recommends safety stock levels based on supplier reliability
 * - Develops inflation-adjusted purchasing strategies
 * - Creates supplier-specific seasonal inventory adjustments
 */
export async function calculateInventoryParameters(
  supplierPerformance: SupplierPerformanceAnalysis,
  demandPatterns: DemandPatternAnalysis,
  componentRisks: ComponentRiskAnalysis,
  historicalData: HistoricalData
): Promise<InventoryParameterAnalysis> {
  // Derive component-level demand from model demand
  const componentDemand = deriveComponentDemand(historicalData)

  // Initialize result structure
  const result: InventoryParameterAnalysis = {
    optimalLevels: {
      byComponentLocation: {},
    },
    reorderPoints: {
      byComponentLocation: {},
    },
    safetyStock: {
      byComponentLocation: {},
    },
    inflationAdjustments: {
      thresholds: {
        low: 0.02, // 2%
        medium: 0.05, // 5%
        high: 0.08, // 8%
      },
      strategies: {
        low: 'Standard ordering patterns',
        medium: 'Consider bulk purchases of stable components',
        high: 'Accelerate purchases and increase inventory of critical components',
      },
    },
    supplierAdjustments: {},
  }

  // Extract component, location, and supplier IDs from the analysis results
  const componentIds = Object.keys(componentRisks.failureRates.byComponent)
  const locationIds = Object.keys(demandPatterns.seasonalDemand.byLocation)
  const supplierIds = Object.keys(
    supplierPerformance.leadTimeVariance.bySupplierId
  )

  // Initialize component-location data
  componentIds.forEach((componentId) => {
    result.optimalLevels.byComponentLocation[componentId] = {}
    result.reorderPoints.byComponentLocation[componentId] = {}
    result.safetyStock.byComponentLocation[componentId] = {}

    locationIds.forEach((locationId) => {
      result.optimalLevels.byComponentLocation[componentId][locationId] = {
        base: 0,
        byQuarter: { 1: 0, 2: 0, 3: 0, 4: 0 },
      }

      result.reorderPoints.byComponentLocation[componentId][locationId] = {
        base: 0,
        byQuarter: { 1: 0, 2: 0, 3: 0, 4: 0 },
      }

      result.safetyStock.byComponentLocation[componentId][locationId] = {
        base: 0,
        bySupplier: {},
        byQuarter: { 1: 0, 2: 0, 3: 0, 4: 0 },
      }

      // Initialize supplier-specific safety stock adjustments
      supplierIds.forEach((supplierId) => {
        result.safetyStock.byComponentLocation[componentId][
          locationId
        ].bySupplier[supplierId] = 0
      })
    })
  })

  // Initialize supplier-specific adjustments
  supplierIds.forEach((supplierId) => {
    result.supplierAdjustments[supplierId] = {
      byQuarter: {
        1: { orderSizeAdjustment: 1.0, timingAdjustment: 0 },
        2: { orderSizeAdjustment: 1.0, timingAdjustment: 0 },
        3: { orderSizeAdjustment: 1.0, timingAdjustment: 0 },
        4: { orderSizeAdjustment: 1.0, timingAdjustment: 0 },
      },
    }
  })

  // Calculate optimal inventory levels
  componentIds.forEach((componentId) => {
    locationIds.forEach((locationId) => {
      // Get component demand statistics for this component and location
      const demandStats =
        componentDemand.statistics.byComponentLocation[componentId]?.[
          locationId
        ]

      if (!demandStats) {
        // If no demand data for this component-location, use a default value
        const defaultDemand = 50 // Default daily demand
        result.optimalLevels.byComponentLocation[componentId][locationId].base =
          defaultDemand * 30 // 30 days supply

        // Apply seasonal factors from location demand patterns
        const locationQuarterlyData =
          demandPatterns.seasonalDemand.byLocation[locationId]
        for (let quarter = 1; quarter <= 4; quarter++) {
          result.optimalLevels.byComponentLocation[componentId][
            locationId
          ].byQuarter[quarter] = Math.round(
            defaultDemand * 30 * locationQuarterlyData[quarter]
          )
        }

        // Skip to next iteration without using continue
        return // Using return in forEach acts like continue
      }

      // Calculate base optimal level (30 days of average demand)
      const dailyDemand = demandStats.mean
      const baseOptimalLevel = Math.round(dailyDemand * 30) // 30 days supply

      // Adjust based on component risk
      const riskFactor =
        1 +
        (componentRisks.failureRates.byComponent[componentId]?.mean || 0.05) * 2

      result.optimalLevels.byComponentLocation[componentId][locationId].base =
        Math.round(baseOptimalLevel * riskFactor)

      // Calculate quarterly adjustments based on seasonal demand
      for (let quarter = 1; quarter <= 4; quarter++) {
        // Use component-specific quarterly demand if available, otherwise use location seasonal factors
        const seasonalFactor = demandStats.byQuarter[quarter]?.mean
          ? demandStats.byQuarter[quarter].mean / dailyDemand
          : demandPatterns.seasonalDemand.byLocation[locationId][quarter]

        result.optimalLevels.byComponentLocation[componentId][
          locationId
        ].byQuarter[quarter] = Math.round(
          baseOptimalLevel * riskFactor * seasonalFactor
        )
      }

      // Calculate reorder points
      // Get supplier lead times for suppliers that provide this component
      const supplierLeadTimes: number[] = []

      supplierIds.forEach((supplierId) => {
        // Check if this supplier provides this component
        const supplierProvidesComponent =
          historicalData.byComponentSupplier.some(
            (cs) =>
              cs.componentId === componentId && cs.supplierId === supplierId
          )

        if (supplierProvidesComponent) {
          const leadTimeVariance =
            supplierPerformance.leadTimeVariance.bySupplierId[supplierId]
              ?.overall || 0
          // Get base lead time from suppliers data
          const supplier = historicalData.raw.suppliers.find(
            (s) => s.id === supplierId
          )
          const baseLeadTime = supplier ? supplier.baseLeadTime : 7 // Default to 7 days

          // Estimated lead time is base + variance
          const estimatedLeadTime = baseLeadTime + leadTimeVariance
          supplierLeadTimes.push(Math.max(1, estimatedLeadTime)) // Ensure positive lead time
        }
      })

      // Calculate average lead time
      const avgLeadTime =
        supplierLeadTimes.length > 0
          ? supplierLeadTimes.reduce((sum, lt) => sum + lt, 0) /
            supplierLeadTimes.length
          : 7 // Default to 7 days

      // Calculate lead time demand (demand during lead time)
      const leadTimeDemand = dailyDemand * avgLeadTime

      // Base reorder point = lead time demand + safety stock
      const baseReorderPoint = Math.round(leadTimeDemand)
      result.reorderPoints.byComponentLocation[componentId][locationId].base =
        baseReorderPoint

      // Calculate quarterly adjustments for reorder points
      for (let quarter = 1; quarter <= 4; quarter++) {
        // Use component-specific quarterly demand if available, otherwise use location seasonal factors
        const seasonalFactor = demandStats.byQuarter[quarter]?.mean
          ? demandStats.byQuarter[quarter].mean / dailyDemand
          : demandPatterns.seasonalDemand.byLocation[locationId][quarter]

        result.reorderPoints.byComponentLocation[componentId][
          locationId
        ].byQuarter[quarter] = Math.round(baseReorderPoint * seasonalFactor)
      }

      // Calculate safety stock
      const safetyFactor = 1.65 // ~95% service level

      // Use component demand standard deviation
      const stdDevDemand = demandStats.stdDev

      // Calculate base safety stock using the standard formula:
      // Safety Stock = Z * σ * √(Lead Time)
      // where Z is the safety factor, σ is the standard deviation of demand, and Lead Time is in days
      const baseSafetyStock = Math.round(
        safetyFactor * stdDevDemand * Math.sqrt(avgLeadTime)
      )
      result.safetyStock.byComponentLocation[componentId][locationId].base =
        Math.max(10, baseSafetyStock) // Ensure minimum safety stock

      // Calculate supplier-specific safety stock adjustments
      supplierIds.forEach((supplierId) => {
        // Check if this supplier provides this component
        const supplierProvidesComponent =
          historicalData.byComponentSupplier.some(
            (cs) =>
              cs.componentId === componentId && cs.supplierId === supplierId
          )

        if (supplierProvidesComponent) {
          const supplierReliability =
            1 -
            (supplierPerformance.overallPerformance.scores[supplierId]
              ?.overall || 0.5)

          result.safetyStock.byComponentLocation[componentId][
            locationId
          ].bySupplier[supplierId] = Math.round(
            baseSafetyStock * (1 + supplierReliability * 0.5)
          ) // 1.0 to 1.5 adjustment factor
        } else {
          // Default value for suppliers that don't provide this component
          result.safetyStock.byComponentLocation[componentId][
            locationId
          ].bySupplier[supplierId] = baseSafetyStock
        }
      })

      // Calculate quarterly adjustments for safety stock
      for (let quarter = 1; quarter <= 4; quarter++) {
        // Use component-specific quarterly demand variability if available
        const seasonalVariability = demandStats.byQuarter[quarter]?.stdDev
          ? demandStats.byQuarter[quarter].stdDev / stdDevDemand
          : demandPatterns.seasonalDemand.byLocation[locationId][quarter]

        result.safetyStock.byComponentLocation[componentId][
          locationId
        ].byQuarter[quarter] = Math.round(baseSafetyStock * seasonalVariability)
      }
    })
  })

  // Calculate supplier-specific seasonal adjustments
  supplierIds.forEach((supplierId) => {
    const seasonalPatterns =
      supplierPerformance.seasonalPatterns.seasonalIndices[supplierId]

    if (seasonalPatterns) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        // Adjust order size based on lead time seasonal pattern
        const leadTimeIndex = seasonalPatterns.leadTime[quarter] || 1.0

        // Adjust timing based on failure rate seasonal pattern
        const failureRateIndex = seasonalPatterns.failureRate[quarter] || 1.0

        // Calculate adjustments
        result.supplierAdjustments[supplierId].byQuarter[quarter] = {
          orderSizeAdjustment: Math.max(0.8, Math.min(1.5, leadTimeIndex)),
          timingAdjustment: Math.round((failureRateIndex - 1.0) * 10), // -10 to +10 days
        }
      }
    }
  })

  return result
}

/**
 * Derives component-level demand from model-level demand
 * This function transforms the model demand data into component demand
 * while maintaining location specificity and temporal patterns
 */
function deriveComponentDemand(
  historicalData: HistoricalData
): ComponentDemandData {
  // Initialize result structure
  const componentDemand: ComponentDemandData = {
    byComponentLocationDay: {},
    statistics: {
      byComponentLocation: {},
    },
  }

  // Get model-component relationships
  const modelComponentMap: Record<string, string[]> = {}

  // Build model-component map from the models data
  historicalData.models.forEach((model) => {
    modelComponentMap[model.id] = model.components
  })

  // Process all location reports to derive component demand
  historicalData.raw.locationReports.forEach((report) => {
    const locationId = report.locationId
    const dateString = report.date.toISOString().split('T')[0] // YYYY-MM-DD
    // const quarter = Math.floor(report.date.getMonth() / 3) + 1

    // Process each model demand entry
    report.modelDemand.forEach((modelDemand) => {
      const modelId = modelDemand.modelId
      const demandUnits = modelDemand.demandUnits

      // Get components used in this model
      const components = modelComponentMap[modelId] || []

      if (components.length === 0) {
        return // Using return in forEach acts like continue
      }

      // Distribute model demand equally among its components
      // In a real system, this might use a bill of materials with quantities
      const demandPerComponent = demandUnits / components.length

      // Record demand for each component
      components.forEach((componentId) => {
        // Initialize component structure if needed
        if (!componentDemand.byComponentLocationDay[componentId]) {
          componentDemand.byComponentLocationDay[componentId] = {}
        }

        if (!componentDemand.byComponentLocationDay[componentId][locationId]) {
          componentDemand.byComponentLocationDay[componentId][locationId] = {}
        }

        // Add to existing demand or set new demand
        if (
          componentDemand.byComponentLocationDay[componentId][locationId][
            dateString
          ]
        ) {
          componentDemand.byComponentLocationDay[componentId][locationId][
            dateString
          ] += demandPerComponent
        } else {
          componentDemand.byComponentLocationDay[componentId][locationId][
            dateString
          ] = demandPerComponent
        }
      })
    })
  })

  // Calculate statistics for each component-location pair
  Object.keys(componentDemand.byComponentLocationDay).forEach((componentId) => {
    componentDemand.statistics.byComponentLocation[componentId] = {}

    Object.keys(componentDemand.byComponentLocationDay[componentId]).forEach(
      (locationId) => {
        // Get all daily demand values for this component-location
        const dailyDemand = Object.values(
          componentDemand.byComponentLocationDay[componentId][locationId]
        )

        // Calculate overall statistics
        const mean = calculateMean(dailyDemand)
        const stdDev = calculateStdDev(dailyDemand, mean)

        // Group demand by quarter
        const demandByQuarter: Record<number, number[]> = {
          1: [],
          2: [],
          3: [],
          4: [],
        }

        // Populate quarterly demand arrays
        Object.entries(
          componentDemand.byComponentLocationDay[componentId][locationId]
        ).forEach(([dateString, demand]) => {
          const date = new Date(dateString)
          const quarter = Math.floor(date.getMonth() / 3) + 1
          demandByQuarter[quarter].push(demand)
        })

        // Calculate quarterly statistics
        const quarterlyStats: Record<number, { mean: number; stdDev: number }> =
          {}

        for (let quarter = 1; quarter <= 4; quarter++) {
          if (demandByQuarter[quarter].length > 0) {
            const quarterlyMean = calculateMean(demandByQuarter[quarter])
            const quarterlyStdDev = calculateStdDev(
              demandByQuarter[quarter],
              quarterlyMean
            )

            quarterlyStats[quarter] = {
              mean: quarterlyMean,
              stdDev: quarterlyStdDev,
            }
          } else {
            // Default values if no data for this quarter
            quarterlyStats[quarter] = {
              mean: mean,
              stdDev: stdDev,
            }
          }
        }

        // Store statistics
        componentDemand.statistics.byComponentLocation[componentId][
          locationId
        ] = {
          mean,
          stdDev,
          byQuarter: quarterlyStats,
        }
      }
    )
  })

  return componentDemand
}
