import { type Component, type Supplier, type Location } from '@prisma/client'
import { type TractorModel as AppTractorModel } from './types'

// Raw data types
export interface RawHistoricalData {
  locationReports: LocationReportData[]
  deliveries: DeliveryData[]
  componentFailures: ComponentFailureData[]
  inventory: InventoryData[]
  suppliers: Supplier[]
  components: Component[]
  models: AppTractorModel[]
  locations: Location[]
}

export interface LocationReportData {
  id: string
  date: Date
  locationId: string
  marketTrendIndex: number
  inflationRate: number
  modelDemand: ModelDemandData[]
}

export interface ModelDemandData {
  id: string
  modelId: string
  demandUnits: number
}

export interface DeliveryData {
  id: string
  date: Date
  supplierId: string
  componentId: string
  locationId: string
  orderSize: number
  leadTimeVariance: number
  discount: number
}

export interface ComponentFailureData {
  id: string
  date: Date
  supplierId: string
  componentId: string
  locationId: string
  failureRate: number
}

export interface InventoryData {
  id: string
  date: Date
  supplierId: string
  componentId: string
  locationId: string
  quantity: number
}

// Grouped data types
export interface SupplierQuarterData {
  supplierId: string
  year: number
  quarter: number
  avgLeadTimeVariance: number
  normalizedLeadTimeVariance: number
  avgFailureRate: number
  normalizedFailureRate: number
  avgDiscount: number
  totalDeliveries: number
}

export interface LocationQuarterData {
  locationId: string
  year: number
  quarter: number
  avgMTI: number
  avgInflation: number
  modelDemand: Record<string, number> // modelId -> units
  totalDemand: number
}

export interface ComponentSupplierData {
  componentId: string
  supplierId: string
  avgFailureRate: number
  normalizedFailureRate: number
  avgLeadTimeVariance: number
  normalizedLeadTimeVariance: number
  avgDiscount: number
}

// Time features
export interface TimeFeatures {
  quarterlyAverages: {
    mti: Record<number, number> // quarter (1-4) -> avg MTI
    inflation: Record<number, number> // quarter (1-4) -> avg inflation
    demand: Record<number, number> // quarter (1-4) -> avg total demand
  }
  monthlyAverages: {
    mti: Record<number, number> // month (1-12) -> avg MTI
    inflation: Record<number, number> // month (1-12) -> avg inflation
    demand: Record<number, number> // month (1-12) -> avg total demand
  }
}

// Normalized metrics
export interface NormalizedMetrics {
  leadTimeVariance: Record<string, number[]> // supplierId -> normalized values
  failureRates: Record<string, Record<string, number[]>> // supplierId -> componentId -> normalized values
  demand: Record<string, Record<string, number[]>> // locationId -> modelId -> normalized values
}

// Complete historical data package
export interface HistoricalData {
  raw: RawHistoricalData
  bySupplierQuarter: SupplierQuarterData[]
  byLocationQuarter: LocationQuarterData[]
  byComponentSupplier: ComponentSupplierData[]
  timeFeatures: TimeFeatures
  normalized: NormalizedMetrics
  models: AppTractorModel[]
}

// Analysis result types
export interface SupplierPerformanceAnalysis {
  // Reliability metrics
  leadTimeVariance: {
    bySupplierId: Record<
      string,
      {
        overall: number
        byQuarter: Record<number, number> // quarter -> variance
        byLocation: Record<string, number> // locationId -> variance
      }
    >
    rankings: Array<{ supplierId: string; score: number }>
  }

  // Quality metrics
  failureRates: {
    bySupplierId: Record<
      string,
      {
        overall: number
        byComponent: Record<string, number> // componentId -> rate
        byQuarter: Record<number, number> // quarter -> rate
      }
    >
    byComponent: Record<
      string,
      {
        bySupplier: Record<string, number> // supplierId -> rate
      }
    >
    rankings: Array<{ supplierId: string; score: number }>
  }

  // Seasonal patterns
  seasonalPatterns: {
    seasonalIndices: Record<
      string,
      {
        // supplierId
        leadTime: Record<number, number> // quarter -> index
        failureRate: Record<number, number> // quarter -> index
        discount: Record<number, number> // quarter -> index
      }
    >
    seasonalSensitivity: Record<
      string,
      {
        // supplierId
        overall: number
        leadTime: number
        failureRate: number
        discount: number
        mtiLeadTimeCorrelation?: number
        mtiFailureRateCorrelation?: number
      }
    >
    rankings: Array<{ supplierId: string; score: number }>
  }

  // Location-specific performance
  locationPerformance: {
    byLocation: Record<
      string,
      {
        // locationId
        supplierMetrics: Record<
          string,
          {
            // supplierId
            leadTimeVariance: number
            failureRate: number
            reliability: number
          }
        >
        rankings: Array<{ supplierId: string; score: number }>
      }
    >
  }

  // Overall performance
  overallPerformance: {
    scores: Record<
      string,
      {
        // supplierId
        overall: number
        factors: {
          leadTimeReliability: number
          qualityConsistency: number
          seasonalResilience: number
          locationConsistency: number
        }
      }
    >
    rankings: Array<{ supplierId: string; score: number }>
    weightedFactors: {
      leadTimeReliability: number
      qualityConsistency: number
      seasonalResilience: number
      locationConsistency: number
    }
  }

  // Quality trends
  qualityTrends: {
    bySupplierId: Record<
      string,
      {
        direction: 'improving' | 'declining' | 'stable'
        magnitude: number // Rate of change
        consistency: number // How consistent the trend is (0-1)
        byQuarter: Record<
          string,
          {
            direction: 'improving' | 'declining' | 'stable'
            magnitude: number
          }
        >
        combinedQuality: Record<string, number> // Quarter -> combined quality index
        projection: {
          nextQuarter: string
          projectedQuality: number
          confidence: number
        }
        visualizationData: {
          timePoints: string[] // Quarter labels
          qualityValues: number[] // Quality ratings
          leadTimeValues: number[] // Lead time reliability
          combinedValues: number[] // Combined quality index
        }
      }
    >
    rankings: Array<{ supplierId: string; score: number }> // Ranked by improvement
  }
}

export interface DemandPatternAnalysis {
  // Seasonal coefficients
  seasonalDemand: {
    overall: Record<number, number> // quarter -> coefficient (1.0 = average)
    byLocation: Record<string, Record<number, number>> // locationId -> quarter -> coefficient
    byModel: Record<string, Record<number, number>> // modelId -> quarter -> coefficient
  }

  // Market sensitivity
  marketSensitivity: {
    byModel: Record<string, number> // modelId -> sensitivity coefficient
    byLocation: Record<string, number> // locationId -> sensitivity coefficient
  }

  // Price sensitivity
  priceSensitivity: {
    byModel: Record<string, number> // modelId -> sensitivity coefficient
    byLocation: Record<string, number> // locationId -> sensitivity coefficient
  }

  // Correlation matrices
  correlations: {
    mtiToDemand: Record<string, number> // modelId -> correlation coefficient
    inflationToDemand: Record<string, number> // modelId -> correlation coefficient
    mtiToInflation: number
  }
}

export interface ComponentRiskAnalysis {
  // Failure rate distributions
  failureRates: {
    byComponent: Record<
      string,
      {
        mean: number
        median: number
        stdDev: number
        bySupplier: Record<string, number> // supplierId -> rate
      }
    >
  }

  // Critical thresholds
  criticalThresholds: {
    byComponent: Record<
      string,
      {
        warningThreshold: number
        criticalThreshold: number
      }
    >
  }

  // Cost impact
  costImpact: {
    byComponent: Record<string, number> // componentId -> relative cost impact score
    rankings: Array<{ componentId: string; score: number }>
  }

  // Seasonal variations
  seasonalVariations: {
    byComponent: Record<string, Record<number, number>> // componentId -> quarter -> index
    bySupplierComponent: Record<string, Record<string, Record<number, number>>> // supplierId -> componentId -> quarter -> index
  }
}

export interface InventoryParameterAnalysis {
  // Optimal inventory levels
  optimalLevels: {
    byComponentLocation: Record<
      string,
      Record<
        string,
        {
          // componentId -> locationId
          base: number
          byQuarter: Record<number, number> // quarter -> adjustment factor
        }
      >
    >
  }

  // Reorder points
  reorderPoints: {
    byComponentLocation: Record<
      string,
      Record<
        string,
        {
          // componentId -> locationId
          base: number
          byQuarter: Record<number, number> // quarter -> adjustment factor
        }
      >
    >
  }

  // Safety stock
  safetyStock: {
    byComponentLocation: Record<
      string,
      Record<
        string,
        {
          // componentId -> locationId
          base: number
          bySupplier: Record<string, number> // supplierId -> adjustment factor
          byQuarter: Record<number, number> // quarter -> adjustment factor
        }
      >
    >
  }

  // Inflation adjustments
  inflationAdjustments: {
    thresholds: {
      low: number
      medium: number
      high: number
    }
    strategies: {
      low: string
      medium: string
      high: string
    }
  }

  // Supplier-specific adjustments
  supplierAdjustments: Record<
    string,
    {
      // supplierId
      byQuarter: Record<
        number,
        {
          // quarter
          orderSizeAdjustment: number
          timingAdjustment: number // days earlier/later
        }
      >
    }
  >
}

// Complete analysis results
export interface AnalysisResults {
  supplierPerformance: SupplierPerformanceAnalysis
  demandPatterns: DemandPatternAnalysis
  componentRisks: ComponentRiskAnalysis
  inventoryParameters: InventoryParameterAnalysis
}
