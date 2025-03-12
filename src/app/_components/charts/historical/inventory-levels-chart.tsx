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
  BarChart,
  Bar,
} from 'recharts'
import { api } from '~/trpc/react'

interface InventoryLevelsChartProps {
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
  [key: string]: string | number // Component or supplier IDs will map to numbers (quantities)
}

export const InventoryLevelsChart: React.FC<InventoryLevelsChartProps> = ({
  locationId,
}) => {
  const [topItemsCount, setTopItemsCount] = useState(5)
  const [groupBy, setGroupBy] = useState<'component' | 'supplier'>('component')
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  const { data, isLoading, error } =
    api.historicals.getInventoryLevels.useQuery({
      locationId,
    })

  if (isLoading) return <div>Loading inventory level data...</div>
  if (error) return <div>Error loading data: {error.message}</div>
  if (!data || data.length === 0)
    return <div>No inventory level data available</div>

  // Track totals, names, and relationships
  const itemTotals: Record<string, number> = {}
  const allItemIds = new Set<string>()
  const componentNames: Record<string, string> = {}
  const supplierComponents: Record<string, Set<string>> = {}
  const componentSuppliers: Record<string, Set<string>> = {}

  // Process data for the chart - transform to format expected by recharts
  const chartData = data.map((day) => {
    // Create a new object with date and all inventory levels
    const result: ChartDataPoint = {
      date: day.date.toISOString(),
    }

    // Group quantities by component or supplier
    const groupedQuantities: Record<string, number> = {}

    // Process each inventory entry
    day.inventory.forEach((item) => {
      const componentId = item.component.id
      const supplierId = item.supplier.id
      const quantity = item.quantity

      // Store component name for display
      componentNames[componentId] = item.component.name

      // Track relationships between components and suppliers
      if (!supplierComponents[supplierId]) {
        supplierComponents[supplierId] = new Set()
      }
      supplierComponents[supplierId].add(componentId)

      if (!componentSuppliers[componentId]) {
        componentSuppliers[componentId] = new Set()
      }
      componentSuppliers[componentId].add(supplierId)

      // Determine the key based on grouping preference
      const key =
        groupBy === 'supplier'
          ? `supplier-${supplierId}`
          : `component-${componentId}`

      // Aggregate quantities
      groupedQuantities[key] = (groupedQuantities[key] || 0) + quantity

      // Track IDs for statistics
      allItemIds.add(key)
    })

    // Add grouped quantities to the result
    Object.entries(groupedQuantities).forEach(([key, quantity]) => {
      result[key] = quantity
      itemTotals[key] = (itemTotals[key] || 0) + quantity
    })

    return result
  })

  // Get top N items by total quantity
  const topItems = Object.entries(itemTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topItemsCount)
    .map(([id]) => id)

  // Calculate summary statistics
  const itemStats = Array.from(allItemIds).reduce(
    (acc, itemId) => {
      const values = chartData.map((day: ChartDataPoint) =>
        Number(day[itemId] || 0)
      )
      const sum = values.reduce((a: number, b: number) => a + b, 0)
      const avg = sum / values.length
      const max = Math.max(...values)
      const min = Math.min(...values.filter((v) => v > 0)) // Minimum non-zero value

      acc[itemId] = {
        total: sum,
        average: avg,
        max: max,
        min: min || 0,
      }

      return acc
    },
    {} as Record<
      string,
      { total: number; average: number; max: number; min: number }
    >
  )

  // Format display name based on grouping mode
  const getDisplayName = (id: string) => {
    if (id.startsWith('supplier-')) {
      const supplierId = id.replace('supplier-', '')
      return `Supplier ${supplierId}`
    } else if (id.startsWith('component-')) {
      const componentId = id.replace('component-', '')
      return componentNames[componentId] || `Component ${componentId}`
    }
    return id
  }

  // Get the number of suppliers for a component or components for a supplier
  const getRelationshipCount = (id: string) => {
    if (id.startsWith('supplier-')) {
      const supplierId = id.replace('supplier-', '')
      return supplierComponents[supplierId]?.size || 0
    } else if (id.startsWith('component-')) {
      const componentId = id.replace('component-', '')
      return componentSuppliers[componentId]?.size || 0
    }
    return 0
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Inventory Levels</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="groupBy" className="text-sm">
              Group by:
            </label>
            <select
              id="groupBy"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as 'component' | 'supplier')
              }
            >
              <option value="component">Component</option>
              <option value="supplier">Supplier</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="chartType" className="text-sm">
              Chart Type:
            </label>
            <select
              id="chartType"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={chartType}
              onChange={(e) => setChartType(e.target.value as 'area' | 'bar')}
            >
              <option value="area">Area</option>
              <option value="bar">Bar</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="topItems" className="text-sm">
              Top Items:
            </label>
            <select
              id="topItems"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={topItemsCount}
              onChange={(e) => setTopItemsCount(Number(e.target.value))}
            >
              {[3, 5, 10, 'All'].map((value) => (
                <option
                  key={value}
                  value={typeof value === 'number' ? value : allItemIds.size}
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
          Summary Statistics (Daily Average Inventory)
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {topItems.map((itemId, index) => (
            <div key={itemId} className="rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{
                    backgroundColor:
                      COMPONENT_COLORS[index % COMPONENT_COLORS.length],
                  }}
                />
                <span className="text-xs font-medium">
                  {getDisplayName(itemId)}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {Math.round(itemStats[itemId].average)} units
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-500">
                <span>Min: {itemStats[itemId].min} units</span>
                <span>Max: {itemStats[itemId].max} units</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {groupBy === 'component' ? 'Suppliers' : 'Components'}:{' '}
                {getRelationshipCount(itemId)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
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
                  `${value} units`,
                  getDisplayName(name),
                ]}
                labelFormatter={(dateStr: string) =>
                  new Date(dateStr).toLocaleDateString()
                }
              />
              <Legend formatter={(value: string) => getDisplayName(value)} />

              {topItems.map((itemId, index) => (
                <Area
                  key={itemId}
                  type="monotone"
                  dataKey={itemId}
                  stackId="1"
                  stroke={COMPONENT_COLORS[index % COMPONENT_COLORS.length]}
                  fill={COMPONENT_COLORS[index % COMPONENT_COLORS.length]}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart
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
                  `${value} units`,
                  getDisplayName(name),
                ]}
                labelFormatter={(dateStr: string) =>
                  new Date(dateStr).toLocaleDateString()
                }
              />
              <Legend formatter={(value: string) => getDisplayName(value)} />

              {topItems.map((itemId, index) => (
                <Bar
                  key={itemId}
                  dataKey={itemId}
                  stackId="a"
                  fill={COMPONENT_COLORS[index % COMPONENT_COLORS.length]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
