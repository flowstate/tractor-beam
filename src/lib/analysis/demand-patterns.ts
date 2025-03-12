import {
  type HistoricalData,
  type DemandPatternAnalysis,
} from '../types/analytics.types'
import { calculateCorrelation } from './utils'

/**
 * Analyzes demand patterns from historical data
 * - Calculates seasonal demand coefficients by model and location
 * - Extracts market sensitivity factors
 * - Computes price sensitivity factors
 * - Generates correlation matrices between economic indicators and demand
 */
export async function analyzeDemandPatterns(
  historicalData: HistoricalData
): Promise<DemandPatternAnalysis> {
  // Initialize result structure
  const result: DemandPatternAnalysis = {
    seasonalDemand: {
      overall: { 1: 0, 2: 0, 3: 0, 4: 0 },
      byLocation: {},
      byModel: {},
    },
    marketSensitivity: {
      byModel: {},
      byLocation: {},
    },
    priceSensitivity: {
      byModel: {},
      byLocation: {},
    },
    correlations: {
      mtiToDemand: {},
      inflationToDemand: {},
      mtiToInflation: 0,
    },
  }

  // Extract location and model IDs
  const locationIds = historicalData.raw.locations.map((l) => l.id)
  const modelIds = historicalData.raw.models.map((m) => m.id)

  // Initialize location and model data
  locationIds.forEach((locationId) => {
    result.seasonalDemand.byLocation[locationId] = { 1: 0, 2: 0, 3: 0, 4: 0 }
    result.marketSensitivity.byLocation[locationId] = 0
    result.priceSensitivity.byLocation[locationId] = 0
  })

  modelIds.forEach((modelId) => {
    result.seasonalDemand.byModel[modelId] = { 1: 0, 2: 0, 3: 0, 4: 0 }
    result.marketSensitivity.byModel[modelId] = 0
    result.priceSensitivity.byModel[modelId] = 0
    result.correlations.mtiToDemand[modelId] = 0
    result.correlations.inflationToDemand[modelId] = 0
  })

  // Calculate overall seasonal demand
  const quarterlyDemand: Record<number, number[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  }

  historicalData.byLocationQuarter.forEach((lq) => {
    quarterlyDemand[lq.quarter].push(lq.totalDemand)
  })

  // Calculate average demand by quarter
  let overallAvgDemand = 0
  let totalQuarters = 0

  for (let quarter = 1; quarter <= 4; quarter++) {
    if (quarterlyDemand[quarter].length > 0) {
      const avgDemand =
        quarterlyDemand[quarter].reduce((sum, d) => sum + d, 0) /
        quarterlyDemand[quarter].length

      result.seasonalDemand.overall[quarter] = avgDemand
      overallAvgDemand += avgDemand
      totalQuarters++
    }
  }

  overallAvgDemand = totalQuarters > 0 ? overallAvgDemand / totalQuarters : 0

  // Normalize seasonal coefficients (1.0 = average)
  if (overallAvgDemand > 0) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      result.seasonalDemand.overall[quarter] =
        result.seasonalDemand.overall[quarter] / overallAvgDemand
    }
  }

  // Calculate seasonal demand by location
  locationIds.forEach((locationId) => {
    const locationQuarterData = historicalData.byLocationQuarter.filter(
      (lq) => lq.locationId === locationId
    )

    const quarterlyDemand: Record<number, number[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    }

    locationQuarterData.forEach((lq) => {
      quarterlyDemand[lq.quarter].push(lq.totalDemand)
    })

    // Calculate average demand by quarter
    let locationAvgDemand = 0
    let totalQuarters = 0

    for (let quarter = 1; quarter <= 4; quarter++) {
      if (quarterlyDemand[quarter].length > 0) {
        const avgDemand =
          quarterlyDemand[quarter].reduce((sum, d) => sum + d, 0) /
          quarterlyDemand[quarter].length

        result.seasonalDemand.byLocation[locationId][quarter] = avgDemand
        locationAvgDemand += avgDemand
        totalQuarters++
      }
    }

    locationAvgDemand =
      totalQuarters > 0 ? locationAvgDemand / totalQuarters : 0

    // Normalize seasonal coefficients (1.0 = average)
    if (locationAvgDemand > 0) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        result.seasonalDemand.byLocation[locationId][quarter] =
          result.seasonalDemand.byLocation[locationId][quarter] /
          locationAvgDemand
      }
    }
  })

  // Calculate seasonal demand by model
  modelIds.forEach((modelId) => {
    // Collect quarterly demand for this model
    const quarterlyDemand: Record<number, number[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
    }

    historicalData.byLocationQuarter.forEach((lq) => {
      const modelDemand = lq.modelDemand[modelId] || 0
      quarterlyDemand[lq.quarter].push(modelDemand)
    })

    // Calculate average demand by quarter
    let modelAvgDemand = 0
    let totalQuarters = 0

    for (let quarter = 1; quarter <= 4; quarter++) {
      if (quarterlyDemand[quarter].length > 0) {
        const avgDemand =
          quarterlyDemand[quarter].reduce((sum, d) => sum + d, 0) /
          quarterlyDemand[quarter].length

        result.seasonalDemand.byModel[modelId][quarter] = avgDemand
        modelAvgDemand += avgDemand
        totalQuarters++
      }
    }

    modelAvgDemand = totalQuarters > 0 ? modelAvgDemand / totalQuarters : 0

    // Normalize seasonal coefficients (1.0 = average)
    if (modelAvgDemand > 0) {
      for (let quarter = 1; quarter <= 4; quarter++) {
        result.seasonalDemand.byModel[modelId][quarter] =
          result.seasonalDemand.byModel[modelId][quarter] / modelAvgDemand
      }
    }
  })

  // Calculate market sensitivity
  // For each model, calculate correlation between MTI and demand
  modelIds.forEach((modelId) => {
    const mtiValues: number[] = []
    const demandValues: number[] = []
    const inflationValues: number[] = []

    // Collect MTI and demand pairs
    historicalData.raw.locationReports.forEach((report) => {
      const modelDemand = report.modelDemand.find(
        (md) => md.modelId === modelId
      )

      if (modelDemand) {
        mtiValues.push(report.marketTrendIndex)
        demandValues.push(modelDemand.demandUnits)
        inflationValues.push(report.inflationRate)
      }
    })

    // Calculate correlations
    if (mtiValues.length > 0) {
      result.correlations.mtiToDemand[modelId] = calculateCorrelation(
        mtiValues,
        demandValues
      )
      result.correlations.inflationToDemand[modelId] = calculateCorrelation(
        inflationValues,
        demandValues
      )

      // Market sensitivity is the correlation coefficient
      result.marketSensitivity.byModel[modelId] = Math.abs(
        result.correlations.mtiToDemand[modelId]
      )

      // Price sensitivity is the correlation coefficient with inflation (usually negative)
      result.priceSensitivity.byModel[modelId] = Math.abs(
        result.correlations.inflationToDemand[modelId]
      )
    }
  })

  // Calculate location-specific sensitivities
  locationIds.forEach((locationId) => {
    const locationReports = historicalData.raw.locationReports.filter(
      (r) => r.locationId === locationId
    )

    const mtiValues: number[] = []
    const totalDemandValues: number[] = []
    const inflationValues: number[] = []

    // Collect MTI and total demand pairs
    locationReports.forEach((report) => {
      const totalDemand = report.modelDemand.reduce(
        (sum, md) => sum + md.demandUnits,
        0
      )

      mtiValues.push(report.marketTrendIndex)
      totalDemandValues.push(totalDemand)
      inflationValues.push(report.inflationRate)
    })

    // Calculate correlations
    if (mtiValues.length > 0) {
      const mtiCorrelation = calculateCorrelation(mtiValues, totalDemandValues)
      const inflationCorrelation = calculateCorrelation(
        inflationValues,
        totalDemandValues
      )

      // Market sensitivity is the correlation coefficient
      result.marketSensitivity.byLocation[locationId] = Math.abs(mtiCorrelation)

      // Price sensitivity is the correlation coefficient with inflation (usually negative)
      result.priceSensitivity.byLocation[locationId] =
        Math.abs(inflationCorrelation)
    }
  })

  // Calculate MTI to inflation correlation
  const allMtiValues: number[] = []
  const allInflationValues: number[] = []

  historicalData.raw.locationReports.forEach((report) => {
    allMtiValues.push(report.marketTrendIndex)
    allInflationValues.push(report.inflationRate)
  })

  if (allMtiValues.length > 0) {
    result.correlations.mtiToInflation = calculateCorrelation(
      allMtiValues,
      allInflationValues
    )
  }

  return result
}
