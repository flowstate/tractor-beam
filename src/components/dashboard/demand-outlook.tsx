'use client'

import { ResponsiveLine } from '@nivo/line'
import Card from '~/components/ui/card'

// Define the data structure for our demand outlook
interface DemandPoint {
  x: string // quarter
  y: number // demand
}

interface DemandSeries {
  id: string
  color: string
  data: DemandPoint[]
}

export default function DemandOutlook() {
  // Mock data - would come from API in real implementation
  const demandData: DemandSeries[] = [
    {
      id: 'Current Year',
      color: '#3182CE', // primary color
      data: [
        { x: 'Q1', y: 2400 },
        { x: 'Q2', y: 2800 },
        { x: 'Q3', y: 3200 },
        { x: 'Q4', y: 2900 },
      ],
    },
    {
      id: 'Forecast',
      color: '#38A169', // status-optimal
      data: [
        { x: 'Q1', y: 2400 },
        { x: 'Q2', y: 2800 },
        { x: 'Q3', y: 3600 }, // Forecasted
        { x: 'Q4', y: 3900 }, // Forecasted
      ],
    },
    {
      id: 'Previous Year',
      color: '#718096', // gray
      data: [
        { x: 'Q1', y: 2100 },
        { x: 'Q2', y: 2400 },
        { x: 'Q3', y: 2700 },
        { x: 'Q4', y: 2500 },
      ],
    },
  ]

  // Calculate year-over-year growth for the forecasted quarters
  const currentYearQ3 = demandData[0].data[2].y
  const forecastQ3 = demandData[1].data[2].y
  const growthQ3 = Math.round(
    ((forecastQ3 - currentYearQ3) / currentYearQ3) * 100
  )

  const currentYearQ4 = demandData[0].data[3].y
  const forecastQ4 = demandData[1].data[3].y
  const growthQ4 = Math.round(
    ((forecastQ4 - currentYearQ4) / currentYearQ4) * 100
  )

  return (
    <Card
      title="Quarterly Demand Outlook"
      subtitle="Projected demand for the next two quarters"
    >
      <div className="h-56">
        <ResponsiveLine
          data={demandData}
          margin={{ top: 10, right: 10, bottom: 50, left: 50 }}
          xScale={{ type: 'point' }}
          yScale={{
            type: 'linear',
            min: 'auto',
            max: 'auto',
            stacked: false,
            reverse: false,
          }}
          yFormat=" >-.2f"
          curve="monotoneX"
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Quarter',
            legendOffset: 36,
            legendPosition: 'middle',
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Units',
            legendOffset: -40,
            legendPosition: 'middle',
          }}
          colors={{ datum: 'color' }}
          lineWidth={3}
          pointSize={8}
          pointColor={{ theme: 'background' }}
          pointBorderWidth={2}
          pointBorderColor={{ from: 'serieColor' }}
          pointLabelYOffset={-12}
          useMesh={true}
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
          enableSlices="x"
          sliceTooltip={({ slice }) => {
            return (
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
                <div className="text-sm font-medium">
                  {String(slice.points[0].data.x)}
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
            )
          }}
          enableArea={true}
          areaOpacity={0.07}
        />
      </div>

      <div className="mt-3 rounded-md bg-blue-50 p-2">
        <p className="text-text-dark text-sm">
          <span className="font-medium">Forecast:</span> Q3 growth:
          <span className="text-status-optimal ml-1 font-medium">
            +{growthQ3}%
          </span>
          , Q4 growth:
          <span className="text-status-optimal ml-1 font-medium">
            +{growthQ4}%
          </span>
          year-over-year
        </p>
      </div>
    </Card>
  )
}
