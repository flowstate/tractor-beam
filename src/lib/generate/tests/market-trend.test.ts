import { describe, it, expect } from 'vitest'
import {
  generateMarketTrends,
  generateMarketTrendForYears,
} from '../market-trend'
import Rand, { PRNG } from 'rand-seed'

describe('market trend generation', () => {
  const rng = new Rand('fixed-test-seed', PRNG.xoshiro128ss)

  it('generates trends that follow baseline direction', () => {
    // Generate dates for the test
    const dates = Array.from({ length: 100 }, (_, i) => {
      const date = new Date('2024-01-01')
      date.setDate(date.getDate() + i)
      return date
    })

    const upTrends = generateMarketTrends(
      dates,
      {
        startDate: new Date('2024-01-01'),
        numberOfDays: 100,
        baselineTrend: 'up',
        volatility: 0.1,
        maxDailyChange: 0.15,
        momentum: 0.3,
      },
      rng
    )

    // Check if trend generally moves up over time
    const firstTenth =
      upTrends.slice(0, 10).reduce((sum, t) => sum + t.index, 0) / 10
    const lastTenth =
      upTrends.slice(-10).reduce((sum, t) => sum + t.index, 0) / 10
    expect(lastTenth).toBeGreaterThan(firstTenth)
  })

  it('generates three-year trend with reasonably smooth transitions between periods', () => {
    const trends = generateMarketTrendForYears(new Date('2024-01-01'), 3, rng)

    // Check for extreme jumps between days (anything more than maxDailyChange * 2)
    const discontinuities = trends.reduce((count, trend, i) => {
      if (i === 0) return count
      const prev = trends[i - 1]
      if (!prev) return count
      return count + (Math.abs(trend.index - prev.index) > 0.3 ? 1 : 0)
    }, 0)
    expect(discontinuities).toBe(0)
  })

  it('generates exactly 3 years of data with no duplicates or gaps', () => {
    const startDate = new Date('2022-01-01')
    const trends = generateMarketTrendForYears(startDate, 3, rng)

    // Expected number of days:
    // 2022: 365 days (not leap year)
    // 2023: 365 days (not leap year)
    // 2024: 366 days (leap year)
    // Total: 1096 days
    const expectedDays = 365 + 365 + 366

    // Check total count
    expect(trends.length).toBe(expectedDays)

    // Check first and last dates
    expect(trends[0].date.toISOString().split('T')[0]).toBe('2022-01-01')
    expect(trends[trends.length - 1].date.toISOString().split('T')[0]).toBe(
      '2024-12-31'
    )

    // Check for duplicates by converting to date strings and using Set
    const dateStrings = trends.map((t) => t.date.toISOString().split('T')[0])
    const uniqueDateStrings = new Set(dateStrings)
    expect(uniqueDateStrings.size).toBe(expectedDays)

    // Check for gaps by verifying each consecutive date differs by exactly one day
    for (let i = 1; i < trends.length; i++) {
      const currentDay = trends[i].date.getTime()
      const previousDay = trends[i - 1].date.getTime()
      const diffInDays = (currentDay - previousDay) / (1000 * 60 * 60 * 24)
      expect(diffInDays).toBe(1)
    }

    // Verify February 29, 2024 exists (leap day)
    const leapDayExists = dateStrings.includes('2024-02-29')
    expect(leapDayExists).toBe(true)

    // Verify problematic DST transition dates are present
    // US DST transitions in 2022-2024 (second Sunday in March, first Sunday in November)
    const dstDates = [
      '2022-03-13',
      '2022-11-06',
      '2023-03-12',
      '2023-11-05',
      '2024-03-10',
      '2024-11-03',
    ]

    for (const dstDate of dstDates) {
      expect(dateStrings.includes(dstDate)).toBe(true)
    }
  })

  it('generates market trend values between 0 and 1', () => {
    const trends = generateMarketTrendForYears(new Date('2022-01-01'), 3, rng)

    // Check that all index values are between 0 and 1
    for (const trend of trends) {
      expect(trend.index).toBeGreaterThanOrEqual(0)
      expect(trend.index).toBeLessThanOrEqual(1)
    }
  })

  it('generates market trend values within the constrained band (0.35-0.95)', () => {
    const trends = generateMarketTrendForYears(new Date('2022-01-01'), 3, rng)

    // Check that all index values are within our constrained band
    for (const trend of trends) {
      expect(trend.index).toBeGreaterThanOrEqual(0.35)
      expect(trend.index).toBeLessThanOrEqual(0.95)
    }
  })

  it('shows mean reversion tendencies', () => {
    const trends = generateMarketTrendForYears(new Date('2022-01-01'), 3, rng)

    // Count how many days are in different bands
    const lowBand = trends.filter((t) => t.index < 0.5).length
    const midBand = trends.filter(
      (t) => t.index >= 0.5 && t.index <= 0.8
    ).length
    const highBand = trends.filter((t) => t.index > 0.8).length

    const totalDays = trends.length

    // We expect a reasonable distribution across bands
    // with the middle band having the most days
    expect(midBand).toBeGreaterThan(lowBand)
    expect(midBand).toBeGreaterThan(highBand)

    // Ensure we spend at least some minimum time in each band
    // to verify we're not stuck in one region
    expect(lowBand / totalDays).toBeGreaterThan(0.08) // Adjusted to 8%
    expect(midBand / totalDays).toBeGreaterThan(0.4) // Middle should have most time
    expect(highBand / totalDays).toBeGreaterThan(0.08) // Adjusted to 8%

    console.log(
      `Distribution: Low: ${((lowBand / totalDays) * 100).toFixed(1)}%, Mid: ${((midBand / totalDays) * 100).toFixed(1)}%, High: ${((highBand / totalDays) * 100).toFixed(1)}%`
    )
  })

  it('avoids getting stuck at extreme values', () => {
    const trends = generateMarketTrendForYears(new Date('2022-01-01'), 3, rng)

    // Count consecutive days at extreme values
    let maxConsecutiveAtMin = 0
    let maxConsecutiveAtMax = 0
    let currentConsecutiveMin = 0
    let currentConsecutiveMax = 0

    for (const trend of trends) {
      // Check for values near min (0.35-0.37)
      if (trend.index <= 0.37) {
        currentConsecutiveMin++
        currentConsecutiveMax = 0
      }
      // Check for values near max (0.93-0.95)
      else if (trend.index >= 0.93) {
        currentConsecutiveMax++
        currentConsecutiveMin = 0
      } else {
        currentConsecutiveMin = 0
        currentConsecutiveMax = 0
      }

      maxConsecutiveAtMin = Math.max(maxConsecutiveAtMin, currentConsecutiveMin)
      maxConsecutiveAtMax = Math.max(maxConsecutiveAtMax, currentConsecutiveMax)
    }

    // We shouldn't have more than 10 consecutive days at extremes
    expect(maxConsecutiveAtMin).toBeLessThan(10)
    expect(maxConsecutiveAtMax).toBeLessThan(10)

    console.log(`Max consecutive days at min: ${maxConsecutiveAtMin}`)
    console.log(`Max consecutive days at max: ${maxConsecutiveAtMax}`)
  })

  it('shows appropriate volatility patterns', () => {
    const trends = generateMarketTrendForYears(new Date('2022-01-01'), 3, rng)

    // Calculate daily changes
    const dailyChanges = []
    for (let i = 1; i < trends.length; i++) {
      dailyChanges.push(Math.abs(trends[i].index - trends[i - 1].index))
    }

    // Calculate average daily change (volatility)
    const avgDailyChange =
      dailyChanges.reduce((sum, change) => sum + change, 0) /
      dailyChanges.length

    // Calculate standard deviation of changes
    const variance =
      dailyChanges.reduce(
        (sum, change) => sum + Math.pow(change - avgDailyChange, 2),
        0
      ) / dailyChanges.length
    const stdDev = Math.sqrt(variance)

    // Ensure we have reasonable volatility
    expect(avgDailyChange).toBeGreaterThan(0.001) // Some movement each day
    expect(avgDailyChange).toBeLessThan(0.03) // But not too extreme

    // Ensure we have some variation in volatility (volatility clustering)
    expect(stdDev).toBeGreaterThan(0.005)

    console.log(`Average daily change: ${avgDailyChange.toFixed(4)}`)
    console.log(`Standard deviation of changes: ${stdDev.toFixed(4)}`)
  })
})
