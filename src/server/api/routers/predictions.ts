import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '../trpc'
import {
  LOCATION_IDS,
  TRACTOR_MODEL_IDS,
  COMPONENT_IDS,
  SUPPLIER_IDS,
} from '~/lib/types/types'
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
const componentIdSchema = z.enum(COMPONENT_IDS)
const supplierIdSchema = z.enum(SUPPLIER_IDS)

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

  leadTimeForecast: publicProcedure
    .input(
      z.object({
        supplierId: supplierIdSchema,
        componentId: componentIdSchema.optional(),
        locationId: locationIdSchema.optional(),
        futurePeriods: z.number().int().positive().default(90),
      })
    )
    .query(async ({ input }) => {
      try {
        // This is a placeholder - you'll need to implement the lead time preparation function
        // similar to prepareDemandPredictionData
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Lead time forecast not yet implemented',
        })
      } catch (error) {
        console.error('Error in lead time prediction:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate lead time prediction',
          cause: error,
        })
      }
    }),

  failureForecast: publicProcedure
    .input(
      z.object({
        supplierId: supplierIdSchema.optional(),
        componentId: componentIdSchema,
        locationId: locationIdSchema.optional(),
        futurePeriods: z.number().int().positive().default(90),
      })
    )
    .query(async ({ input }) => {
      try {
        // This is a placeholder - you'll need to implement the failure preparation function
        // similar to prepareDemandPredictionData
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Component failure forecast not yet implemented',
        })
      } catch (error) {
        console.error('Error in failure prediction:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate failure prediction',
          cause: error,
        })
      }
    }),

  inventoryOptimization: publicProcedure
    .input(
      z.object({
        componentId: componentIdSchema,
        locationId: locationIdSchema,
        currentInventory: z.number().nonnegative(),
        safetyStockDays: z.number().positive().default(14),
      })
    )
    .query(async ({ input }) => {
      try {
        // This is a placeholder - you'll need to implement inventory optimization
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Inventory optimization not yet implemented',
        })
      } catch (error) {
        console.error('Error in inventory optimization:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate inventory optimization',
          cause: error,
        })
      }
    }),

  supplierPurchaseOptimization: publicProcedure
    .input(
      z.object({
        supplierId: supplierIdSchema,
        locationId: locationIdSchema,
      })
    )
    .query(async ({ input }) => {
      try {
        // This is a placeholder - you'll need to implement supplier purchase optimization
        throw new TRPCError({
          code: 'NOT_IMPLEMENTED',
          message: 'Supplier purchase optimization not yet implemented',
        })
      } catch (error) {
        console.error('Error in supplier purchase optimization:', error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate supplier purchase optimization',
          cause: error,
        })
      }
    }),
})
