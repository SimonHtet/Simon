'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChargeCode, Room, StaffUser } from '@/types'
import { Plus, Pencil, Check, X, ToggleLeft, ToggleRight, Trash2, KeyRound } from 'lucide-react'

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'

const CATEGORIES = ['F&B', 'Housekeeping', 'Spa', 'Transport', 'Minibar', 'Misc', 'ROOM', 'PAYMENT']
const ROLES = ['admin', 'manager', 'front_desk', 'housekeeping'] as const
const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  front_desk: 'Front Desk',
  housekeeping: 'Housekeeping',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  front_desk: 'bg-teal-100 text-teal-700',
  housekeeping: 'bg-amber-100 text-amber-700',
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string; id?: string })?.role
  const currentUserId = (session?.user as { id?: string })?.id
  const isAdmin = role === 'admin'

  // --- Staff state ---
  const [users, setUsers] = useState<StaffUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [userError, setUserError] = useState('')
  const [userEditForm, setUserEditForm] = useState({ name: '', userRole: '', password: '' })
  const [addUserForm, setAddUserForm] = useState({ name: '', email: '', password: '', userRole: 'front_desk' })

  async function loadUsers() {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch { }
    setUsersLoading(false)
  }

  async function handleAddUser() {
    setUserError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addUserForm),
    })
    const data = await res.json()
    if (!res.ok) { setUserError(data.error || 'Failed'); return }
    setAddUserForm({ name: '', email: '', password: '', userRole: 'front_desk' })
    setShowAddUser(false)
    loadUsers()
  }

  async function handleEditUser(id: string) {
    setUserError('')
    const body: Record<string, string> = { name: userEditForm.name, userRole: userEditForm.userRole }
    if (userEditForm.password.trim()) body.password = userEditForm.password
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) { setUserError(data.error || 'Failed'); return }
    setEditingUserId(null)
    loadUsers()
  }

  async function handleDeleteUser(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setUserError(data.error || 'Failed'); setDeleteConfirmId(null); return }
    setDeleteConfirmId(null)
    loadUsers()
  }

  // --- Room rates state ---
  const [rooms, setRooms] = useState<Room[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null)
  const [editRateValue, setEditRateValue] = useState('')
  const [roomRateError, setRoomRateError] = useState('')
  const canEditRates = role === 'admin' || role === 'manager'

  async function loadRooms() {
    setRoomsLoading(true)
    try {
      const res = await fetch('/api/rooms')
      const data = await res.json()
      setRooms(Array.isArray(data) ? data : [])
    } catch { }
    setRoomsLoading(false)
  }

  async function handleSaveRate(id: string) {
    setRoomRateError('')
    const rate = parseFloat(editRateValue)
    if (isNaN(rate) || rate < 0) { setRoomRateError('Enter a valid rate'); return }
    const res = await fetch(`/api/rooms/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate }),
    })
    if (!res.ok) { const d = await res.json(); setRoomRateError(d.error || 'Failed'); return }
    setEditingRoomId(null)
    loadRooms()
  }

  // --- Currency state ---
  const [currencyForm, setCurrencyForm] = useState<{ baseCurrency: string; altCurrency: string; rates: Record<string, string> }>({
    baseCurrency: 'THB', altCurrency: 'USD', rates: {},
  })
  const [currencyLoading, setCurrencyLoading] = useState(true)
  const [currencySaving, setCurrencySaving] = useState(false)
  const [currencyError, setCurrencyError] = useState('')
  const [currencySaved, setCurrencySaved] = useState(false)

  // Currencies the hotel deals with day-to-day; rates are entered against base
  const RATE_CURRENCIES = ['THB', 'USD', 'MMK']
  const rateInputCurrencies = Array.from(new Set([...RATE_CURRENCIES, currencyForm.altCurrency]))
    .filter((c) => c !== currencyForm.baseCurrency)

  async function loadCurrency() {
    setCurrencyLoading(true)
    try {
      const res = await fetch('/api/settings')
      const data = await res.json()
      if (res.ok) {
        const stored: Record<string, number> = (data.fxRates && typeof data.fxRates === 'object') ? data.fxRates : {}
        const rates: Record<string, string> = {}
        for (const [code, v] of Object.entries(stored)) rates[code] = String(v)
        // Seed the alt-currency rate from the legacy single rate if the table is empty
        if (rates[data.altCurrency] === undefined && data.fxRate) rates[data.altCurrency] = String(data.fxRate)
        setCurrencyForm({ baseCurrency: data.baseCurrency, altCurrency: data.altCurrency, rates })
      }
    } catch { }
    setCurrencyLoading(false)
  }

  async function handleSaveCurrency() {
    setCurrencyError('')
    setCurrencySaved(false)
    const fxRates: Record<string, number> = {}
    for (const code of rateInputCurrencies) {
      const raw = (currencyForm.rates[code] ?? '').trim()
      if (raw === '') continue
      const r = parseFloat(raw)
      if (isNaN(r) || r <= 0) { setCurrencyError(`Enter a valid rate for ${code}`); return }
      fxRates[code] = r
    }
    if (fxRates[currencyForm.altCurrency] === undefined) {
      setCurrencyError(`A rate for ${currencyForm.altCurrency} (the alternate currency) is required`)
      return
    }
    setCurrencySaving(true)
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseCurrency: currencyForm.baseCurrency, altCurrency: currencyForm.altCurrency, fxRates }),
    })
    setCurrencySaving(false)
    if (!res.ok) { const d = await res.json(); setCurrencyError(d.error || 'Failed'); return }
    setCurrencySaved(true)
    setTimeout(() => setCurrencySaved(false), 2500)
  }

  // Cross rates derived from the table (base = 1). Returns null when unknown.
  function crossRate(from: string, to: string): number | null {
    const toBase = (code: string): number | null => {
      if (code === currencyForm.baseCurrency) return 1
      const r = parseFloat(currencyForm.rates[code] ?? '')
      return isNaN(r) || r <= 0 ? null : r
    }
    const f = toBase(from)
    const t = toBase(to)
    if (f === null || t === null) return null
    return f / t
  }

  function fmtRate(r: number): string {
    if (r >= 100) return r.toLocaleString(undefined, { maximumFractionDigits: 0 })
    if (r >= 1) return r.toLocaleString(undefined, { maximumFractionDigits: 2 })
    return r.toLocaleString(undefined, { maximumFractionDigits: 5 })
  }

  const CROSS_PAIRS: [string, string][] = [
    ['USD', 'THB'],
    ['USD', 'MMK'],
    ['THB', 'MMK'],
  ]

  // --- Charge code state ---
  const [codes, setCodes] = useState<ChargeCode[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [editForm, setEditForm] = useState<Partial<ChargeCode>>({})
  const [addForm, setAddForm] = useState({ code: '', category: '', description: '', price: '', parentCode: '' })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/charge-codes?all=1')
      const data = await res.json()
      setCodes(Array.isArray(data) ? data : [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) loadUsers() }, [isAdmin])
  useEffect(() => { if (canEditRates) { loadRooms(); loadCurrency() } }, [canEditRates])
  useEffect(() => { load() }, [])

  // Sort: sub-codes appear directly after their parent
  const sorted = [...codes].sort((a, b) => {
    const aKey = (a.parentCode ?? a.code) + a.code
    const bKey = (b.parentCode ?? b.code) + b.code
    return aKey.localeCompare(bKey)
  })

  // Top-level codes for parent selector
  const topLevelCodes = codes.filter((c) => c.parentCode == null)

  async function handleAdd() {
    if (!addForm.code.trim() || !addForm.category || !addForm.description.trim() || !addForm.price) {
      setSaveError('All fields are required'); return
    }
    setSaveError('')
    const res = await fetch('/api/charge-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        price: parseFloat(addForm.price),
        parentCode: addForm.parentCode || null,
      }),
    })
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed'); return }
    setAddForm({ code: '', category: '', description: '', price: '', parentCode: '' })
    setShowAdd(false)
    load()
  }

  async function handleEdit(id: number) {
    const res = await fetch(`/api/charge-codes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) { setEditingId(null); load() }
  }

  async function handleToggle(code: ChargeCode) {
    await fetch(`/api/charge-codes/${code.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !code.active }),
    })
    load()
  }

  // Group sorted codes by category
  const byCategory = sorted.reduce<Record<string, ChargeCode[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = []
    acc[c.category].push(c)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage hotel configuration</p>
      </div>

      {/* Staff Accounts Section — admin only */}
      {isAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Staff Accounts</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manage hotel staff logins and roles</p>
            </div>
            <button
              onClick={() => { setShowAddUser(true); setUserError('') }}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Staff
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div>
              {/* Add form */}
              {showAddUser && (
                <div className="px-6 py-4 bg-teal-50 border-b border-teal-100">
                  <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">New Staff Account</p>
                  <div className="grid grid-cols-4 gap-3">
                    <input
                      placeholder="Full name"
                      value={addUserForm.name}
                      onChange={(e) => setAddUserForm(p => ({ ...p, name: e.target.value }))}
                      className={inputCls}
                    />
                    <input
                      placeholder="Email"
                      type="email"
                      value={addUserForm.email}
                      onChange={(e) => setAddUserForm(p => ({ ...p, email: e.target.value }))}
                      className={inputCls}
                    />
                    <input
                      placeholder="Password (min 6 chars)"
                      type="password"
                      value={addUserForm.password}
                      onChange={(e) => setAddUserForm(p => ({ ...p, password: e.target.value }))}
                      className={inputCls}
                    />
                    <select
                      value={addUserForm.userRole}
                      onChange={(e) => setAddUserForm(p => ({ ...p, userRole: e.target.value }))}
                      className={`${inputCls} bg-white`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  {userError && <p className="text-xs text-red-600 mt-2">{userError}</p>}
                  <div className="flex gap-2 mt-3">
                    <button onClick={handleAddUser} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700">Save</button>
                    <button onClick={() => { setShowAddUser(false); setUserError('') }} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-36">Role</th>
                    <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-32">Created</th>
                    <th className="px-6 py-3 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      {editingUserId === u.id ? (
                        <>
                          <td className="px-6 py-2">
                            <input
                              value={userEditForm.name}
                              onChange={(e) => setUserEditForm(p => ({ ...p, name: e.target.value }))}
                              className={`${inputCls} w-full`}
                              placeholder="Full name"
                            />
                          </td>
                          <td className="px-3 py-2 text-slate-400 text-xs">{u.email}</td>
                          <td className="px-3 py-2">
                            <select
                              value={userEditForm.userRole}
                              onChange={(e) => setUserEditForm(p => ({ ...p, userRole: e.target.value }))}
                              className={`${inputCls} bg-white w-full`}
                            >
                              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={userEditForm.password}
                              onChange={(e) => setUserEditForm(p => ({ ...p, password: e.target.value }))}
                              className={`${inputCls} w-full`}
                              type="password"
                              placeholder="New password (optional)"
                            />
                          </td>
                          <td className="px-6 py-2">
                            {userError && editingUserId === u.id && (
                              <p className="text-xs text-red-600 mb-1">{userError}</p>
                            )}
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleEditUser(u.id)} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Check className="w-4 h-4" /></button>
                              <button onClick={() => { setEditingUserId(null); setUserError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {u.name || <span className="text-slate-400 italic">No name</span>}
                            {u.id === currentUserId && <span className="ml-2 text-[10px] font-bold text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">You</span>}
                          </td>
                          <td className="px-3 py-3 text-slate-500">{u.email}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-500'}`}>
                              {ROLE_LABELS[u.role] ?? u.role}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-slate-400 text-xs">
                            {new Date(u.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-6 py-3">
                            {deleteConfirmId === u.id ? (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-red-600 font-bold mr-1">Delete?</span>
                                <button onClick={() => handleDeleteUser(u.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setEditingUserId(u.id); setUserEditForm({ name: u.name ?? '', userRole: u.role, password: '' }); setUserError('') }}
                                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                                {u.id !== currentUserId && (
                                  <button
                                    onClick={() => setDeleteConfirmId(u.id)}
                                    className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No staff accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Room Rates Section — admin/manager only */}
      {canEditRates && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-gray-900">Room Rates</h2>
            <p className="text-xs text-gray-500 mt-0.5">Set the nightly rate for each room</p>
          </div>

          {roomsLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Room</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Floor</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-40">Rate (฿/night)</th>
                  <th className="px-6 py-3 w-20" />
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    {editingRoomId === room.id ? (
                      <>
                        <td className="px-6 py-2 font-mono font-bold text-gray-700">{room.id}</td>
                        <td className="px-3 py-2 text-slate-500">{room.floor}</td>
                        <td className="px-3 py-2 text-slate-500">{room.type}</td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={editRateValue}
                            onChange={(e) => setEditRateValue(e.target.value)}
                            className={`${inputCls} w-32 text-right`}
                            placeholder="0"
                            autoFocus
                          />
                        </td>
                        <td className="px-6 py-2">
                          {roomRateError && editingRoomId === room.id && (
                            <p className="text-xs text-red-600 mb-1">{roomRateError}</p>
                          )}
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleSaveRate(room.id)} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Check className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingRoomId(null); setRoomRateError('') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-3 font-mono font-bold text-gray-700">{room.id}</td>
                        <td className="px-3 py-3 text-slate-500">{room.floor}</td>
                        <td className="px-3 py-3 text-slate-700">{room.type}</td>
                        <td className="px-3 py-3 text-right font-semibold text-gray-900">
                          {room.rate > 0 ? `฿${room.rate.toLocaleString()}` : <span className="text-slate-400 font-normal">Not set</span>}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            onClick={() => { setEditingRoomId(room.id); setEditRateValue(String(room.rate ?? '')); setRoomRateError('') }}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">No rooms found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Currency Section — admin/manager only */}
      {canEditRates && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-gray-900">Currency &amp; Exchange Rate</h2>
            <p className="text-xs text-gray-500 mt-0.5">House rate used when guests pay in the alternate currency</p>
          </div>
          {currencyLoading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-6 py-4">
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Base Currency</label>
                  <select
                    value={currencyForm.baseCurrency}
                    onChange={(e) => setCurrencyForm(p => ({ ...p, baseCurrency: e.target.value }))}
                    className={`${inputCls} bg-white w-28`}
                  >
                    {['THB', 'MMK', 'USD'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Alternate Currency</label>
                  <select
                    value={currencyForm.altCurrency}
                    onChange={(e) => setCurrencyForm(p => ({ ...p, altCurrency: e.target.value }))}
                    className={`${inputCls} bg-white w-28`}
                  >
                    {['USD', 'THB', 'MMK', 'EUR', 'SGD', 'CNY'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {rateInputCurrencies.map((code) => (
                  <div key={code}>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">
                      1 {code} = ? {currencyForm.baseCurrency}
                      {code === currencyForm.altCurrency && <span className="text-teal-600 ml-1">*</span>}
                    </label>
                    <input
                      type="number" min={0} step="any"
                      value={currencyForm.rates[code] ?? ''}
                      onChange={(e) => setCurrencyForm(p => ({ ...p, rates: { ...p.rates, [code]: e.target.value } }))}
                      className={`${inputCls} w-32`}
                      placeholder={code === 'MMK' ? 'e.g. 0.0174' : 'e.g. 36.50'}
                    />
                  </div>
                ))}
                <button
                  onClick={handleSaveCurrency}
                  disabled={currencySaving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {currencySaving ? 'Saving…' : currencySaved ? '✓ Saved' : 'Save Rates'}
                </button>
              </div>
              {currencyError && <p className="text-xs text-red-600 mt-2">{currencyError}</p>}

              {/* Cross-rate reference table */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                {CROSS_PAIRS.map(([from, to]) => {
                  const fwd = crossRate(from, to)
                  const rev = crossRate(to, from)
                  return (
                    <div key={`${from}${to}`} className="border border-slate-200 rounded-xl px-4 py-3 bg-slate-50">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{from} / {to}</p>
                      {fwd === null ? (
                        <p className="text-xs text-slate-400 italic">Enter both rates above</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-slate-800">1 {from} = {fmtRate(fwd)} {to}</p>
                          <p className="text-xs text-slate-500">1 {to} = {fmtRate(rev!)} {from}</p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-slate-400 mt-3">
                Payments and deposits entered in {currencyForm.altCurrency} convert to {currencyForm.baseCurrency} at the {currencyForm.altCurrency} rate (marked *) — the other rates are for front-desk reference. Cross rates are derived through {currencyForm.baseCurrency}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Charge Codes Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Charge Codes</h2>
            <p className="text-xs text-gray-500 mt-0.5">Preset codes for quick charge posting</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Charge Code
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div>
            {/* Add form */}
            {showAdd && (
              <div className="px-6 py-4 bg-teal-50 border-b border-teal-100">
                <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-3">New Charge Code</p>
                <div className="grid grid-cols-6 gap-3">
                  <input placeholder="Code (e.g. 102)" value={addForm.code} onChange={(e) => setAddForm(p => ({ ...p, code: e.target.value }))} className={inputCls} />
                  <select value={addForm.category} onChange={(e) => setAddForm(p => ({ ...p, category: e.target.value }))} className={`${inputCls} bg-white`}>
                    <option value="">Category...</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={addForm.parentCode} onChange={(e) => setAddForm(p => ({ ...p, parentCode: e.target.value }))} className={`${inputCls} bg-white`}>
                    <option value="">None (top-level)</option>
                    {topLevelCodes.map((c) => <option key={c.id} value={c.code}>{c.code} — {c.description}</option>)}
                  </select>
                  <input placeholder="Description" value={addForm.description} onChange={(e) => setAddForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} col-span-2`} />
                  <input type="number" placeholder="Price (฿)" value={addForm.price} onChange={(e) => setAddForm(p => ({ ...p, price: e.target.value }))} className={inputCls} />
                </div>
                {saveError && <p className="text-xs text-red-600 mt-2">{saveError}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleAdd} className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700">Save</button>
                  <button onClick={() => { setShowAdd(false); setSaveError('') }} className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            )}

            {/* Table */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Code</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-32">Category</th>
                  <th className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Price (฿)</th>
                  <th className="text-center px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Status</th>
                  {isAdmin && <th className="px-6 py-3 w-24" />}
                </tr>
              </thead>
              <tbody>
                {Object.entries(byCategory).map(([cat, catCodes]) => (
                  <>
                    <tr key={`cat-${cat}`} className="bg-slate-50 border-y border-slate-100">
                      <td colSpan={isAdmin ? 6 : 5} className="px-6 py-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
                      </td>
                    </tr>
                    {catCodes.map((code) => (
                      <tr key={code.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${!code.active ? 'opacity-50' : ''}`}>
                        {editingId === code.id ? (
                          <>
                            <td className="px-6 py-2"><input value={editForm.code ?? ''} onChange={(e) => setEditForm(p => ({ ...p, code: e.target.value }))} className={`${inputCls} w-16`} /></td>
                            <td className="px-3 py-2">
                              <select value={editForm.category ?? ''} onChange={(e) => setEditForm(p => ({ ...p, category: e.target.value }))} className={`${inputCls} bg-white w-full`}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2"><input value={editForm.description ?? ''} onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))} className={`${inputCls} w-full`} /></td>
                            <td className="px-3 py-2"><input type="number" value={editForm.price ?? ''} onChange={(e) => setEditForm(p => ({ ...p, price: parseFloat(e.target.value) }))} className={`${inputCls} w-20 text-right`} /></td>
                            <td className="px-3 py-2">
                              <select value={editForm.parentCode ?? ''} onChange={(e) => setEditForm(p => ({ ...p, parentCode: e.target.value || null }))} className={`${inputCls} bg-white w-full`}>
                                <option value="">None (top-level)</option>
                                {topLevelCodes.filter((c) => c.id !== code.id).map((c) => <option key={c.id} value={c.code}>{c.code} — {c.description}</option>)}
                              </select>
                            </td>
                            <td className="px-6 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(code.id)} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 font-mono font-bold">
                              <span className={code.parentCode ? 'text-gray-400' : 'text-orange-600'}>
                                {code.parentCode ? `└${code.code}` : code.code}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-gray-500">{code.category}</td>
                            <td className="px-3 py-3 text-gray-800">{code.description}</td>
                            <td className="px-3 py-3 text-right font-semibold text-gray-900">฿{code.price.toLocaleString()}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${code.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                {code.active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => { setEditingId(code.id); setEditForm({ code: code.code, category: code.category, description: code.description, price: code.price, parentCode: code.parentCode }) }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                                    <Pencil className="w-3.5 h-3.5 text-gray-400" />
                                  </button>
                                  <button onClick={() => handleToggle(code)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title={code.active ? 'Deactivate' : 'Activate'}>
                                    {code.active
                                      ? <ToggleRight className="w-4 h-4 text-teal-500" />
                                      : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    ))}
                  </>
                ))}
                {codes.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-400 text-sm">
                      No charge codes yet. {isAdmin ? 'Add your first charge code above.' : 'Contact an admin to add charge codes.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
