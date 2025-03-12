import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { api } from '~/trpc/react'

interface ComponentFailuresChartProps {
  locationId: string
}

// Colors for different components
const COMPONENT_COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff8042',
  '#0088fe',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#a4de6c',
  '#d0ed57',
]

// Process data for the chart - transform to format expected by recharts
interface ChartDataPoint {
  date: string // Use string for date in chart data
  [componentId: string]: string | number // Component IDs will map to numbers (failure rates)
}

export const ComponentFailuresChart: React.FC<ComponentFailuresChartProps> = ({
  locationId,
}) => {
  const [topComponentsCount, setTopComponentsCount] = useState(5)
  const [groupBySupplier, setGroupBySupplier] = useState(false)

  const { data, isLoading, error } =
    api.historicals.getComponentFailures.useQuery({
      locationId,
    })

  if (isLoading) return <div>Loading component failure data...</div>
  if (error) return <div>Error loading data: {error.message}</div>
  if (!data || data.length === 0)
    return <div>No component failure data available</div>

  // Calculate total failures per component to identify top components
  const componentTotals: Record<string, number> = {}
  const allComponentIds = new Set<string>()
  const componentNames: Record<string, string> = {}
  const supplierComponents: Record<string, Set<string>> = {}

  // Process data for the chart - transform to format expected by recharts
  const chartData = data.map((day) => {
    // Create a new object with date and all component failures
    const result: ChartDataPoint = {
      date: day.date.toISOString(),
    }

    // Add each component's failure rate to the result object
    day.failures.forEach((failure) => {
      const componentId = failure.component.id
      const supplierId = failure.supplier.id
      const failureRate = failure.failureRate

      // Store component name for display
      componentNames[componentId] = failure.component.name

      // Track component by supplier
      if (!supplierComponents[supplierId]) {
        supplierComponents[supplierId] = new Set()
      }
      supplierComponents[supplierId].add(componentId)

      // If grouping by supplier, use supplier ID as the key
      const key = groupBySupplier ? `${supplierId}` : componentId

      // For supplier grouping, aggregate failure rates
      if (groupBySupplier) {
        result[key] = ((result[key] as number) || 0) + failureRate
      } else {
        result[key] = failureRate
      }

      // Track component IDs and accumulate totals for statistics
      allComponentIds.add(key)
      componentTotals[key] = (componentTotals[key] || 0) + failureRate
    })

    return result
  })

  // Get top N components by total failure rate
  const topComponents = Object.entries(componentTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topComponentsCount)
    .map(([id]) => id)

  // Calculate summary statistics
  const componentStats = Array.from(allComponentIds).reduce(
    (acc, componentId) => {
      const values = chartData.map((day: ChartDataPoint) =>
        Number(day[componentId] || 0)
      )
      const sum = values.reduce((a: number, b: number) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)

      acc[componentId] = {
        total: sum,
        average: avg,
        max: max,
      }

      return acc
    },
    {} as Record<string, { total: number; average: number; max: number }>
  )

  // Format display name based on grouping mode
  const getDisplayName = (id: string) => {
    return groupBySupplier
      ? `Supplier ${id}`
      : componentNames[id] || `Component ${id}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Component Failure Rates</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="groupBySupplier" className="text-sm">
              Group by Supplier:
            </label>
            <input
              id="groupBySupplier"
              type="checkbox"
              checked={groupBySupplier}
              onChange={(e) => setGroupBySupplier(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="topComponents" className="text-sm">
              Top Components:
            </label>
            <select
              id="topComponents"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={topComponentsCount}
              onChange={(e) => setTopComponentsCount(Number(e.target.value))}
            >
              {[3, 5, 10, 'All'].map((value) => (
                <option
                  key={value}
                  value={
                    typeof value === 'number' ? value : allComponentIds.size
                  }
                >
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-medium">
          Summary Statistics (Daily Average Failure Rate)
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {topComponents.map((componentId, index) => (
            <div
              key={componentId}
              className="rounded-md bg-white p-3 shadow-sm"
            >
              <div className="flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      COMPONENT_COLORS[index % COMPONENT_COLORS.length],
                  }}
                />
                <span className="text-xs font-medium">
                  {getDisplayName(componentId)}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {(componentStats[componentId].average * 100).toFixed(2)}%
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Max: {(componentStats[componentId].max * 100).toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickFormatter={(dateStr: string) =>
                new Date(dateStr).toLocaleDateString()
              }
              interval={Math.floor(chartData.length / 10)}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                `${(value * 100).toFixed(2)}%`,
                getDisplayName(name),
              ]}
              labelFormatter={(dateStr: string) =>
                new Date(dateStr).toLocaleDateString()
              }
            />
            <Legend formatter={(value: string) => getDisplayName(value)} />

            {topComponents.map((componentId, index) => (
              <Area
                key={componentId}
                type="monotone"
                dataKey={componentId}
                stackId="1"
                stroke={COMPONENT_COLORS[index % COMPONENT_COLORS.length]}
                fill={COMPONENT_COLORS[index % COMPONENT_COLORS.length]}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
