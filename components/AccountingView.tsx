'use client'

import { useState, useEffect, useCallback } from 'react'
import { TaxInvoice, TaxInvoiceLineItem } from '@/types'
import {
  Receipt, TrendingUp, AlertTriangle, Plus, Printer, Pencil, X,
  CheckCircle2, Ban, CreditCard, Banknote, Building2, ChevronDown,
  RefreshCw,
} from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => '฿' + Math.round(n).toLocaleString()
const pct = (part: number, total: number) => total === 0 ? '0%' : (part / total * 100).toFixed(1) + '%'

const PM_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Credit Card',
  transfer: 'Bank Transfer',
  city_ledger: 'City Ledger',
  company_credit: 'Company Credit',
  unknown: 'Unknown',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-sky-100 text-sky-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-500',
}

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500'

// ─── Revenue Report ──────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().split('T')[0] }
function monthStart(): string { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] }
function lastMonthRange(): [string, string] {
  const d = new Date(); d.setDate(1); d.setDate(0)
  const end = d.toISOString().split('T')[0]
  d.setDate(1)
  return [d.toISOString().split('T')[0], end]
}

interface RevenueData {
  summary: { totalCollected: number; totalFolios: number; cityLedgerPosted: number; cityLedgerOutstanding: number }
  byPaymentMethod: { method: string; count: number; amount: number }[]
  byCategory: { category: string; amount: number }[]
  daily: { date: string; collected: number; folios: number }[]
  deferredByCompany: { id: string; name: string; amount: number }[]
}

function RevenueTab() {
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/revenue?from=${f}&to=${t}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(from, to) }, [])

  function applyRange(f: string, t: string) { setFrom(f); setTo(t); load(f, t) }

  const total = data?.summary.totalCollected ?? 0

  return (
    <div className="space-y-4">
      {/* Date range controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          <span className="text-gray-400 text-sm">—</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          <button
            onClick={() => load(from, to)}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg"
          >
            Apply
          </button>
        </div>
        <div className="flex gap-1.5">
          {[
            { label: 'Today', fn: () => applyRange(today(), today()) },
            { label: 'This Month', fn: () => applyRange(monthStart(), today()) },
            { label: 'Last Month', fn: () => { const [f, t] = lastMonthRange(); applyRange(f, t) } },
          ].map(({ label, fn }) => (
            <button key={label} onClick={fn} className="px-3 py-1.5 border border-gray-200 text-xs font-medium text-gray-600 rounded-lg hover:bg-gray-50">
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading...</p>}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Collected', value: fmt(data.summary.totalCollected), sub: `${data.summary.totalFolios} folios settled`, color: 'text-emerald-600' },
              { label: 'City Ledger Posted', value: fmt(data.summary.cityLedgerPosted), sub: 'deferred revenue', color: 'text-sky-600' },
              { label: 'City Ledger Outstanding', value: fmt(data.summary.cityLedgerOutstanding), sub: 'unpaid', color: data.summary.cityLedgerOutstanding > 0 ? 'text-amber-600' : 'text-gray-400' },
              { label: 'Total Revenue', value: fmt(data.summary.totalCollected + data.summary.cityLedgerPosted), sub: 'collected + deferred', color: 'text-gray-800' },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* By Payment Method */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">By Payment Method</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold">Method</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Folios</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Amount</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPaymentMethod.map((row) => (
                    <tr key={row.method} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{PM_LABELS[row.method] ?? row.method}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{row.count}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(row.amount)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{pct(row.amount, total)}</td>
                    </tr>
                  ))}
                  {data.byPaymentMethod.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-sm">No settled folios in range</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* By Category */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">By Charge Category</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold">Category</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Amount</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCategory.map((row) => (
                    <tr key={row.category} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.category.toUpperCase()}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmt(row.amount)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{pct(row.amount, total)}</td>
                    </tr>
                  ))}
                  {data.byCategory.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400 text-sm">No charges in range</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* City Ledger by Company */}
          {data.deferredByCompany.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">City Ledger Posted — By Company</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold">Company</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Amount Posted</th>
                    <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deferredByCompany.map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2 text-right font-semibold text-sky-700">{fmt(row.amount)}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{pct(row.amount, data.summary.cityLedgerPosted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily table */}
          {data.daily.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Daily Collected</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs text-gray-500 font-semibold">Date</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Folios</th>
                      <th className="text-right px-4 py-2 text-xs text-gray-500 font-semibold">Collected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.daily].reverse().map((row) => (
                      <tr key={row.date} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-700">{row.date}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{row.folios}</td>
                        <td className="px-4 py-2 text-right font-semibold">{fmt(row.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── AR Aging ────────────────────────────────────────────────────────────────

interface AgingRow {
  companyId: string; companyName: string; companyType: string
  contactName: string | null; contactEmail: string | null; creditLimit: number
  current: number; days31_60: number; days61_90: number; over90: number
  total: number; oldestDate: string; txCount: number
}
interface AgingData {
  rows: AgingRow[]
  totals: { current: number; days31_60: number; days61_90: number; over90: number; total: number }
  asOf: string
}

function ARAgingTab() {
  const [data, setData] = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reports/ar-aging')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function settleAll(companyId: string) {
    setSettling(companyId)
    try {
      await fetch(`/api/companies/${companyId}/credit`, { method: 'PATCH' })
      await load()
    } finally {
      setSettling(null)
    }
  }

  if (loading) return <p className="text-sm text-gray-400 py-4">Loading...</p>
  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">As of <span className="font-semibold text-gray-700">{data.asOf}</span></p>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-700 font-medium">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: '0–30 days', value: data.totals.current, color: 'text-emerald-600' },
          { label: '31–60 days', value: data.totals.days31_60, color: 'text-amber-600' },
          { label: '61–90 days', value: data.totals.days61_90, color: 'text-orange-600' },
          { label: '90+ days', value: data.totals.over90, color: 'text-red-600' },
          { label: 'Total Outstanding', value: data.totals.total, color: 'text-gray-900' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{fmt(value)}</p>
          </div>
        ))}
      </div>

      {data.rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
          <p className="font-semibold text-gray-700">All clear — no outstanding city ledger balances</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Company</th>
                <th className="text-right px-4 py-3 text-xs text-emerald-600 font-semibold">0–30</th>
                <th className="text-right px-4 py-3 text-xs text-amber-600 font-semibold">31–60</th>
                <th className="text-right px-4 py-3 text-xs text-orange-600 font-semibold">61–90</th>
                <th className="text-right px-4 py-3 text-xs text-red-600 font-semibold">90+</th>
                <th className="text-right px-4 py-3 text-xs text-gray-700 font-semibold">Total</th>
                <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Oldest</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.companyId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800">{row.companyName}</p>
                    <p className="text-xs text-gray-400">{row.companyType} · {row.txCount} charges</p>
                  </td>
                  <td className="px-4 py-3 text-right">{row.current > 0 ? fmt(row.current) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-amber-700">{row.days31_60 > 0 ? fmt(row.days31_60) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-orange-700">{row.days61_90 > 0 ? fmt(row.days61_90) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right text-red-700 font-semibold">{row.over90 > 0 ? fmt(row.over90) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt(row.total)}</td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">{row.oldestDate}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => settleAll(row.companyId)}
                      disabled={settling === row.companyId}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                    >
                      {settling === row.companyId ? 'Settling...' : 'Mark Paid'}
                    </button>
                  </td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-gray-50 font-bold border-t border-gray-200">
                <td className="px-4 py-3 text-xs text-gray-600 uppercase tracking-wide">Total</td>
                <td className="px-4 py-3 text-right text-emerald-700">{data.totals.current > 0 ? fmt(data.totals.current) : '—'}</td>
                <td className="px-4 py-3 text-right text-amber-700">{data.totals.days31_60 > 0 ? fmt(data.totals.days31_60) : '—'}</td>
                <td className="px-4 py-3 text-right text-orange-700">{data.totals.days61_90 > 0 ? fmt(data.totals.days61_90) : '—'}</td>
                <td className="px-4 py-3 text-right text-red-700">{data.totals.over90 > 0 ? fmt(data.totals.over90) : '—'}</td>
                <td className="px-4 py-3 text-right text-gray-900">{fmt(data.totals.total)}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Tax Invoice Form ────────────────────────────────────────────────────────

interface Company { id: string; name: string; taxId?: string | null; address?: string | null }

interface InvoiceFormProps {
  initial?: Partial<TaxInvoice>
  onSave: () => void
  onClose: () => void
}

function emptyLine(): TaxInvoiceLineItem {
  return { description: '', quantity: 1, unitPrice: 0, amount: 0 }
}

function InvoiceForm({ initial, onSave, onClose }: InvoiceFormProps) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState(initial?.companyId ?? '')
  const [billTo, setBillTo] = useState(initial?.billTo ?? '')
  const [billTaxId, setBillTaxId] = useState(initial?.billTaxId ?? '')
  const [billAddress, setBillAddress] = useState(initial?.billAddress ?? '')
  const [lines, setLines] = useState<TaxInvoiceLineItem[]>(
    (initial?.lineItems as TaxInvoiceLineItem[])?.length ? initial.lineItems as TaxInvoiceLineItem[] : [emptyLine()]
  )
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? 7)
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/companies').then((r) => r.json()).then((data: Company[]) => setCompanies(data)).catch(() => {})
  }, [])

  function pickCompany(id: string) {
    setSelectedCompanyId(id)
    const c = companies.find((x) => x.id === id)
    if (c) {
      setBillTo(c.name)
      setBillTaxId(c.taxId ?? '')
      setBillAddress(c.address ?? '')
    }
  }

  function setLine(i: number, field: keyof TaxInvoiceLineItem, val: string | number) {
    setLines((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: val }
      if (field === 'quantity' || field === 'unitPrice') {
        next[i].amount = Math.round(next[i].quantity * next[i].unitPrice * 100) / 100
      }
      if (field === 'amount') {
        next[i].amount = Number(val)
      }
      return next
    })
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100
  const totalAmount = subtotal + vatAmount

  async function handleSave(status: 'draft' | 'issued') {
    if (!billTo.trim()) { setError('Bill-to name is required'); return }
    if (lines.length === 0 || lines.every((l) => !l.description.trim())) {
      setError('At least one line item is required')
      return
    }
    setError('')
    setSaving(true)
    try {
      const url = initial?.id ? `/api/tax-invoices/${initial.id}` : '/api/tax-invoices'
      const method = initial?.id ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: selectedCompanyId || null,
          billTo: billTo.trim(),
          billTaxId: billTaxId || null,
          billAddress: billAddress || null,
          lineItems: lines.filter((l) => l.description.trim()),
          vatRate,
          dueDate: dueDate || null,
          notes: notes || null,
          status,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed to save')
      }
      onSave()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-semibold text-gray-900">{initial?.id ? `Edit ${initial.invoiceNumber}` : 'New Tax Invoice'}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Bill To */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Bill To</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Auto-fill from company</label>
              <select
                value={selectedCompanyId}
                onChange={(e) => pickCompany(e.target.value)}
                className={`w-full ${inputCls}`}
              >
                <option value="">— Manual entry —</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Name / Company <span className="text-red-500">*</span></label>
                <input type="text" value={billTo} onChange={(e) => setBillTo(e.target.value)} className={`w-full ${inputCls}`} placeholder="Recipient name" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Tax ID</label>
                <input type="text" value={billTaxId} onChange={(e) => setBillTaxId(e.target.value)} className={`w-full ${inputCls}`} placeholder="e.g. 0-1234-56789-01-2" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <input type="text" value={billAddress} onChange={(e) => setBillAddress(e.target.value)} className={`w-full ${inputCls}`} placeholder="Street, city, country" />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Line Items</p>
              <button onClick={() => setLines((prev) => [...prev, emptyLine()])} className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 font-semibold">
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="text-left px-3 py-2 font-semibold">Description</th>
                    <th className="text-right px-3 py-2 font-semibold w-16">Qty</th>
                    <th className="text-right px-3 py-2 font-semibold w-28">Unit Price</th>
                    <th className="text-right px-3 py-2 font-semibold w-28">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="px-2 py-1.5">
                        <input
                          type="text"
                          value={line.description}
                          onChange={(e) => setLine(i, 'description', e.target.value)}
                          className="w-full border-0 bg-transparent focus:outline-none text-sm"
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => setLine(i, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-400"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={line.unitPrice}
                          onChange={(e) => setLine(i, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-400"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          min={0}
                          value={line.amount}
                          onChange={(e) => setLine(i, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right font-semibold focus:outline-none focus:ring-1 focus:ring-sky-400"
                        />
                      </td>
                      <td className="px-2">
                        <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">VAT</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={vatRate}
                    onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                    className="w-14 border border-gray-200 rounded px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <span className="font-semibold">{fmt(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-1.5">
                <span>Total</span>
                <span className="text-sky-700">{fmt(totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes / Payment Terms</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`w-full ${inputCls}`} placeholder="e.g. Payment due within 30 days" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
        </div>

        <div className="px-5 pb-5 flex gap-2 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="flex-1 py-2.5 border border-sky-300 text-sky-600 rounded-xl text-sm font-semibold hover:bg-sky-50 disabled:opacity-60"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave('issued')}
            disabled={saving}
            className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Issue Invoice'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tax Invoices List ───────────────────────────────────────────────────────

const STATUS_TABS = ['all', 'draft', 'issued', 'paid', 'void'] as const

function TaxInvoicesTab() {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<TaxInvoice | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/tax-invoices${q}`)
      if (res.ok) setInvoices(await res.json())
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  async function markPaid(id: string) {
    setActing(id)
    await fetch(`/api/tax-invoices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    await load()
    setActing(null)
  }

  async function voidInvoice(id: string) {
    if (!confirm('Void this invoice? This cannot be undone.')) return
    setActing(id)
    await fetch(`/api/tax-invoices/${id}`, { method: 'DELETE' })
    await load()
    setActing(null)
  }

  function printInvoice(id: string) {
    window.open(`/print/invoice/${id}`, '_blank')
  }

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i) => i.status === statusFilter)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === s ? 'bg-sky-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Invoice #</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Bill To</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Subtotal</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">VAT</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Total</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold">Status</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-semibold">Date</th>
              <th className="px-4 py-3 w-28" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-400">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">No invoices found</td></tr>
            )}
            {filtered.map((inv) => (
              <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono font-semibold text-sky-700 text-xs">{inv.invoiceNumber}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{inv.billTo}</p>
                  {inv.billTaxId && <p className="text-xs text-gray-400">{inv.billTaxId}</p>}
                </td>
                <td className="px-4 py-3 text-right">{fmt(inv.subtotal)}</td>
                <td className="px-4 py-3 text-right text-gray-400">{fmt(inv.vatAmount)}</td>
                <td className="px-4 py-3 text-right font-bold">{fmt(inv.totalAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[inv.status]}`}>
                    {inv.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-xs text-gray-400">
                  {new Date(inv.createdAt as string).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => printInvoice(inv.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                      title="Print"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {inv.status === 'draft' && (
                      <button
                        onClick={() => { setEditing(inv); setShowForm(true) }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {inv.status === 'issued' && (
                      <button
                        onClick={() => markPaid(inv.id)}
                        disabled={acting === inv.id}
                        className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                      >
                        Paid
                      </button>
                    )}
                    {(inv.status === 'draft' || inv.status === 'issued') && (
                      <button
                        onClick={() => voidInvoice(inv.id)}
                        disabled={acting === inv.id}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500"
                        title="Void"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <InvoiceForm
          initial={editing ?? undefined}
          onSave={() => { setShowForm(false); setEditing(null); load() }}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'revenue', label: 'Revenue Report', icon: TrendingUp },
  { id: 'aging', label: 'AR Aging', icon: AlertTriangle },
  { id: 'invoices', label: 'Tax Invoices', icon: Receipt },
] as const

type TabId = typeof TABS[number]['id']

export default function AccountingView() {
  const [tab, setTab] = useState<TabId>('revenue')

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Accounting</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === id ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'revenue' && <RevenueTab />}
      {tab === 'aging' && <ARAgingTab />}
      {tab === 'invoices' && <TaxInvoicesTab />}
    </div>
  )
}
