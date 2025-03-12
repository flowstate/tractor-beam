import { describe, it, expect } from 'vitest'
import { generateSupplierQuality } from '../supplier-quality'
import { SUPPLIERS, SUPPLIER_QUALITY_CONFIGS } from '../../constants'
import Rand, { PRNG } from 'rand-seed'

describe('generateSupplierQuality', () => {
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')
  const lastDataDate = new Date('2024-12-31')
  const rng = new Rand('fixed-test-seed', PRNG.xoshiro128ss)

  it('generates daily points for the entire date range', () => {
    const points = generateSupplierQuality(
      startDate,
      endDate,
      SUPPLIERS.Atlas,
      SUPPLIER_QUALITY_CONFIGS.Atlas,
      rng
    )
    const expectedDays = 366
    expect(points).toHaveLength(expectedDays)
    expect(points[0]?.date).toEqual(startDate)
    expect(points[points.length - 1]?.date).toEqual(lastDataDate)
  })

  it('keeps quality index within bounds', () => {
    const points = generateSupplierQuality(
      startDate,
      endDate,
      SUPPLIERS.Atlas,
      SUPPLIER_QUALITY_CONFIGS.Atlas,
      rng
    )
    points.forEach((point) => {
      expect(point.qualityIndex).toBeGreaterThanOrEqual(0.7)
      expect(point.qualityIndex).toBeLessThanOrEqual(1.3)
    })
  })

  it('keeps efficiency index within bounds', () => {
    const points = generateSupplierQuality(
      startDate,
      endDate,
      SUPPLIERS.Atlas,
      SUPPLIER_QUALITY_CONFIGS.Atlas,
      rng
    )
    points.forEach((point) => {
      expect(point.efficiencyIndex).toBeGreaterThanOrEqual(0.8)
      expect(point.efficiencyIndex).toBeLessThanOrEqual(1.2)
    })
  })

  it('shows seasonal patterns in efficiency', () => {
    const points = generateSupplierQuality(
      startDate,
      endDate,
      SUPPLIERS.Atlas,
      SUPPLIER_QUALITY_CONFIGS.Atlas,
      rng
    )

    const quarterlyAverages = [0, 1, 2, 3].map((quarter) => {
      const quarterPoints = points.filter(
        (p) => Math.floor(p.date.getMonth() / 3) === quarter
      )
      const sum = quarterPoints.reduce((acc, p) => acc + p.efficiencyIndex, 0)
      return sum / quarterPoints.length
    })

    expect(quarterlyAverages[1]).toBeGreaterThan(quarterlyAverages[0]) // Q2 > Q1
    expect(quarterlyAverages[2]).toBeLessThan(quarterlyAverages[3]) // Q3 < Q4
  })

  it('shows different volatility levels between suppliers', () => {
    const regularSupplier = generateSupplierQuality(
      startDate,
      endDate,
      SUPPLIERS.Dynamo,
      SUPPLIER_QUALITY_CONFIGS.Dynamo,
      new Rand('Dynamo', PRNG.xoshiro128ss)
    )
    const premiumSupplier = generateSupplierQuality(
      startDate,
      endDate,
      SUPPLIERS.Elite,
      SUPPLIER_QUALITY_CONFIGS.Elite,
      new Rand('Elite', PRNG.xoshiro128ss)
    )

    const getVolatility = (points: typeof regularSupplier) => {
      let changes = 0
      for (let i = 1; i < points.length; i++) {
        const current = points[i]
        const previous = points[i - 1]
        if (!current || !previous) continue // TypeScript now knows these exist
        changes += Math.abs(current.qualityIndex - previous.qualityIndex)
      }
      return changes / points.length
    }

    expect(getVolatility(regularSupplier)).toBeGreaterThan(
      getVolatility(premiumSupplier)
    )
  })
})
