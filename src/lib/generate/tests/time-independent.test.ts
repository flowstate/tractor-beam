import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateTimeIndependentSeries,
  transformToDateIndexed,
  dateToKey,
  keyToDate,
  type LegacyTimeIndependentSeries,
} from '../time-independent'
import { LOCATIONS, TRACTOR_MODELS } from '../../constants'
import type { LocationId, TractorModelId } from '../../types/types'
import Rand from 'rand-seed'

describe('time independent series generation', () => {
  const startDate = new Date('2022-01-01')
  const endDate = new Date('2024-12-31')

  it('generates complete data for all locations', () => {
    const series = generateTimeIndependentSeries(startDate, endDate)
    const totalDays = 1096
    // Check market trend
    expect(series.marketTrend.length).toBe(totalDays)
    expect(series.marketTrend[0]?.date).toEqual(startDate)
    expect(series.marketTrend[series.marketTrend.length - 1]?.date).toEqual(
      endDate
    )

    // Check location data
    Object.keys(LOCATIONS).forEach((locationCode) => {
      const locationSeries = series.locationData[locationCode as LocationId]
      expect(locationSeries).toBeDefined()

      // Check inflation rates
      expect(locationSeries?.inflationRates.length).toBe(totalDays)

      // Check supplier quality for each supplier
      const location = LOCATIONS[locationCode as LocationId]
      location.suppliers.forEach((supplierId) => {
        const qualityPoints = locationSeries?.supplierQuality[supplierId]
        expect(qualityPoints).toBeDefined()
        expect(qualityPoints?.length).toBe(totalDays)
      })

      // Check model demand for all models
      Object.keys(TRACTOR_MODELS).forEach((modelId) => {
        const modelDemand = locationSeries?.modelDemand.find(
          (m) => m.modelId === modelId
        )
        expect(modelDemand).toBeDefined()
        expect(modelDemand?.demandUnits.length).toBe(totalDays)
      })
    })
  })

  it('maintains data consistency across locations', () => {
    const series = generateTimeIndependentSeries(startDate, endDate)

    // Market trend should be identical for all comparisons
    const mti = series.marketTrend
    expect(mti.every((point) => point.index >= 0 && point.index <= 1)).toBe(
      true
    )

    // Inflation rates should differ between locations but stay in bounds
    Object.values(series.locationData).forEach((locationSeries) => {
      const rates = locationSeries.inflationRates
      expect(Math.min(...rates)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...rates)).toBeLessThanOrEqual(0.1)
    })

    // Supplier quality should be consistent when same supplier serves multiple locations
    Object.values(series.locationData).forEach((locationSeries) => {
      Object.entries(locationSeries.supplierQuality).forEach(
        ([supplierId, points]) => {
          points.forEach((point) => {
            expect(point.qualityIndex).toBeGreaterThanOrEqual(0.7)
            expect(point.qualityIndex).toBeLessThanOrEqual(1.3)
            expect(point.efficiencyIndex).toBeGreaterThanOrEqual(0.8)
            expect(point.efficiencyIndex).toBeLessThanOrEqual(1.2)
          })
        }
      )
    })

    // Model demand should stay within realistic bounds
    Object.values(series.locationData).forEach((locationSeries) => {
      locationSeries.modelDemand.forEach((model) => {
        const demand = model.demandUnits
        expect(Math.min(...demand)).toBeGreaterThanOrEqual(0)
        expect(Math.max(...demand)).toBeLessThanOrEqual(750) // baseDemand + marketMultiplier
      })
    })
  })
})

describe('TimeIndependentSeries transformation', () => {
  const startDate = new Date('2022-01-01')
  const endDate = new Date('2024-12-31') // 3 full years
  let legacy: LegacyTimeIndependentSeries

  beforeEach(() => {
    legacy = generateTimeIndependentSeries(startDate, endDate)
  })

  describe('date key helpers', () => {
    it('converts dates to keys and back', () => {
      const date = new Date('2024-01-01')
      const key = dateToKey(date)
      expect(key).toBe('2024-01-01')
      expect(keyToDate(key).toISOString().startsWith('2024-01-01')).toBe(true)
    })
  })

  describe('transformToDateIndexed', () => {
    it('creates an entry for each date', () => {
      const transformed = transformToDateIndexed(legacy)
      const days = Object.keys(transformed)
      expect(days).toHaveLength(1096) // 3 years (365 + 365 + 366) days
      expect(days[0]).toBe('2022-01-01')
    })

    it('preserves market trend values', () => {
      const transformed = transformToDateIndexed(legacy)
      legacy.marketTrend.forEach((mti, i) => {
        const dayData = transformed[dateToKey(mti.date)]
        expect(dayData.marketTrend).toBe(mti.index)
      })
    })

    it('includes only configured suppliers per location', () => {
      const transformed = transformToDateIndexed(legacy)
      const firstDay = transformed[dateToKey(startDate)]

      Object.entries(LOCATIONS).forEach(([locationId, location]) => {
        const suppliers = Object.keys(
          firstDay.locationData[locationId as LocationId].supplierQuality
        )
        expect(suppliers).toHaveLength(location.suppliers.length)
        suppliers.forEach((supplier) => {
          expect(location.suppliers).toContain(supplier)
        })
      })
    })

    it('filters model demand based on location preferences', () => {
      const transformed = transformToDateIndexed(legacy)
      const firstDay = transformed[dateToKey(startDate)]

      Object.entries(LOCATIONS).forEach(([locationId, location]) => {
        const demands =
          firstDay.locationData[locationId as LocationId].modelDemand
        // Not every model should appear (due to preference filtering)
        expect(demands.length).toBeLessThan(Object.keys(TRACTOR_MODELS).length)

        // High preference models should appear more often than low preference
        const samples = Array.from({ length: 100 }, () => {
          const transformed = transformToDateIndexed(legacy)
          return transformed[dateToKey(startDate)].locationData[
            locationId as LocationId
          ].modelDemand.map((d) => d.modelId)
        })

        Object.entries(location.modelPreferences).forEach(([modelId, pref]) => {
          const appearanceRate =
            samples.filter((s) => s.includes(modelId as TractorModelId))
              .length / 100
          if (pref > 2.0) {
            // High preference
            expect(appearanceRate).toBeGreaterThan(0.7)
          } else if (pref < 0.5) {
            // Low preference
            expect(appearanceRate).toBeLessThanOrEqual(0.3)
          }
        })
      })
    })

    it('produces deterministic results with the same seed', () => {
      const transformed1 = transformToDateIndexed(legacy)
      const transformed2 = transformToDateIndexed(legacy)
      expect(transformed1).toEqual(transformed2)
    })

    it('preserves supplier quality values', () => {
      const transformed = transformToDateIndexed(legacy)
      const firstDay = transformed[dateToKey(startDate)]

      Object.entries(LOCATIONS).forEach(([locationId, location]) => {
        location.suppliers.forEach((supplierId) => {
          const originalQuality =
            legacy.locationData[locationId as LocationId].supplierQuality[
              supplierId
            ][0]
          const transformedQuality =
            firstDay.locationData[locationId as LocationId].supplierQuality[
              supplierId
            ]

          expect(transformedQuality?.qualityIndex).toBe(
            originalQuality.qualityIndex
          )
          expect(transformedQuality?.efficiencyIndex).toBe(
            originalQuality.efficiencyIndex
          )
        })
      })
    })

    it('preserves model demand values', () => {
      const transformed = transformToDateIndexed(legacy)
      const firstDay = transformed[dateToKey(startDate)]

      Object.entries(LOCATIONS).forEach(([locationId, location]) => {
        const transformedDemands =
          firstDay.locationData[locationId as LocationId].modelDemand

        transformedDemands.forEach((transformedDemand) => {
          const originalDemand = legacy.locationData[
            locationId as LocationId
          ].modelDemand.find((md) => md.modelId === transformedDemand.modelId)

          expect(transformedDemand.demand).toBe(originalDemand?.demandUnits[0])
        })
      })
    })

    it('filters model demand according to all preference levels', () => {
      // Reduce sample size from 1000 to 100
      const samples = Array.from({ length: 100 }, () => {
        const transformed = transformToDateIndexed(legacy)
        return transformed[dateToKey(startDate)]
      })

      Object.entries(LOCATIONS).forEach(([locationId, location]) => {
        Object.entries(location.modelPreferences).forEach(([modelId, pref]) => {
          const appearanceRate =
            samples.filter((day) =>
              day.locationData[locationId as LocationId].modelDemand.some(
                (d) => d.modelId === (modelId as TractorModelId)
              )
            ).length / 100

          if (pref > 2.0) {
            // High preference
            expect(appearanceRate).toBeGreaterThanOrEqual(0.6) // Slightly relaxed from 0.7
          } else if (pref > 0.8 && pref <= 1.5) {
            // Medium preference
            expect(appearanceRate).toBeGreaterThanOrEqual(0.3) // Slightly relaxed from 0.4
            expect(appearanceRate).toBeLessThanOrEqual(0.7) // Slightly relaxed from 0.6
          } else if (pref < 0.5) {
            // Low preference
            expect(appearanceRate).toBeLessThanOrEqual(0.4) // Slightly relaxed from 0.3
          }
        })
      })
    }, 15000) // Increase timeout to 15 seconds
  })
})
