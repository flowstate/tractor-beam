'use client'

import React, { useEffect, useMemo } from 'react'
import { api } from '~/trpc/react'
import { DebugView } from '~/components/data/demand/debug-view'
import { DemandViz } from '~/components/data/demand/demand-viz'
import type { LocationId, TractorModelId, SupplierId } from '~/lib/types/types'

// Define the structure of our typed forecast data
export interface TypedForecastData {
  metadata: {
    locationId: LocationId
    modelId: TractorModelId
    modelName: string
    modelSensitivities: {
      market: number
      inflation: number
    }
  }
  historicalData: {
    date: string
    demand: number
    mti: number
    inflation: number
    quarter: number
    year: number
  }[]
  forecast: {
    forecastData: {
      date: string
      value: number
      lower: number
      upper: number
    }[]
    futureMti: number[]
    futureInflation: number[]
    metadata: {
      seasonalityStrength: number
      trendStrength: number
      confidenceInterval: number
    }
  }
  analysis: {
    seasonalPatterns: Record<string, number>
    marketSensitivity: number
    priceSensitivity: number
  }
  businessImpact: {
    currentCost: number
    recommendedCost: number
    costSavings: number
    costSavingsPercentage: number
    currentUnits: number
    recommendedUnits: number
    unitDelta: number
  }
  supplierAllocations: {
    componentId: string
    currentAllocations: Record<SupplierId, number>
    recommendedAllocations: Record<SupplierId, number>
    reasoning: string
  }[]
}

export default function DemandForecastPage() {
  // Fetch the demand forecasting data
  const {
    data: apiData,
    isLoading,
    error,
  } = api.data.getDemandForecastingData.useQuery()

  // Create a properly typed version of the data using useMemo
  const forecastData = useMemo<TypedForecastData | undefined>(() => {
    if (!apiData) return undefined
    return apiData as TypedForecastData
  }, [apiData])

  // Log data to console when loaded
  useEffect(() => {
    if (forecastData) {
      console.log('Demand Forecasting Data:', forecastData)
    }
  }, [forecastData])

  if (isLoading)
    return <div className="p-8">Loading demand forecasting data...</div>
  if (error)
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  if (!forecastData)
    return <div className="p-8">No demand forecasting data found</div>

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Demand Forecasting</h1>

      {/* Main visualization */}
      <div className="mb-8">
        <DemandViz data={forecastData} />
      </div>
    </div>
  )
}
