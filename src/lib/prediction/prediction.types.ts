import {
  type ComponentId,
  type LocationId,
  type SupplierId,
  type TractorModelId,
} from '../types/types'

// Common interfaces for all predictions
export interface PredictionRequestBase {
  futurePeriods: number // Number of days to predict
}

export interface ForecastPoint {
  date: string
  value: number
  lower: number
  upper: number
}

export interface PredictionResponseBase {
  forecast: ForecastPoint[]
  plot: string // Base64 encoded image
}

// ===== DEMAND PREDICTION =====

export interface DemandHistoricalDataPoint {
  date: string
  locationId: LocationId
  modelId: TractorModelId
  demand: number
  mti: number
  inflation: number
}

export interface DemandAnalysisFeatures {
  seasonalDemand: {
    byModel: Record<TractorModelId, Record<number, number>> // modelId -> quarter -> coefficient
    byLocation: Record<LocationId, Record<number, number>> // locationId -> quarter -> coefficient
  }
  marketSensitivity: {
    byModel: Record<TractorModelId, number> // modelId -> sensitivity coefficient
    byLocation: Record<LocationId, number> // locationId -> sensitivity coefficient
  }
  priceSensitivity: {
    byModel: Record<TractorModelId, number> // modelId -> sensitivity coefficient
    byLocation: Record<LocationId, number> // locationId -> sensitivity coefficient
  }
}

export interface DemandPredictionRequest extends PredictionRequestBase {
  historicalData: DemandHistoricalDataPoint[]
  analysisFeatures: DemandAnalysisFeatures
  futureRegressors?: {
    mti?: number[] // Array of future MTI values (global)
    inflation?: Record<LocationId, number[]> // Location-specific inflation projections
  }
  locationId?: LocationId
  modelId?: TractorModelId
}

export interface DemandPredictionResponse extends PredictionResponseBase {
  // The filters that were applied to generate this forecast
  locationId: LocationId
  modelId: TractorModelId
  // Additional metadata about the forecast
  metadata: {
    confidenceInterval: number // e.g., 0.95 for 95% confidence interval
    seasonalityStrength: number // 0-1 indicating how strong seasonal patterns are
    trendStrength: number // 0-1 indicating how strong the trend is
  }
  futureRegressors: {
    mti: number[]
    inflation: number[]
  }
  // Optional debug information
  debugInfo?: {
    dataPoints?: number
    dateRange?: {
      start: string
      end: string
    }
    regressorsUsed?: string[]
    futurePeriods?: number
    generatedRegressors?: string[]
  }
}

export interface ForecastSummary {
  next30DaysAvg: number
  next90DaysAvg: number
  peakDemand: number
  seasonalityStrength: number
  trendStrength: number
}

// Simple prediction storage schema
export interface SavedDemandForecast {
  id: string
  name: string
  createdAt: Date
  modelId: string
  locationId: string
  isDefault: boolean
  summary: ForecastSummary
  forecastData: ForecastPoint[]
  historicalData: DemandHistoricalDataPoint[]
  futureRegressors: {
    mti: number[]
    inflation: number[]
  }
}

// ===== INVENTORY RECOMMENDATION =====

export interface InventoryRecommendation {
  locationId: LocationId
  componentId: ComponentId
  recommendations: QuarterlyRecommendation[]
  supplierRecommendations: SupplierRecommendation[]
}

export interface QuarterlyRecommendation {
  quarter: number
  year: number
  recommendedBaseInventory: number
  safetyStock: number
  totalRecommended: number
  reasoning: string
}

export interface SupplierRecommendation {
  supplierId: SupplierId
  recommendedPercentage: number
  costImpact: number // Estimated cost impact compared to current allocation
  qualityImpact: number // Estimated quality impact (-1 to 1 scale)
  reliabilityImpact: number // Estimated reliability impact (-1 to 1 scale)
  reasoning: string
}

export interface InventoryRecommendationRequest {
  locationId: LocationId
  componentId: ComponentId
  demandForecastId: string // Reference to saved demand forecast
  currentInventoryLevel: number
  currentSupplierAllocation: Record<SupplierId, number> // supplierId -> percentage
}

// ===== PREDICTION SERVICE CLIENT =====

export interface PredictionServiceClient {
  predictDemand(
    request: DemandPredictionRequest
  ): Promise<DemandPredictionResponse>

  generateInventoryRecommendation(
    request: InventoryRecommendationRequest
  ): Promise<InventoryRecommendation>
}

// ===== INTERFACES =====

/**
 * Historical data point for supplier performance
 */
export interface SupplierPerformanceDataPoint {
  date: string
  supplierId: SupplierId
  qualityRating: number // 0-1 (percentage of non-defective parts)
  leadTimeReliability: number // 0-1 (percentage of on-time deliveries)
}

/**
 * Request to predict supplier performance
 */
export interface SupplierPerformancePredictionRequest {
  historicalData: SupplierPerformanceDataPoint[]
  futurePeriods: number // Number of days to predict
  supplierId: SupplierId
}

/**
 * Response from supplier performance prediction
 */
export interface SupplierPerformancePredictionResponse {
  supplierId: SupplierId
  qualityForecast: {
    date: string
    value: number
    lower: number
    upper: number
  }[]
  leadTimeForecast: {
    date: string
    value: number
    lower: number
    upper: number
  }[]
  metadata: {
    confidenceInterval: number
    seasonalityStrength: number
    trendStrength: number
  }
}

/**
 * Saved supplier performance forecast
 */
export interface SavedSupplierPerformanceForecast {
  id: string
  supplierId: SupplierId
  componentId: ComponentId
  createdAt: Date
  qualityForecast: {
    date: string
    value: number
    lower: number
    upper: number
  }[]
  leadTimeForecast: {
    date: string
    value: number
    lower: number
    upper: number
  }[]
  historicalData: SupplierPerformanceDataPoint[]
}
