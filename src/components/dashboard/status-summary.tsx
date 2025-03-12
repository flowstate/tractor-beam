'use client'

import { ResponsivePie } from '@nivo/pie'
import Card from '~/components/ui/card'

interface StatusCount {
  id: string
  label: string
  value: number
  color: string
}

export default function StatusSummary() {
  // Mock data - would come from API in real implementation
  const statusData: StatusCount[] = [
    { id: 'optimal', label: 'Optimal', value: 12, color: '#38A169' },
    { id: 'warning', label: 'Needs Adjustment', value: 8, color: '#ED8936' },
    { id: 'critical', label: 'Critical', value: 4, color: '#E53E3E' },
  ]

  const totalComponents = statusData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card
      title="Component Status"
      subtitle="Current inventory status across all components"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Status counts */}
        <div className="flex flex-col space-y-3">
          {statusData.map((status) => (
            <div key={status.id} className="flex items-center">
              <div
                className="mr-2 h-4 w-4 rounded-full"
                style={{ backgroundColor: status.color }}
              ></div>
              <div className="flex-1">
                <span className="text-text-medium text-sm">{status.label}</span>
              </div>
              <div className="flex items-baseline">
                <span
                  className="text-2xl font-bold"
                  style={{ color: status.color }}
                >
                  {status.value}
                </span>
                <span className="text-text-medium ml-1 text-xs">
                  ({Math.round((status.value / totalComponents) * 100)}%)
                </span>
              </div>
            </div>
          ))}

          <div className="border-t border-gray-200 pt-2">
            <div className="flex items-center">
              <div className="flex-1">
                <span className="text-text-dark text-sm font-medium">
                  Total
                </span>
              </div>
              <div>
                <span className="text-text-dark text-2xl font-bold">
                  {totalComponents}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Pie chart */}
        <div className="h-56 md:col-span-2">
          <ResponsivePie
            data={statusData}
            margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
            innerRadius={0.6}
            padAngle={0.5}
            cornerRadius={3}
            activeOuterRadiusOffset={8}
            colors={{ datum: 'data.color' }}
            borderWidth={1}
            borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#333333"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: 'color' }}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
            legends={[]}
            animate={true}
            motionConfig="gentle"
            tooltip={({ datum }) => (
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2 shadow-md">
                <div className="flex items-center">
                  <div
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: datum.color }}
                  ></div>
                  <span className="font-medium">{datum.label}</span>
                </div>
                <div className="mt-1 text-sm">
                  <span>
                    {datum.value} components (
                    {Math.round((datum.value / totalComponents) * 100)}%)
                  </span>
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {statusData[2].value > 0 && (
        <div className="text-status-critical mt-3 text-sm">
          <p className="font-medium">
            {statusData[2].value} components require immediate attention.
          </p>
        </div>
      )}
    </Card>
  )
}
