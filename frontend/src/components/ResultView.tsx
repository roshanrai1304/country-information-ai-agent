'use client'

import { Check, RotateCcw } from 'lucide-react'
import type { ApiResponse } from '@/lib/api'

interface Props {
  question: string
  data: ApiResponse
  onNewQuery: () => void
}

export default function ResultView({ question, data, onNewQuery }: Props) {
  const isComparison = data.countries.length > 1
  const title = isComparison ? data.countries.join(' vs ') : data.countries[0] ?? ''

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Status badge row */}
      <div className="flex items-center gap-3 mb-6">
        <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
          <Check size={11} />
          Verified Ground Truth
        </span>
        {data.source && (
          <span className="text-xs text-gray-400 font-mono uppercase tracking-wide">
            Source: {data.source}
          </span>
        )}
      </div>

      {/* Country / comparison hero card */}
      {data.countries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-5">
          <h1 className="text-4xl font-black text-navy mb-4 leading-tight">{title}</h1>

          {/* Country chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {data.countries.map((c) => (
              <span
                key={c}
                className="text-xs bg-navy/10 text-navy px-3 py-1 rounded-full font-semibold"
              >
                {c}
              </span>
            ))}
          </div>

          {/* Answer */}
          <div className="bg-surface rounded-xl p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs">✦</span>
              </div>
              <span className="text-[10px] font-black text-navy uppercase tracking-widest">
                {isComparison ? 'Comparative Analysis' : 'AI Analyst Note'}
              </span>
            </div>
            <p className="text-gray-700 leading-relaxed text-[15px] whitespace-pre-wrap">
              {data.answer}
            </p>
          </div>
        </div>
      )}

      {/* Original inquiry echo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-5 shadow-sm">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Original Inquiry
        </p>
        <p className="text-gray-700 italic text-sm">&quot;{question}&quot;</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Data source:{' '}
          <span className="text-navy underline underline-offset-2">
            REST Countries API (restcountries.com/v3.1)
          </span>
        </p>
        <button
          onClick={onNewQuery}
          className="flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-navy-dark transition-colors shadow-sm"
        >
          <RotateCcw size={13} />
          New Query
        </button>
      </div>
    </div>
  )
}
