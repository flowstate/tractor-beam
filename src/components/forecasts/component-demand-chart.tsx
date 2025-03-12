'use client'

import { ResponsiveBar } from '@nivo/bar'

interface ComponentDemand {
  component: string
  'Current Quarter': number
  'Next Quarter': number
  [key: string]: string | number
}

export default function ComponentDemandChart() {
  // Mock data - would come from API in real implementation
  const componentDemandData: ComponentDemand[] = [
    {
      component: 'ENGINE-A',
      'Current Quarter': 2500,
      'Next Quarter': 2800,
    },
    {
      component: 'ENGINE-B',
      'Current Quarter': 3200,
      'Next Quarter': 3600,
    },
    {
      component: 'CHASSIS-BASIC',
      'Current Quarter': 4100,
      'Next Quarter': 4500,
    },
    {
      component: 'CHASSIS-PREMIUM',
      'Current Quarter': 1800,
      'Next Quarter': 2200,
    },
    {
      component: 'HYDRAULICS-SMALL',
      'Current Quarter': 2900,
      'Next Quarter': 3100,
    },
    {
      component: 'HYDRAULICS-MEDIUM',
      'Current Quarter': 3500,
      'Next Quarter': 4000,
    },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Component Demand Forecast
      </h2>
      <div className="h-80">
        <ResponsiveBar
          data={componentDemandData}
          keys={['Current Quarter', 'Next Quarter']}
          indexBy="component"
          margin={{ top: 20, right: 20, bottom: 50, left: 60 }}
          padding={0.3}
          groupMode="grouped"
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={['#2196F3', '#4CAF50']}
          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: -45,
            legend: 'Component',
            legendPosition: 'middle',
            legendOffset: 40,
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Demand (units)',
            legendPosition: 'middle',
            legendOffset: -50,
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
              translateY: 50,
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
                <span className="font-medium">{id}</span>
              </div>
              <div className="mt-1 text-sm">
                <span>
                  {value.toLocaleString()} units of {indexValue}
                </span>
              </div>
            </div>
          )}
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>Derived component demand based on forecasted model demand.</p>
      </div>
    </div>
  )
}
