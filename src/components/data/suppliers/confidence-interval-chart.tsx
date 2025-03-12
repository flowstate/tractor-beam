import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { ForecastDisplayData } from '~/app/data/suppliers/page'

interface ConfidenceIntervalChartProps {
  forecastData: ForecastDisplayData
}

export const ConfidenceIntervalChart: React.FC<
  ConfidenceIntervalChartProps
> = ({ forecastData }) => {
  // Prepare confidence interval data for the forecast
  const confidenceIntervalData = [
    {
      id: 'Upper Bound',
      data: forecastData.forecast.qualityForecast.map((point) => ({
        x: new Date(point.date),
        y: point.upper,
      })),
    },
    {
      id: 'Lower Bound',
      data: forecastData.forecast.qualityForecast.map((point) => ({
        x: new Date(point.date),
        y: point.lower,
      })),
    },
  ]

  return (
    <div>
      <h2 className="mb-2 text-center text-base font-medium text-gray-700">
        Forecast Confidence Intervals (95%)
      </h2>
      <div className="h-[250px]">
        <ResponsiveLine
          data={confidenceIntervalData}
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
          colors={['#90CAF9', '#90CAF9']}
          lineWidth={1}
          enableSlices="x"
          enableArea={true}
          areaOpacity={0.2}
        />
      </div>
    </div>
  )
}
