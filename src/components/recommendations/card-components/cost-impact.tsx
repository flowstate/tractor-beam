import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'
import { formatCurrency } from '~/lib/utils/formatting'

interface CostImpactProps {
  card: QuarterlyCard
  isCompact?: boolean
}

export default function CostImpact({
  card,
  isCompact = false,
}: CostImpactProps) {
  const formattedCostDelta = formatCurrency(Math.abs(card.costDelta))
  const isSaving = card.costDelta < 0

  if (isCompact) {
    return (
      <div className="flex flex-col items-center">
        <p
          className={`text-base font-semibold ${
            isSaving ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {formattedCostDelta}
        </p>
        <p className="text-xs text-gray-500">savings</p>
      </div>
    )
  }

  return (
    <div className="flex justify-between">
      <div>
        <p className="text-sm text-gray-500">Current Cost</p>
        <p className="text-lg font-semibold">
          {formatCurrency(card.currentCost)}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Recommended Cost</p>
        <p className="text-lg font-semibold">
          {formatCurrency(card.recommendedCost)}
        </p>
      </div>
      <div>
        <p className="text-sm text-gray-500">Savings</p>
        <p
          className={`text-lg font-semibold ${
            isSaving ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isSaving ? '-' : '+'}
          {formattedCostDelta}
        </p>
      </div>
    </div>
  )
}
