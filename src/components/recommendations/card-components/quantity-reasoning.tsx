import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface QuantityReasoningProps {
  card: QuarterlyCard
}

export default function QuantityReasoning({ card }: QuantityReasoningProps) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 font-medium">Quantity Reasoning</h4>
      <p className="text-sm text-gray-700">
        {card.strategy.quantityReasoning?.summary ||
          'No quantity reasoning available'}
      </p>

      {card.strategy.quantityReasoning?.safetyStockExplanation && (
        <div className="mt-2 rounded-md bg-gray-50 p-2">
          <p className="text-sm font-medium">Safety Stock</p>
          <p className="text-sm">
            {card.strategy.quantityReasoning.safetyStockExplanation}
          </p>
        </div>
      )}
    </div>
  )
}
