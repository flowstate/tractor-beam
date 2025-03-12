import React, { useState } from 'react'
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Bar,
  ReferenceLine,
  Brush,
} from 'recharts'
import { api } from '~/trpc/react'

interface DeliveryLeadTimesChartProps {
  locationId: string
}

// Colors for different suppliers/components
const COLORS = [
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
  [key: string]: string | number // Supplier or component IDs will map to numbers (lead time variance)
}

// For scatter plot data
interface ScatterDataPoint {
  x: number // Order size
  y: number // Lead time variance
  z: number // For bubble size (can represent frequency)
  name: string // Supplier or component name
  date: string // Date of delivery
}

export const DeliveryLeadTimesChart: React.FC<DeliveryLeadTimesChartProps> = ({
  locationId,
}) => {
  const [viewMode, setViewMode] = useState<
    'trend' | 'scatter' | 'distribution'
  >('trend')
  const [groupBy, setGroupBy] = useState<'supplier' | 'component'>('supplier')
  const [topItemsCount, setTopItemsCount] = useState(5)

  const { data, isLoading, error } =
    api.historicals.getDeliveryLeadTimes.useQuery({
      locationId,
    })

  if (isLoading) return <div>Loading delivery lead time data...</div>
  if (error) return <div>Error loading data: {error.message}</div>
  if (!data || data.length === 0)
    return <div>No delivery lead time data available</div>

  // Track totals, names, and relationships
  const itemTotals: Record<
    string,
    { count: number; sumVariance: number; sumAbsVariance: number }
  > = {}
  const allItemIds = new Set<string>()
  const componentNames: Record<string, string> = {}
  const supplierComponents: Record<string, Set<string>> = {}
  const componentSuppliers: Record<string, Set<string>> = {}

  // For scatter plot
  const scatterData: ScatterDataPoint[] = []

  // For distribution analysis
  const varianceDistribution: Record<string, number[]> = {}
  const orderSizeDistribution: Record<string, number[]> = {}

  // Process data for the trend chart
  const trendChartData = data.map((day) => {
    // Create a new object with date and all lead time variances
    const result: ChartDataPoint = {
      date: day.date.toISOString(),
    }

    // Group lead time variances by supplier or component
    const groupedVariances: Record<string, { sum: number; count: number }> = {}

    // Process each delivery
    day.deliveries.forEach((delivery) => {
      const componentId = delivery.component.id
      const supplierId = delivery.supplier.id
      const leadTimeVariance = delivery.leadTimeVariance
      const orderSize = delivery.orderSize

      // Store component name for display
      componentNames[componentId] = delivery.component.name

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

      // Initialize item totals if needed
      if (!itemTotals[key]) {
        itemTotals[key] = { count: 0, sumVariance: 0, sumAbsVariance: 0 }
      }

      // Update item totals
      itemTotals[key].count += 1
      itemTotals[key].sumVariance += leadTimeVariance
      itemTotals[key].sumAbsVariance += Math.abs(leadTimeVariance)

      // Initialize grouped variances if needed
      if (!groupedVariances[key]) {
        groupedVariances[key] = { sum: 0, count: 0 }
      }

      // Update grouped variances
      groupedVariances[key].sum += leadTimeVariance
      groupedVariances[key].count += 1

      // Track IDs for statistics
      allItemIds.add(key)

      // Add to scatter data
      scatterData.push({
        x: orderSize,
        y: leadTimeVariance,
        z: 1, // Default size
        name: key,
        date: day.date.toISOString(),
      })

      // Add to distribution data
      if (!varianceDistribution[key]) {
        varianceDistribution[key] = []
      }
      varianceDistribution[key].push(leadTimeVariance)

      if (!orderSizeDistribution[key]) {
        orderSizeDistribution[key] = []
      }
      orderSizeDistribution[key].push(orderSize)
    })

    // Calculate average lead time variance for each group
    Object.entries(groupedVariances).forEach(([key, { sum, count }]) => {
      if (count > 0) {
        result[key] = sum / count
      }
    })

    return result
  })

  // Get top N items by total absolute variance (indicates volatility)
  const topItems = Object.entries(itemTotals)
    .sort(
      (a, b) =>
        b[1].sumAbsVariance / b[1].count - a[1].sumAbsVariance / a[1].count
    )
    .slice(0, topItemsCount)
    .map(([id]) => id)

  // Filter scatter data to only include top items
  const filteredScatterData = scatterData.filter((point) =>
    topItems.includes(point.name)
  )

  // Calculate statistics for each item
  const itemStats = Array.from(allItemIds).reduce(
    (acc, itemId) => {
      if (itemTotals[itemId]) {
        const count = itemTotals[itemId].count
        const avgVariance = itemTotals[itemId].sumVariance / count
        const avgAbsVariance = itemTotals[itemId].sumAbsVariance / count

        // Calculate standard deviation of variance
        const variances = varianceDistribution[itemId] || []
        const meanVariance =
          variances.reduce((sum, v) => sum + v, 0) / (variances.length || 1)
        const varianceSquaredDiffs = variances.map((v) =>
          Math.pow(v - meanVariance, 2)
        )
        const varianceStdDev = Math.sqrt(
          varianceSquaredDiffs.reduce((sum, v) => sum + v, 0) /
            (variances.length || 1)
        )

        // Calculate min/max variance
        const minVariance = variances.length ? Math.min(...variances) : 0
        const maxVariance = variances.length ? Math.max(...variances) : 0

        // Calculate order size statistics
        const orderSizes = orderSizeDistribution[itemId] || []
        const avgOrderSize =
          orderSizes.reduce((sum, s) => sum + s, 0) / (orderSizes.length || 1)

        acc[itemId] = {
          count,
          avgVariance,
          avgAbsVariance,
          varianceStdDev,
          minVariance,
          maxVariance,
          avgOrderSize,
        }
      }
      return acc
    },
    {} as Record<
      string,
      {
        count: number
        avgVariance: number
        avgAbsVariance: number
        varianceStdDev: number
        minVariance: number
        maxVariance: number
        avgOrderSize: number
      }
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

  // Prepare distribution data for the histogram-like view
  const prepareDistributionData = () => {
    // Create bins for lead time variance
    const bins = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]
    const distributionData = bins.map((bin) => {
      const result: Record<string, number> = { bin }

      topItems.forEach((itemId) => {
        const variances = varianceDistribution[itemId] || []
        const count = variances.filter((v) => v >= bin && v < bin + 2).length
        result[itemId] = count
      })

      return result
    })

    return distributionData
  }

  const distributionData = prepareDistributionData()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Delivery Lead Time Variance</h3>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="viewMode" className="text-sm">
              View:
            </label>
            <select
              id="viewMode"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={viewMode}
              onChange={(e) =>
                setViewMode(
                  e.target.value as 'trend' | 'scatter' | 'distribution'
                )
              }
            >
              <option value="trend">Trend Over Time</option>
              <option value="scatter">Order Size vs Variance</option>
              <option value="distribution">Variance Distribution</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="groupBy" className="text-sm">
              Group by:
            </label>
            <select
              id="groupBy"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
              value={groupBy}
              onChange={(e) =>
                setGroupBy(e.target.value as 'supplier' | 'component')
              }
            >
              <option value="supplier">Supplier</option>
              <option value="component">Component</option>
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
          Lead Time Variance Statistics
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {topItems.map((itemId, index) => (
            <div key={itemId} className="rounded-md bg-white p-3 shadow-sm">
              <div className="flex items-center">
                <div
                  className="mr-2 h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
                <span className="text-xs font-medium">
                  {getDisplayName(itemId)}
                </span>
              </div>
              <div className="mt-1 text-lg font-semibold">
                {itemStats[itemId].avgVariance.toFixed(1)} days
              </div>
              <div className="mt-1 flex flex-col text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>
                    Abs Variance: {itemStats[itemId].avgAbsVariance.toFixed(1)}{' '}
                    days
                  </span>
                  <span>
                    StdDev: {itemStats[itemId].varianceStdDev.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Min: {itemStats[itemId].minVariance.toFixed(1)}</span>
                  <span>Max: {itemStats[itemId].maxVariance.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Avg Order: {Math.round(itemStats[itemId].avgOrderSize)}{' '}
                    units
                  </span>
                  <span>
                    {groupBy === 'component' ? 'Suppliers' : 'Components'}:{' '}
                    {getRelationshipCount(itemId)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[500px]">
        {viewMode === 'trend' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={trendChartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(dateStr: string) =>
                  new Date(dateStr).toLocaleDateString()
                }
                interval={Math.floor(trendChartData.length / 10)}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{
                  value: 'Lead Time Variance (days)',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} days`,
                  getDisplayName(name),
                ]}
                labelFormatter={(dateStr: string) =>
                  new Date(dateStr).toLocaleDateString()
                }
              />
              <Legend formatter={(value: string) => getDisplayName(value)} />
              <ReferenceLine y={0} stroke="#000" />
              <Brush dataKey="date" height={30} stroke="#8884d8" />

              {topItems.map((itemId, index) => (
                <Line
                  key={itemId}
                  type="monotone"
                  dataKey={itemId}
                  stroke={COLORS[index % COLORS.length]}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'scatter' && (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
              <CartesianGrid />
              <XAxis
                type="number"
                dataKey="x"
                name="Order Size"
                label={{ value: 'Order Size (units)', position: 'bottom' }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Lead Time Variance"
                label={{
                  value: 'Lead Time Variance (days)',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <ZAxis type="number" dataKey="z" range={[50, 500]} />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Order Size') return [`${value} units`, name]
                  if (name === 'Lead Time Variance')
                    return [`${value.toFixed(1)} days`, name]
                  return [value, name]
                }}
              />
              <Legend formatter={(value: string) => getDisplayName(value)} />
              <ReferenceLine y={0} stroke="#000" />

              {topItems.map((itemId, index) => (
                <Scatter
                  key={itemId}
                  name={getDisplayName(itemId)}
                  data={filteredScatterData.filter((d) => d.name === itemId)}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        )}

        {viewMode === 'distribution' && (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={distributionData}
              margin={{ top: 20, right: 20, bottom: 30, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="bin"
                label={{
                  value: 'Lead Time Variance (days)',
                  position: 'bottom',
                }}
              />
              <YAxis
                label={{
                  value: 'Frequency',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === 'bin') return [`${value} days`, 'Variance Bin']
                  return [`${value} deliveries`, getDisplayName(name)]
                }}
              />
              <Legend
                formatter={(value: string) =>
                  value === 'bin' ? 'Variance Bin' : getDisplayName(value)
                }
              />
              <ReferenceLine x={0} stroke="#000" />

              {topItems.map((itemId, index) => (
                <Bar
                  key={itemId}
                  dataKey={itemId}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
