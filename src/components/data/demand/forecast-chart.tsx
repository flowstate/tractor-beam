import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { TypedForecastData } from '~/app/data/demand/page'

interface ForecastChartProps {
  data: TypedForecastData
}

export function ForecastChart({ data }: ForecastChartProps) {
  // Transform historical data for Nivo
  const historicalData = data.historicalData.map((point) => ({
    x: point.date,
    y: point.demand,
  }))

  // Transform forecast data
  const forecastData = data.forecast.forecastData.map((point) => ({
    x: point.date,
    y: point.value,
  }))

  // Transform confidence intervals
  const lowerBoundData = data.forecast.forecastData.map((point) => ({
    x: point.date,
    y: point.lower,
  }))

  const upperBoundData = data.forecast.forecastData.map((point) => ({
    x: point.date,
    y: point.upper,
  }))

  // Add quarter markers for the entire time range
  const allDates = [
    ...data.historicalData.map((d) => d.date),
    ...data.forecast.forecastData.map((d) => d.date),
  ]

  // Find quarters in the data
  const quarters = new Set<string>()
  data.historicalData.forEach((point) => {
    quarters.add(`Q${point.quarter} ${point.year}`)
  })

  // Create markers for quarters
  const quarterMarkers = Array.from(quarters).map((quarter) => ({
    axis: 'x' as const,
    value: quarter,
    legend: quarter,
    lineStyle: {
      stroke: '#ccc',
      strokeWidth: 1,
      strokeDasharray: '4 4',
    },
    textStyle: {
      fill: '#999',
      fontSize: 10,
    },
  }))

  const chartData = [
    {
      id: 'Historical',
      data: historicalData,
      color: '#718096', // gray
    },
    {
      id: 'Forecast',
      data: forecastData,
      color: '#3182CE', // blue
    },
    {
      id: 'Lower Bound',
      data: lowerBoundData,
      color: '#90CDF4', // light blue
    },
    {
      id: 'Upper Bound',
      data: upperBoundData,
      color: '#90CDF4', // light blue
    },
  ]

  return (
    <div className="h-full w-full">
      <ResponsiveLine
        data={chartData}
        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
        xScale={{
          type: 'time',
          format: '%Y-%m-%d',
          useUTC: false,
          precision: 'day',
        }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
        }}
        yFormat=" >-.2f"
        axisBottom={{
          format: '%b %Y',
          tickValues: 'every 3 months',
          legend: 'Time',
          legendOffset: 36,
          legendPosition: 'middle',
        }}
        axisLeft={{
          legend: 'Demand (units)',
          legendOffset: -40,
          legendPosition: 'middle',
        }}
        colors={{ datum: 'color' }}
        pointSize={0}
        pointBorderWidth={1}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={true}
        enableArea={true}
        areaOpacity={0.1}
        enableSlices="x"
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
      />
    </div>
  )
}
