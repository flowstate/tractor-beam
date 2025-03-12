import OpenAI from 'openai'
import { env } from '~/env'

// Create a singleton OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  messages: ChatMessage[]
  model?: string
  temperature?: number
}

export const openaiService = {
  /**
   * Create a streaming chat completion
   */
  async createChatCompletion({
    messages,
    model = 'gpt-4o',
    temperature = 0.7,
  }: ChatCompletionOptions) {
    return openai.chat.completions.create({
      model,
      messages,
      temperature,
      stream: true, // Always stream for better UX
    })
  },
}
