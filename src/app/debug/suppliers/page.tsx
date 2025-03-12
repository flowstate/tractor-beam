'use client'

import React, { useState, useEffect } from 'react'
import { ResponsiveLine } from '@nivo/line'
import { SUPPLIERS } from '~/lib/constants'
import type { SupplierId } from '~/lib/types/types'

interface QualityPeriod {
  startDate: string
  endDate: string
  trend: 'up' | 'down' | 'stable'
  momentum: number
}

interface SupplierQualityPoint {
  date: string
  qualityIndex: number
  efficiencyIndex: number
}

interface SupplierQualityData {
  supplierId: SupplierId
  config: {
    qualityVolatility: number
    seasonalStrength: number
    qualityMomentum: number
  }
  periods: QualityPeriod[]
  points: SupplierQualityPoint[]
}

type SupplierQualityMap = Record<SupplierId, SupplierQualityData>

export default function SupplierQualityDebugPage() {
  const [supplierData, setSupplierData] = useState<SupplierQualityMap | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataType, setDataType] = useState<'quality' | 'efficiency'>('quality')

  useEffect(() => {
    console.log('Loading supplier quality data...')
    fetch('/data/supplier-quality-full-data.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch supplier data: ${response.status} ${response.statusText}`
          )
        }
        return response.json()
      })
      .then((data: SupplierQualityMap) => {
        console.log('Supplier data loaded:', Object.keys(data))
        setSupplierData(data)
        setLoading(false)
      })
      .catch((err: Error) => {
        console.error('Error loading supplier data:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="p-4">Loading supplier quality data...</div>
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
    return <div className="p-4">No supplier quality data found.</div>
  }

  const suppliers = Object.keys(supplierData) as SupplierId[]

  return (
    <div className="p-4">
      <h1 className="mb-4 text-center text-2xl font-bold">
        Supplier Quality Comparison
      </h1>

      {/* Data Type Selector */}
      <div className="mb-4 flex justify-center">
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="dataType"
              value="quality"
              checked={dataType === 'quality'}
              onChange={() => setDataType('quality')}
              className="mr-2"
            />
            Quality Index
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="dataType"
              value="efficiency"
              checked={dataType === 'efficiency'}
              onChange={() => setDataType('efficiency')}
              className="mr-2"
            />
            Efficiency Index
          </label>
        </div>
      </div>

      {/* Supplier Charts in a Row */}
      <div className="flex flex-wrap justify-center">
        {suppliers.map((supplierId) => {
          const currentData = supplierData[supplierId]
          if (!currentData) return null

          // Prepare data for the chart
          const chartData = [
            {
              id: dataType === 'quality' ? 'Quality Index' : 'Efficiency Index',
              data: currentData.points.map((point) => ({
                x: new Date(point.date),
                y:
                  dataType === 'quality'
                    ? point.qualityIndex
                    : point.efficiencyIndex,
              })),
            },
          ]

          // Calculate min and max for y-axis
          const values = currentData.points.map((p) =>
            dataType === 'quality' ? p.qualityIndex : p.efficiencyIndex
          )
          const minValue = 0.5
          const maxValue = 1.5

          return (
            <div key={supplierId} className="w-1/5 min-w-[600px] p-2">
              <div className="rounded border p-2">
                <h2 className="mb-1 text-center text-lg font-bold">
                  {supplierId}
                </h2>
                <div className="h-[250px]">
                  <ResponsiveLine
                    curve="natural"
                    data={chartData}
                    margin={{ top: 30, right: 20, bottom: 30, left: 40 }}
                    xScale={{
                      type: 'time',
                      format: 'native',
                      precision: 'day',
                      min: new Date('2022-01-01'),
                      max: new Date('2024-12-31'),
                    }}
                    yScale={{
                      type: 'linear',
                      min: minValue,
                      max: maxValue,
                    }}
                    axisBottom={{
                      format: '%Y',
                      tickValues: 'every 1 year',
                      legend: '',
                    }}
                    axisLeft={{
                      tickSize: 5,
                      tickPadding: 5,
                      tickRotation: 0,
                      legend: '',
                      legendOffset: -40,
                    }}
                    enablePoints={false}
                    enableGridX={false}
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
                            {currentData.periods.map((period, index) => {
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
                            })}
                          </g>
                        )
                      },
                    ]}
                  />
                </div>
                <div className="mt-1 text-center text-xs">
                  <span className="mr-2">
                    <span className="font-semibold">Vol:</span>{' '}
                    {currentData.config.qualityVolatility.toFixed(1)}
                  </span>
                  <span className="mr-2">
                    <span className="font-semibold">Mom:</span>{' '}
                    {currentData.config.qualityMomentum.toFixed(1)}
                  </span>
                  <span>
                    <span className="font-semibold">Seas:</span>{' '}
                    {currentData.config.seasonalStrength.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
