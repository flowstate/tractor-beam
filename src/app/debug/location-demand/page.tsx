'use client'

import React, { useState, useEffect } from 'react'
import { type LocationId } from '~/lib/types/types'
import { api } from '~/trpc/react'

export default function DebugLocationDemandPage() {
  const [showRawData, setShowRawData] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)

  // Fetch the model demand by location data
  const {
    data: locationDemandData,
    isLoading,
    error,
  } = api.outlook.getLocationDemand.useQuery()

  // Add detailed logging when data is loaded
  useEffect(() => {
    if (locationDemandData) {
      console.log('Raw location demand data:', locationDemandData.raw)
    }
  }, [locationDemandData])

  if (isLoading)
    return <div className="p-8">Loading location demand data...</div>
  if (error)
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  if (!locationDemandData)
    return <div className="p-8">No location demand data found</div>

  const { raw, formatted } = locationDemandData
  const locationData = formatted.locations
  const highlights = formatted.highlights

  // Get all location IDs
  const locationIds = Object.keys(locationData)

  // Set default selected location if none is selected
  if (!selectedLocation && locationIds.length > 0) {
    setSelectedLocation(locationIds[0])
  }

  // Get the selected location's data
  const selectedLocationData = selectedLocation
    ? locationData[selectedLocation as LocationId]
    : null

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">
        Model Demand by Location Debug View
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

      {/* Location selector */}
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-bold">Select Location</h2>
        <div className="flex space-x-4">
          {locationIds.map((locationId) => (
            <button
              key={locationId}
              className={`rounded px-4 py-2 ${
                selectedLocation === locationId
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200'
              }`}
              onClick={() => setSelectedLocation(locationId)}
            >
              {locationId.charAt(0).toUpperCase() + locationId.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Basic information */}
      {selectedLocationData && (
        <div className="mb-6 rounded bg-gray-100 p-4">
          <h2 className="mb-2 text-xl font-bold">Location Overview</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold">Metadata</h3>
              <div className="ml-4">
                <div>Created: {new Date(raw.createdAt).toLocaleString()}</div>
                <div>Default: {raw.isDefault ? 'Yes' : 'No'}</div>
                <div>Time Points: {selectedLocationData.timePoints.length}</div>
              </div>
            </div>
            <div>
              <h3 className="font-bold">Model Preferences</h3>
              <div className="ml-4">
                {Object.entries(selectedLocationData.modelPreferences).map(
                  ([modelId, preference]) => (
                    <div key={modelId}>
                      {modelId}: {Number(preference).toFixed(2)}x
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Demand Data */}
      {selectedLocationData && (
        <div className="mb-6 overflow-x-auto">
          <h3 className="mb-2 text-lg font-bold">Model Demand Data</h3>
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Quarter</th>
                {Object.keys(selectedLocationData.models).map((modelId) => (
                  <th key={modelId} className="border p-2">
                    {modelId}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedLocationData.timePoints.map((quarter, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border p-2">{quarter}</td>
                  {Object.entries(selectedLocationData.models).map(
                    ([modelId, modelData]) => {
                      // Determine if this is historical or forecast data
                      const isHistorical = modelData.historical[index] > 0
                      const isForecast = modelData.forecast[index] > 0

                      let value = 'N/A'
                      if (isHistorical) {
                        value = modelData.historical[index].toLocaleString()
                      } else if (isForecast) {
                        value = `${modelData.forecast[index].toLocaleString()} (${modelData.lowerBound[index].toLocaleString()}-${modelData.upperBound[index].toLocaleString()})`
                      }

                      return (
                        <td
                          key={modelId}
                          className={`border p-2 ${isForecast ? 'bg-blue-50' : ''}`}
                        >
                          {value}
                        </td>
                      )
                    }
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Location Profiles */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Location Profiles</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(highlights.locationProfiles).map(
            ([locationId, profiles]) => (
              <div
                key={locationId}
                className={`rounded p-4 ${
                  selectedLocation === locationId
                    ? 'border border-blue-300 bg-blue-100'
                    : 'bg-gray-100'
                }`}
              >
                <h4 className="mb-2 font-bold">
                  {locationId.charAt(0).toUpperCase() + locationId.slice(1)}
                </h4>
                <ul className="list-disc pl-5">
                  {profiles.map((profile, index) => (
                    <li key={index} className="mb-1">
                      {profile}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </div>
      </div>

      {/* Model Trends */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Model Trends</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(highlights.modelTrends).map(([modelId, trends]) => (
            <div key={modelId} className="rounded bg-gray-100 p-4">
              <h4 className="mb-2 font-bold">{modelId}</h4>
              <ul className="list-disc pl-5">
                {trends.map((trend, index) => (
                  <li key={index} className="mb-1">
                    {trend}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Business Insights */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Business Insights</h3>
        <div className="rounded bg-gray-100 p-4">
          <ul className="list-disc pl-5">
            {highlights.businessInsights.map((insight, index) => (
              <li key={index} className="mb-1">
                {insight}
              </li>
            ))}
          </ul>
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
              <p className="text-lg font-bold">Model Demand by Location</p>
              <p>Multi-series Line Chart</p>
              <p className="mt-2 text-sm">
                Line chart for each model&apos;s demand at the selected location
                <br />
                Historical and forecast data with confidence intervals
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
            {JSON.stringify(raw, null, 2)}
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
