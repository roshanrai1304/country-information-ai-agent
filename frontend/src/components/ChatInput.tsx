'use client'

import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface Props {
  onSubmit: (question: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    if (!value.trim() || disabled) return
    onSubmit(value.trim())
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div className="border-t border-gray-200 bg-surface px-6 py-4 flex-shrink-0">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3 items-end">
        <div className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 focus-within:border-navy transition-colors shadow-sm">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Ask about any country…"
            rows={1}
            className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder-gray-400 resize-none leading-relaxed"
          />
        </div>
        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center hover:bg-navy-dark disabled:opacity-40 transition-colors shadow-sm flex-shrink-0"
        >
          <Send size={15} className="text-white" />
        </button>
      </form>
      <p className="text-center text-[10px] text-gray-400 mt-2.5">
        Data sourced live from REST Countries API · Session history only
      </p>
    </div>
  )
}
