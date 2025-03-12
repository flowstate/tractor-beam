'use client'

import { ResponsiveRadar } from '@nivo/radar'

interface SupplierPerformance {
  metric: string
  Elite: number
  Crank: number
  Atlas: number
  Bolt: number
  Dynamo: number
  [key: string]: string | number
}

export default function SupplierPerformanceChart() {
  // Mock data - would come from API in real implementation
  const supplierPerformanceData: SupplierPerformance[] = [
    {
      metric: 'Quality',
      Elite: 95,
      Crank: 85,
      Atlas: 75,
      Bolt: 70,
      Dynamo: 80,
    },
    {
      metric: 'Lead Time',
      Elite: 80,
      Crank: 90,
      Atlas: 75,
      Bolt: 65,
      Dynamo: 70,
    },
    {
      metric: 'Cost Efficiency',
      Elite: 65,
      Crank: 80,
      Atlas: 90,
      Bolt: 95,
      Dynamo: 75,
    },
    {
      metric: 'Reliability',
      Elite: 90,
      Crank: 85,
      Atlas: 70,
      Bolt: 65,
      Dynamo: 75,
    },
    {
      metric: 'Flexibility',
      Elite: 75,
      Crank: 85,
      Atlas: 70,
      Bolt: 80,
      Dynamo: 90,
    },
  ]

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Supplier Performance
      </h2>
      <div className="h-80">
        <ResponsiveRadar
          data={supplierPerformanceData}
          keys={['Elite', 'Crank', 'Atlas', 'Bolt', 'Dynamo']}
          indexBy="metric"
          valueFormat=">-.2f"
          margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
          borderColor={{ from: 'color' }}
          gridLabelOffset={36}
          dotSize={10}
          dotColor={{ theme: 'background' }}
          dotBorderWidth={2}
          colors={['#1565C0', '#00897B', '#795548', '#5E35B1', '#D81B60']}
          blendMode="multiply"
          motionConfig="gentle"
          legends={[
            {
              anchor: 'top',
              direction: 'row',
              translateX: 0,
              translateY: -50,
              itemWidth: 80,
              itemHeight: 20,
              itemTextColor: '#999',
              symbolSize: 12,
              symbolShape: 'circle',
              effects: [
                {
                  on: 'hover',
                  style: {
                    itemTextColor: '#000',
                  },
                },
              ],
            },
          ]}
        />
      </div>
      <div className="mt-4 text-sm text-gray-500">
        <p>Quality and lead time metrics for selected suppliers.</p>
      </div>
    </div>
  )
}
