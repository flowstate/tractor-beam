import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { useChat } from '~/app/hooks/useChat'
import { ChatContainer } from './chat-container'
import type {
  DemandHistoricalDataPoint,
  DemandPredictionResponse,
} from '~/lib/prediction/prediction.types'

interface ChatContextType {
  setContext: (context: string) => void
  setForecastData: (data: DemandPredictionResponse[]) => void
  setHistoricalData: (data: DemandHistoricalDataPoint[]) => void
  updateWithForecastData: (
    forecastResponse: DemandPredictionResponse[],
    historicalData: DemandHistoricalDataPoint[]
  ) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [chatContext, setChatContext] = useState('')
  const [forecastData, setForecastData] = useState<DemandPredictionResponse[]>(
    []
  )
  const [historicalData, setHistoricalData] = useState<
    DemandHistoricalDataPoint[]
  >([])
  const [isOpen, setIsOpen] = useState(false)

  const { messages, input, setInput, sendMessage, isLoading } = useChat({
    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Hi! I can help explain your demand forecast. What would you like to know?',
      },
    ],
    context: chatContext,
    forecastData,
    historicalData,
  })

  const toggleChat = () => setIsOpen(!isOpen)

  // Helper function to update context based on forecast and historical data
  const updateWithForecastData = (
    forecastResponse: DemandPredictionResponse[],
    historicalData: DemandHistoricalDataPoint[]
  ) => {
    if (!forecastResponse.length) return

    // Get location and model info from the first forecast point
    const firstForecast = forecastResponse[0]
    const forecastData = firstForecast.forecast
    const locationId = firstForecast.locationId
    const modelId = firstForecast.modelId

    // Calculate summary statistics using the same approach as demand-forecast-chart.tsx
    const next30DaysAvg =
      forecastData.slice(0, 30).reduce((sum, point) => sum + point.value, 0) /
      Math.min(30, forecastData.length)

    const next90DaysAvg =
      forecastData
        .slice(0, Math.min(90, forecastData.length))
        .reduce((sum, point) => sum + point.value, 0) /
      Math.min(90, forecastData.length)

    const peakDemand = Math.max(...forecastData.map((point) => point.value))

    // Get metadata from the first forecast point
    const metadata = firstForecast.metadata

    // Create a rich context string
    const context = `
      Forecast for ${modelId ? `Model: ${modelId}` : 'All Models'} ${locationId ? `at Location: ${locationId}` : 'across All Locations'}

      Summary:
      - Next 30 days average demand: ${next30DaysAvg.toFixed(2)} units
      - Next 90 days average demand: ${next90DaysAvg.toFixed(2)} units
      - Peak demand: ${peakDemand.toFixed(2)} units
      ${metadata?.seasonalityStrength !== undefined ? `- Seasonality strength: ${(metadata.seasonalityStrength * 100).toFixed(1)}%` : ''}
      ${metadata?.trendStrength !== undefined ? `- Trend strength: ${(metadata.trendStrength * 100).toFixed(1)}%` : ''}

      The forecast covers ${forecastData.length} days into the future.
      It's based on ${historicalData.length} days of historical data.
    `.trim()

    setChatContext(context)
    setForecastData(forecastResponse)
    setHistoricalData(historicalData)
  }

  return (
    <ChatContext.Provider
      value={{
        setContext: setChatContext,
        setForecastData,
        setHistoricalData,
        updateWithForecastData,
      }}
    >
      {children}
      <ChatContainer
        messages={messages}
        input={input}
        setInput={setInput}
        sendMessage={sendMessage}
        isLoading={isLoading}
        isOpen={isOpen}
        toggleChat={toggleChat}
      />
    </ChatContext.Provider>
  )
}

export function useGlobalChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useGlobalChat must be used within a ChatProvider')
  }
  return context
}
