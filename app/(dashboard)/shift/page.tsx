'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, Play, Lock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from '@/lib/toast'

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'

interface Shift {
  id: number
  openedBy: string
  openedAt: string
  closedBy?: string | null
  closedAt?: string | null
  status: string
  openingFloat: number
  expectedCash?: number | null
  countedCash?: number | null
  variance?: number | null
  notes?: string | null
}

interface CloseResult extends Shift {
  breakdown: { openingFloat: number; folioCash: number; paymentCash: number; depositCash: number }
}

function fmtDT(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function fmtB(n: number) {
  return `฿${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export default function ShiftPage() {
  const [current, setCurrent] = useState<Shift | null>(null)
  const [history, setHistory] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [openingFloat, setOpeningFloat] = useState('')
  const [countedCash, setCountedCash] = useState('')
  const [notes, setNotes] = useState('')
  const [closeResult, setCloseResult] = useState<CloseResult | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shifts')
      const data = await res.json()
      if (res.ok) {
        setCurrent(data.current)
        setHistory(Array.isArray(data.history) ? data.history : [])
      }
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function openShift() {
    setBusy(true)
    setCloseResult(null)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingFloat: openingFloat || 0 }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Failed to open shift', 'error'); setBusy(false); return }
      toast('Shift opened')
      setOpeningFloat('')
      await load()
    } catch { toast('Network error', 'error') }
    setBusy(false)
  }

  async function closeShift() {
    if (!current) return
    if (countedCash === '' || isNaN(parseFloat(countedCash))) {
      toast('Count the cash drawer and enter the amount first', 'error')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/shifts/${current.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countedCash: parseFloat(countedCash), notes }),
      })
      const data = await res.json()
      if (!res.ok) { toast(data.error ?? 'Failed to close shift', 'error'); setBusy(false); return }
      setCloseResult(data)
      setCountedCash('')
      setNotes('')
      toast('Shift closed')
      await load()
    } catch { toast('Network error', 'error') }
    setBusy(false)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Shift / Cash Drawer</h1>
        <p className="text-sm text-gray-500">Open a shift when taking over the drawer; blind-count and drop at handover</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : current ? (
        /* Open shift: close form */
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Shift Open</h2>
                <p className="text-xs text-gray-500">
                  Opened by <span className="font-semibold">{current.openedBy}</span> at {fmtDT(current.openedAt)} · float {fmtB(current.openingFloat)}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-700">OPEN</span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 mb-4">
            <strong>Blind drop:</strong> count the physical cash in the drawer first. The expected figure is revealed only after you submit — this keeps the count honest.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Counted Cash (฿)</label>
              <input
                type="number" min={0} step={0.01} placeholder="0.00"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                className={`${inputCls} w-full mt-1`}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notes (optional)</label>
              <input
                type="text" placeholder="e.g. ฿500 paid out for taxi refund"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} w-full mt-1`}
              />
            </div>
          </div>

          <button
            onClick={closeShift}
            disabled={busy}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Close Shift & Drop Cash
          </button>
        </div>
      ) : (
        /* No open shift: open form */
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">No Shift Open</h2>
              <p className="text-xs text-gray-500">Open a shift to start tracking the cash drawer</p>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Opening Float (฿)</label>
              <input
                type="number" min={0} step={0.01} placeholder="0.00"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className={`${inputCls} w-44 mt-1 block`}
              />
            </div>
            <button
              onClick={openShift}
              disabled={busy}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Open Shift
            </button>
          </div>
        </div>
      )}

      {/* Close result */}
      {closeResult && (
        <div className={`rounded-2xl border p-6 ${Math.abs(closeResult.variance ?? 0) < 0.01 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'}`}>
          <div className="flex items-center gap-2 mb-3">
            {Math.abs(closeResult.variance ?? 0) < 0.01
              ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              : <AlertTriangle className="w-5 h-5 text-amber-600" />}
            <h2 className="font-bold text-gray-900">
              {Math.abs(closeResult.variance ?? 0) < 0.01
                ? 'Drawer balanced — no variance'
                : `Variance: ${(closeResult.variance ?? 0) > 0 ? '+' : ''}${fmtB(closeResult.variance ?? 0)} (${(closeResult.variance ?? 0) > 0 ? 'over' : 'short'})`}
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="bg-white/70 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Expected Cash</p>
              <p className="font-black text-slate-900">{fmtB(closeResult.expectedCash ?? 0)}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                float {fmtB(closeResult.breakdown.openingFloat)} + folios {fmtB(closeResult.breakdown.folioCash)} + payments {fmtB(closeResult.breakdown.paymentCash)} + deposits {fmtB(closeResult.breakdown.depositCash)}
              </p>
            </div>
            <div className="bg-white/70 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Counted Cash</p>
              <p className="font-black text-slate-900">{fmtB(closeResult.countedCash ?? 0)}</p>
            </div>
            <div className="bg-white/70 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Variance</p>
              <p className={`font-black ${Math.abs(closeResult.variance ?? 0) < 0.01 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {fmtB(closeResult.variance ?? 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-gray-900">Shift History</h2>
          <p className="text-xs text-gray-500 mt-0.5">Last 20 closed shifts</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Opened', 'Closed', 'By', 'Float', 'Expected', 'Counted', 'Variance', 'Notes'].map((h) => (
                <th key={h} className={`px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide ${['Float', 'Expected', 'Counted', 'Variance'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-slate-500 text-xs">{fmtDT(s.openedAt)}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{fmtDT(s.closedAt)}</td>
                <td className="px-4 py-3 text-slate-700 text-xs">{s.closedBy ?? s.openedBy}</td>
                <td className="px-4 py-3 text-right text-slate-600">{fmtB(s.openingFloat)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.expectedCash != null ? fmtB(s.expectedCash) : '—'}</td>
                <td className="px-4 py-3 text-right text-slate-600">{s.countedCash != null ? fmtB(s.countedCash) : '—'}</td>
                <td className={`px-4 py-3 text-right font-bold ${Math.abs(s.variance ?? 0) < 0.01 ? 'text-emerald-600' : (s.variance ?? 0) > 0 ? 'text-sky-600' : 'text-red-600'}`}>
                  {s.variance != null ? fmtB(s.variance) : '—'}
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate" title={s.notes ?? ''}>{s.notes ?? ''}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400 text-sm">No closed shifts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
