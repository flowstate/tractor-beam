import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface AllocationReasoningProps {
  card: QuarterlyCard
}

export default function AllocationReasoning({
  card,
}: AllocationReasoningProps) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 font-medium">Allocation Reasoning</h4>
      <p className="text-sm text-gray-700">
        {card.strategy.allocationReasoning?.summary || 'No reasoning available'}
      </p>

      {card.strategy.allocationReasoning?.supplierReasonings && (
        <div className="mt-2 space-y-2">
          {card.strategy.allocationReasoning.supplierReasonings.map(
            (reasoning, index) => (
              <div key={index} className="rounded-md bg-gray-50 p-2">
                <p className="text-sm font-medium">{reasoning.supplierId}</p>
                <p className="text-sm">{reasoning.summary}</p>
                {reasoning.costComparison && (
                  <p className="mt-1 text-xs text-gray-600">
                    {reasoning.costComparison}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
