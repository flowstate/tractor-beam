import type { QuarterlyDisplayCard } from '~/lib/recommendation/recommendation.types'
import { useCards } from '~/contexts/cards-context'

interface ActionButtonsProps {
  card: QuarterlyDisplayCard
  isCompact?: boolean
}

export default function ActionButtons({
  card,
  isCompact = false,
}: ActionButtonsProps) {
  const { handleAccept, handleSnooze, handleIgnore } = useCards()

  if (isCompact) {
    return (
      <div className="flex space-x-2">
        <button
          onClick={() => handleIgnore(card)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Ignore
        </button>
        <button
          onClick={() => handleSnooze(card)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Snooze
        </button>
        <button
          onClick={() => handleAccept(card)}
          className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
        >
          Accept
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex justify-end space-x-2">
      <button
        onClick={() => handleIgnore(card)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Ignore
      </button>
      <button
        onClick={() => handleSnooze(card)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Snooze
      </button>
      <button
        onClick={() => handleAccept(card)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Add to Shopping List
      </button>
    </div>
  )
}
