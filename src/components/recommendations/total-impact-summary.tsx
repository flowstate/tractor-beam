'use client'
import { useCards } from '~/contexts/cards-context'
import { formatCurrency } from '~/lib/utils/formatting'

export default function TotalImpactSummary() {
  const { h1Savings, h1EfficiencyPercentage, q1Savings } = useCards()

  return (
    <div className="rounded-lg bg-blue-50 p-6">
      <h2 className="mb-4 text-xl font-bold text-gray-800">
        Total Impact Summary
      </h2>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500">
            Total H1 2025 Projected Savings
          </p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(h1Savings)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">
            Inventory Efficiency Improvement
          </p>
          <p className="text-2xl font-bold text-blue-600">
            {h1EfficiencyPercentage.toFixed(0)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Cash Flow Improvement in Q1</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(q1Savings)}
          </p>
        </div>
      </div>
    </div>
  )
}
