// src/app/_components/location-data-dashboard.tsx
import React, { useState } from 'react'
import { api } from '~/trpc/react'
import { ModelDemandChart } from './charts/historical/model-demand-chart'
import { ComponentFailuresChart } from './charts/historical/component-failures-chart'
import { InventoryLevelsChart } from './charts/historical/inventory-levels-chart'
import { DeliveryLeadTimesChart } from './charts/historical/delivery-lead-times-chart'

type TabType =
  | 'modelDemand'
  | 'componentFailures'
  | 'inventoryLevels'
  | 'deliveryLeadTimes'

export const LocationDataDashboard: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('modelDemand')

  // Fetch locations for the selector
  const { data: locations, isLoading: locationsLoading } =
    api.historicals.getLocations.useQuery()

  // If no location is selected yet and we have locations data, select the first one
  React.useEffect(() => {
    if (!selectedLocation && locations && locations.length > 0) {
      setSelectedLocation(locations[0].id)
    }
  }, [locations, selectedLocation])

  if (locationsLoading) return <div>Loading locations...</div>
  if (!locations || locations.length === 0)
    return <div>No locations available</div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Location Data Dashboard</h2>
        <div className="mt-2 sm:mt-0">
          <select
            className="w-full rounded-md border border-gray-300 bg-white/20 px-3 py-2 text-white sm:w-auto"
            value={selectedLocation ?? ''}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                ({location.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex flex-wrap">
          {[
            { id: 'modelDemand', label: 'Model Demand' },
            { id: 'componentFailures', label: 'Component Failures' },
            { id: 'inventoryLevels', label: 'Inventory Levels' },
            { id: 'deliveryLeadTimes', label: 'Delivery Lead Times' },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-indigo-400 text-indigo-300'
                  : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-300'
              } `}
              onClick={() => setActiveTab(tab.id as TabType)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content based on active tab */}
      <div className="h-[500px]">
        {selectedLocation && (
          <>
            {activeTab === 'modelDemand' && (
              <ModelDemandChart locationId={selectedLocation} />
            )}

            {activeTab === 'componentFailures' && (
              <ComponentFailuresChart locationId={selectedLocation} />
            )}

            {activeTab === 'inventoryLevels' && (
              <InventoryLevelsChart locationId={selectedLocation} />
            )}

            {activeTab === 'deliveryLeadTimes' && (
              <DeliveryLeadTimesChart locationId={selectedLocation} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
