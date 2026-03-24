'use client'

import { useState, useRef, useEffect } from 'react'
import { SquarePen } from 'lucide-react'
import ChatMessage, { type Message } from '@/components/ChatMessage'
import ChatInput from '@/components/ChatInput'
import { askQuestion, ApiError } from '@/lib/api'
import { saveToHistory } from '@/lib/history'

const EXAMPLE_PROMPTS = [
  'What is the capital of Japan?',
  'Compare the population of India and China',
  'What currency does Norway use?',
  'Which countries border France?',
  'Is Mongolia landlocked?',
  'What timezone is Australia in?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (question: string) => {
    if (isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    }
    const loadingMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setIsLoading(true)

    try {
      const data = await askQuestion(question)

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.answer,
        countries: data.countries,
        flags: data.flags,
        source: data.source,
        isError: !data.source,
      }

      setMessages((prev) => [...prev.slice(0, -1), assistantMsg])

      saveToHistory({
        question,
        answer: data.answer,
        countries: data.countries,
        timestamp: Date.now(),
      })
    } catch (err) {
      const content =
        err instanceof ApiError
          ? err.message
          : 'The service is temporarily unavailable. Please try again.'

      const errorMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        isError: true,
      }
      setMessages((prev) => [...prev.slice(0, -1), errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* New Chat button — only visible when there are messages */}
      {messages.length > 0 && (
        <div className="flex justify-end px-6 pt-3 flex-shrink-0">
          <button
            onClick={() => setMessages([])}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-navy disabled:opacity-40 transition-colors"
          >
            <SquarePen size={13} />
            New Chat
          </button>
        </div>
      )}

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <EmptyState onPromptClick={handleSubmit} />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Pinned input */}
      <ChatInput onSubmit={handleSubmit} disabled={isLoading} />
    </div>
  )
}

function EmptyState({ onPromptClick }: { onPromptClick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[420px] text-center px-4">
      <div className="w-12 h-12 bg-navy rounded-2xl flex items-center justify-center mb-5 shadow-sm">
        <span className="text-white text-xl">✦</span>
      </div>
      <h2 className="text-2xl font-black text-navy mb-2">The Archivist</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-sm leading-relaxed">
        Ask anything about countries — capitals, currencies, population, borders, and more.
        All answers sourced live from the REST Countries API.
      </p>
      <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPromptClick(p)}
            className="text-left px-4 py-3 bg-white rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-navy hover:text-navy transition-colors shadow-sm leading-snug"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  )
}
