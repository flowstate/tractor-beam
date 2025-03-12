import type { MarketTrendPoint } from './market-trend'
import type { TractorModel, TractorModelId, LocationId } from '../types/types'
import Rand from 'rand-seed'
import {
  MIN_BASE_DEMAND,
  MAX_BASE_DEMAND,
  LOCATIONS,
  TRACTOR_MODELS,
} from '../constants'

interface ModelDemandConfig {
  marketMultiplier: number // Max additional units from perfect market
  inflationMultiplier: number // Max reduction from high inflation
  randomness: number // Daily random variation (0-1)
}

export function generateModelDemand(
  modelId: TractorModelId,
  locationId: LocationId,
  marketTrends: MarketTrendPoint[],
  inflationRates: number[],
  config: ModelDemandConfig,
  rng: Rand = new Rand('test-seed')
): number[] {
  if (marketTrends.length !== inflationRates.length) {
    throw new Error(
      'Market trends and inflation rates must cover the same time period'
    )
  }

  // Get the model from the modelId
  const model = TRACTOR_MODELS[modelId] ?? {
    marketSensitivity: 0.5, // Default values in case model is not found
    inflationSensitivity: 0.5,
  }

  // Get the location-model multiplier
  const locationMultiplier =
    LOCATIONS[locationId].modelPreferences[modelId] || 1.0

  // Calculate a base demand that scales with location preference
  // Higher preference = higher base demand and narrower band
  const preferenceScaledMin = MIN_BASE_DEMAND * Math.sqrt(locationMultiplier)
  const preferenceScaledMax = MAX_BASE_DEMAND * locationMultiplier

  // CHANGE: For very low preferences, widen the band significantly
  const isVeryLowPreference = locationMultiplier < 0.2
  const bandWidthFactor = isVeryLowPreference
    ? 2.0 // Much wider band for very low preferences (up from 1.5)
    : Math.min(1, 0.7 + 0.3 / (locationMultiplier + 0.5))

  const bandWidth =
    (preferenceScaledMax - preferenceScaledMin) * bandWidthFactor

  // Calculate base demand with a preference toward the higher end for high preferences
  // and toward the lower end for low preferences
  // CHANGE: For very low preferences, use a more centered position
  const basePosition = isVeryLowPreference
    ? 0.5
    : locationMultiplier < 1
      ? 0.3
      : 0.6
  const baseDemand =
    preferenceScaledMin +
    Math.floor((basePosition + (rng.next() - 0.5) * 0.6) * bandWidth)

  // NEW: Add year-over-year growth factor
  // Target annual growth rate (15-20%)
  const baseAnnualGrowthRate = 0.18 // 18% annual growth

  return marketTrends.map((trend, i) => {
    // Get the quarter (0-3) for this date
    const quarter = Math.floor(trend.date.getMonth() / 3)

    // NEW: Calculate years since start of data
    const yearsSinceStart =
      trend.date.getFullYear() - marketTrends[0].date.getFullYear()

    // NEW: Add randomness to growth rate (±20% of the base rate)
    const growthRateVariation = (rng.next() - 0.5) * 0.4 * baseAnnualGrowthRate
    const effectiveGrowthRate = baseAnnualGrowthRate + growthRateVariation

    // NEW: Calculate cumulative growth factor
    // Use compound growth: (1 + rate)^years
    const growthFactor = Math.pow(1 + effectiveGrowthRate, yearsSinceStart)

    // Define seasonal adjustments for agricultural equipment
    const seasonalFactors = {
      0: 0.9, // Q1: Winter - 10% reduction
      1: 1.05, // Q2: Spring - 5% increase
      2: 1.15, // Q3: Summer/harvest - 15% increase
      3: 0.95, // Q4: Fall - 5% reduction
    }

    const seasonalFactor =
      seasonalFactors[quarter as keyof typeof seasonalFactors]

    // Market impact: higher MTI = more demand
    // CHANGE: Amplify market impact even more for very low preference models
    const marketImpactFactor = isVeryLowPreference ? 0.6 : 0.4
    const marketImpact =
      (trend.index - 0.5) * // Center around 0.5
      (bandWidth * marketImpactFactor) * // Stronger impact for low preference
      model.marketSensitivity *
      (model.marketSensitivity > 0.6 ? 1.2 : 1.0)

    // Inflation impact: higher inflation = less demand
    // Scale impact based on model sensitivity and preference
    const normalizedInflation = inflationRates[i] - 0.02
    // CHANGE: Amplify inflation impact for very low preference models
    const inflationImpactFactor = isVeryLowPreference ? 0.4 : 0.25
    const inflationImpact =
      -Math.max(0, normalizedInflation) *
      (bandWidth * inflationImpactFactor) *
      model.inflationSensitivity *
      (model.inflationSensitivity > 0.5 ? 1.2 : 1.0)

    // Daily randomization - scale with band width
    // CHANGE: Increase randomness for very low preference models
    const randomFactor = isVeryLowPreference
      ? 0.25
      : locationMultiplier < 0.5
        ? 0.15
        : 0.1
    const randomVariation =
      (rng.next() - 0.5) * 2 * config.randomness * bandWidth * randomFactor

    // Calculate final demand
    // NEW: Apply growth factor to the base demand
    let demand =
      (baseDemand + marketImpact + inflationImpact + randomVariation) *
      seasonalFactor *
      growthFactor // Apply year-over-year growth

    // Ensure we stay within reasonable bounds
    // CHANGE: Increase minimum demand for very low preference models
    const minDemand =
      locationMultiplier < 0.2
        ? Math.max(8, preferenceScaledMin * 0.5) // Ensure at least 8 units for low preference
        : Math.max(5, preferenceScaledMin * 0.7)

    // For very high preferences, ensure demand stays high
    // NEW: Scale max demand with growth factor to allow for growth
    const maxDemand =
      preferenceScaledMax * 1.1 * Math.max(1, growthFactor * 0.9)

    demand = Math.max(minDemand, demand)
    demand = Math.min(maxDemand, demand)

    return Math.round(demand) // Round to whole units
  })
}
