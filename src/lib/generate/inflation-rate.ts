import type { MarketTrendPoint } from './market-trend'
import type Rand from 'rand-seed'

export interface LocationInflationConfig {
  baseRate: number // national baseline (like 0.02 for 2%)
  mtiInfluence: number // how much MTI affects rates (0-1)
  locationVolatility: number // how much locations can differ
  lagDays: number // how far behind MTI changes they react
}

export interface InflationPeriod {
  startDate: Date
  endDate: Date
  baseRate: number
  volatility: number
  seasonalAdjustment: number // Additional modifier for seasonal patterns
}

export function generateInflationPeriods(
  startDate: Date,
  endDate: Date,
  location: string,
  rng: Rand
): InflationPeriod[] {
  const periods: InflationPeriod[] = []
  let currentDate = new Date(startDate)

  // Define yearly seasonal patterns (Q1-Q4)
  const quarterlyPatterns = {
    0: 0.004, // Q1: Winter slowdown - INCREASED inflation (reduces demand)
    1: 0.001, // Q2: Spring - REDUCED inflation impact
    2: -0.003, // Q3: Summer/harvest - NEGATIVE inflation (boosts demand)
    3: 0.002, // Q4: Fall - moderate inflation
  }

  while (currentDate < endDate) {
    const quarter = Math.floor(currentDate.getMonth() / 3)
    const periodLength = 90 + Math.floor(rng.next() * 10) // ~quarterly
    const periodEnd = new Date(currentDate)
    periodEnd.setDate(periodEnd.getDate() + periodLength)

    // Smaller base rate variation
    const baseRate = 0.02 + (rng.next() - 0.5) * 0.005 // ±0.5% variation

    const seasonalBase =
      quarterlyPatterns[quarter as keyof typeof quarterlyPatterns]
    const randomVariation = (rng.next() - 0.5) * 0.001
    const seasonalAdjustment = seasonalBase + randomVariation

    periods.push({
      startDate: new Date(currentDate),
      endDate: new Date(Math.min(periodEnd.getTime(), endDate.getTime())),
      baseRate,
      volatility: 0.001 + rng.next() * 0.002, // 0.001-0.003
      seasonalAdjustment,
    })

    currentDate = new Date(periodEnd)
  }

  return periods
}

export function generateInflationRates(
  marketTrends: MarketTrendPoint[],
  location: string,
  config: LocationInflationConfig,
  rng: Rand
): number[] {
  const startDate = marketTrends[0]?.date
  const endDate = marketTrends[marketTrends.length - 1]?.date
  if (!startDate || !endDate) {
    throw new Error('No market trends provided')
  }
  const periods = generateInflationPeriods(startDate, endDate, location, rng)

  return marketTrends.map((trend, i) => {
    const date = trend.date
    const period = periods.find((p) => date >= p.startDate && date <= p.endDate)
    if (!period)
      throw new Error(
        `No inflation period found for date ${date.toDateString()}`
      )

    // Get lagged MTI influence
    const laggedIndex = Math.max(0, i - config.lagDays)
    const mtiEffect =
      (marketTrends[laggedIndex]?.index ?? 0 - 0.5) * config.mtiInfluence

    // Daily variation now uses RNG instead of sin
    const dailyVariation = (rng.next() - 0.5) * 2 * period.volatility

    return (
      period.baseRate + mtiEffect + dailyVariation + period.seasonalAdjustment
    )
  })
}
