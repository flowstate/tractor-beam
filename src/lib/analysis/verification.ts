import { type AnalysisResults } from '../types/analytics.types'

/**
 * Checks if analysis results contain required data
 */
function checkForEmptyResults(results: AnalysisResults): string[] {
  const warnings: string[] = []

  // Check supplier performance
  if (
    !results.supplierPerformance ||
    Object.keys(results.supplierPerformance.overallPerformance.scores)
      .length === 0
  ) {
    warnings.push('Supplier performance analysis is empty')
  }

  // Check demand patterns
  if (
    !results.demandPatterns ||
    Object.keys(results.demandPatterns.seasonalDemand.byModel).length === 0
  ) {
    warnings.push('Demand patterns analysis is empty')
  }

  // Check component risks
  if (
    !results.componentRisks ||
    Object.keys(results.componentRisks.failureRates.byComponent).length === 0
  ) {
    warnings.push('Component risks analysis is empty')
  }

  // Check inventory parameters
  if (
    !results.inventoryParameters ||
    Object.keys(results.inventoryParameters.optimalLevels.byComponentLocation)
      .length === 0
  ) {
    warnings.push('Inventory parameters analysis is empty')
  }

  return warnings
}

/**
 * Checks for extreme values in supplier seasonal indices
 */
function checkForExtremeSeasonalIndices(results: AnalysisResults): string[] {
  const warnings: string[] = []

  if (!results.supplierPerformance?.seasonalPatterns?.seasonalIndices) {
    return warnings
  }

  Object.entries(
    results.supplierPerformance.seasonalPatterns.seasonalIndices
  ).forEach(([supplierId, indices]) => {
    Object.entries(indices.leadTime).forEach(([quarter, value]) => {
      if (typeof value === 'number' && (value > 2 || value < 0.5)) {
        warnings.push(
          `Extreme seasonal lead time index for supplier ${supplierId}, quarter ${quarter}: ${value}`
        )
      }
    })

    Object.entries(indices.failureRate).forEach(([quarter, value]) => {
      if (typeof value === 'number' && (value > 2 || value < 0.5)) {
        warnings.push(
          `Extreme seasonal failure rate index for supplier ${supplierId}, quarter ${quarter}: ${value}`
        )
      }
    })
  })

  return warnings
}

/**
 * Checks for extreme values in component risk scores
 */
function checkForExtremeRiskScores(results: AnalysisResults): string[] {
  const warnings: string[] = []

  if (!results.componentRisks?.costImpact?.byComponent) {
    return warnings
  }

  Object.entries(results.componentRisks.costImpact.byComponent).forEach(
    ([componentId, score]) => {
      if (typeof score === 'number' && (score > 90 || score < 10)) {
        warnings.push(
          `Extreme risk score for component ${componentId}: ${score}`
        )
      }
    }
  )

  return warnings
}

/**
 * Performs sanity checks on analysis results to verify they're reasonable
 * @param results The analysis results to verify
 * @returns Object with verification results and any warnings
 */
export function verifyAnalysisResults(results: AnalysisResults): {
  valid: boolean
  warnings: string[]
} {
  const emptyWarnings = checkForEmptyResults(results)
  const seasonalWarnings = checkForExtremeSeasonalIndices(results)
  const riskWarnings = checkForExtremeRiskScores(results)

  const warnings = [...emptyWarnings, ...seasonalWarnings, ...riskWarnings]

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

/**
 * Formats supplier performance summary for logging
 */
function formatSupplierPerformanceSummary(results: AnalysisResults): string {
  let summary = 'SUPPLIER PERFORMANCE:\n'

  if (results.supplierPerformance?.overallPerformance?.rankings) {
    summary += 'Top 3 suppliers by overall performance:\n'
    const topSuppliers =
      results.supplierPerformance.overallPerformance.rankings.slice(0, 3)

    topSuppliers.forEach(({ supplierId, score }, index) => {
      summary += `  ${index + 1}. ${supplierId}: ${score.toFixed(2)}\n`
    })
  }

  return summary
}

/**
 * Formats component risks summary for logging
 */
function formatComponentRisksSummary(results: AnalysisResults): string {
  let summary = '\nCOMPONENT RISKS:\n'

  if (results.componentRisks?.costImpact?.rankings) {
    summary += 'Highest risk components:\n'
    results.componentRisks.costImpact.rankings
      .slice(0, 3)
      .forEach(({ componentId, score }) => {
        summary += `  ${componentId}: ${score.toFixed(2)}\n`
      })
  }

  return summary
}

/**
 * Formats demand patterns summary for logging
 */
function formatDemandPatternsSummary(results: AnalysisResults): string {
  let summary = '\nDEMAND PATTERNS:\n'

  if (results.demandPatterns?.seasonalDemand?.overall) {
    summary += 'Seasonal demand variations:\n'
    const quarters = [1, 2, 3, 4]
    quarters.forEach((quarter) => {
      const avgIndex =
        results.demandPatterns.seasonalDemand.overall[quarter] ?? 1
      summary += `  Q${quarter}: ${(avgIndex * 100 - 100).toFixed(1)}% from baseline\n`
    })
  }

  return summary
}

/**
 * Formats inventory parameters summary for logging
 */
function formatInventoryParametersSummary(results: AnalysisResults): string {
  let summary = '\nINVENTORY PARAMETERS:\n'

  if (results.inventoryParameters?.safetyStock?.byComponentLocation) {
    summary += 'Average safety stock recommendations by component:\n'

    const componentIds = Object.keys(
      results.inventoryParameters.safetyStock.byComponentLocation
    )
    componentIds.forEach((componentId) => {
      const locations = Object.values(
        results.inventoryParameters.safetyStock.byComponentLocation[componentId]
      )

      const baseValues = locations.map((loc) => loc.base)
      const avg =
        baseValues.reduce((sum, val) => sum + val, 0) / baseValues.length

      summary += `  ${componentId}: ${avg.toFixed(1)} units\n`
    })
  }

  return summary
}

/**
 * Logs a summary of the analysis results for quick inspection
 * @param results The analysis results to summarize
 */
export function logAnalysisSummary(results: AnalysisResults): void {
  console.log('\n===== ANALYSIS SUMMARY =====\n')

  // Supplier performance summary
  console.log(formatSupplierPerformanceSummary(results))

  // Component risks summary
  console.log(formatComponentRisksSummary(results))

  // Demand patterns summary
  console.log(formatDemandPatternsSummary(results))

  // Inventory parameters summary
  console.log(formatInventoryParametersSummary(results))

  console.log('\n=============================\n')
}
