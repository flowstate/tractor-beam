import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import type { EnhancedVisualizationData } from '~/app/data/suppliers/page'

interface AnalyzedQualityChartProps {
  enhancedData: EnhancedVisualizationData
}

export const AnalyzedQualityChart: React.FC<AnalyzedQualityChartProps> = ({
  enhancedData,
}) => {
  // Prepare data for the analyzed quality chart
  const analyzedQualityData = [
    {
      id: 'Combined Quality Index',
      data: enhancedData.analyzedData.timePoints.map((time, i) => ({
        x: time,
        y: enhancedData.analyzedData.combinedValues[i],
      })),
    },
    {
      id: 'Quality Values',
      data: enhancedData.analyzedData.timePoints.map((time, i) => ({
        x: time,
        y: enhancedData.analyzedData.qualityValues[i],
      })),
    },
    {
      id: 'Lead Time Reliability',
      data: enhancedData.analyzedData.timePoints.map((time, i) => ({
        x: time,
        y: enhancedData.analyzedData.leadTimeValues[i],
      })),
    },
  ]

  return (
    <div>
      <h2 className="mb-2 text-center text-base font-medium text-gray-700">
        Analyzed Quality Metrics
      </h2>
      <div className="h-[250px]">
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
            legend: 'Quality Value',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          enablePoints={true}
          pointSize={6}
          enableGridX={true}
          enableGridY={true}
          colors={['#8b5cf6', '#f97316', '#3b82f6']} // Purple, orange, blue
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
  )
}
