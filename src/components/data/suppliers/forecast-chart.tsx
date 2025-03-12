import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { ForecastDisplayData } from '~/app/data/suppliers/page'

interface ForecastChartProps {
  forecastData: ForecastDisplayData
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecastData,
}) => {
  // Prepare data for the forecast chart
  const chartData = [
    {
      id: 'Quality Forecast',
      data: forecastData.forecast.qualityForecast.map((point) => ({
        x: new Date(point.date),
        y: point.value,
      })),
    },
  ]

  return (
    <div>
      <h2 className="mb-2 text-center text-base font-medium text-gray-700">
        Prophet Quality Forecast
      </h2>
      <div className="h-[250px]">
        <ResponsiveLine
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
          xScale={{
            type: 'time',
            format: 'native',
            precision: 'day',
          }}
          yScale={{
            type: 'linear',
            min: 0.6,
            max: 1,
          }}
          axisBottom={{
            format: '%Y-%m',
            tickValues: 'every 3 months',
            legend: 'Date',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          axisLeft={{
            legend: 'Quality Rating',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          enablePoints={false}
          enableGridX={true}
          enableGridY={true}
          colors={['#2196F3']}
          lineWidth={2}
          enableSlices="x"
          enableArea={true}
          areaOpacity={0.1}
        />
      </div>
    </div>
  )
}
