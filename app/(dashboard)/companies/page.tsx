'use client'

import { useState, useEffect } from 'react'
import { Company, CompanyRate } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'
import { Building2, Edit3, Plus, X, Check, Phone, Mail, User } from 'lucide-react'

const ROOM_TYPE_KEYS = Object.keys(ROOM_TYPES)

interface EditState {
  companyId: string
  name: string
  contactName: string
  contactEmail: string
  contactPhone: string
  rates: Record<string, string>
}

function ratesFromCompany(company: Company): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of company.contractRates) {
    map[r.roomType] = String(r.contractRate)
  }
  return map
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<(Company & { _count: { reservations: number }; totalRevenue?: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [newForm, setNewForm] = useState({
    name: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    rates: {} as Record<string, string>,
  })
  const [createError, setCreateError] = useState('')

  async function load() {
    const res = await fetch('/api/companies')
    const data = await res.json()
    setCompanies(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function startEdit(company: Company) {
    setEditState({
      companyId: company.id,
      name: company.name,
      contactName: company.contactName || '',
      contactEmail: company.contactEmail || '',
      contactPhone: company.contactPhone || '',
      rates: ratesFromCompany(company),
    })
  }

  async function saveEdit() {
    if (!editState) return
    setSaving(true)
    const rates = ROOM_TYPE_KEYS
      .filter((rt) => editState.rates[rt] && parseFloat(editState.rates[rt]) > 0)
      .map((rt) => ({ roomType: rt, contractRate: parseFloat(editState.rates[rt]) }))

    await fetch(`/api/companies/${editState.companyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: editState.name,
        contactName: editState.contactName,
        contactEmail: editState.contactEmail,
        contactPhone: editState.contactPhone,
        rates,
      }),
    })
    setSaving(false)
    setEditState(null)
    load()
  }

  async function createCompany() {
    if (!newForm.name.trim()) { setCreateError('Company name is required'); return }
    setCreateError('')
    setSaving(true)
    const rates = ROOM_TYPE_KEYS
      .filter((rt) => newForm.rates[rt] && parseFloat(newForm.rates[rt]) > 0)
      .map((rt) => ({ roomType: rt, contractRate: parseFloat(newForm.rates[rt]) }))

    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, rates }),
    })
    setSaving(false)
    if (res.ok) {
      setShowNew(false)
      setNewForm({ name: '', contactName: '', contactEmail: '', contactPhone: '', rates: {} })
      load()
    } else {
      const d = await res.json()
      setCreateError(d.error || 'Failed to create')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Corporate Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage company profiles and contract rates</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* New company form */}
      {showNew && (
        <div className="bg-white border border-teal-200 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">New Company</h3>
            <button onClick={() => setShowNew(false)} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Company Name *</label>
              <input
                type="text"
                value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="e.g. Thai Airways International"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Contact Name</label>
              <input type="text" value={newForm.contactName} onChange={(e) => setNewForm((p) => ({ ...p, contactName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Phone</label>
              <input type="tel" value={newForm.contactPhone} onChange={(e) => setNewForm((p) => ({ ...p, contactPhone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Email</label>
              <input type="email" value={newForm.contactEmail} onChange={(e) => setNewForm((p) => ({ ...p, contactEmail: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Contract Rates (฿/night)</label>
            <div className="grid grid-cols-3 gap-3">
              {ROOM_TYPE_KEYS.map((rt) => (
                <div key={rt}>
                  <label className="block text-xs text-gray-500 mb-1">{ROOM_TYPES[rt]?.name ?? rt} <span className="text-gray-400">(rack ฿{ROOM_TYPES[rt]?.rate.toLocaleString()})</span></label>
                  <input
                    type="number"
                    placeholder="—"
                    value={newForm.rates[rt] || ''}
                    onChange={(e) => setNewForm((p) => ({ ...p, rates: { ...p.rates, [rt]: e.target.value } }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              ))}
            </div>
          </div>
          {createError && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3 mb-3">{createError}</p>}
          <div className="flex gap-3">
            <button onClick={() => setShowNew(false)} className="flex-1 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button onClick={createCompany} disabled={saving} className="flex-1 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
              {saving ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </div>
      )}

      {/* Companies table */}
      {companies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No corporate accounts yet</p>
          <p className="text-sm text-gray-400 mt-1">Add your first company to track contract rates and reservations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {companies.map((company) => {
            const isEditing = editState?.companyId === company.id
            return (
              <div key={company.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Company header */}
                <div className="px-5 py-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-sky-50 rounded-xl mt-0.5">
                      <Building2 className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editState.name}
                          onChange={(e) => setEditState((p) => p ? { ...p, name: e.target.value } : p)}
                          className="text-base font-semibold border border-sky-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 mb-1"
                        />
                      ) : (
                        <h3 className="font-semibold text-gray-900">{company.name}</h3>
                      )}
                      <div className="flex flex-wrap gap-3 mt-1">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-gray-400" />
                              <input type="text" placeholder="Contact name" value={editState.contactName} onChange={(e) => setEditState((p) => p ? { ...p, contactName: e.target.value } : p)} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 w-36" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <input type="tel" placeholder="Phone" value={editState.contactPhone} onChange={(e) => setEditState((p) => p ? { ...p, contactPhone: e.target.value } : p)} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 w-36" />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <input type="email" placeholder="Email" value={editState.contactEmail} onChange={(e) => setEditState((p) => p ? { ...p, contactEmail: e.target.value } : p)} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500 w-48" />
                            </div>
                          </>
                        ) : (
                          <>
                            {company.contactName && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <User className="w-3 h-3" />{company.contactName}
                              </span>
                            )}
                            {company.contactPhone && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Phone className="w-3 h-3" />{company.contactPhone}
                              </span>
                            )}
                            {company.contactEmail && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <Mail className="w-3 h-3" />{company.contactEmail}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                      {company._count?.reservations ?? 0} reservation{(company._count?.reservations ?? 0) !== 1 ? 's' : ''}
                    </span>
                    {isEditing ? (
                      <div className="flex gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={saving}
                          className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditState(null)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(company)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-50 text-xs font-semibold rounded-lg border border-gray-200 hover:border-sky-200 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Contract rates table */}
                <div className="border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Room Type</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Rack Rate</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Contract Rate</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Discount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ROOM_TYPE_KEYS.map((rt) => {
                        const rack = ROOM_TYPES[rt]?.rate ?? 0
                        const existing = company.contractRates.find((r) => r.roomType === rt)
                        const contract = existing?.contractRate

                        if (!isEditing && !existing) return null

                        return (
                          <tr key={rt} className={existing ? '' : 'bg-gray-50/50'}>
                            <td className="px-5 py-3 text-gray-800 font-medium">
                              {ROOM_TYPES[rt]?.name ?? rt}
                            </td>
                            <td className="px-5 py-3 text-right text-gray-500">
                              ฿{rack.toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  placeholder="—"
                                  value={editState?.rates[rt] || ''}
                                  onChange={(e) =>
                                    setEditState((p) =>
                                      p ? { ...p, rates: { ...p.rates, [rt]: e.target.value } } : p
                                    )
                                  }
                                  className="w-28 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                              ) : contract !== undefined ? (
                                <span className="font-semibold text-teal-700">฿{contract.toLocaleString()}</span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              {!isEditing && contract !== undefined && rack > 0 ? (
                                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                                  -{Math.round(((rack - contract) / rack) * 100)}%
                                </span>
                              ) : null}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
