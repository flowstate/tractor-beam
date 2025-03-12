import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'

interface TitleBarProps {
  card: QuarterlyCard
  isCompact?: boolean
}

export default function TitleBar({ card, isCompact = false }: TitleBarProps) {
  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800'
      case 'important':
        return 'bg-orange-100 text-orange-800'
      case 'standard':
        return 'bg-blue-100 text-blue-800'
      case 'optional':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get quarter badge
  const quarterBadge = `Q${card.quarter} ${card.year}`

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className={`font-medium ${isCompact ? 'text-base' : 'text-lg'}`}>
          {card.componentId} at {card.locationId}
        </h3>
      </div>
      <div className="flex items-center space-x-2">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(
            card.priority
          )}`}
        >
          {card.priority}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
          {quarterBadge}
        </span>
      </div>
    </div>
  )
}
