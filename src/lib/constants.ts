import type {
  TractorComponent,
  TractorModel,
  Supplier,
  Location,
  TractorModelId,
  SupplierId,
  SupplierQualityConfig,
  LocationId,
  ComponentId,
  LocationModelPreferences,
} from './types/types'

export const COMPONENTS: Record<ComponentId, TractorComponent> = {
  'ENGINE-A': {
    id: 'ENGINE-A',
    name: 'Basic Engine',
    baselineFailureRate: 0.03,
  },
  'ENGINE-B': {
    id: 'ENGINE-B',
    name: 'Standard Engine',
    baselineFailureRate: 0.025,
  },
  'CHASSIS-BASIC': {
    id: 'CHASSIS-BASIC',
    name: 'Basic Chassis',
    baselineFailureRate: 0.02,
  },
  'CHASSIS-PREMIUM': {
    id: 'CHASSIS-PREMIUM',
    name: 'Premium Chassis',
    baselineFailureRate: 0.015,
  },
  'HYDRAULICS-SMALL': {
    id: 'HYDRAULICS-SMALL',
    name: 'Small Hydraulics',
    baselineFailureRate: 0.04,
  },
  'HYDRAULICS-MEDIUM': {
    id: 'HYDRAULICS-MEDIUM',
    name: 'Medium Hydraulics',
    baselineFailureRate: 0.035,
  },
} as const

export const TRACTOR_MODELS: Record<TractorModelId, TractorModel> = {
  'TX-100': {
    id: 'TX-100',
    components: ['ENGINE-A', 'CHASSIS-BASIC', 'HYDRAULICS-SMALL'],
    marketSensitivity: 0.3, // How much market affects demand (0-1)
    inflationSensitivity: 0.7, // How much inflation affects demand (0-1)
  },
  'TX-300': {
    id: 'TX-300',
    components: ['ENGINE-B', 'CHASSIS-BASIC', 'HYDRAULICS-MEDIUM'],
    marketSensitivity: 0.6,
    inflationSensitivity: 0.4,
  },
  'TX-500': {
    id: 'TX-500',
    components: ['ENGINE-B', 'CHASSIS-PREMIUM', 'HYDRAULICS-MEDIUM'],
    marketSensitivity: 0.8,
    inflationSensitivity: 0.2, // High-end less affected by price
  },
} as const

export const SUPPLIERS: Record<SupplierId, Supplier> = {
  Elite: {
    // Premium: High price, short lead time, best quality
    id: 'Elite',
    baseLeadTime: 5, // Fastest
    components: [
      { componentId: 'ENGINE-A', pricePerUnit: 1100 },
      { componentId: 'ENGINE-B', pricePerUnit: 2300 },
      { componentId: 'CHASSIS-PREMIUM', pricePerUnit: 2500 },
      { componentId: 'HYDRAULICS-SMALL', pricePerUnit: 680 },
      { componentId: 'CHASSIS-BASIC', pricePerUnit: 950 },
    ],
  },
  Crank: {
    // Balanced: Medium price, medium lead time, good quality
    id: 'Crank',
    baseLeadTime: 7, // Average
    components: [
      { componentId: 'ENGINE-B', pricePerUnit: 2000 },
      { componentId: 'HYDRAULICS-MEDIUM', pricePerUnit: 1150 },
      { componentId: 'HYDRAULICS-SMALL', pricePerUnit: 600 },
      { componentId: 'CHASSIS-PREMIUM', pricePerUnit: 2300 },
    ],
  },
  Atlas: {
    // Budget: Low price, long lead time, declining quality
    id: 'Atlas',
    baseLeadTime: 8, // Slower
    components: [
      { componentId: 'ENGINE-A', pricePerUnit: 850 },
      { componentId: 'CHASSIS-BASIC', pricePerUnit: 680 },
      { componentId: 'HYDRAULICS-MEDIUM', pricePerUnit: 980 },
      { componentId: 'ENGINE-B', pricePerUnit: 1700 },
      { componentId: 'CHASSIS-PREMIUM', pricePerUnit: 2050 },
      { componentId: 'HYDRAULICS-SMALL', pricePerUnit: 550 },
    ],
  },
  Bolt: {
    // Volume: Low price initially but increasing as quality improves
    id: 'Bolt',
    baseLeadTime: 10, // Slowest
    components: [
      { componentId: 'ENGINE-A', pricePerUnit: 880 },
      { componentId: 'CHASSIS-BASIC', pricePerUnit: 700 },
      { componentId: 'CHASSIS-PREMIUM', pricePerUnit: 2100 },
      { componentId: 'HYDRAULICS-MEDIUM', pricePerUnit: 1000 },
      { componentId: 'ENGINE-B', pricePerUnit: 1900 },
    ],
  },
  Dynamo: {
    // Specialist: Declining quality but still charging premium prices
    id: 'Dynamo',
    baseLeadTime: 9, // Variable
    components: [
      { componentId: 'HYDRAULICS-SMALL', pricePerUnit: 620 },
      { componentId: 'HYDRAULICS-MEDIUM', pricePerUnit: 1200 },
      { componentId: 'CHASSIS-BASIC', pricePerUnit: 880 },
      { componentId: 'ENGINE-A', pricePerUnit: 1050 },
      { componentId: 'CHASSIS-PREMIUM', pricePerUnit: 2400 },
    ],
  },
} as const

export const LOCATIONS: Record<LocationId, Location> = {
  west: {
    code: 'west',

    suppliers: ['Atlas', 'Crank', 'Elite'],
    modelPreferences: {
      'TX-100': 0.15,
      'TX-300': 1.0,
      'TX-500': 3.0,
    },
  },
  south: {
    code: 'south',

    suppliers: ['Atlas', 'Bolt', 'Dynamo'],
    modelPreferences: {
      'TX-100': 2.0,
      'TX-300': 1.2,
      'TX-500': 0.15,
    },
  },
  heartland: {
    code: 'heartland',

    suppliers: ['Bolt', 'Crank', 'Elite'],
    modelPreferences: {
      'TX-100': 1.2, // Balanced market
      'TX-300': 1.0,
      'TX-500': 0.5,
    },
  },
} as const

export const SUPPLIER_QUALITY_CONFIGS: Record<
  SupplierId,
  SupplierQualityConfig
> = {
  Elite: {
    qualityVolatility: 0.1, // Low volatility - stable premium supplier
    seasonalStrength: 0.5, // Moderate seasonal effects
    qualityMomentum: 0.4, // Strong momentum - changes persist
  },
  Crank: {
    qualityVolatility: 0.2, // Medium volatility
    seasonalStrength: 0.8, // Strong seasonal effects
    qualityMomentum: 0.3, // Medium momentum
  },
  Atlas: {
    qualityVolatility: 0.25, // Higher volatility - budget supplier with less control
    seasonalStrength: 0.7, // Moderate-high seasonal effects
    qualityMomentum: 0.5, // High momentum - problems compound
  },
  Bolt: {
    qualityVolatility: 0.3, // High volatility - inconsistent quality
    seasonalStrength: 0.9, // Very seasonal - affected by workforce availability
    qualityMomentum: 0.2, // Low momentum - changes don't persist as much
  },
  Dynamo: {
    qualityVolatility: 0.4, // Very high volatility - most unpredictable
    seasonalStrength: 1.0, // Highest seasonal effects
    qualityMomentum: 0.6, // Highest momentum - dramatic swings
  },
} as const

export function getComponentFailureRate(componentId: ComponentId): number {
  const component = COMPONENTS[componentId]
  if (!component) {
    throw new Error(`Unknown component ID: ${componentId}`)
  }
  return component.baselineFailureRate
}

// Demand generation constants
export const MIN_BASE_DEMAND = 40 // Increased from 20
export const MAX_BASE_DEMAND = 150 // Decreased from 250
export const INVENTORY_START = 12000

// New function to calculate target inventory level for a component at a location
export function getTargetInventoryLevel(
  locationId: LocationId,
  componentId: ComponentId,
  daysOfInventory = 30 // Default to 30 days of inventory
): number {
  const location = LOCATIONS[locationId]

  // Find all models that use this component
  const modelsUsingComponent = Object.entries(TRACTOR_MODELS)
    .filter(([_, model]) => model.components.includes(componentId))
    .map(([id, _]) => id as TractorModelId)

  if (modelsUsingComponent.length === 0) {
    return 0 // Component not used in any model
  }

  // Calculate weighted demand based on model preferences
  let totalWeightedDemand = 0

  for (const modelId of modelsUsingComponent) {
    const preference = location.modelPreferences[modelId] || 0

    // Calculate base demand for this model
    // Increase the minimum scaling for low-preference models
    const preferenceScaledMin =
      MIN_BASE_DEMAND * Math.max(0.5, Math.sqrt(preference))
    const preferenceScaledMax = MAX_BASE_DEMAND * Math.max(0.2, preference)

    // Use a weighted average leaning toward max for high preferences
    // and toward min for low preferences, but ensure a minimum baseline
    const basePosition = preference < 0.2 ? 0.6 : preference < 1 ? 0.4 : 0.7
    const baseDemand =
      preferenceScaledMin +
      basePosition * (preferenceScaledMax - preferenceScaledMin)

    // Apply a safety factor - higher for both very low and high preference models
    const safetyFactor = preference < 0.2 ? 1.8 : preference < 1 ? 1.3 : 1.5

    // Add to total weighted demand
    totalWeightedDemand += baseDemand * safetyFactor
  }

  // Calculate target inventory level based on days of inventory needed
  // Increase days of inventory for safety
  const effectiveDaysOfInventory = daysOfInventory * 1.2
  const targetInventory = Math.ceil(
    totalWeightedDemand * effectiveDaysOfInventory
  )

  // Apply a higher minimum threshold to ensure we have enough inventory
  return Math.max(200, targetInventory)
}
