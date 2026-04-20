'use client'

import { useState, useEffect } from 'react'
import { Room, Reservation, Company } from '@/types'
import { ROOM_TYPES, BOOKING_SOURCES, CHARGE_CATEGORIES, PAYMENT_TYPES, DEPARTMENTS } from '@/lib/constants'
import { calculateNights } from '@/lib/utils'
import {
  X, Plus, ArrowRight, Clock, Plane, Home, User, Calendar, DollarSign,
  CreditCard, MessageSquare, BedDouble, Hotel, ChevronRight, AlertTriangle,
} from 'lucide-react'

// ─── Shared ───────────────────────────────────────────────────────────────────

function ModalShell({
  title,
  subtitle,
  icon: Icon,
  iconBg,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  icon: React.ElementType
  iconBg: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${iconBg}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{title}</h2>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({
  label,
  children,
  required,
}: {
  label: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
const selectCls = `${inputCls} bg-white`

// ─── New Reservation Modal ─────────────────────────────────────────────────────

interface NewReservationData {
  guestName: string
  firstName?: string
  lastName?: string
  nationality?: string
  email?: string
  phone?: string
  passportNumber?: string
  vipStatus?: string
  companyId?: string
  roomId: string
  roomTypeId: string
  checkIn: string
  checkOut: string
  rate: number
  adults: number
  children: number
  source?: string
  specials?: string
  eta?: string
  masterResId?: string
}

interface NewReservationModalProps {
  rooms: Room[]
  onConfirm: (data: NewReservationData) => Promise<void>
  onClose: () => void
}

const RACK_RATES: Record<string, number> = {
  STANDARD: 1200, DELUXE: 1800, SUITE: 3500, POOL_VILLA: 6500,
}

export function NewReservationModal({ rooms, onConfirm, onClose }: NewReservationModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState<NewReservationData>({
    guestName: '',
    roomId: '',
    roomTypeId: 'STANDARD',
    checkIn: today,
    checkOut: tomorrow,
    rate: ROOM_TYPES.STANDARD.rate,
    adults: 1,
    children: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [blackoutWarning, setBlackoutWarning] = useState(false)

  useEffect(() => {
    fetch('/api/companies').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setCompanies(d.filter((c: Company) => c.active))
    }).catch(() => {})
  }, [])

  function set(field: keyof NewReservationData, value: any) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // Auto-update rate when room type changes
      if (field === 'roomTypeId' && ROOM_TYPES[value]) {
        next.rate = applyContractRate(value, selectedCompany)
      }
      // Auto-update room type when room changes
      if (field === 'roomId') {
        const room = rooms.find((r) => r.id === value)
        if (room) {
          next.roomTypeId = room.type
          next.rate = applyContractRate(room.type, selectedCompany)
        }
      }
      return next
    })
  }

  function applyContractRate(roomType: string, co: Company | null): number {
    const rack = RACK_RATES[roomType] ?? ROOM_TYPES[roomType]?.rate ?? 0
    if (!co) return rack
    const rates = co.contractRates as Record<string, number>
    const disc = rates[roomType] ?? 0
    return disc > 0 ? Math.round(rack * (1 - disc / 100)) : rack
  }

  function handleCompanyChange(companyId: string) {
    const co = companies.find((c) => c.id === companyId) ?? null
    setSelectedCompany(co)
    set('companyId', companyId || undefined)

    // Check blackout
    if (co && co.blackoutStart && co.blackoutEnd) {
      const ci = form.checkIn
      const isBlackout = ci >= co.blackoutStart && ci <= co.blackoutEnd
      setBlackoutWarning(isBlackout)
    } else {
      setBlackoutWarning(false)
    }

    // Auto-fill rate based on selected room type
    if (co) {
      const roomType = form.roomTypeId
      setForm((prev) => ({ ...prev, companyId: companyId || undefined, rate: applyContractRate(roomType, co) }))
    } else {
      setForm((prev) => ({ ...prev, companyId: undefined, rate: RACK_RATES[prev.roomTypeId] ?? prev.rate }))
    }
  }

  const availableRooms = rooms.filter((r) => r.status === 'available')
  const nights = form.checkIn && form.checkOut ? calculateNights(form.checkIn, form.checkOut) : 0
  const total = nights * form.rate

  async function handleSubmit() {
    if (!form.guestName.trim()) { setError('Guest name is required'); return }
    if (!form.roomId) { setError('Please select a room'); return }
    if (!form.checkIn || !form.checkOut) { setError('Dates are required'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm(form)
    } catch (e: any) {
      setError(e.message || 'Failed to create reservation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="New Reservation" icon={Plus} iconBg="bg-sky-500" onClose={onClose}>
      <div className="overflow-y-auto flex-1 p-6 space-y-4">
        {/* Guest info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FormField label="Guest Name" required>
              <input
                type="text"
                placeholder="Full name"
                value={form.guestName}
                onChange={(e) => set('guestName', e.target.value)}
                className={inputCls}
              />
            </FormField>
          </div>
          <FormField label="First Name">
            <input type="text" placeholder="First" value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Last Name">
            <input type="text" placeholder="Last" value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Nationality">
            <input type="text" placeholder="e.g. Thai" value={form.nationality || ''} onChange={(e) => set('nationality', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Email">
            <input type="email" placeholder="email@example.com" value={form.email || ''} onChange={(e) => set('email', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Phone">
            <input type="tel" placeholder="+66..." value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Passport / ID">
            <input type="text" value={form.passportNumber || ''} onChange={(e) => set('passportNumber', e.target.value)} className={inputCls} />
          </FormField>
        </div>

        <div className="border-t border-gray-100" />

        {/* Company / Agent */}
        {companies.length > 0 && (
          <div className="space-y-2">
            <FormField label="Company / Agent">
              <select
                value={form.companyId || ''}
                onChange={(e) => handleCompanyChange(e.target.value)}
                className={selectCls}
              >
                <option value="">None (rack rate)</option>
                {companies.map((co) => (
                  <option key={co.id} value={co.id}>
                    [{co.type}] {co.name}
                  </option>
                ))}
              </select>
            </FormField>
            {blackoutWarning && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>Check-in falls within this company's blackout period ({selectedCompany?.blackoutStart} – {selectedCompany?.blackoutEnd}). Contract rates may not apply.</span>
              </div>
            )}
            {selectedCompany && !blackoutWarning && (
              <div className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                Contract rate applied for {selectedCompany.name}
              </div>
            )}
          </div>
        )}

        {/* Room & dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <FormField label="Room" required>
              <select value={form.roomId} onChange={(e) => set('roomId', e.target.value)} className={selectCls}>
                <option value="">Select room...</option>
                {availableRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.id} — {ROOM_TYPES[r.type]?.name ?? r.type}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Check In" required>
            <input type="date" value={form.checkIn} min={today} onChange={(e) => set('checkIn', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Check Out" required>
            <input type="date" value={form.checkOut} min={form.checkIn || today} onChange={(e) => set('checkOut', e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Rate / Night (฿)">
            <input type="number" value={form.rate} onChange={(e) => set('rate', parseFloat(e.target.value))} className={inputCls} />
          </FormField>
          <div>
            <FormField label="Nights">
              <div className={`${inputCls} bg-gray-50 text-gray-600`}>{nights} nights · ฿{total.toLocaleString()}</div>
            </FormField>
          </div>
          <FormField label="Adults">
            <input type="number" min={1} max={6} value={form.adults} onChange={(e) => set('adults', parseInt(e.target.value))} className={inputCls} />
          </FormField>
          <FormField label="Children">
            <input type="number" min={0} max={6} value={form.children} onChange={(e) => set('children', parseInt(e.target.value))} className={inputCls} />
          </FormField>
          <div className="col-span-2">
            <FormField label="Booking Source">
              <select value={form.source || ''} onChange={(e) => set('source', e.target.value)} className={selectCls}>
                <option value="">Select source...</option>
                {BOOKING_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>
          <div className="col-span-2">
            <FormField label="Special Requests">
              <textarea
                rows={2}
                placeholder="Any special requests or notes..."
                value={form.specials || ''}
                onChange={(e) => set('specials', e.target.value)}
                className={inputCls}
              />
            </FormField>
          </div>
          <FormField label="ETA">
            <input type="time" value={form.eta || ''} onChange={(e) => set('eta', e.target.value)} className={inputCls} />
          </FormField>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {loading ? 'Creating...' : 'Create Reservation'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Move Room Modal ───────────────────────────────────────────────────────────

interface MoveRoomModalProps {
  reservation: Reservation
  rooms: Room[]
  onConfirm: (newRoomId: string, reason: string) => Promise<void>
  onClose: () => void
}

export function MoveRoomModal({ reservation: res, rooms, onConfirm, onClose }: MoveRoomModalProps) {
  const [selectedRoom, setSelectedRoom] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableRooms = rooms.filter((r) => r.status === 'available' && r.id !== res.roomId)

  async function handleConfirm() {
    if (!selectedRoom) { setError('Please select a room'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm(selectedRoom, reason)
    } catch (e: any) {
      setError(e.message || 'Failed to move room')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Move Room" subtitle={res.guestName} icon={ArrowRight} iconBg="bg-indigo-500" onClose={onClose}>
      <div className="p-6 space-y-4 overflow-y-auto flex-1">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 text-sm">
          <div className="text-center">
            <p className="text-xs text-gray-500">Current</p>
            <p className="font-bold text-gray-900">Room {res.roomId}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 mx-auto" />
          <div className="text-center">
            <p className="text-xs text-gray-500">Moving To</p>
            <p className="font-bold text-indigo-700">{selectedRoom ? `Room ${selectedRoom}` : '—'}</p>
          </div>
        </div>

        <FormField label="New Room" required>
          <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} className={selectCls}>
            <option value="">Select available room...</option>
            {availableRooms.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.id} — {ROOM_TYPES[r.type]?.name ?? r.type} (Floor {r.floor})
              </option>
            ))}
          </select>
        </FormField>
        {availableRooms.length === 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">No available rooms at this time.</p>
        )}

        <FormField label="Reason for Move">
          <textarea
            rows={2}
            placeholder="Optional reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputCls}
          />
        </FormField>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>

      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading || !selectedRoom} className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Moving...' : 'Confirm Move'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Extend Stay Modal ─────────────────────────────────────────────────────────

interface ExtendStayModalProps {
  reservation: Reservation
  onConfirm: (extraNights: number) => Promise<void>
  onClose: () => void
}

export function ExtendStayModal({ reservation: res, onConfirm, onClose }: ExtendStayModalProps) {
  const [extraNights, setExtraNights] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentCheckOut = new Date(res.checkOut)
  const newCheckOut = new Date(currentCheckOut)
  newCheckOut.setDate(newCheckOut.getDate() + extraNights)

  async function handleConfirm() {
    if (extraNights < 1) { setError('Must extend by at least 1 night'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm(extraNights)
    } catch (e: any) {
      setError(e.message || 'Failed to extend stay')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Extend Stay" subtitle={res.guestName} icon={Clock} iconBg="bg-teal-500" onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-500">Current Check-Out</span>
            <span className="font-semibold text-gray-900">{res.checkOut}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">New Check-Out</span>
            <span className="font-semibold text-teal-700">{newCheckOut.toISOString().split('T')[0]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Extra Charge</span>
            <span className="font-semibold text-gray-900">฿{(extraNights * res.rate).toLocaleString()}</span>
          </div>
        </div>

        <FormField label="Extra Nights" required>
          <input
            type="number"
            min={1}
            max={30}
            value={extraNights}
            onChange={(e) => setExtraNights(Math.max(1, parseInt(e.target.value) || 1))}
            className={inputCls}
          />
        </FormField>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>

      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Extending...' : `Extend by ${extraNights}N`}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Add Charge Modal ──────────────────────────────────────────────────────────

interface AddChargeModalProps {
  reservation: Reservation
  onConfirm: (data: { item: string; amount: number; date: string; category?: string }) => Promise<void>
  onClose: () => void
}

export function AddChargeModal({ reservation: res, onConfirm, onClose }: AddChargeModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!item.trim()) { setError('Item description is required'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm({ item, amount: parseFloat(amount), date, category: category || undefined })
    } catch (e: any) {
      setError(e.message || 'Failed to post charge')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Add Charge" subtitle={res.guestName} icon={DollarSign} iconBg="bg-orange-500" onClose={onClose}>
      <div className="p-6 space-y-4">
        <FormField label="Description" required>
          <input type="text" placeholder="e.g. Mini Bar, Room Service..." value={item} onChange={(e) => setItem(e.target.value)} className={inputCls} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount (฿)" required>
            <input type="number" min={0} step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </FormField>
        </div>
        <FormField label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            <option value="">Select category...</option>
            {CHARGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>
      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Posting...' : 'Post Charge'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Post Payment Modal ────────────────────────────────────────────────────────

interface PostPaymentModalProps {
  reservation: Reservation
  onConfirm: (data: { item: string; amount: number; date: string }) => Promise<void>
  onClose: () => void
}

export function PostPaymentModal({ reservation: res, onConfirm, onClose }: PostPaymentModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [paymentType, setPaymentType] = useState('Cash')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm({ item: `Payment — ${paymentType}`, amount: parseFloat(amount), date })
    } catch (e: any) {
      setError(e.message || 'Failed to post payment')
    } finally {
      setLoading(false)
    }
  }

  const totalCharges = res.charges.filter(c => c.amount > 0).reduce((s, c) => s + c.amount, 0)
  const totalPaid = Math.abs(res.charges.filter(c => c.amount < 0).reduce((s, c) => s + c.amount, 0))
  const balance = (totalCharges || res.totalAmount) - totalPaid

  return (
    <ModalShell title="Post Payment" subtitle={res.guestName} icon={CreditCard} iconBg="bg-green-600" onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Balance Due</span>
            <span className="font-bold text-green-700">฿{balance.toLocaleString()}</span>
          </div>
        </div>
        <FormField label="Payment Method" required>
          <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className={selectCls}>
            {PAYMENT_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount (฿)" required>
            <input type="number" min={0} step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </FormField>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>
      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Posting...' : 'Post Payment'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Add Trace Modal ───────────────────────────────────────────────────────────

interface AddTraceModalProps {
  reservation: Reservation
  onConfirm: (data: { text: string; date: string; department: string }) => Promise<void>
  onClose: () => void
}

export function AddTraceModal({ reservation: res, onConfirm, onClose }: AddTraceModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [text, setText] = useState('')
  const [date, setDate] = useState(today)
  const [department, setDepartment] = useState('FRONT OFFICE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    if (!text.trim()) { setError('Trace text is required'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm({ text, date, department })
    } catch (e: any) {
      setError(e.message || 'Failed to add trace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Add Trace" subtitle={res.guestName} icon={MessageSquare} iconBg="bg-purple-500" onClose={onClose}>
      <div className="p-6 space-y-4">
        <FormField label="Trace / Note" required>
          <textarea
            rows={3}
            placeholder="Enter trace or note for this reservation..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputCls}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Due Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Department">
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={selectCls}>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>
      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Adding...' : 'Add Trace'}
        </button>
      </div>
    </ModalShell>
  )
}
