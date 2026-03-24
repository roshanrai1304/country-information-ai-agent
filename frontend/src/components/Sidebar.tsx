'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe, Clock, BookOpen, Settings, HelpCircle, Plus } from 'lucide-react'

const navItems = [
  { label: 'Intelligence', href: '/', icon: Globe },
  { label: 'Archives', href: '/history', icon: Clock },
  { label: 'Methodology', href: '/about', icon: BookOpen },
]

const bottomItems = [
  { label: 'Settings', href: '#', icon: Settings },
  { label: 'Support', href: '#', icon: HelpCircle },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-surface flex flex-col border-r border-gray-200/80 p-4">
      {/* Brand */}
      <div className="mb-6 px-1">
        <h1 className="text-navy font-black text-base leading-tight">The Archivist</h1>
        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5 font-semibold">
          Country Intelligence AI
        </p>
      </div>

      {/* New Inquiry button */}
      <Link
        href="/"
        className="flex items-center gap-2 bg-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold mb-4 hover:bg-navy-dark transition-colors shadow-sm"
      >
        <Plus size={15} />
        New Inquiry
      </Link>

      {/* Primary nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-white text-navy shadow-sm'
                  : 'text-gray-500 hover:bg-white/70 hover:text-navy'
              }`}
            >
              <Icon
                size={16}
                className={isActive ? 'text-navy' : 'text-gray-400'}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="space-y-0.5 pt-4 border-t border-gray-200/80">
        {bottomItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-white/70 hover:text-navy transition-all font-medium"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </div>
    </aside>
  )
}
