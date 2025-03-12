import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface OpportunityScoreProps {
  card: QuarterlyCard
}

export default function OpportunityScore({ card }: OpportunityScoreProps) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 font-medium">Opportunity Score</h4>
      <div className="flex items-center">
        <div className="h-4 w-full rounded-full bg-gray-200">
          <div
            className="h-4 rounded-full bg-blue-600"
            style={{ width: `${Math.min(100, card.opportunityScore)}%` }}
          ></div>
        </div>
        <span className="ml-2 font-medium">
          {card.opportunityScore.toFixed(0)}
        </span>
      </div>
    </div>
  )
}
