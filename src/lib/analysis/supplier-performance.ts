import fs from 'fs'
import path from 'path'
import { SUPPLIER_QUALITY_CONFIGS } from '../constants'
import {
  type ComponentFailureData,
  type DeliveryData,
  type HistoricalData,
  type SupplierPerformanceAnalysis,
} from '../types/analytics.types'
import { SUPPLIER_IDS, type SupplierId } from '../types/types'
import {
  calculateCorrelation,
  calculateMean,
  calculateStdDev,
  getQuarter,
  groupBy,
} from './utils'

/**
 * Analyzes supplier performance patterns from historical data
 * - Extracts reliability metrics (lead time variance)
 * - Calculates quality metrics (component failure rates)
 * - Identifies seasonal performance variations
 * - Computes location-specific performance differences
 * - Infers seasonal sensitivity coefficients
 *
 * @param historicalData Preprocessed historical data
 * @returns Comprehensive supplier performance analysis
 */
export function analyzeSupplierPerformance(
  historicalData: HistoricalData
): SupplierPerformanceAnalysis {
  // Calculate lead time variance metrics
  const leadTimeVariance = calculateLeadTimeVarianceMetrics(historicalData)

  // Calculate failure rate metrics
  const failureRates = calculateFailureRateMetrics(historicalData)

  // Calculate seasonal patterns
  const seasonalPatterns = calculateSeasonalPatterns(historicalData)

  // Calculate location-specific performance
  const locationPerformance = calculateLocationPerformance(historicalData)

  // Calculate quality trends
  const qualityTrends = calculateQualityTrends(historicalData)

  // Save visualization data
  saveQualityTrendsVisualization(qualityTrends)

  // Save enhanced visualization data
  saveEnhancedQualityTrendsVisualization(qualityTrends, historicalData)

  // Calculate overall performance scores and rankings
  const overallPerformance = calculateOverallPerformance(
    leadTimeVariance,
    failureRates,
    seasonalPatterns,
    locationPerformance
  )

  // Add debugging to verify the structure
  console.log('DEBUG: SupplierPerformance structure check:')
  console.log('- leadTimeVariance keys:', Object.keys(leadTimeVariance))
  console.log('- failureRates keys:', Object.keys(failureRates))
  console.log('- qualityTrends keys:', Object.keys(qualityTrends))
  console.log(
    '- qualityTrends.bySupplierId exists:',
    !!qualityTrends.bySupplierId
  )
  console.log(
    '- Number of suppliers in qualityTrends.bySupplierId:',
    Object.keys(qualityTrends.bySupplierId).length
  )

  // Check if the structure matches the interface
  const result: SupplierPerformanceAnalysis = {
    leadTimeVariance,
    failureRates,
    seasonalPatterns,
    locationPerformance,
    qualityTrends,
    overallPerformance,
  }

  console.log('DEBUG: Final result structure check:')
  console.log('- Keys in result:', Object.keys(result))
  console.log('- qualityTrends included:', result.qualityTrends ? 'YES' : 'NO')

  return result
}

/**
 * Calculates lead time variance metrics for each supplier
 * - Overall lead time variance
 * - Quarterly lead time variance
 * - Location-specific lead time variance
 * - Rankings based on lead time reliability
 *
 * @param data Historical data
 * @returns Lead time variance metrics
 */
function calculateLeadTimeVarianceMetrics(
  data: HistoricalData
): SupplierPerformanceAnalysis['leadTimeVariance'] {
  const result: SupplierPerformanceAnalysis['leadTimeVariance'] = {
    bySupplierId: {},
    rankings: [],
  }

  // Use the predefined supplier IDs from constants
  const supplierIds = SUPPLIER_IDS

  // Calculate overall lead time variance for each supplier
  supplierIds.forEach((supplierId) => {
    // Get all lead time variance values for this supplier
    const leadTimeValues = data.normalized.leadTimeVariance[supplierId] || []

    // Calculate overall metrics
    const overall = calculateMean(leadTimeValues)

    // Group by quarter
    const byQuarter: Record<number, number> = {}
    const quarterlyData = data.bySupplierQuarter.filter(
      (sq) => sq.supplierId === supplierId
    )

    // Calculate average lead time variance for each quarter
    const quarterlyGroups = groupBy(quarterlyData, (sq) => sq.quarter)
    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterData = quarterlyGroups[quarter] || []
      byQuarter[quarter] =
        quarterData.length > 0
          ? calculateMean(
              quarterData.map((sq) => sq.normalizedLeadTimeVariance)
            )
          : 0
    }

    // Group by location
    const byLocation: Record<string, number> = {}

    // Get all deliveries for this supplier
    const supplierDeliveries = data.raw.deliveries.filter(
      (d) => d.supplierId === supplierId
    )

    // Group deliveries by location
    const locationGroups = groupBy(supplierDeliveries, (d) => d.locationId)

    // Calculate average lead time variance for each location
    Object.entries(locationGroups).forEach(([locationId, deliveries]) => {
      byLocation[locationId] = calculateMean(
        deliveries.map((d) => d.leadTimeVariance)
      )
    })

    // Store results for this supplier
    result.bySupplierId[supplierId] = {
      overall,
      byQuarter,
      byLocation,
    }
  })

  // Create rankings based on overall lead time variance (lower is better)
  result.rankings = Object.entries(result.bySupplierId)
    .map(([supplierId, metrics]) => ({
      supplierId,
      score: 1 / (1 + metrics.overall), // Transform so higher score is better
    }))
    .sort((a, b) => b.score - a.score) // Sort descending

  return result
}

/**
 * Calculates failure rate metrics for each supplier
 * - Overall failure rates
 * - Component-specific failure rates
 * - Quarterly failure rates
 * - Rankings based on quality
 *
 * @param data Historical data
 * @returns Failure rate metrics
 */
function calculateFailureRateMetrics(
  data: HistoricalData
): SupplierPerformanceAnalysis['failureRates'] {
  const result: SupplierPerformanceAnalysis['failureRates'] = {
    bySupplierId: {},
    byComponent: {},
    rankings: [],
  }

  // Use the predefined supplier IDs from constants
  const supplierIds = SUPPLIER_IDS

  // Get all component IDs
  const componentIds = data.raw.components.map((component) => component.id)

  // Initialize component structure
  componentIds.forEach((componentId) => {
    result.byComponent[componentId] = {
      bySupplier: {},
    }
  })

  // Calculate failure rates for each supplier
  supplierIds.forEach((supplierId) => {
    // Get all failure data for this supplier
    const supplierFailures = data.raw.componentFailures.filter(
      (f) => f.supplierId === supplierId
    )

    // Calculate overall failure rate
    const overallFailureRate = calculateMean(
      supplierFailures.map((f) => f.failureRate)
    )

    // Calculate component-specific failure rates
    const byComponent: Record<string, number> = {}
    const componentGroups = groupBy(supplierFailures, (f) => f.componentId)

    componentIds.forEach((componentId) => {
      const componentFailures = componentGroups[componentId] || []
      const failureRate =
        componentFailures.length > 0
          ? calculateMean(componentFailures.map((f) => f.failureRate))
          : 0

      byComponent[componentId] = failureRate

      // Also store in the component-centric structure
      if (failureRate > 0) {
        result.byComponent[componentId].bySupplier[supplierId] = failureRate
      }
    })

    // Calculate quarterly failure rates
    const byQuarter: Record<number, number> = {}

    // Add quarter to each failure
    const failuresWithQuarter = supplierFailures.map((f) => ({
      ...f,
      quarter: getQuarter(f.date),
    }))

    // Group by quarter
    const quarterlyGroups = groupBy(failuresWithQuarter, (f) => f.quarter)

    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterFailures = quarterlyGroups[quarter] || []
      byQuarter[quarter] =
        quarterFailures.length > 0
          ? calculateMean(quarterFailures.map((f) => f.failureRate))
          : 0
    }

    // Store results for this supplier
    result.bySupplierId[supplierId] = {
      overall: overallFailureRate,
      byComponent,
      byQuarter,
    }
  })

  // Create rankings based on overall failure rate (lower is better)
  result.rankings = Object.entries(result.bySupplierId)
    .map(([supplierId, metrics]) => ({
      supplierId,
      score: 1 / (1 + metrics.overall * 10), // Transform so higher score is better
    }))
    .sort((a, b) => b.score - a.score) // Sort descending

  return result
}

/**
 * Calculates seasonal patterns for each supplier
 * - Seasonal indices for lead time, failure rate, and discount
 * - Seasonal sensitivity scores
 * - Rankings based on seasonal resilience
 *
 * @param data Historical data
 * @returns Seasonal pattern metrics
 */
function calculateSeasonalPatterns(
  data: HistoricalData
): SupplierPerformanceAnalysis['seasonalPatterns'] {
  const result: SupplierPerformanceAnalysis['seasonalPatterns'] = {
    seasonalIndices: {},
    seasonalSensitivity: {},
    rankings: [],
  }

  // Use the predefined supplier IDs from constants
  const supplierIds = SUPPLIER_IDS

  // Calculate seasonal indices and sensitivity for each supplier
  supplierIds.forEach((supplierId) => {
    // Initialize seasonal indices
    const leadTimeIndices: Record<number, number> = {}
    const failureRateIndices: Record<number, number> = {}
    const discountIndices: Record<number, number> = {}

    // Get quarterly data for this supplier
    const quarterlyData = data.bySupplierQuarter.filter(
      (sq) => sq.supplierId === supplierId
    )

    // Calculate baseline metrics (annual averages)
    const baselineLeadTime = calculateMean(
      quarterlyData.map((sq) => sq.normalizedLeadTimeVariance)
    )

    const baselineFailureRate = calculateMean(
      quarterlyData.map((sq) => sq.normalizedFailureRate)
    )

    const baselineDiscount = calculateMean(
      quarterlyData.map((sq) => sq.avgDiscount)
    )

    // Group by quarter
    const quarterlyGroups = groupBy(quarterlyData, (sq) => sq.quarter)

    // Calculate seasonal indices for each quarter
    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterData = quarterlyGroups[quarter] || []

      if (quarterData.length > 0) {
        // Calculate average metrics for this quarter
        const quarterLeadTime = calculateMean(
          quarterData.map((sq) => sq.normalizedLeadTimeVariance)
        )

        const quarterFailureRate = calculateMean(
          quarterData.map((sq) => sq.normalizedFailureRate)
        )

        const quarterDiscount = calculateMean(
          quarterData.map((sq) => sq.avgDiscount)
        )

        // Calculate seasonal indices (ratio of quarterly to annual average)
        leadTimeIndices[quarter] =
          baselineLeadTime > 0 ? quarterLeadTime / baselineLeadTime : 1

        failureRateIndices[quarter] =
          baselineFailureRate > 0 ? quarterFailureRate / baselineFailureRate : 1

        discountIndices[quarter] =
          baselineDiscount > 0 ? quarterDiscount / baselineDiscount : 1
      } else {
        // Default to 1 (no seasonal effect) if no data
        leadTimeIndices[quarter] = 1
        failureRateIndices[quarter] = 1
        discountIndices[quarter] = 1
      }
    }

    // Calculate seasonal sensitivity (variance of seasonal indices)
    const leadTimeSensitivity = calculateStdDev(Object.values(leadTimeIndices))
    const failureRateSensitivity = calculateStdDev(
      Object.values(failureRateIndices)
    )
    const discountSensitivity = calculateStdDev(Object.values(discountIndices))

    // Calculate overall seasonal sensitivity
    // Use supplier quality config to weight the sensitivity
    const qualityConfig = SUPPLIER_QUALITY_CONFIGS[supplierId]
    const seasonalStrength = qualityConfig
      ? qualityConfig.seasonalStrength
      : 0.75 // Default if not found

    // Higher seasonalStrength means more affected by seasons
    const overallSensitivity =
      (leadTimeSensitivity + failureRateSensitivity + discountSensitivity) *
      seasonalStrength

    // Store seasonal indices
    result.seasonalIndices[supplierId] = {
      leadTime: leadTimeIndices,
      failureRate: failureRateIndices,
      discount: discountIndices,
    }

    // Store seasonal sensitivity
    result.seasonalSensitivity[supplierId] = {
      overall: overallSensitivity,
      leadTime: leadTimeSensitivity,
      failureRate: failureRateSensitivity,
      discount: discountSensitivity,
    }
  })

  // Calculate correlation between MTI and supplier performance
  supplierIds.forEach((supplierId) => {
    // Get quarterly data for this supplier
    const quarterlyData = data.bySupplierQuarter.filter(
      (sq) => sq.supplierId === supplierId
    )

    if (quarterlyData.length > 0) {
      // We need to join supplier quarterly data with location quarterly data to get MTI
      const mtiValues: number[] = []
      const leadTimeValues: number[] = []
      const failureRateValues: number[] = []

      // For each supplier quarter data point, find corresponding location data with MTI
      quarterlyData.forEach((sq) => {
        // Find all location reports for this quarter/year
        const locationQuarterData = data.byLocationQuarter.filter(
          (lq) => lq.quarter === sq.quarter && lq.year === sq.year
        )

        // If we have location data, use average MTI across all locations
        if (locationQuarterData.length > 0) {
          const avgMTI = calculateMean(
            locationQuarterData.map((lq) => lq.avgMTI)
          )
          mtiValues.push(avgMTI)
          leadTimeValues.push(sq.normalizedLeadTimeVariance)
          failureRateValues.push(sq.normalizedFailureRate)
        }
      })

      // Calculate correlations if we have enough data points
      if (mtiValues.length >= 3) {
        const mtiLeadTimeCorrelation = calculateCorrelation(
          mtiValues,
          leadTimeValues
        )
        const mtiFailureRateCorrelation = calculateCorrelation(
          mtiValues,
          failureRateValues
        )

        // Store correlations in the seasonal sensitivity object
        // Note: We need to add these properties to the type definition
        const sensitivity = result.seasonalSensitivity[supplierId]
        if (sensitivity) {
          // Using type assertion since we're adding properties not in the type
          sensitivity.mtiLeadTimeCorrelation = mtiLeadTimeCorrelation
          sensitivity.mtiFailureRateCorrelation = mtiFailureRateCorrelation
        }
      }
    }
  })

  // Create rankings based on seasonal sensitivity (lower is better)
  result.rankings = Object.entries(result.seasonalSensitivity)
    .map(([supplierId, metrics]) => ({
      supplierId,
      score: 1 / (1 + metrics.overall), // Transform so higher score is better
    }))
    .sort((a, b) => b.score - a.score) // Sort descending

  return result
}

/**
 * Calculates location-specific performance for each supplier
 * - Lead time variance by location
 * - Failure rates by location
 * - Overall reliability by location
 * - Rankings by location
 *
 * @param data Historical data
 * @returns Location-specific performance metrics
 */
function calculateLocationPerformance(
  data: HistoricalData
): SupplierPerformanceAnalysis['locationPerformance'] {
  const result: SupplierPerformanceAnalysis['locationPerformance'] = {
    byLocation: {},
  }

  // Get all location IDs
  const locationIds = data.raw.locations.map((location) => location.id)

  // Initialize location structure
  locationIds.forEach((locationId) => {
    result.byLocation[locationId] = {
      supplierMetrics: {},
      rankings: [],
    }
  })

  // Calculate performance metrics for each supplier at each location
  locationIds.forEach((locationId) => {
    // Get all suppliers that deliver to this location
    const locationSuppliers = new Set<string>()

    data.raw.deliveries
      .filter((d) => d.locationId === locationId)
      .forEach((d) => locationSuppliers.add(d.supplierId))

    // Calculate metrics for each supplier at this location
    Array.from(locationSuppliers).forEach((supplierId) => {
      // Get all deliveries for this supplier at this location
      const deliveries = data.raw.deliveries.filter(
        (d) => d.supplierId === supplierId && d.locationId === locationId
      )

      // Calculate lead time variance
      const leadTimeVariance = calculateMean(
        deliveries.map((d) => d.leadTimeVariance)
      )

      // Get all failures for this supplier at this location
      const failures = data.raw.componentFailures.filter(
        (f) => f.supplierId === supplierId && f.locationId === locationId
      )

      // Calculate failure rate
      const failureRate = calculateMean(failures.map((f) => f.failureRate))

      // Calculate overall reliability score (lower values are better)
      const reliability = 1 / (1 + leadTimeVariance * 0.5 + failureRate * 2)

      // Store metrics for this supplier at this location
      result.byLocation[locationId].supplierMetrics[supplierId] = {
        leadTimeVariance,
        failureRate,
        reliability,
      }
    })

    // Create rankings for this location
    result.byLocation[locationId].rankings = Object.entries(
      result.byLocation[locationId].supplierMetrics
    )
      .map(([supplierId, metrics]) => ({
        supplierId,
        score: metrics.reliability,
      }))
      .sort((a, b) => b.score - a.score) // Sort descending
  })

  return result
}

/**
 * Calculates overall performance scores and rankings
 * - Weighted combination of lead time, quality, seasonal, and location metrics
 * - Overall performance scores
 * - Rankings based on overall performance
 *
 * @param leadTimeVariance Lead time variance metrics
 * @param failureRates Failure rate metrics
 * @param seasonalPatterns Seasonal pattern metrics
 * @param locationPerformance Location-specific performance metrics
 * @returns Overall performance metrics
 */
function calculateOverallPerformance(
  leadTimeVariance: SupplierPerformanceAnalysis['leadTimeVariance'],
  failureRates: SupplierPerformanceAnalysis['failureRates'],
  seasonalPatterns: SupplierPerformanceAnalysis['seasonalPatterns'],
  locationPerformance: SupplierPerformanceAnalysis['locationPerformance']
): SupplierPerformanceAnalysis['overallPerformance'] {
  const result: SupplierPerformanceAnalysis['overallPerformance'] = {
    scores: {},
    rankings: [],
    weightedFactors: {
      leadTimeReliability: 0.35,
      qualityConsistency: 0.35,
      seasonalResilience: 0.15,
      locationConsistency: 0.15,
    },
  }

  // Use the predefined supplier IDs from constants
  const supplierIds = SUPPLIER_IDS

  // Calculate normalized scores for each factor (0-1 scale)
  const normalizedScores: Record<
    string,
    {
      leadTimeReliability: number
      qualityConsistency: number
      seasonalResilience: number
      locationConsistency: number
    }
  > = {}

  // Get max scores for normalization
  const maxLeadTimeScore =
    Math.max(...leadTimeVariance.rankings.map((r) => r.score)) || 1

  const maxQualityScore =
    Math.max(...failureRates.rankings.map((r) => r.score)) || 1

  const maxSeasonalScore =
    Math.max(...seasonalPatterns.rankings.map((r) => r.score)) || 1

  // Calculate location consistency scores
  const locationConsistencyScores: Record<string, number> = {}
  supplierIds.forEach((supplierId) => {
    // Get lead time variance for each location
    const leadTimeByLocation =
      leadTimeVariance.bySupplierId[supplierId]?.byLocation || {}

    // Calculate standard deviation of lead time variance across locations
    const locationVariances = Object.values(leadTimeByLocation)
    const locationVariation = calculateStdDev(locationVariances)

    // Lower variation means more consistency across locations
    locationConsistencyScores[supplierId] = 1 / (1 + locationVariation)
  })

  const maxLocationScore =
    Math.max(...Object.values(locationConsistencyScores)) || 1

  // Calculate normalized scores for each supplier
  supplierIds.forEach((supplierId) => {
    // Find scores from rankings
    const leadTimeScore =
      leadTimeVariance.rankings.find((r) => r.supplierId === supplierId)
        ?.score ?? 0

    const qualityScore =
      failureRates.rankings.find((r) => r.supplierId === supplierId)?.score ?? 0

    const seasonalScore =
      seasonalPatterns.rankings.find((r) => r.supplierId === supplierId)
        ?.score ?? 0

    const locationScore = locationConsistencyScores[supplierId] || 0

    // Normalize scores to 0-1 scale
    normalizedScores[supplierId] = {
      leadTimeReliability: leadTimeScore / maxLeadTimeScore,
      qualityConsistency: qualityScore / maxQualityScore,
      seasonalResilience: seasonalScore / maxSeasonalScore,
      locationConsistency: locationScore / maxLocationScore,
    }
  })

  // Calculate weighted overall scores
  supplierIds.forEach((supplierId) => {
    const scores = normalizedScores[supplierId]
    const { weightedFactors } = result

    // Calculate weighted sum
    const overallScore =
      scores.leadTimeReliability * weightedFactors.leadTimeReliability +
      scores.qualityConsistency * weightedFactors.qualityConsistency +
      scores.seasonalResilience * weightedFactors.seasonalResilience +
      scores.locationConsistency * weightedFactors.locationConsistency

    // Store overall score and factor scores
    result.scores[supplierId] = {
      overall: overallScore,
      factors: scores,
    }
  })

  // Create final rankings
  result.rankings = Object.entries(result.scores)
    .map(([supplierId, { overall }]) => ({
      supplierId,
      score: overall,
    }))
    .sort((a, b) => b.score - a.score) // Sort descending

  return result
}

/**
 * Calculates quality trends for each supplier
 * - Analyzes both failure rates and lead time variance
 * - Identifies trend direction, magnitude, and consistency
 * - Creates a combined quality index
 * - Projects future quality based on recent trends
 *
 * @param data Historical data
 * @returns Quality trend metrics
 */
function calculateQualityTrends(
  data: HistoricalData
): SupplierPerformanceAnalysis['qualityTrends'] {
  const result: SupplierPerformanceAnalysis['qualityTrends'] = {
    bySupplierId: {},
    rankings: [],
  }

  // Use the predefined supplier IDs
  const supplierIds = SUPPLIER_IDS

  // For each supplier, analyze trends in both quality metrics
  supplierIds.forEach((supplierId) => {
    // Get all component failures for this supplier, sorted by date
    const failures = data.raw.componentFailures
      .filter((f) => f.supplierId === supplierId)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    // Get all deliveries for this supplier, sorted by date
    const deliveries = data.raw.deliveries
      .filter((d) => d.supplierId === supplierId)
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (failures.length === 0 || deliveries.length === 0) {
      // Skip suppliers with insufficient data
      return
    }

    // Group data by quarter for quarterly trend analysis
    const failuresByQuarter = groupByQuarterAndYear(failures)
    const deliveriesByQuarter = groupByQuarterAndYear(deliveries)

    // Calculate quarterly metrics
    const quarterlyMetrics = calculateQuarterlyMetrics(
      failuresByQuarter,
      deliveriesByQuarter
    )

    // Calculate overall trend metrics
    const trendMetrics = calculateTrendMetrics(quarterlyMetrics)

    // Calculate combined quality index for each quarter
    const combinedQualityByQuarter =
      calculateCombinedQualityIndex(quarterlyMetrics)

    // Project next quarter's quality based on recent trends
    const projection = projectNextQuarter(
      combinedQualityByQuarter,
      trendMetrics
    )

    // Store results for this supplier
    result.bySupplierId[supplierId] = {
      direction: trendMetrics.direction,
      magnitude: trendMetrics.magnitude,
      consistency: trendMetrics.consistency,
      byQuarter: quarterlyMetrics.trends,
      combinedQuality: combinedQualityByQuarter,
      projection,
      visualizationData: {
        timePoints: quarterlyMetrics.timePoints,
        qualityValues: quarterlyMetrics.qualityValues,
        leadTimeValues: quarterlyMetrics.leadTimeValues,
        combinedValues: Object.values(combinedQualityByQuarter),
      },
    }
  })

  // Create rankings based on trend direction and magnitude
  result.rankings = Object.entries(result.bySupplierId)
    .map(([supplierId, metrics]) => ({
      supplierId,
      score: calculateTrendScore(metrics),
    }))
    .sort((a, b) => b.score - a.score) // Sort descending

  return result
}

/**
 * Groups data by quarter and year
 * @param data Array of objects with date property
 * @returns Grouped data by quarter and year
 */
function groupByQuarterAndYear<T extends { date: Date }>(
  data: T[]
): Record<string, T[]> {
  return groupBy(data, (item) => {
    const quarter = getQuarter(item.date)
    const year = item.date.getFullYear()
    return `${year}-Q${quarter}`
  })
}

/**
 * Calculates quarterly metrics for quality and lead time
 * @param failuresByQuarter Failures grouped by quarter
 * @param deliveriesByQuarter Deliveries grouped by quarter
 * @returns Quarterly metrics and trends
 */
function calculateQuarterlyMetrics(
  failuresByQuarter: Record<string, ComponentFailureData[]>,
  deliveriesByQuarter: Record<string, DeliveryData[]>
): {
  timePoints: string[]
  qualityValues: number[]
  leadTimeValues: number[]
  trends: Record<
    string,
    { direction: 'improving' | 'declining' | 'stable'; magnitude: number }
  >
} {
  // Get all quarters from both datasets
  const allQuarters = new Set([
    ...Object.keys(failuresByQuarter),
    ...Object.keys(deliveriesByQuarter),
  ])

  // Sort quarters chronologically
  const sortedQuarters = Array.from(allQuarters).sort()

  const timePoints: string[] = []
  const qualityValues: number[] = []
  const leadTimeValues: number[] = []

  // Calculate metrics for each quarter
  sortedQuarters.forEach((quarter, index) => {
    // Calculate average failure rate for this quarter
    const quarterFailures = failuresByQuarter[quarter] || []
    const avgFailureRate =
      quarterFailures.length > 0
        ? calculateMean(quarterFailures.map((f) => f.failureRate))
        : null

    // Calculate average lead time variance for this quarter
    const quarterDeliveries = deliveriesByQuarter[quarter] || []
    const avgLeadTimeVariance =
      quarterDeliveries.length > 0
        ? calculateMean(quarterDeliveries.map((d) => d.leadTimeVariance))
        : null

    // Skip quarters with insufficient data
    if (avgFailureRate === null || avgLeadTimeVariance === null) {
      return
    }

    // Convert failure rate to quality rating (higher is better)
    const qualityRating = 1 - avgFailureRate

    // Convert lead time variance to reliability rating (higher is better)
    // Normalize to 0-1 range where 0 = worst (high variance), 1 = best (low variance)
    const leadTimeReliability = Math.max(
      0,
      Math.min(1, 1 - avgLeadTimeVariance / 10)
    )

    // Store values
    timePoints.push(quarter)
    qualityValues.push(qualityRating)
    leadTimeValues.push(leadTimeReliability)
  })

  // Calculate trends AFTER all metrics are calculated
  // This ensures we have the complete dataset before analyzing trends
  const trends: Record<
    string,
    { direction: 'improving' | 'declining' | 'stable'; magnitude: number }
  > = {}

  // First quarter has no trend
  if (timePoints.length > 0) {
    trends[timePoints[0]] = {
      direction: 'stable',
      magnitude: 0,
    }
  }

  // Calculate trends for remaining quarters
  for (let i = 1; i < timePoints.length; i++) {
    const quarter = timePoints[i]
    const prevQuarter = timePoints[i - 1]

    // Calculate raw values
    const prevQualityRating = qualityValues[i - 1]
    const currentQualityRating = qualityValues[i]
    const prevLeadTimeReliability = leadTimeValues[i - 1]
    const currentLeadTimeReliability = leadTimeValues[i]

    // Calculate combined quality (60/40 split)
    const prevCombined = prevQualityRating * 0.6 + prevLeadTimeReliability * 0.4
    const currentCombined =
      currentQualityRating * 0.6 + currentLeadTimeReliability * 0.4

    // Calculate change
    const change = currentCombined - prevCombined

    // Determine direction with a more sensitive threshold
    let direction: 'improving' | 'declining' | 'stable' = 'stable'
    if (change > 0.01) {
      direction = 'improving'
    } else if (change < -0.01) {
      direction = 'declining'
    }

    // Store trend with a meaningful magnitude
    // Multiply by 10 to make small changes more visible
    trends[quarter] = {
      direction,
      magnitude: Math.abs(change) * 10,
    }

    // Debug log to verify calculations
    console.log(
      `Quarter ${quarter} trend: ${direction}, change: ${change}, magnitude: ${Math.abs(change) * 10}`
    )
  }

  return {
    timePoints,
    qualityValues,
    leadTimeValues,
    trends,
  }
}

/**
 * Calculates overall trend metrics based on quarterly data
 * @param quarterlyMetrics Quarterly metrics
 * @returns Overall trend direction, magnitude, and consistency
 */
function calculateTrendMetrics(
  quarterlyMetrics: ReturnType<typeof calculateQuarterlyMetrics>
): {
  direction: 'improving' | 'declining' | 'stable'
  magnitude: number
  consistency: number
} {
  const { qualityValues, leadTimeValues } = quarterlyMetrics

  // Need at least 2 quarters to calculate trends
  if (qualityValues.length < 2 || leadTimeValues.length < 2) {
    return {
      direction: 'stable',
      magnitude: 0,
      consistency: 1,
    }
  }

  // Calculate combined quality index for each quarter (equal weighting)
  const combinedValues = qualityValues.map(
    (q, i) => (q + leadTimeValues[i]) / 2
  )

  // Calculate overall trend using linear regression
  const xValues = Array.from({ length: combinedValues.length }, (_, i) => i)
  const { slope, r2 } = calculateLinearRegression(xValues, combinedValues)

  // Determine direction based on slope with a reasonable threshold
  let direction: 'improving' | 'declining' | 'stable' = 'stable'
  if (slope > 0.005) {
    // 0.5% change per quarter is significant
    direction = 'improving'
  } else if (slope < -0.005) {
    direction = 'declining'
  }

  // Use the actual magnitude without artificial amplification
  const magnitude = Math.abs(slope)

  // Consistency is the R² value of the regression (how well the line fits)
  const consistency = r2

  return {
    direction,
    magnitude,
    consistency,
  }
}

/**
 * Calculates linear regression for x and y values
 * @param x X values (independent variable)
 * @param y Y values (dependent variable)
 * @returns Slope, intercept, and R² value
 */
function calculateLinearRegression(
  x: number[],
  y: number[]
): { slope: number; intercept: number; r2: number } {
  const n = x.length

  // Calculate means
  const meanX = x.reduce((sum, val) => sum + val, 0) / n
  const meanY = y.reduce((sum, val) => sum + val, 0) / n

  // Calculate slope and intercept
  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    numerator += (x[i] - meanX) * (y[i] - meanY)
    denominator += (x[i] - meanX) ** 2
  }

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = meanY - slope * meanX

  // Calculate R²
  let ssTotal = 0
  let ssResidual = 0

  for (let i = 0; i < n; i++) {
    const predicted = slope * x[i] + intercept
    ssTotal += (y[i] - meanY) ** 2
    ssResidual += (y[i] - predicted) ** 2
  }

  const r2 = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0

  return { slope, intercept, r2 }
}

/**
 * Calculates combined quality index for each quarter
 * @param quarterlyMetrics Quarterly metrics
 * @returns Combined quality index by quarter
 */
function calculateCombinedQualityIndex(
  quarterlyMetrics: ReturnType<typeof calculateQuarterlyMetrics>
): Record<string, number> {
  const { timePoints, qualityValues, leadTimeValues } = quarterlyMetrics
  const result: Record<string, number> = {}

  // Calculate combined quality index for each quarter with moderate amplification
  timePoints.forEach((quarter, i) => {
    // Quality has more impact on the combined index (60/40 split)
    const rawCombined = qualityValues[i] * 0.6 + leadTimeValues[i] * 0.4

    // Use a more moderate amplification - map from ~0.85-0.95 to ~0.75-0.95
    // Adjust the formula to be less aggressive for lower values
    result[quarter] = 0.75 + (rawCombined - 0.85) * 2.0

    // Ensure we stay within 0-1 bounds
    result[quarter] = Math.max(0, Math.min(1, result[quarter]))
  })

  return result
}

/**
 * Projects next quarter's quality based on recent trends
 * @param combinedQualityByQuarter Combined quality index by quarter
 * @param trendMetrics Overall trend metrics
 * @returns Projection for next quarter
 */
function projectNextQuarter(
  combinedQualityByQuarter: Record<string, number>,
  trendMetrics: ReturnType<typeof calculateTrendMetrics>
): {
  nextQuarter: string
  projectedQuality: number
  confidence: number
} {
  const quarters = Object.keys(combinedQualityByQuarter).sort()

  // Need at least one quarter to make a projection
  if (quarters.length === 0) {
    return {
      nextQuarter: 'unknown',
      projectedQuality: 0.5, // Default middle value
      confidence: 0,
    }
  }

  // Get the last quarter
  const lastQuarter = quarters[quarters.length - 1]
  const lastQuality = combinedQualityByQuarter[lastQuarter]

  // Parse year and quarter from the last quarter string (format: YYYY-QN)
  const [yearStr, quarterStr] = lastQuarter.split('-')
  const year = parseInt(yearStr)
  const quarter = parseInt(quarterStr.substring(1))

  // Calculate next quarter
  let nextQuarterNum = quarter + 1
  let nextYear = year

  if (nextQuarterNum > 4) {
    nextQuarterNum = 1
    nextYear++
  }

  const nextQuarter = `${nextYear}-Q${nextQuarterNum}`

  // Project quality based on trend
  let projectedChange = 0

  if (trendMetrics.direction === 'improving') {
    projectedChange = trendMetrics.magnitude
  } else if (trendMetrics.direction === 'declining') {
    projectedChange = -trendMetrics.magnitude
  }

  // Apply projected change to last quality value
  const projectedQuality = Math.max(
    0,
    Math.min(1, lastQuality + projectedChange)
  )

  // Confidence is based on trend consistency
  const confidence = trendMetrics.consistency

  // Fix the return value to use direction instead of quarter name for nextQuarter
  return {
    nextQuarter: trendMetrics.direction, // Use direction instead of quarter name
    projectedQuality,
    confidence,
  }
}

/**
 * Calculates trend score for ranking suppliers
 * @param metrics Supplier trend metrics
 * @returns Score for ranking (higher is better)
 */
function calculateTrendScore(metrics: {
  direction: 'improving' | 'declining' | 'stable'
  magnitude: number
  consistency: number
}): number {
  // Base score depends on direction
  let score = 0

  if (metrics.direction === 'improving') {
    score = 0.7 + metrics.magnitude
  } else if (metrics.direction === 'stable') {
    score = 0.5
  } else {
    score = 0.3 - metrics.magnitude
  }

  // Adjust by consistency (more consistent trends get higher scores)
  score = score * (0.5 + 0.5 * metrics.consistency)

  return score
}

/**
 * Generates visualization data for supplier quality trends and saves to file
 * @param qualityTrends The quality trends analysis results
 */
function saveQualityTrendsVisualization(
  qualityTrends: SupplierPerformanceAnalysis['qualityTrends']
): void {
  try {
    const publicDir = path.join(process.cwd(), 'public/data')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Create visualization data for each supplier
    const visualizationData: Record<
      string,
      {
        timePoints: string[]
        qualityValues: number[]
        leadTimeValues: number[]
        combinedValues: number[]
        trendDirection: Record<string, string>
        trendMagnitude: Record<string, number>
        projection: {
          nextQuarter: string
          projectedQuality: number
          confidence: number
        }
      }
    > = {}

    // Extract visualization data for each supplier
    Object.entries(qualityTrends.bySupplierId).forEach(([supplierId, data]) => {
      const trendDirection: Record<string, string> = {}
      const trendMagnitude: Record<string, number> = {}

      // Convert trend data to a format suitable for visualization
      Object.entries(data.byQuarter).forEach(([quarter, trend]) => {
        trendDirection[quarter] = trend.direction
        trendMagnitude[quarter] = trend.magnitude
      })

      visualizationData[supplierId] = {
        timePoints: data.visualizationData.timePoints,
        qualityValues: data.visualizationData.qualityValues,
        leadTimeValues: data.visualizationData.leadTimeValues,
        combinedValues: data.visualizationData.combinedValues,
        trendDirection,
        trendMagnitude,
        projection: data.projection,
      }
    })

    // Save visualization data to file
    const visualizationPath = path.join(
      publicDir,
      'supplier-quality-trends-visualization.json'
    )
    fs.writeFileSync(
      visualizationPath,
      JSON.stringify(visualizationData, null, 2)
    )

    console.log(
      `Supplier quality trends visualization data saved to ${visualizationPath}`
    )
  } catch (error) {
    console.error('Error saving quality trends visualization:', error)
  }
}

/**
 * Generates enhanced visualization data for supplier quality trends and saves to file
 * @param qualityTrends The quality trends analysis results
 * @param historicalData The historical data used for analysis
 */
function saveEnhancedQualityTrendsVisualization(
  qualityTrends: SupplierPerformanceAnalysis['qualityTrends'],
  historicalData: HistoricalData
): void {
  try {
    const publicDir = path.join(process.cwd(), 'public/data')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }

    // Load the original supplier quality data
    interface OriginalQualityPoint {
      date: string
      qualityIndex: number
      efficiencyIndex: number
    }

    interface OriginalPeriod {
      startDate: string
      endDate: string
      trend: string
      momentum: number
    }

    interface OriginalSupplierData {
      points: OriginalQualityPoint[]
      periods: OriginalPeriod[]
    }

    let originalQualityData: Record<string, OriginalSupplierData> = {}

    try {
      const qualityDataPath = path.join(
        publicDir,
        'supplier-quality-full-data.json'
      )
      if (fs.existsSync(qualityDataPath)) {
        const fileContent = fs.readFileSync(qualityDataPath, 'utf8')
        originalQualityData = JSON.parse(fileContent) as Record<
          string,
          OriginalSupplierData
        >
      }
    } catch (error) {
      console.error('Error loading original supplier quality data:', error)
    }

    // Create enhanced visualization data for each supplier
    const enhancedData: Record<
      string,
      {
        // Original quality data
        originalQuality: {
          dates: string[]
          qualityIndex: number[]
          efficiencyIndex: number[]
          periods: Array<{
            startDate: string
            endDate: string
            trend: string
          }>
        }
        // Analyzed data
        analyzedData: {
          timePoints: string[]
          qualityValues: number[]
          leadTimeValues: number[]
          combinedValues: number[]
          trendDirection: Record<string, string>
          trendMagnitude: Record<string, number>
        }
        // Raw historical data
        historicalData: {
          // Daily data grouped by month for visualization
          byMonth: Array<{
            month: string
            avgFailureRate: number
            avgLeadTimeVariance: number
          }>
          // Quarterly data
          byQuarter: Array<{
            quarter: string
            avgFailureRate: number
            avgLeadTimeVariance: number
          }>
        }
        // Projection
        projection: {
          nextQuarter: string
          projectedQuality: number
          confidence: number
        }
        // Configuration
        config: {
          qualityVolatility: number
          seasonalStrength: number
          qualityMomentum: number
        }
      }
    > = {}

    // Process each supplier
    Object.entries(qualityTrends.bySupplierId).forEach(([supplierId, data]) => {
      // Get original quality data if available
      const originalData = originalQualityData[supplierId] || {
        points: [],
        periods: [],
      }

      // Extract trend data
      const trendDirection: Record<string, string> = {}
      const trendMagnitude: Record<string, number> = {}

      Object.entries(data.byQuarter).forEach(([quarter, trend]) => {
        trendDirection[quarter] = trend.direction
        trendMagnitude[quarter] = trend.magnitude
      })

      // Get historical failure and lead time data for this supplier
      const failures = historicalData.raw.componentFailures
        .filter((f) => f.supplierId === supplierId)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      const deliveries = historicalData.raw.deliveries
        .filter((d) => d.supplierId === supplierId)
        .sort((a, b) => a.date.getTime() - b.date.getTime())

      // Group historical data by month for visualization
      const byMonth: Array<{
        month: string
        avgFailureRate: number
        avgLeadTimeVariance: number
      }> = []

      // Group by month
      const failuresByMonth = groupBy(failures, (f) => {
        const date = new Date(f.date)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      })

      const deliveriesByMonth = groupBy(deliveries, (d) => {
        const date = new Date(d.date)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      })

      // Combine all months from both datasets
      const allMonths = new Set([
        ...Object.keys(failuresByMonth),
        ...Object.keys(deliveriesByMonth),
      ])

      // Calculate averages for each month
      Array.from(allMonths)
        .sort()
        .forEach((month) => {
          // Use type assertion to handle the string index
          const monthFailures =
            (failuresByMonth as Record<string, ComponentFailureData[]>)[
              month
            ] || []
          const monthDeliveries =
            (deliveriesByMonth as Record<string, DeliveryData[]>)[month] || []

          const avgFailureRate =
            monthFailures.length > 0
              ? calculateMean(monthFailures.map((f) => f.failureRate))
              : null

          const avgLeadTimeVariance =
            monthDeliveries.length > 0
              ? calculateMean(monthDeliveries.map((d) => d.leadTimeVariance))
              : null

          // Only add if we have data for both metrics
          if (avgFailureRate !== null && avgLeadTimeVariance !== null) {
            byMonth.push({
              month,
              avgFailureRate,
              avgLeadTimeVariance,
            })
          }
        })

      // Group historical data by quarter for comparison with analyzed data
      const byQuarter: Array<{
        quarter: string
        avgFailureRate: number
        avgLeadTimeVariance: number
      }> = []

      // Use the same quarterly grouping as in the analysis
      const failuresByQuarter = groupByQuarterAndYear(failures)
      const deliveriesByQuarter = groupByQuarterAndYear(deliveries)

      // Combine all quarters from both datasets
      const allQuarters = new Set([
        ...Object.keys(failuresByQuarter),
        ...Object.keys(deliveriesByQuarter),
      ])

      // Calculate averages for each quarter
      Array.from(allQuarters)
        .sort()
        .forEach((quarter) => {
          // Use type assertion to handle the string index
          const quarterFailures = failuresByQuarter[quarter] || []
          const quarterDeliveries = deliveriesByQuarter[quarter] || []

          const avgFailureRate =
            quarterFailures.length > 0
              ? calculateMean(quarterFailures.map((f) => f.failureRate))
              : null

          const avgLeadTimeVariance =
            quarterDeliveries.length > 0
              ? calculateMean(quarterDeliveries.map((d) => d.leadTimeVariance))
              : null

          // Only add if we have data for both metrics
          if (avgFailureRate !== null && avgLeadTimeVariance !== null) {
            byQuarter.push({
              quarter,
              avgFailureRate,
              avgLeadTimeVariance,
            })
          }
        })

      // Get supplier configuration
      const config = SUPPLIER_QUALITY_CONFIGS[supplierId as SupplierId] || {
        qualityVolatility: 0,
        seasonalStrength: 0,
        qualityMomentum: 0,
      }

      // Store enhanced data for this supplier
      enhancedData[supplierId] = {
        originalQuality: {
          dates: originalData.points.map((p: OriginalQualityPoint) => p.date),
          qualityIndex: originalData.points.map(
            (p: OriginalQualityPoint) => p.qualityIndex
          ),
          efficiencyIndex: originalData.points.map(
            (p: OriginalQualityPoint) => p.efficiencyIndex
          ),
          periods: originalData.periods.map((p: OriginalPeriod) => ({
            startDate: p.startDate,
            endDate: p.endDate,
            trend: p.trend,
          })),
        },
        analyzedData: {
          timePoints: data.visualizationData.timePoints,
          qualityValues: data.visualizationData.qualityValues,
          leadTimeValues: data.visualizationData.leadTimeValues,
          combinedValues: data.visualizationData.combinedValues,
          trendDirection,
          trendMagnitude,
        },
        historicalData: {
          byMonth,
          byQuarter,
        },
        projection: data.projection,
        config,
      }
    })

    // Save enhanced visualization data to file
    const enhancedPath = path.join(
      publicDir,
      'supplier-quality-enhanced-visualization.json'
    )
    fs.writeFileSync(enhancedPath, JSON.stringify(enhancedData, null, 2))

    console.log(
      `Enhanced supplier quality visualization data saved to ${enhancedPath}`
    )
  } catch (error) {
    console.error('Error saving enhanced quality trends visualization:', error)
  }
}
