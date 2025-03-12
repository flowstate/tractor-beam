import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc'
import { historicalsRouter } from './routers/historicals'
import { predictionsRouter } from './routers/predictions'
import { chatRouter } from '~/server/api/routers/chat'
import { recommendationsRouter } from './routers/recommendations'
import { outlookRouter } from './routers/outlook'
import { dataRouter } from './routers/data'
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  chat: chatRouter,
  historicals: historicalsRouter,
  predictions: predictionsRouter,
  recommendations: recommendationsRouter,
  outlook: outlookRouter,
  data: dataRouter,
})

// export type definition of API
export type AppRouter = typeof appRouter

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter)
