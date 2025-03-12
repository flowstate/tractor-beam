import type { HistoricalData } from '../types/analytics.types'
import type {
  QuarterlyDemandData,
  QuarterlyDataPoint,
  QuarterlyForecastPoint,
  AggregatedQuarterlyData,
  ForecastQuarterlyData,
  SeasonalPeak,
  QuarterlyDemandResponse,
} from './visualization.types'
import {
  type LocationId,
  type TractorModelId,
  LOCATION_IDS,
  TRACTOR_MODEL_IDS,
} from '../types/types'
import type { DemandForecast } from '@prisma/client'

/**
 * Aggregates historical data into quarterly demand
 */
export async function aggregateQuarterlyDemand(
  historicalData: HistoricalData,
  forecasts: DemandForecast[]
): Promise<QuarterlyDemandData> {
  console.log('=== STARTING QUARTERLY DEMAND AGGREGATION ===')
  console.log('Historical data time range:', {
    firstReport: historicalData.raw.locationReports[0]?.date,
    lastReport:
      historicalData.raw.locationReports[
        historicalData.raw.locationReports.length - 1
      ]?.date,
    reportCount: historicalData.raw.locationReports.length,
  })
  console.log('Forecast count:', forecasts.length)

  // Process historical data
  const aggregatedData = aggregateHistoricalQuarterlyDemand(historicalData)

  // Process forecast data
  const forecastData = processForecastData(forecasts)

  // Combine historical and forecast data
  const result = combineHistoricalAndForecastData(aggregatedData, forecastData)
  console.log('=== FINAL AGGREGATED DATA ===')
  console.log('Quarters:', result.quarters)
  console.log('Historical values:', result.historical)
  console.log('Forecast values:', result.forecast)

  return result
}

/**
 * Aggregates historical data into quarterly demand points
 */
function aggregateHistoricalQuarterlyDemand(
  historicalData: HistoricalData
): AggregatedQuarterlyData {
  console.log('=== AGGREGATING HISTORICAL QUARTERLY DEMAND ===')

  // Sample the first few location reports to understand the data
  console.log(
    'Sample location reports (first 3):',
    historicalData.raw.locationReports.slice(0, 3).map((report) => ({
      date: report.date,
      parsedDate: new Date(report.date).toISOString(),
      locationId: report.locationId,
      modelDemandCount: report.modelDemand.length,
      totalDemand: report.modelDemand.reduce(
        (sum, md) => sum + md.demandUnits,
        0
      ),
    }))
  )

  // Initialize data structures
  const byLocation: Record<LocationId, QuarterlyDataPoint[]> = {} as Record<
    LocationId,
    QuarterlyDataPoint[]
  >
  const byModel: Record<TractorModelId, QuarterlyDataPoint[]> = {} as Record<
    TractorModelId,
    QuarterlyDataPoint[]
  >
  const overall: QuarterlyDataPoint[] = []

  // Initialize location records
  LOCATION_IDS.forEach((locationId) => {
    byLocation[locationId] = []
  })

  // Initialize model records
  TRACTOR_MODEL_IDS.forEach((modelId) => {
    byModel[modelId] = []
  })

  // Process location reports to extract quarterly data
  const locationReports = historicalData.raw.locationReports

  // Group by quarter and year
  const quarterlyDemandMap = new Map<string, Map<number, Map<number, number>>>()

  // Initialize maps for each location and model
  LOCATION_IDS.forEach((locationId) => {
    quarterlyDemandMap.set(locationId, new Map<number, Map<number, number>>())
  })

  // Process each location report
  locationReports.forEach((report, index) => {
    // FIX: Ensure date is parsed correctly by explicitly handling UTC
    const dateStr = report.date
    const date = new Date(dateStr)

    // Force UTC interpretation if needed
    // This ensures we're using the date as provided without timezone adjustments
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() // 0-11
    const quarter = Math.floor(month / 3) + 1 // 1-4

    // Log every 1000th report to avoid excessive logging
    if (index % 1000 === 0 || index < 5) {
      // Log first few reports always
      console.log(`Processing report ${index}:`, {
        rawDate: dateStr,
        parsedDate: date.toISOString(),
        year,
        quarter,
        month,
        locationId: report.locationId,
        totalDemand: report.modelDemand.reduce(
          (sum, md) => sum + md.demandUnits,
          0
        ),
      })
    }

    // Get or create year map for this location
    const locationMap = quarterlyDemandMap.get(report.locationId as LocationId)
    if (!locationMap) return

    const yearMap = locationMap.get(year) ?? new Map<number, number>()
    locationMap.set(year, yearMap)

    // Sum demand for this quarter
    report.modelDemand.forEach((demand) => {
      const currentDemand = yearMap.get(quarter) ?? 0
      yearMap.set(quarter, currentDemand + demand.demandUnits)
    })
  })

  // Log the quarterly demand map structure
  console.log('Quarterly demand map structure:')
  quarterlyDemandMap.forEach((locationYearMap, locationId) => {
    const yearQuarters: Record<number, number[]> = {}
    locationYearMap.forEach((quarterMap, year) => {
      yearQuarters[year] = Array.from(quarterMap.keys()).sort()
    })
    console.log(`Location ${locationId}:`, yearQuarters)
  })

  // Convert maps to arrays of quarterly data points
  quarterlyDemandMap.forEach((locationYearMap, locationId) => {
    locationYearMap.forEach((quarterMap, year) => {
      quarterMap.forEach((demand, quarter) => {
        byLocation[locationId as LocationId].push({
          year,
          quarter,
          demand,
        })
      })
    })
  })

  // Aggregate overall demand
  const overallMap = new Map<number, Map<number, number>>()

  LOCATION_IDS.forEach((locationId) => {
    const locationData = byLocation[locationId]
    locationData.forEach((point) => {
      const yearMap = overallMap.get(point.year) ?? new Map<number, number>()
      overallMap.set(point.year, yearMap)

      const currentDemand = yearMap.get(point.quarter) ?? 0
      yearMap.set(point.quarter, currentDemand + point.demand)
    })
  })

  // Convert overall map to array
  overallMap.forEach((quarterMap, year) => {
    quarterMap.forEach((demand, quarter) => {
      overall.push({
        year,
        quarter,
        demand,
      })
    })
  })

  // Sort all data chronologically
  const sortByYearAndQuarter = (
    a: QuarterlyDataPoint,
    b: QuarterlyDataPoint
  ) => {
    if (a.year !== b.year) return a.year - b.year
    return a.quarter - b.quarter
  }

  overall.sort(sortByYearAndQuarter)

  // Log the overall quarterly data
  console.log(
    'Overall quarterly data points:',
    overall.map((point) => `${point.year} Q${point.quarter}: ${point.demand}`)
  )

  return { byLocation, byModel, overall }
}

/**
 * Processes forecast data from the database
 */
function processForecastData(
  forecasts: DemandForecast[]
): ForecastQuarterlyData {
  console.log('=== PROCESSING FORECAST DATA ===')
  console.log('Forecast count:', forecasts.length)

  if (forecasts.length > 0) {
    // Log the first forecast to understand its structure
    console.log('First forecast sample:', {
      id: forecasts[0].id,
      locationId: forecasts[0].locationId,
      modelId: forecasts[0].modelId,
      forecastDataLength: Array.isArray(forecasts[0].forecastData)
        ? (forecasts[0].forecastData as any[]).length
        : 'not an array',
    })

    // Log a sample of the forecast data points
    const sampleData = Array.isArray(forecasts[0].forecastData)
      ? (forecasts[0].forecastData as any[]).slice(0, 3)
      : forecasts[0].forecastData
    console.log('Forecast data sample:', sampleData)
  }

  // Initialize data structures
  const byLocation: Record<LocationId, QuarterlyForecastPoint[]> = {} as Record<
    LocationId,
    QuarterlyForecastPoint[]
  >
  const byModel: Record<TractorModelId, QuarterlyForecastPoint[]> =
    {} as Record<TractorModelId, QuarterlyForecastPoint[]>
  const overall: QuarterlyForecastPoint[] = []

  // Initialize location records
  LOCATION_IDS.forEach((locationId) => {
    byLocation[locationId] = []
  })

  // Initialize model records
  TRACTOR_MODEL_IDS.forEach((modelId) => {
    byModel[modelId] = []
  })

  // Process each forecast
  forecasts.forEach((forecast, index) => {
    console.log(`Processing forecast ${index}:`, {
      id: forecast.id,
      locationId: forecast.locationId,
      modelId: forecast.modelId,
    })

    // Parse the forecast data
    const forecastData = forecast.forecastData as unknown as {
      date: string
      value: number
      lower: number
      upper: number
    }[]

    console.log(`Forecast ${index} data points:`, forecastData.length)

    // Log the first few forecast dates to debug
    console.log(
      `First 3 forecast dates for forecast ${index}:`,
      forecastData.slice(0, 3).map((point) => ({
        rawDate: point.date,
        parsedDate: new Date(point.date).toISOString(),
        utcYear: new Date(point.date).getUTCFullYear(),
        utcMonth: new Date(point.date).getUTCMonth(),
        utcQuarter: Math.floor(new Date(point.date).getUTCMonth() / 3) + 1,
      }))
    )

    // Group by quarter
    const quarterlyForecastMap = new Map<
      number,
      Map<number, { demand: number; upper: number; lower: number }>
    >()

    forecastData.forEach((point) => {
      // FIX: Ensure date is parsed correctly by explicitly handling UTC
      const dateStr = point.date
      const date = new Date(dateStr)

      // Force UTC interpretation
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() // 0-11
      const quarter = Math.floor(month / 3) + 1 // 1-4

      // Log every 100th point to avoid excessive logging
      if (forecastData.indexOf(point) % 100 === 0) {
        console.log(`Forecast point:`, {
          rawDate: dateStr,
          parsedDate: date.toISOString(),
          year,
          quarter,
          month,
          value: point.value,
          lower: point.lower,
          upper: point.upper,
        })
      }

      // Get or create year map
      const yearMap =
        quarterlyForecastMap.get(year) ??
        new Map<number, { demand: number; upper: number; lower: number }>()
      quarterlyForecastMap.set(year, yearMap)

      // Get or create quarter data
      const quarterData = yearMap.get(quarter) ?? {
        demand: 0,
        upper: 0,
        lower: 0,
      }

      // Aggregate daily data to quarterly
      quarterData.demand += point.value
      quarterData.upper += point.upper
      quarterData.lower += point.lower

      yearMap.set(quarter, quarterData)
    })

    // Log the quarterly forecast map
    console.log(
      `Forecast ${index} quarterly aggregation:`,
      Array.from(quarterlyForecastMap.entries()).map(([year, quarterMap]) => ({
        year,
        quarters: Array.from(quarterMap.entries()).map(([quarter, data]) => ({
          quarter,
          demand: data.demand,
          upper: data.upper,
          lower: data.lower,
        })),
      }))
    )

    // Convert map to array of forecast points
    const forecastPoints: QuarterlyForecastPoint[] = []

    quarterlyForecastMap.forEach((quarterMap, year) => {
      quarterMap.forEach((data, quarter) => {
        forecastPoints.push({
          year,
          quarter,
          demand: data.demand,
          upperBound: data.upper,
          lowerBound: data.lower,
        })
      })
    })

    // Sort chronologically
    forecastPoints.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.quarter - b.quarter
    })

    console.log(
      `Forecast ${index} points after sorting:`,
      forecastPoints.map(
        (point) =>
          `${point.year} Q${point.quarter}: ${point.demand} (${point.lowerBound}-${point.upperBound})`
      )
    )

    // Add to appropriate collections
    if (forecast.locationId && forecast.modelId) {
      // Location-specific forecast
      const locationId = forecast.locationId as LocationId
      if (LOCATION_IDS.includes(locationId)) {
        byLocation[locationId].push(...forecastPoints)
      }

      // Model-specific forecast
      const modelId = forecast.modelId as TractorModelId
      if (TRACTOR_MODEL_IDS.includes(modelId)) {
        byModel[modelId].push(...forecastPoints)
      }
    } else {
      // Overall forecast
      overall.push(...forecastPoints)
    }
  })

  // Fix: If no overall forecasts were added directly, aggregate from location forecasts
  if (overall.length === 0) {
    console.log(
      'No overall forecasts found, aggregating from location forecasts...'
    )

    // Create a map to aggregate forecasts by year and quarter
    const aggregatedForecasts = new Map<
      number,
      Map<
        number,
        {
          demand: number
          upperBound: number
          lowerBound: number
        }
      >
    >()

    // Aggregate forecasts from all locations
    LOCATION_IDS.forEach((locationId) => {
      const locationForecasts = byLocation[locationId]

      locationForecasts.forEach((forecast) => {
        const yearMap =
          aggregatedForecasts.get(forecast.year) ??
          new Map<
            number,
            { demand: number; upperBound: number; lowerBound: number }
          >()

        if (!aggregatedForecasts.has(forecast.year)) {
          aggregatedForecasts.set(forecast.year, yearMap)
        }

        const quarterData = yearMap.get(forecast.quarter) ?? {
          demand: 0,
          upperBound: 0,
          lowerBound: 0,
        }

        quarterData.demand += forecast.demand
        quarterData.upperBound += forecast.upperBound
        quarterData.lowerBound += forecast.lowerBound

        yearMap.set(forecast.quarter, quarterData)
      })
    })

    // Convert the aggregated map to an array of forecast points
    aggregatedForecasts.forEach((quarterMap, year) => {
      quarterMap.forEach((data, quarter) => {
        overall.push({
          year,
          quarter,
          demand: data.demand,
          upperBound: data.upperBound,
          lowerBound: data.lowerBound,
        })
      })
    })

    // Sort the overall forecasts chronologically
    overall.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.quarter - b.quarter
    })

    console.log(
      'Aggregated overall forecasts:',
      overall.map(
        (point) =>
          `${point.year} Q${point.quarter}: ${point.demand} (${point.lowerBound}-${point.upperBound})`
      )
    )
  }

  // Log the overall forecast data
  console.log(
    'Overall forecast data points:',
    overall.map(
      (point) =>
        `${point.year} Q${point.quarter}: ${point.demand} (${point.lowerBound}-${point.upperBound})`
    )
  )

  return { byLocation, byModel, overall }
}

/**
 * Combines historical and forecast data into a unified structure
 */
function combineHistoricalAndForecastData(
  historicalData: AggregatedQuarterlyData,
  forecastData: ForecastQuarterlyData
): QuarterlyDemandData {
  console.log('=== COMBINING HISTORICAL AND FORECAST DATA ===')

  // Use overall data for the main visualization
  const historical = historicalData.overall
  const forecast = forecastData.overall

  console.log('Historical data points:', historical.length)
  console.log('Forecast data points:', forecast.length)

  // Log the first few historical points
  console.log(
    'Historical data sample:',
    historical
      .slice(0, 5)
      .map((point) => `${point.year} Q${point.quarter}: ${point.demand}`)
  )

  // Log the first few forecast points
  console.log(
    'Forecast data sample:',
    forecast
      .slice(0, 5)
      .map(
        (point) =>
          `${point.year} Q${point.quarter}: ${point.demand} (${point.lowerBound}-${point.upperBound})`
      )
  )

  // Create quarter labels
  const quarters: string[] = []
  const historicalValues: number[] = []
  const forecastValues: number[] = []
  const upperBoundValues: number[] = []
  const lowerBoundValues: number[] = []

  // Process historical data
  historical.forEach((point) => {
    const quarterLabel = `Q${point.quarter} ${point.year}`
    console.log(`Adding historical point: ${quarterLabel} = ${point.demand}`)

    quarters.push(quarterLabel)
    historicalValues.push(point.demand)
    // Add placeholder values for forecast data
    forecastValues.push(0)
    upperBoundValues.push(0)
    lowerBoundValues.push(0)
  })

  // Process forecast data
  forecast.forEach((point) => {
    const quarterLabel = `Q${point.quarter} ${point.year}`
    console.log(`Processing forecast point: ${quarterLabel} = ${point.demand}`)

    const index = quarters.indexOf(quarterLabel)

    if (index >= 0) {
      // Override placeholder values
      console.log(
        `Overriding existing quarter ${quarterLabel} at index ${index}`
      )
      forecastValues[index] = point.demand
      upperBoundValues[index] = point.upperBound
      lowerBoundValues[index] = point.lowerBound
    } else {
      // Add new quarter
      console.log(`Adding new quarter ${quarterLabel}`)
      quarters.push(quarterLabel)
      historicalValues.push(0) // No historical data for this quarter
      forecastValues.push(point.demand)
      upperBoundValues.push(point.upperBound)
      lowerBoundValues.push(point.lowerBound)
    }
  })

  console.log('Final quarters array:', quarters)
  console.log('Final historical values:', historicalValues)
  console.log('Final forecast values:', forecastValues)

  // Identify seasonal peaks
  const seasonalPeaks = identifySeasonalPeaks(historical, forecast)
  console.log('Identified seasonal peaks:', seasonalPeaks)

  // Calculate seasonality and trend strength
  const seasonalityStrength = calculateSeasonalityStrength(historical)
  const trendStrength = calculateTrendStrength(historical)
  console.log('Seasonality strength:', seasonalityStrength)
  console.log('Trend strength:', trendStrength)

  // Calculate RMSE (Root Mean Square Error)
  const rmse = calculateRMSE(historical, forecast)
  console.log('RMSE:', rmse)

  return {
    quarters,
    historical: historicalValues,
    forecast: forecastValues,
    upperBound: upperBoundValues,
    lowerBound: lowerBoundValues,
    seasonalPeaks,
    seasonalityStrength,
    trendStrength,
    rmse,
  }
}

/**
 * Identifies seasonal peaks in the data
 */
function identifySeasonalPeaks(
  historical: QuarterlyDataPoint[],
  forecast: QuarterlyForecastPoint[]
): SeasonalPeak[] {
  const peaks: SeasonalPeak[] = []

  // Group historical data by quarter
  const quarterAverages = new Map<number, number[]>()

  historical.forEach((point) => {
    const values = quarterAverages.get(point.quarter) ?? []
    values.push(point.demand)
    quarterAverages.set(point.quarter, values)
  })

  // Calculate average for each quarter
  const quarterAvg = new Map<number, number>()

  quarterAverages.forEach((values, quarter) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
    quarterAvg.set(quarter, avg)
  })

  // Find the highest average quarter
  let maxQuarter = 1
  let maxAvg = 0

  quarterAvg.forEach((avg, quarter) => {
    if (avg > maxAvg) {
      maxAvg = avg
      maxQuarter = quarter
    }
  })

  // Find a representative peak from historical data
  const peakCandidates = historical.filter(
    (point) => point.quarter === maxQuarter
  )

  if (peakCandidates.length > 0) {
    // Find the highest peak
    const peak = peakCandidates.reduce(
      (max, point) => (point.demand > max.demand ? point : max),
      peakCandidates[0]
    )

    peaks.push({
      quarter: `Q${peak.quarter} ${peak.year}`,
      value: peak.demand,
      description: `Seasonal peak (Q${maxQuarter} typically shows highest demand)`,
    })
  }

  // Add forecast peak if available
  const forecastPeaks = forecast.filter((point) => point.quarter === maxQuarter)

  if (forecastPeaks.length > 0) {
    const forecastPeak = forecastPeaks.reduce(
      (max, point) => (point.demand > max.demand ? point : max),
      forecastPeaks[0]
    )

    peaks.push({
      quarter: `Q${forecastPeak.quarter} ${forecastPeak.year}`,
      value: forecastPeak.demand,
      description: `Forecasted seasonal peak (${forecastPeak.demand.toLocaleString()} units)`,
    })
  }

  return peaks
}

/**
 * Calculates the strength of seasonality in the data
 */
function calculateSeasonalityStrength(
  historical: QuarterlyDataPoint[]
): number {
  // Group by quarter
  const byQuarter = new Map<number, number[]>()

  historical.forEach((point) => {
    const values = byQuarter.get(point.quarter) ?? []
    values.push(point.demand)
    byQuarter.set(point.quarter, values)
  })

  // Calculate variance between quarters vs. within quarters
  const quarterAverages = new Map<number, number>()
  let overallAvg = 0
  let totalPoints = 0

  byQuarter.forEach((values, quarter) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
    quarterAverages.set(quarter, avg)
    overallAvg += values.reduce((sum, val) => sum + val, 0)
    totalPoints += values.length
  })

  overallAvg /= totalPoints

  // Calculate between-quarter variance
  let betweenQuarterVariance = 0
  quarterAverages.forEach((avg) => {
    betweenQuarterVariance += Math.pow(avg - overallAvg, 2)
  })
  betweenQuarterVariance /= quarterAverages.size

  // Calculate within-quarter variance
  let withinQuarterVariance = 0
  let withinCount = 0

  byQuarter.forEach((values, quarter) => {
    const avg = quarterAverages.get(quarter) ?? 0
    values.forEach((val) => {
      withinQuarterVariance += Math.pow(val - avg, 2)
      withinCount++
    })
  })
  withinQuarterVariance /= withinCount

  // Calculate seasonality strength (0-1)
  const totalVariance = betweenQuarterVariance + withinQuarterVariance
  return totalVariance > 0 ? betweenQuarterVariance / totalVariance : 0
}

/**
 * Calculates the strength of the trend in the data
 */
function calculateTrendStrength(historical: QuarterlyDataPoint[]): number {
  if (historical.length < 4) return 0

  // Sort by time
  const sorted = [...historical].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.quarter - b.quarter
  })

  // Calculate linear regression
  const n = sorted.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  sorted.forEach((point, i) => {
    sumX += i
    sumY += point.demand
    sumXY += i * point.demand
    sumX2 += i * i
  })

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)

  // Calculate R-squared
  const avgY = sumY / n
  let totalVariance = 0
  let explainedVariance = 0

  sorted.forEach((point, i) => {
    const predicted = slope * i + (sumY - slope * sumX) / n
    totalVariance += Math.pow(point.demand - avgY, 2)
    explainedVariance += Math.pow(predicted - avgY, 2)
  })

  return totalVariance > 0 ? explainedVariance / totalVariance : 0
}

/**
 * Calculates Root Mean Square Error between historical and forecast data
 */
function calculateRMSE(
  historical: QuarterlyDataPoint[],
  forecast: QuarterlyForecastPoint[]
): number {
  // Find overlapping quarters
  const overlaps: Array<{ actual: number; predicted: number }> = []

  historical.forEach((histPoint) => {
    const matchingForecast = forecast.find(
      (forecastPoint) =>
        forecastPoint.year === histPoint.year &&
        forecastPoint.quarter === histPoint.quarter
    )

    if (matchingForecast) {
      overlaps.push({
        actual: histPoint.demand,
        predicted: matchingForecast.demand,
      })
    }
  })

  if (overlaps.length === 0) return 0

  // Calculate RMSE
  const squaredErrors = overlaps.map((point) =>
    Math.pow(point.actual - point.predicted, 2)
  )

  const mse = squaredErrors.reduce((sum, err) => sum + err, 0) / overlaps.length
  return Math.sqrt(mse)
}

/**
 * Calculates year-over-year growth percentages
 */
export function calculateYearOverYearGrowth(
  data: QuarterlyDemandData
): Record<string, number[]> {
  console.log('=== CALCULATING YEAR-OVER-YEAR GROWTH ===')
  console.log('Input quarters:', data.quarters)
  console.log('Input historical values:', data.historical)
  console.log('Input forecast values:', data.forecast)

  const quarters = data.quarters
  const historical = data.historical
  const forecast = data.forecast

  // Extract years from quarter labels
  const years = quarters.map((q) => parseInt(q.split(' ')[1]))
  const uniqueYears = Array.from(new Set(years)).sort()
  console.log('Unique years identified:', uniqueYears)

  if (uniqueYears.length < 2) {
    console.log('Not enough years for YoY calculation')
    return {
      year2OverYear1: [],
      year3OverYear2: [],
      forecastOverYear3: [],
    }
  }

  // Group data by year and quarter
  const byYearQuarter = new Map<number, Map<number, number>>()

  quarters.forEach((q, i) => {
    const parts = q.split(' ')
    const quarter = parseInt(parts[0].substring(1))
    const year = parseInt(parts[1])

    console.log(
      `Processing quarter ${q}: year=${year}, quarter=${quarter}, historical=${historical[i]}, forecast=${forecast[i]}`
    )

    const yearMap = byYearQuarter.get(year) ?? new Map<number, number>()
    byYearQuarter.set(year, yearMap)

    // Use forecast data if available, otherwise historical
    const value = forecast[i] > 0 ? forecast[i] : historical[i]
    yearMap.set(quarter, value)
  })

  // Log the grouped data
  console.log('Data grouped by year and quarter:')
  byYearQuarter.forEach((quarterMap, year) => {
    console.log(
      `Year ${year}:`,
      Array.from(quarterMap.entries()).map(
        ([quarter, value]) => `Q${quarter}: ${value}`
      )
    )
  })

  // Calculate YoY growth for each quarter
  const year2OverYear1: number[] = []
  const year3OverYear2: number[] = []
  const forecastOverYear3: number[] = []

  // We need at least 3 years for all comparisons
  if (uniqueYears.length >= 3) {
    const year1 = uniqueYears[0]
    const year2 = uniqueYears[1]
    const year3 = uniqueYears[2]

    console.log(`Comparing years: ${year1}, ${year2}, ${year3}`)

    // Calculate for each quarter
    for (let quarter = 1; quarter <= 4; quarter++) {
      const year1Value = byYearQuarter.get(year1)?.get(quarter) ?? 0
      const year2Value = byYearQuarter.get(year2)?.get(quarter) ?? 0
      const year3Value = byYearQuarter.get(year3)?.get(quarter) ?? 0

      console.log(
        `Q${quarter} values: ${year1}=${year1Value}, ${year2}=${year2Value}, ${year3}=${year3Value}`
      )

      // Year 2 over Year 1
      if (year1Value > 0) {
        const growth = ((year2Value - year1Value) / year1Value) * 100
        console.log(`Q${quarter} ${year2} over ${year1}: ${growth.toFixed(2)}%`)
        year2OverYear1.push(growth)
      } else {
        console.log(`Q${quarter} ${year2} over ${year1}: 0% (year1 value is 0)`)
        year2OverYear1.push(0)
      }

      // Year 3 over Year 2
      if (year2Value > 0) {
        const growth = ((year3Value - year2Value) / year2Value) * 100
        console.log(`Q${quarter} ${year3} over ${year2}: ${growth.toFixed(2)}%`)
        year3OverYear2.push(growth)
      } else {
        console.log(`Q${quarter} ${year3} over ${year2}: 0% (year2 value is 0)`)
        year3OverYear2.push(0)
      }
    }
  }

  // FIX: Calculate forecast (2025) over last historical year (2024)
  // Find the forecast year and the last historical year
  const forecastYear = uniqueYears[uniqueYears.length - 1] // Should be 2025
  const lastHistoricalYear = uniqueYears[uniqueYears.length - 2] // Should be 2024

  console.log(
    `Calculating forecast growth: ${forecastYear} over ${lastHistoricalYear}`
  )

  // Get the quarters that have forecast data (should be Q1 and Q2)
  const forecastQuarters = Array.from(
    byYearQuarter.get(forecastYear)?.keys() ?? []
  ).sort()

  forecastQuarters.forEach((quarter) => {
    const lastYearValue =
      byYearQuarter.get(lastHistoricalYear)?.get(quarter) ?? 0
    const forecastValue = byYearQuarter.get(forecastYear)?.get(quarter) ?? 0

    console.log(
      `Q${quarter} values: ${lastHistoricalYear}=${lastYearValue}, ${forecastYear}=${forecastValue}`
    )

    if (lastYearValue > 0) {
      const growth = ((forecastValue - lastYearValue) / lastYearValue) * 100
      console.log(
        `Q${quarter} ${forecastYear} over ${lastHistoricalYear}: ${growth.toFixed(2)}%`
      )
      forecastOverYear3.push(growth)
    } else {
      console.log(
        `Q${quarter} ${forecastYear} over ${lastHistoricalYear}: 0% (lastYear value is 0)`
      )
      forecastOverYear3.push(0)
    }
  })

  const result = {
    year2OverYear1,
    year3OverYear2,
    forecastOverYear3,
  }

  console.log('Final YoY growth result:', result)

  return result
}

/**
 * Generates highlights based on the data patterns
 */
export function generateHighlights(
  data: QuarterlyDemandData,
  yoyGrowth: Record<string, number[]>
): {
  keyPatterns: string[]
  predictionBasis: string[]
  businessImplications: string[]
} {
  const keyPatterns: string[] = []
  const predictionBasis: string[] = []
  const businessImplications: string[] = []

  // Analyze seasonality
  if (data.seasonalityStrength > 0.6) {
    keyPatterns.push(
      `Strong seasonal pattern detected (${(data.seasonalityStrength * 100).toFixed(1)}% of variation explained by seasonality)`
    )
    predictionBasis.push(
      'ML model leverages 3 years of historical seasonal patterns'
    )
  } else if (data.seasonalityStrength > 0.3) {
    keyPatterns.push(
      `Moderate seasonal pattern detected (${(data.seasonalityStrength * 100).toFixed(1)}% of variation explained by seasonality)`
    )
    predictionBasis.push('ML model accounts for recurring quarterly patterns')
  } else {
    keyPatterns.push('Limited seasonality in demand patterns')
    predictionBasis.push(
      'ML model focuses on trend analysis over seasonal factors'
    )
  }

  // Analyze trend
  if (data.trendStrength > 0.7) {
    keyPatterns.push(
      `Strong upward trend detected (${(data.trendStrength * 100).toFixed(1)}% of variation explained by trend)`
    )
    businessImplications.push(
      'Consider increasing production capacity to meet growing demand'
    )
    predictionBasis.push(
      'ML model projects continued growth based on strong historical trend'
    )
  } else if (data.trendStrength > 0.4) {
    keyPatterns.push(
      `Moderate upward trend detected (${(data.trendStrength * 100).toFixed(1)}% of variation explained by trend)`
    )
    predictionBasis.push(
      'ML model balances trend and seasonal factors in prediction'
    )
  } else if (data.trendStrength > 0.2) {
    keyPatterns.push(
      `Weak upward trend detected (${(data.trendStrength * 100).toFixed(1)}% of variation explained by trend)`
    )
  } else {
    keyPatterns.push('No significant trend detected in historical data')
  }

  // Analyze YoY growth
  const lastYearGrowth = yoyGrowth.year3OverYear2
  if (lastYearGrowth.length > 0) {
    const avgGrowth =
      lastYearGrowth.reduce((sum, val) => sum + val, 0) / lastYearGrowth.length
    if (avgGrowth > 10) {
      keyPatterns.push(
        `High year-over-year growth: ${avgGrowth.toFixed(1)}% on average`
      )
      businessImplications.push(
        'Prepare for continued growth by securing additional suppliers'
      )
      predictionBasis.push('ML model factors in accelerating growth rate')
    } else if (avgGrowth > 5) {
      keyPatterns.push(
        `Moderate year-over-year growth: ${avgGrowth.toFixed(1)}% on average`
      )
      businessImplications.push(
        'Maintain current supplier relationships with room for growth'
      )
      predictionBasis.push(
        'ML model projects steady growth based on historical patterns'
      )
    } else if (avgGrowth > 0) {
      keyPatterns.push(
        `Stable year-over-year growth: ${avgGrowth.toFixed(1)}% on average`
      )
      businessImplications.push('Focus on optimizing current operations')
    } else {
      keyPatterns.push(
        `Declining year-over-year demand: ${avgGrowth.toFixed(1)}% on average`
      )
      businessImplications.push(
        'Consider diversifying product offerings or exploring new markets'
      )
      predictionBasis.push(
        'ML model accounts for declining trend in projections'
      )
    }
  }

  // Analyze forecast
  const forecastGrowth = yoyGrowth.forecastOverYear3
  if (forecastGrowth.length > 0) {
    const avgForecastGrowth =
      forecastGrowth.reduce((sum, val) => sum + val, 0) / forecastGrowth.length

    if (avgForecastGrowth > 15) {
      predictionBasis.push(
        `ML model predicts exceptional growth (${avgForecastGrowth.toFixed(1)}%) for upcoming quarters`
      )
      businessImplications.push(
        'Urgent need to expand capacity and secure additional suppliers'
      )
    } else if (avgForecastGrowth > 8) {
      predictionBasis.push(
        `ML model predicts strong growth (${avgForecastGrowth.toFixed(1)}%) for upcoming quarters`
      )
      businessImplications.push(
        'Proactively increase inventory and production capacity'
      )
    } else if (avgForecastGrowth > 3) {
      predictionBasis.push(
        `ML model predicts moderate growth (${avgForecastGrowth.toFixed(1)}%) for upcoming quarters`
      )
      businessImplications.push(
        'Maintain flexible capacity to accommodate growth'
      )
    } else if (avgForecastGrowth > -3) {
      predictionBasis.push(
        `ML model predicts stable demand (${avgForecastGrowth.toFixed(1)}%) for upcoming quarters`
      )
      businessImplications.push('Focus on efficiency and cost optimization')
    } else {
      predictionBasis.push(
        `ML model predicts declining demand (${avgForecastGrowth.toFixed(1)}%) for upcoming quarters`
      )
      businessImplications.push(
        'Consider reducing production and inventory levels'
      )
    }
  }

  // Analyze seasonal peaks
  if (data.seasonalPeaks.length > 0) {
    const peakQuarters = data.seasonalPeaks
      .map((peak) => peak.quarter.split(' ')[0])
      .join(', ')
    keyPatterns.push(`Demand peaks consistently in ${peakQuarters}`)
    businessImplications.push(
      `Increase inventory and production capacity before ${peakQuarters}`
    )
  }

  // Add model accuracy information
  if (data.rmse > 0) {
    const avgDemand =
      data.historical.reduce((sum, val) => sum + val, 0) /
      data.historical.length
    const errorPercentage = (data.rmse / avgDemand) * 100

    if (errorPercentage < 5) {
      predictionBasis.push(
        `High prediction accuracy (error rate: ${errorPercentage.toFixed(1)}%)`
      )
    } else if (errorPercentage < 10) {
      predictionBasis.push(
        `Good prediction accuracy (error rate: ${errorPercentage.toFixed(1)}%)`
      )
    } else if (errorPercentage < 20) {
      predictionBasis.push(
        `Moderate prediction accuracy (error rate: ${errorPercentage.toFixed(1)}%)`
      )
    } else {
      predictionBasis.push(
        `Limited prediction accuracy (error rate: ${errorPercentage.toFixed(1)}%)`
      )
      businessImplications.push(
        'Consider more frequent forecast updates due to volatility'
      )
    }
  }

  // Ensure we have at least one item in each category
  if (keyPatterns.length === 0) {
    keyPatterns.push('No significant patterns detected in historical data')
  }

  if (predictionBasis.length === 0) {
    predictionBasis.push('Prediction based on historical demand patterns')
  }

  if (businessImplications.length === 0) {
    businessImplications.push(
      'Monitor demand trends and adjust inventory accordingly'
    )
  }

  return {
    keyPatterns,
    predictionBasis,
    businessImplications,
  }
}

/**
 * Formats quarterly data for API response
 */
export function formatQuarterlyResponse(
  data: QuarterlyDemandData,
  yoyGrowth: Record<string, number[]>,
  highlights: {
    keyPatterns: string[]
    predictionBasis: string[]
    businessImplications: string[]
  }
): QuarterlyDemandResponse {
  // Ensure yoyGrowth has the correct structure
  const typedYoyGrowth = {
    year2OverYear1: yoyGrowth.year2OverYear1 ?? [],
    year3OverYear2: yoyGrowth.year3OverYear2 ?? [],
    forecastOverYear3: yoyGrowth.forecastOverYear3 ?? [],
  }

  return {
    quarters: data.quarters,
    demandData: {
      historical: data.historical,
      forecast: data.forecast,
      upperBound: data.upperBound,
      lowerBound: data.lowerBound,
    },
    yoyGrowth: typedYoyGrowth,
    highlights,
    seasonalPeaks: data.seasonalPeaks,
    modelMetadata: {
      confidenceInterval: 0.95, // Default value
      seasonalityStrength: data.seasonalityStrength,
      trendStrength: data.trendStrength,
      rmse: data.rmse,
    },
  }
}

/**
 * Creates a filtered view of quarterly demand data for a specific location
 */
export function filterDataByLocation(
  data: QuarterlyDemandData,
  locationData: AggregatedQuarterlyData,
  forecastData: ForecastQuarterlyData,
  locationId: LocationId
): QuarterlyDemandData {
  // Get location-specific data
  const historical = locationData.byLocation[locationId]
  const forecast = forecastData.byLocation[locationId]

  // Create quarter labels and data arrays
  const quarters: string[] = []
  const historicalValues: number[] = []
  const forecastValues: number[] = []
  const upperBoundValues: number[] = []
  const lowerBoundValues: number[] = []

  // Process historical data
  historical.forEach((point) => {
    quarters.push(`Q${point.quarter} ${point.year}`)
    historicalValues.push(point.demand)
    // Add placeholder values for forecast data
    forecastValues.push(0)
    upperBoundValues.push(0)
    lowerBoundValues.push(0)
  })

  // Process forecast data
  forecast.forEach((point) => {
    const quarterLabel = `Q${point.quarter} ${point.year}`
    const index = quarters.indexOf(quarterLabel)

    if (index >= 0) {
      // Override placeholder values
      forecastValues[index] = point.demand
      upperBoundValues[index] = point.upperBound
      lowerBoundValues[index] = point.lowerBound
    } else {
      // Add new quarter
      quarters.push(quarterLabel)
      historicalValues.push(0) // No historical data for this quarter
      forecastValues.push(point.demand)
      upperBoundValues.push(point.upperBound)
      lowerBoundValues.push(point.lowerBound)
    }
  })

  // Identify seasonal peaks
  const seasonalPeaks = identifySeasonalPeaks(historical, forecast)

  // Calculate seasonality and trend strength
  const seasonalityStrength = calculateSeasonalityStrength(historical)
  const trendStrength = calculateTrendStrength(historical)

  // Calculate RMSE (Root Mean Square Error)
  const rmse = calculateRMSE(historical, forecast)

  return {
    quarters,
    historical: historicalValues,
    forecast: forecastValues,
    upperBound: upperBoundValues,
    lowerBound: lowerBoundValues,
    seasonalPeaks,
    seasonalityStrength,
    trendStrength,
    rmse,
  }
}

/**
 * Creates a filtered view of quarterly demand data for a specific model
 */
export function filterDataByModel(
  data: QuarterlyDemandData,
  modelData: AggregatedQuarterlyData,
  forecastData: ForecastQuarterlyData,
  modelId: TractorModelId
): QuarterlyDemandData {
  // Get model-specific data
  const historical = modelData.byModel[modelId]
  const forecast = forecastData.byModel[modelId]

  // Create quarter labels and data arrays
  const quarters: string[] = []
  const historicalValues: number[] = []
  const forecastValues: number[] = []
  const upperBoundValues: number[] = []
  const lowerBoundValues: number[] = []

  // Process historical data
  historical.forEach((point) => {
    quarters.push(`Q${point.quarter} ${point.year}`)
    historicalValues.push(point.demand)
    // Add placeholder values for forecast data
    forecastValues.push(0)
    upperBoundValues.push(0)
    lowerBoundValues.push(0)
  })

  // Process forecast data
  forecast.forEach((point) => {
    const quarterLabel = `Q${point.quarter} ${point.year}`
    const index = quarters.indexOf(quarterLabel)

    if (index >= 0) {
      // Override placeholder values
      forecastValues[index] = point.demand
      upperBoundValues[index] = point.upperBound
      lowerBoundValues[index] = point.lowerBound
    } else {
      // Add new quarter
      quarters.push(quarterLabel)
      historicalValues.push(0) // No historical data for this quarter
      forecastValues.push(point.demand)
      upperBoundValues.push(point.upperBound)
      lowerBoundValues.push(point.lowerBound)
    }
  })

  // Identify seasonal peaks
  const seasonalPeaks = identifySeasonalPeaks(historical, forecast)

  // Calculate seasonality and trend strength
  const seasonalityStrength = calculateSeasonalityStrength(historical)
  const trendStrength = calculateTrendStrength(historical)

  // Calculate RMSE (Root Mean Square Error)
  const rmse = calculateRMSE(historical, forecast)

  return {
    quarters,
    historical: historicalValues,
    forecast: forecastValues,
    upperBound: upperBoundValues,
    lowerBound: lowerBoundValues,
    seasonalPeaks,
    seasonalityStrength,
    trendStrength,
    rmse,
  }
}
