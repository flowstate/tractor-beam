import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { PrismaClient } from '@prisma/client'
import type {
  QuarterlyCard,
  ReasonedAllocationStrategy,
} from '~/lib/recommendation/recommendation.types'
import type {
  ComponentId,
  LocationId,
  RecommendationImpactLevel,
  RecommendationPriority,
  RecommendationUrgency,
} from '~/lib/types/types'

const prisma = new PrismaClient()

// TODO: add supplier performance data to the response so we can add them to the UI
export const recommendationsRouter = createTRPCRouter({
  getAllCards: publicProcedure.query(async () => {
    // Fetch all quarterly recommendation cards from the database
    const dbCards = await prisma.quarterlyRecommendationCard.findMany({
      orderBy: [
        { quarter: 'asc' },
        { priority: 'asc' },
        { opportunityScore: 'desc' },
      ],
    })

    console.log(`Fetched ${dbCards.length} quarterly recommendation cards`)

    // Map database records to QuarterlyCard type
    const cards: QuarterlyCard[] = dbCards.map((card) => ({
      // Basic identifiers
      locationId: card.locationId as LocationId,
      componentId: card.componentId as ComponentId,
      quarter: card.quarter,
      year: card.year,

      // Current strategy data
      currentUnits: card.currentUnits,
      currentCost: card.currentCost,

      // Recommended strategy data
      recommendedUnits: card.recommendedUnits,
      recommendedCost: card.recommendedCost,

      // Impact data
      unitDelta: card.unitDelta,
      costDelta: card.costDelta,

      // Prioritization data
      urgency: card.urgency as RecommendationUrgency,
      impactLevel: card.impactLevel as RecommendationImpactLevel,
      priority: card.priority as RecommendationPriority,
      opportunityScore: card.opportunityScore,

      // Full strategy data - cast from JSON to ReasonedAllocationStrategy
      strategy: card.strategy as unknown as ReasonedAllocationStrategy,
    }))

    return cards
  }),
})
