import {
  type HistoricalData,
  type ComponentRiskAnalysis,
} from '../types/analytics.types'
import { calculateMedian, calculateStdDev, getQuarter, groupBy } from './utils'

/**
 * Initializes the component risk analysis structure with default values
 */
function initializeComponentRiskAnalysis(
  componentIds: string[],
  supplierIds: string[]
): ComponentRiskAnalysis {
  const result: ComponentRiskAnalysis = {
    failureRates: {
      byComponent: {},
    },
    criticalThresholds: {
      byComponent: {},
    },
    costImpact: {
      byComponent: {},
      rankings: [],
    },
    seasonalVariations: {
      byComponent: {},
      bySupplierComponent: {},
    },
  }

  // Initialize component data
  componentIds.forEach((componentId) => {
    result.failureRates.byComponent[componentId] = {
      mean: 0,
      median: 0,
      stdDev: 0,
      bySupplier: {},
    }

    result.criticalThresholds.byComponent[componentId] = {
      warningThreshold: 0,
      criticalThreshold: 0,
    }

    result.costImpact.byComponent[componentId] = 0

    result.seasonalVariations.byComponent[componentId] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    }

    // Initialize supplier data for this component
    supplierIds.forEach((supplierId) => {
      result.failureRates.byComponent[componentId].bySupplier[supplierId] = 0

      if (!result.seasonalVariations.bySupplierComponent[supplierId]) {
        result.seasonalVariations.bySupplierComponent[supplierId] = {}
      }

      result.seasonalVariations.bySupplierComponent[supplierId][componentId] = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
      }
    })
  })

  return result
}

/**
 * Calculates failure rate statistics for each component
 */
function calculateFailureRateStatistics(
  result: ComponentRiskAnalysis,
  componentIds: string[],
  supplierIds: string[],
  historicalData: HistoricalData
): void {
  componentIds.forEach((componentId) => {
    // Get all failures for this component
    const failures = historicalData.raw.componentFailures
      .filter((f) => f.componentId === componentId)
      .map((f) => f.failureRate)

    if (failures.length > 0) {
      // Calculate mean
      const mean =
        failures.reduce((sum, rate) => sum + rate, 0) / failures.length
      result.failureRates.byComponent[componentId].mean = mean

      // Calculate median
      result.failureRates.byComponent[componentId].median =
        calculateMedian(failures)

      // Calculate standard deviation
      result.failureRates.byComponent[componentId].stdDev = calculateStdDev(
        failures,
        mean
      )

      // Set thresholds based on statistics
      result.criticalThresholds.byComponent[componentId] = {
        warningThreshold:
          mean + result.failureRates.byComponent[componentId].stdDev,
        criticalThreshold:
          mean + 2 * result.failureRates.byComponent[componentId].stdDev,
      }
    }

    // Calculate failure rates by supplier
    supplierIds.forEach((supplierId) => {
      const supplierFailures = historicalData.raw.componentFailures
        .filter(
          (f) => f.componentId === componentId && f.supplierId === supplierId
        )
        .map((f) => f.failureRate)

      if (supplierFailures.length > 0) {
        result.failureRates.byComponent[componentId].bySupplier[supplierId] =
          supplierFailures.reduce((sum, rate) => sum + rate, 0) /
          supplierFailures.length
      }
    })
  })
}

/**
 * Calculates seasonal variations in component failure rates
 */
function calculateSeasonalVariations(
  result: ComponentRiskAnalysis,
  componentIds: string[],
  supplierIds: string[],
  historicalData: HistoricalData
): void {
  componentIds.forEach((componentId) => {
    // Group failures by quarter
    const failuresByQuarter = groupBy(
      historicalData.raw.componentFailures.filter(
        (f) => f.componentId === componentId
      ),
      (f) => getQuarter(f.date)
    )

    // Calculate average failure rate by quarter
    let totalAvgFailureRate = 0
    let quarterCount = 0

    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterFailures = failuresByQuarter[quarter] ?? []

      if (quarterFailures.length > 0) {
        const avgRate =
          quarterFailures.reduce((sum, f) => sum + f.failureRate, 0) /
          quarterFailures.length
        result.seasonalVariations.byComponent[componentId][quarter] = avgRate
        totalAvgFailureRate += avgRate
        quarterCount++
      }
    }

    // Normalize seasonal variations (1.0 = average)
    const overallAvg = quarterCount > 0 ? totalAvgFailureRate / quarterCount : 0

    if (overallAvg > 0) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        if (result.seasonalVariations.byComponent[componentId][quarter] > 0) {
          result.seasonalVariations.byComponent[componentId][quarter] /=
            overallAvg
        }
      }
    }

    calculateSupplierSeasonalVariations(
      result,
      componentId,
      supplierIds,
      historicalData
    )
  })
}

/**
 * Calculates supplier-specific seasonal variations for a component
 */
function calculateSupplierSeasonalVariations(
  result: ComponentRiskAnalysis,
  componentId: string,
  supplierIds: string[],
  historicalData: HistoricalData
): void {
  supplierIds.forEach((supplierId) => {
    // Group failures by quarter for this supplier
    const supplierFailuresByQuarter = groupBy(
      historicalData.raw.componentFailures.filter(
        (f) => f.componentId === componentId && f.supplierId === supplierId
      ),
      (f) => getQuarter(f.date)
    )

    // Calculate average failure rate by quarter
    let supplierTotalAvgFailureRate = 0
    let supplierQuarterCount = 0

    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterFailures = supplierFailuresByQuarter[quarter] ?? []

      if (quarterFailures.length > 0) {
        const avgRate =
          quarterFailures.reduce((sum, f) => sum + f.failureRate, 0) /
          quarterFailures.length
        result.seasonalVariations.bySupplierComponent[supplierId][componentId][
          quarter
        ] = avgRate
        supplierTotalAvgFailureRate += avgRate
        supplierQuarterCount++
      }
    }

    // Normalize seasonal variations (1.0 = average)
    const supplierOverallAvg =
      supplierQuarterCount > 0
        ? supplierTotalAvgFailureRate / supplierQuarterCount
        : 0

    if (supplierOverallAvg > 0) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        if (
          result.seasonalVariations.bySupplierComponent[supplierId][
            componentId
          ][quarter] > 0
        ) {
          result.seasonalVariations.bySupplierComponent[supplierId][
            componentId
          ][quarter] /= supplierOverallAvg
        }
      }
    }
  })
}

/**
 * Calculates cost impact scores and rankings for components
 */
function calculateCostImpact(
  result: ComponentRiskAnalysis,
  componentIds: string[],
  historicalData: HistoricalData
): void {
  componentIds.forEach((componentId) => {
    // Count how many models use this component
    const modelUsageCount = historicalData.raw.models.filter((m) =>
      m.components.includes(componentId)
    ).length

    // Calculate cost impact score
    const failureRate = result.failureRates.byComponent[componentId].mean
    const usageWeight = modelUsageCount / historicalData.raw.models.length

    result.costImpact.byComponent[componentId] = failureRate * usageWeight * 100
  })

  // Create cost impact rankings
  result.costImpact.rankings = Object.entries(result.costImpact.byComponent)
    .map(([componentId, score]) => ({ componentId, score }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Analyzes component risk factors from historical data
 * - Calculates failure rate distributions by supplier and component
 * - Identifies critical threshold indicators
 * - Performs cost-impact analysis of failures
 * - Extracts seasonal failure rate variations by supplier
 */
export async function analyzeComponentRisks(
  historicalData: HistoricalData
): Promise<ComponentRiskAnalysis> {
  // Extract component and supplier IDs
  const componentIds = historicalData.raw.components.map((c) => c.id)
  const supplierIds = historicalData.raw.suppliers.map((s) => s.id)

  // Initialize result structure
  const result = initializeComponentRiskAnalysis(componentIds, supplierIds)

  // Calculate failure rate statistics
  calculateFailureRateStatistics(
    result,
    componentIds,
    supplierIds,
    historicalData
  )

  // Calculate seasonal variations
  calculateSeasonalVariations(result, componentIds, supplierIds, historicalData)

  // Calculate cost impact
  calculateCostImpact(result, componentIds, historicalData)

  return result
}
