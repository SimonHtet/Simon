'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Reservation, Folio } from '@/types'
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils'
import { X, Printer, Plus, Check, ArrowRight, ArrowRightLeft } from 'lucide-react'
import { getFoliosPromise, prefetchFolios } from '@/lib/folio-prefetch'
import { toast } from '@/lib/toast'
import { formatMoney, baseToAlt, type HotelSetting } from '@/lib/currency'

interface Props {
  reservation: Reservation
  onConfirm: () => void
  onClose: () => void
}

const PAYMENT_METHODS = [
  { id: 'credit_card', label: 'Credit Card' },
  { id: 'cash', label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'promptpay', label: 'PromptPay / QR' },
  { id: 'city_ledger', label: 'City Ledger' },
  { id: 'company_credit', label: 'Company Credit' },
]

// Main carries the projected room cost. Night audit posts nightly "Room Charge —"
// lines into Main, so those are subtracted from the projection — otherwise the
// room would be counted twice once the audit has run.
function folioBalance(folio: Folio, res: Reservation): number {
  const chargesSum = folio.charges.reduce((s, fc) => s + fc.charge.amount, 0)
  if (folio.name.toLowerCase() === 'main') {
    const roomPosted = folio.charges
      .filter((fc) => fc.charge.category === 'ROOM' && fc.charge.item.startsWith('Room Charge —'))
      .reduce((s, fc) => s + fc.charge.amount, 0)
    const projection = Math.max(0, res.rate * calculateNights(res.checkIn, res.checkOut) - roomPosted)
    return chargesSum + projection
  }
  return chargesSum
}

const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500'

export default function CheckOutModal({ reservation: res, onConfirm, onClose }: Props) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role

  const [folios, setFolios] = useState<Folio[]>([])
  const [activeFolioId, setActiveFolioId] = useState<number | null>(null)
  const [loadingFolios, setLoadingFolios] = useState(true)
  const [checkingOut, setCheckingOut] = useState(false)
  const [settling, setSettling] = useState(false)
  const [showAddFolio, setShowAddFolio] = useState(false)
  const [newFolioName, setNewFolioName] = useState('')
  const [addingFolio, setAddingFolio] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<Record<number, string>>({})
  const [movingChargeId, setMovingChargeId] = useState<number | null>(null)
  const [creditError, setCreditError] = useState('')
  const [managerOverride, setManagerOverride] = useState(false)
  const [billingToMaster, setBillingToMaster] = useState(false)
  const [hotelSetting, setHotelSetting] = useState<HotelSetting | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setHotelSetting(d) })
      .catch(() => { })
    return () => { cancelled = true }
  }, [])

  // Payment detail fields (recording only — not sent to API)
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' })
  const [cashTendered, setCashTendered] = useState('')
  const [transferRef, setTransferRef] = useState('')
  const [ledgerRef, setLedgerRef] = useState('')

  const initCalledRef = useRef(false)
  const moveMenuRef = useRef<HTMLDivElement>(null)

  const nights = calculateNights(res.checkIn, res.checkOut)

  // Credit account derived from reservation.company (already in RESERVATION_INCLUDE)
  const creditLimit = res.company?.creditLimit ?? 0
  const creditUsed = res.company?.creditUsed ?? 0
  const creditAvailable = Math.max(0, creditLimit - creditUsed)
  const creditPct = creditLimit > 0 ? Math.min(100, Math.round((creditUsed / creditLimit) * 100)) : 0
  const canCompanyCredit = !!(res.companyId && creditLimit > 0)
  const creditExceeded = canCompanyCredit && creditUsed >= creditLimit
  const noCityLedgerCompany = !res.companyId || !res.company?.bankAccountNumber

  const refreshFolios = useCallback(async () => {
    const data = await fetch(`/api/reservations/${res.id}/folios`).then((r) => r.json())
    const list: Folio[] = Array.isArray(data) ? data : []
    setFolios(list)
    setActiveFolioId((prev) => {
      if (prev && list.find((f) => f.id === prev)) return prev
      return list[0]?.id ?? null
    })
    setPaymentMethods((prev) => {
      const next = { ...prev }
      list.forEach((f) => {
        if (!(f.id in next)) next[f.id] = f.paymentMethod ?? 'credit_card'
      })
      return next
    })
  }, [res.id])

  // Guard against StrictMode double-invoke; reuse in-flight prefetch promise if available.
  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true
    async function init() {
      setLoadingFolios(true)
      // Reuse the promise started by ReservationDetailPanel (or start a fresh one)
      const cached = getFoliosPromise(res.id)
      let list: Folio[]
      if (cached) {
        const result = await cached
        list = result ?? []
      } else {
        prefetchFolios(res.id)
        const fresh = getFoliosPromise(res.id)!
        const result = await fresh
        list = result ?? []
      }
      setFolios(list)
      setActiveFolioId(list[0]?.id ?? null)
      setPaymentMethods(() => {
        const next: Record<number, string> = {}
        list.forEach((f) => { next[f.id] = f.paymentMethod ?? 'credit_card' })
        return next
      })
      setLoadingFolios(false)
    }
    init()
  }, [res.id])

  // Reset credit error, override and cash input when active folio changes —
  // a stale tendered amount must not validate another folio's balance
  useEffect(() => {
    setCreditError('')
    setManagerOverride(false)
    setCashTendered('')
  }, [activeFolioId])

  // Close move menu on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setMovingChargeId(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const activeFolio = folios.find((f) => f.id === activeFolioId)
  const assignedChargeIds = new Set(folios.flatMap((f) => f.charges.map((fc) => fc.chargeId)))
  const unassignedCharges = (res.charges ?? []).filter((c) => !assignedChargeIds.has(c.id))

  const activePm = activeFolio ? (paymentMethods[activeFolio.id] ?? 'credit_card') : 'credit_card'
  const activeBalance = activeFolio ? folioBalance(activeFolio, res) : 0
  const cashChange = cashTendered.trim() ? Math.max(0, parseFloat(cashTendered) - activeBalance) : 0

  async function handleAssignCharge(chargeId: number, toFolioId: number) {
    setMovingChargeId(null)
    await fetch(`/api/reservations/${res.id}/folios/${toFolioId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chargeId }),
    })
    await refreshFolios()
  }

  async function handleSettleFolio(folioId: number) {
    setCreditError('')
    setSettling(true)
    try {
      const folio = folios.find((f) => f.id === folioId)
      if (!folio) return

      const pm = paymentMethods[folioId] ?? 'credit_card'

      if ((pm === 'company_credit' || pm === 'city_ledger') && res.companyId) {
        const balance = folioBalance(folio, res)
        if (balance > 0) {
          const creditRes = await fetch(`/api/companies/${res.companyId}/credit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: balance,
              description: `Folio ${folio.name} — Res ${res.reservationNumber}`,
              reservationId: res.id,
              folioId: folio.id,
              type: pm === 'city_ledger' ? 'city_ledger' : 'company_credit',
              // Server records the transaction over-limit for managers, so the
              // receivable is never lost — a failed post always blocks settling
              override: managerOverride,
            }),
          })
          if (!creditRes.ok) {
            const err = await creditRes.json()
            setCreditError(err.error ?? 'Credit posting failed')
            return
          }
        }
      }

      const settleRes = await fetch(`/api/reservations/${res.id}/folios/${folioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'settled',
          paymentMethod: pm,
          ...(pm === 'cash' && cashTendered.trim() ? { amountTendered: parseFloat(cashTendered) } : {}),
        }),
      })
      if (!settleRes.ok) {
        const err = await settleRes.json().catch(() => ({}))
        setCreditError(err.error ?? 'Could not settle folio')
        return
      }
      await refreshFolios()
    } finally {
      setSettling(false)
    }
  }

  // Group billing — move this room's whole outstanding bill onto the master room
  async function handleBillToMaster() {
    setCreditError('')
    setBillingToMaster(true)
    try {
      const r = await fetch(`/api/reservations/${res.id}/bill-to-master`, { method: 'POST' })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) {
        setCreditError(data.error ?? 'Could not transfer to master bill')
        return
      }
      toast(`฿${Number(data.transferred ?? 0).toLocaleString()} transferred to master ${data.masterResNumber}`)
      await refreshFolios()
    } finally {
      setBillingToMaster(false)
    }
  }

  async function handleReopenFolio(folioId: number) {
    await fetch(`/api/reservations/${res.id}/folios/${folioId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open' }),
    })
    await refreshFolios()
  }

  // Bug 2: guard against double-fire
  async function handleAddFolio() {
    if (!newFolioName.trim() || addingFolio) return
    setAddingFolio(true)
    try {
      await fetch(`/api/reservations/${res.id}/folios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolioName.trim() }),
      })
      setNewFolioName('')
      setShowAddFolio(false)
      await refreshFolios()
    } finally {
      setAddingFolio(false)
    }
  }

  async function handleConfirm() {
    setCheckingOut(true)
    try {
      await onConfirm()
    } finally {
      setCheckingOut(false)
    }
  }

  const allSettled = folios.length > 0 && folios.every((f) => f.status === 'settled')
  const totalBalance = folios.reduce((s, f) => s + folioBalance(f, res), 0)
  const cashShort = activePm === 'cash' && activeBalance > 0
    && (!cashTendered.trim() || parseFloat(cashTendered) < activeBalance)

  const settleDisabled = settling
    || (activePm === 'company_credit' && canCompanyCredit && creditExceeded && !managerOverride)
    || (activePm === 'city_ledger' && noCityLedgerCompany)
    || cashShort

  return (
    <>
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="w-full max-w-5xl bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">

          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between shrink-0">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                Guest Folio &amp; Settlement
              </p>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">{res.guestName}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Room {res.roomId} · {res.reservationNumber} · {formatDate(res.checkIn)} → {formatDate(res.checkOut)} ({nights}N)
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors mt-0.5">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {loadingFolios ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Folio tabs */}
              <div className="px-6 pt-3 border-b border-slate-200 flex items-end gap-0.5 shrink-0 bg-slate-50">
                {folios.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFolioId(f.id)}
                    className={`px-4 py-2 text-sm font-bold rounded-t-lg border border-b-0 transition-colors relative -mb-px ${
                      activeFolioId === f.id
                        ? 'bg-white border-slate-200 text-slate-900'
                        : 'bg-transparent border-transparent text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {f.name}
                      {f.status === 'settled' && (
                        <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-teal-500 rounded-full">
                          <Check className="w-2 h-2 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                  </button>
                ))}
                {showAddFolio ? (
                  <div className="flex items-center gap-1 ml-2 mb-1">
                    <input
                      autoFocus
                      value={newFolioName}
                      onChange={(e) => setNewFolioName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddFolio()
                        if (e.key === 'Escape') setShowAddFolio(false)
                      }}
                      placeholder="Folio name…"
                      className="border border-slate-300 rounded px-2 py-1 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                      onClick={handleAddFolio}
                      disabled={addingFolio}
                      className="px-2 py-1 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
                    >
                      {addingFolio ? '…' : 'Add'}
                    </button>
                    <button onClick={() => setShowAddFolio(false)} className="px-2 py-1 border border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-100">
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddFolio(true)}
                    disabled={addingFolio}
                    className="ml-2 mb-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3 h-3" /> Add Folio
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-slate-200">
                {/* LEFT — Charges */}
                <div className="flex-[3] overflow-y-auto p-6">
                  {activeFolio && (
                    <>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b-2 border-slate-200">
                            <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Cat</th>
                            <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            {folios.length > 1 && activeFolio.status !== 'settled' && <th className="pb-2 w-8" />}
                          </tr>
                        </thead>
                        <tbody>
                          {activeFolio.charges.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                                No charges in this folio
                              </td>
                            </tr>
                          )}
                          {activeFolio.charges.map((fc) => (
                            <tr key={fc.id} className="border-b border-slate-100 group">
                              <td className="py-2 pr-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">{fc.charge.date}</td>
                              <td className="py-2 pr-3 text-[12px] font-bold text-slate-800">{fc.charge.item}</td>
                              <td className="py-2 text-center text-[10px] text-slate-400">{fc.charge.category ?? '—'}</td>
                              <td className={`py-2 text-right text-[12px] font-black ${fc.charge.amount < 0 ? 'text-teal-600' : 'text-slate-900'}`}>
                                {fc.charge.amount < 0
                                  ? `(฿${formatCurrency(Math.abs(fc.charge.amount))})`
                                  : `฿${formatCurrency(fc.charge.amount)}`}
                              </td>
                              {folios.length > 1 && activeFolio.status !== 'settled' && (
                                <td className="py-2 pl-1 relative">
                                  <button
                                    onClick={() => setMovingChargeId(movingChargeId === fc.chargeId ? null : fc.chargeId)}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-all"
                                    title="Move to another folio"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                  {movingChargeId === fc.chargeId && (
                                    <div
                                      ref={moveMenuRef}
                                      className="absolute right-0 top-full z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[140px] py-1"
                                    >
                                      <p className="px-3 py-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Move to</p>
                                      {folios.filter((f) => f.id !== activeFolioId).map((targetFolio) => (
                                        <button
                                          key={targetFolio.id}
                                          onClick={() => handleAssignCharge(fc.chargeId, targetFolio.id)}
                                          className="block w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                          → {targetFolio.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                          {activeFolio.charges.length > 0 && (
                            <tr>
                              <td colSpan={3} className="pt-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                Total
                              </td>
                              <td className="pt-3 text-right text-sm font-black text-slate-900">
                                ฿{formatCurrency(folioBalance(activeFolio, res))}
                              </td>
                              {folios.length > 1 && activeFolio.status !== 'settled' && <td />}
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {unassignedCharges.length > 0 && (
                        <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-2">
                            Unassigned Charges
                          </p>
                          <div className="space-y-2">
                            {unassignedCharges.map((c) => (
                              <div key={c.id} className="flex items-center gap-3">
                                <span className="text-xs text-slate-700 flex-1">{c.item}</span>
                                <span className="text-xs font-bold text-slate-800">฿{formatCurrency(c.amount)}</span>
                                <div className="flex gap-1">
                                  {folios.map((f) => (
                                    <button
                                      key={f.id}
                                      onClick={() => handleAssignCharge(c.id, f.id)}
                                      className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                                    >
                                      → {f.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* RIGHT — Settlement panel */}
                <div className="flex-[2] flex flex-col overflow-y-auto p-6 bg-slate-50">
                  {activeFolio && (
                    <>
                      {/* Section 1 — Balance hero */}
                      <div className="mb-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {activeFolio.name} Balance
                        </p>
                        <p className={`text-3xl font-mono font-black leading-none ${activeBalance <= 0 ? 'text-teal-600' : 'text-slate-900'}`}>
                          ฿{formatCurrency(activeBalance)}
                        </p>
                        {hotelSetting && hotelSetting.fxRate > 0 && activeBalance > 0 && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            ≈ {formatMoney(baseToAlt(activeBalance, hotelSetting.fxRate), hotelSetting.altCurrency)} @ {hotelSetting.fxRate}
                          </p>
                        )}
                        {activeFolio.status === 'settled' && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-[10px] font-black uppercase tracking-wide">
                              <Check className="w-2.5 h-2.5" strokeWidth={3} /> Settled
                            </span>
                            <span className="text-[10px] text-slate-400">{activeFolio.paymentMethod ?? ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Section 2 — Company info bar */}
                      {res.companyId && res.company && (
                        <div className="mb-4 px-3 py-2.5 bg-white border border-slate-200 rounded-lg">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Account</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">{res.company.name}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${res.company.type === 'AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                              {res.company.type}
                            </span>
                          </div>
                        </div>
                      )}

                      {activeFolio.status !== 'settled' ? (
                        <>
                          {/* Group billing — linked reservations can push their bill to the master room */}
                          {res.masterResId && (
                            <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                              <p className="text-[9px] font-black text-violet-500 uppercase tracking-widest mb-1.5">
                                Group Billing
                              </p>
                              <p className="text-xs text-violet-700 mb-2">
                                This room is part of a group — transfer its entire bill to the master room.
                              </p>
                              <button
                                onClick={handleBillToMaster}
                                disabled={billingToMaster}
                                className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-black rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                              >
                                {billingToMaster ? (
                                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <ArrowRightLeft className="w-3.5 h-3.5" /> Bill to Master Room
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Section 3 — Payment Method */}
                          <div className="mb-3">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                              Payment Method
                            </p>
                            <div className="space-y-1">
                              {PAYMENT_METHODS.map(({ id, label }) => {
                                const isCompanyCredit = id === 'company_credit'
                                const isDisabled = isCompanyCredit && !canCompanyCredit
                                const isSelected = activePm === id
                                return (
                                  <label
                                    key={id}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                                      isDisabled
                                        ? 'opacity-40 cursor-not-allowed border-transparent'
                                        : isSelected
                                          ? 'bg-white border-teal-400 shadow-sm cursor-pointer'
                                          : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200 cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`payment-${activeFolio.id}`}
                                      value={id}
                                      checked={isSelected}
                                      disabled={isDisabled}
                                      onChange={() => {
                                        setPaymentMethods((p) => ({ ...p, [activeFolio.id]: id }))
                                        setCreditError('')
                                        setManagerOverride(false)
                                      }}
                                      className="accent-teal-600 w-3.5 h-3.5 flex-shrink-0"
                                    />
                                    <span className={`text-sm font-bold flex-1 ${isSelected ? 'text-slate-900' : isDisabled ? 'text-slate-400' : 'text-slate-500'}`}>
                                      {label}
                                    </span>
                                    {isCompanyCredit && !canCompanyCredit && (
                                      <span className="text-[9px] text-slate-400">(No credit account)</span>
                                    )}
                                    {isCompanyCredit && canCompanyCredit && creditExceeded && (
                                      <span className="text-[9px] font-bold text-red-500">฿0 available</span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>

                            {/* Company credit info box */}
                            {activePm === 'company_credit' && canCompanyCredit && (
                              <div className={`mt-2 px-3 py-2.5 rounded-lg border ${creditExceeded ? 'bg-amber-50 border-amber-200' : 'bg-sky-50 border-sky-200'}`}>
                                {creditExceeded ? (
                                  <>
                                    <p className="text-xs font-bold text-amber-700">Credit limit exceeded — manager override only</p>
                                    {(role === 'manager' || role === 'admin') && (
                                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={managerOverride}
                                          onChange={(e) => setManagerOverride(e.target.checked)}
                                          className="accent-amber-600 w-3.5 h-3.5"
                                        />
                                        <span className="text-xs font-semibold text-amber-700">I authorise override (manager)</span>
                                      </label>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="flex justify-between text-xs mb-1.5">
                                      <span className="font-semibold text-sky-700">
                                        Available: ฿{creditAvailable.toLocaleString()} of ฿{creditLimit.toLocaleString()}
                                      </span>
                                      <span className="text-sky-500">{creditPct}% used</span>
                                    </div>
                                    <div className="h-1.5 bg-sky-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${creditPct}%` }} />
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Section 4 — Payment details */}
                          {activePm === 'credit_card' && (
                            <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Card Details</p>
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  placeholder="•••• •••• •••• ••••"
                                  maxLength={19}
                                  value={cardDetails.number}
                                  onChange={(e) => setCardDetails((p) => ({ ...p, number: e.target.value }))}
                                  className={inputCls}
                                />
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    value={cardDetails.expiry}
                                    onChange={(e) => setCardDetails((p) => ({ ...p, expiry: e.target.value }))}
                                    className={inputCls}
                                  />
                                  <input
                                    type="password"
                                    placeholder="•••"
                                    maxLength={4}
                                    value={cardDetails.cvv}
                                    onChange={(e) => setCardDetails((p) => ({ ...p, cvv: e.target.value }))}
                                    className={inputCls}
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {activePm === 'cash' && (
                            <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cash</p>
                              <input
                                type="number"
                                placeholder="Amount Tendered ฿"
                                value={cashTendered}
                                onChange={(e) => setCashTendered(e.target.value)}
                                className={inputCls}
                              />
                              {cashTendered.trim() !== '' && cashChange > 0 && (
                                <p className="text-xs font-bold text-teal-600 mt-1.5">Change: ฿{cashChange.toLocaleString()}</p>
                              )}
                              {cashTendered.trim() !== '' && activeBalance > 0 && parseFloat(cashTendered) < activeBalance && (
                                <p className="text-xs font-bold text-red-500 mt-1.5">Short ฿{formatCurrency(activeBalance - parseFloat(cashTendered))}</p>
                              )}
                            </div>
                          )}

                          {(activePm === 'bank_transfer' || activePm === 'promptpay') && (
                            <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Reference / Transaction ID</p>
                              <input
                                type="text"
                                placeholder="e.g. TXN-20260425-001"
                                value={transferRef}
                                onChange={(e) => setTransferRef(e.target.value)}
                                className={inputCls}
                              />
                            </div>
                          )}

                          {activePm === 'city_ledger' && (
                            <div className="mb-3 p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">City Ledger Account</p>
                              {noCityLedgerCompany ? (
                                <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                  No company linked to this reservation — assign a corporate account before using City Ledger.
                                </p>
                              ) : res.company ? (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-800">{res.company.name}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${res.company.type === 'AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                                      {res.company.type}
                                    </span>
                                  </div>
                                  {(res.company.bankName || res.company.bankAccountNumber) ? (
                                    <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
                                      {res.company.bankName && <p><span className="text-slate-400">Bank:</span> <span className="font-semibold">{res.company.bankName}</span></p>}
                                      {res.company.bankAccountName && <p><span className="text-slate-400">Account Name:</span> <span className="font-semibold">{res.company.bankAccountName}</span></p>}
                                      {res.company.bankAccountNumber && <p><span className="text-slate-400">Account No:</span> <span className="font-mono font-bold">{res.company.bankAccountNumber}</span></p>}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] text-amber-600">No bank details on file — add them in Companies.</p>
                                  )}
                                </>
                              ) : null}
                            </div>
                          )}

                          {creditError && (
                            <p className="mb-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              {creditError}
                            </p>
                          )}

                          <button
                            onClick={() => handleSettleFolio(activeFolio.id)}
                            disabled={settleDisabled}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {settling ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              `Settle ${activeFolio.name}`
                            )}
                          </button>

                          {/* Section 5 — Signature line */}
                          <div className="mt-5 pt-4 border-t border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Guest Signature</p>
                            <div className="border-b-2 border-dashed border-slate-300 h-10 rounded-sm bg-white" />
                            <p className="text-[9px] text-slate-300 mt-1.5 text-center">Sign above to authorise payment</p>
                          </div>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReopenFolio(activeFolio.id)}
                          className="w-full py-2 border border-slate-200 text-slate-400 text-xs font-bold rounded-lg hover:bg-white hover:border-slate-300 transition-colors"
                        >
                          Reopen Folio
                        </button>
                      )}
                    </>
                  )}

                  {/* All Folios summary */}
                  {folios.length > 1 && (
                    <div className="mt-6 pt-4 border-t border-slate-200">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">All Folios</p>
                      {folios.map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            {f.name}
                            {f.status === 'settled' ? (
                              <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-[9px] font-bold">Settled ✓</span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-bold">Open</span>
                            )}
                          </span>
                          <span className="font-bold text-slate-800">฿{formatCurrency(folioBalance(f, res))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-black text-slate-900 border-t border-slate-200 mt-2 pt-2">
                        <span>Total</span>
                        <span>฿{formatCurrency(totalBalance)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-3 bg-white shrink-0">
            <button
              onClick={() => window.open(`/print/${res.id}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-black rounded-lg hover:bg-slate-50 transition-all"
            >
              <Printer className="w-4 h-4" /> Print Folio
            </button>
            <div className="flex-1" />
            {!allSettled && !loadingFolios && (
              <p className="text-xs text-amber-600 font-bold">
                {unassignedCharges.length > 0
                  ? `${unassignedCharges.length} unassigned charge${unassignedCharges.length !== 1 ? 's' : ''}`
                  : 'Settle all folios to check out'}
              </p>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-500 text-sm font-bold rounded-lg hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={checkingOut || !allSettled || unassignedCharges.length > 0 || loadingFolios}
              className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-lg transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkingOut ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Confirm Check-Out'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
