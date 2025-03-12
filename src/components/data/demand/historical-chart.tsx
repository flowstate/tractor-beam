import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { TypedForecastData } from '~/app/data/demand/page'

interface HistoricalChartProps {
  data: TypedForecastData
}

export const HistoricalChart: React.FC<HistoricalChartProps> = ({ data }) => {
  // Group data by quarter to reduce visual clutter
  const quarterlyData: Record<
    string,
    {
      demand: number
      mti: number
      count: number
      quarter: string
    }
  > = {}

  data.historicalData.forEach((point) => {
    const date = new Date(point.date)
    const year = date.getFullYear()
    const quarter = Math.floor(date.getMonth() / 3) + 1
    const key = `${year}-Q${quarter}`

    if (!quarterlyData[key]) {
      quarterlyData[key] = {
        demand: 0,
        mti: 0,
        count: 0,
        quarter: key,
      }
    }

    quarterlyData[key].demand += point.demand
    quarterlyData[key].mti += point.mti
    quarterlyData[key].count += 1
  })

  // Calculate averages and convert to array
  const aggregatedData = Object.values(quarterlyData)
    .map((d) => ({
      quarter: d.quarter,
      demand: d.demand / d.count,
      mti: d.mti / d.count,
    }))
    .sort((a, b) => a.quarter.localeCompare(b.quarter))

  // Prepare data for the chart - removed inflation
  const chartData = [
    {
      id: 'Demand',
      data: aggregatedData.map((d) => ({
        x: d.quarter,
        y: d.demand,
      })),
    },
    {
      id: 'Market Trend Index',
      data: aggregatedData.map((d) => ({
        x: d.quarter,
        y: d.mti * 100, // Convert to percentage
      })),
    },
  ]

  // Calculate max demand for scaling
  const maxDemand = Math.max(...aggregatedData.map((d) => d.demand))

  // Calculate appropriate y-axis max for percentages
  const percentageMax = Math.max(...aggregatedData.map((d) => d.mti * 100))

  // Add 10% padding to the max values
  const demandMax = Math.ceil(maxDemand * 1.1)
  const percentageAxisMax = Math.ceil(percentageMax * 1.1)

  return (
    <div className="h-full">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{
          type: 'point',
        }}
        yScale={{
          type: 'linear',
          min: 0,
          max: demandMax,
          stacked: false,
        }}
        yFormat=" >-.1f"
        axisTop={null}
        axisRight={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Market Trend Index (%)',
          legendOffset: 40,
          legendPosition: 'middle',
          format: (value: number) => `${value.toFixed(0)}%`,
        }}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 45,
          legend: 'Quarter',
          legendOffset: 36,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Demand (Units)',
          legendOffset: -40,
          legendPosition: 'middle',
        }}
        enableGridX={false}
        colors={['#3182CE', '#F6AD55']} // Blue for demand, orange for MTI
        lineWidth={3}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        legends={[
          {
            anchor: 'top-right',
            direction: 'column',
            justify: false,
            translateX: 100,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
            effects: [
              {
                on: 'hover',
                style: {
                  itemBackground: 'rgba(0, 0, 0, .03)',
                  itemOpacity: 1,
                },
              },
            ],
          },
        ]}
        tooltip={({ point }) => {
          const serieId = point.serieId
          const value = point.data.y
          let label = ''

          if (serieId === 'Demand') {
            label = `${value.toFixed(0)} units`
          } else {
            label = `${value.toFixed(1)}%`
          }

          return (
            <div className="rounded-md bg-white p-2 shadow-md">
              <div className="font-medium">{serieId}</div>
              <div>
                {point.data.x}: {label}
              </div>
            </div>
          )
        }}
        theme={{
          axis: {
            ticks: {
              text: {
                fontSize: 11,
              },
            },
            legend: {
              text: {
                fontSize: 12,
                fontWeight: 'bold',
              },
            },
          },
          grid: {
            line: {
              stroke: '#eee',
              strokeWidth: 1,
            },
          },
        }}
      />
    </div>
  )
}
