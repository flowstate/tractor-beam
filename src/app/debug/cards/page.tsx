'use client'

import React, { useState } from 'react'
import { api } from '~/trpc/react'
import { CardDebug } from '~/components/debug/card'
import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'
import { COMPONENTS, LOCATIONS } from '~/lib/constants'

export default function DebugCardsPage() {
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [showRawData, setShowRawData] = useState(false)
  const [filterQuarter, setFilterQuarter] = useState<number | null>(null)
  const [filterLocation, setFilterLocation] = useState<string | null>(null)
  const [filterComponent, setFilterComponent] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<
    'priority' | 'opportunityScore' | 'quarter'
  >('priority')

  // Fetch all cards
  const {
    data: cards,
    isLoading,
    error,
  } = api.recommendations.getAllCards.useQuery()

  React.useEffect(() => {
    if (!isLoading && !error && cards) {
      console.log('Recommendation cards:', cards)
    }
  }, [cards, isLoading, error])
  if (isLoading)
    return <div className="p-8">Loading recommendation cards...</div>
  if (error)
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  if (!cards || cards.length === 0)
    return <div className="p-8">No recommendation cards found</div>

  // Log cards data when available

  // Apply filters
  const filteredCards = cards.filter((card) => {
    if (filterQuarter !== null && card.quarter !== filterQuarter) return false
    if (filterLocation !== null && card.locationId !== filterLocation)
      return false
    if (filterComponent !== null && card.componentId !== filterComponent)
      return false
    return true
  })

  // Sort cards
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = {
        critical: 0,
        important: 1,
        standard: 2,
        optional: 3,
      }
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (priorityDiff !== 0) return priorityDiff
      return b.opportunityScore - a.opportunityScore
    } else if (sortBy === 'opportunityScore') {
      return b.opportunityScore - a.opportunityScore
    } else {
      // quarter
      if (a.quarter !== b.quarter) return a.quarter - b.quarter
      if (a.year !== b.year) return a.year - b.year
      const priorityOrder = {
        critical: 0,
        important: 1,
        standard: 2,
        optional: 3,
      }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
  })

  // Get unique quarters, locations, and components for filters
  const quarters = Array.from(new Set(cards.map((card) => card.quarter))).sort()
  const locations = Array.from(new Set(cards.map((card) => card.locationId)))
  const components = Array.from(new Set(cards.map((card) => card.componentId)))

  // Find the selected card
  const selectedCardObj = selectedCard
    ? sortedCards.find(
        (c) =>
          c.locationId === selectedCard.split('|')[0] &&
          c.componentId === selectedCard.split('|')[1] &&
          c.quarter === parseInt(selectedCard.split('|')[2])
      )
    : sortedCards[0]

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">
        Recommendation Cards Debug View
      </h1>

      {/* Controls */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Filter by quarter */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Quarter
          </label>
          <select
            className="w-full rounded-md border border-gray-300 p-2"
            value={filterQuarter ?? ''}
            onChange={(e) =>
              setFilterQuarter(e.target.value ? parseInt(e.target.value) : null)
            }
          >
            <option value="">All Quarters</option>
            {quarters.map((q) => (
              <option key={q} value={q}>
                Q{q}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by location */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Location
          </label>
          <select
            className="w-full rounded-md border border-gray-300 p-2"
            value={filterLocation ?? ''}
            onChange={(e) => setFilterLocation(e.target.value || null)}
          >
            <option value="">All Locations</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc.charAt(0).toUpperCase() + loc.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by component */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Filter by Component
          </label>
          <select
            className="w-full rounded-md border border-gray-300 p-2"
            value={filterComponent ?? ''}
            onChange={(e) => setFilterComponent(e.target.value || null)}
          >
            <option value="">All Components</option>
            {components.map((comp) => (
              <option key={comp} value={comp}>
                {COMPONENTS[comp]?.name || comp}
              </option>
            ))}
          </select>
        </div>

        {/* Sort by */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Sort by
          </label>
          <select
            className="w-full rounded-md border border-gray-300 p-2"
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as 'priority' | 'opportunityScore' | 'quarter'
              )
            }
          >
            <option value="priority">Priority</option>
            <option value="opportunityScore">Opportunity Score</option>
            <option value="quarter">Quarter</option>
          </select>
        </div>
      </div>

      {/* Toggle raw data */}
      <div className="mb-6">
        <button
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          onClick={() => setShowRawData(!showRawData)}
        >
          {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
        </button>
      </div>

      {/* Card selector */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Select Card:
        </label>
        <select
          className="w-full max-w-md rounded border border-gray-300 p-2"
          value={
            selectedCard ??
            `${sortedCards[0].locationId}|${sortedCards[0].componentId}|${sortedCards[0].quarter}`
          }
          onChange={(e) => setSelectedCard(e.target.value)}
        >
          {sortedCards.map((card, index) => (
            <option
              key={`${card.locationId}|${card.componentId}|${card.quarter}|${index}`}
              value={`${card.locationId}|${card.componentId}|${card.quarter}`}
            >
              {COMPONENTS[card.componentId]?.name ?? card.componentId} -
              {card.locationId.charAt(0).toUpperCase() +
                card.locationId.slice(1)}{' '}
              - Q{card.quarter} {card.year} -{card.priority} (Score:{' '}
              {card.opportunityScore.toFixed(1)})
            </option>
          ))}
        </select>
      </div>

      {/* Stats summary */}
      <div className="mb-6 rounded-lg bg-gray-100 p-4">
        <h2 className="mb-2 text-lg font-medium">Summary</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <span className="text-sm text-gray-500">Total Cards:</span>
            <div className="text-xl font-bold">{cards.length}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Filtered Cards:</span>
            <div className="text-xl font-bold">{filteredCards.length}</div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Critical Priority:</span>
            <div className="text-xl font-bold text-red-600">
              {filteredCards.filter((c) => c.priority === 'critical').length}
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-500">Important Priority:</span>
            <div className="text-xl font-bold text-orange-500">
              {filteredCards.filter((c) => c.priority === 'important').length}
            </div>
          </div>
        </div>
      </div>

      {/* Selected card detail */}
      {selectedCardObj && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Selected Card Details</h2>
          <CardDebug card={selectedCardObj} showRawData={showRawData} />
        </div>
      )}

      {/* Card list */}
      <div>
        <h2 className="mb-4 text-xl font-bold">
          All Cards ({sortedCards.length})
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedCards.slice(0, 9).map((card, index) => (
            <div
              key={`${card.locationId}-${card.componentId}-${card.quarter}-${index}`}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              onClick={() =>
                setSelectedCard(
                  `${card.locationId}|${card.componentId}|${card.quarter}`
                )
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {COMPONENTS[card.componentId]?.name ?? card.componentId}
                </h3>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    card.priority === 'critical'
                      ? 'bg-red-100 text-red-800'
                      : card.priority === 'important'
                        ? 'bg-orange-100 text-orange-800'
                        : card.priority === 'standard'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {card.priority}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                {card.locationId.charAt(0).toUpperCase() +
                  card.locationId.slice(1)}{' '}
                - Q{card.quarter} {card.year}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Units:</span>{' '}
                  {card.recommendedUnits}
                  <span
                    className={`ml-1 text-xs ${card.unitDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    ({card.unitDelta > 0 ? '+' : ''}
                    {card.unitDelta})
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Cost:</span> $
                  {card.recommendedCost.toLocaleString()}
                </div>
              </div>
              <div className="mt-2 text-sm">
                <span className="text-gray-500">Score:</span>{' '}
                {card.opportunityScore.toFixed(1)}
              </div>
            </div>
          ))}
          {sortedCards.length > 9 && (
            <div className="col-span-full mt-4 text-center text-gray-500">
              Showing 9 of {sortedCards.length} cards. Use the selector above to
              view more.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
