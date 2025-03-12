import React from 'react'
import { COMPONENTS, LOCATIONS, SUPPLIERS } from '~/lib/constants'
import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface CardDebugProps {
  card: QuarterlyCard
  showRawData?: boolean
}

export const CardDebug: React.FC<CardDebugProps> = ({
  card,
  showRawData = false,
}) => {
  // Extract key data for debugging
  const componentName = COMPONENTS[card.componentId]?.name ?? card.componentId
  const locationName =
    card.locationId.charAt(0).toUpperCase() + card.locationId.slice(1)
  const strategy = card.strategy
  const quarterlyDemand = strategy.demandForecast.quarterlyDemand

  return (
    <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">
          {componentName} at {locationName} - Q{card.quarter} {card.year}
        </h2>
        <div className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
          {card.priority}
        </div>
      </div>

      {/* Key metrics */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Units</h3>
          <div className="flex justify-between">
            <span>Current: {card.currentUnits}</span>
            <span>Recommended: {card.recommendedUnits}</span>
          </div>
          <div className="mt-2 text-right">
            <span
              className={`font-medium ${card.unitDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              Delta: {card.unitDelta > 0 ? '+' : ''}
              {card.unitDelta}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Cost</h3>
          <div className="flex justify-between">
            <span>${card.currentCost.toLocaleString()}</span>
            <span>${card.recommendedCost.toLocaleString()}</span>
          </div>
          <div className="mt-2 text-right">
            <span
              className={`font-medium ${card.costDelta <= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              Delta: {card.costDelta > 0 ? '+' : ''}$
              {card.costDelta.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Priority</h3>
          <div className="flex flex-col">
            <span>Urgency: {card.urgency}</span>
            <span>Impact: {card.impactLevel}</span>
            <span>Score: {card.opportunityScore.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Top-level recommendation */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-medium text-blue-800">
          Recommendation
        </h3>
        <p className="text-blue-900">{strategy.topLevelRecommendation}</p>
      </div>

      {/* Supplier allocations */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Supplier Allocations
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Allocation %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {strategy.supplierAllocations.map((allocation, index) => {
                const supplierName =
                  allocation.supplierId.charAt(0).toUpperCase() +
                  allocation.supplierId.slice(1)
                const quarterlyQuantity = allocation.quarterlyQuantities?.find(
                  (q) => q.quarter === card.quarter && q.year === card.year
                )

                return (
                  <tr
                    key={`${allocation.supplierId}-${index}`}
                    className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {supplierName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {allocation.allocationPercentage}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {quarterlyQuantity?.quantity ?? 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      ${(quarterlyQuantity?.cost ?? 0).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Quantity Reasoning
          </h3>
          <p className="text-sm text-gray-600">
            {strategy.quantityReasoning.summary}
          </p>
        </div>
        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Allocation Reasoning
          </h3>
          <p className="text-sm text-gray-600">
            {strategy.allocationReasoning.summary}
          </p>
        </div>
      </div>

      {/* Risk considerations */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Risk Considerations
        </h3>
        <p className="mb-2 text-sm text-gray-600">
          {strategy.riskConsiderations.summary}
        </p>
        <ul className="ml-5 list-disc text-sm text-gray-600">
          {strategy.riskConsiderations.factors.map((factor, index) => (
            <li key={`risk-factor-${index}`} className="mb-1">
              <span className="font-medium">{factor.factor}</span> - Impact:{' '}
              {factor.impact}
              {factor.mitigation && <span> - {factor.mitigation}</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* Quarterly Demand */}
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Quarterly Demand
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Quarter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Base Demand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Safety Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total Required
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {quarterlyDemand.map((qd, index) => (
                <tr
                  key={`quarterly-demand-${qd.quarter}-${qd.year}-${index}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    Q{qd.quarter} {qd.year}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {qd.totalDemand}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {qd.safetyStock}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                    {qd.totalRequired}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw data */}
      {showRawData && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Raw Data</h3>
          <div className="max-h-96 overflow-auto rounded-lg bg-gray-800 p-4">
            <pre className="text-xs text-white">
              {JSON.stringify(card, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
