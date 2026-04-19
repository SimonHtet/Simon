'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Grid3X3,
  Users,
  LogOut,
  Radio,
  ChevronRight,
  Building2,
  BarChart3,
} from 'lucide-react'
import { HOTEL_NAME, LOCATION } from '@/lib/constants'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reservations', label: 'Reservations', icon: CalendarDays },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/rooms', label: 'Room Grid', icon: Grid3X3 },
  { href: '/guests', label: 'Guest History', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
]

function NightAuditClock() {
  const [timeLeft, setTimeLeft] = useState('')
  const [currentTime, setCurrentTime] = useState('')

  useEffect(() => {
    function tick() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()

      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)

      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
      setCurrentTime(
        now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="px-4 py-3 mx-2 mb-2 rounded-xl bg-white/5 border border-white/10">
      <p className="text-[10px] text-sky-400/70 uppercase tracking-widest font-semibold mb-1">
        Night Audit
      </p>
      <p className="text-lg font-mono font-bold text-white">{timeLeft}</p>
      <p className="text-xs text-white/40 mt-0.5">{currentTime}</p>
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ backgroundColor: '#0F2044' }}
      >
        {/* Logo */}
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-black text-white tracking-tight">
            STAYWISE<span className="text-sky-400">.</span>
          </h1>
          <p className="text-sky-400/50 text-[10px] tracking-widest uppercase mt-0.5 font-medium">
            Property Management
          </p>
        </div>

        {/* Date */}
        <div className="px-5 pb-4">
          <p className="text-xs text-white/40">{today}</p>
        </div>

        {/* Night audit */}
        <NightAuditClock />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {session?.user?.name?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{session?.user?.name ?? 'Staff'}</p>
              <p className="text-[10px] text-white/40 capitalize truncate">
                {(session?.user as any)?.role?.replace('_', ' ') ?? 'Front Desk'}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2 text-white/50 hover:text-white hover:bg-white/10 rounded-xl text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">
              {NAV_ITEMS.find((n) => isActive(n.href))?.label ?? 'Dashboard'}
            </h2>
            <p className="text-xs text-gray-400">{HOTEL_NAME} · {LOCATION}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-semibold text-emerald-700">
              <Radio className="w-2.5 h-2.5 animate-pulse" />
              System Live
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
