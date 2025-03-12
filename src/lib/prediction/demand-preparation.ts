// src/lib/prediction/data-preparation.ts

import { type RawHistoricalData } from '../types/analytics.types'
import {
  type DemandHistoricalDataPoint,
  type DemandPredictionRequest,
} from './prediction.types'
import { type DemandPatternAnalysis } from '../types/analytics.types'
import { type LocationId, type TractorModelId } from '../types/types'

export function prepareDemandPredictionData(
  rawData: RawHistoricalData,
  demandAnalysis: DemandPatternAnalysis,
  futurePeriods = 90,
  locationId?: LocationId,
  modelId?: TractorModelId,
  futureMTI?: number[] // Only accept MTI projections
): DemandPredictionRequest {
  // Debug: Log initial data size
  console.log('Initial data size:', {
    totalReports: rawData.locationReports.length,
    totalModelDemands: rawData.locationReports.reduce(
      (sum, r) => sum + r.modelDemand.length,
      0
    ),
  })

  // Filter location reports based on locationId if provided
  const locationReports = locationId
    ? rawData.locationReports.filter(
        (report) => report.locationId === locationId
      )
    : rawData.locationReports

  // Debug: Log after location filtering
  console.log('After location filtering:', {
    filteredReports: locationReports.length,
    totalModelDemands: locationReports.reduce(
      (sum, r) => sum + r.modelDemand.length,
      0
    ),
  })

  // Create a map to store data points by date, location, and model
  const dataMap = new Map<string, DemandHistoricalDataPoint>()

  // Generate all possible date combinations for the time range
  const startDate = new Date('2022-01-01')
  const endDate = new Date('2024-12-31')

  // Determine which locations and models to include
  const locationsToInclude = locationId
    ? [locationId]
    : (Array.from(
        new Set(rawData.locationReports.map((r) => r.locationId))
      ) as LocationId[])

  const modelsToInclude = modelId
    ? [modelId]
    : (Array.from(
        new Set(
          rawData.locationReports.flatMap((r) =>
            r.modelDemand.map((d) => d.modelId)
          )
        )
      ) as TractorModelId[])

  console.log('Including in dataset:', {
    locations: locationsToInclude,
    models: modelsToInclude,
  })

  // Pre-fill the map with zero values for all date/location/model combinations
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]

    for (const loc of locationsToInclude) {
      // Skip if we're filtering by location and this isn't the one
      if (locationId && loc !== locationId) continue

      for (const mod of modelsToInclude) {
        // Skip if we're filtering by model and this isn't the one
        if (modelId && mod !== modelId) continue

        // Create a key for this combination
        const key = `${dateStr}|${loc}|${mod}`

        // Find the location report for this date if it exists
        const report = locationReports.find(
          (r) =>
            r.date.toISOString().split('T')[0] === dateStr &&
            r.locationId === loc
        )

        // If we don't have a report for this date/location, use default values
        if (!report) {
          dataMap.set(key, {
            date: dateStr,
            locationId: loc,
            modelId: mod,
            demand: 0, // Zero demand for missing dates
            mti: 0, // Default MTI
            inflation: 0, // Default inflation
          })
          continue
        }

        // Find the model demand for this model if it exists
        const demand = report.modelDemand.find((d) => d.modelId === mod)

        // Set the data point with actual or zero demand
        dataMap.set(key, {
          date: dateStr,
          locationId: loc,
          modelId: mod,
          demand: demand?.demandUnits ?? 0, // Use 0 if no demand found
          mti: report.marketTrendIndex,
          inflation: report.inflationRate,
        })
      }
    }
  }

  // Convert the map to an array of data points
  const historicalData = Array.from(dataMap.values())

  // Sort by date, location, and model
  historicalData.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.locationId !== b.locationId)
      return a.locationId.localeCompare(b.locationId)
    return a.modelId.localeCompare(b.modelId)
  })

  // Debug: Log final data size
  console.log('Final data size:', {
    totalDataPoints: historicalData.length,
    uniqueDates: new Set(historicalData.map((d) => d.date)).size,
    uniqueLocations: new Set(historicalData.map((d) => d.locationId)).size,
    uniqueModels: new Set(historicalData.map((d) => d.modelId)).size,
    firstDate: historicalData[0]?.date,
    lastDate: historicalData[historicalData.length - 1]?.date,
  })

  // Extract analysis features
  const analysisFeatures = {
    seasonalDemand: {
      byModel: modelId
        ? { [modelId]: demandAnalysis.seasonalDemand.byModel[modelId] || {} }
        : demandAnalysis.seasonalDemand.byModel,
      byLocation: locationId
        ? {
            [locationId]:
              demandAnalysis.seasonalDemand.byLocation[locationId] || {},
          }
        : demandAnalysis.seasonalDemand.byLocation,
    },
    marketSensitivity: {
      byModel: modelId
        ? { [modelId]: demandAnalysis.marketSensitivity.byModel[modelId] || 0 }
        : demandAnalysis.marketSensitivity.byModel,
      byLocation: demandAnalysis.marketSensitivity.byLocation,
    },
    priceSensitivity: {
      byModel: modelId
        ? { [modelId]: demandAnalysis.priceSensitivity.byModel[modelId] || 0 }
        : demandAnalysis.priceSensitivity.byModel,
      byLocation: demandAnalysis.priceSensitivity.byLocation,
    },
  }

  // Only include MTI in futureRegressors since inflation is location-specific
  const futureRegressors = futureMTI ? { mti: futureMTI } : undefined

  return {
    historicalData,
    analysisFeatures,
    futurePeriods,
    futureRegressors,
    locationId,
    modelId,
  }
}
