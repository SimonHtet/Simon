'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { ChargeCode } from '@/types'
import { Plus, Pencil, Check, X, ToggleLeft, ToggleRight } from 'lucide-react'

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'

const CATEGORIES = ['F&B', 'Housekeeping', 'Spa', 'Transport', 'Minibar', 'Misc', 'ROOM', 'PAYMENT']

export default function SettingsPage() {
  const { data: session } = useSession()
  const role = (session?.user as any)?.role
  const isAdmin = role === 'admin'

  const [codes, setCodes] = useState<ChargeCode[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [editForm, setEditForm] = useState<Partial<ChargeCode>>({})
  const [addForm, setAddForm] = useState({ code: '', category: '', description: '', price: '' })

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/charge-codes')
      const data = await res.json()
      // Fetch all (including inactive) for admin view
      const allRes = await fetch('/api/charge-codes?all=1')
      // Use the active-only list for now (api returns active only)
      setCodes(Array.isArray(data) ? data : [])
    } catch { }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!addForm.code.trim() || !addForm.category || !addForm.description.trim() || !addForm.price) {
      setSaveError('All fields are required'); return
    }
    setSaveError('')
    const res = await fetch('/api/charge-codes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, price: parseFloat(addForm.price) }),
    })
    if (!res.ok) { const d = await res.json(); setSaveError(d.error || 'Failed'); return }
    setAddForm({ code: '', category: '', description: '', price: '' })
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

  // Group by category
  const byCategory = codes.reduce<Record<string, ChargeCode[]>>((acc, c) => {
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
                <div className="grid grid-cols-5 gap-3">
                  <input placeholder="Code (e.g. 102)" value={addForm.code} onChange={(e) => setAddForm(p => ({ ...p, code: e.target.value }))} className={inputCls} />
                  <select value={addForm.category} onChange={(e) => setAddForm(p => ({ ...p, category: e.target.value }))} className={`${inputCls} bg-white`}>
                    <option value="">Category...</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                            <td />
                            <td className="px-6 py-2">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleEdit(code.id)} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 font-mono font-bold text-orange-600">{code.code}</td>
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
                                  <button onClick={() => { setEditingId(code.id); setEditForm({ code: code.code, category: code.category, description: code.description, price: code.price }) }} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
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
