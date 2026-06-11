'use client'

import { useState, useEffect, useCallback } from 'react'
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
  BarChart3,
  Building2,
  Settings2,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Receipt,
} from 'lucide-react'
import { hasPermission } from '@/lib/rbac'
import { HOTEL_NAME, LOCATION } from '@/lib/constants'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: string[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reservations', label: 'Reservations', icon: CalendarDays },
  { href: '/timeline', label: 'Timeline', icon: Clock },
  { href: '/rooms', label: 'Room Grid', icon: Grid3X3 },
  { href: '/guests', label: 'Guest History', icon: Users },
  { href: '/companies', label: 'Companies', icon: Building2 },
  { href: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'manager'] },
  { href: '/accounting', label: 'Accounting', icon: Receipt, roles: ['admin', 'manager'] },
  { href: '/settings', label: 'Settings', icon: Settings2, roles: ['admin', 'manager'] },
]

function NightAuditClock({ canRun }: { canRun: boolean }) {
  const [timeLeft, setTimeLeft] = useState('')
  const [currentTime, setCurrentTime] = useState('')
  const [auditRan, setAuditRan] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      const diff = midnight.getTime() - now.getTime()
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const checkAuditStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/night-audit')
      const data = await res.json()
      setAuditRan(data.ran)
    } catch { }
  }, [])

  useEffect(() => { checkAuditStatus() }, [checkAuditStatus])

  async function runAudit() {
    setRunning(true)
    setConfirming(false)
    setResult(null)
    try {
      const res = await fetch('/api/night-audit', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setAuditRan(true)
        setResult({ ok: true, msg: `${data.chargesPosted} charge${data.chargesPosted !== 1 ? 's' : ''} posted · ฿${data.totalAmount.toLocaleString()}` })
      } else {
        setResult({ ok: false, msg: data.error ?? 'Failed' })
      }
    } catch {
      setResult({ ok: false, msg: 'Network error' })
    }
    setRunning(false)
  }

  return (
    <div className="px-4 py-3 mx-2 mb-2 rounded-xl bg-white/5 border border-white/10">
      <p className="text-[10px] text-sky-400/70 uppercase tracking-widest font-semibold mb-1">
        Night Audit
      </p>
      <p className="text-lg font-mono font-bold text-white">{timeLeft}</p>
      <p className="text-xs text-white/40 mt-0.5">{currentTime}</p>

      {canRun && (
        <div className="mt-2">
          {auditRan ? (
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span className="text-[10px] font-semibold">Audit complete</span>
            </div>
          ) : confirming ? (
            <div className="space-y-1.5">
              <p className="text-[10px] text-amber-300 font-semibold">Post room charges for all in-house guests?</p>
              <div className="flex gap-1.5">
                <button
                  onClick={runAudit}
                  className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-white text-[10px] font-black rounded transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 py-1 bg-white/10 hover:bg-white/20 text-white/70 text-[10px] font-bold rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : running ? (
            <div className="flex items-center gap-1.5 text-white/50">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-[10px]">Running...</span>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-[10px] font-bold text-sky-300 hover:text-sky-200 transition-colors"
            >
              <Play className="w-3 h-3" /> Run Audit
            </button>
          )}

          {result && (
            <div className={`mt-1.5 flex items-start gap-1 ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {result.ok
                ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                : <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
              <span className="text-[10px] leading-tight">{result.msg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const userRole = (session?.user as any)?.role ?? ''
  const visibleNavItems = NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(userRole))

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
        <NightAuditClock canRun={hasPermission((session?.user as any)?.role ?? '', 'POST_PAYMENT')} />

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map(({ href, label, icon: Icon }) => {
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
