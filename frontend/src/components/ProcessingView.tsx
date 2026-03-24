'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

type StepStatus = 'pending' | 'active' | 'done'

const STEPS = [
  {
    id: 'identify',
    title: 'Intent Identification',
    tags: ['INTENT', 'PARSING'],
    doneLabel: 'Query parsed successfully.',
    activeLabel: 'Analyzing user query...',
  },
  {
    id: 'fetch',
    title: 'Tool Invocation',
    tags: [],
    doneLabel: 'REST Countries API responded.',
    activeLabel: 'Calling REST Countries API...',
  },
  {
    id: 'synthesize',
    title: 'Answer Synthesis',
    tags: [],
    doneLabel: 'Answer synthesised.',
    activeLabel: 'Synthesizing verified data...',
  },
]

interface Props {
  question: string
}

export default function ProcessingView({ question }: Props) {
  const [statuses, setStatuses] = useState<StepStatus[]>(['active', 'pending', 'pending'])
  const contextId = useRef(
    `ISD_${Math.random().toString(36).slice(2, 7).toUpperCase()}`
  )

  useEffect(() => {
    const t1 = setTimeout(() => setStatuses(['done', 'active', 'pending']), 900)
    const t2 = setTimeout(() => setStatuses(['done', 'done', 'active']), 2200)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  return (
    <div className="max-w-3xl mx-auto px-8 py-12">
      {/* USER INQUIRY */}
      <div className="mb-10">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-3">
          <span className="inline-block w-5 border-t-2 border-gray-200" />
          User Inquiry
        </p>
        <h2 className="text-3xl font-black text-navy leading-snug">&quot;{question}&quot;</h2>
      </div>

      {/* Metadata row */}
      <div className="flex gap-10 mb-10">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</p>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-sm font-semibold text-gray-700">In Progress</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Context</p>
          <p className="text-sm font-mono font-semibold text-gray-700">{contextId.current}</p>
        </div>
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pipeline</p>
          <p className="text-sm font-semibold text-gray-700">3-Node LangGraph</p>
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="mb-10">
        {STEPS.map((step, i) => {
          const status = statuses[i]
          const isLast = i === STEPS.length - 1

          return (
            <div key={step.id} className="flex gap-6">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    status === 'done'
                      ? 'bg-emerald-500'
                      : status === 'active'
                      ? 'bg-navy'
                      : 'bg-gray-200'
                  }`}
                >
                  {status === 'done' ? (
                    <Check size={14} className="text-white" />
                  ) : status === 'active' ? (
                    <Loader2 size={14} className="text-white animate-spin" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-px flex-1 min-h-[56px] transition-colors duration-500 ${
                      status === 'done' ? 'bg-emerald-300' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Content column */}
              <div className={`pb-8 flex-1 ${isLast ? 'pb-0' : ''}`}>
                <p
                  className={`text-[11px] font-black uppercase tracking-widest mb-1 transition-colors ${
                    status === 'pending' ? 'text-gray-400' : 'text-navy'
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-sm mb-2 transition-colors ${
                    status === 'pending'
                      ? 'text-gray-400 italic'
                      : status === 'active'
                      ? 'text-gray-600 italic'
                      : 'text-gray-600'
                  }`}
                >
                  {status === 'done' ? step.doneLabel : step.activeLabel}
                </p>

                {step.tags.length > 0 && status !== 'pending' && (
                  <div className="flex gap-2 mb-2">
                    {step.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded font-mono font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {step.id === 'fetch' && status === 'active' && (
                  <div className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 font-mono text-xs text-gray-600">
                    <p>GET /v3.1/name/country?fields=...</p>
                    <p className="text-gray-400 mt-1">Awaiting API response...</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Internal monologue */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 bg-navy rounded-lg flex items-center justify-center">
            <span className="text-white text-xs">✦</span>
          </div>
          <span className="text-[10px] font-black text-navy uppercase tracking-widest">
            Internal Monologue
          </span>
        </div>
        <p className="text-sm text-gray-600 italic leading-relaxed">
          &quot;Parsing the user inquiry to identify country references and data field types.
          Preparing to invoke the REST Countries API with scoped field parameters to minimise
          payload size and ensure full data accuracy...&quot;
        </p>
      </div>
    </div>
  )
}
