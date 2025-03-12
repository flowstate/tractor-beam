// src/app/_components/charts/model-demand-chart.tsx
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

interface ModelDemandChartProps {
  locationId: string
}

// Colors for different models
const MODEL_COLORS = [
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
  [modelId: string]: string | number // Model IDs will map to numbers
}

export const ModelDemandChart: React.FC<ModelDemandChartProps> = ({
  locationId,
}) => {
  const [topModelsCount, setTopModelsCount] = useState(5)

  const { data, isLoading, error } = api.historicals.getModelDemand.useQuery({
    locationId,
  })

  if (isLoading) return <div>Loading model demand data...</div>
  if (error) return <div>Error loading data: {error.message}</div>
  if (!data || data.length === 0)
    return <div>No model demand data available</div>

  // Calculate total demand per model to identify top models
  const modelTotals: Record<string, number> = {}
  const allModelIds = new Set<string>()

  // Process data for the chart - transform to format expected by recharts
  const chartData = data.map(
    (day: { date: Date; demand: Record<string, number> }) => {
      // Create a new object with date and all model demands
      // Convert Date to string for recharts
      const result: ChartDataPoint = {
        date: day.date.toISOString(),
      }

      // Add each model's demand to the result object
      Object.entries(day.demand).forEach(([modelId, units]) => {
        result[modelId] = units

        // Track model IDs and accumulate totals for statistics
        allModelIds.add(modelId)
        modelTotals[modelId] = (modelTotals[modelId] || 0) + units
      })

      return result
    }
  )

  // Get top N models by total demand
  const topModels = Object.entries(modelTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topModelsCount)
    .map(([id]) => id)

  // Calculate summary statistics
  const modelStats = Array.from(allModelIds).reduce(
    (acc, modelId) => {
      const values = chartData.map((day: ChartDataPoint) =>
        Number(day[modelId] || 0)
      )
      const sum = values.reduce((a: number, b: number) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)

      acc[modelId] = {
        total: sum,
        average: avg,
        max: max,
      }

      return acc
    },
    {} as Record<string, { total: number; average: number; max: number }>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Daily Model Demand</h3>
        <div className="flex items-center space-x-2">
          <label htmlFor="topModels" className="text-sm">
            Top Models:
          </label>
          <select
            id="topModels"
            className="rounded border border-gray-300 px-2 py-1 text-sm"
            value={topModelsCount}
            onChange={(e) => setTopModelsCount(Number(e.target.value))}
          >
            {[3, 5, 10, 'All'].map((value) => (
              <option
                key={value}
                value={typeof value === 'number' ? value : allModelIds.size}
              >
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary statistics */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-medium">
          Summary Statistics (Daily Average)
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {topModels.map((modelId, index) => (
            <div key={modelId} className="rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: MODEL_COLORS[index % MODEL_COLORS.length],
                  }}
                />
                <span className="text-xs font-medium">Model {modelId}</span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {modelStats[modelId].average.toFixed(1)} units
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Max: {modelStats[modelId].max} units
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
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value + ' units',
                `Model ${name}`,
              ]}
              labelFormatter={(dateStr: string) =>
                new Date(dateStr).toLocaleDateString()
              }
            />
            <Legend formatter={(value: string) => `Model ${value}`} />

            {topModels.map((modelId, index) => (
              <Area
                key={modelId}
                type="monotone"
                dataKey={modelId}
                stackId="1"
                stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
                fill={MODEL_COLORS[index % MODEL_COLORS.length]}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
