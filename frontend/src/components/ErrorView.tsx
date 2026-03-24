'use client'

import { useState, type FormEvent } from 'react'
import { Map, SearchX, AlignLeft, Globe } from 'lucide-react'

const TRENDING = [
  {
    name: 'Japan',
    iso: 'JPN',
    region: 'ASIA',
    badge: 'VERIFIED',
    note: 'Population, currency, timezones available',
  },
  {
    name: 'Norway',
    iso: 'NOR',
    region: 'EUROPE',
    badge: 'VERIFIED',
    note: 'Borders Sweden, Finland & Russia',
  },
  {
    name: 'Brazil',
    iso: 'BRA',
    region: 'AMERICAS',
    badge: 'VERIFIED',
    note: 'Largest country in South America',
  },
]

const BADGE_STYLES: Record<string, string> = {
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  UPDATED: 'bg-blue-100 text-blue-700',
  ARCHIVE: 'bg-gray-100 text-gray-600',
}

interface Props {
  message: string
  notFound: boolean
  onRetry: (question: string) => void
  onNew: () => void
}

export default function ErrorView({ message, notFound, onRetry }: Props) {
  const [input, setInput] = useState('')

  const handleRetry = (e: FormEvent) => {
    e.preventDefault()
    if (input.trim()) onRetry(input.trim())
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Icon block */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="w-28 h-28 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-200">
            <Map size={54} className="text-gray-200" />
          </div>
          <div className="absolute -bottom-3 -right-3 w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-200">
            <SearchX size={20} className="text-red-400" />
          </div>
        </div>
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-navy mb-4 leading-tight">
          {notFound
            ? "We couldn't find a country by that name."
            : "We couldn't understand that inquiry."}
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">{message}</p>
      </div>

      {/* Suggestion cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <AlignLeft size={18} className="text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-800 mb-1.5 text-sm">Check for spelling errors</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Ensure the name follows standard international naming conventions or ISO standards.
          </p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <Globe size={18} className="text-gray-300 mb-3" />
          <h3 className="font-bold text-gray-800 mb-1.5 text-sm">Try common names</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Try &quot;United Kingdom&quot; instead of &quot;UK&quot;, or formal titles instead of
            abbreviations.
          </p>
        </div>
      </div>

      {/* Retry input */}
      <form onSubmit={handleRetry} className="flex gap-3 mb-12">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Re-enter your question..."
          className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-navy transition-colors shadow-sm"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="bg-navy text-white px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-navy-dark disabled:opacity-40 transition-colors shadow-sm"
        >
          Query
        </button>
      </form>

      {/* Trending */}
      <div className="mb-10">
        <p className="text-[10px] font-black text-navy uppercase tracking-widest mb-4">
          Trending Country Intelligence
        </p>
        <div className="grid grid-cols-3 gap-3">
          {TRENDING.map((c) => (
            <button
              key={c.name}
              onClick={() => onRetry(`Tell me about ${c.name}`)}
              className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm text-left hover:border-navy hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    BADGE_STYLES[c.badge]
                  }`}
                >
                  {c.badge}
                </span>
                <span className="text-gray-300 group-hover:text-navy transition-colors text-sm">
                  ↗
                </span>
              </div>
              <h4 className="font-black text-navy text-base mb-0.5">{c.name}</h4>
              <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-wide">
                ISO: {c.iso} | {c.region}
              </p>
              <p className="text-xs text-gray-500">{c.note}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">✦</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-navy uppercase tracking-widest">
              Global Intelligence Synthesis
            </p>
            <p className="text-[10px] text-gray-400">Powered by The Archivist Engine v1.0</p>
          </div>
        </div>
        <div className="flex gap-5 text-[11px] text-gray-400">
          <button className="hover:text-navy transition-colors">Privacy Codex</button>
          <button className="hover:text-navy transition-colors">Usage Methodology</button>
          <button className="hover:text-navy transition-colors">Support Center</button>
        </div>
      </div>
    </div>
  )
}
