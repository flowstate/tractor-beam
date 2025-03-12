import React from 'react'
import { type Message } from '~/app/hooks/useChat'

interface ChatBubbleProps {
  message: Message
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'
        }`}
      >
        {message.content || (
          <span className="flex space-x-1">
            <span className="animate-bounce">.</span>
            <span className="animation-delay-200 animate-bounce">.</span>
            <span className="animation-delay-400 animate-bounce">.</span>
          </span>
        )}
      </div>
    </div>
  )
}
