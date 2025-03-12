import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { EnhancedVisualizationData } from '~/app/data/suppliers/page'

interface OriginalQualityChartProps {
  enhancedData: EnhancedVisualizationData
}

export const OriginalQualityChart: React.FC<OriginalQualityChartProps> = ({
  enhancedData,
}) => {
  // Prepare data for the original quality chart
  const originalQualityData = [
    {
      id: 'Quality Index',
      data: enhancedData.originalQuality.dates.map((date, i) => ({
        x: new Date(date),
        y: enhancedData.originalQuality.qualityIndex[i],
      })),
    },
  ]

  return (
    <div>
      <h2 className="mb-2 text-center text-base font-medium text-gray-700">
        Original Quality Index
      </h2>
      <div className="h-[250px]">
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
          colors={['#4f46e5']} // Indigo color for quality index
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
            ({
              xScale,
              innerHeight,
            }: {
              xScale: (value: Date) => number
              innerHeight: number
            }) => {
              if (!xScale) return null

              return (
                <g>
                  {enhancedData.originalQuality.periods.map((period, index) => {
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
    </div>
  )
}
