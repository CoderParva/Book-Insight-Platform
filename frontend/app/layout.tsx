import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'BookInsight — AI-Powered Book Discovery',
  description: 'Discover, explore, and ask questions about books powered by AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--cream)' }}
          className="py-8 mt-16">
          <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
            <span style={{ fontFamily: 'DM Serif Display, serif', fontSize: '1.1rem', color: 'var(--forest)' }}>
              BookInsight
            </span>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              Built for Ergosphere Solutions Assignment · LM Studio + ChromaDB + Django
            </span>
          </div>
        </footer>
      </body>
    </html>
  )
}
