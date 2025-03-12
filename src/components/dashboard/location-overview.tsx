'use client'
import { ResponsiveBar } from '@nivo/bar'
import Card from '~/components/ui/card'

interface LocationStatusData {
  location: string
  optimal: number
  warning: number
  critical: number
  locationColor: string
  [key: string]: string | number
}

export default function LocationOverview() {
  // Mock data - would come from API in real implementation
  const locationData: LocationStatusData[] = [
    {
      location: 'West',
      optimal: 5,
      warning: 3,
      critical: 2,
      locationColor: '#2196F3',
    },
    {
      location: 'South',
      optimal: 4,
      warning: 2,
      critical: 1,
      locationColor: '#9C27B0',
    },
    {
      location: 'Heartland',
      optimal: 3,
      warning: 3,
      critical: 1,
      locationColor: '#FF9800',
    },
  ]

  return (
    <Card title="Location Overview" subtitle="Component status by location">
      <div className="h-56">
        <ResponsiveBar
          data={locationData}
          keys={['optimal', 'warning', 'critical']}
          indexBy="location"
          margin={{ top: 10, right: 10, bottom: 40, left: 40 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={({ id }) => {
            if (id === 'optimal') return '#38A169'
            if (id === 'warning') return '#ED8936'
            return '#E53E3E' // critical
          }}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Location',
            legendPosition: 'middle',
            legendOffset: 32,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Components',
            legendPosition: 'middle',
            legendOffset: -32,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          legends={[
            {
              dataFrom: 'keys',
              anchor: 'bottom',
              direction: 'row',
              justify: false,
              translateX: 0,
              translateY: 40,
              itemsSpacing: 2,
              itemWidth: 100,
              itemHeight: 20,
              itemDirection: 'left-to-right',
              itemOpacity: 0.85,
              symbolSize: 20,
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemOpacity: 1,
                  },
                },
              ],
            },
          ]}
          tooltip={({ id, value, color, indexValue }) => (
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
              <div className="flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{ backgroundColor: color }}
                ></div>
                <span className="font-medium">
                  {id === 'optimal'
                    ? 'Optimal'
                    : id === 'warning'
                      ? 'Needs Adjustment'
                      : 'Critical'}
                </span>
              </div>
              <div className="mt-1 text-sm">
                <span>
                  {value} components in {indexValue}
                </span>
              </div>
            </div>
          )}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4">
        {locationData.map((location) => (
          <div key={location.location} className="text-center">
            <h3
              className="text-sm font-medium"
              style={{ color: location.locationColor }}
            >
              {location.location}
            </h3>
            <p className="text-text-medium text-xs">
              {location.critical > 0 ? (
                <span className="text-status-critical">
                  {location.critical} critical
                </span>
              ) : (
                'All components OK'
              )}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
