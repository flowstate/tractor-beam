import type { Supplier, SupplierQualityConfig } from '../types/types'
import type Rand from 'rand-seed'
import fs from 'fs'
import path from 'path'

export interface SupplierQualityPoint {
  date: Date
  // Core quality metric (0.7-1.3)
  // - Used directly for component failure rates
  // - Influences delivery time consistency
  // - Affects price variations (better quality = more stable pricing)
  qualityIndex: number

  // Manufacturing efficiency (0.8-1.2)
  // - Affects lead times (lower = longer to produce)
  // - Seasonal patterns (quarterly)
  // - Represents factory utilization, worker availability, etc.
  efficiencyIndex: number
}

export interface QualityPeriod {
  startDate: string // ISO string
  endDate: string // ISO string
  trend: 'up' | 'down' | 'stable'
  momentum: number
}

export interface SupplierQualityData {
  supplierId: string
  config: SupplierQualityConfig
  periods: QualityPeriod[]
  points: {
    date: string // ISO string format for JSON serialization
    qualityIndex: number
    efficiencyIndex: number
  }[]
}

// Global collection to store all generated quality data
const allSupplierQualityData: Record<string, SupplierQualityData> = {}

export function generateSupplierQuality(
  startDate: Date,
  endDate: Date,
  supplier: Supplier,
  config: SupplierQualityConfig,
  rng: Rand
): SupplierQualityPoint[] {
  // Calculate period length as before
  const totalDays =
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1
  const periodLength = Math.floor(totalDays / 6)

  // Get supplier story
  const supplierStory = getSupplierStory(supplier.id, rng)

  // Generate periods
  const periods: Array<{
    startDate: Date
    endDate: Date
    trend: 'up' | 'down' | 'stable'
    startQuality: number
    endQuality: number
  }> = []

  // Set different starting points for each supplier
  let currentQuality: number
  switch (supplier.id) {
    case 'Elite':
      currentQuality = 1.15 // Start high
      break
    case 'Crank':
      currentQuality = 1.0 // Start average
      break
    case 'Atlas':
      currentQuality = 0.95 // Start slightly below average
      break
    case 'Bolt':
      currentQuality = 0.9 // Start low
      break
    case 'Dynamo':
      currentQuality = 1.2 // Start high (new story - declining high-end supplier)
      break
    default:
      currentQuality = 1.0
  }

  // Pre-calculate target end qualities for each period
  for (let i = 0; i < 6; i++) {
    const periodStart = new Date(startDate)
    periodStart.setDate(startDate.getDate() + i * periodLength)

    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodStart.getDate() + periodLength - 1)

    // Ensure the last period doesn't exceed the endDate
    const actualEnd = i === 5 ? endDate : periodEnd

    // Calculate target end quality for this period
    let endQuality: number
    const trend = supplierStory[i].trend

    if (trend === 'stable') {
      // Stable periods maintain quality with very minimal drift
      endQuality = currentQuality + (rng.next() - 0.5) * 0.02
    } else if (trend === 'up') {
      // Make up periods more significant - increase by 0.08-0.18
      const maxIncrease = Math.min(0.18, (1.28 - currentQuality) * 0.7)
      endQuality = currentQuality + 0.08 + rng.next() * (maxIncrease - 0.08)
    } else {
      // Make down periods more significant - decrease by 0.08-0.18
      const maxDecrease = Math.min(0.18, (currentQuality - 0.72) * 0.7)
      endQuality = currentQuality - 0.08 - rng.next() * (maxDecrease - 0.08)
    }

    // Ensure within bounds
    endQuality = Math.max(0.7, Math.min(1.3, endQuality))

    periods.push({
      startDate: new Date(periodStart),
      endDate: new Date(actualEnd),
      trend,
      startQuality: currentQuality,
      endQuality,
    })

    // Set up for next period
    currentQuality = endQuality
  }

  // Generate daily points using linear interpolation with small random variations
  const points: SupplierQualityPoint[] = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    // Find the current period
    const period = periods.find(
      (p) => currentDate >= p.startDate && currentDate <= p.endDate
    )

    if (!period) throw new Error('No quality period found')

    // Calculate progress through this period (0 to 1)
    const totalPeriodDays =
      (period.endDate.getTime() - period.startDate.getTime()) /
      (1000 * 60 * 60 * 24)
    const daysPassed =
      (currentDate.getTime() - period.startDate.getTime()) /
      (1000 * 60 * 60 * 24)
    const rawProgress = daysPassed / totalPeriodDays

    // Use simple linear interpolation for all periods
    const progress = rawProgress

    // Add small daily noise to create more natural patterns
    const noiseAmount = period.trend === 'stable' ? 0.0005 : 0.001
    const noise = (rng.next() - 0.5) * noiseAmount * config.qualityVolatility

    const baseQuality =
      period.startQuality + (period.endQuality - period.startQuality) * progress

    const qualityIndex = Math.max(0.7, Math.min(1.3, baseQuality + noise))

    // For efficiency, directly derive from quality without separate interpolation
    const efficiencyIndex = Math.max(
      0.8,
      Math.min(
        1.2,
        // Scale quality to efficiency range and add supplier-specific bias
        0.8 +
          ((qualityIndex - 0.7) / 0.6) * 0.4 +
          // Supplier bias
          (supplier.id === 'Elite'
            ? 0.03
            : supplier.id === 'Crank'
              ? 0.01
              : supplier.id === 'Atlas'
                ? -0.02
                : supplier.id === 'Dynamo'
                  ? -0.03
                  : 0) +
          // Tiny random noise
          (rng.next() - 0.5) * 0.003
      )
    )

    points.push({
      date: new Date(currentDate),
      qualityIndex,
      efficiencyIndex,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Store data and return as before
  allSupplierQualityData[supplier.id] = {
    supplierId: supplier.id,
    config,
    periods: periods.map((period) => ({
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      trend: period.trend,
      momentum: config.qualityMomentum * (period.trend === 'stable' ? 0.5 : 1),
    })),
    points: points.map((point) => ({
      date: point.date.toISOString(),
      qualityIndex: point.qualityIndex,
      efficiencyIndex: point.efficiencyIndex,
    })),
  }

  return points
}

// Helper function to get supplier-specific stories
function getSupplierStory(
  supplierId: string,
  rng: Rand
): Array<{ trend: 'up' | 'down' | 'stable' }> {
  switch (supplierId) {
    case 'Elite':
      // Elite: Premium supplier that maintains high quality
      return [
        { trend: 'stable' }, // H1 2022: Already high quality (start at 1.15)
        { trend: 'up' }, // H2 2022: Minor improvement
        { trend: 'stable' }, // H1 2023: Maintaining high quality
        { trend: 'up' }, // H2 2023: Another improvement
        { trend: 'stable' }, // H1 2024: Maintaining high quality
        { trend: 'up' }, // H2 2024: Final improvement (end around 1.25-1.3)
      ]

    case 'Crank':
      // Crank: Solid mid-tier supplier with seasonal patterns
      return [
        { trend: 'up' }, // H1 2022: Good start (start at 1.0)
        { trend: 'down' }, // H2 2022: Seasonal decline
        { trend: 'up' }, // H1 2023: Recovery
        { trend: 'down' }, // H2 2023: Seasonal decline
        { trend: 'up' }, // H1 2024: Recovery
        { trend: 'down' }, // H2 2024: End on a downward trend (end around 1.0-1.05)
      ]

    case 'Atlas':
      // Atlas: Budget supplier with declining quality
      return [
        { trend: 'down' }, // H1 2022: Initial decline (start at 0.95)
        { trend: 'stable' }, // H2 2022: Temporary stabilization
        { trend: 'down' }, // H1 2023: Further issues
        { trend: 'stable' }, // H2 2023: Brief stabilization
        { trend: 'down' }, // H1 2024: More problems
        { trend: 'down' }, // H2 2024: Continued decline (end around 0.7-0.75)
      ]

    case 'Bolt':
      // Bolt: Initially poor performer that improves in year 3
      return [
        { trend: 'down' }, // H1 2022: Poor start (start at 0.9)
        { trend: 'down' }, // H2 2022: Further decline
        { trend: 'stable' }, // H1 2023: Stabilization at low quality
        { trend: 'stable' }, // H2 2023: Continued stabilization
        { trend: 'up' }, // H1 2024: Beginning of improvement
        { trend: 'up' }, // H2 2024: Strong improvement (end around 0.9-0.95)
      ]

    case 'Dynamo':
      // Dynamo: High-end supplier with declining quality (the counterpoint to Elite)
      return [
        { trend: 'stable' }, // H1 2022: Start high (start at 1.2)
        { trend: 'stable' }, // H2 2022: Maintaining high quality
        { trend: 'down' }, // H1 2023: Beginning of problems
        { trend: 'down' }, // H2 2023: Continued decline
        { trend: 'down' }, // H1 2024: More serious issues
        { trend: 'down' }, // H2 2024: Significant quality problems (end around 0.85-0.9)
      ]

    default:
      // Random trends as fallback
      return Array(6)
        .fill(null)
        .map(() => ({
          trend: rng.next() > 0.6 ? 'up' : rng.next() > 0.3 ? 'stable' : 'down',
        }))
  }
}

/**
 * Writes summarized supplier quality data to a JSON file
 * This provides a more concise and actionable view of the data
 */
export function writeSupplierQualityDataToFile(): void {
  try {
    const publicDir = path.join(process.cwd(), 'public/data')
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true })
    }
    // Also write the full data to a separate file if needed for deeper analysis
    const fullDataPath = path.join(publicDir, 'supplier-quality-full-data.json')
    fs.writeFileSync(
      fullDataPath,
      JSON.stringify(allSupplierQualityData, null, 2)
    )
  } catch (error) {
    console.error('Error writing supplier quality data to file:', error)
  }
}

export function clearSupplierQualityData(): void {
  // Clear the object by deleting all keys instead of reassigning
  Object.keys(allSupplierQualityData).forEach((key) => {
    delete allSupplierQualityData[key]
  })
}
