import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import { useCards } from '~/contexts/viz-card-context'

export default function CombinedInventoryComparison() {
  // Get real inventory data from context
  const { inventorySimulation } = useCards()

  // Use both strategies for the combined chart
  const combinedData = [
    inventorySimulation.currentStrategy,
    inventorySimulation.recommendedStrategy,
  ]

  return (
    <div className="space-y-2">
      <div className="h-80 rounded-lg border border-gray-200 bg-white p-4">
        <ResponsiveLine
          data={combinedData}
          margin={{ top: 20, right: 120, bottom: 50, left: 60 }}
          xScale={{ type: 'linear', min: 0, max: 180 }}
          yScale={{ type: 'linear', min: 0, max: 'auto' }}
          curve="monotoneX"
          axisBottom={{
            tickValues: [0, 90, 180],
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            format: (value) => {
              if (value === 0) return 'Start Q1'
              if (value === 90) return 'Start Q2'
              if (value === 180) return 'End Q2'
              return ''
            },
            legend: 'Time (Days)',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Inventory Units',
            legendOffset: -50,
            legendPosition: 'middle',
          }}
          colors={{ datum: 'color' }}
          pointSize={0}
          pointBorderWidth={0}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
          gridXValues={[0, 90, 180]}
          gridYValues={[0, 500, 1000, 1500]}
          enableSlices="x"
          enableArea={true}
          areaOpacity={0.1}
          crosshairType="x"
          legends={[
            {
              anchor: 'right',
              direction: 'column',
              justify: false,
              translateX: 100,
              translateY: 0,
              itemsSpacing: 10,
              itemDirection: 'left-to-right',
              itemWidth: 100,
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
          annotations={[
            {
              type: 'line',
              match: { axis: 'x', value: 90 },
              noteX: 90,
              noteY: -10,
              noteTextOffset: -10,
              lineColor: '#ff6b6b',
              lineWidth: 1,
              lineDash: [5, 5],
            },
          ]}
        />
      </div>
      <p className="text-center text-sm text-gray-600">
        Inventory Strategy Comparison
      </p>
    </div>
  )
}
