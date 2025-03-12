import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface RecommendationTextProps {
  card: QuarterlyCard
  isCompact?: boolean
}

export default function RecommendationText({
  card,
  isCompact = false,
}: RecommendationTextProps) {
  return (
    <div className={`${isCompact ? 'my-2' : 'my-4'}`}>
      <p
        className={`${isCompact ? 'text-sm font-bold text-gray-800' : 'text-base font-semibold text-gray-900'}`}
      >
        {card.strategy.topLevelRecommendation}
      </p>
    </div>
  )
}
