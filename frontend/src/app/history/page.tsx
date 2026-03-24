'use client'

import { useEffect, useState } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import { getHistory, clearHistory, type HistoryEntry } from '@/lib/history'

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])

  useEffect(() => {
    setEntries(getHistory())
  }, [])

  const handleClear = () => {
    clearHistory()
    setEntries([])
  }

  if (entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-24 text-center">
        <Clock size={52} className="text-gray-300 mx-auto mb-5" />
        <h2 className="text-2xl font-black text-navy mb-2">No Archives Yet</h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
          Your session queries will appear here. History is stored in your browser and clears
          when you close this tab.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-navy">Session Archives</h2>
          <p className="text-sm text-gray-500 mt-1">{entries.length} inquiries this session</p>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          <Trash2 size={14} />
          Clear Session
        </button>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-3">
              <p className="font-semibold text-gray-800 text-sm leading-snug">{entry.question}</p>
              <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {entry.countries.map((c) => (
                <span key={c} className="text-xs bg-navy/10 text-navy px-2.5 py-0.5 rounded-full font-semibold">
                  {c}
                </span>
              ))}
              {[].map((f: string) => (
                <span key={f} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full capitalize">
                  {f}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
              {entry.answer}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
