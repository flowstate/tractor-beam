'use client'

import { ResponsiveLine } from '@nivo/line'

interface ModelDemandPoint {
  x: string // date
  y: number // demand
}

interface ModelDemandSeries {
  id: string
  color: string
  data: ModelDemandPoint[]
}

export default function ModelDemandChart() {
  // Mock data - would come from API in real implementation
  const modelDemandData: ModelDemandSeries[] = [
    {
      id: 'TX-100',
      color: '#FF6B6B',
      data: Array.from({ length: 180 }, (_, i) => ({
        x: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        y: Math.round(100 + 50 * Math.sin(i / 30) + i / 5 + Math.random() * 20),
      })),
    },
    {
      id: 'TX-300',
      color: '#4ECDC4',
      data: Array.from({ length: 180 }, (_, i) => ({
        x: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        y: Math.round(
          200 + 80 * Math.sin(i / 30 + 1) + i / 4 + Math.random() * 30
        ),
      })),
    },
    {
      id: 'TX-500',
      color: '#1A535C',
      data: Array.from({ length: 180 }, (_, i) => ({
        x: new Date(2024, 0, 1 + i).toISOString().split('T')[0],
        y: Math.round(
          300 + 100 * Math.sin(i / 30 + 2) + i / 3 + Math.random() * 40
        ),
      })),
    },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Model Demand Forecast
      </h2>
      <div className="h-80">
        <ResponsiveLine
          data={modelDemandData}
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          xScale={{
            type: 'time',
            format: '%Y-%m-%d',
            useUTC: false,
            precision: 'day',
          }}
          xFormat="time:%Y-%m-%d"
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
          }}
          curve="monotoneX"
          axisBottom={{
            format: '%b %d',
            tickValues: 5,
            legend: 'Date',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          axisLeft={{
            legend: 'Demand (units)',
            legendOffset: -50,
            legendPosition: 'middle',
          }}
          colors={{ datum: 'color' }}
          pointSize={0}
          pointBorderWidth={0}
          useMesh={true}
          enableSlices="x"
          enableArea={true}
          areaOpacity={0.1}
          legends={[
            {
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 50,
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
          sliceTooltip={({ slice }) => (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
              <div className="text-sm font-medium">
                {new Date(String(slice.points[0].data.x)).toLocaleDateString()}
              </div>
              {slice.points.map((point) => (
                <div key={point.id} className="flex items-center text-xs">
                  <div
                    className="mr-1 h-3 w-3 rounded-full"
                    style={{ backgroundColor: point.serieColor }}
                  />
                  <span className="font-medium">{point.serieId}:</span>
                  <span className="ml-1">
                    {point.data.y.toLocaleString()} units
                  </span>
                </div>
              ))}
            </div>
          )}
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>
          Forecasted demand for selected tractor models over the next two
          quarters.
        </p>
      </div>
    </div>
  )
}
