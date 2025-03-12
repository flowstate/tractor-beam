import {
  type SupplierId,
  type ComponentId,
  type LocationId,
} from '../types/types'
import { SUPPLIERS } from '../constants'
import { PrismaClient } from '@prisma/client'
import { getLatestSupplierPerformanceForecast } from '../prediction/supplier-performance-prediction'

const prisma = new PrismaClient()

// Scoring weights
const SCORING_WEIGHTS = {
  QUALITY: 0.7, // 70% weight for quality (SQI)
  COST: 0.3, // 30% weight for cost
}

// Interface for supplier score
export interface SupplierScore {
  supplierId: SupplierId
  componentId: ComponentId
  qualityScore: number // 0-100
  costScore: number // 0-100
  totalScore: number // Weighted average
}

/**
 * Scores a supplier for a specific component based on forecasted performance
 * @param supplierId The supplier to score
 * @param componentId The component to score for
 * @returns A score object with individual and total scores
 */
export async function scoreSupplier(
  supplierId: SupplierId,
  componentId: ComponentId
): Promise<SupplierScore> {
  // Get the supplier's forecast
  const forecast = await getLatestSupplierPerformanceForecast(supplierId)

  if (!forecast) {
    throw new Error(`No forecast found for supplier ${supplierId}`)
  }

  // Calculate average quality from forecast (next 90 days)
  const qualityForecast = forecast.qualityForecast as Array<{
    date: string
    value: number
    lower: number
    upper: number
  }>

  // Take the average of the next 90 days (or fewer if not available)
  const forecastDays = Math.min(90, qualityForecast.length)
  const avgQuality =
    qualityForecast
      .slice(0, forecastDays)
      .reduce((sum, point) => sum + point.value, 0) / forecastDays

  // Convert to 0-100 scale
  const qualityScore = avgQuality * 100

  // Get cost per unit from constants
  const supplierComponent = SUPPLIERS[supplierId]?.components.find(
    (c) => c.componentId === componentId
  )
  const costPerUnit = supplierComponent?.pricePerUnit ?? 0

  // Get all suppliers that provide this component for cost comparison
  const suppliersForComponent = Object.entries(SUPPLIERS)
    .filter(([_, supplier]) =>
      supplier.components.some((c) => c.componentId === componentId)
    )
    .map(([id, supplier]) => ({
      supplierId: id as SupplierId,
      costPerUnit:
        supplier.components.find((c) => c.componentId === componentId)
          ?.pricePerUnit ?? 0,
    }))

  // Find min and max costs for normalization
  const minCost = Math.min(...suppliersForComponent.map((s) => s.costPerUnit))
  const maxCost = Math.max(...suppliersForComponent.map((s) => s.costPerUnit))

  // Calculate cost score (0-100, higher is better)
  const costScore =
    maxCost === minCost
      ? 100 // If all costs are the same
      : ((maxCost - costPerUnit) / (maxCost - minCost)) * 100

  // Calculate weighted total score
  const totalScore =
    qualityScore * SCORING_WEIGHTS.QUALITY + costScore * SCORING_WEIGHTS.COST

  return {
    supplierId,
    componentId,
    qualityScore,
    costScore,
    totalScore,
  }
}

/**
 * Scores all suppliers for a component at a location
 * @param componentId The component to score suppliers for
 * @param locationId The location context
 * @returns Array of supplier scores, sorted by total score (highest first)
 */
export async function scoreAllSuppliers(
  componentId: ComponentId,
  locationId: LocationId
): Promise<SupplierScore[]> {
  // Get suppliers for this location
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { suppliers: true },
  })

  if (!location) {
    throw new Error(`Location ${locationId} not found`)
  }

  // Extract supplierId from each object
  const locationSuppliers = location.suppliers.map(
    (s) => s.supplierId
  ) as SupplierId[]

  // Filter suppliers that provide this component
  const relevantSuppliers = locationSuppliers.filter((supplierId) =>
    SUPPLIERS[supplierId]?.components.some((c) => c.componentId === componentId)
  )

  if (relevantSuppliers.length === 0) {
    throw new Error(
      `No suppliers found for component ${componentId} at location ${locationId}`
    )
  }

  // Score each supplier
  const scores = await Promise.all(
    relevantSuppliers.map((supplierId) =>
      scoreSupplier(supplierId, componentId)
    )
  )

  // Sort by total score (highest first)
  return scores.sort((a, b) => b.totalScore - a.totalScore)
}
