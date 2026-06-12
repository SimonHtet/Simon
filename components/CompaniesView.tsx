'use client'

import { useState, useEffect } from 'react'
import { Company, CreditTransaction } from '@/types'
import CompanyForm from './CompanyForm'
import {
  Building2, Plus, Search, Edit2, Trash2, Check, X,
  Phone, Mail, MapPin, BadgeDollarSign, AlertTriangle,
  ChevronDown, ChevronUp, CreditCard, Printer, PlusCircle,
} from 'lucide-react'

const RACK_RATES: Record<string, number> = {
  STANDARD: 1200, DELUXE: 1800, SUITE: 3500, POOL_VILLA: 6500,
}

interface CreditSummary {
  creditLimit: number
  creditUsed: number
  creditAvailable: number
  transactions: CreditTransaction[]
}

export default function CompaniesView() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'COMPANY' | 'AGENT'>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [creditData, setCreditData] = useState<Record<string, CreditSummary>>({})
  const [creditLoading, setCreditLoading] = useState<Record<string, boolean>>({})
  const [showPaid, setShowPaid] = useState<Record<string, boolean>>({})

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/companies')
      const data = await res.json()
      setCompanies(Array.isArray(data) ? data : [])
    } catch {
      setError('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function loadCredit(id: string) {
    setCreditLoading((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/companies/${id}/credit`)
      const data = await res.json()
      setCreditData((prev) => ({ ...prev, [id]: data }))
    } finally {
      setCreditLoading((prev) => ({ ...prev, [id]: false }))
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      if (!creditData[id]) loadCredit(id)
    }
  }

  async function handleMarkPaid(companyId: string, txId: number) {
    await fetch(`/api/companies/${companyId}/credit/${txId}`, { method: 'PUT' })
    await loadCredit(companyId)
  }

  async function handlePostCharge(companyId: string, amount: number, description: string) {
    const res = await fetch(`/api/companies/${companyId}/credit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, description }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error ?? 'Failed to post charge')
    }
    await loadCredit(companyId)
    load()
  }

  async function handleSave(data: Partial<Company>) {
    if (editing) {
      await fetch(`/api/companies/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } else {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    }
    setEditing(null)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.deactivated) {
      setCompanies((prev) => prev.map((c) => c.id === id ? { ...c, active: false } : c))
    } else {
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    }
    setDeleteConfirm(null)
  }

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.contactName ?? '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'ALL' || c.type === typeFilter
    return matchSearch && matchType
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Companies & Agents</h1>
          <p className="text-sm text-gray-500">{companies.filter((c) => c.active).length} active accounts</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Company
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        {(['ALL', 'COMPANY', 'AGENT'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              typeFilter === t ? 'bg-sky-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'ALL' ? 'All Types' : t === 'COMPANY' ? 'Corporate' : 'Travel Agents'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">{search ? 'No companies match your search' : 'No companies yet'}</p>
          {!search && <p className="text-xs mt-1">Create your first corporate account</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((co) => {
            const rates = co.contractRates as Record<string, number>
            const hasBlackout = co.blackoutStart && co.blackoutEnd
            const today = new Date().toISOString().split('T')[0]
            const inBlackout = hasBlackout && today >= co.blackoutStart! && today <= co.blackoutEnd!
            const isExpanded = expandedId === co.id
            const credit = creditData[co.id]
            const loadingCredit = creditLoading[co.id]
            const creditAvail = co.creditLimit > 0 ? Math.max(0, co.creditLimit - co.creditUsed) : 0
            const creditPct = co.creditLimit > 0 ? Math.min(100, Math.round((co.creditUsed / co.creditLimit) * 100)) : 0
            return (
              <div key={co.id} className={`bg-white border rounded-2xl p-5 transition-shadow hover:shadow-md ${!co.active ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${co.type === 'AGENT' ? 'bg-purple-100' : 'bg-sky-100'}`}>
                      <Building2 className={`w-5 h-5 ${co.type === 'AGENT' ? 'text-purple-600' : 'text-sky-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">{co.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${co.type === 'AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                          {co.type}
                        </span>
                        {co.creditLimit > 0 && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            creditPct >= 100 ? 'bg-red-100 text-red-700'
                            : creditPct >= 70 ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            ฿{creditAvail.toLocaleString()} avail
                          </span>
                        )}
                        {!co.active && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">INACTIVE</span>}
                        {inBlackout && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                            <AlertTriangle className="w-2.5 h-2.5" /> BLACKOUT
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                        {co.contactName && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{co.contactName}</span>}
                        {co.contactPhone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{co.contactPhone}</span>}
                        {co.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{co.address}</span>}
                      </div>
                      {/* Contract rates */}
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(['STANDARD', 'DELUXE', 'SUITE', 'POOL_VILLA'] as const).map((rt) => {
                          const disc = rates[rt] ?? 0
                          if (!disc) return null
                          const contracted = Math.round(RACK_RATES[rt] * (1 - disc / 100))
                          return (
                            <span key={rt} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
                              <BadgeDollarSign className="w-3 h-3" />
                              {rt.replace('_', ' ')} {disc}% off · ฿{contracted.toLocaleString()}
                            </span>
                          )
                        })}
                        {!Object.values(rates).some(Boolean) && (
                          <span className="text-xs text-gray-400">No contract rates set</span>
                        )}
                      </div>
                      {hasBlackout && (
                        <p className="mt-1.5 text-xs text-amber-600">
                          Blackout: {co.blackoutStart} → {co.blackoutEnd}
                        </p>
                      )}

                      {/* Credit expand button */}
                      {co.creditLimit > 0 && (
                        <button
                          onClick={() => toggleExpand(co.id)}
                          className="flex items-center gap-1.5 mt-3 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Credit Account
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      )}

                      {/* Credit section */}
                      {isExpanded && co.creditLimit > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          {loadingCredit ? (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <div className="w-3.5 h-3.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
                              Loading credit data…
                            </div>
                          ) : credit ? (
                            <CreditSection
                              credit={credit}
                              companyId={co.id}
                              showPaid={showPaid[co.id] ?? false}
                              onTogglePaid={() => setShowPaid((p) => ({ ...p, [co.id]: !p[co.id] }))}
                              onMarkPaid={(txId) => handleMarkPaid(co.id, txId)}
                              onPostCharge={(amount, description) => handlePostCharge(co.id, amount, description)}
                            />
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {deleteConfirm === co.id ? (
                      <>
                        <button onClick={() => handleDelete(co.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold">
                          <Check className="w-3 h-3" /> Confirm
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                          <X className="w-4 h-4 text-gray-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditing(co); setShowForm(true) }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4 text-gray-400" />
                        </button>
                        <button onClick={() => setDeleteConfirm(co.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <CompanyForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

interface CreditSectionProps {
  credit: {
    creditLimit: number
    creditUsed: number
    creditAvailable: number
    transactions: CreditTransaction[]
  }
  companyId: string
  showPaid: boolean
  onTogglePaid: () => void
  onMarkPaid: (txId: number) => void
  onPostCharge: (amount: number, description: string) => Promise<void>
}

function CreditSection({ credit, companyId, showPaid, onTogglePaid, onMarkPaid, onPostCharge }: CreditSectionProps) {
  const [showPostForm, setShowPostForm] = useState(false)
  const [postAmount, setPostAmount] = useState('')
  const [postDesc, setPostDesc] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  async function handlePost() {
    const amount = parseFloat(postAmount)
    if (!postDesc.trim() || isNaN(amount) || amount <= 0) return
    setPosting(true)
    setPostError('')
    try {
      await onPostCharge(amount, postDesc.trim())
      setPostAmount('')
      setPostDesc('')
      setShowPostForm(false)
    } catch (e: any) {
      setPostError(e?.message ?? 'Failed to post charge')
    } finally {
      setPosting(false)
    }
  }
  const pct = credit.creditLimit > 0 ? Math.min(100, Math.round((credit.creditUsed / credit.creditLimit) * 100)) : 0
  const unpaid = credit.transactions.filter((t) => t.status === 'unpaid')
  const paid = credit.transactions.filter((t) => t.status === 'paid')

  return (
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Credit Account</p>

      {/* Usage bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-500">
            Used: <span className="font-semibold text-gray-700">฿{credit.creditUsed.toLocaleString()}</span>
          </span>
          <span className="text-gray-500">
            Limit: <span className="font-semibold text-gray-700">฿{credit.creditLimit.toLocaleString()}</span>
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-sky-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] mt-1">
          <span className={`font-bold ${pct >= 90 ? 'text-red-500' : 'text-gray-500'}`}>{pct}% used</span>
          <span className="text-emerald-600 font-semibold">฿{credit.creditAvailable.toLocaleString()} available</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => { setShowPostForm((v) => !v); setPostError('') }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Post Charge
        </button>
        <button
          onClick={() => window.open(`/print/company/${companyId}`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-xs font-semibold transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Print Statement
        </button>
      </div>

      {/* Post charge form */}
      {showPostForm && (
        <div className="mb-3 p-3 bg-sky-50 border border-sky-200 rounded-lg space-y-2">
          <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Post Charge to City Ledger</p>
          <input
            type="text"
            placeholder="Description (e.g. Room charges — Jan 2026)"
            value={postDesc}
            onChange={(e) => setPostDesc(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount ฿"
              value={postAmount}
              onChange={(e) => setPostAmount(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
            <button
              onClick={handlePost}
              disabled={posting || !postDesc.trim() || !postAmount}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {posting ? '…' : 'Post'}
            </button>
            <button
              onClick={() => { setShowPostForm(false); setPostError('') }}
              className="px-3 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
          {postError && <p className="text-xs text-red-600 font-semibold">{postError}</p>}
        </div>
      )}

      {/* Unpaid transactions */}
      {unpaid.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {unpaid.map((tx) => (
            <div key={tx.id} className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{tx.description}</p>
                <p className="text-gray-400">{typeof tx.createdAt === 'string' ? tx.createdAt.split('T')[0] : ''}</p>
              </div>
              <span className="font-bold text-gray-900 flex-shrink-0">฿{tx.amount.toLocaleString()}</span>
              <button
                onClick={() => onMarkPaid(tx.id)}
                className="flex-shrink-0 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-semibold hover:bg-gray-50 transition-colors"
              >
                Mark Paid
              </button>
            </div>
          ))}
        </div>
      )}

      {unpaid.length === 0 && (
        <p className="text-xs text-gray-400 mb-2">No unpaid transactions</p>
      )}

      {/* Paid transactions toggle */}
      {paid.length > 0 && (
        <div>
          <button
            onClick={onTogglePaid}
            className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-gray-600 transition-colors mb-1.5"
          >
            {showPaid ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showPaid ? 'Hide' : 'Show'} {paid.length} paid transaction{paid.length !== 1 ? 's' : ''}
          </button>
          {showPaid && (
            <div className="space-y-1">
              {paid.map((tx) => (
                <div key={tx.id} className="flex items-center gap-2 text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 opacity-60">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">{tx.description}</p>
                    <p className="text-gray-400">{typeof tx.createdAt === 'string' ? tx.createdAt.split('T')[0] : ''}</p>
                  </div>
                  <span className="font-bold text-gray-600 flex-shrink-0">฿{tx.amount.toLocaleString()}</span>
                  <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">Paid</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
