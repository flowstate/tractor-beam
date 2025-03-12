import { createTRPCRouter, publicProcedure } from '../trpc'
import {
  type QuarterlyDemandOutlookModel,
  dbModelToResponse,
  type ModelDemandByLocationModel,
  modelDemandDbToResponse,
} from '~/lib/visualize/visualization.types'

import { TRPCError } from '@trpc/server'

export const outlookRouter = createTRPCRouter({
  // Get the latest quarterly demand outlook
  getOutlook: publicProcedure.query(async ({ ctx }) => {
    // Find the latest outlook with isDefault = true
    const outlook = await ctx.db.quarterlyDemandOutlook.findFirst({
      where: {
        isDefault: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    if (!outlook) {
      throw new Error(
        'No quarterly demand outlook found. Run the generator script first.'
      )
    }

    // Cast the raw data to our model interface
    const typedOutlook = outlook as unknown as QuarterlyDemandOutlookModel

    // Return both the raw model and the formatted response
    return {
      raw: typedOutlook,
      formatted: dbModelToResponse(typedOutlook),
    }
  }),

  getLocationDemand: publicProcedure.query(async ({ ctx }) => {
    const modelDemand = await ctx.db.modelDemandByLocation.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: 'desc' },
    })

    if (!modelDemand) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'No model demand by location data found',
      })
    }

    // Transform the data for the frontend
    return {
      raw: modelDemand,
      formatted: modelDemandDbToResponse(
        modelDemand as unknown as ModelDemandByLocationModel
      ),
    }
  }),
})
