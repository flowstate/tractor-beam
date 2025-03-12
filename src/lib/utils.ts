import { type ReasonedAllocationStrategy } from './recommendation/recommendation.types'
import {
  COMPONENT_IDS,
  LOCATION_IDS,
  SUPPLIER_IDS,
  TRACTOR_MODEL_IDS,
} from './types/types'
import type {
  ComponentId,
  LocationId,
  SupplierId,
  TractorModelId,
} from './types/types'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Creates a record with all component IDs as keys and the provided value for each key
 * @param defaultValue The default value to set for each component
 * @returns A record with all component IDs as keys
 */
export function makeComponentRecord<T>(
  defaultValue: T
): Record<ComponentId, T> {
  return Object.fromEntries(
    COMPONENT_IDS.map((id) => [id, defaultValue])
  ) as Record<ComponentId, T>
}

/**
 * Creates a record with all location IDs as keys and the provided value for each key
 * @param defaultValue The default value to set for each location
 * @returns A record with all location IDs as keys
 */
export function makeLocationRecord<T>(defaultValue: T): Record<LocationId, T> {
  return Object.fromEntries(
    LOCATION_IDS.map((id) => [id, defaultValue])
  ) as Record<LocationId, T>
}

/**
 * Creates a record with all supplier IDs as keys and the provided value for each key
 * @param defaultValue The default value to set for each supplier
 * @returns A record with all supplier IDs as keys
 */
export function makeSupplierRecord<T>(defaultValue: T): Record<SupplierId, T> {
  return Object.fromEntries(
    SUPPLIER_IDS.map((id) => [id, defaultValue])
  ) as Record<SupplierId, T>
}

/**
 * Creates a record with all tractor model IDs as keys and the provided value for each key
 * @param defaultValue The default value to set for each model
 * @returns A record with all model IDs as keys
 */
export function makeModelRecord<T>(defaultValue: T): Record<TractorModelId, T> {
  return Object.fromEntries(
    TRACTOR_MODEL_IDS.map((id) => [id, defaultValue])
  ) as Record<TractorModelId, T>
}

/**
 * Creates a nested record with location IDs as outer keys and component IDs as inner keys
 * @param defaultValue The default value to set for each component at each location
 * @returns A nested record with location and component IDs as keys
 */
export function makeLocationComponentRecord<T>(
  defaultValue: T
): Record<LocationId, Record<ComponentId, T>> {
  // Create a new component record for each location to avoid shared references
  return Object.fromEntries(
    LOCATION_IDS.map((locId) => [
      locId,
      Object.fromEntries(COMPONENT_IDS.map((compId) => [compId, defaultValue])),
    ])
  ) as Record<LocationId, Record<ComponentId, T>>
}

/**
 * Creates a nested record with location IDs, component IDs, and supplier IDs as keys
 * @param defaultValue The default value to set for each supplier for each component at each location
 * @returns A deeply nested record with location, component, and supplier IDs as keys
 */
export function makeLocationComponentSupplierRecord<T>(
  defaultValue: T
): Record<LocationId, Record<ComponentId, Record<SupplierId, T>>> {
  // Create a new supplier record for each component at each location to avoid shared references
  return Object.fromEntries(
    LOCATION_IDS.map((locId) => [
      locId,
      Object.fromEntries(
        COMPONENT_IDS.map((compId) => [
          compId,
          Object.fromEntries(
            SUPPLIER_IDS.map((suppId) => [suppId, defaultValue])
          ),
        ])
      ),
    ])
  ) as Record<LocationId, Record<ComponentId, Record<SupplierId, T>>>
}

/**
 * Creates a record with location IDs as keys and an array of quarterly data as values
 * @param makeQuarterlyData A function that returns the quarterly data array for each location-component pair
 * @returns A nested record with quarterly data arrays
 */
export function makeLocationComponentQuarterlyRecord<T>(
  makeQuarterlyData: () => T[]
): Record<LocationId, Record<ComponentId, T[]>> {
  // Create a new quarterly data array for each component at each location to avoid shared references
  return Object.fromEntries(
    LOCATION_IDS.map((locId) => [
      locId,
      Object.fromEntries(
        COMPONENT_IDS.map((compId) => [
          compId,
          // Call makeQuarterlyData() for each component to get a fresh array
          makeQuarterlyData(),
        ])
      ),
    ])
  ) as Record<LocationId, Record<ComponentId, T[]>>
}

/**
 * Creates a nested record specifically for the OverallRecommendedStrategy type
 * This ensures the structure matches exactly what's expected by the type
 * @returns A properly typed OverallRecommendedStrategy object
 */
export function makeEmptyRecommendedStrategy(): Record<
  LocationId,
  Record<ComponentId, ReasonedAllocationStrategy>
> {
  // Create the base structure with explicit location and component IDs
  const result: Record<
    LocationId,
    Record<ComponentId, ReasonedAllocationStrategy>
  > = {} as Record<LocationId, Record<ComponentId, ReasonedAllocationStrategy>>

  // Initialize each location
  for (const locId of LOCATION_IDS) {
    result[locId] = {} as Record<ComponentId, ReasonedAllocationStrategy>

    // Initialize each component for this location
    for (const compId of COMPONENT_IDS) {
      result[locId][compId] = {
        componentId: compId,
        locationId: locId,
        overallStrategy: '',
        currentInventory: 0,
        demandForecast: {
          quarterlyDemand: [],
        },
        originalDemand: {
          quarterlyDemand: [],
        },
        supplierAllocations: [],
        topLevelRecommendation: '',
        quantityReasoning: {
          summary: '',
          detailedExplanation: '',
          safetyStockExplanation: '',
        },
        allocationReasoning: {
          summary: '',
          supplierReasonings: [],
        },
        riskConsiderations: {
          summary: '',
          factors: [],
        },
      }
    }
  }

  return result
}

/**
 * Formats a number as a currency string with dollar sign and commas
 * @param value The number to format as currency
 * @returns A formatted currency string (e.g., "$1,234,567.89")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
