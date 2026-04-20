'use client'

import { useState, useEffect } from 'react'
import { Company } from '@/types'
import CompanyForm from './CompanyForm'
import {
  Building2, Plus, Search, Edit2, Trash2, Check, X,
  Phone, Mail, MapPin, BadgeDollarSign, AlertTriangle,
} from 'lucide-react'

const RACK_RATES: Record<string, number> = {
  STANDARD: 1200, DELUXE: 1800, SUITE: 3500, POOL_VILLA: 6500,
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
      // Soft deleted — show message
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
