import React from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api } from '~/trpc/react'

export const MarketTrendChart: React.FC = () => {
  const { data, isLoading, error } =
    api.historicals.getMarketTrendData.useQuery()

  if (isLoading) return <div>Loading market trend data...</div>
  if (error) return <div>Error loading data: {error.message}</div>
  if (!data || data.length === 0)
    return <div>No market trend data available</div>

  // Format data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString(),
    marketTrendIndex: item.marketTrendIndex,
  }))

  // For large datasets, we might want to sample the data
  // This simple approach takes every nth point to reduce to ~300 points
  // const sampledData = chartData.filter(
  //   (_, index) => index % Math.ceil(chartData.length / 300) === 0
  // )

  return (
    <div className="w-full">
      <h2 className="mb-6 text-xl font-bold">Market Trend Index Over Time</h2>
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              interval={Math.floor(chartData.length / 10)}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10 }}
              label={{
                value: 'Market Trend Index',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: '12px' },
                offset: -10,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: '4px',
              }}
            />
            <Line
              type="monotone"
              dataKey="marketTrendIndex"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
