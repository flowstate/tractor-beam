'use client'

import React, { useState } from 'react'
import { api } from '~/trpc/react'
import { COMPONENTS, LOCATIONS, SUPPLIERS } from '~/lib/constants'
import type { ComponentId, LocationId, SupplierId } from '~/lib/types/types'
import type { SupplierAllocationStrategy } from '~/contexts/recommendations-context'

export default function DebugRecommendationsPage() {
  const [selectedRecommendation, setSelectedRecommendation] = useState<
    string | null
  >(null)
  const [showRawData, setShowRawData] = useState(false)

  // Fetch all recommendations
  const {
    data: rawRecommendations,
    isLoading,
    error,
  } = api.recommendations.getAllRecommendations.useQuery()

  // Memoize the recommendations to avoid unnecessary recalculations
  const recommendations = React.useMemo<SupplierAllocationStrategy[]>(() => {
    if (!rawRecommendations || !Array.isArray(rawRecommendations)) {
      return []
    }
    return rawRecommendations.map((rec) => rec as SupplierAllocationStrategy)
  }, [rawRecommendations])

  if (isLoading)
    return <div className="p-8">Loading recommendations data...</div>
  if (error)
    return <div className="p-8 text-red-500">Error: {error.message}</div>
  if (
    !recommendations ||
    !Array.isArray(recommendations) ||
    recommendations.length === 0
  )
    return <div className="p-8">No recommendations found</div>

  // Find the selected recommendation
  const recommendation = selectedRecommendation
    ? recommendations.find((r) => r.id === selectedRecommendation)
    : recommendations[0]

  if (!recommendation)
    return <div className="p-8">Recommendation not found</div>

  // Extract key data for debugging
  const componentName =
    COMPONENTS[recommendation.componentId]?.name ?? recommendation.componentId
  const locationName = recommendation.locationId
  const impact = recommendation.RecommendationImpact
  const demandForecast = recommendation.demandForecast
  const quarterlyDemand = demandForecast?.quarterlyDemand ?? []

  console.log('Raw recommendation:', recommendation)
  console.log('Impact data:', impact)

  // Calculate total cost for all suppliers
  const totalRecommendedCost = recommendation.supplierAllocations.reduce(
    (total, allocation) => {
      const supplier = SUPPLIERS[allocation.supplierId]
      const pricePerUnit =
        supplier?.components.find(
          (c) => c.componentId === recommendation.componentId
        )?.pricePerUnit ?? 0

      return (
        total +
        allocation.quarterlyQuantities.reduce((sum, qq) => {
          return sum + qq.quantity * pricePerUnit
        }, 0)
      )
    },
    0
  )

  // Use actual values from impact when available, or calculate them
  const currentInventory = impact?.currentUnits ?? 0
  const recommendedInventory =
    impact?.recommendedUnits ??
    (quarterlyDemand.length > 0
      ? quarterlyDemand[0].totalRequired +
        (quarterlyDemand[1]?.totalRequired ?? 0)
      : 0)
  const inventoryDelta =
    impact?.unitDelta ?? recommendedInventory - currentInventory

  // Use actual cost values from impact when available, or calculate them
  const currentCost = impact?.currentCost ?? 0
  const recommendedCost = impact?.recommendedCost ?? totalRecommendedCost
  const costDelta = impact?.costDelta ?? recommendedCost - currentCost

  // Add this to the debug page
  const currentStrategyUnits = impact?.unitDelta
    ? recommendedInventory - impact.unitDelta
    : 0

  const currentStrategyCost = impact?.costDelta
    ? totalRecommendedCost - impact.costDelta
    : 0

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold">Recommendation Debug View</h1>

      {/* Recommendation selector */}
      <div className="mb-6">
        <label className="mb-2 block">Select Recommendation:</label>
        <select
          className="w-full max-w-md rounded border p-2"
          value={selectedRecommendation ?? recommendation.id}
          onChange={(e) => setSelectedRecommendation(e.target.value)}
        >
          {recommendations.map((rec) => (
            <option key={rec.id} value={rec.id}>
              {COMPONENTS[rec.componentId]?.name || rec.componentId} -{' '}
              {rec.locationId}
            </option>
          ))}
        </select>
      </div>

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
        <h2 className="mb-2 text-xl font-bold">
          {componentName} - {locationName}
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold">Inventory</h3>
            <div className="ml-4">
              <div>Current: {currentInventory}</div>
              <div>Recommended: {recommendedInventory}</div>
              <div>
                Adjustment: {inventoryDelta > 0 ? '+' : ''}
                {inventoryDelta}
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-bold">Impact</h3>
            <div className="ml-4">
              <div>Unit Delta: {impact?.unitDelta ?? 0}</div>
              <div>
                Cost Delta: ${(impact?.costDelta ?? 0).toLocaleString()}
              </div>
              <div>Risk Delta: {impact?.riskDelta?.toFixed(4) ?? 0}</div>
              <div>
                Current Cost: ${(impact?.currentCost ?? 0).toLocaleString()}
              </div>
              <div>
                Recommended Cost: $
                {(
                  impact?.recommendedCost ?? totalRecommendedCost
                ).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quarterly Breakdown - NEW SECTION */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Quarterly Breakdown</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Metric</th>
              <th className="border p-2">Q1 (Jan-Mar 2025)</th>
              <th className="border p-2">Q2 (Apr-Jun 2025)</th>
              <th className="border p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 font-bold">Current Units</td>
              <td className="border p-2">{impact?.q1CurrentUnits ?? 0}</td>
              <td className="border p-2">{impact?.q2CurrentUnits ?? 0}</td>
              <td className="border p-2">{impact?.currentUnits ?? 0}</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Recommended Units</td>
              <td className="border p-2">{impact?.q1RecommendedUnits ?? 0}</td>
              <td className="border p-2">{impact?.q2RecommendedUnits ?? 0}</td>
              <td className="border p-2">{impact?.recommendedUnits ?? 0}</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Unit Delta</td>
              <td className="border p-2">{impact?.q1UnitDelta ?? 0}</td>
              <td className="border p-2">{impact?.q2UnitDelta ?? 0}</td>
              <td className="border p-2">{impact?.unitDelta ?? 0}</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Current Cost</td>
              <td className="border p-2">
                ${(impact?.q1CurrentCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q2CurrentCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.currentCost ?? 0).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Recommended Cost</td>
              <td className="border p-2">
                ${(impact?.q1RecommendedCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q2RecommendedCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.recommendedCost ?? 0).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border p-2 font-bold">Cost Delta</td>
              <td className="border p-2">
                ${(impact?.q1CostDelta ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q2CostDelta ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.costDelta ?? 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Quarterly Demand */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Quarterly Demand</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Quarter</th>
              <th className="border p-2">Base Demand</th>
              <th className="border p-2">Safety Stock</th>
              <th className="border p-2">Total Required</th>
            </tr>
          </thead>
          <tbody>
            {quarterlyDemand.map((qd, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border p-2">
                  Q{qd.quarter} {qd.year}
                </td>
                <td className="border p-2">{qd.totalDemand}</td>
                <td className="border p-2">{qd.safetyStock}</td>
                <td className="border p-2">{qd.totalRequired}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model Contributions */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Model Contributions (Q1)</h3>
        {quarterlyDemand.length > 0 ? (
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2">Model</th>
                <th className="border p-2">Demand</th>
                <th className="border p-2">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {quarterlyDemand[0].modelContributions.map((mc, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border p-2">{mc.modelId}</td>
                  <td className="border p-2">{Math.round(mc.demand)}</td>
                  <td className="border p-2">
                    {Math.round(
                      (mc.demand / quarterlyDemand[0].totalDemand) * 100
                    )}
                    %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div>No model contribution data available</div>
        )}
      </div>

      {/* Supplier Allocations */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Supplier Allocations</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Supplier</th>
              <th className="border p-2">Allocation %</th>
              <th className="border p-2">Q1 Quantity</th>
              {quarterlyDemand.length > 1 && (
                <th className="border p-2">Q2 Quantity</th>
              )}
              <th className="border p-2">Current Score</th>
              <th className="border p-2">Future Score</th>
              <th className="border p-2">Weighted Score</th>
            </tr>
          </thead>
          <tbody>
            {recommendation.supplierAllocations.map((allocation, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="border p-2">{allocation.supplierId}</td>
                <td className="border p-2">
                  {allocation.allocationPercentage}%
                </td>
                <td className="border p-2">
                  {allocation.quarterlyQuantities[0]?.quantity || 'N/A'}
                </td>
                {quarterlyDemand.length > 1 && (
                  <td className="border p-2">
                    {allocation.quarterlyQuantities[1]?.quantity || 'N/A'}
                  </td>
                )}
                <td className="border p-2">
                  {allocation.currentScore.toFixed(1)}
                </td>
                <td className="border p-2">
                  {allocation.futureScore.toFixed(1)}
                </td>
                <td className="border p-2">
                  {allocation.weightedScore.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Supplier Costs */}
      <div className="mb-6 overflow-x-auto">
        <h3 className="mb-2 text-lg font-bold">Supplier Costs</h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Supplier</th>
              <th className="border p-2">Price Per Unit</th>
              <th className="border p-2">Q1 Quantity</th>
              <th className="border p-2">Q1 Cost</th>
              {quarterlyDemand.length > 1 && (
                <>
                  <th className="border p-2">Q2 Quantity</th>
                  <th className="border p-2">Q2 Cost</th>
                </>
              )}
              <th className="border p-2">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {recommendation.supplierAllocations.map((allocation, index) => {
              const supplier = SUPPLIERS[allocation.supplierId]
              const pricePerUnit =
                supplier?.components.find(
                  (c) => c.componentId === recommendation.componentId
                )?.pricePerUnit ?? 0

              const q1Quantity =
                allocation.quarterlyQuantities[0]?.quantity ?? 0
              const q2Quantity =
                allocation.quarterlyQuantities[1]?.quantity ?? 0
              const q1Cost = q1Quantity * pricePerUnit
              const q2Cost = q2Quantity * pricePerUnit
              const totalCost = q1Cost + q2Cost

              return (
                <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border p-2">{allocation.supplierId}</td>
                  <td className="border p-2">${pricePerUnit}</td>
                  <td className="border p-2">{q1Quantity}</td>
                  <td className="border p-2">${q1Cost.toLocaleString()}</td>
                  {quarterlyDemand.length > 1 && (
                    <>
                      <td className="border p-2">{q2Quantity}</td>
                      <td className="border p-2">${q2Cost.toLocaleString()}</td>
                    </>
                  )}
                  <td className="border p-2">${totalCost.toLocaleString()}</td>
                </tr>
              )
            })}
            {/* Add a total row */}
            <tr className="bg-gray-200 font-bold">
              <td className="border p-2" colSpan={3}>
                TOTAL
              </td>
              <td className="border p-2">
                $
                {recommendation.supplierAllocations
                  .reduce((sum, allocation) => {
                    const supplier = SUPPLIERS[allocation.supplierId]
                    const pricePerUnit =
                      supplier?.components.find(
                        (c) => c.componentId === recommendation.componentId
                      )?.pricePerUnit ?? 0
                    const q1Quantity =
                      allocation.quarterlyQuantities[0]?.quantity ?? 0
                    return sum + q1Quantity * pricePerUnit
                  }, 0)
                  .toLocaleString()}
              </td>
              {quarterlyDemand.length > 1 && (
                <>
                  <td className="border p-2"></td>
                  <td className="border p-2">
                    $
                    {recommendation.supplierAllocations
                      .reduce((sum, allocation) => {
                        const supplier = SUPPLIERS[allocation.supplierId]
                        const pricePerUnit =
                          supplier?.components.find(
                            (c) => c.componentId === recommendation.componentId
                          )?.pricePerUnit ?? 0
                        const q2Quantity =
                          allocation.quarterlyQuantities[1]?.quantity ?? 0
                        return sum + q2Quantity * pricePerUnit
                      }, 0)
                      .toLocaleString()}
                  </td>
                </>
              )}
              <td className="border p-2">
                ${totalRecommendedCost.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Calculation Breakdown */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">Calculation Breakdown</h3>
        <div className="rounded bg-gray-100 p-4">
          <h4 className="font-bold">Current vs Recommended Inventory</h4>
          <div className="mb-2 ml-4">
            <div>Current Inventory: {currentInventory}</div>
            <div>Recommended Inventory: {recommendedInventory}</div>
            <div>
              Difference: {inventoryDelta > 0 ? '+' : ''}
              {inventoryDelta}
            </div>
          </div>

          <h4 className="font-bold">Cost Calculation</h4>
          <div className="ml-4">
            <div>Current Strategy Cost: ${currentCost.toLocaleString()}</div>
            <div>
              Recommended Strategy Cost: ${recommendedCost.toLocaleString()}
            </div>
            <div>
              Cost Impact: {costDelta > 0 ? '+' : ''}$
              {costDelta.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data */}
      {showRawData && (
        <div className="mb-6">
          <h3 className="mb-2 text-lg font-bold">Raw Data</h3>
          <pre className="max-h-96 overflow-auto rounded bg-gray-100 p-4">
            {JSON.stringify(recommendation, null, 2)}
          </pre>
        </div>
      )}

      {/* Current Strategy vs. Recommendation - Update to include quarterly data */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-bold">
          Current Strategy vs. Recommendation
        </h3>
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2">Metric</th>
              <th className="border p-2">Quarter</th>
              <th className="border p-2">Current Strategy</th>
              <th className="border p-2">Recommendation</th>
              <th className="border p-2">Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-2 font-bold" rowSpan={3}>
                Units to Purchase
              </td>
              <td className="border p-2">Q1 2025</td>
              <td className="border p-2">{impact?.q1CurrentUnits ?? 0}</td>
              <td className="border p-2">{impact?.q1RecommendedUnits ?? 0}</td>
              <td className="border p-2">{impact?.q1UnitDelta ?? 0}</td>
            </tr>
            <tr>
              <td className="border p-2">Q2 2025</td>
              <td className="border p-2">{impact?.q2CurrentUnits ?? 0}</td>
              <td className="border p-2">{impact?.q2RecommendedUnits ?? 0}</td>
              <td className="border p-2">{impact?.q2UnitDelta ?? 0}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border p-2 font-bold">Total</td>
              <td className="border p-2 font-bold">
                {impact?.currentUnits ?? 0}
              </td>
              <td className="border p-2 font-bold">
                {impact?.recommendedUnits ?? 0}
              </td>
              <td className="border p-2 font-bold">{impact?.unitDelta ?? 0}</td>
            </tr>
            <tr>
              <td className="border p-2 font-bold" rowSpan={3}>
                Total Cost
              </td>
              <td className="border p-2">Q1 2025</td>
              <td className="border p-2">
                ${(impact?.q1CurrentCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q1RecommendedCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q1CostDelta ?? 0).toLocaleString()}
              </td>
            </tr>
            <tr>
              <td className="border p-2">Q2 2025</td>
              <td className="border p-2">
                ${(impact?.q2CurrentCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q2RecommendedCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2">
                ${(impact?.q2CostDelta ?? 0).toLocaleString()}
              </td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border p-2 font-bold">Total</td>
              <td className="border p-2 font-bold">
                ${(impact?.currentCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2 font-bold">
                ${(impact?.recommendedCost ?? 0).toLocaleString()}
              </td>
              <td className="border p-2 font-bold">
                ${(impact?.costDelta ?? 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
