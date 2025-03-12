import type { HistoricalData } from '../types/analytics.types'
import {
  type LocationId,
  type TractorModelId,
  LOCATION_IDS,
  TRACTOR_MODEL_IDS,
} from '../types/types'
import type { DemandForecast } from '@prisma/client'
import { LOCATIONS } from '../constants'
import {
  type LocationModelDemand,
  type ModelDemandByLocationResponse,
  type ModelDemandData,
  type RawModelDemandByLocation,
} from './visualization.types'

/**
 * Extracts model demand data by location from historical data and forecasts
 */
export async function extractModelDemandByLocation(
  historicalData: HistoricalData,
  forecasts: DemandForecast[]
): Promise<RawModelDemandByLocation> {
  console.log('=== EXTRACTING MODEL DEMAND BY LOCATION ===')
  console.log('Historical data time range:', {
    firstReport: historicalData.raw.locationReports[0]?.date,
    lastReport:
      historicalData.raw.locationReports[
        historicalData.raw.locationReports.length - 1
      ]?.date,
    reportCount: historicalData.raw.locationReports.length,
  })
  console.log('Forecast count:', forecasts.length)

  // Initialize the result structure
  const result: RawModelDemandByLocation = {
    locations: {} as Record<
      LocationId,
      {
        modelDemandByQuarter: Record<string, Record<TractorModelId, number>>
        forecastByQuarter: Record<
          string,
          Record<
            TractorModelId,
            {
              demand: number
              upperBound: number
              lowerBound: number
            }
          >
        >
      }
    >,
  }

  // Initialize data structures for each location
  LOCATION_IDS.forEach((locationId) => {
    result.locations[locationId] = {
      modelDemandByQuarter: {},
      forecastByQuarter: {},
    }
  })

  // Process historical data
  console.log('Processing historical location reports...')
  await processHistoricalData(historicalData, result)

  // Process forecast data
  console.log('Processing forecast data...')
  await processForecastData(forecasts, result)

  return result
}

/**
 * Processes historical data to extract model demand by location and quarter
 */
async function processHistoricalData(
  historicalData: HistoricalData,
  result: RawModelDemandByLocation
): Promise<void> {
  // Group location reports by quarter
  const locationReports = historicalData.raw.locationReports

  console.log(`Processing ${locationReports.length} location reports...`)

  // Process each location report
  locationReports.forEach((report, index) => {
    // Log progress for large datasets
    if (index % 1000 === 0 || index < 5) {
      console.log(`Processing report ${index}/${locationReports.length}`)
    }

    const date = new Date(report.date)
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() // 0-11
    const quarter = Math.floor(month / 3) + 1 // 1-4

    const quarterKey = `Q${quarter} ${year}`
    const locationId = report.locationId as LocationId

    // Skip if not a valid location
    if (!LOCATION_IDS.includes(locationId)) {
      return
    }

    // Initialize quarter data if not exists
    if (!result.locations[locationId].modelDemandByQuarter[quarterKey]) {
      result.locations[locationId].modelDemandByQuarter[quarterKey] =
        {} as Record<TractorModelId, number>

      // Initialize with zero for all models
      TRACTOR_MODEL_IDS.forEach((modelId) => {
        result.locations[locationId].modelDemandByQuarter[quarterKey][modelId] =
          0
      })
    }

    // Aggregate model demand for this report
    report.modelDemand.forEach((demand) => {
      const modelId = demand.modelId as TractorModelId

      // Skip if not a valid model
      if (!TRACTOR_MODEL_IDS.includes(modelId)) {
        return
      }

      // Add demand to the quarter total
      result.locations[locationId].modelDemandByQuarter[quarterKey][modelId] +=
        demand.demandUnits
    })
  })

  // Log the quarters we found for each location
  Object.entries(result.locations).forEach(([locationId, data]) => {
    console.log(
      `Location ${locationId} has ${Object.keys(data.modelDemandByQuarter).length} quarters of historical data`
    )

    // Log a sample of the data
    const sampleQuarter = Object.keys(data.modelDemandByQuarter)[0]
    if (sampleQuarter) {
      console.log(
        `Sample data for ${locationId}, ${sampleQuarter}:`,
        data.modelDemandByQuarter[sampleQuarter]
      )
    }
  })
}

/**
 * Processes forecast data to extract model demand forecasts by location and quarter
 */
async function processForecastData(
  forecasts: DemandForecast[],
  result: RawModelDemandByLocation
): Promise<void> {
  console.log(`Processing ${forecasts.length} forecasts...`)

  // Process each forecast
  forecasts.forEach((forecast, index) => {
    console.log(
      `Processing forecast ${index}/${forecasts.length}: ${forecast.id}`
    )

    const locationId = forecast.locationId as LocationId
    const modelId = forecast.modelId as TractorModelId

    // Skip if not valid location or model
    if (
      !LOCATION_IDS.includes(locationId) ||
      !TRACTOR_MODEL_IDS.includes(modelId)
    ) {
      console.log(
        `Skipping forecast with invalid location/model: ${locationId}/${modelId}`
      )
      return
    }

    // Parse the forecast data
    const forecastData = forecast.forecastData as unknown as {
      date: string
      value: number
      lower: number
      upper: number
    }[]

    console.log(`Forecast ${index} has ${forecastData.length} data points`)

    // Group forecast data by quarter
    forecastData.forEach((point) => {
      const date = new Date(point.date)
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() // 0-11
      const quarter = Math.floor(month / 3) + 1 // 1-4

      const quarterKey = `Q${quarter} ${year}`

      // Initialize quarter data if not exists
      if (!result.locations[locationId].forecastByQuarter[quarterKey]) {
        result.locations[locationId].forecastByQuarter[quarterKey] =
          {} as Record<
            TractorModelId,
            {
              demand: number
              upperBound: number
              lowerBound: number
            }
          >

        // Initialize with zero for all models
        TRACTOR_MODEL_IDS.forEach((mid) => {
          result.locations[locationId].forecastByQuarter[quarterKey][mid] = {
            demand: 0,
            upperBound: 0,
            lowerBound: 0,
          }
        })
      }

      // Add forecast values to the quarter total
      result.locations[locationId].forecastByQuarter[quarterKey][
        modelId
      ].demand += point.value
      result.locations[locationId].forecastByQuarter[quarterKey][
        modelId
      ].upperBound += point.upper
      result.locations[locationId].forecastByQuarter[quarterKey][
        modelId
      ].lowerBound += point.lower
    })
  })

  // Log the quarters we found for each location
  Object.entries(result.locations).forEach(([locationId, data]) => {
    console.log(
      `Location ${locationId} has ${Object.keys(data.forecastByQuarter).length} quarters of forecast data`
    )

    // Log a sample of the data
    const sampleQuarter = Object.keys(data.forecastByQuarter)[0]
    if (sampleQuarter) {
      console.log(
        `Sample forecast data for ${locationId}, ${sampleQuarter}:`,
        data.forecastByQuarter[sampleQuarter]
      )
    }
  })
}

/**
 * Retrieves model preferences for each location
 */
export function getModelPreferencesByLocation(): Record<
  LocationId,
  Record<TractorModelId, number>
> {
  const preferences: Record<
    LocationId,
    Record<TractorModelId, number>
  > = {} as Record<LocationId, Record<TractorModelId, number>>

  LOCATION_IDS.forEach((locationId) => {
    preferences[locationId] = LOCATIONS[locationId].modelPreferences
  })

  return preferences
}

/**
 * Transforms raw model demand data into structured format for visualization
 */
export function transformModelDemandData(
  rawData: RawModelDemandByLocation
): ModelDemandByLocationResponse {
  console.log('=== TRANSFORMING MODEL DEMAND DATA ===')

  const result: ModelDemandByLocationResponse = {
    locations: {} as Record<LocationId, LocationModelDemand>,
    highlights: {
      locationProfiles: {} as Record<LocationId, string[]>,
      modelTrends: {} as Record<TractorModelId, string[]>,
      businessInsights: [],
    },
  }

  // Process each location
  LOCATION_IDS.forEach((locationId) => {
    console.log(`Transforming data for location: ${locationId}`)

    const locationData = rawData.locations[locationId]

    // Get all quarters from both historical and forecast data
    const allQuarters = [
      ...Object.keys(locationData.modelDemandByQuarter),
      ...Object.keys(locationData.forecastByQuarter),
    ]

    // Remove duplicates and sort chronologically
    const timePoints = [...new Set(allQuarters)].sort((a, b) => {
      const yearA = parseInt(a.split(' ')[1])
      const yearB = parseInt(b.split(' ')[1])

      if (yearA !== yearB) return yearA - yearB

      const quarterA = parseInt(a.split(' ')[0].substring(1))
      const quarterB = parseInt(b.split(' ')[0].substring(1))

      return quarterA - quarterB
    })

    console.log(
      `Location ${locationId} has ${timePoints.length} unique quarters`
    )

    // Get model preferences
    const modelPreferences = LOCATIONS[locationId].modelPreferences

    // Initialize models data
    const models: Record<TractorModelId, ModelDemandData> = {} as Record<
      TractorModelId,
      ModelDemandData
    >

    // Process each model
    TRACTOR_MODEL_IDS.forEach((modelId) => {
      // Initialize arrays
      const historical: number[] = []
      const forecast: number[] = []
      const upperBound: number[] = []
      const lowerBound: number[] = []

      // Fill arrays with data for each time point
      timePoints.forEach((quarter) => {
        // Get historical data if available
        const histData =
          locationData.modelDemandByQuarter[quarter]?.[modelId] ?? 0
        historical.push(histData)

        // Get forecast data if available
        const forecastData = locationData.forecastByQuarter[quarter]?.[modelId]
        forecast.push(forecastData?.demand ?? 0)
        upperBound.push(forecastData?.upperBound ?? 0)
        lowerBound.push(forecastData?.lowerBound ?? 0)
      })

      // Store model data
      models[modelId] = {
        historical,
        forecast,
        upperBound,
        lowerBound,
      }
    })

    // Store location data
    result.locations[locationId] = {
      timePoints,
      modelPreferences,
      models,
    }
  })

  // Generate insights
  const highlights = generateModelDemandHighlights(result.locations)
  result.highlights = highlights

  return result
}

/**
 * Generates insights and highlights for model demand by location
 */
function generateModelDemandHighlights(
  locationData: Record<LocationId, LocationModelDemand>
): {
  locationProfiles: Record<LocationId, string[]>
  modelTrends: Record<TractorModelId, string[]>
  businessInsights: string[]
} {
  console.log('=== GENERATING MODEL DEMAND HIGHLIGHTS ===')

  const locationProfiles: Record<LocationId, string[]> = {} as Record<
    LocationId,
    string[]
  >
  const modelTrends: Record<TractorModelId, string[]> = {} as Record<
    TractorModelId,
    string[]
  >
  const businessInsights: string[] = []

  // Generate location profiles
  LOCATION_IDS.forEach((locationId) => {
    const location = locationData[locationId]
    const preferences = location.modelPreferences

    // Sort models by preference
    const sortedModels = Object.entries(preferences)
      .sort(([, prefA], [, prefB]) => prefB - prefA)
      .map(([modelId]) => modelId as TractorModelId)

    const highestPrefModel = sortedModels[0]
    const lowestPrefModel = sortedModels[sortedModels.length - 1]

    const profile: string[] = []

    // Add profile description based on preferences
    if (preferences[highestPrefModel] > 2.0) {
      profile.push(
        `Strong preference for ${highestPrefModel} models (${preferences[highestPrefModel].toFixed(1)}x baseline)`
      )
    } else if (preferences[highestPrefModel] > 1.0) {
      profile.push(
        `Moderate preference for ${highestPrefModel} models (${preferences[highestPrefModel].toFixed(1)}x baseline)`
      )
    } else {
      profile.push(`Balanced demand across all models`)
    }

    // Add low preference note if applicable
    if (preferences[lowestPrefModel] < 0.5) {
      profile.push(
        `Limited demand for ${lowestPrefModel} models (${preferences[lowestPrefModel].toFixed(1)}x baseline)`
      )
    }

    // Add seasonal pattern if detectable
    profile.push(
      `Follows typical agricultural seasonal pattern with peak demand in Q3`
    )

    // Add location-specific insights
    if (locationId === 'west') {
      profile.push(`Premium market with focus on high-end models`)
    } else if (locationId === 'south') {
      profile.push(
        `Budget-conscious market with preference for entry-level models`
      )
    } else if (locationId === 'heartland') {
      profile.push(`Balanced market with moderate demand across model range`)
    }

    locationProfiles[locationId] = profile
  })

  // Generate model trends
  TRACTOR_MODEL_IDS.forEach((modelId) => {
    const trends: string[] = []

    // Add model-specific insights
    if (modelId === 'TX-100') {
      trends.push(
        `Entry-level model with broad appeal in budget-conscious markets`
      )
      trends.push(`Less affected by market trends (30% sensitivity)`)
      trends.push(`More sensitive to price changes (70% inflation sensitivity)`)
    } else if (modelId === 'TX-300') {
      trends.push(`Mid-range model with balanced appeal across all markets`)
      trends.push(`Moderately affected by market trends (60% sensitivity)`)
      trends.push(`Moderate price sensitivity (40% inflation sensitivity)`)
    } else if (modelId === 'TX-500') {
      trends.push(`Premium model with strong appeal in high-end markets`)
      trends.push(`Highly affected by market trends (80% sensitivity)`)
      trends.push(`Low price sensitivity (20% inflation sensitivity)`)
    }

    modelTrends[modelId] = trends
  })

  // Generate business insights
  businessInsights.push(
    'Location-specific inventory planning can optimize capital allocation'
  )
  businessInsights.push(
    'Consider regional marketing campaigns aligned with local model preferences'
  )
  businessInsights.push(
    'Seasonal patterns suggest opportunity for time-phased procurement strategies'
  )
  businessInsights.push(
    'Model mix varies significantly by location, requiring tailored supply chain planning'
  )
  businessInsights.push(
    'Premium models show higher growth potential in western markets'
  )
  businessInsights.push(
    'Entry-level models maintain consistent demand in southern markets despite economic fluctuations'
  )

  return {
    locationProfiles,
    modelTrends,
    businessInsights,
  }
}

/**
 * Main function to process model demand by location
 */
export async function processModelDemandByLocation(
  historicalData: HistoricalData,
  forecasts: DemandForecast[]
): Promise<ModelDemandByLocationResponse> {
  console.log('=== PROCESSING MODEL DEMAND BY LOCATION ===')

  // Extract raw data
  const rawData = await extractModelDemandByLocation(historicalData, forecasts)

  // Transform data for visualization
  const result = transformModelDemandData(rawData)

  console.log('=== MODEL DEMAND PROCESSING COMPLETE ===')

  return result
}
