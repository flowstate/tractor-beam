'use client'

import { format, parseISO } from 'date-fns'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SavedDemandForecast } from '~/lib/prediction/prediction.types'
import { type LocationId, type TractorModelId } from '~/lib/types/types'

interface DemandForecastChartProps {
  forecast: SavedDemandForecast | undefined
  isLoading: boolean
  locationId?: LocationId
  modelId?: TractorModelId
}

export function DemandForecastChart({
  forecast,
  isLoading,
}: DemandForecastChartProps) {
  if (isLoading) {
    return <div className="p-4 text-center">Loading forecast...</div>
  }

  if (!forecast) {
    return <div className="p-4 text-center">No forecast data available</div>
  }

  // Combine historical and forecast data for the chart
  const today = new Date().toISOString().split('T')[0]

  // Prepare data for the chart
  const chartData = [
    // Historical data
    ...forecast.historicalData.map((point) => ({
      date: point.date,
      historical: point.demand,
      forecast: null,
      lower: null,
      upper: null,
    })),
    // Forecast data
    ...forecast.forecastData.map((point) => ({
      date: point.date,
      historical: null,
      forecast: point.value,
      lower: point.lower,
      upper: point.upper,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d')
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateStr
    }
  }

  // Get summary metrics
  const summary = forecast.summary

  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold">
        Demand Forecast
        {forecast.modelId && `: ${forecast.modelId}`}
        {forecast.locationId && ` in ${forecast.locationId}`}
      </h3>

      {/* Recharts Line Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={50} />
            <YAxis />
            <Tooltip
              labelFormatter={(label) => formatDate(label as string)}
              formatter={(value, name) => {
                if (value === null) return ['-', '']

                const valueStr = String(value)
                if (name === 'historical')
                  return [`Historical: ${valueStr}`, '']
                if (name === 'forecast') return [`Forecast: ${valueStr}`, '']
                if (name === 'lower') return [`Lower Bound: ${valueStr}`, '']
                if (name === 'upper') return [`Upper Bound: ${valueStr}`, '']
                return [valueStr, String(name)]
              }}
            />
            <Legend />
            <ReferenceLine x={today} stroke="red" label="Today" />
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#8884d8"
              name="Historical"
              strokeWidth={2}
              dot={{ r: 1 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#82ca9d"
              name="Forecast"
              strokeWidth={2}
              dot={{ r: 1 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="upper"
              stroke="#ffc658"
              name="Upper Bound"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="lower"
              stroke="#ff8042"
              name="Lower Bound"
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Display forecast summary */}
      <div className="mt-4">
        <h4 className="mb-2 font-medium">Forecast Summary</h4>
        <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
          <div>Next 30 days avg:</div>
          <div className="font-medium">{summary.next30DaysAvg.toFixed(2)}</div>

          <div>90 days avg:</div>
          <div className="font-medium">{summary.next90DaysAvg.toFixed(2)}</div>

          <div>Peak demand:</div>
          <div className="font-medium">{summary.peakDemand.toFixed(2)}</div>

          <div>Seasonality strength:</div>
          <div className="font-medium">
            {(summary.seasonalityStrength * 100).toFixed(0)}%
          </div>

          <div>Trend strength:</div>
          <div className="font-medium">
            {(summary.trendStrength * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  )
}
