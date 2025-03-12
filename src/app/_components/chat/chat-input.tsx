import React, { type FormEvent } from 'react'

interface ChatInputProps {
  input: string
  setInput: (input: string) => void
  sendMessage: (message: string) => void
  isLoading: boolean
}

export function ChatInput({
  input,
  setInput,
  sendMessage,
  isLoading,
}: ChatInputProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    sendMessage(input)
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask about your forecast..."
        disabled={isLoading}
        className="flex-1 rounded-l-lg border border-gray-300 px-4 py-2 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="rounded-r-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-indigo-400"
      >
        Send
      </button>
    </form>
  )
}
