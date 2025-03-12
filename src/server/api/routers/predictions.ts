import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import { LOCATION_IDS, TRACTOR_MODEL_IDS } from '~/lib/types/types'
import { TRPCError } from '@trpc/server'
import type {
  SavedDemandForecast,
  ForecastPoint,
  DemandHistoricalDataPoint,
  ForecastSummary,
} from '~/lib/prediction/prediction.types'

// Create Zod schemas for our ID types
const locationIdSchema = z.enum(LOCATION_IDS)
const tractorModelIdSchema = z.enum(TRACTOR_MODEL_IDS)

export const predictionsRouter = createTRPCRouter({
  demandForecast: publicProcedure
    .input(
      z.object({
        locationId: locationIdSchema.optional().default(LOCATION_IDS[0]),
        modelId: tractorModelIdSchema.optional().default(TRACTOR_MODEL_IDS[0]),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const forecastData = await ctx.db.demandForecast.findFirst({
          where: {
            locationId: input.locationId,
            modelId: input.modelId,
            isDefault: true,
          },
        })

        if (forecastData) {
          const forecast: SavedDemandForecast = {
            ...forecastData,
            summary: forecastData.summary as unknown as ForecastSummary,
            forecastData:
              forecastData.forecastData as unknown as ForecastPoint[],
            historicalData:
              forecastData.historicalData as unknown as DemandHistoricalDataPoint[],
            futureRegressors: {
              mti: forecastData.futureMti as unknown as number[],
              inflation: forecastData.futureInflation as unknown as number[],
            },
          }
          return forecast
        }

        // If no forecast found, throw an error
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No forecast found for the provided filters',
        })
      } catch (error) {
        console.error('Error fetching demand forecast:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch demand forecast',
          cause: error,
        })
      }
    }),
})
