'use client'

import { useState, type FormEvent } from 'react'
import { Search, Globe, Languages, MapPin, Phone, Clock, Landmark, ArrowLeftRight } from 'lucide-react'

const EXAMPLE_PROMPTS = [
  { label: 'Compare the population of India and China', icon: ArrowLeftRight },
  { label: 'What currency does Japan use?', icon: Landmark },
  { label: 'Which countries border France?', icon: MapPin },
  { label: 'Official languages in Switzerland', icon: Languages },
  { label: 'What timezone is Australia in?', icon: Clock },
  { label: 'What is the calling code of Germany?', icon: Phone },
  { label: 'Is Mongolia landlocked?', icon: Globe },
  { label: 'Compare the area of Russia and Canada', icon: ArrowLeftRight },
]

interface Props {
  onSubmit: (question: string) => void
}

export default function HomeContent({ onSubmit }: Props) {
  const [question, setQuestion] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (question.trim()) onSubmit(question.trim())
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-14">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-7xl font-black text-navy mb-5 tracking-tight leading-none">
          The Archivist
        </h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
          Direct, real-time country data fetched exclusively from the REST Countries API.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-5">
        <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-200 focus-within:border-navy transition-colors">
          <Search size={18} className="text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What is the population of Canada? Or tell me about Kenya's currency..."
            className="flex-1 bg-transparent outline-none text-gray-700 placeholder-gray-400 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={!question.trim()}
          className="bg-navy text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-navy-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          Analyze →
        </button>
      </form>

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2 justify-center mb-14">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSubmit(p.label)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm text-gray-600 border border-gray-200 hover:border-navy hover:text-navy transition-colors shadow-sm font-medium"
          >
            <p.icon size={13} className="text-gray-400" />
            {p.label}
          </button>
        ))}
      </div>

      {/* Info cards grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Verified REST Data */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
            <span className="text-emerald-600 text-lg">✓</span>
          </div>
          <h3 className="text-navy font-bold text-base mb-2">Verified REST Data</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            Every answer is fetched on-demand from official REST API endpoints. We ensure zero
            hallucination by never using pre-trained model knowledge for core metrics.
          </p>
        </div>

        {/* Spotlight card */}
        <div className="col-span-1 bg-gradient-to-br from-slate-600 to-slate-800 rounded-2xl overflow-hidden relative min-h-[200px] shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
          <div className="absolute top-4 left-4">
            <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
              Spotlight
            </span>
          </div>
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-white/60 text-xs mb-1 uppercase tracking-wide">Featured Country</p>
            <p className="text-white font-bold text-sm">Japan Intelligence Feed</p>
          </div>
        </div>

        {/* Right column cards */}
        <div className="col-span-1 flex flex-col gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">API Response</span>
            </div>
            <h4 className="text-navy font-bold text-sm mb-1">Japan Data Feed</h4>
            <p className="text-gray-500 text-xs leading-relaxed">
              Current JSON response from the REST Countries API including population, land area, and currency.
            </p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
            <span className="text-[10px] font-black text-navy uppercase tracking-widest">API Monitoring</span>
            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
              Actively tracking live response times for REST Countries API endpoints.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
            Real-time Metrics
          </p>
          <p className="text-6xl font-black text-navy leading-none mb-1">195</p>
          <p className="text-gray-600 font-semibold">Sovereign Nations</p>
          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
            <span>↻</span>
            <span>Cache updated 4m ago</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
            API Retrieval Log
          </p>
          <p className="text-sm text-gray-600 italic leading-relaxed">
            &quot;Success: Successfully retrieved endpoint /v3.1/region/africa. Data validation
            complete. All retrieved currency and population fields match the latest API schema
            version.&quot;
          </p>
        </div>
      </div>
    </div>
  )
}
