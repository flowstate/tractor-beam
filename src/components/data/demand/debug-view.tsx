import React, { useState } from 'react'
import type { SupplierId } from '~/lib/types/types'
import type { TypedForecastData } from '~/app/data/demand/page'

interface DebugViewProps {
  forecastData: TypedForecastData
}

export function DebugView({ forecastData }: DebugViewProps) {
  const [showRawData, setShowRawData] = useState(false)

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Demand Forecasting Debug View</h1>

      {/* Toggle raw data */}
      <div className="mb-6">
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white"
          onClick={() => setShowRawData(!showRawData)}
        >
          {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
        </button>
      </div>

      {/* Basic information */}
      <div className="mb-6 rounded bg-gray-100 p-4">
        <h2 className="mb-2 text-xl font-bold">Forecast Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold">Metadata</h3>
            <div className="ml-4">
              <div>Location: {forecastData.metadata.locationId}</div>
              <div>Model: {forecastData.metadata.modelName}</div>
              <div>
                Confidence Interval:{' '}
                {forecastData.forecast.metadata.confidenceInterval * 100}%
              </div>
              <div>
                Seasonality Strength:{' '}
                {(
                  forecastData.forecast.metadata.seasonalityStrength * 100
                ).toFixed(1)}
                %
              </div>
              <div>
                Trend Strength:{' '}
                {(forecastData.forecast.metadata.trendStrength * 100).toFixed(
                  1
                )}
                %
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Data Points</h3>
            <div className="ml-4">
              <div>
                Historical Data Points: {forecastData.historicalData.length}
              </div>
              <div>
                Forecast Data Points:{' '}
                {forecastData.forecast.forecastData.length}
              </div>
              <div>
                Market Sensitivity:{' '}
                {forecastData.metadata.modelSensitivities.market.toFixed(2)}
              </div>
              <div>
                Inflation Sensitivity:{' '}
                {forecastData.metadata.modelSensitivities.inflation.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Historical Data Sample</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Date</th>
              <th className="border p-2">Demand</th>
              <th className="border p-2">MTI</th>
              <th className="border p-2">Inflation</th>
              <th className="border p-2">Quarter</th>
              <th className="border p-2">Year</th>
            </tr>
          </thead>
          <tbody>
            {forecastData.historicalData.slice(0, 10).map((point, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border p-2">{point.date}</td>
                <td className="border p-2">{point.demand}</td>
                <td className="border p-2">{point.mti.toFixed(2)}</td>
                <td className="border p-2">{point.inflation.toFixed(2)}</td>
                <td className="border p-2">Q{point.quarter}</td>
                <td className="border p-2">{point.year}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-sm text-gray-500">
          Showing first 10 records of {forecastData.historicalData.length} total
        </div>
      </div>

      {/* Forecast Data */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Forecast Data Sample</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Date</th>
              <th className="border p-2">Forecast</th>
              <th className="border p-2">Lower Bound</th>
              <th className="border p-2">Upper Bound</th>
              <th className="border p-2">Future MTI</th>
              <th className="border p-2">Future Inflation</th>
            </tr>
          </thead>
          <tbody>
            {forecastData.forecast.forecastData
              .slice(0, 10)
              .map((point, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border p-2">{point.date}</td>
                  <td className="border p-2">{point.value.toFixed(2)}</td>
                  <td className="border p-2">{point.lower.toFixed(2)}</td>
                  <td className="border p-2">{point.upper.toFixed(2)}</td>
                  <td className="border p-2">
                    {forecastData.forecast.futureMti[index]?.toFixed(2) ??
                      'N/A'}
                  </td>
                  <td className="border p-2">
                    {forecastData.forecast.futureInflation[index]?.toFixed(2) ??
                      'N/A'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="mt-2 text-sm text-gray-500">
          Showing first 10 records of{' '}
          {forecastData.forecast.forecastData.length} total
        </div>
      </div>

      {/* Analysis Insights */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Analysis Insights</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Seasonal Patterns</h4>
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Quarter</th>
                  <th className="border p-2">Coefficient</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(forecastData.analysis.seasonalPatterns).map(
                  ([quarter, value], index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? 'bg-gray-50' : ''}
                    >
                      <td className="border p-2">{quarter}</td>
                      <td className="border p-2">{Number(value).toFixed(3)}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Market Sensitivities</h4>
            <div className="ml-4">
              <div>
                Market Sensitivity:{' '}
                {forecastData.analysis.marketSensitivity.toFixed(3)}
              </div>
              <div>
                Price Sensitivity:{' '}
                {forecastData.analysis.priceSensitivity.toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Impact */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Business Impact</h3>
        <div className="rounded bg-gray-100 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 font-bold">Cost Impact</h4>
              <div className="ml-4">
                <div>
                  Current Cost: $
                  {forecastData.businessImpact.currentCost.toLocaleString()}
                </div>
                <div>
                  Recommended Cost: $
                  {forecastData.businessImpact.recommendedCost.toLocaleString()}
                </div>
                <div>
                  Cost Savings: $
                  {forecastData.businessImpact.costSavings.toLocaleString()} (
                  {forecastData.businessImpact.costSavingsPercentage.toFixed(1)}
                  %)
                </div>
              </div>
            </div>
            <div>
              <h4 className="mb-2 font-bold">Inventory Impact</h4>
              <div className="ml-4">
                <div>
                  Current Units:{' '}
                  {forecastData.businessImpact.currentUnits.toLocaleString()}
                </div>
                <div>
                  Recommended Units:{' '}
                  {forecastData.businessImpact.recommendedUnits.toLocaleString()}
                </div>
                <div>
                  Unit Delta:{' '}
                  {forecastData.businessImpact.unitDelta.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supplier Allocations */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Supplier Allocations</h3>
        {forecastData.supplierAllocations.length > 0 ? (
          <div className="space-y-4">
            {forecastData.supplierAllocations.map((allocation, index) => (
              <div key={index} className="rounded bg-gray-100 p-4">
                <h4 className="mb-2 font-bold">
                  Component: {allocation.componentId}
                </h4>
                <div className="mb-2">{allocation.reasoning}</div>
                <table className="min-w-full border">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2">Supplier</th>
                      <th className="border p-2">Current Allocation</th>
                      <th className="border p-2">Recommended Allocation</th>
                      <th className="border p-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(allocation.recommendedAllocations).map(
                      ([supplierId, value], idx) => {
                        const currentValue =
                          allocation.currentAllocations[
                            supplierId as SupplierId
                          ] ?? 0
                        return (
                          <tr
                            key={idx}
                            className={idx % 2 === 0 ? 'bg-gray-50' : ''}
                          >
                            <td className="border p-2">{supplierId}</td>
                            <td className="border p-2">
                              {(currentValue * 100).toFixed(1)}%
                            </td>
                            <td className="border p-2">
                              {(value * 100).toFixed(1)}%
                            </td>
                            <td className="border p-2">
                              {((value - currentValue) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        )
                      }
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div>No supplier allocation data available</div>
        )}
      </div>

      {/* Raw Data */}
      {showRawData && (
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-bold">Raw Data</h3>
          <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-4">
            {JSON.stringify(forecastData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
