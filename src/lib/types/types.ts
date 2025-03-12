// Define the valid IDs as a const array
export const TRACTOR_MODEL_IDS = ['TX-100', 'TX-300', 'TX-500'] as const

// Derive the ID type from the array
export type TractorModelId = (typeof TRACTOR_MODEL_IDS)[number]

export interface TractorModel {
  id: TractorModelId
  components: string[] // List of component IDs this model requires
  marketSensitivity: number // How much market affects demand (0-1)
  inflationSensitivity: number // How much inflation affects demand (0-1)
}

// Define valid component IDs
export const COMPONENT_IDS = [
  'ENGINE-A',
  'ENGINE-B',
  'CHASSIS-BASIC',
  'CHASSIS-PREMIUM',
  'HYDRAULICS-SMALL',
  'HYDRAULICS-MEDIUM',
] as const

export type ComponentId = (typeof COMPONENT_IDS)[number]

// Update TractorComponent to use the ID type
export interface TractorComponent {
  id: ComponentId
  name: string
  baselineFailureRate: number
}

// Define valid supplier IDs
export const SUPPLIER_IDS = [
  'Atlas',
  'Bolt',
  'Crank',
  'Dynamo',
  'Elite',
] as const

export type SupplierId = (typeof SUPPLIER_IDS)[number]

// Update Supplier interface to use the ID type
export interface Supplier {
  id: SupplierId
  baseLeadTime: number
  components: {
    componentId: string
    pricePerUnit: number
  }[]
}

// Add supplier quality tiers
export const SUPPLIER_TIERS = ['premium', 'standard', 'budget'] as const
export type SupplierTier = (typeof SUPPLIER_TIERS)[number]

// Add supplier quality config interface
export interface SupplierQualityConfig {
  qualityVolatility: number
  seasonalStrength: number
  qualityMomentum: number
}

// Define valid location IDs
export const LOCATION_IDS = ['west', 'south', 'heartland'] as const
export type LocationId = (typeof LOCATION_IDS)[number]

// Model preference is now a demand multiplier (float)
export type ModelDemandMultiplier = number

// Location profile defines demand multipliers for each model
export type LocationModelPreferences = Record<
  TractorModelId,
  ModelDemandMultiplier
>

// Update Location interface
export interface Location {
  code: LocationId
  suppliers: SupplierId[]
  modelPreferences: LocationModelPreferences
}

// Add this to types.ts
export const RECOMMENDATION_STATUS = [
  'optimal',
  'opportunity',
  'high-impact',
] as const
export type RecommendationStatus = (typeof RECOMMENDATION_STATUS)[number]

// Add new recommendation urgency levels
export const RECOMMENDATION_URGENCY = [
  'immediate',
  'upcoming',
  'future',
] as const
export type RecommendationUrgency = (typeof RECOMMENDATION_URGENCY)[number]

// Add new recommendation impact levels
export const RECOMMENDATION_IMPACT_LEVEL = ['high', 'moderate', 'low'] as const
export type RecommendationImpactLevel =
  (typeof RECOMMENDATION_IMPACT_LEVEL)[number]

// Add combined priority type
export const RECOMMENDATION_PRIORITY = [
  'critical',
  'important',
  'standard',
  'optional',
] as const
export type RecommendationPriority = (typeof RECOMMENDATION_PRIORITY)[number]
