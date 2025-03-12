'use client'

import { useState } from 'react'
import Link from 'next/link'
import { type LocationId, type TractorModelId } from '~/lib/types/types'
import { DemandForecastForm } from '~/app/_components/demand-forecast-form'
import { DemandForecastChart } from '~/app/_components/charts/prediction/demand-forecast-chart'
import { api } from '~/trpc/react'
import type { SavedDemandForecast } from '~/lib/prediction/prediction.types'

export default function PredictionsPage() {
  const [selectedLocation, setSelectedLocation] = useState<
    LocationId | undefined
  >(undefined)
  const [selectedModel, setSelectedModel] = useState<
    TractorModelId | undefined
  >(undefined)
  const [futurePeriods, setFuturePeriods] = useState(181) // Updated to 2 quarters
  const [shouldFetch, setShouldFetch] = useState(false)

  const {
    data: forecast,
    isLoading,
    error,
    refetch,
  } = api.predictions.demandForecast.useQuery(
    {
      locationId: selectedLocation,
      modelId: selectedModel,
    },
    {
      enabled: shouldFetch && (!!selectedLocation || !!selectedModel),
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  )

  const handleForecastSubmit = (params: {
    locationId?: LocationId
    modelId?: TractorModelId
    futurePeriods: number
  }) => {
    setSelectedLocation(params.locationId)
    setSelectedModel(params.modelId)
    setFuturePeriods(params.futurePeriods)
    setShouldFetch(true)

    // If we already have an error, we need to manually trigger refetch
    if (error) {
      setTimeout(() => {
        void refetch()
      }, 0)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Demand Predictions
          </h1>
          <Link
            href="/"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="space-y-8">
          {/* Form Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Generate Forecast
            </h2>
            <DemandForecastForm
              onSubmit={handleForecastSubmit}
              isLoading={isLoading}
              error={error as Error | null}
            />
            <div className="mt-4 text-sm text-gray-500">
              Note: Forecasts are pre-generated and stored in the database. This
              form retrieves existing forecasts.
            </div>
          </div>

          {/* Chart Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-gray-900">
              Forecast Results
            </h2>
            {shouldFetch && (selectedLocation || selectedModel) ? (
              <DemandForecastChart
                forecast={forecast}
                isLoading={isLoading}
                locationId={selectedLocation}
                modelId={selectedModel}
              />
            ) : (
              <div className="flex h-[400px] items-center justify-center text-gray-500">
                {error
                  ? 'An error occurred. Please adjust your parameters and try again.'
                  : 'Select at least one filter (location or model) to generate a forecast'}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
