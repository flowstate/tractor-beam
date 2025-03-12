import { useState } from 'react'
import { type LocationId, type TractorModelId } from '~/lib/types/types'
import { LOCATION_IDS, TRACTOR_MODEL_IDS } from '~/lib/types/types'

interface DemandForecastFormProps {
  onSubmit: (params: {
    locationId?: LocationId
    modelId?: TractorModelId
    futurePeriods: number
  }) => void
  isLoading?: boolean
  error?: Error | null
}

export function DemandForecastForm({
  onSubmit,
  isLoading = false,
  error = null,
}: DemandForecastFormProps) {
  // Default to first available values
  const [locationId, setLocationId] = useState<LocationId | undefined>(
    LOCATION_IDS[0]
  )
  const [modelId, setModelId] = useState<TractorModelId | undefined>(
    TRACTOR_MODEL_IDS[0]
  )
  const [futurePeriods, setFuturePeriods] = useState(90)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      locationId,
      modelId,
      futurePeriods,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          <p>Error: {error.message}</p>
          <p className="mt-1 text-xs">
            Please try again or adjust your parameters.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700"
          >
            Location (Optional)
          </label>
          <select
            id="location"
            value={locationId ?? ''}
            onChange={(e) =>
              setLocationId((e.target.value as LocationId) || undefined)
            }
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">All Locations</option>
            {LOCATION_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="model"
            className="block text-sm font-medium text-gray-700"
          >
            Tractor Model (Optional)
          </label>
          <select
            id="model"
            value={modelId ?? ''}
            onChange={(e) =>
              setModelId((e.target.value as TractorModelId) || undefined)
            }
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          >
            <option value="">All Models</option>
            {TRACTOR_MODEL_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="futurePeriods"
            className="block text-sm font-medium text-gray-700"
          >
            Forecast Period (Days)
          </label>
          <input
            type="number"
            id="futurePeriods"
            min="1"
            max="365"
            value={futurePeriods}
            onChange={(e) => setFuturePeriods(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-400"
      >
        {isLoading ? 'Generating Forecast...' : 'Generate Forecast'}
      </button>
    </form>
  )
}
