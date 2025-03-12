import { useState, useCallback } from 'react'
import type {
  DemandHistoricalDataPoint,
  DemandPredictionResponse,
} from '~/lib/prediction/prediction.types'
import { api } from '~/trpc/react'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  pending?: boolean
}

interface UseChatOptions {
  initialMessages?: Message[]
  context?: string
  forecastData?: DemandPredictionResponse[]
  historicalData?: DemandHistoricalDataPoint[]
}

export function useChat({
  initialMessages = [],
  context = '',
  forecastData = [],
  historicalData = [],
}: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null)

  // Create a subscription input that we'll update when sending a message
  const [subscriptionInput, setSubscriptionInput] = useState({
    message: '',
    context,
    forecastData,
    historicalData,
    conversationHistory: [] as {
      role: 'user' | 'assistant' | 'system'
      content: string
    }[],
  })

  // Set up subscription
  api.chat.streamMessage.useSubscription(subscriptionInput, {
    enabled: isLoading,
    onData(data) {
      if (data.delta) {
        setStreamingMessage((prev) => {
          if (!prev) return null
          return {
            ...prev,
            content: prev.content + data.delta,
          }
        })
      }

      if (data.done) {
        setStreamingMessage((prev) => {
          if (!prev) return null

          // Add the completed message to the messages array
          setMessages((messages) => [
            ...messages.filter((m) => m.id !== prev.id),
            { ...prev, pending: false },
          ])

          return null
        })

        setIsLoading(false)
      }
    },
    onError(err) {
      console.error('Subscription error:', err)
      setError('Failed to stream response. Please try again.')
      setIsLoading(false)

      // Remove the streaming message
      if (streamingMessage) {
        setMessages((messages) =>
          messages.filter((m) => m.id !== streamingMessage.id)
        )
        setStreamingMessage(null)
      }
    },
  })

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      setError(null)
      setIsLoading(true)

      // Add user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
      }

      setMessages((prev) => [...prev, userMessage])

      // Create a placeholder for the assistant's response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        pending: true,
      }

      setStreamingMessage(assistantMessage)
      setMessages((prev) => [...prev, assistantMessage])

      // Prepare conversation history for the API
      const conversationHistory = messages
        .filter((m) => m.role !== 'system' && !m.pending)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))
        .concat({
          role: 'user',
          content,
        })

      // Update subscription input to trigger the subscription
      setSubscriptionInput({
        message: content,
        context,
        forecastData,
        historicalData,
        conversationHistory,
      })

      // Clear input
      setInput('')
    },
    [
      messages,
      context,
      forecastData,
      historicalData,
      setMessages,
      setInput,
      setIsLoading,
      setError,
    ]
  )

  return {
    messages,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
  }
}
