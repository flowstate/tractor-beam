'use client'
import { useState } from 'react'
import Card from '../ui/card'
import type {
  QuarterlyCard,
  QuarterlyDisplayCard,
} from '~/lib/recommendation/recommendation.types'

// Import card components
import TitleBar from './card-components/title-bar'
import RecommendationText from './card-components/recommendation-text'
import CostImpact from './card-components/cost-impact'
import UnitImpact from './card-components/unit-impact'
import SupplierAllocation from './card-components/supplier-allocation'
import AllocationReasoning from './card-components/allocation-reasoning'
import QuantityReasoning from './card-components/quantity-reasoning'
import RiskConsiderations from './card-components/risk-considerations'
import OpportunityScore from './card-components/opportunity-score'
import ActionButtons from './card-components/action-buttons'

// Define the props for our component
interface RecommendationCardProps {
  card: QuarterlyDisplayCard
  isExpanded: boolean
  alignRight?: boolean
}

export default function RecommendationCard({
  card,
  isExpanded,
}: RecommendationCardProps) {
  // State to track if the details are shown
  const [showDetails, setShowDetails] = useState(false)

  // Compact card rendering
  if (!isExpanded) {
    return (
      <Card className="w-full border-l-4 border-l-blue-600 bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Title and recommendation */}
          <div className="flex-grow space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">
                {card.componentId} at {card.locationId}
              </h3>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                Q{card.quarter} {card.year}
              </span>
              <PriorityBadge priority={card.priority} />
            </div>
            <p className="text-sm text-gray-700">
              {card.strategy.topLevelRecommendation}
            </p>
          </div>

          {/* Right: Impact metrics */}
          <div className="flex items-center gap-6">
            {/* Cost impact */}
            <div className="text-right">
              <p className="text-xs text-gray-500">Cost Savings</p>
              <p
                className={`text-base font-semibold ${card.costDelta < 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(Math.abs(card.costDelta))}
              </p>
            </div>

            {/* Unit impact */}
            <div className="text-right">
              <p className="text-xs text-gray-500">Unit Change</p>
              <p
                className={`text-base font-semibold ${card.unitDelta < 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {card.unitDelta < 0 ? '-' : '+'}
                {Math.abs(card.unitDelta)}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleIgnore(card)}
                className="rounded-md border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-50"
                aria-label="Ignore"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleSnooze(card)}
                className="rounded-md border border-gray-300 bg-white p-1 text-gray-500 hover:bg-gray-50"
                aria-label="Snooze"
              >
                <ClockIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleAccept(card)}
                className="rounded-md bg-blue-600 p-1 text-white hover:bg-blue-700"
                aria-label="Add to Shopping List"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // Expanded card rendering
  return (
    <Card className="mb-4 w-full border-l-4 border-l-blue-600 bg-white p-0 shadow-md transition-all duration-300">
      {/* Card header - always visible */}
      <div className="border-b border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">
              {card.componentId} at {card.locationId}
            </h3>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Q{card.quarter} {card.year}
            </span>
            <PriorityBadge priority={card.priority} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Opportunity Score:</span>
            <div className="flex h-2 w-24 overflow-hidden rounded-full bg-gray-200">
              <div
                className="bg-blue-600"
                style={{ width: `${Math.min(100, card.opportunityScore)}%` }}
              />
            </div>
            <span className="font-medium">
              {card.opportunityScore.toFixed(0)}
            </span>
          </div>
        </div>

        <p className="mt-1 text-base text-gray-700">
          {card.strategy.topLevelRecommendation}
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-4 px-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('quantity')}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'quantity'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Quantity Reasoning
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'suppliers'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Supplier Allocation
          </button>
          <button
            onClick={() => setActiveTab('risks')}
            className={`border-b-2 px-1 py-3 text-sm font-medium ${
              activeTab === 'risks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Risk Considerations
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Impact summary */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Cost Impact
                </h4>
                <div className="mt-1 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(card.recommendedCost)}
                  </p>
                  <p
                    className={`ml-2 text-sm ${card.costDelta < 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {card.costDelta < 0 ? '↓' : '↑'}{' '}
                    {formatCurrency(Math.abs(card.costDelta))}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Current: {formatCurrency(card.currentCost)}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Unit Impact
                </h4>
                <div className="mt-1 flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">
                    {card.recommendedUnits}
                  </p>
                  <p
                    className={`ml-2 text-sm ${card.unitDelta < 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {card.unitDelta < 0 ? '↓' : '↑'} {Math.abs(card.unitDelta)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Current: {card.currentUnits}
                </p>
              </div>
            </div>

            {/* Supplier allocation summary */}
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-700">
                Recommended Supplier Allocation
              </h4>
              <div className="space-y-2">
                {card.strategy.supplierAllocations.map((allocation) => (
                  <div
                    key={allocation.supplierId}
                    className="flex items-center"
                  >
                    <div className="w-24 text-sm">{allocation.supplierId}</div>
                    <div className="flex-1">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="bg-blue-600"
                          style={{
                            width: `${allocation.allocationPercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="ml-2 w-12 text-right text-sm font-medium">
                      {allocation.allocationPercentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'quantity' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="font-medium text-blue-800">Summary</h4>
              <p className="mt-1 text-sm text-blue-800">
                {card.strategy.quantityReasoning?.summary ||
                  'No quantity reasoning available'}
              </p>
            </div>

            {card.strategy.quantityReasoning?.detailedExplanation && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-700">
                  Detailed Explanation
                </h4>
                <p className="text-sm text-gray-600">
                  {card.strategy.quantityReasoning.detailedExplanation}
                </p>
              </div>
            )}

            {card.strategy.quantityReasoning?.safetyStockExplanation && (
              <div className="rounded-lg border border-gray-200 p-4">
                <h4 className="mb-1 text-sm font-medium text-gray-700">
                  Safety Stock
                </h4>
                <p className="text-sm text-gray-600">
                  {card.strategy.quantityReasoning.safetyStockExplanation}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <h4 className="font-medium text-blue-800">Summary</h4>
              <p className="mt-1 text-sm text-blue-800">
                {card.strategy.allocationReasoning?.summary ||
                  'No allocation reasoning available'}
              </p>
            </div>

            {card.strategy.allocationReasoning?.supplierReasonings && (
              <div className="space-y-3">
                {card.strategy.allocationReasoning.supplierReasonings.map(
                  (reasoning, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-base font-medium text-gray-900">
                          {reasoning.supplierId}
                        </h4>
                        {/* Find the allocation percentage for this supplier */}
                        {card.strategy.supplierAllocations.find(
                          (a) => a.supplierId === reasoning.supplierId
                        ) && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            {
                              card.strategy.supplierAllocations.find(
                                (a) => a.supplierId === reasoning.supplierId
                              )?.allocationPercentage
                            }
                            %
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {reasoning.summary}
                      </p>
                      {reasoning.costComparison && (
                        <p className="mt-2 text-xs text-gray-500">
                          {reasoning.costComparison}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'risks' && (
          <div className="space-y-4">
            {card.strategy.riskConsiderations ? (
              <>
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="font-medium text-blue-800">Summary</h4>
                  <p className="mt-1 text-sm text-blue-800">
                    {card.strategy.riskConsiderations.summary}
                  </p>
                </div>

                {card.strategy.riskConsiderations.factors && (
                  <div className="space-y-3">
                    {card.strategy.riskConsiderations.factors.map(
                      (factor, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-gray-200 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-gray-900">
                              {factor.factor}
                            </h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                factor.impact === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : factor.impact === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {factor.impact} impact
                            </span>
                          </div>
                          {factor.mitigation && (
                            <div className="mt-2">
                              <h5 className="text-xs font-medium text-gray-700">
                                Mitigation Strategy
                              </h5>
                              <p className="text-sm text-gray-600">
                                {factor.mitigation}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-500">
                No risk considerations available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Card footer with action buttons */}
      <div className="border-t border-gray-200 bg-gray-50 p-4">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleIgnore(card)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Ignore
          </button>
          <button
            onClick={() => handleSnooze(card)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Snooze
          </button>
          <button
            onClick={() => handleAccept(card)}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add to Shopping List
          </button>
        </div>
      </div>
    </Card>
  )
}
