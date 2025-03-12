'use client'

import React, { useState, useEffect } from 'react'
import { api } from '~/trpc/react'
import type { SupplierId } from '~/lib/types/types'
import { OriginalQualityChart } from '~/components/data/suppliers/original-quality-chart'
import { FailureRateChart } from '~/components/data/suppliers/failure-rate-chart'
import { LeadTimeVarianceChart } from '~/components/data/suppliers/lead-time-variance-chart'
import { AnalyzedQualityChart } from '~/components/data/suppliers/analyzed-quality-chart'
import { ForecastChart } from '~/components/data/suppliers/forecast-chart'
import { ConfidenceIntervalChart } from '~/components/data/suppliers/confidence-interval-chart'
import { TrendAnalysisSummary } from '~/components/data/suppliers/trend-analysis-summary'
import { SupplierViz } from '~/components/data/suppliers/supplier-viz'

// Define the interface for the enhanced visualization data
export interface EnhancedVisualizationData {
  originalQuality: {
    dates: string[]
    qualityIndex: number[]
    efficiencyIndex: number[]
    periods: Array<{
      startDate: string
      endDate: string
      trend: string
    }>
  }
  analyzedData: {
    timePoints: string[]
    qualityValues: number[]
    leadTimeValues: number[]
    combinedValues: number[]
    trendDirection: Record<string, string>
    trendMagnitude: Record<string, number>
  }
  historicalData: {
    byMonth: Array<{
      month: string
      avgFailureRate: number
      avgLeadTimeVariance: number
    }>
    byQuarter: Array<{
      quarter: string
      avgFailureRate: number
      avgLeadTimeVariance: number
    }>
  }
  projection: {
    nextQuarter: string
    projectedQuality: number
    confidence: number
  }
  config: {
    qualityVolatility: number
    seasonalStrength: number
    qualityMomentum: number
  }
}
type EnhancedVisualizationDataMap = Record<
  SupplierId,
  EnhancedVisualizationData
>
// Interface for the forecast data from our API
export interface ForecastDisplayData {
  supplierId: string
  forecast: {
    qualityForecast: Array<{
      date: string
      value: number
      lower: number
      upper: number
    }>
    leadTimeForecast: Array<{
      date: string
      value: number
      lower: number
      upper: number
    }>
    historicalData: Array<{
      date: string
      supplierId: string
      qualityRating: number
      leadTimeReliability: number
    }>
  }
}

export default function SupplierPerformanceVisualization() {
  const [enhancedData, setEnhancedData] =
    useState<EnhancedVisualizationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use tRPC to fetch the forecast data
  const forecastQuery = api.data.getSupplierPerformanceForecastingData.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
    }
  )

  // Fetch the enhanced visualization data
  useEffect(() => {
    console.log('Loading enhanced supplier quality data...')
    fetch('/data/supplier-quality-enhanced-visualization.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch enhanced supplier data: ${response.status} ${response.statusText}`
          )
        }
        return response.json()
      })
      .then((data: EnhancedVisualizationDataMap) => {
        console.log('Enhanced supplier data loaded')
        // Extract just Bolt's data
        setEnhancedData(data.Bolt)
        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('Error loading enhanced supplier data:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  // Show loading state
  if (loading || forecastQuery.isLoading) {
    return <div className="p-4">Loading supplier performance data...</div>
  }

  // Show error state
  if (error || forecastQuery.error) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-bold text-red-600">
          Error Loading Data
        </h1>
        <p>{error ?? forecastQuery.error?.message}</p>
      </div>
    )
  }

  // Check if we have all the data we need
  if (!enhancedData || !forecastQuery.data) {
    return <div className="p-4">No supplier performance data found.</div>
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-6 text-center text-2xl font-bold">
        Bolt Supplier Performance Analysis
      </h1>

      <SupplierViz
        enhancedData={enhancedData}
        forecastData={forecastQuery.data}
      />
    </div>
  )
}
