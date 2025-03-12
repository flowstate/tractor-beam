'use client'

import { ResponsiveHeatMap } from '@nivo/heatmap'

interface SeasonalData {
  model: string
  Q1: number
  Q2: number
  Q3: number
  Q4: number
  [key: string]: string | number
}

export default function SeasonalPatternChart() {
  // Mock data - would come from API in real implementation
  const rawSeasonalData: SeasonalData[] = [
    {
      model: 'TX-100',
      Q1: 0.85,
      Q2: 1.05,
      Q3: 1.15,
      Q4: 0.95,
    },
    {
      model: 'TX-300',
      Q1: 0.8,
      Q2: 1.1,
      Q3: 1.2,
      Q4: 0.9,
    },
    {
      model: 'TX-500',
      Q1: 0.9,
      Q2: 1.0,
      Q3: 1.1,
      Q4: 1.0,
    },
  ]

  // Transform data to the format expected by Nivo HeatMap
  const seasonalData = rawSeasonalData.map((item) => ({
    id: item.model,
    data: [
      { x: 'Q1', y: item.Q1 },
      { x: 'Q2', y: item.Q2 },
      { x: 'Q3', y: item.Q3 },
      { x: 'Q4', y: item.Q4 },
    ],
  }))

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Seasonal Patterns
      </h2>
      <div className="h-80">
        <ResponsiveHeatMap
          data={seasonalData}
          margin={{ top: 20, right: 60, bottom: 60, left: 60 }}
          forceSquare={true}
          axisTop={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Quarter',
            legendOffset: -30,
          }}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Quarter',
            legendPosition: 'middle',
            legendOffset: 36,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Model',
            legendPosition: 'middle',
            legendOffset: -40,
          }}
          colors={{
            type: 'diverging',
            scheme: 'red_yellow_blue',
            divergeAt: 0.5,
            minValue: 0.8,
            maxValue: 1.2,
          }}
          emptyColor="#555555"
          borderWidth={1}
          borderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
          enableLabels={true}
          labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
          legends={[
            {
              anchor: 'bottom',
              translateX: 0,
              translateY: 50,
              length: 200,
              thickness: 10,
              direction: 'row',
              tickPosition: 'after',
              tickSize: 3,
              tickSpacing: 4,
              tickOverlap: false,
              tickFormat: '>-.2f',
              title: 'Seasonal Factor',
              titleAlign: 'start',
              titleOffset: 4,
            },
          ]}
          annotations={[
            {
              type: 'rect',
              match: (cell) =>
                cell.serieId === 'TX-300' && cell.data.x === 'Q3',
              noteX: 0,
              noteY: -15,
              offset: 0,
              noteTextOffset: -2,
              noteWidth: 100,
              note: 'Peak demand',
            },
          ]}
          hoverTarget="rowColumn"
          opacity={0.8}
          tooltip={({ cell }) => (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
              <div className="text-sm">
                <span className="font-medium">{cell.serieId}</span> in{' '}
                <span className="font-medium">{cell.data.x}</span>
              </div>
              <div className="mt-1 flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: cell.color }}
                ></div>
                {cell.data.y != null ? (
                  <span>
                    {cell.data.y < 1 ? '-' : '+'}
                    {Math.abs((cell.data.y - 1) * 100).toFixed(0)}% from average
                  </span>
                ) : (
                  <span>No data available</span>
                )}
              </div>
            </div>
          )}
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>Visualization of seasonal demand patterns by quarter.</p>
      </div>
    </div>
  )
}
