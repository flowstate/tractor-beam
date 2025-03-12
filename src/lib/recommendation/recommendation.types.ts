import type {
  LocationId,
  ComponentId,
  SupplierId,
  RecommendationImpactLevel,
  RecommendationUrgency,
  RecommendationPriority,
  RecommendationStatus,
} from '../types/types'

/**
 * Impact rating levels for recommendation factors
 */
export const IMPACT_RATINGS = ['low', 'medium', 'high'] as const

/**
 * Type for impact rating levels
 */
export type ImpactRating = (typeof IMPACT_RATINGS)[number]

// Interface for supplier allocation
export interface SupplierAllocation {
  supplierId: SupplierId
  componentId: ComponentId
  locationId: LocationId
  allocationPercentage: number
  qualityScore: number
  costScore: number
  totalScore: number
  pricePerUnit: number
  componentFailureRate: number
  allocationReason: 'quality' | 'cost' | 'diversity' | 'safety' | 'q2_cost'
  quarterlyQuantities?: {
    quarter: number
    year: number
    quantity: number
    cost?: number
  }[]
  totalCost?: number
}

/**
 * Enhanced supplier allocation with detailed reasoning
 */
export interface EnhancedSupplierAllocation extends SupplierAllocation {
  enhancedReasoning: EnhancedReasoning
  riskAdjustedSafetyStock?: number
}

/**
 * Overall allocation strategy for a component at a location
 */
export interface AllocationStrategy {
  componentId: ComponentId
  locationId: LocationId
  overallStrategy: string
  currentInventory: number
  demandForecast: {
    quarterlyDemand: Array<{
      quarter: number
      year: number
      totalDemand: number
      safetyStock: number
      totalRequired: number
      modelContributions: Array<{
        modelId: string
        demand: number
      }>
    }>
  }
  originalDemand: {
    quarterlyDemand: Array<{
      quarter: number
      year: number
      totalDemand: number
      safetyStock: number
      totalRequired: number
      modelContributions: Array<{
        modelId: string
        demand: number
      }>
    }>
  }
  supplierAllocations: SupplierAllocation[]
  quarterlyCosts?: Array<{
    quarter: number
    year: number
    totalCost: number
  }>
  totalCost?: number
  topLevelSuggestionPieces?: TopLevelSuggestionPieces
  allocationRationaleBlocks?: AllocationRationaleBlocks
  supplierComparisonBlocks?: SupplierComparisonBlocks
}

/**
 * Enhanced reasoning information for supplier allocations
 */
export interface EnhancedReasoning {
  summary: string
  keyFactors: {
    factor: string
    impact: ImpactRating
    description: string
  }[]
  comparisons: string[]
  detailedExplanation: string
}

/**
 * Structured recommendation template for better UI presentation
 */
export interface StructuredRecommendation {
  // Primary recommendation (what to do)
  primaryAction: string

  // Cost and inventory impact
  costImpact: {
    currentCost: number
    recommendedCost: number
    savings: number
    savingsPercentage: number
  }

  inventoryImpact: {
    currentInventory: number
    recommendedInventory: number
    delta: number
    deltaPercentage: number
  }

  // Supplier allocation breakdown
  supplierAllocations: {
    supplierId: SupplierId
    units: number
    percentage: number
    reasoning: string
  }[]

  // Rationale (why we're recommending this)
  rationale: {
    summary: string
    demandProjection: string
    allocationStrategy: string
    riskConsiderations: string
  }

  // Supporting evidence (data that backs up our recommendation)
  supportingEvidence: {
    demandTrends: {
      description: string
      data: {
        period: string
        value: number
        yearOverYearChange?: number
      }[]
    }
    supplierPerformance: {
      supplierId: SupplierId
      qualityScore: number
      leadTimeScore: number
      costScore: number
      seasonalResilience: number
      keyStrengths: string[]
      keyWeaknesses: string[]
    }[]
    riskAnalysis: {
      description: string
      riskFactors: {
        factor: string
        impact: 'high' | 'medium' | 'low'
        mitigation: string
      }[]
    }
  }

  // Todo list items (actionable tasks)
  todoItems: {
    action: string
    priority: 'critical' | 'important' | 'standard' | 'optional'
    dueDate?: string // ISO date string
  }[]
}

export interface QuarterlyHistoricalDemand {
  quarter: number
  year: number
  demand: number
}

/**
 * Enhanced allocation strategy with reasoning information
 */
export interface ReasonedAllocationStrategy extends AllocationStrategy {
  // Top-level recommendation
  topLevelRecommendation: string

  // Quantity reasoning
  quantityReasoning: {
    summary: string
    historicalDemand: QuarterlyHistoricalDemand[]
    yoyGrowthData?: {
      previousYear: number
      currentYear: number
      growthPercentage: number
      quarterlyGrowth?: {
        q1Growth: number
        q2Growth: number
      }
      fullYoYData?: {
        year2OverYear1: number[] // 2023 over 2022 (4 quarters)
        year3OverYear2: number[] // 2024 over 2023 (4 quarters)
        forecastOverYear3: number[] // 2025 over 2024 (2 quarters - Q1 and Q2)
      }
      // Add these properties for frontend consumption
      historicalGrowth2023?: number // Alias for average of year2OverYear1
      historicalGrowth2024?: number // Alias for average of year3OverYear2
      projectedGrowth?: number // Alias for growthPercentage
    }
    // Add these properties for frontend consumption
    recommendedPurchase?: number // Net purchase needed after inventory adjustment
    safetyFactors?: {
      baseFailureRate: number // Component base failure rate (%)
      supplierFailureRate: number // Supplier-specific failure rate (%)
      leadTimeBuffer: number // Lead time buffer in days
      demandVariability: number // Demand variability (%)
      safetyStockPercentage: number // Safety stock as percentage of base demand
    }
    // Add annual demand totals for easier visualization
    annualDemand?: {
      demand2022: number
      demand2023: number
      demand2024: number
      demand2025: number // Partial - Q1 and Q2 only
    }
  }

  // Supplier allocation reasoning
  allocationReasoning: {
    summary: string
    supplierReasonings: {
      supplierId: SupplierId
      summary: string
    }[]
  }

  // Risk considerations
  riskConsiderations: {
    summary: string
    factors: {
      factor: string
      impact: ImpactRating
      mitigation?: string
    }[]
  }
}

/**
 * Represents the overall recommended strategy for the company
 */
export type OverallRecommendedStrategy = Record<
  LocationId,
  Record<ComponentId, ReasonedAllocationStrategy>
>

/**
 * Represents the impact of a recommendation compared to the current strategy
 */
export interface RecommendationImpact {
  // Unit deltas (difference in inventory levels)
  unitDeltas: Record<LocationId, Record<ComponentId, number>>

  // Cost deltas (difference in total cost)
  costDeltas: Record<LocationId, Record<ComponentId, number>>

  // Risk deltas (difference in risk scores - positive means risk reduction)
  riskDeltas: Record<LocationId, Record<ComponentId, number>>

  // Prioritization scores (higher = more important)
  priorityScores: Record<LocationId, Record<ComponentId, number>>

  // New fields - actual values, not just deltas
  currentUnits: Record<LocationId, Record<ComponentId, number>>
  currentCosts: Record<LocationId, Record<ComponentId, number>>
  recommendedUnits: Record<LocationId, Record<ComponentId, number>>
  recommendedCosts: Record<LocationId, Record<ComponentId, number>>

  // Q1 specific data
  q1UnitDeltas: Record<LocationId, Record<ComponentId, number>>
  q1CostDeltas: Record<LocationId, Record<ComponentId, number>>
  q1CurrentUnits: Record<LocationId, Record<ComponentId, number>>
  q1CurrentCosts: Record<LocationId, Record<ComponentId, number>>
  q1RecommendedUnits: Record<LocationId, Record<ComponentId, number>>
  q1RecommendedCosts: Record<LocationId, Record<ComponentId, number>>

  // Q2 specific data
  q2UnitDeltas: Record<LocationId, Record<ComponentId, number>>
  q2CostDeltas: Record<LocationId, Record<ComponentId, number>>
  q2CurrentUnits: Record<LocationId, Record<ComponentId, number>>
  q2CurrentCosts: Record<LocationId, Record<ComponentId, number>>
  q2RecommendedUnits: Record<LocationId, Record<ComponentId, number>>
  q2RecommendedCosts: Record<LocationId, Record<ComponentId, number>>

  // New prioritization fields
  urgency: Record<LocationId, Record<ComponentId, RecommendationUrgency>>
  impact: Record<LocationId, Record<ComponentId, RecommendationImpactLevel>>
  priority: Record<LocationId, Record<ComponentId, RecommendationPriority>>
  opportunityScore: Record<LocationId, Record<ComponentId, number>> // Higher = better opportunity

  // Add structured recommendations
  structuredRecommendations: Record<
    LocationId,
    Record<ComponentId, StructuredRecommendation>
  >
}

// Add this interface near the top of the file
export interface RecommendationImpactData {
  unitDelta: number
  costDelta: number
  riskDelta: number
  currentUnits: number
  currentCost: number
  recommendedUnits: number
  recommendedCost: number
  q1UnitDelta: number
  q1CostDelta: number
  q1CurrentUnits: number
  q1CurrentCost: number
  q1RecommendedUnits: number
  q1RecommendedCost: number
  q2UnitDelta: number
  q2CostDelta: number
  q2CurrentUnits: number
  q2CurrentCost: number
  q2RecommendedUnits: number
  q2RecommendedCost: number
  status: RecommendationStatus
  priority: RecommendationPriority
  urgency: RecommendationUrgency
  impactLevel: RecommendationImpactLevel
  opportunityScore: number
}

/**
 * Represents the current inventory strategy derived from historical data
 */
export interface CurrentStrategy {
  // Current inventory levels by location and component
  currentInventory: Record<LocationId, Record<ComponentId, number>>

  // Current supplier allocation percentages (0-1)
  supplierAllocations: Record<
    LocationId,
    Record<ComponentId, Record<SupplierId, number>>
  >

  // Projected inventory needs for next two quarters
  projectedNeeds: Record<LocationId, Record<ComponentId, number>>

  // Projected costs under current allocation strategy
  projectedCosts: Record<LocationId, Record<ComponentId, number>>

  // NEW: Quarterly breakdown of projected needs
  quarterlyNeeds: Record<
    LocationId,
    Record<
      ComponentId,
      Array<{
        quarter: number
        year: number
        totalRequired: number
      }>
    >
  >

  // NEW: Quarterly breakdown of projected costs
  quarterlyCosts: Record<
    LocationId,
    Record<
      ComponentId,
      Array<{
        quarter: number
        year: number
        totalCost: number
      }>
    >
  >
}

export interface StrategyImpactCalculation {
  currentStrategy: CurrentStrategy
  recommendedStrategy: OverallRecommendedStrategy
  impact: {
    q1UnitDeltas: Record<LocationId, Record<ComponentId, number>>
    q1CostDeltas: Record<LocationId, Record<ComponentId, number>>
    q2UnitDeltas: Record<LocationId, Record<ComponentId, number>>
    q2CostDeltas: Record<LocationId, Record<ComponentId, number>>

    // Prioritization fields
    urgency: Record<LocationId, Record<ComponentId, RecommendationUrgency>>
    impact: Record<LocationId, Record<ComponentId, RecommendationImpactLevel>>
    priority: Record<LocationId, Record<ComponentId, RecommendationPriority>>
    opportunityScore: Record<LocationId, Record<ComponentId, number>>
  }
}

/**
 * Represents a quarterly version of a ReasonedAllocationStrategy
 * with specific quarter information and impact data
 */
export interface QuarterlyCard {
  // Basic identifiers
  locationId: LocationId
  componentId: ComponentId
  quarter: number
  year: number

  // Current strategy data
  currentUnits: number
  currentCost: number

  // Recommended strategy data
  recommendedUnits: number
  recommendedCost: number

  // Impact data
  unitDelta: number
  costDelta: number

  // Prioritization data
  urgency: RecommendationUrgency
  impactLevel: RecommendationImpactLevel
  priority: RecommendationPriority
  opportunityScore: number

  // Full strategy data
  strategy: ReasonedAllocationStrategy
}

/**
 * Collection of quarterly cards organized by location and component
 */
export type CardCollection = Record<
  LocationId,
  Record<ComponentId, QuarterlyCard[]>
>

// Add this new interface
export interface QuarterlyDisplayCard extends QuarterlyCard {
  list: 'recommendations' | 'shopping' | 'snoozed' | 'ignored'
}

/**
 * Building blocks for constructing the top-level recommendation
 */
export interface TopLevelSuggestionPieces {
  savingsAmount: number
  purchaseUnits: number
  componentName: string
  locationName: string
  quarter: number
  year: number
  supplierAllocations: Array<{
    supplierId: SupplierId
    units: number
    percentage: number
  }>
  singleSupplierCost?: number // Cost if using only the most expensive supplier
}

/**
 * Risk level for diversification benefit
 */
export type RiskReductionLevel =
  | 'minimal'
  | 'low'
  | 'moderate'
  | 'appreciable'
  | 'high'

/**
 * Building blocks for explaining the allocation rationale
 */
export interface AllocationRationaleBlocks {
  primaryReason: 'quality' | 'cost' | 'balance' | 'diversity'
  costSavings: number
  qualityImpact: {
    failureRateReduction: number
    reliabilityScore: number
  }
  riskReduction?: {
    diversificationBenefit: RiskReductionLevel
    singleSupplierRisk: string
  }
  seasonalFactors?: {
    relevantQuarter: number
    seasonalAdjustment: string
  }
}

/**
 * Building blocks for supplier comparison
 */
export interface SupplierComparisonBlocks {
  // Include data for all suppliers, not just min/max
  supplierMetrics: Array<{
    supplierId: SupplierId
    price: number
    qualityScore: number
    failureRate: number
    totalCostOfOwnership: number
    selected: boolean // Whether this supplier was selected in our allocation
  }>

  // Key tradeoffs that influenced the decision
  keyTradeoffs: Array<{
    description: string
    suppliers: string[]
    impact: string // Changed from number to string for more descriptive impact
  }>

  // Specific reasons for each supplier selection
  selectionReasons: Partial<
    Record<
      SupplierId,
      {
        primaryReason:
          | 'quality'
          | 'cost'
          | 'balance'
          | 'diversity'
          | 'safety'
          | 'q2_cost'
        comparedTo: SupplierId[] // Which suppliers this was compared against
        advantageDescription: string
        disadvantageDescription?: string
      }
    >
  >
}
