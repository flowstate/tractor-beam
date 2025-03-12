'use client'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { api } from '~/trpc/react'
import type { QuarterlyDisplayCard } from '~/lib/recommendation/recommendation.types'
import type { RecommendationPriority } from '~/lib/types/types'

// Define the context type
interface CardsClient {
  // Card data
  cards: QuarterlyDisplayCard[]
  isLoading: boolean
  error: Error | null

  // Filtering
  filteredCards: QuarterlyDisplayCard[]
  priorityFilter: RecommendationPriority | 'all'
  setPriorityFilter: (priority: RecommendationPriority | 'all') => void
  quarterFilter: number | 'all'
  setQuarterFilter: (quarter: number | 'all') => void

  // View mode
  viewMode: 'recommendations' | 'snoozed' | 'ignored'
  setViewMode: (mode: 'recommendations' | 'snoozed' | 'ignored') => void

  // Card selection for detailed view
  selectedCard: QuarterlyDisplayCard | null
  setSelectedCard: (card: QuarterlyDisplayCard | null) => void

  // Shopping list
  shoppingList: QuarterlyDisplayCard[]

  // Snoozed cards
  snoozedCards: QuarterlyDisplayCard[]

  // Ignored cards
  ignoredCards: QuarterlyDisplayCard[]

  // Card actions
  handleAccept: (card: QuarterlyDisplayCard) => void
  handleSnooze: (card: QuarterlyDisplayCard) => void
  handleIgnore: (card: QuarterlyDisplayCard) => void
  resetCards: () => void

  // Refresh data
  refreshData: () => void

  // New method
  removeFromShoppingList: (card: QuarterlyDisplayCard) => void

  // Impact metrics
  q1Savings: number
  q2Savings: number
  h1Savings: number
  q1EfficiencyPercentage: number
  q2EfficiencyPercentage: number
  h1EfficiencyPercentage: number

  // Add thresholds to the context
  thresholds: {
    q1: { high: number; medium: number }
    q2: { high: number; medium: number }
  } | null
}

// Create the context with default values
const CardsContext = createContext<CardsClient>({
  cards: [],
  isLoading: false,
  error: null,
  filteredCards: [],
  shoppingList: [],
  snoozedCards: [],
  ignoredCards: [],
  priorityFilter: 'all',
  setPriorityFilter: () => {
    /* no-op */
  },
  quarterFilter: 'all',
  setQuarterFilter: () => {
    /* no-op */
  },
  viewMode: 'recommendations',
  setViewMode: () => {
    /* no-op */
  },
  selectedCard: null,
  setSelectedCard: () => {
    /* no-op */
  },
  handleAccept: () => {
    /* no-op */
  },
  handleSnooze: () => {
    /* no-op */
  },
  handleIgnore: () => {
    /* no-op */
  },
  resetCards: () => {
    /* no-op */
  },
  refreshData: () => {
    /* no-op */
  },
  removeFromShoppingList: () => {
    /* no-op */
  },
  q1Savings: 0,
  q2Savings: 0,
  h1Savings: 0,
  q1EfficiencyPercentage: 0,
  q2EfficiencyPercentage: 0,
  h1EfficiencyPercentage: 0,
  thresholds: null,
})

// Provider component
export function CardsProvider({ children }: { children: React.ReactNode }) {
  // State for card data
  const [cards, setCards] = useState<QuarterlyDisplayCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // State for filtering
  const [priorityFilter, setPriorityFilter] = useState<
    RecommendationPriority | 'all'
  >('all')
  const [quarterFilter, setQuarterFilter] = useState<number | 'all'>('all')

  // State for view mode
  const [viewMode, setViewMode] = useState<
    'recommendations' | 'snoozed' | 'ignored'
  >('recommendations')

  // State for selected card
  const [selectedCard, setSelectedCard] = useState<QuarterlyDisplayCard | null>(
    null
  )

  // Add thresholds state
  const [thresholds, setThresholds] = useState<{
    q1: { high: number; medium: number }
    q2: { high: number; medium: number }
  } | null>(null)

  // Track if thresholds have been initialized
  const thresholdsInitialized = useRef(false)

  // Fetch cards using tRPC
  const {
    data,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = api.recommendations.getAllCards.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })

  // Update state when data changes
  useEffect(() => {
    if (data) {
      // Map the fetched data to include the list property
      const displayCards: QuarterlyDisplayCard[] = data.map((card) => ({
        ...card,
        list: 'recommendations', // Default to recommendations
      }))
      setCards(displayCards)
      setIsLoading(false)
    }

    if (fetchError) {
      setError(fetchError as unknown as Error)
      setIsLoading(false)
    }
  }, [data, fetchError])

  // Calculate thresholds when data is loaded or reset
  useEffect(() => {
    if (!data || thresholdsInitialized.current) return

    // Check if we have the full set of cards (18 for each quarter)
    const q1Cards = data.filter((card) => card.quarter === 1)
    const q2Cards = data.filter((card) => card.quarter === 2)

    // Only set thresholds if we have the full set (or close to it)
    // You can adjust the condition based on your actual data
    if (q1Cards.length >= 18 && q2Cards.length >= 18) {
      // Sort by cash impact (highest savings first)
      const sortedQ1 = [...q1Cards].sort(
        (a, b) => Math.abs(b.costDelta) - Math.abs(a.costDelta)
      )
      const sortedQ2 = [...q2Cards].sort(
        (a, b) => Math.abs(b.costDelta) - Math.abs(a.costDelta)
      )

      // Calculate thresholds for Q1
      const q1Thresholds = {
        high: sortedQ1.length >= 6 ? Math.abs(sortedQ1[5].costDelta) : 0,
        medium: sortedQ1.length >= 12 ? Math.abs(sortedQ1[11].costDelta) : 0,
      }

      // Calculate thresholds for Q2
      const q2Thresholds = {
        high: sortedQ2.length >= 6 ? Math.abs(sortedQ2[5].costDelta) : 0,
        medium: sortedQ2.length >= 12 ? Math.abs(sortedQ2[11].costDelta) : 0,
      }

      setThresholds({
        q1: q1Thresholds,
        q2: q2Thresholds,
      })

      thresholdsInitialized.current = true
    }
  }, [data])

  // Apply filters to cards
  const filteredCards = useMemo(() => {
    return cards
      .filter((card) => {
        // Filter by list (view mode)
        if (card.list !== viewMode) {
          return false
        }

        // Apply priority filter
        if (priorityFilter !== 'all' && card.priority !== priorityFilter) {
          return false
        }

        // Apply quarter filter
        if (quarterFilter !== 'all' && card.quarter !== quarterFilter) {
          return false
        }

        return true
      })
      .sort((a, b) => Math.abs(b.costDelta) - Math.abs(a.costDelta)) // Sort by highest savings
  }, [cards, priorityFilter, quarterFilter, viewMode])

  // Derived lists based on the list property
  const shoppingList = useMemo(
    () => cards.filter((card) => card.list === 'shopping'),
    [cards]
  )
  const snoozedCards = useMemo(
    () => cards.filter((card) => card.list === 'snoozed'),
    [cards]
  )
  const ignoredCards = useMemo(
    () => cards.filter((card) => card.list === 'ignored'),
    [cards]
  )

  // Calculate Q1 savings
  const q1Savings = useMemo(() => {
    return cards
      .filter((card) => card.quarter === 1)
      .reduce((total, card) => total + Math.abs(card.costDelta), 0)
  }, [cards])

  // Calculate Q2 savings
  const q2Savings = useMemo(() => {
    return cards
      .filter((card) => card.quarter === 2)
      .reduce((total, card) => total + Math.abs(card.costDelta), 0)
  }, [cards])

  // Calculate H1 savings (sum of Q1 and Q2)
  const h1Savings = useMemo(() => {
    return q1Savings + q2Savings
  }, [q1Savings, q2Savings])

  // Calculate Q1 efficiency
  const q1EfficiencyPercentage = useMemo(() => {
    const q1Cards = cards.filter((card) => card.quarter === 1)
    const currentUnitsSum = q1Cards.reduce(
      (total, card) => total + card.currentUnits,
      0
    )
    const recommendedUnitsSum = q1Cards.reduce(
      (total, card) => total + card.recommendedUnits,
      0
    )

    if (currentUnitsSum === 0) return 0

    const efficiency =
      ((currentUnitsSum - recommendedUnitsSum) / currentUnitsSum) * 100
    return Math.max(0, efficiency) // Ensure we don't return negative efficiency
  }, [cards])

  // Calculate Q2 efficiency
  const q2EfficiencyPercentage = useMemo(() => {
    const q2Cards = cards.filter((card) => card.quarter === 2)
    const currentUnitsSum = q2Cards.reduce(
      (total, card) => total + card.currentUnits,
      0
    )
    const recommendedUnitsSum = q2Cards.reduce(
      (total, card) => total + card.recommendedUnits,
      0
    )

    if (currentUnitsSum === 0) return 0

    const efficiency =
      ((currentUnitsSum - recommendedUnitsSum) / currentUnitsSum) * 100
    return Math.max(0, efficiency) // Ensure we don't return negative efficiency
  }, [cards])

  // Calculate H1 efficiency
  const h1EfficiencyPercentage = useMemo(() => {
    const currentUnitsSum = cards.reduce(
      (total, card) => total + card.currentUnits,
      0
    )
    const recommendedUnitsSum = cards.reduce(
      (total, card) => total + card.recommendedUnits,
      0
    )

    if (currentUnitsSum === 0) return 0

    const efficiency =
      ((currentUnitsSum - recommendedUnitsSum) / currentUnitsSum) * 100
    return Math.max(0, efficiency) // Ensure we don't return negative efficiency
  }, [cards])

  // Card action handlers
  const handleAccept = (card: QuarterlyDisplayCard) => {
    setCards((prev) =>
      prev.map((c) => (c === card ? { ...c, list: 'shopping' } : c))
    )
  }

  const handleSnooze = (card: QuarterlyDisplayCard) => {
    setCards((prev) =>
      prev.map((c) => (c === card ? { ...c, list: 'snoozed' } : c))
    )
  }

  const handleIgnore = (card: QuarterlyDisplayCard) => {
    setCards((prev) =>
      prev.map((c) => (c === card ? { ...c, list: 'ignored' } : c))
    )
  }

  // Modify the reset function to also reset thresholds
  const resetCards = () => {
    setCards((prev) => prev.map((c) => ({ ...c, list: 'recommendations' })))
    thresholdsInitialized.current = false // Allow thresholds to be recalculated
  }

  // Function to refresh data
  const refreshData = () => {
    setIsLoading(true)
    void refetch()
  }

  // New method to remove a card from shopping list
  const removeFromShoppingList = (card: QuarterlyDisplayCard) => {
    setCards((prev) =>
      prev.map((c) => (c === card ? { ...c, list: 'recommendations' } : c))
    )
  }

  // Context value
  const value = {
    cards,
    isLoading: isLoading || isFetching,
    error,
    filteredCards,
    priorityFilter,
    setPriorityFilter,
    quarterFilter,
    setQuarterFilter,
    viewMode,
    setViewMode,
    selectedCard,
    setSelectedCard,
    handleAccept,
    handleSnooze,
    handleIgnore,
    resetCards,
    refreshData,
    removeFromShoppingList,
    shoppingList,
    snoozedCards,
    ignoredCards,
    q1Savings,
    q2Savings,
    h1Savings,
    q1EfficiencyPercentage,
    q2EfficiencyPercentage,
    h1EfficiencyPercentage,
    thresholds,
  }

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>
}

// Custom hook to use the context
export function useCards() {
  const context = useContext(CardsContext)
  if (context === undefined) {
    throw new Error('useCards must be used within a CardsProvider')
  }
  return context
}
