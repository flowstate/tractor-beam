import { describe, it, expect } from 'vitest'
import { generateInflationRates } from '../inflation-rate'
import { generateMarketTrendForYears } from '../market-trend'
import Rand, { PRNG } from 'rand-seed'

describe('inflation rate generation', () => {
  const startDate = new Date('2024-01-01')

  it('generates location-consistent rates', () => {
    // Create new RNG for MTI
    const mtiRng = new Rand('fixed-test-seed', PRNG.xoshiro128ss)
    const mti = generateMarketTrendForYears(startDate, 3, mtiRng)

    const config = {
      baseRate: 0.02, // 2% base inflation
      mtiInfluence: 0.02, // ±2% max MTI influence
      locationVolatility: 0.01, // ±1% location variation
      lagDays: 30, // 1 month lag
    }

    // Create new RNG instances for each call
    const location1Rates = generateInflationRates(
      mti,
      'Seattle',
      config,
      new Rand('Seattle', PRNG.xoshiro128ss)
    )
    const location1RatesAgain = generateInflationRates(
      mti,
      'Seattle',
      config,
      new Rand('Seattle', PRNG.xoshiro128ss)
    )
    expect(location1Rates).toEqual(location1RatesAgain)

    const location2Rates = generateInflationRates(
      mti,
      'Miami',
      config,
      new Rand('Miami', PRNG.xoshiro128ss)
    )

    // Rates should differ more between locations
    expect(
      Math.abs(average(location1Rates) - average(location2Rates))
    ).toBeGreaterThan(
      Math.abs(average(location1Rates) - average(location1RatesAgain))
    )

    // Check rates stay within realistic bounds (0-10%)
    const allRates = [...location1Rates, ...location2Rates]
    expect(Math.min(...allRates)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...allRates)).toBeLessThanOrEqual(0.1)
  })

  it('responds to market trends with lag', () => {
    const mtiRng = new Rand('fixed-test-seed', PRNG.xoshiro128ss)
    const mti = generateMarketTrendForYears(new Date('2024-01-01'), 3, mtiRng)
    const config = {
      baseRate: 0.02,
      mtiInfluence: 0.04,
      locationVolatility: 0.01,
      lagDays: 30,
    }

    const rates = generateInflationRates(
      mti,
      'Chicago',
      config,
      new Rand('Chicago', PRNG.xoshiro128ss)
    )

    // When MTI goes up significantly, inflation should follow after lag
    const highMTIPeriods = mti
      .map((t, i) => ({ index: t.index, i }))
      .filter((t) => t.index > 0.7)

    if (highMTIPeriods.length > 0) {
      const laggedPeriods = highMTIPeriods.map((p) => p.i + config.lagDays)
      const laggedRates = laggedPeriods
        .map((i) => rates[i])
        .filter((r) => r !== undefined)

      // Average inflation during high MTI periods should be above base rate
      const avgHighRate =
        laggedRates.reduce((sum, r) => sum + r, 0) / laggedRates.length
      expect(avgHighRate).toBeGreaterThan(config.baseRate)
    }
  })
})

// Helper function
function average(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
}
