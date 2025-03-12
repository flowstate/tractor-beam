'use client'
import { useCards } from '~/contexts/cards-context'
import RecommendationCard from './recommendation-card'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, ChevronRight, Award, ArrowRight } from 'lucide-react'

export default function RecommendationList() {
  const {
    filteredCards,
    cards, // We'll need all cards to determine thresholds
    isLoading,
    error,
    resetCards,
    viewMode,
    setViewMode,
    handleAccept,
    handleSnooze,
    handleIgnore,
    thresholds, // Get thresholds from context
  } = useCards()

  // Define our category ranking system using thresholds from context
  const categories = useMemo(
    () => [
      {
        id: 'high-q1',
        label: 'High Impact - Q1 2025',
        quarter: 1,
        threshold: thresholds?.q1.high ?? 0,
        isHighest: true,
      },
      {
        id: 'medium-q1',
        label: 'Medium Impact - Q1 2025',
        quarter: 1,
        threshold: thresholds?.q1.medium ?? 0,
        isHighest: false,
      },
      {
        id: 'low-q1',
        label: 'Lower Impact - Q1 2025',
        quarter: 1,
        threshold: 0,
        isHighest: false,
      },
      {
        id: 'high-q2',
        label: 'High Impact - Q2 2025',
        quarter: 2,
        threshold: thresholds?.q2.high ?? 0,
        isHighest: true,
      },
      {
        id: 'medium-q2',
        label: 'Medium Impact - Q2 2025',
        quarter: 2,
        threshold: thresholds?.q2.medium ?? 0,
        isHighest: false,
      },
      {
        id: 'low-q2',
        label: 'Lower Impact - Q2 2025',
        quarter: 2,
        threshold: 0,
        isHighest: false,
      },
    ],
    [thresholds]
  )

  // Group cards by category
  const cardsByCategory = useMemo(() => {
    // Track cards that have been assigned to higher categories
    const assignedCardIds = new Set<string>()

    const grouped = categories.map((category) => {
      // Filter cards by quarter
      let matchingCards = filteredCards.filter((card) => {
        const cardId = `${card.locationId}-${card.componentId}-${card.quarter}-${card.year}`

        // Skip if already assigned
        if (assignedCardIds.has(cardId)) return false

        // Match by quarter
        return card.quarter === category.quarter
      })

      // Sort by cash impact (highest savings first)
      matchingCards = matchingCards.sort(
        (a, b) => Math.abs(b.costDelta) - Math.abs(a.costDelta)
      )

      // Apply threshold filtering
      if (category.isHighest) {
        // For highest category, take cards above the threshold
        matchingCards = matchingCards.filter(
          (card) => Math.abs(card.costDelta) >= category.threshold
        )
      } else {
        // For other categories, take cards between this threshold and the next higher one
        const higherCategory = categories.find(
          (c) =>
            c.quarter === category.quarter && c.threshold > category.threshold
        )

        if (higherCategory) {
          matchingCards = matchingCards.filter(
            (card) =>
              Math.abs(card.costDelta) >= category.threshold &&
              Math.abs(card.costDelta) < higherCategory.threshold
          )
        } else {
          // If no higher category, just use the threshold
          matchingCards = matchingCards.filter(
            (card) => Math.abs(card.costDelta) >= category.threshold
          )
        }
      }

      // Add these cards to our tracking set
      matchingCards.forEach((card) => {
        const cardId = `${card.locationId}-${card.componentId}-${card.quarter}-${card.year}`
        assignedCardIds.add(cardId)
      })

      return {
        ...category,
        cards: matchingCards,
      }
    })

    return grouped
  }, [filteredCards, categories])

  // Find the highest category that has cards
  const activeCategory = useMemo(() => {
    return cardsByCategory.find((category) => category.cards.length > 0) ?? null
  }, [cardsByCategory])

  // Add state to track if a category was just completed
  const [completedCategory, setCompletedCategory] = useState<{
    id: string
    label: string
  } | null>(null)

  // Custom handlers that track completion
  const handleCardAction = (
    action: (card: QuarterlyDisplayCard) => void,
    card: QuarterlyDisplayCard
  ) => {
    // Check if this is the last card in the active category
    if (activeCategory && activeCategory.cards.length === 1) {
      // Save the completed category info before the action changes it
      setCompletedCategory({
        id: activeCategory.id,
        label: activeCategory.label,
      })
    }

    // Call the original action
    action(card)
  }

  // Function to move to the next category
  const moveToNextCategory = () => {
    // Find the next category with cards
    const currentIndex = cardsByCategory.findIndex(
      (c) => c.id === completedCategory?.id
    )

    const nextCategory = cardsByCategory
      .slice(currentIndex + 1)
      .find((c) => c.cards.length > 0)

    // Clear the completed state
    setCompletedCategory(null)
  }

  // Function to dismiss the completion message
  const dismissCompletion = () => {
    setCompletedCategory(null)
  }

  // Render loading state
  if (isLoading) {
    return <div className="p-4 text-center">Loading recommendations...</div>
  }

  // Render error state
  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-center text-red-800">
        Error loading recommendations: {error.message}
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Header - Just the title now */}
      <div className="mb-2">
        {activeCategory ? (
          <h2 className="text-lg font-semibold">
            {activeCategory.cards.length} Recommendations -{' '}
            {activeCategory.label}
          </h2>
        ) : (
          <h2 className="text-lg font-semibold">Recommendations</h2>
        )}
      </div>

      {/* View Mode Selector with Reset Button */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">View:</span>
          <div className="flex gap-1">
            {[
              { id: 'recommendations' as const, label: 'Active' },
              { id: 'snoozed' as const, label: 'Snoozed' },
              { id: 'ignored' as const, label: 'Ignored' },
            ].map((view) => (
              <button
                key={view.id}
                onClick={() => setViewMode(view.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  viewMode === view.id
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reset button - no outline, just text */}
        <button
          onClick={resetCards}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Reset
        </button>
      </div>

      {/* Category Completion Message */}
      {completedCategory && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-lg bg-green-50 p-6 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <Award className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-xl font-medium text-green-800">
            Category Complete!
          </h3>
          <p className="mt-2 text-green-700">
            You've processed all recommendations in the "
            {completedCategory.label}" category.
          </p>

          <div className="mt-6 flex justify-center gap-4">
            {cardsByCategory
              .slice(
                cardsByCategory.findIndex(
                  (c) => c.id === completedCategory.id
                ) + 1
              )
              .find((c) => c.cards.length > 0) ? (
              <button
                onClick={moveToNextCategory}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <span>Continue to Next Category</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}

            <button
              onClick={dismissCompletion}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Take a Break
            </button>
          </div>
        </motion.div>
      )}

      {/* Completion state when no active category */}
      {!activeCategory &&
        !completedCategory &&
        viewMode === 'recommendations' && (
          <div className="mb-3 rounded-lg bg-green-50 p-4 text-center">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-500" />
            <h3 className="text-lg font-medium text-green-800">
              All recommendations processed!
            </h3>
            <p className="mt-1 text-sm text-green-600">
              You&apos;ve reviewed all active recommendations. Check your
              shopping list or reset cards to start over.
            </p>
          </div>
        )}

      {/* Cards with improved animations */}
      <div className="relative">
        <AnimatePresence
          mode="wait" // Keep this to ensure proper sequencing
        >
          {activeCategory &&
          activeCategory.cards.length > 0 &&
          !completedCategory ? (
            <div className="space-y-4">
              {activeCategory.cards.map((card, index) => {
                // Calculate progressive scaling and opacity based on index
                const scale = Math.max(0.92, 1 - index * 0.03)
                const opacity = Math.max(0.4, 1 - index * 0.15)

                return (
                  <motion.div
                    key={`${card.locationId}-${card.componentId}-${card.quarter}-${card.year}`}
                    layout
                    layoutId={`${card.locationId}-${card.componentId}-${card.quarter}-${card.year}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: opacity,
                      y: 0,
                      scale: scale,
                      filter: index === 0 ? 'saturate(1)' : 'saturate(0)',
                      zIndex: 10 - index,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      transition: {
                        duration: 0.3, // Faster exit animation
                        ease: 'easeInOut',
                      },
                    }}
                    transition={{
                      duration: 0.35, // Snappier overall animation
                      ease: 'easeInOut',
                      layout: {
                        duration: 0.35, // Match the duration
                        ease: 'easeInOut',
                        delay: 0.05, // Smaller delay for quicker response
                      },
                    }}
                    whileHover={{
                      scale: 1,
                      opacity: 1,
                      filter: 'saturate(1)',
                      transition: { duration: 0.2 }, // Faster hover response
                    }}
                    className={`${
                      index === 0
                        ? 'shadow-lg ring-2 ring-blue-500'
                        : 'shadow-none'
                    } mb-4 rounded-lg`}
                  >
                    <RecommendationCard
                      card={card}
                      isExpanded={index === 0}
                      disabled={index !== 0}
                      onAccept={(card) => handleCardAction(handleAccept, card)}
                      onSnooze={(card) => handleCardAction(handleSnooze, card)}
                      onIgnore={(card) => handleCardAction(handleIgnore, card)}
                    />
                  </motion.div>
                )
              })}
            </div>
          ) : !completedCategory ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center"
            >
              <p className="text-gray-500">
                {viewMode === 'recommendations'
                  ? 'No active recommendations match your filters.'
                  : viewMode === 'snoozed'
                    ? 'No recommendations have been snoozed.'
                    : 'No recommendations have been ignored.'}
              </p>
              {viewMode !== 'recommendations' && (
                <button
                  onClick={() => setViewMode('recommendations')}
                  className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  View Active Recommendations
                </button>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Next Category Preview - Only show if not in completion state */}
      {/* {activeCategory &&
        !completedCategory &&
        cardsByCategory.findIndex((c) => c.id === activeCategory.id) <
          cardsByCategory.length - 1 && (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-700">Coming up next:</h4>
                {cardsByCategory
                  .slice(
                    cardsByCategory.findIndex(
                      (c) => c.id === activeCategory.id
                    ) + 1
                  )
                  .find((c) => c.cards.length > 0)?.label ??
                  'No more recommendations'}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        )} */}
    </div>
  )
}
