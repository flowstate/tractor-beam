import type { LocationId, TractorModelId } from '../types/types'

/**
 * Raw quarterly demand data structure
 */
export interface QuarterlyDemandData {
  quarters: string[]
  historical: number[]
  forecast: number[]
  upperBound: number[]
  lowerBound: number[]
  seasonalPeaks: SeasonalPeak[]
  seasonalityStrength: number
  trendStrength: number
  rmse: number
}

/**
 * Seasonal peak information for annotations
 */
export interface SeasonalPeak {
  quarter: string
  value: number
  description: string
}

/**
 * Response structure for quarterly demand visualization
 */
export interface QuarterlyDemandResponse {
  quarters: string[]
  demandData: {
    historical: number[]
    forecast: number[]
    upperBound: number[]
    lowerBound: number[]
  }
  yoyGrowth: {
    year2OverYear1: number[]
    year3OverYear2: number[]
    forecastOverYear3: number[]
  }
  highlights: {
    keyPatterns: string[]
    predictionBasis: string[]
    businessImplications: string[]
  }
  seasonalPeaks: SeasonalPeak[]
  modelMetadata: {
    confidenceInterval: number
    seasonalityStrength: number
    trendStrength: number
    rmse: number
  }
}

/**
 * Structure for quarterly data point
 */
export interface QuarterlyDataPoint {
  year: number
  quarter: number
  demand: number
}

/**
 * Structure for quarterly forecast point
 */
export interface QuarterlyForecastPoint extends QuarterlyDataPoint {
  upperBound: number
  lowerBound: number
}

/**
 * Structure for aggregated quarterly data by location and model
 */
export interface AggregatedQuarterlyData {
  byLocation: Record<LocationId, QuarterlyDataPoint[]>
  byModel: Record<TractorModelId, QuarterlyDataPoint[]>
  overall: QuarterlyDataPoint[]
}

/**
 * Structure for forecast data by location and model
 */
export interface ForecastQuarterlyData {
  byLocation: Record<LocationId, QuarterlyForecastPoint[]>
  byModel: Record<TractorModelId, QuarterlyForecastPoint[]>
  overall: QuarterlyForecastPoint[]
}

/**
 * Database model interface matching the QuarterlyDemandOutlook schema
 */
export interface QuarterlyDemandOutlookModel {
  id: string
  createdAt: Date
  isDefault: boolean

  // Time points for x-axis
  quarters: string[]

  // Line chart data
  historicalDemand: number[]
  forecastDemand: number[]
  upperBound: number[]
  lowerBound: number[]

  // Bar chart data
  yoyGrowth: {
    year2OverYear1: number[]
    year3OverYear2: number[]
    forecastOverYear3: number[]
  }

  // Highlights data
  keyPatterns: string[]
  predictionBasis: string[]
  businessImplications: string[]

  // Metadata for annotations
  seasonalPeaks: SeasonalPeak[]

  // ML model metadata
  confidenceInterval: number
  seasonalityStrength: number
  trendStrength: number
  rmse: number
}

/**
 * Helper function to transform database model to response format
 */
export function dbModelToResponse(
  model: QuarterlyDemandOutlookModel
): QuarterlyDemandResponse {
  return {
    quarters: model.quarters,
    demandData: {
      historical: model.historicalDemand,
      forecast: model.forecastDemand,
      upperBound: model.upperBound,
      lowerBound: model.lowerBound,
    },
    yoyGrowth: model.yoyGrowth,
    highlights: {
      keyPatterns: model.keyPatterns,
      predictionBasis: model.predictionBasis,
      businessImplications: model.businessImplications,
    },
    seasonalPeaks: model.seasonalPeaks,
    modelMetadata: {
      confidenceInterval: model.confidenceInterval,
      seasonalityStrength: model.seasonalityStrength,
      trendStrength: model.trendStrength,
      rmse: model.rmse,
    },
  }
}

/**
 * Interface for model demand data at a specific location
 */
export interface ModelDemandData {
  historical: number[]
  forecast: number[]
  upperBound: number[]
  lowerBound: number[]
}

/**
 * Interface for location-specific model demand data
 */
export interface LocationModelDemand {
  timePoints: string[] // quarters
  modelPreferences: Record<TractorModelId, number>
  models: Record<TractorModelId, ModelDemandData>
}

/**
 * Interface for raw model demand data by location
 */
export interface RawModelDemandByLocation {
  locations: Record<
    LocationId,
    {
      modelDemandByQuarter: Record<string, Record<TractorModelId, number>> // quarter -> modelId -> demand
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
      > // quarter -> modelId -> forecast data
    }
  >
}

/**
 * Response structure for model demand by location visualization
 */
export interface ModelDemandByLocationResponse {
  locations: Record<LocationId, LocationModelDemand>
  highlights: {
    locationProfiles: Record<LocationId, string[]>
    modelTrends: Record<TractorModelId, string[]>
    businessInsights: string[]
  }
}

/**
 * Database model interface for ModelDemandByLocation
 */
export interface ModelDemandByLocationModel {
  id: string
  createdAt: Date
  isDefault: boolean

  // Structured data for each location
  locationData: Record<
    LocationId,
    {
      timePoints: string[]
      modelPreferences: Record<TractorModelId, number>
      models: Record<
        TractorModelId,
        {
          historical: number[]
          forecast: number[]
          upperBound: number[]
          lowerBound: number[]
        }
      >
    }
  >

  // Highlights and insights
  highlights: {
    locationProfiles: Record<LocationId, string[]>
    modelTrends: Record<TractorModelId, string[]>
    businessInsights: string[]
  }
}

/**
 * Helper function to transform database model to response format
 */
export function modelDemandDbToResponse(
  model: ModelDemandByLocationModel
): ModelDemandByLocationResponse {
  return {
    locations: model.locationData,
    highlights: model.highlights,
  }
}

export interface InventoryDataPoint {
  x: number // day
  y: number // inventory level
}

export interface InventorySimulationData {
  currentStrategy: {
    id: string
    data: InventoryDataPoint[]
    color: string
  }
  recommendedStrategy: {
    id: string
    data: InventoryDataPoint[]
    color: string
  }
}
