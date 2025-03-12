import React, { useRef, useEffect } from 'react'
import { ChatBubble } from './chat-bubble'
import { ChatInput } from './chat-input'
import { type Message } from '~/app/hooks/useChat'

interface ChatContainerProps {
  messages: Message[]
  input: string
  setInput: (input: string) => void
  sendMessage: (message: string) => void
  isLoading: boolean
  isOpen: boolean
  toggleChat: () => void
}

export function ChatContainer({
  messages,
  input,
  setInput,
  sendMessage,
  isLoading,
  isOpen,
  toggleChat,
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex flex-col rounded-lg bg-white shadow-xl transition-all duration-300 ${
        isOpen ? 'h-96 w-80' : 'h-12 w-12'
      }`}
    >
      {isOpen ? (
        <>
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
            <h3 className="text-lg font-medium">Forecast Assistant</h3>
            <button
              onClick={toggleChat}
              className="rounded-full p-1 hover:bg-gray-100"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <ChatInput
              input={input}
              setInput={setInput}
              sendMessage={sendMessage}
              isLoading={isLoading}
            />
          </div>
        </>
      ) : (
        <button
          onClick={toggleChat}
          className="flex h-full w-full items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
