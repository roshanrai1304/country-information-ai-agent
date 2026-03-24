'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User } from 'lucide-react'

const tabs = [
  { label: 'Query', href: '/' },
  { label: 'History', href: '/history' },
  { label: 'About', href: '/about' },
]

export default function TopNav() {
  const pathname = usePathname()

  return (
    <header className="flex items-center justify-between px-8 py-3.5 border-b border-gray-200/80 bg-surface flex-shrink-0">
      <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
        Editorial Intelligence
      </span>

      <nav className="flex items-center gap-8">
        {tabs.map(({ label, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={label}
              href={href}
              className={`text-sm font-semibold pb-0.5 border-b-2 transition-colors ${
                isActive
                  ? 'text-navy border-navy'
                  : 'text-gray-400 border-transparent hover:text-navy'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <button className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center hover:bg-navy/20 transition-colors">
        <User size={15} className="text-navy" />
      </button>
    </header>
  )
}
