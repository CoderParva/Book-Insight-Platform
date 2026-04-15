'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, MessageSquare, Home } from 'lucide-react'

export default function Navbar() {
  const path = usePathname()

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/qa', label: 'Ask AI', icon: MessageSquare },
  ]

  return (
    <nav style={{
      background: 'var(--forest)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      position: 'sticky', top: 0, zIndex: 50,
    }}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div style={{
            background: 'var(--amber)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
          }}>
            <BookOpen size={18} color="white" />
          </div>
          <span style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: '1.3rem',
            color: 'white',
            letterSpacing: '-0.02em',
          }}>
            BookInsight
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== '/' && path.startsWith(href))
            return (
              <Link key={href} href={href}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: active ? 'white' : 'rgba(255,255,255,0.6)',
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                }}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
