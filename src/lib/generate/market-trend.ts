import type Rand from 'rand-seed'
import { differenceInDays } from 'date-fns'
import { dateToKey } from './time-independent'
import { generateDatesForYears } from './date-generator'

export interface MarketTrendPoint {
  date: Date
  index: number
}

export type PeriodTrend = 'up' | 'down' | 'stable'

export interface MarketTrendConfig {
  startDate: Date
  numberOfDays: number
  baselineTrend: PeriodTrend
  volatility: number // 0-1, how much can it change day to day
  maxDailyChange: number // Max allowed delta between days (like 0.15)
  momentum: number // 0-1, how much previous changes influence next change
  startingIndex?: number
}

export interface MarketPeriod {
  startDate: Date
  endDate: Date
  baselineTrend: PeriodTrend
  volatility: number
  momentum: number
}

export function generateMarketPeriods(
  startDate: Date,
  endDate: Date,
  rng: Rand
): MarketPeriod[] {
  const periods: MarketPeriod[] = []
  let currentDate = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  )
  const targetEndDate = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    )
  )

  // Track the last index to influence trend probabilities
  let lastIndex = 0.65 // Start at middle of our desired range

  while (currentDate <= targetEndDate) {
    const daysRemaining =
      Math.floor(
        (targetEndDate.getTime() - currentDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
    const periodLength = Math.min(
      Math.floor(rng.next() * 60) + 60,
      daysRemaining
    )

    const periodEnd = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth(),
        currentDate.getUTCDate() + periodLength
      )
    )

    // Determine trend with mean reversion bias
    // Base probabilities: 35% up, 35% down, 30% stable
    let upProb = 0.35
    let downProb = 0.35

    // Apply mean reversion - adjust probabilities based on current index
    if (lastIndex > 0.8) {
      // High index - increase probability of down trend
      downProb += 0.25 * ((lastIndex - 0.8) / 0.15)
      upProb -= 0.25 * ((lastIndex - 0.8) / 0.15)
    } else if (lastIndex < 0.5) {
      // Low index - increase probability of up trend
      upProb += 0.25 * ((0.5 - lastIndex) / 0.15)
      downProb -= 0.25 * ((0.5 - lastIndex) / 0.15)
    }

    // Ensure probabilities are valid
    upProb = Math.max(0.1, Math.min(0.6, upProb))
    downProb = Math.max(0.1, Math.min(0.6, downProb))
    const stableProb = 1 - upProb - downProb

    // Determine trend based on adjusted probabilities
    const trendRoll = rng.next()
    const baselineTrend =
      trendRoll < upProb
        ? 'up'
        : trendRoll < upProb + downProb
          ? 'down'
          : 'stable'

    // Volatility: 0.02-0.08 base with multipliers
    const baseVolatility = rng.next() * 0.06 + 0.02
    const volatilityMultipliers = {
      up: 0.8,
      down: 1.5,
      stable: 0.7,
    }
    const volatility = baseVolatility * volatilityMultipliers[baselineTrend]

    // Momentum: 0.2-0.6 base with multipliers
    const baseMomentum = rng.next() * 0.4 + 0.2
    const momentumMultipliers = {
      up: 1.2,
      down: 1.2,
      stable: 0.7,
    }
    const momentum = baseMomentum * momentumMultipliers[baselineTrend]

    periods.push({
      startDate: new Date(currentDate),
      endDate: periodEnd,
      baselineTrend: baselineTrend as PeriodTrend,
      volatility,
      momentum,
    })

    // Update last index based on trend direction for next period
    const trendImpact = {
      up: 0.05,
      down: -0.05,
      stable: 0,
    }
    lastIndex = Math.max(
      0.35,
      Math.min(0.95, lastIndex + trendImpact[baselineTrend])
    )

    currentDate = new Date(periodEnd)
  }

  return periods
}

// Helper function to find which period a date belongs to
function findPeriodForDate(
  date: Date,
  periods: MarketPeriod[]
): MarketPeriod | null {
  for (const period of periods) {
    if (date >= period.startDate && date <= period.endDate) {
      return period
    }
  }
  return null
}

export function generateMarketTrends(
  dates: Date[],
  config: MarketTrendConfig,
  rng: Rand
): MarketTrendPoint[] {
  if (dates.length === 0) return []

  const trends: MarketTrendPoint[] = []
  let currentIndex = config.startingIndex ?? 0.65 // Start in middle of range
  let previousChange = 0

  // Define the constrained range
  const MIN_INDEX = 0.35
  const MAX_INDEX = 0.95
  const MEAN_INDEX = 0.65

  // Base trend changes - more balanced
  const trendChanges = {
    up: 0.002,
    down: -0.002,
    stable: 0,
  }

  for (const currentDate of dates) {
    // Calculate base change from trend
    const baseChange = trendChanges[config.baselineTrend]

    // Calculate random component with volatility
    // Increase volatility near boundaries to prevent stagnation
    let adjustedVolatility = config.volatility
    if (currentIndex > 0.85 || currentIndex < 0.45) {
      adjustedVolatility *= 2.0 // Significantly boost volatility near edges
    }
    const randomChange = (rng.next() - 0.5) * adjustedVolatility

    // Calculate momentum component with dampening near boundaries
    let momentumFactor = config.momentum
    if (currentIndex > 0.85 || currentIndex < 0.45) {
      momentumFactor *= 0.5 // Strongly reduce momentum near edges
    }
    const momentumChange = previousChange * momentumFactor

    // Calculate mean reversion force
    // Stronger as we move away from the mean
    const distanceFromMean = currentIndex - MEAN_INDEX
    const meanReversionStrength = 0.001 * Math.abs(distanceFromMean) * 10
    const meanReversionChange = -distanceFromMean * meanReversionStrength

    // Calculate boundary repulsion
    // Gets stronger as we approach boundaries
    let boundaryForce = 0
    if (currentIndex > 0.9) {
      boundaryForce = -0.006 * ((currentIndex - 0.9) / 0.05) * 5
    } else if (currentIndex < 0.4) {
      boundaryForce = 0.006 * ((0.4 - currentIndex) / 0.05) * 5
    }

    // Add extra escape velocity when very close to boundaries
    if (currentIndex > 0.93) {
      boundaryForce -= 0.005
    } else if (currentIndex < 0.37) {
      boundaryForce += 0.005
    }

    // Combine all forces
    let totalChange =
      baseChange +
      randomChange +
      momentumChange +
      meanReversionChange +
      boundaryForce

    // Apply maximum daily change limit
    totalChange = Math.max(
      -config.maxDailyChange,
      Math.min(config.maxDailyChange, totalChange)
    )

    // Update index with constraints
    currentIndex = Math.max(
      MIN_INDEX,
      Math.min(MAX_INDEX, currentIndex + totalChange)
    )
    previousChange = totalChange

    trends.push({
      date: new Date(currentDate),
      index: currentIndex,
    })
  }

  return trends
}

export function generateMarketTrendForYears(
  startDate: Date,
  numberOfYears: number,
  rng: Rand
): MarketTrendPoint[] {
  // Generate all dates first using our DST-safe date generator
  const allDates = generateDatesForYears(startDate, numberOfYears)

  // Create clean UTC date for period generation
  const cleanStart = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate()
    )
  )

  // Calculate end date
  const endDate = allDates[allDates.length - 1]

  // Generate market periods
  const periods = generateMarketPeriods(cleanStart, endDate, rng)

  // Generate trend points for each date based on its period
  let allTrends: MarketTrendPoint[] = []
  let lastIndex = 0.65 // Start in middle of range
  let lastPeriod: MarketPeriod | null = null
  let periodTrends: MarketTrendPoint[] = []
  let periodDates: Date[] = []

  // Group dates by period
  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i]
    const period = findPeriodForDate(date, periods)

    if (!period) {
      console.error(`No period found for date: ${date.toISOString()}`)
      continue
    }

    // If we've moved to a new period, process the previous period
    if (lastPeriod && period !== lastPeriod) {
      const config: MarketTrendConfig = {
        startDate: periodDates[0],
        numberOfDays: periodDates.length,
        baselineTrend: lastPeriod.baselineTrend,
        volatility: lastPeriod.volatility,
        maxDailyChange: 0.15,
        momentum: lastPeriod.momentum,
        startingIndex: lastIndex,
      }

      periodTrends = generateMarketTrends(periodDates, config, rng)

      if (periodTrends.length > 0) {
        lastIndex = periodTrends[periodTrends.length - 1].index
        allTrends = allTrends.concat(periodTrends)
      }

      // Reset for new period
      periodDates = []
    }

    periodDates.push(date)
    lastPeriod = period

    // Process the last period when we reach the end
    if (i === allDates.length - 1 && periodDates.length > 0) {
      const config: MarketTrendConfig = {
        startDate: periodDates[0],
        numberOfDays: periodDates.length,
        baselineTrend: period.baselineTrend,
        volatility: period.volatility,
        maxDailyChange: 0.15,
        momentum: period.momentum,
        startingIndex: lastIndex,
      }

      periodTrends = generateMarketTrends(periodDates, config, rng)

      if (periodTrends.length > 0) {
        allTrends = allTrends.concat(periodTrends)
      }
    }
  }

  // Verify we have the right number of points
  if (allTrends.length !== allDates.length) {
    console.warn(
      `Warning: Generated ${allTrends.length} points but expected ${allDates.length}`
    )
  }

  // Sort by date to ensure correct order
  return allTrends.sort((a, b) => a.date.getTime() - b.date.getTime())
}
