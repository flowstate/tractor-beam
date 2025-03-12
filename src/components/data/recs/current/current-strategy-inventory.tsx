import React from 'react'
import { ResponsiveLine } from '@nivo/line'
import { useCards } from '~/contexts/viz-card-context'

export default function CurrentStrategyInventory() {
  // Get real inventory data from context
  const { inventorySimulation } = useCards()

  // Debug: Log the data we're receiving
  console.log(
    'Current strategy inventory component received:',
    inventorySimulation
  )

  // Extract just the current strategy data
  const currentStrategyData = [inventorySimulation.currentStrategy]

  // Debug: Check for NaN values
  if (currentStrategyData[0].data && currentStrategyData[0].data.length > 0) {
    const hasNaN = currentStrategyData[0].data.some(
      (point) => isNaN(point.x) || isNaN(point.y)
    )
    console.log('Current strategy data has NaN:', hasNaN)
    if (hasNaN) {
      console.log(
        'First few data points:',
        currentStrategyData[0].data.slice(0, 5)
      )
    }
  }

  return (
    <div className="h-64 rounded-lg border border-gray-200 bg-white p-4">
      <ResponsiveLine
        data={currentStrategyData}
        margin={{ top: 20, right: 20, bottom: 40, left: 60 }}
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
        }}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Inventory Units',
          legendOffset: -50,
          legendPosition: 'middle',
        }}
        colors={['#4299e1']}
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
            anchor: 'top-right',
            direction: 'column',
            justify: false,
            translateX: 0,
            translateY: 0,
            itemsSpacing: 0,
            itemDirection: 'left-to-right',
            itemWidth: 80,
            itemHeight: 20,
            itemOpacity: 0.75,
            symbolSize: 12,
            symbolShape: 'circle',
            symbolBorderColor: 'rgba(0, 0, 0, .5)',
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
  )
}
