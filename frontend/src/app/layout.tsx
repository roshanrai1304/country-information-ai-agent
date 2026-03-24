import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import TopNav from '@/components/TopNav'

export const metadata: Metadata = {
  title: 'The Archivist — Country Intelligence AI',
  description: 'Direct, real-time country data fetched exclusively from the REST Countries API.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen bg-surface overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <TopNav />
            <main className="flex-1 flex flex-col overflow-hidden">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
