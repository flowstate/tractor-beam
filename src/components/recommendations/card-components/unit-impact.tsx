import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface UnitImpactProps {
  card: QuarterlyCard
  isCompact?: boolean
}

export default function UnitImpact({
  card,
  isCompact = false,
}: UnitImpactProps) {
  const unitDelta = card.unitDelta
  const isReduction = unitDelta < 0

  if (isCompact) {
    return (
      <div className="flex flex-col items-center">
        <p className="text-text-dark">
          {isReduction ? '-' : '+'}
          {Math.abs(unitDelta)}
        </p>
        <p className="text-xs text-gray-500">units</p>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <div className="flex justify-between">
        <div>
          <p className="text-sm text-gray-500">Current Units</p>
          <p className="text-lg font-semibold">{card.currentUnits}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Recommended Units</p>
          <p className="text-lg font-semibold">{card.recommendedUnits}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Unit Change</p>
          <p
            className={`text-lg font-semibold ${
              isReduction ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {isReduction ? '-' : '+'}
            {Math.abs(unitDelta)}
          </p>
        </div>
      </div>
    </div>
  )
}
