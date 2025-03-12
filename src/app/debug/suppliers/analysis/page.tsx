'use client'

import React, { useState, useEffect } from 'react'
import { ResponsiveLine } from '@nivo/line'
import { SUPPLIER_IDS } from '~/lib/types/types'
import type { SupplierId } from '~/lib/types/types'

// Define the interface for the enhanced visualization data
interface EnhancedVisualizationData {
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

export default function SupplierAnalysisDebugPage() {
  const [supplierData, setSupplierData] =
    useState<EnhancedVisualizationDataMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierId>('Elite')
  const [showComparison, setShowComparison] = useState(false)

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
        console.log('Enhanced supplier data loaded:', Object.keys(data))
        setSupplierData(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('Error loading enhanced supplier data:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-4">Loading enhanced supplier quality data...</div>
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="mb-4 text-xl font-bold text-red-600">
          Error Loading Data
        </h1>
        <p>{error}</p>
      </div>
    )
  }

  if (!supplierData) {
    return <div className="p-4">No enhanced supplier quality data found.</div>
  }

  const currentData = supplierData[selectedSupplier]
  if (!currentData) {
    return <div className="p-4">No data found for selected supplier.</div>
  }

  // Prepare data for the original quality chart
  const originalQualityData = [
    {
      id: 'Quality Index',
      data: currentData.originalQuality.dates.map((date, i) => ({
        x: new Date(date),
        y: currentData.originalQuality.qualityIndex[i],
      })),
    },
  ]

  // Prepare data for the historical failure rate chart
  const failureRateData = [
    {
      id: 'Failure Rate (Monthly)',
      data: currentData.historicalData.byMonth.map((month) => ({
        x: month.month,
        y: month.avgFailureRate,
      })),
    },
    {
      id: 'Failure Rate (Quarterly)',
      data: currentData.historicalData.byQuarter.map((quarter) => ({
        x: quarter.quarter,
        y: quarter.avgFailureRate,
      })),
    },
  ]

  // Prepare data for the historical lead time variance chart
  const leadTimeVarianceData = [
    {
      id: 'Lead Time Variance (Monthly)',
      data: currentData.historicalData.byMonth.map((month) => ({
        x: month.month,
        y: month.avgLeadTimeVariance,
      })),
    },
    {
      id: 'Lead Time Variance (Quarterly)',
      data: currentData.historicalData.byQuarter.map((quarter) => ({
        x: quarter.quarter,
        y: quarter.avgLeadTimeVariance,
      })),
    },
  ]

  // Prepare data for the analyzed quality chart
  const analyzedQualityData = [
    {
      id: 'Quality Values',
      data: currentData.analyzedData.timePoints.map((time, i) => ({
        x: time,
        y: currentData.analyzedData.qualityValues[i],
      })),
    },
    {
      id: 'Lead Time Reliability',
      data: currentData.analyzedData.timePoints.map((time, i) => ({
        x: time,
        y: currentData.analyzedData.leadTimeValues[i],
      })),
    },
    {
      id: 'Combined Quality Index',
      data: currentData.analyzedData.timePoints.map((time, i) => ({
        x: time,
        y: currentData.analyzedData.combinedValues[i],
      })),
    },
  ]

  // Add this comparison view
  if (showComparison && supplierData) {
    return (
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Supplier Quality Comparison</h1>
          <button
            onClick={() => setShowComparison(false)}
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            Back to Single View
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {SUPPLIER_IDS.map((supplierId) => {
            const data = supplierData[supplierId]
            if (!data) return null

            // Prepare data for the analyzed quality chart - same as in single view
            const analyzedQualityData = [
              {
                id: 'Quality Values',
                data: data.analyzedData.timePoints.map((time, i) => ({
                  x: time,
                  y: data.analyzedData.qualityValues[i],
                })),
              },
              {
                id: 'Lead Time Reliability',
                data: data.analyzedData.timePoints.map((time, i) => ({
                  x: time,
                  y: data.analyzedData.leadTimeValues[i],
                })),
              },
              {
                id: 'Combined Quality Index',
                data: data.analyzedData.timePoints.map((time, i) => ({
                  x: time,
                  y: data.analyzedData.combinedValues[i],
                })),
              },
            ]

            return (
              <div key={supplierId} className="rounded border p-4">
                <h2 className="mb-2 text-center text-lg font-semibold">
                  {supplierId} - Analyzed Quality Metrics
                </h2>
                <div className="h-[300px]">
                  <ResponsiveLine
                    data={analyzedQualityData}
                    margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
                    xScale={{
                      type: 'point',
                    }}
                    yScale={{
                      type: 'linear',
                      min: 0.6,
                      max: 1,
                    }}
                    axisBottom={{
                      tickRotation: 45,
                      legend: 'Quarter',
                      legendOffset: 36,
                      legendPosition: 'middle',
                    }}
                    axisLeft={{
                      legend: 'Quality Value (Higher = Better)',
                      legendOffset: -40,
                      legendPosition: 'middle',
                    }}
                    enablePoints={true}
                    pointSize={6}
                    enableGridX={true}
                    enableGridY={true}
                    colors={{ scheme: 'category10' }}
                    lineWidth={2}
                    enableSlices="x"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Add a button to the existing view to switch to comparison
  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="mb-4 text-center text-2xl font-bold">
          Supplier Quality Analysis: {selectedSupplier}
        </h1>
        <div className="flex gap-2">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value as SupplierId)}
            className="rounded border p-2"
          >
            {SUPPLIER_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowComparison(true)}
            className="rounded bg-blue-500 px-4 py-2 text-white"
          >
            Compare All Suppliers
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Original Quality Index Chart */}
        <div className="rounded border p-4">
          <h2 className="mb-2 text-center text-lg font-semibold">
            Original Quality Index
          </h2>
          <div className="h-[300px]">
            <ResponsiveLine
              data={originalQualityData}
              margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
              xScale={{
                type: 'time',
                format: 'native',
                precision: 'day',
              }}
              yScale={{
                type: 'linear',
                min: 0.7,
                max: 1.3,
              }}
              axisBottom={{
                format: '%Y-%m',
                tickValues: 'every 3 months',
                legend: 'Date',
                legendOffset: 36,
                legendPosition: 'middle',
              }}
              axisLeft={{
                legend: 'Quality Index',
                legendOffset: -40,
                legendPosition: 'middle',
              }}
              enablePoints={false}
              enableGridX={true}
              enableGridY={true}
              colors={{ scheme: 'category10' }}
              lineWidth={2}
              enableSlices="x"
              layers={[
                'grid',
                'markers',
                'axes',
                'areas',
                'crosshair',
                'lines',
                'slices',
                'mesh',
                // Custom layer for period overlays
                ({ xScale, innerHeight }) => {
                  if (!xScale || typeof xScale !== 'function') return null

                  return (
                    <g>
                      {currentData.originalQuality.periods.map(
                        (period, index) => {
                          const startDate = new Date(period.startDate)
                          const endDate = new Date(period.endDate)

                          // Use xScale to position overlays correctly
                          const startX = xScale(startDate)
                          const endX = xScale(endDate)

                          // Only render if within chart bounds
                          if (isNaN(startX) || isNaN(endX)) return null

                          const width = endX - startX

                          const color =
                            period.trend === 'up'
                              ? 'rgba(0, 128, 0, 0.1)'
                              : period.trend === 'down'
                                ? 'rgba(255, 0, 0, 0.1)'
                                : 'rgba(0, 0, 255, 0.1)'

                          const borderColor =
                            period.trend === 'up'
                              ? 'rgb(0, 128, 0)'
                              : period.trend === 'down'
                                ? 'rgb(255, 0, 0)'
                                : 'rgb(0, 0, 255)'

                          return (
                            <g key={index}>
                              <rect
                                x={startX}
                                y={0}
                                width={width}
                                height={innerHeight}
                                fill={color}
                                stroke={borderColor}
                                strokeWidth={1}
                              />
                              <text
                                x={startX + width / 2}
                                y={10}
                                textAnchor="middle"
                                fontSize={8}
                                fill={borderColor}
                                stroke="white"
                                strokeWidth={2}
                                paintOrder="stroke"
                              >
                                {period.trend}
                              </text>
                            </g>
                          )
                        }
                      )}
                    </g>
                  )
                },
              ]}
            />
          </div>
        </div>

        {/* Historical Failure Rate Chart */}
        <div className="rounded border p-4">
          <h2 className="mb-2 text-center text-lg font-semibold">
            Historical Failure Rate
          </h2>
          <div className="h-[300px]">
            <ResponsiveLine
              data={failureRateData}
              margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
              xScale={{
                type: 'point',
              }}
              yScale={{
                type: 'linear',
                min: 0,
                max: 0.3,
              }}
              axisBottom={{
                tickRotation: 45,
                legend: 'Time Period',
                legendOffset: 36,
                legendPosition: 'middle',
              }}
              axisLeft={{
                legend: 'Failure Rate (Higher = Worse)',
                legendOffset: -40,
                legendPosition: 'middle',
              }}
              enablePoints={true}
              pointSize={4}
              enableGridX={true}
              enableGridY={true}
              colors={{ scheme: 'category10' }}
              lineWidth={2}
              enableSlices="x"
            />
          </div>
        </div>

        {/* Historical Lead Time Variance Chart */}
        <div className="rounded border p-4">
          <h2 className="mb-2 text-center text-lg font-semibold">
            Historical Lead Time Variance
          </h2>
          <div className="h-[300px]">
            <ResponsiveLine
              data={leadTimeVarianceData}
              margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
              xScale={{
                type: 'point',
              }}
              yScale={{
                type: 'linear',
                min: -2,
                max: 2,
              }}
              axisBottom={{
                tickRotation: 45,
                legend: 'Time Period',
                legendOffset: 36,
                legendPosition: 'middle',
              }}
              axisLeft={{
                legend:
                  'Lead Time Variance (Positive = Late, Negative = Early)',
                legendOffset: -40,
                legendPosition: 'middle',
              }}
              enablePoints={true}
              pointSize={4}
              enableGridX={true}
              enableGridY={true}
              colors={{ scheme: 'category10' }}
              lineWidth={2}
              enableSlices="x"
            />
          </div>
        </div>

        {/* Analyzed Quality Chart */}
        <div className="rounded border p-4">
          <h2 className="mb-2 text-center text-lg font-semibold">
            Analyzed Quality Metrics
          </h2>
          <div className="h-[300px]">
            <ResponsiveLine
              data={analyzedQualityData}
              margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
              xScale={{
                type: 'point',
              }}
              yScale={{
                type: 'linear',
                min: 0.6,
                max: 1,
              }}
              axisBottom={{
                tickRotation: 45,
                legend: 'Quarter',
                legendOffset: 36,
                legendPosition: 'middle',
              }}
              axisLeft={{
                legend: 'Quality Value (Higher = Better)',
                legendOffset: -40,
                legendPosition: 'middle',
              }}
              enablePoints={true}
              pointSize={6}
              enableGridX={true}
              enableGridY={true}
              colors={{ scheme: 'category10' }}
              lineWidth={2}
              enableSlices="x"
              legends={[
                {
                  anchor: 'top',
                  direction: 'row',
                  justify: false,
                  translateX: 0,
                  translateY: -20,
                  itemsSpacing: 0,
                  itemDirection: 'left-to-right',
                  itemWidth: 120,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: 'circle',
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Trend Analysis Summary */}
      <div className="mt-4 rounded border p-4">
        <h2 className="mb-2 text-center text-lg font-semibold">
          Trend Analysis Summary
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <h3 className="font-semibold">Overall Trend</h3>
            <p>Direction: {currentData.projection.nextQuarter}</p>
            <p>
              Magnitude: {currentData.projection.projectedQuality.toFixed(4)}
            </p>
            <p>
              Confidence: {(currentData.projection.confidence * 100).toFixed(1)}
              %
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Quarterly Trends</h3>
            <ul className="text-sm">
              {Object.entries(currentData.analyzedData.trendDirection).map(
                ([quarter, direction]) => (
                  <li key={quarter}>
                    {quarter}: {direction} (magnitude:{' '}
                    {currentData.analyzedData.trendMagnitude[quarter].toFixed(
                      4
                    )}
                    )
                  </li>
                )
              )}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Configuration</h3>
            <p>
              Quality Volatility:{' '}
              {currentData.config.qualityVolatility.toFixed(2)}
            </p>
            <p>
              Seasonal Strength:{' '}
              {currentData.config.seasonalStrength.toFixed(2)}
            </p>
            <p>
              Quality Momentum: {currentData.config.qualityMomentum.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
