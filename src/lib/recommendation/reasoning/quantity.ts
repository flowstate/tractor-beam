import { PrismaClient } from '@prisma/client'
import {
  type AllocationStrategy,
  type ReasonedAllocationStrategy,
  type QuarterlyHistoricalDemand,
} from '../recommendation.types'
import { type ComponentId, type LocationId } from '../../types/types'
import { COMPONENTS } from '../../constants'
import { debugLog } from './reasoning-generator'
import { calculateComponentDemand } from '../component-demand'

const prisma = new PrismaClient()

/**
 * Generates reasoning for the quantity recommendation
 * @param strategy The allocation strategy
 * @returns Quantity reasoning object
 */
export async function generateQuantityReasoning(
  strategy: AllocationStrategy
): Promise<ReasonedAllocationStrategy['quantityReasoning']> {
  const {
    componentId,
    locationId,
    demandForecast,
    currentInventory,
    originalDemand,
  } = strategy

  // Log input data
  debugLog(
    {
      componentId,
      locationId,
      currentInventory,
      demandForecast: demandForecast.quarterlyDemand.map((q) => ({
        quarter: q.quarter,
        year: q.year,
        totalRequired: q.totalRequired,
        safetyStock: q.safetyStock,
      })),
      originalDemand: originalDemand.quarterlyDemand.map((q) => ({
        quarter: q.quarter,
        year: q.year,
        totalRequired: q.totalRequired,
        safetyStock: q.safetyStock,
      })),
    },
    'quantity_reasoning_input'
  )

  // Get component name for better readability
  const componentName = COMPONENTS[componentId]?.name ?? componentId

  // Get location name (capitalize first letter)
  const locationName = locationId.charAt(0).toUpperCase() + locationId.slice(1)

  // Extract Q1 and Q2 demand data
  const q1Data = demandForecast.quarterlyDemand[0]
  const q2Data = demandForecast.quarterlyDemand[1]

  // Extract original demand data (before inventory adjustment)
  const originalQ1Data = originalDemand.quarterlyDemand[0]

  // Fetch historical demand data - do this regardless of whether we have quarterly data
  const historicalDemand = await fetchHistoricalDemand(componentId, locationId)

  if (!q1Data || !q2Data || !originalQ1Data) {
    return {
      summary: `Quantity recommendation based on projected demand for ${componentName} at ${locationName}.`,
      historicalDemand,
    }
  }

  // Fetch YoY growth data - pass component and location IDs
  const yoyGrowthData = await fetchYoYGrowthData(componentId, locationId)

  // Log YoY growth data
  debugLog(yoyGrowthData, 'yoy_growth_data')

  // Generate summary
  const summary = generateQuantitySummary(
    componentName,
    locationName,
    q1Data,
    q2Data,
    originalQ1Data,
    currentInventory,
    yoyGrowthData
  )

  // Log the generated summary
  debugLog(summary, 'quantity_summary')

  // Calculate recommended purchase (for frontend consumption)
  const recommendedPurchase = Math.max(
    0,
    originalQ1Data.totalRequired - currentInventory
  )

  // Calculate safety factors (for frontend consumption)
  const safetyFactors = calculateSafetyFactors(
    componentId,
    locationId,
    originalQ1Data
  )

  // Group historical demand by year to calculate annual demand
  const demandByYearQuarter: Record<number, Record<number, number>> = {}
  for (const year of [2022, 2023, 2024, 2025]) {
    demandByYearQuarter[year] = {}
    for (const quarter of [1, 2, 3, 4]) {
      demandByYearQuarter[year][quarter] = 0
    }
  }

  historicalDemand.forEach((qd) => {
    demandByYearQuarter[qd.year][qd.quarter] = qd.demand
  })

  // Calculate annual demand totals
  const annualDemand = {
    demand2022: calculateAnnualDemand(demandByYearQuarter, 2022),
    demand2023: calculateAnnualDemand(demandByYearQuarter, 2023),
    demand2024: calculateAnnualDemand(demandByYearQuarter, 2024),
    demand2025: calculatePartialAnnualDemand(demandByYearQuarter, 2025),
  }

  // Log the complete quantity reasoning
  debugLog(
    {
      summary,
      yoyGrowthData,
      historicalDemand,
      recommendedPurchase,
      safetyFactors,
      annualDemand,
    },
    'quantity_reasoning_output'
  )

  return {
    summary,
    yoyGrowthData,
    historicalDemand,
    recommendedPurchase,
    safetyFactors,
    annualDemand,
  }
}

/**
 * Helper function to extract quarterly historical demand
 * This is a simplified version that creates synthetic historical data
 * based on the current demand with some variation
 */
async function fetchHistoricalDemand(
  componentId: ComponentId,
  locationId: LocationId
): Promise<QuarterlyHistoricalDemand[]> {
  debugLog('Fetching historical demand data', 'historical_demand_fetch_start')

  try {
    // Get component demand data for this specific component and location
    const componentDemand = await calculateComponentDemand(
      locationId,
      componentId
    )

    // Get the 2025 demand as a baseline
    const q1Demand2025 =
      componentDemand.quarterlyDemand.find(
        (qd) => qd.year === 2025 && qd.quarter === 1
      )?.totalDemand ?? 0

    const q2Demand2025 =
      componentDemand.quarterlyDemand.find(
        (qd) => qd.year === 2025 && qd.quarter === 2
      )?.totalDemand ?? 0

    // Create synthetic historical data based on the 2025 projections
    // with realistic growth patterns based on company-wide data
    const result: QuarterlyHistoricalDemand[] = []

    // Use the real company growth rates (with adjustment for component-specific)
    // Taking 10 percentage points off the forecast as requested
    const growthRates = {
      // Year-over-year growth rates by quarter
      q1: {
        '2023_over_2022': 17.36, // Q1 2023 over Q1 2022
        '2024_over_2023': 16.39, // Q1 2024 over Q1 2023
        '2025_over_2024': 17.05, // Q1 2025 over Q1 2024 (27.05 - 10)
      },
      q2: {
        '2023_over_2022': 27.15, // Q2 2023 over Q2 2022
        '2024_over_2023': 6.63, // Q2 2024 over Q2 2023
        '2025_over_2024': 21.01, // Q2 2025 over Q2 2024 (31.01 - 10)
      },
      q3: {
        '2023_over_2022': 22.89, // Q3 2023 over Q3 2022
        '2024_over_2023': 20.33, // Q3 2024 over Q3 2023
        '2025_over_2024': 12.43, // Q3 2025 over Q3 2024 (22.43 - 10)
      },
      q4: {
        '2023_over_2022': 21.6, // Q4 2023 over Q4 2022
        '2024_over_2023': 25.74, // Q4 2024 over Q4 2023
        '2025_over_2024': 22.4, // Q4 2025 over Q4 2024 (32.40 - 10)
      },
    }

    // Calculate backwards from 2025 to create historical data
    // For Q1
    const q1Demand2024 = Math.round(
      q1Demand2025 / (1 + growthRates.q1['2025_over_2024'] / 100)
    )
    const q1Demand2023 = Math.round(
      q1Demand2024 / (1 + growthRates.q1['2024_over_2023'] / 100)
    )
    const q1Demand2022 = Math.round(
      q1Demand2023 / (1 + growthRates.q1['2023_over_2022'] / 100)
    )

    // For Q2
    const q2Demand2024 = Math.round(
      q2Demand2025 / (1 + growthRates.q2['2025_over_2024'] / 100)
    )
    const q2Demand2023 = Math.round(
      q2Demand2024 / (1 + growthRates.q2['2024_over_2023'] / 100)
    )
    const q2Demand2022 = Math.round(
      q2Demand2023 / (1 + growthRates.q2['2023_over_2022'] / 100)
    )

    // For Q3 (estimate based on Q2 with seasonal adjustment)
    const q3Demand2024 = Math.round(q2Demand2024 * 1.15) // Q3 is typically 15% higher than Q2
    const q3Demand2023 = Math.round(
      q3Demand2024 / (1 + growthRates.q3['2024_over_2023'] / 100)
    )
    const q3Demand2022 = Math.round(
      q3Demand2023 / (1 + growthRates.q3['2023_over_2022'] / 100)
    )

    // For Q4 (estimate based on Q3 with seasonal adjustment)
    const q4Demand2024 = Math.round(q3Demand2024 * 0.85) // Q4 is typically 15% lower than Q3
    const q4Demand2023 = Math.round(
      q4Demand2024 / (1 + growthRates.q4['2024_over_2023'] / 100)
    )
    const q4Demand2022 = Math.round(
      q4Demand2023 / (1 + growthRates.q4['2023_over_2022'] / 100)
    )

    // Add 2022 data
    result.push(
      { year: 2022, quarter: 1, demand: q1Demand2022 },
      { year: 2022, quarter: 2, demand: q2Demand2022 },
      { year: 2022, quarter: 3, demand: q3Demand2022 },
      { year: 2022, quarter: 4, demand: q4Demand2022 }
    )

    // Add 2023 data
    result.push(
      { year: 2023, quarter: 1, demand: q1Demand2023 },
      { year: 2023, quarter: 2, demand: q2Demand2023 },
      { year: 2023, quarter: 3, demand: q3Demand2023 },
      { year: 2023, quarter: 4, demand: q4Demand2023 }
    )

    // Add 2024 data
    result.push(
      { year: 2024, quarter: 1, demand: q1Demand2024 },
      { year: 2024, quarter: 2, demand: q2Demand2024 },
      { year: 2024, quarter: 3, demand: q3Demand2024 },
      { year: 2024, quarter: 4, demand: q4Demand2024 }
    )

    // Add 2025 projected data
    result.push(
      { year: 2025, quarter: 1, demand: q1Demand2025 },
      { year: 2025, quarter: 2, demand: q2Demand2025 }
    )

    debugLog(result, 'synthetic_historical_demand_data')
    return result
  } catch (error) {
    console.error('Error generating synthetic historical demand:', error)
    debugLog(error, 'historical_demand_fetch_error')
    return []
  }
}

/**
 * Fetches Year-over-Year growth data for a component at a location
 * @returns YoY growth data object with quarterly breakdown
 */
async function fetchYoYGrowthData(
  componentId: ComponentId,
  locationId: LocationId
): Promise<ReasonedAllocationStrategy['quantityReasoning']['yoyGrowthData']> {
  debugLog('Fetching YoY growth data', 'yoy_growth_calculation_start')

  try {
    // Get historical demand data (which now includes synthetic historical data)
    const historicalDemand = await fetchHistoricalDemand(
      componentId,
      locationId
    )
    debugLog(historicalDemand, 'historical_demand_for_yoy')

    // Group by year and quarter
    const demandByYearQuarter: Record<number, Record<number, number>> = {}

    // Initialize years 2022-2025
    for (const year of [2022, 2023, 2024, 2025]) {
      demandByYearQuarter[year] = {}
      for (const quarter of [1, 2, 3, 4]) {
        demandByYearQuarter[year][quarter] = 0
      }
    }

    // Fill in the data
    historicalDemand.forEach((qd) => {
      demandByYearQuarter[qd.year][qd.quarter] = qd.demand
    })

    debugLog(demandByYearQuarter, 'demand_by_year_quarter')

    // Calculate YoY growth
    const year2OverYear1 = [1, 2, 3, 4].map((quarter) => {
      const y1Demand = demandByYearQuarter[2022][quarter]
      const y2Demand = demandByYearQuarter[2023][quarter]

      if (y1Demand === 0) return 0
      return ((y2Demand - y1Demand) / y1Demand) * 100
    })

    const year3OverYear2 = [1, 2, 3, 4].map((quarter) => {
      const y2Demand = demandByYearQuarter[2023][quarter]
      const y3Demand = demandByYearQuarter[2024][quarter]

      if (y2Demand === 0) return 0
      return ((y3Demand - y2Demand) / y2Demand) * 100
    })

    const forecastOverYear3 = [1, 2].map((quarter) => {
      const y3Demand = demandByYearQuarter[2024][quarter]
      const forecastDemand = demandByYearQuarter[2025][quarter]

      if (y3Demand === 0) return 0
      return ((forecastDemand - y3Demand) / y3Demand) * 100
    })

    // Calculate Q1 and Q2 specific growth rates for 2025
    const q1Growth = forecastOverYear3[0]
    const q2Growth = forecastOverYear3[1]

    // Calculate overall growth percentage (average of Q1 and Q2)
    const growthPercentage = (q1Growth + q2Growth) / 2

    // Calculate annual growth rates for frontend consumption
    const historicalGrowth2023 = calculateAverageGrowth(year2OverYear1)
    const historicalGrowth2024 = calculateAverageGrowth(year3OverYear2)
    const projectedGrowth = growthPercentage

    // Calculate annual demand totals
    const annualDemand = {
      demand2022: calculateAnnualDemand(demandByYearQuarter, 2022),
      demand2023: calculateAnnualDemand(demandByYearQuarter, 2023),
      demand2024: calculateAnnualDemand(demandByYearQuarter, 2024),
      demand2025: calculatePartialAnnualDemand(demandByYearQuarter, 2025),
    }

    const yoyGrowthData = {
      previousYear: 2024,
      currentYear: 2025,
      growthPercentage,
      quarterlyGrowth: {
        q1Growth,
        q2Growth,
      },
      // Add frontend-friendly aliases
      historicalGrowth2023,
      historicalGrowth2024,
      projectedGrowth,
      fullYoYData: {
        year2OverYear1,
        year3OverYear2,
        forecastOverYear3,
      },
    }

    debugLog(yoyGrowthData, 'calculated_yoy_growth_data')
    return yoyGrowthData
  } catch (error) {
    console.error('Error calculating YoY growth data:', error)
    debugLog(error, 'yoy_growth_calculation_error')

    // Return fallback data in case of error
    return {
      previousYear: 2024,
      currentYear: 2025,
      growthPercentage: 0,
      quarterlyGrowth: {
        q1Growth: 0,
        q2Growth: 0,
      },
      // Add frontend-friendly aliases
      historicalGrowth2023: 0,
      historicalGrowth2024: 0,
      projectedGrowth: 0,
      fullYoYData: {
        year2OverYear1: [0, 0, 0, 0],
        year3OverYear2: [0, 0, 0, 0],
        forecastOverYear3: [0, 0],
      },
    }
  }
}

/**
 * Helper function to calculate average growth across quarters
 */
function calculateAverageGrowth(quarterlyGrowth: number[]): number {
  if (quarterlyGrowth.length === 0) return 0
  return (
    quarterlyGrowth.reduce((sum, growth) => sum + growth, 0) /
    quarterlyGrowth.length
  )
}

/**
 * Helper function to calculate total annual demand
 */
function calculateAnnualDemand(
  demandByYearQuarter: Record<number, Record<number, number>>,
  year: number
): number {
  return Object.values(demandByYearQuarter[year]).reduce(
    (sum, demand) => sum + demand,
    0
  )
}

/**
 * Helper function to calculate partial annual demand (for 2025 where we only have Q1-Q2)
 */
function calculatePartialAnnualDemand(
  demandByYearQuarter: Record<number, Record<number, number>>,
  year: number
): number {
  return demandByYearQuarter[year][1] + demandByYearQuarter[year][2]
}

/**
 * Calculate safety factors for frontend consumption
 */
function calculateSafetyFactors(
  componentId: ComponentId,
  locationId: LocationId,
  q1Data: AllocationStrategy['demandForecast']['quarterlyDemand'][0]
): {
  baseFailureRate: number
  supplierFailureRate: number
  leadTimeBuffer: number
  demandVariability: number
  safetyStockPercentage: number
} {
  // These could be retrieved from a database or calculated based on component/location
  // For now, using reasonable defaults that match what the frontend expects
  const baseFailureRate = 2.5 // 2.5%
  const supplierFailureRate = 1.0 // 1%
  const leadTimeBuffer = 3 // 3 days
  const demandVariability = 5.0 // 5%

  // Calculate safety stock percentage
  const safetyStockPercentage =
    q1Data.totalDemand > 0 ? (q1Data.safetyStock / q1Data.totalDemand) * 100 : 0

  return {
    baseFailureRate,
    supplierFailureRate,
    leadTimeBuffer,
    demandVariability,
    safetyStockPercentage,
  }
}

/**
 * Generates a summary of the quantity recommendation with quarterly growth context
 */
function generateQuantitySummary(
  componentName: string,
  locationName: string,
  q1Data: AllocationStrategy['demandForecast']['quarterlyDemand'][0],
  q2Data: AllocationStrategy['demandForecast']['quarterlyDemand'][0],
  originalQ1Data: AllocationStrategy['originalDemand']['quarterlyDemand'][0],
  currentInventory: number,
  yoyGrowthData: ReasonedAllocationStrategy['quantityReasoning']['yoyGrowthData']
): string {
  // Get quarterly growth data
  const q1Growth = yoyGrowthData?.quarterlyGrowth?.q1Growth ?? 0
  const q2Growth = yoyGrowthData?.quarterlyGrowth?.q2Growth ?? 0

  // Format growth text with quarterly specificity
  let growthText = ''
  if (q1Growth !== 0 || q2Growth !== 0) {
    if (q1Growth > 0 && q2Growth > 0) {
      growthText = `projected growth of ${q1Growth.toFixed(1)}% in Q1 and ${q2Growth.toFixed(1)}% in Q2 compared to 2024`
    } else if (q1Growth < 0 && q2Growth < 0) {
      growthText = `projected decline of ${Math.abs(q1Growth).toFixed(1)}% in Q1 and ${Math.abs(q2Growth).toFixed(1)}% in Q2 compared to 2024`
    } else {
      // Mixed growth/decline
      const q1Direction =
        q1Growth > 0
          ? `growth of ${q1Growth.toFixed(1)}%`
          : `decline of ${Math.abs(q1Growth).toFixed(1)}%`
      const q2Direction =
        q2Growth > 0
          ? `growth of ${q2Growth.toFixed(1)}%`
          : `decline of ${Math.abs(q2Growth).toFixed(1)}%`
      growthText = `${q1Direction} in Q1 and ${q2Direction} in Q2 compared to 2024`
    }
  } else {
    growthText = 'stable demand compared to 2024'
  }

  // Check if current inventory covers Q1 demand
  if (q1Data.totalRequired === 0 && currentInventory > 0) {
    return `Current inventory of ${currentInventory} units covers the projected Q1 2025 demand of ${originalQ1Data.totalRequired} units for ${componentName} at ${locationName}. Q2 2025 requires ${q2Data.totalRequired} units based on ${growthText}.`
  } else {
    return `Projected demand for ${componentName} at ${locationName} is ${originalQ1Data.totalRequired} units for Q1 2025 (with ${originalQ1Data.safetyStock} safety stock) and ${q2Data.totalRequired} units for Q2 2025, reflecting ${growthText}.`
  }
}
