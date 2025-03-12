import { z } from 'zod'
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc'
import { openaiService, type ChatMessage } from '~/lib/services/openai'
import { observable } from '@trpc/server/observable'

export const chatRouter = createTRPCRouter({
  streamMessage: publicProcedure
    .input(
      z.object({
        message: z.string(),
        context: z.string().optional(),
        forecastData: z.array(z.any()).optional(),
        historicalData: z.array(z.any()).optional(),
        conversationHistory: z
          .array(
            z.object({
              role: z.enum(['user', 'assistant', 'system']),
              content: z.string(),
            })
          )
          .optional(),
      })
    )
    .subscription(async ({ input }) => {
      return observable<{ delta: string; done: boolean }>((observer) => {
        // Build the system message with context about the forecast
        const systemMessage = {
          role: 'system' as const,
          content: `You are a supply chain forecasting assistant for a tractor manufacturing company.
          You help users understand demand forecasts for different tractor models and locations.

          Provide concise, practical insights about the forecast data. Explain patterns, seasonality,
          and potential inventory implications. Use business-friendly language.

          ${input.context ? `\nContext: ${input.context}` : ''}

          ${
            input.forecastData && input.forecastData.length > 0
              ? `\nForecast data available with ${input.forecastData.length} data points.`
              : ''
          }

          ${
            input.historicalData && input.historicalData.length > 0
              ? `\nHistorical data available with ${input.historicalData.length} data points.`
              : ''
          }`,
        }

        // Build messages array with conversation history if available
        const messages: ChatMessage[] = [systemMessage]

        // Add conversation history if provided
        if (input.conversationHistory && input.conversationHistory.length > 0) {
          messages.push(...input.conversationHistory)
        }

        // Add the current user message
        messages.push({
          role: 'user',
          content: input.message,
        })

        const streamCompletion = async () => {
          try {
            const stream = await openaiService.createChatCompletion({
              messages,
            })

            for await (const chunk of stream) {
              const content = chunk.choices[0]?.delta?.content ?? ''
              observer.next({ delta: content, done: false })
            }

            observer.next({ delta: '', done: true })
            observer.complete()
          } catch (error) {
            console.error('Error in streaming chat:', error)
            observer.error(error)
          }
        }

        streamCompletion().catch((err) => {
          console.error('Unhandled error in stream:', err)
          observer.error(err)
        })

        // Return cleanup function
        return () => {
          // Any cleanup if needed
        }
      })
    }),
})
