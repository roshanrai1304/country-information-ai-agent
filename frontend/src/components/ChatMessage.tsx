import Image from 'next/image'
import { Globe } from 'lucide-react'
import type { FlagInfo } from '@/lib/api'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  countries?: string[]
  flags?: FlagInfo[]
  source?: string | null
  isLoading?: boolean
  isError?: boolean
}

export default function ChatMessage({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-navy text-white px-5 py-3.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 items-start">
      {/* Avatar */}
      <div className="w-8 h-8 bg-navy rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <span className="text-white text-xs">✦</span>
      </div>

      <div className="flex-1 max-w-[80%]">
        {message.isLoading ? (
          <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 border border-gray-200 shadow-sm inline-block">
            <div className="flex gap-1.5 items-center h-4">
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <div className={`bg-white rounded-2xl rounded-tl-sm border shadow-sm overflow-hidden ${
            message.isError ? 'border-red-200' : 'border-gray-200'
          }`}>
            {/* Flag strip — shown only when flag URLs are present */}
            {message.flags && message.flags.length > 0 && (
              <div className={`flex gap-3 px-5 pt-4 pb-3 ${
                message.flags.length > 1 ? 'border-b border-gray-100' : ''
              }`}>
                {message.flags.map((f) => (
                  <div key={f.country} className="flex items-center gap-2.5">
                    <div className="relative w-10 h-7 rounded overflow-hidden border border-gray-200 flex-shrink-0 shadow-sm">
                      <Image
                        src={f.png}
                        alt={f.alt || `Flag of ${f.country}`}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    {message.flags!.length > 1 && (
                      <span className="text-xs font-semibold text-gray-600">{f.country}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Answer text */}
            <div className="px-5 py-4">
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>

            {/* Country chips + source footer */}
            {(message.countries?.length || message.source) && (
              <div className="flex flex-wrap items-center gap-2 px-5 pb-4 pt-1 border-t border-gray-100">
                {message.countries?.map((c) => (
                  <span
                    key={c}
                    className="text-xs bg-navy/10 text-navy px-2.5 py-0.5 rounded-full font-semibold"
                  >
                    {c}
                  </span>
                ))}
                {message.source && (
                  <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                    <Globe size={10} />
                    {message.source}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
