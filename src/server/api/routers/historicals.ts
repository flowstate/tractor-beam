import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { z } from 'zod'
export const historicalsRouter = createTRPCRouter({
  getMarketTrendData: publicProcedure.query(async ({ ctx }) => {
    // Get all daily reports with their first location report
    const dailyReports = await ctx.db.dailyReport.findMany({
      select: {
        date: true,
        locationReports: {
          select: {
            marketTrendIndex: true,
          },
          take: 1, // Just take the first location's report
        },
      },
      orderBy: {
        date: 'asc',
      },
    })

    // Extract the MTI from the first location report for each day
    return dailyReports.map((report) => ({
      date: report.date,
      marketTrendIndex: report.locationReports[0]?.marketTrendIndex ?? 0,
    }))
  }),
  // Get all locations for the selector
  getLocations: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.location.findMany({
      select: { id: true },
    })
  }),

  // Get model demand data for a specific location
  getModelDemand: publicProcedure
    .input(z.object({ locationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId } = input

      // Get daily model demand for this location
      const modelDemandData = await ctx.db.locationDailyReport.findMany({
        where: { locationId },
        select: {
          date: true,
          modelDemand: {
            select: {
              model: { select: { id: true } },
              demandUnits: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      })

      // Process into a format suitable for visualization
      // Group by date, then by model
      const processedData: { date: Date; demand: Record<string, number> }[] =
        modelDemandData.map((report) => {
          const modelDemands: Record<string, number> = {}
          report.modelDemand.forEach((md) => {
            modelDemands[md.model.id] = md.demandUnits
          })

          return {
            date: report.date,
            demand: modelDemands,
          }
        })

      return processedData
    }),

  // Get component failure data for a specific location
  getComponentFailures: publicProcedure
    .input(z.object({ locationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId } = input

      // Get component failures for this location
      const failureData = await ctx.db.locationDailyReport.findMany({
        where: { locationId },
        select: {
          date: true,
          failures: {
            select: {
              component: { select: { id: true, name: true } },
              supplier: { select: { id: true } },
              failureRate: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      })

      return failureData
    }),

  // Get inventory levels for a specific location
  getInventoryLevels: publicProcedure
    .input(z.object({ locationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId } = input

      // Get inventory data for this location
      const inventoryData = await ctx.db.locationDailyReport.findMany({
        where: { locationId },
        select: {
          date: true,
          inventory: {
            select: {
              component: { select: { id: true, name: true } },
              supplier: { select: { id: true } },
              quantity: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      })

      return inventoryData
    }),

  // Get delivery lead times for a specific location
  getDeliveryLeadTimes: publicProcedure
    .input(z.object({ locationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { locationId } = input

      // Get delivery data for this location
      const deliveryData = await ctx.db.locationDailyReport.findMany({
        where: { locationId },
        select: {
          date: true,
          deliveries: {
            select: {
              supplier: { select: { id: true } },
              component: { select: { id: true, name: true } },
              leadTimeVariance: true,
              orderSize: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      })

      return deliveryData
    }),
})
