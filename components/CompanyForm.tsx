'use client'

import { useState } from 'react'
import { Company } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'
import { X, Building2, AlertTriangle } from 'lucide-react'

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent'
const selectCls = `${inputCls} bg-white`

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

interface Props {
  initial?: Partial<Company>
  onSave: (data: Partial<Company>) => Promise<void>
  onClose: () => void
}

const RACK_RATES: Record<string, number> = {
  STANDARD: 1200,
  DELUXE: 1800,
  SUITE: 3500,
  POOL_VILLA: 6500,
}

export default function CompanyForm({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'COMPANY',
    contactName: initial?.contactName ?? '',
    contactEmail: initial?.contactEmail ?? '',
    contactPhone: initial?.contactPhone ?? '',
    address: initial?.address ?? '',
    taxId: initial?.taxId ?? '',
    notes: initial?.notes ?? '',
    contractRates: {
      STANDARD: initial?.contractRates?.STANDARD ?? 0,
      DELUXE: initial?.contractRates?.DELUXE ?? 0,
      SUITE: initial?.contractRates?.SUITE ?? 0,
      POOL_VILLA: initial?.contractRates?.POOL_VILLA ?? 0,
    },
    blackoutEnabled: !!(initial?.blackoutStart),
    blackoutStart: initial?.blackoutStart ?? '',
    blackoutEnd: initial?.blackoutEnd ?? '',
    active: initial?.active !== false,
    creditLimit: initial?.creditLimit ?? 0,
    creditResetDay: initial?.creditResetDay ?? 1,
    bankName: initial?.bankName ?? '',
    bankAccountName: initial?.bankAccountName ?? '',
    bankAccountNumber: initial?.bankAccountNumber ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function setRate(roomType: string, discount: number) {
    setForm((prev) => ({
      ...prev,
      contractRates: { ...prev.contractRates, [roomType]: Math.max(0, Math.min(100, discount)) },
    }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Company name is required'); return }
    setError('')
    setLoading(true)
    try {
      await onSave({
        name: form.name.trim(),
        type: form.type as 'COMPANY' | 'AGENT',
        contactName: form.contactName || null,
        contactEmail: form.contactEmail || null,
        contactPhone: form.contactPhone || null,
        address: form.address || null,
        taxId: form.taxId || null,
        notes: form.notes || null,
        contractRates: form.contractRates,
        blackoutStart: form.blackoutEnabled ? form.blackoutStart || null : null,
        blackoutEnd: form.blackoutEnabled ? form.blackoutEnd || null : null,
        active: form.active,
        creditLimit: form.creditLimit,
        creditResetDay: form.creditResetDay,
        bankName: form.bankName || null,
        bankAccountName: form.bankAccountName || null,
        bankAccountNumber: form.bankAccountNumber || null,
      })
      onClose()
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{initial?.id ? 'Edit Company' : 'New Company / Agent'}</h2>
              <p className="text-xs text-gray-500">Contract rate = % discount off rack</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Company / Agent Name" required>
                <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="e.g. Bangkok Travel Agency" />
              </Field>
            </div>
            <Field label="Type" required>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className={selectCls}>
                <option value="COMPANY">Corporate Company</option>
                <option value="AGENT">Travel Agent</option>
              </select>
            </Field>
            <Field label="Tax ID / Business No.">
              <input type="text" value={form.taxId} onChange={(e) => set('taxId', e.target.value)} className={inputCls} placeholder="Optional" />
            </Field>
            <Field label="Contact Name">
              <input type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Contact Phone">
              <input type="tel" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} className={inputCls} />
            </Field>
            <div className="col-span-2">
              <Field label="Contact Email">
                <input type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Address">
                <input type="text" value={form.address} onChange={(e) => set('address', e.target.value)} className={inputCls} />
              </Field>
            </div>
          </div>

          {/* Contract Rates */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contract Rates (% Discount Off Rack)</p>
            </div>
            <div className="p-4 space-y-3">
              {(['STANDARD', 'DELUXE', 'SUITE', 'POOL_VILLA'] as const).map((rt) => {
                const rack = RACK_RATES[rt]
                const disc = form.contractRates[rt] ?? 0
                const contracted = disc > 0 ? Math.round(rack * (1 - disc / 100)) : rack
                return (
                  <div key={rt} className="flex items-center gap-4">
                    <div className="w-28 text-sm font-medium text-gray-700">{ROOM_TYPES[rt]?.name ?? rt}</div>
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={disc}
                        onChange={(e) => setRate(rt, parseFloat(e.target.value) || 0)}
                        className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <span className="text-xs text-gray-500">% off</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 line-through">฿{rack.toLocaleString()}</div>
                      <div className={`text-sm font-semibold ${disc > 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                        ฿{contracted.toLocaleString()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Blackout dates */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Blackout Dates</p>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.blackoutEnabled}
                  onChange={(e) => set('blackoutEnabled', e.target.checked)}
                  className="rounded"
                />
                Enable blackout period
              </label>
            </div>
            {form.blackoutEnabled && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3 text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  <p className="text-xs">Contract rates do not apply during this period.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <input type="date" value={form.blackoutStart} onChange={(e) => set('blackoutStart', e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="End Date">
                    <input type="date" value={form.blackoutEnd} onChange={(e) => set('blackoutEnd', e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </div>
            )}
          </div>

          {/* Credit Account */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Credit Account</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Credit Limit (฿)">
                  <input
                    type="number"
                    min={0}
                    value={form.creditLimit}
                    onChange={(e) => set('creditLimit', parseFloat(e.target.value) || 0)}
                    className={inputCls}
                    placeholder="0"
                  />
                </Field>
                <Field label="Reset on day ___ of each month">
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={form.creditResetDay}
                    onChange={(e) => set('creditResetDay', Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Field label="Bank Name">
                  <input type="text" value={form.bankName} onChange={(e) => set('bankName', e.target.value)} className={inputCls} placeholder="e.g. Kasikorn Bank" />
                </Field>
                <Field label="Account Name">
                  <input type="text" value={form.bankAccountName} onChange={(e) => set('bankAccountName', e.target.value)} className={inputCls} placeholder="Account holder name" />
                </Field>
                <div className="col-span-2">
                  <Field label="Account Number">
                    <input type="text" value={form.bankAccountNumber} onChange={(e) => set('bankAccountNumber', e.target.value)} className={inputCls} placeholder="e.g. 123-4-56789-0" />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <Field label="Internal Notes">
            <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className={inputCls} placeholder="Any internal notes..." />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {loading ? 'Saving...' : initial?.id ? 'Save Changes' : 'Create Company'}
          </button>
        </div>
      </div>
    </div>
  )
}
