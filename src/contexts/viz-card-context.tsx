'use client'
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react'
import { api } from '~/trpc/react'
import type { QuarterlyDisplayCard } from '~/lib/recommendation/recommendation.types'
import type {
  RecommendationPriority,
  ComponentId,
  LocationId,
} from '~/lib/types/types'
import type { QuarterlyCard } from '~/lib/recommendation/recommendation.types'
import type { InventorySimulationData } from '~/lib/visualize/visualization.types'

// Define the context type - similar to CardsContext but simplified for visualization
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
  componentFilter: ComponentId | 'all'
  setComponentFilter: (componentId: ComponentId | 'all') => void

  // Card selection for detailed view
  selectedCard: QuarterlyDisplayCard | null
  setSelectedCard: (card: QuarterlyDisplayCard | null) => void

  // Shopping list - needed for compatibility but not used in viz
  shoppingList: QuarterlyDisplayCard[]
  snoozedCards: QuarterlyDisplayCard[]
  ignoredCards: QuarterlyDisplayCard[]

  // Card actions - needed for compatibility but not used in viz
  handleAccept: (card: QuarterlyDisplayCard) => void
  handleSnooze: (card: QuarterlyDisplayCard) => void
  handleIgnore: (card: QuarterlyDisplayCard) => void
  resetCards: () => void
  refreshData: () => void
  removeFromShoppingList: (card: QuarterlyDisplayCard) => void

  // Impact metrics
  q1Savings: number
  q2Savings: number
  h1Savings: number
  q1EfficiencyPercentage: number
  q2EfficiencyPercentage: number
  h1EfficiencyPercentage: number

  // Additional data for visualization
  locationId: LocationId
  modelId: string
  modelName: string
  components: ComponentId[]
  componentNames: Partial<Record<ComponentId, string>>
  totalImpact: {
    q1: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
    q2: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
    h1: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
  }

  // Overall impact data
  overallImpact: {
    q1: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
    q2: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
    h1: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
  }

  // Heartland impact data
  heartlandImpact: {
    q1: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
    q2: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
    h1: {
      currentCost: number
      recommendedCost: number
      costDelta: number
      costSavingsPercentage: number
      currentUnits: number
      recommendedUnits: number
      unitDelta: number
    }
  }

  // Inventory simulation data
  inventorySimulation: InventorySimulationData
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
  componentFilter: 'all',
  setComponentFilter: () => {
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
  locationId: 'heartland',
  modelId: 'TX-300',
  modelName: 'TX-300',
  components: [],
  componentNames: {},
  totalImpact: {
    q1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    q2: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    h1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
  },
  overallImpact: {
    q1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    q2: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    h1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
  },
  heartlandImpact: {
    q1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    q2: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    h1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
  },
  // Default inventory simulation data
  inventorySimulation: {
    currentStrategy: {
      id: 'Current Strategy',
      data: [],
      color: '#4299e1', // blue
    },
    recommendedStrategy: {
      id: 'Recommended Strategy',
      data: [],
      color: '#48bb78', // green
    },
  },
})

// Provider component
export function VizCardsProvider({ children }: { children: React.ReactNode }) {
  // State for card data
  const [cards, setCards] = useState<QuarterlyDisplayCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // State for metadata
  const [locationId, setLocationId] = useState<LocationId>('heartland')
  const [modelId, setModelId] = useState('TX-300')
  const [modelName, setModelName] = useState('TX-300')
  const [components, setComponents] = useState<ComponentId[]>([])
  const [componentNames, setComponentNames] = useState<
    Partial<Record<ComponentId, string>>
  >({})
  const [totalImpact, setTotalImpact] = useState({
    q1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    q2: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    h1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
  })

  // State for filtering
  const [priorityFilter, setPriorityFilter] = useState<
    RecommendationPriority | 'all'
  >('all')
  const [quarterFilter, setQuarterFilter] = useState<number | 'all'>('all')
  const [componentFilter, setComponentFilter] = useState<ComponentId | 'all'>(
    'all'
  )

  // State for selected card
  const [selectedCard, setSelectedCard] = useState<QuarterlyDisplayCard | null>(
    null
  )

  // Add state for new data
  const [overallImpact, setOverallImpact] = useState({
    q1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    q2: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    h1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
  })

  // Add state for heartland impact
  const [heartlandImpact, setHeartlandImpact] = useState({
    q1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    q2: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
    h1: {
      currentCost: 0,
      recommendedCost: 0,
      costDelta: 0,
      costSavingsPercentage: 0,
      currentUnits: 0,
      recommendedUnits: 0,
      unitDelta: 0,
    },
  })

  // Add state for inventory simulation data
  const [inventorySimulation, setInventorySimulation] =
    useState<InventorySimulationData>({
      currentStrategy: {
        id: 'Current Strategy',
        data: [],
        color: '#4299e1', // blue
      },
      recommendedStrategy: {
        id: 'Recommended Strategy',
        data: [],
        color: '#48bb78', // green
      },
    })

  // Fetch cards using tRPC
  const {
    data,
    isLoading: isFetching,
    error: fetchError,
    refetch,
  } = api.data.getRecommendationData.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })

  // Update state when data changes
  useEffect(() => {
    if (data) {
      // Debug logging to see what data we're receiving
      console.log('Received data from API:', data)
      console.log('Inventory simulation data:', data.inventorySimulation)

      if (data.inventorySimulation) {
        console.log(
          'Current strategy data points:',
          data.inventorySimulation.currentStrategy.data
        )
        console.log(
          'Recommended strategy data points:',
          data.inventorySimulation.recommendedStrategy.data
        )
      }

      // Extract metadata
      setLocationId(data.locationId)
      setModelId(data.modelId)
      setModelName(data.modelName)
      setComponents(data.components)
      setComponentNames(data.componentNames)
      setTotalImpact(data.totalImpact)

      // Set the new data
      if (data.overallImpact) {
        setOverallImpact(data.overallImpact)
      }

      // Set the heartland impact data
      if (data.heartlandImpact) {
        setHeartlandImpact(data.heartlandImpact)
      }

      // Set the inventory simulation data
      if (data.inventorySimulation) {
        setInventorySimulation(data.inventorySimulation)
        // Debug log after setting state
        console.log('Set inventory simulation state:', data.inventorySimulation)
      }

      // Transform cards into QuarterlyDisplayCard format
      const allCards: QuarterlyDisplayCard[] = []

      // Process each component's cards
      Object.entries(data.cardsByComponent).forEach(
        ([componentId, componentCards]) => {
          componentCards.forEach((card: QuarterlyCard) => {
            allCards.push({
              ...card,
              list: 'recommendations', // All cards are in recommendations for viz
            })
          })
        }
      )

      setCards(allCards)
      setIsLoading(false)
    }

    if (fetchError) {
      setError(fetchError as unknown as Error)
      setIsLoading(false)
    }
  }, [data, fetchError])

  // Apply filters to cards
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      // Apply priority filter
      if (priorityFilter !== 'all' && card.priority !== priorityFilter) {
        return false
      }

      // Apply quarter filter
      if (quarterFilter !== 'all' && card.quarter !== quarterFilter) {
        return false
      }

      // Apply component filter
      if (componentFilter !== 'all' && card.componentId !== componentFilter) {
        return false
      }

      return true
    })
  }, [cards, priorityFilter, quarterFilter, componentFilter])

  // These lists are empty for visualization purposes
  const shoppingList: QuarterlyDisplayCard[] = []
  const snoozedCards: QuarterlyDisplayCard[] = []
  const ignoredCards: QuarterlyDisplayCard[] = []

  // Calculate savings metrics - we can use the totalImpact directly
  const q1Savings = Math.abs(totalImpact.q1.costDelta)
  const q2Savings = Math.abs(totalImpact.q2.costDelta)
  const h1Savings = Math.abs(totalImpact.h1.costDelta)

  // Calculate efficiency percentages
  const q1EfficiencyPercentage =
    totalImpact.q1.currentUnits > 0
      ? Math.max(
          0,
          ((totalImpact.q1.currentUnits - totalImpact.q1.recommendedUnits) /
            totalImpact.q1.currentUnits) *
            100
        )
      : 0

  const q2EfficiencyPercentage =
    totalImpact.q2.currentUnits > 0
      ? Math.max(
          0,
          ((totalImpact.q2.currentUnits - totalImpact.q2.recommendedUnits) /
            totalImpact.q2.currentUnits) *
            100
        )
      : 0

  const h1EfficiencyPercentage =
    totalImpact.h1.currentUnits > 0
      ? Math.max(
          0,
          ((totalImpact.h1.currentUnits - totalImpact.h1.recommendedUnits) /
            totalImpact.h1.currentUnits) *
            100
        )
      : 0

  // Card action handlers - no-ops for visualization
  const handleAccept = (card: QuarterlyDisplayCard) => {
    // No-op for visualization
  }

  const handleSnooze = (card: QuarterlyDisplayCard) => {
    // No-op for visualization
  }

  const handleIgnore = (card: QuarterlyDisplayCard) => {
    // No-op for visualization
  }

  const resetCards = () => {
    // No-op for visualization
  }

  const refreshData = () => {
    setIsLoading(true)
    void refetch()
  }

  const removeFromShoppingList = (card: QuarterlyDisplayCard) => {
    // No-op for visualization
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
    componentFilter,
    setComponentFilter,
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
    locationId,
    modelId,
    modelName,
    components,
    componentNames,
    totalImpact,
    overallImpact,
    heartlandImpact,
    inventorySimulation,
  }

  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>
}

// Custom hook to use the context - named useCards for compatibility with recommendation-card
export function useCards() {
  const context = useContext(CardsContext)
  if (context === undefined) {
    throw new Error('useCards must be used within a VizCardsProvider')
  }
  return context
}
