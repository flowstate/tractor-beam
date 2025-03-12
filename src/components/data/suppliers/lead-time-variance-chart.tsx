import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { EnhancedVisualizationData } from '~/app/data/suppliers/page'

interface LeadTimeVarianceChartProps {
  enhancedData: EnhancedVisualizationData
  showMonthlyOnly?: boolean
}

export const LeadTimeVarianceChart: React.FC<LeadTimeVarianceChartProps> = ({
  enhancedData,
  showMonthlyOnly = false,
}) => {
  // Prepare data for the historical lead time variance chart
  const leadTimeVarianceData = showMonthlyOnly
    ? [
        {
          id: 'Lead Time Variance (Monthly)',
          data: enhancedData.historicalData.byMonth.map((month) => ({
            x: month.month,
            y: month.avgLeadTimeVariance,
          })),
        },
      ]
    : [
        {
          id: 'Lead Time Variance (Monthly)',
          data: enhancedData.historicalData.byMonth.map((month) => ({
            x: month.month,
            y: month.avgLeadTimeVariance,
          })),
        },
        {
          id: 'Lead Time Variance (Quarterly)',
          data: enhancedData.historicalData.byQuarter.map((quarter) => ({
            x: quarter.quarter,
            y: quarter.avgLeadTimeVariance,
          })),
        },
      ]

  return (
    <div>
      <h2 className="mb-2 text-center text-base font-medium text-gray-700">
        Historical Lead Time Variance
      </h2>
      <div className="h-[250px]">
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
            legend: 'Lead Time Variance',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          enablePoints={true}
          pointSize={4}
          enableGridX={true}
          enableGridY={true}
          colors={['#3b82f6']} // Blue color for lead time
          lineWidth={2}
          enableSlices="x"
        />
      </div>
    </div>
  )
}
