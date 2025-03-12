import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { EnhancedVisualizationData } from '~/app/data/suppliers/page'

interface FailureRateChartProps {
  enhancedData: EnhancedVisualizationData
  showMonthlyOnly?: boolean
}

export const FailureRateChart: React.FC<FailureRateChartProps> = ({
  enhancedData,
  showMonthlyOnly = false,
}) => {
  // Prepare data for the historical failure rate chart
  const failureRateData = showMonthlyOnly
    ? [
        {
          id: 'Failure Rate (Monthly)',
          data: enhancedData.historicalData.byMonth.map((month) => ({
            x: month.month,
            y: month.avgFailureRate,
          })),
        },
      ]
    : [
        {
          id: 'Failure Rate (Monthly)',
          data: enhancedData.historicalData.byMonth.map((month) => ({
            x: month.month,
            y: month.avgFailureRate,
          })),
        },
        {
          id: 'Failure Rate (Quarterly)',
          data: enhancedData.historicalData.byQuarter.map((quarter) => ({
            x: quarter.quarter,
            y: quarter.avgFailureRate,
          })),
        },
      ]

  return (
    <div>
      <h2 className="mb-2 text-center text-base font-medium text-gray-700">
        Historical Failure Rate
      </h2>
      <div className="h-[250px]">
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
            legend: 'Failure Rate',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          enablePoints={true}
          pointSize={4}
          enableGridX={true}
          enableGridY={true}
          colors={['#f97316']} // Orange color for failure rate
          lineWidth={2}
          enableSlices="x"
        />
      </div>
    </div>
  )
}
