import {
  type ComponentId,
  type LocationId,
  type TractorModelId,
} from '../types/types'
import { TRACTOR_MODELS, SUPPLIERS, LOCATIONS } from '../constants'
import {
  type ForecastPoint,
  type QuarterlyRecommendation,
} from '../prediction/prediction.types'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Interfaces for component demand calculation
export interface ComponentDemand {
  componentId: ComponentId
  locationId: LocationId
  quarterlyDemand: QuarterlyDemand[]
}

export interface QuarterlyDemand {
  quarter: number
  year: number
  totalDemand: number
  safetyStock: number
  totalRequired: number
  modelContributions: ModelContribution[]
}

export interface ModelContribution {
  modelId: TractorModelId
  demand: number
}

// Interface for parsed forecast data
interface ParsedForecast {
  modelId: TractorModelId
  forecastData: ForecastPoint[]
}

// Safety stock configuration
const SAFETY_STOCK_FACTOR = 0.2 // 20% safety stock as a starting point

// Service level Z-score (95% service level)
const SERVICE_LEVEL_Z = 1.65

// Coefficient of variation (estimate of demand variability as a percentage of mean)
const DEMAND_VARIATION_COEFFICIENT = 0.3

/**
 * Calculate safety stock using statistical approach based on projected demand
 */
export function calculateSafetyStockFromForecast(
  forecastedDemand: number[],
  locationId: LocationId
): number {
  const averageLeadTime = calculateAverageLeadTime(locationId)

  // Calculate mean and standard deviation of forecasted demand
  const meanDemand = calculateMean(forecastedDemand)
  const stdDevDemand = calculateStdDev(forecastedDemand, meanDemand)

  // Calculate safety stock using the formula: Z × σ × √(Lead Time)
  const safetyStock =
    SERVICE_LEVEL_Z * stdDevDemand * Math.sqrt(averageLeadTime)

  return Math.ceil(safetyStock)
}

/**
 * Calculate average lead time for suppliers at a location
 */
function calculateAverageLeadTime(locationId: LocationId): number {
  // Get suppliers for this location
  const location = LOCATIONS[locationId]
  if (!location) {
    console.warn(`Location ${locationId} not found, using default lead time`)
    return 7 // Default to 7 days if location not found
  }

  // Calculate average lead time for suppliers at this location
  const supplierLeadTimes = location.suppliers.map(
    (supplierId) => SUPPLIERS[supplierId]?.baseLeadTime || 0
  )

  return supplierLeadTimes.length > 0
    ? supplierLeadTimes.reduce((sum, lt) => sum + lt, 0) /
        supplierLeadTimes.length
    : 7 // Default to 7 days if no suppliers found
}

/**
 * Calculate mean of a set of values
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, val) => sum + val, 0) / values.length
}

/**
 * Calculate standard deviation of a set of values
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length <= 1) return 0
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * Find models that use a specific component
 */
function findModelsUsingComponent(componentId: ComponentId): TractorModelId[] {
  const modelsUsingComponent = Object.entries(TRACTOR_MODELS)
    .filter(([_, model]) => model.components.includes(componentId))
    .map(([modelId]) => modelId as TractorModelId)

  if (modelsUsingComponent.length === 0) {
    throw new Error(`No models use component ${componentId}`)
  }

  return modelsUsingComponent
}

/**
 * Fetch demand forecasts for models at a location
 */
async function fetchDemandForecasts(
  locationId: LocationId,
  modelIds: TractorModelId[]
): Promise<Array<{ modelId: string; forecastData: unknown }>> {
  const demandForecasts = await prisma.demandForecast.findMany({
    where: {
      locationId,
      modelId: { in: modelIds },
      isDefault: true,
    },
    select: {
      modelId: true,
      forecastData: true,
    },
  })

  if (demandForecasts.length === 0) {
    throw new Error(
      `No demand forecasts found for location ${locationId} and models ${modelIds.join(', ')}`
    )
  }

  return demandForecasts
}

/**
 * Parse forecast data from database format
 */
function parseForecastData(
  demandForecasts: Array<{ modelId: string; forecastData: unknown }>
): ParsedForecast[] {
  return demandForecasts.map((forecast) => {
    try {
      // Check if forecastData is already an object or a string
      const forecastData =
        typeof forecast.forecastData === 'string'
          ? (JSON.parse(forecast.forecastData) as ForecastPoint[])
          : (forecast.forecastData as ForecastPoint[])

      return {
        modelId: forecast.modelId as TractorModelId,
        forecastData,
      }
    } catch (e) {
      console.error(
        `Error parsing forecast data for model ${forecast.modelId}:`,
        e
      )
      return {
        modelId: forecast.modelId as TractorModelId,
        forecastData: [],
      }
    }
  })
}

/**
 * Calculates component-level demand based on model demand forecasts
 */
export async function calculateComponentDemand(
  locationId: LocationId,
  componentId: ComponentId
): Promise<ComponentDemand> {
  // Find models using this component and fetch their forecasts
  const modelsUsingComponent = findModelsUsingComponent(componentId)
  const demandForecasts = await fetchDemandForecasts(
    locationId,
    modelsUsingComponent
  )

  // Parse the forecast data
  const parsedForecasts = parseForecastData(demandForecasts)

  // Process forecasts into quarterly demand
  const quarterlyDemand = processForecasts(parsedForecasts, locationId)

  return {
    componentId,
    locationId,
    quarterlyDemand,
  }
}

/**
 * Process demand forecasts into quarterly component demand
 */
function processForecasts(
  parsedForecasts: ParsedForecast[],
  locationId: LocationId
): QuarterlyDemand[] {
  // Map to store aggregated quarterly demand
  const quarterMap = new Map<string, QuarterlyDemand>()

  // Process each forecast
  parsedForecasts.forEach((forecast) => {
    const { modelId, forecastData } = forecast

    // Skip if no forecast data
    if (!forecastData || forecastData.length === 0) {
      console.warn(`No forecast data for model ${modelId}`)
      return
    }

    // Group forecast points by quarter
    forecastData.forEach((point) => {
      if (!point.date || typeof point.value !== 'number') {
        console.warn(`Invalid forecast point for model ${modelId}:`, point)
        return
      }

      const date = new Date(point.date)

      // Skip any data points from 2024 or earlier
      if (date.getFullYear() < 2025) {
        return
      }

      const quarter = Math.floor(date.getMonth() / 3) + 1
      const year = date.getFullYear()
      const quarterKey = `${year}-Q${quarter}`

      // Initialize quarter data if not exists
      if (!quarterMap.has(quarterKey)) {
        quarterMap.set(quarterKey, {
          quarter,
          year,
          totalDemand: 0,
          safetyStock: 0,
          totalRequired: 0,
          modelContributions: [],
        })
      }

      // Get current quarter data
      const quarterData = quarterMap.get(quarterKey)!

      updateModelContributions(quarterData, modelId, point.value)
    })
  })

  calculateQuarterlySafetyStock(quarterMap, parsedForecasts, locationId)

  // Convert map to sorted array (by date)
  return Array.from(quarterMap.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.quarter - b.quarter
  })
}

/**
 * Update model contributions for a demand period
 */
function updateModelContributions(
  periodData: QuarterlyDemand | DailyDemand,
  modelId: TractorModelId,
  value: number
): void {
  // Add this model's demand to the period
  const existingContribution = periodData.modelContributions.find(
    (c) => c.modelId === modelId
  )

  if (existingContribution) {
    existingContribution.demand += value
  } else {
    periodData.modelContributions.push({
      modelId,
      demand: value,
    })
  }

  // Update total demand with rounding
  periodData.totalDemand = Math.round(
    periodData.modelContributions.reduce(
      (sum, contribution) => sum + contribution.demand,
      0
    )
  )
}

/**
 * Calculate safety stock for each quarter
 */
function calculateQuarterlySafetyStock(
  quarterMap: Map<string, QuarterlyDemand>,
  parsedForecasts: ParsedForecast[],
  locationId: LocationId
): void {
  // Calculate safety stock for each quarter using the enhanced method with forecasted data
  for (const [quarterKey, quarterData] of quarterMap.entries()) {
    // Extract all daily demand values for this quarter to calculate variability
    const quarterlyDailyDemands: number[] = []

    // For each model and forecast point in this quarter
    parsedForecasts.forEach((forecast) => {
      forecast.forecastData.forEach((point) => {
        const date = new Date(point.date)
        const pointQuarter = Math.floor(date.getMonth() / 3) + 1
        const pointYear = date.getFullYear()
        const pointQuarterKey = `${pointYear}-Q${pointQuarter}`

        if (pointQuarterKey === quarterKey) {
          quarterlyDailyDemands.push(point.value)
        }
      })
    })

    // Use our new method with forecasted demand
    quarterData.safetyStock = Math.round(
      calculateSafetyStockFromForecast(quarterlyDailyDemands, locationId)
    )

    // Calculate total required inventory with rounding
    quarterData.totalRequired = Math.round(
      quarterData.totalDemand + quarterData.safetyStock
    )
  }
}

/**
 * Generates inventory recommendations based on component demand
 */
export function generateInventoryRecommendations(
  componentDemand: ComponentDemand
): QuarterlyRecommendation[] {
  return componentDemand.quarterlyDemand.map((qd) => {
    // Generate reasoning text
    const modelText = qd.modelContributions
      .map(
        (mc) =>
          `${mc.modelId}: ${mc.demand} units (${Math.round(
            (mc.demand / qd.totalDemand) * 100
          )}%)`
      )
      .join(', ')

    return {
      quarter: qd.quarter,
      year: qd.year,
      recommendedBaseInventory: Math.ceil(qd.totalDemand),
      safetyStock: qd.safetyStock,
      totalRecommended: qd.totalRequired,
      reasoning: `Based on forecasted demand from ${
        qd.modelContributions.length
      } models (${modelText}). Includes ${Math.round(
        SAFETY_STOCK_FACTOR * 100
      )}% safety stock to account for demand variability.`,
    }
  })
}

/**
 * Get all unique components used in any tractor model
 */
function getAllUniqueComponents(): Set<ComponentId> {
  const allComponents = new Set<ComponentId>()

  Object.values(TRACTOR_MODELS).forEach((model) => {
    model.components.forEach((component) => {
      allComponents.add(component as ComponentId)
    })
  })

  return allComponents
}

/**
 * Calculates component demand for all components at a location
 */
export async function calculateAllComponentDemand(
  locationId: LocationId
): Promise<Map<ComponentId, ComponentDemand>> {
  const allComponents = getAllUniqueComponents()
  const results = new Map<ComponentId, ComponentDemand>()

  for (const componentId of allComponents) {
    try {
      const demand = await calculateComponentDemand(locationId, componentId)
      results.set(componentId, demand)
    } catch (error) {
      console.error(`Error calculating demand for ${componentId}:`, error)
      // Continue with other components
    }
  }

  return results
}

/**
 * Calculates component demand for all locations and components
 */
export async function calculateAllLocationsComponentDemand(): Promise<
  Map<LocationId, Map<ComponentId, ComponentDemand>>
> {
  // Get all locations
  const locations = await prisma.location.findMany({
    select: { id: true },
  })

  // Calculate demand for each location
  const results = new Map<LocationId, Map<ComponentId, ComponentDemand>>()

  for (const location of locations) {
    try {
      const locationId = location.id as LocationId
      const componentDemands = await calculateAllComponentDemand(locationId)
      results.set(locationId, componentDemands)
    } catch (error) {
      console.error(
        `Error calculating demand for location ${location.id}:`,
        error
      )
      // Continue with other locations
    }
  }

  return results
}

/**
 * Simple test function to verify component demand calculation
 */
export async function testComponentDemand(): Promise<ComponentDemand> {
  try {
    // Test for a specific component and location
    const locationId = 'west' as LocationId
    const componentId = 'ENGINE-B' as ComponentId

    console.log(
      `Testing component demand for ${componentId} at ${locationId}...`
    )

    const demand = await calculateComponentDemand(locationId, componentId)

    console.log('Component demand result:')
    console.log(JSON.stringify(demand, null, 2))

    // Test safety stock calculation directly
    const testDemand = [100, 105, 95, 110, 100]
    const safetyStock = calculateSafetyStockFromForecast(testDemand, locationId)
    console.log(
      `Safety stock for demand of ${testDemand.join(', ')} at ${locationId}: ${safetyStock}`
    )

    return demand
  } catch (error) {
    console.error('Test failed:', error)
    throw error
  }
}

/**
 * Interface for daily component demand
 */
export interface DailyComponentDemand {
  componentId: ComponentId
  locationId: LocationId
  dailyDemand: DailyDemand[]
}

export interface DailyDemand {
  date: string
  totalDemand: number
  safetyStock: number
  totalRequired: number
  modelContributions: ModelContribution[]
}

/**
 * Calculates daily component-level demand based on model demand forecasts
 */
export async function calculateDailyComponentDemand(
  locationId: LocationId,
  componentId: ComponentId
): Promise<DailyComponentDemand> {
  // Find models using this component and fetch their forecasts
  const modelsUsingComponent = findModelsUsingComponent(componentId)
  const demandForecasts = await fetchDemandForecasts(
    locationId,
    modelsUsingComponent
  )

  // Parse the forecast data
  const parsedForecasts = parseForecastData(demandForecasts)

  // Process forecasts into daily demand
  const dailyDemand = processDailyForecasts(parsedForecasts, locationId)

  return {
    componentId,
    locationId,
    dailyDemand,
  }
}

/**
 * Process demand forecasts into daily component demand
 */
function processDailyForecasts(
  parsedForecasts: ParsedForecast[],
  locationId: LocationId
): DailyDemand[] {
  // Map to store aggregated daily demand
  const dayMap = new Map<string, DailyDemand>()

  // Process each forecast
  parsedForecasts.forEach((forecast) => {
    const { modelId, forecastData } = forecast

    // Skip if no forecast data
    if (!forecastData || forecastData.length === 0) {
      console.warn(`No forecast data for model ${modelId}`)
      return
    }

    // Group forecast points by day
    forecastData.forEach((point) => {
      if (!point.date || typeof point.value !== 'number') {
        console.warn(`Invalid forecast point for model ${modelId}:`, point)
        return
      }

      const date = point.date

      // Skip any data points from 2024 or earlier
      const year = new Date(date).getFullYear()
      if (year < 2025) {
        return
      }

      // Initialize day data if not exists
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date,
          totalDemand: 0,
          safetyStock: 0,
          totalRequired: 0,
          modelContributions: [],
        })
      }

      // Get current day data
      const dayData = dayMap.get(date)!

      updateModelContributions(dayData, modelId, point.value)
    })
  })

  calculateDailySafetyStock(dayMap, locationId)

  // Convert map to sorted array (by date)
  return Array.from(dayMap.values()).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })
}

/**
 * Calculate safety stock for each day
 */
function calculateDailySafetyStock(
  dayMap: Map<string, DailyDemand>,
  locationId: LocationId
): void {
  // Calculate safety stock for each day using the enhanced method
  for (const [_, dayData] of dayMap.entries()) {
    // Use our statistical method with rounding
    dayData.safetyStock = Math.round(
      calculateSafetyStockFromForecast(
        dayData.modelContributions.map((mc) => mc.demand),
        locationId
      )
    )

    // Calculate total required inventory with rounding
    dayData.totalRequired = Math.round(
      dayData.totalDemand + dayData.safetyStock
    )
  }
}

/**
 * Calculates daily component demand for all components at a location
 */
export async function calculateAllDailyComponentDemand(
  locationId: LocationId
): Promise<Map<ComponentId, DailyComponentDemand>> {
  const allComponents = getAllUniqueComponents()
  const results = new Map<ComponentId, DailyComponentDemand>()

  for (const componentId of allComponents) {
    try {
      const demand = await calculateDailyComponentDemand(
        locationId,
        componentId
      )
      results.set(componentId, demand)
    } catch (error) {
      console.error(`Error calculating daily demand for ${componentId}:`, error)
      // Continue with other components
    }
  }

  return results
}
