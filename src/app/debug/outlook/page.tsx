'use client'

import React, { useState, useEffect } from 'react'
import { api } from '~/trpc/react'

export default function DebugQuarterlyDemandPage() {
  const [showRawData, setShowRawData] = useState(false)

  // Fetch the quarterly demand outlook data
  const {
    data: outlookData,
    isLoading,
    error,
  } = api.outlook.getOutlook.useQuery()

  // Add detailed logging when data is loaded
  useEffect(() => {
    if (outlookData) {
      console.log(outlookData.raw)
    }
  }, [outlookData])

  if (isLoading)
    return <div className="p-8">Loading quarterly demand data...</div>
  if (error)
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  if (!outlookData)
    return <div className="p-8">No quarterly demand outlook found</div>

  const { raw, formatted } = outlookData
  const outlook = raw

  // Extract key data for debugging
  const quarters = outlook.quarters
  const historicalDemand = outlook.historicalDemand
  const forecastDemand = outlook.forecastDemand
  const upperBound = outlook.upperBound
  const lowerBound = outlook.lowerBound
  const yoyGrowth = outlook.yoyGrowth
  const seasonalPeaks = outlook.seasonalPeaks
  const keyPatterns = outlook.keyPatterns
  const predictionBasis = outlook.predictionBasis
  const businessImplications = outlook.businessImplications

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">
        Quarterly Demand Outlook Debug View
      </h1>

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
        <h2 className="mb-2 text-xl font-bold">Outlook Overview</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold">Metadata</h3>
            <div className="ml-4">
              <div>Created: {new Date(outlook.createdAt).toLocaleString()}</div>
              <div>Default: {outlook.isDefault ? 'Yes' : 'No'}</div>
              <div>
                Confidence Interval: {outlook.confidenceInterval * 100}%
              </div>
              <div>
                Seasonality Strength:{' '}
                {(outlook.seasonalityStrength * 100).toFixed(1)}%
              </div>
              <div>
                Trend Strength: {(outlook.trendStrength * 100).toFixed(1)}%
              </div>
              <div>RMSE: {outlook.rmse.toFixed(2)}</div>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Data Points</h3>
            <div className="ml-4">
              <div>Quarters: {quarters.length}</div>
              <div>Historical Data Points: {historicalDemand.length}</div>
              <div>
                Forecast Data Points:{' '}
                {forecastDemand.filter((v) => v > 0).length}
              </div>
              <div>Seasonal Peaks: {seasonalPeaks.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly Demand Data */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Quarterly Demand Data</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Quarter</th>
              <th className="border p-2">Historical Demand</th>
              <th className="border p-2">Forecast Demand</th>
              <th className="border p-2">Lower Bound</th>
              <th className="border p-2">Upper Bound</th>
              <th className="border p-2">YoY Growth</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter, index) => {
              // Determine which YoY growth to display
              let yoyGrowthValue = null
              if (index < yoyGrowth.year2OverYear1.length) {
                yoyGrowthValue = yoyGrowth.year2OverYear1[index]
              } else if (
                index - yoyGrowth.year2OverYear1.length <
                yoyGrowth.year3OverYear2.length
              ) {
                yoyGrowthValue =
                  yoyGrowth.year3OverYear2[
                    index - yoyGrowth.year2OverYear1.length
                  ]
              } else if (
                index -
                  yoyGrowth.year2OverYear1.length -
                  yoyGrowth.year3OverYear2.length <
                yoyGrowth.forecastOverYear3.length
              ) {
                yoyGrowthValue =
                  yoyGrowth.forecastOverYear3[
                    index -
                      yoyGrowth.year2OverYear1.length -
                      yoyGrowth.year3OverYear2.length
                  ]
              }

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border p-2">{quarter}</td>
                  <td className="border p-2">
                    {historicalDemand[index] || 'N/A'}
                  </td>
                  <td className="border p-2">
                    {forecastDemand[index] > 0 ? forecastDemand[index] : 'N/A'}
                  </td>
                  <td className="border p-2">
                    {lowerBound[index] > 0 ? lowerBound[index] : 'N/A'}
                  </td>
                  <td className="border p-2">
                    {upperBound[index] > 0 ? upperBound[index] : 'N/A'}
                  </td>
                  <td className="border p-2">
                    {yoyGrowthValue !== null
                      ? `${yoyGrowthValue.toFixed(1)}%`
                      : 'N/A'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Year-over-Year Growth */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Year-over-Year Growth</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Year 2 over Year 1</h4>
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Quarter</th>
                  <th className="border p-2">Growth %</th>
                </tr>
              </thead>
              <tbody>
                {yoyGrowth.year2OverYear1.map((growth, index) => (
                  <tr key={index}>
                    <td className="border p-2">Q{index + 1}</td>
                    <td className="border p-2">{growth.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Year 3 over Year 2</h4>
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Quarter</th>
                  <th className="border p-2">Growth %</th>
                </tr>
              </thead>
              <tbody>
                {yoyGrowth.year3OverYear2.map((growth, index) => (
                  <tr key={index}>
                    <td className="border p-2">Q{index + 1}</td>
                    <td className="border p-2">{growth.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Forecast over Year 3</h4>
            <table className="min-w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2">Quarter</th>
                  <th className="border p-2">Growth %</th>
                </tr>
              </thead>
              <tbody>
                {yoyGrowth.forecastOverYear3.map((growth, index) => (
                  <tr key={index}>
                    <td className="border p-2">Q{index + 1}</td>
                    <td className="border p-2">{growth.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Seasonal Peaks */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Seasonal Peaks</h3>
        {seasonalPeaks.length > 0 ? (
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Quarter</th>
                <th className="border p-2">Value</th>
                <th className="border p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {seasonalPeaks.map((peak, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border p-2">{peak.quarter}</td>
                  <td className="border p-2">{peak.value.toLocaleString()}</td>
                  <td className="border p-2">{peak.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>No seasonal peaks identified</div>
        )}
      </div>

      {/* Highlights */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">ML-Generated Insights</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Key Patterns</h4>
            <ul className="list-disc pl-5">
              {keyPatterns.map((pattern, index) => (
                <li key={index} className="mb-1">
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Prediction Basis</h4>
            <ul className="list-disc pl-5">
              {predictionBasis.map((basis, index) => (
                <li key={index} className="mb-1">
                  {basis}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded bg-gray-100 p-4">
            <h4 className="mb-2 font-bold">Business Implications</h4>
            <ul className="list-disc pl-5">
              {businessImplications.map((implication, index) => (
                <li key={index} className="mb-1">
                  {implication}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Data Visualization Preview */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Data Visualization Preview</h3>
        <div className="rounded bg-gray-100 p-4">
          <p className="mb-4">
            This is where the actual visualization will be displayed in the UI.
            The debug view shows the raw data that will power the visualization.
          </p>
          <div className="flex h-64 w-full items-center justify-center rounded border border-dashed border-gray-400 bg-white p-4">
            <div className="text-center text-gray-500">
              <p className="text-lg font-bold">Quarterly Demand Outlook</p>
              <p>Combined Line and Bar Chart</p>
              <p className="mt-2 text-sm">
                Line chart for historical and forecast demand trends
                <br />
                Bar chart for YoY growth percentages
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data */}
      {showRawData && (
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-bold">Raw Data</h3>
          <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-4">
            {JSON.stringify(outlook, null, 2)}
          </pre>
        </div>
      )}

      {/* Formatted Data */}
      {showRawData && (
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-bold">Formatted Response Data</h3>
          <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-4">
            {JSON.stringify(formatted, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
