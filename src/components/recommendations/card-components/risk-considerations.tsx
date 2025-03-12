import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface RiskConsiderationsProps {
  card: QuarterlyCard
}

export default function RiskConsiderations({ card }: RiskConsiderationsProps) {
  if (!card.strategy.riskConsiderations) {
    return null
  }

  return (
    <div className="mb-4">
      <h4 className="mb-2 font-medium">Risk Considerations</h4>
      <p className="text-sm text-gray-700">
        {card.strategy.riskConsiderations.summary}
      </p>

      {card.strategy.riskConsiderations.factors && (
        <div className="mt-2 space-y-2">
          {card.strategy.riskConsiderations.factors.map((factor, index) => (
            <div key={index} className="rounded-md bg-gray-50 p-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{factor.factor}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    factor.impact === 'high'
                      ? 'bg-red-100 text-red-800'
                      : factor.impact === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                  }`}
                >
                  {factor.impact}
                </span>
              </div>
              {factor.mitigation && (
                <p className="mt-1 text-xs text-gray-600">
                  Mitigation: {factor.mitigation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
