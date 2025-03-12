import React from 'react'
import type { EnhancedVisualizationData } from '~/app/data/suppliers/page'

interface TrendAnalysisSummaryProps {
  enhancedData: EnhancedVisualizationData
}

export const TrendAnalysisSummary: React.FC<TrendAnalysisSummaryProps> = ({
  enhancedData,
}) => {
  // Get trend color
  const getTrendColor = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'improving':
        return 'text-green-600 bg-green-50'
      case 'declining':
        return 'text-red-600 bg-red-50'
      case 'stable':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  // Sort quarters chronologically
  const sortedQuarters = Object.keys(
    enhancedData.analyzedData.trendDirection
  ).sort()

  return (
    <div>
      <div className="mb-4 flex items-center justify-between rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-3">
        <div>
          <div className="text-sm font-medium text-gray-500">Overall Trend</div>
          <div
            className={`text-xl font-bold ${getTrendColor(enhancedData.projection.nextQuarter).split(' ')[0]}`}
          >
            {enhancedData.projection.nextQuarter}
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-medium text-gray-500">Confidence</div>
          <div className="text-xl font-bold text-green-600">
            {(enhancedData.projection.confidence * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="mb-2 font-medium text-gray-700">Quarterly Trends</h3>
        <div className="grid grid-cols-4 gap-1">
          {sortedQuarters.map((quarter) => {
            const direction = enhancedData.analyzedData.trendDirection[quarter]
            const magnitude = enhancedData.analyzedData.trendMagnitude[quarter]
            const colorClass = getTrendColor(direction)

            return (
              <div
                key={quarter}
                className={`rounded px-2 py-1 text-center ${colorClass}`}
                title={`Magnitude: ${magnitude.toFixed(4)}`}
              >
                <div className="text-xs">{quarter}</div>
                <div className="text-xs font-medium">{direction}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-md bg-gray-50 p-3">
        <div>
          <div className="text-xs text-gray-500">Quality Volatility</div>
          <div className="font-medium">
            {enhancedData.config.qualityVolatility.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Seasonal Strength</div>
          <div className="font-medium">
            {enhancedData.config.seasonalStrength.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Quality Momentum</div>
          <div className="font-medium">
            {enhancedData.config.qualityMomentum.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}
