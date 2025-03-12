'use client'
import { Award, Clock, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { COMPONENTS } from '~/lib/constants'
import type { QuarterlyDisplayCard } from '~/lib/recommendation/recommendation.types'
import { formatCurrency } from '~/lib/utils/formatting'
import Card from '../ui/card'
import { useCards } from '~/contexts/cards-context'

// Import card components
import AllocationReasoning from './card-components/allocation-reasoning'
import QuantityExplanation, {
  colors as quantityColors,
} from './card-components/quantity-explanation'
import RiskConsiderations from './card-components/risk-considerations'
import SupplierAllocation from './card-components/supplier-allocation'

// Define the props for our component
interface RecommendationCardProps {
  card: QuarterlyDisplayCard
  isExpanded?: boolean // Keep for backward compatibility but don't use internally
  alignRight?: boolean
  disableActions?: boolean // New prop to disable action buttons
  disabled?: boolean // New prop to disable all interactions
  // Optional handlers that can be passed directly
  onAccept?: (card: QuarterlyDisplayCard) => void
  onSnooze?: (card: QuarterlyDisplayCard) => void
  onIgnore?: (card: QuarterlyDisplayCard) => void
}

// Define color classes for consistent highlighting
const colors = {
  ...quantityColors,
  savings: 'text-green-600', // Green for savings amount
  cost: 'text-red-600', // Red for additional costs
}

export default function RecommendationCard({
  card,
  isExpanded = false, // Default to collapsed
  disableActions = false, // Default to showing actions
  disabled = false, // Default to enabled
  // Default to no-op functions
  onAccept,
  onSnooze,
  onIgnore,
}: RecommendationCardProps) {
  // More granular state for different sections
  const [quantityOpen, setQuantityOpen] = useState(false)
  const [allocationOpen, setAllocationOpen] = useState(false)
  const [riskOpen, setRiskOpen] = useState(false)

  // Helper to determine if card is in any expanded state
  const isAnyOpen = quantityOpen || allocationOpen || riskOpen

  // Helper to open a specific section and close others
  const openSection = (section: 'quantity' | 'allocation' | 'risk') => {
    setQuantityOpen(section === 'quantity')
    setAllocationOpen(section === 'allocation')
    setRiskOpen(section === 'risk')
  }

  // Helper to close all sections
  const closeAllSections = () => {
    setQuantityOpen(false)
    setAllocationOpen(false)
    setRiskOpen(false)
  }

  useEffect(() => {
    console.log(card)
  }, [card])

  // Get the suggestion pieces from the strategy
  const suggestionPieces = card.strategy.topLevelSuggestionPieces

  // Format the savings amount
  const savingsAmount = Math.abs(card.costDelta)
  const formattedSavings = formatCurrency(savingsAmount)
  const isSaving = card.costDelta < 0

  // Get component name - use the one from topLevelSuggestionPieces if available
  const componentName =
    suggestionPieces?.componentName ??
    COMPONENTS[card.componentId]?.name ??
    card.componentId

  // Get location name - use the one from topLevelSuggestionPieces if available
  const locationName = suggestionPieces?.locationName ?? card.locationId

  // Format supplier allocations for display
  const supplierAllocations = suggestionPieces?.supplierAllocations ?? []

  // Create a simple comma-separated list of suppliers (no percentages)
  let supplierList = supplierAllocations.map((s) => s.supplierId).join(', ')

  // Replace the last comma with "and" if there are multiple suppliers
  if (supplierAllocations.length > 1) {
    const lastCommaIndex = supplierList.lastIndexOf(', ')
    if (lastCommaIndex !== -1) {
      supplierList =
        supplierList.substring(0, lastCommaIndex) +
        ' and ' +
        supplierList.substring(lastCommaIndex + 2)
    }
  }

  // Use a default if no suppliers are available
  const supplierText = supplierList || 'recommended suppliers'

  // Determine immediacy based on quarter
  const immediacy = card.quarter === 1 ? 'Act now' : 'Act soon'

  // Determine impact level text and colors
  const impactText =
    card.impactLevel === 'high'
      ? 'High impact'
      : card.impactLevel === 'moderate'
        ? 'Moderate impact'
        : 'Low impact'

  // Set colors based on urgency and impact
  const urgencyBgColor = card.quarter === 1 ? 'bg-blue-100' : 'bg-purple-100'
  const urgencyTextColor =
    card.quarter === 1 ? 'text-blue-700' : 'text-purple-700'

  const impactBgColor =
    card.impactLevel === 'high'
      ? 'bg-orange-100'
      : card.impactLevel === 'moderate'
        ? 'bg-yellow-100'
        : 'bg-gray-100'

  const impactTextColor =
    card.impactLevel === 'high'
      ? 'text-orange-700'
      : card.impactLevel === 'moderate'
        ? 'text-yellow-700'
        : 'text-gray-700'

  // Add opportunity score text and colors
  const opportunityText = `${Math.round(card.opportunityScore)} opportunity score`
  const opportunityBgColor = 'bg-green-100'
  const opportunityTextColor = 'text-green-700'

  // Get the card actions from the context
  const { handleAccept, handleSnooze, handleIgnore } = useCards()

  // Use the handlers passed as props or no-ops if not provided
  const handleAcceptCard = () => {
    if (onAccept) {
      onAccept(card)
    }
  }

  const handleSnoozeCard = () => {
    if (onSnooze) {
      onSnooze(card)
    }
  }

  const handleIgnoreCard = () => {
    if (onIgnore) {
      onIgnore(card)
    }
  }

  // Modify the card wrapper class to include pointer-events-none when disabled
  const cardWrapperClass = `w-full transition-all duration-300 ${isAnyOpen ? 'mb-4' : ''} ${
    disabled ? 'pointer-events-none cursor-default' : ''
  }`

  // Modify the button click handlers to check for disabled state
  const handleQuantityClick = (e: React.MouseEvent) => {
    if (disabled) return
    openSection('quantity')
  }

  const handleAllocationClick = (e: React.MouseEvent) => {
    if (disabled) return
    openSection('allocation')
  }

  return (
    <Card className={`${disabled ? 'shadow-none' : ''} ${cardWrapperClass}`}>
      {/* Card content - Always visible */}
      <div className="p-4">
        <div className="flex">
          {/* Left side: Recommendation and buttons */}
          <div className="flex-1 pr-4">
            <p className="mb-4 text-lg text-gray-900">
              {isSaving ? (
                <>
                  Save{' '}
                  <span className={`font-semibold ${colors.savings}`}>
                    {formattedSavings}
                  </span>{' '}
                  in Q{card.quarter} by purchasing{' '}
                  <button
                    onClick={handleQuantityClick}
                    className={`font-semibold ${colors.demand} hover:underline focus:outline-none ${
                      disabled ? 'cursor-default hover:no-underline' : ''
                    }`}
                  >
                    {card.recommendedUnits}
                  </button>{' '}
                  units of {componentName} for {locationName}{' '}
                  <button
                    onClick={handleAllocationClick}
                    className={`font-semibold text-purple-600 hover:underline focus:outline-none ${
                      disabled ? 'cursor-default hover:no-underline' : ''
                    }`}
                  >
                    allocated
                  </button>{' '}
                  between {supplierText}.
                </>
              ) : (
                <>
                  Purchase{' '}
                  <button
                    onClick={handleQuantityClick}
                    className={`font-semibold ${colors.demand} hover:underline focus:outline-none ${
                      disabled ? 'cursor-default hover:no-underline' : ''
                    }`}
                  >
                    {card.recommendedUnits}
                  </button>{' '}
                  units of {componentName} for {locationName}{' '}
                  <button
                    onClick={handleAllocationClick}
                    className={`font-semibold text-purple-600 hover:underline focus:outline-none ${
                      disabled ? 'cursor-default hover:no-underline' : ''
                    }`}
                  >
                    allocated
                  </button>{' '}
                  between {supplierText} (costs{' '}
                  <span className={`font-semibold ${colors.cost}`}>
                    {formattedSavings}
                  </span>{' '}
                  more in Q{card.quarter}).
                </>
              )}
            </p>

            {/* Action buttons - only show if not disabled and not disableActions */}
            {!disableActions && !disabled && (
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleIgnoreCard}
                  className="rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Ignore
                </button>
                <button
                  onClick={handleSnoozeCard}
                  className="rounded-md px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Snooze
                </button>
                <button
                  onClick={handleAcceptCard}
                  className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Accept
                </button>
              </div>
            )}
          </div>

          {/* Right side: Badges only */}
          <div className="min-w-[180px] border-l border-gray-200 pl-4">
            {/* Badges */}
            <div className="space-y-2">
              <div
                className={`flex items-center rounded-full px-3 py-1 ${urgencyBgColor}`}
              >
                <Clock className={`mr-2 h-4 w-4 ${urgencyTextColor}`} />
                <span className={`text-sm font-medium ${urgencyTextColor}`}>
                  {immediacy}
                </span>
              </div>
              <div
                className={`flex items-center rounded-full px-3 py-1 ${impactBgColor}`}
              >
                <TrendingUp className={`mr-2 h-4 w-4 ${impactTextColor}`} />
                <span className={`text-sm font-medium ${impactTextColor}`}>
                  {impactText}
                </span>
              </div>
              <div
                className={`flex items-center rounded-full px-3 py-1 ${opportunityBgColor}`}
              >
                <Award className={`mr-2 h-4 w-4 ${opportunityTextColor}`} />
                <span className={`text-sm font-medium ${opportunityTextColor}`}>
                  {opportunityText}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable sections - Only visible when their state is true */}
      {quantityOpen && (
        <div className="border-t border-gray-200 p-4">
          <QuantityExplanation card={card} onClose={closeAllSections} />
        </div>
      )}

      {allocationOpen && (
        <div className="border-t border-gray-200 p-4">
          <SupplierAllocation onClose={closeAllSections} />
        </div>
      )}

      {riskOpen && (
        <div className="border-t border-gray-200 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-medium">Risk Considerations</h3>
            <button
              onClick={closeAllSections}
              className="text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>
          <RiskConsiderations card={card} />
        </div>
      )}
    </Card>
  )
}
