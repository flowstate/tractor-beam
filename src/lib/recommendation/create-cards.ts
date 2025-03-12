import type { ComponentId, LocationId } from '~/lib/types/types'
import { makeLocationComponentRecord } from '../utils'
import type {
  CardCollection,
  QuarterlyCard,
  ReasonedAllocationStrategy,
  StrategyImpactCalculation,
} from './recommendation.types'
import { PrismaClient, type Prisma } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Creates quarterly cards from the strategy impact calculation
 */
export function createQuarterlyCards(
  impactCalculation: StrategyImpactCalculation
): CardCollection {
  const { currentStrategy, recommendedStrategy, impact } = impactCalculation

  // Initialize the card collection
  const cards: CardCollection = makeLocationComponentRecord<QuarterlyCard[]>([])

  // Process each location and component
  for (const locationId in recommendedStrategy) {
    for (const componentId in recommendedStrategy[locationId as LocationId]) {
      const typedLocationId = locationId as LocationId
      const typedComponentId = componentId as ComponentId

      // Get the full strategy
      const strategy = recommendedStrategy[typedLocationId][typedComponentId]

      // Skip if strategy is missing
      if (!strategy) continue

      // Create cards for Q1 and Q2
      const q1Card = createQuarterlyCard(
        typedLocationId,
        typedComponentId,
        1,
        2025,
        currentStrategy,
        strategy,
        impact
      )

      const q2Card = createQuarterlyCard(
        typedLocationId,
        typedComponentId,
        2,
        2025,
        currentStrategy,
        strategy,
        impact
      )

      // Add cards to collection
      cards[typedLocationId][typedComponentId] = [q1Card, q2Card]
    }
  }

  return cards
}

/**
 * Creates a quarterly card for a specific location, component, and quarter
 */
function createQuarterlyCard(
  locationId: LocationId,
  componentId: ComponentId,
  quarter: number,
  year: number,
  currentStrategy: StrategyImpactCalculation['currentStrategy'],
  strategy: ReasonedAllocationStrategy,
  impact: StrategyImpactCalculation['impact']
): QuarterlyCard {
  // Get the appropriate impact data based on quarter
  const unitDelta =
    quarter === 1
      ? impact.q1UnitDeltas[locationId][componentId]
      : impact.q2UnitDeltas[locationId][componentId]

  const costDelta =
    quarter === 1
      ? impact.q1CostDeltas[locationId][componentId]
      : impact.q2CostDeltas[locationId][componentId]

  // Create the card
  return {
    locationId,
    componentId,
    quarter,
    year,

    // Current strategy data
    currentUnits:
      currentStrategy.quarterlyNeeds[locationId][componentId][quarter - 1]
        .totalRequired,
    currentCost:
      currentStrategy.quarterlyCosts[locationId][componentId][quarter - 1]
        .totalCost,

    // Recommended strategy data
    recommendedUnits:
      strategy.demandForecast.quarterlyDemand[quarter - 1]?.totalRequired ?? 0,
    recommendedCost: strategy.quarterlyCosts?.[quarter - 1]?.totalCost ?? 0,

    // Impact data
    unitDelta,
    costDelta,

    // Prioritization data
    urgency: impact.urgency[locationId][componentId],
    impactLevel: impact.impact[locationId][componentId],
    priority: impact.priority[locationId][componentId],
    opportunityScore: impact.opportunityScore[locationId][componentId],

    // Full strategy data
    strategy: createQuarterlyStrategy(strategy, quarter),
  }
}

/**
 * Creates a quarterly version of a ReasonedAllocationStrategy
 * by filtering the data to only include the specified quarter
 */
function createQuarterlyStrategy(
  strategy: ReasonedAllocationStrategy,
  quarter: number
): ReasonedAllocationStrategy {
  // Create a deep copy of the strategy
  const quarterlyStrategy: ReasonedAllocationStrategy = {
    ...strategy,

    // Filter demand forecast to only include the specified quarter
    demandForecast: {
      quarterlyDemand: strategy.demandForecast.quarterlyDemand.filter(
        (qd) => qd.quarter === quarter
      ),
    },

    // Filter original demand to only include the specified quarter
    originalDemand: {
      quarterlyDemand: strategy.originalDemand.quarterlyDemand.filter(
        (qd) => qd.quarter === quarter
      ),
    },

    // Filter quarterly costs to only include the specified quarter
    quarterlyCosts: strategy.quarterlyCosts?.filter(
      (qc) => qc.quarter === quarter
    ),

    // Filter supplier allocations to only include quantities for the specified quarter
    supplierAllocations: strategy.supplierAllocations.map((allocation) => ({
      ...allocation,
      quarterlyQuantities: allocation.quarterlyQuantities?.filter(
        (qq) => qq.quarter === quarter
      ),
    })),
  }

  return quarterlyStrategy
}

/**
 * Flattens the card collection into an array of cards
 * for easier filtering and sorting
 */
export function flattenCards(cards: CardCollection): QuarterlyCard[] {
  const flattenedCards: QuarterlyCard[] = []

  for (const locationId in cards) {
    for (const componentId in cards[locationId as LocationId]) {
      flattenedCards.push(
        ...cards[locationId as LocationId][componentId as ComponentId]
      )
    }
  }

  return flattenedCards
}

/**
 * Sorts cards by priority and opportunity score
 */
export function sortCardsByPriority(cards: QuarterlyCard[]): QuarterlyCard[] {
  return [...cards].sort((a, b) => {
    // First sort by quarter (Q1 before Q2)
    if (a.quarter !== b.quarter) {
      return a.quarter - b.quarter
    }

    // Then by priority (critical > important > standard > optional)
    const priorityOrder = {
      critical: 0,
      important: 1,
      standard: 2,
      optional: 3,
    }

    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }

    // Finally by opportunity score (higher is better)
    return b.opportunityScore - a.opportunityScore
  })
}

/**
 * Saves a card collection to the database
 */
export async function saveCardCollection(
  cards: CardCollection
): Promise<Array<unknown>> {
  // Flatten the nested structure into an array of cards
  const flatCards = flattenCards(cards)

  // Save each card to the database
  return Promise.all(flatCards.map((card) => saveCardToDatabase(card)))
}

/**
 * Saves a single card to the database
 */
async function saveCardToDatabase(card: QuarterlyCard): Promise<unknown> {
  return prisma.quarterlyRecommendationCard.create({
    data: {
      locationId: card.locationId,
      componentId: card.componentId,
      quarter: card.quarter,
      year: card.year,
      currentUnits: card.currentUnits,
      currentCost: card.currentCost,
      recommendedUnits: card.recommendedUnits,
      recommendedCost: card.recommendedCost,
      unitDelta: card.unitDelta,
      costDelta: card.costDelta,
      urgency: card.urgency,
      impactLevel: card.impactLevel,
      priority: card.priority,
      opportunityScore: card.opportunityScore,
      strategy: card.strategy as unknown as Prisma.InputJsonValue, // Type cast for Prisma JSON field
    },
  })
}
