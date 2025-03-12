import type { LocationId, SupplierId, TractorModelId } from '../types/types'
import { SUPPLIER_IDS } from '../types/types'
import type { MarketTrendPoint } from './market-trend'
import type { SupplierQualityPoint } from './supplier-quality'
import {
  LOCATIONS,
  SUPPLIERS,
  SUPPLIER_QUALITY_CONFIGS,
  TRACTOR_MODELS,
} from '../constants'
import { generateMarketTrendForYears } from './market-trend'
import { generateInflationRates } from './inflation-rate'
import { generateSupplierQuality } from './supplier-quality'
import { generateModelDemand } from './model-demand'
import Rand, { PRNG } from 'rand-seed'

export type TimeIndependentSeries = Record<string, DayData>

export interface ModelDemand {
  modelId: string
  demandUnits: number[]
}

export interface DailyModelDemand {
  modelId: TractorModelId
  demand: number
}

export interface DailySupplierQuality {
  qualityIndex: number
  efficiencyIndex: number
}

export interface DailyLocationData {
  inflationRate: number
  // Only include suppliers configured for this location
  supplierQuality: Partial<Record<SupplierId, DailySupplierQuality>>
  modelDemand: DailyModelDemand[]
}

export interface DayData {
  date: Date
  marketTrend: number
  locationData: Record<LocationId, DailyLocationData>
}

export interface LegacyLocationSeries {
  inflationRates: number[]
  supplierQuality: Record<SupplierId, SupplierQualityPoint[]>
  modelDemand: ModelDemand[]
}

export interface LegacyTimeIndependentSeries {
  marketTrend: MarketTrendPoint[]
  locationData: Record<LocationId, LegacyLocationSeries>
}

export function generateTimeIndependentSeries(
  startDate: Date,
  endDate: Date,
  config = {
    inflation: {
      baseRate: 0.02,
      mtiInfluence: 0.02,
      locationVolatility: 0.01,
      lagDays: 30,
    },
    demand: {
      marketMultiplier: 100,
      inflationMultiplier: 80,
      randomness: 0.1,
    },
  },
  seed = 'fixed-seed-for-tests'
): LegacyTimeIndependentSeries {
  const rng = new Rand(seed, PRNG.xoshiro128ss)

  // Generate and log market trend points
  const marketTrend = generateMarketTrendForYears(startDate, 3, rng)
  // console.log('\nLegacy TIS Generation:')
  // console.log(`Generated ${marketTrend.length} market trend points`)

  const locationData: Record<string, LegacyLocationSeries> = {}

  Object.entries(LOCATIONS).forEach(([code, location]) => {
    // console.log(`\nGenerating data for location ${code}:`)

    // Generate inflation rates
    const inflationRates = generateInflationRates(
      marketTrend,
      location.code,
      config.inflation,
      new Rand(`${seed}-${location.code}`, PRNG.xoshiro128ss)
    )
    // console.log(`Generated ${inflationRates.length} inflation rates`)

    // Initialize supplier quality
    const supplierQuality: Record<SupplierId, SupplierQualityPoint[]> = {
      Atlas: [],
      Bolt: [],
      Crank: [],
      Dynamo: [],
      Elite: [],
    }

    // Generate and log supplier quality
    // console.log('\nSupplier Quality Points:')
    location.suppliers.forEach((supplierId) => {
      const supplier = SUPPLIERS[supplierId]
      const qualityConfig = SUPPLIER_QUALITY_CONFIGS[supplierId]

      if (supplier && qualityConfig) {
        supplierQuality[supplierId] = generateSupplierQuality(
          startDate,
          endDate,
          supplier,
          qualityConfig,
          new Rand(`${seed}-${location.code}-${supplierId}`, PRNG.xoshiro128ss)
        )
        // console.log(
        //   `${supplierId}: ${supplierQuality[supplierId].length} points`
        // )
      }
    })

    // Generate and log model demand
    // console.log('\nModel Demand:')
    const modelDemand = Object.entries(TRACTOR_MODELS).map(
      ([modelId, model]) => {
        const demand = {
          modelId,
          demandUnits: generateModelDemand(
            modelId as TractorModelId,
            location.code,
            marketTrend,
            inflationRates,
            config.demand,
            new Rand(`${seed}-${location.code}-${modelId}`, PRNG.xoshiro128ss)
          ),
        }
        // console.log(`${modelId}: ${demand.demandUnits.length} points`)
        return demand
      }
    )

    locationData[code] = {
      inflationRates,
      supplierQuality,
      modelDemand,
    }
  })

  return {
    marketTrend,
    locationData,
  }
}

// Helper functions for date handling
export function dateToKey(date: Date): string {
  return date.toISOString().split('T')[0] // Returns YYYY-MM-DD
}

export function keyToDate(key: string): Date {
  return new Date(key)
}

export function transformToDateIndexed(
  legacy: LegacyTimeIndependentSeries
): TimeIndependentSeries {
  const transformed: TimeIndependentSeries = {}

  // Do transformation without duplicate checking
  legacy.marketTrend.forEach((mti, dayIndex) => {
    const dateKey = dateToKey(mti.date)

    transformed[dateKey] = {
      date: mti.date,
      marketTrend: mti.index,
      locationData: Object.fromEntries(
        Object.entries(legacy.locationData).map(
          ([locationId, locationData]) => {
            const location = LOCATIONS[locationId as LocationId]

            const dailyLocationData: DailyLocationData = {
              inflationRate: locationData.inflationRates[dayIndex],
              supplierQuality: Object.fromEntries(
                location.suppliers.map((supplierId) => [
                  supplierId,
                  locationData.supplierQuality[supplierId][dayIndex],
                ])
              ),
              modelDemand: locationData.modelDemand.map((md) => ({
                modelId: md.modelId as TractorModelId,
                demand: md.demandUnits[dayIndex],
              })),
            }

            return [locationId, dailyLocationData]
          }
        )
      ) as Record<LocationId, DailyLocationData>,
    }
  })

  return transformed
}

export function generateDateIndexedTIS(
  startDate: Date,
  endDate: Date,
  config = {
    inflation: {
      baseRate: 0.02,
      mtiInfluence: 0.02,
      locationVolatility: 0.01,
      lagDays: 30,
    },
    demand: {
      marketMultiplier: 100,
      inflationMultiplier: 80,
      randomness: 0.1,
    },
  },
  seed = 'fixed-seed-for-tests'
): TimeIndependentSeries {
  const legacy = generateTimeIndependentSeries(startDate, endDate, config, seed)
  return transformToDateIndexed(legacy)
}
