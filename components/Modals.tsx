'use client'

import { useState, useEffect } from 'react'
import { Room, Reservation, Company, ChargeCode } from '@/types'
import { ROOM_TYPES, BOOKING_SOURCES, CHARGE_CATEGORIES, PAYMENT_TYPES, DEPARTMENTS } from '@/lib/constants'
import { calculateNights } from '@/lib/utils'
import { formatMoney, altToBase, type HotelSetting } from '@/lib/currency'
import {
  X, Plus, ArrowRight, Clock, Plane, Home, User, Calendar, DollarSign,
  CreditCard, MessageSquare, BedDouble, Hotel, ChevronRight, AlertTriangle,
  Banknote,
} from 'lucide-react'

// Fetches the hotel currency setting; null until loaded (modals fall back to base-only)
function useHotelSetting(): HotelSetting | null {
  const [setting, setSetting] = useState<HotelSetting | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setSetting(d) })
      .catch(() => { })
    return () => { cancelled = true }
  }, [])
  return setting
}

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
  initialRoomId?: string
}

const RACK_RATES: Record<string, number> = {
  STANDARD: 1200, DELUXE: 1800, SUITE: 3500, POOL_VILLA: 6500,
}

export function NewReservationModal({ rooms, onConfirm, onClose, initialRoomId }: NewReservationModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const initialRoom = initialRoomId ? rooms.find((r) => r.id === initialRoomId) : undefined
  const initialRoomType = initialRoom?.type ?? 'STANDARD'

  const [form, setForm] = useState<NewReservationData>({
    guestName: '',
    roomId: initialRoomId ?? '',
    roomTypeId: initialRoomType,
    checkIn: today,
    checkOut: tomorrow,
    rate: ROOM_TYPES[initialRoomType]?.rate ?? ROOM_TYPES.STANDARD.rate,
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
  onConfirm: (newRoomId: string, reason: string, pricingAction: string) => Promise<void>
  onClose: () => void
}

export function MoveRoomModal({ reservation: res, rooms, onConfirm, onClose }: MoveRoomModalProps) {
  const [selectedRoom, setSelectedRoom] = useState('')
  const [reason, setReason] = useState('')
  const [pricingAction, setPricingAction] = useState('no_change')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const availableRooms = rooms.filter((r) => r.status === 'available' && r.id !== res.roomId)

  const selectedRoomObj = rooms.find((r) => r.id === selectedRoom)
  const newRate = selectedRoomObj ? (ROOM_TYPES[selectedRoomObj.type]?.rate ?? res.rate) : res.rate
  const diff = newRate - res.rate

  useEffect(() => {
    if (diff > 0) setPricingAction('charge_diff')
    else if (diff < 0) setPricingAction('keep_rate')
    else setPricingAction('no_change')
  }, [selectedRoom, diff])

  async function handleConfirm() {
    if (!selectedRoom) { setError('Please select a room'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm(selectedRoom, reason, pricingAction)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to move room')
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

        {selectedRoom && diff !== 0 && (
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {diff > 0 ? `Upgrade — ฿${diff} more/night` : `Downgrade — ฿${Math.abs(diff)} less/night`}
            </p>
            {diff > 0 ? (
              <>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="pricingAction" value="charge_diff" checked={pricingAction === 'charge_diff'} onChange={() => setPricingAction('charge_diff')} />
                  Charge difference (฿{(diff * res.totalNights).toLocaleString()} total)
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="pricingAction" value="complimentary" checked={pricingAction === 'complimentary'} onChange={() => setPricingAction('complimentary')} />
                  Complimentary upgrade
                </label>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="pricingAction" value="keep_rate" checked={pricingAction === 'keep_rate'} onChange={() => setPricingAction('keep_rate')} />
                  Keep current rate
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="pricingAction" value="credit_diff" checked={pricingAction === 'credit_diff'} onChange={() => setPricingAction('credit_diff')} />
                  Credit difference (฿{(Math.abs(diff) * res.totalNights).toLocaleString()} total)
                </label>
              </>
            )}
          </div>
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
  const [query, setQuery] = useState('')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [chargeCodes, setChargeCodes] = useState<ChargeCode[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [codeSelected, setCodeSelected] = useState(false)

  useEffect(() => {
    fetch('/api/charge-codes').then((r) => r.json()).then((d) => {
      if (Array.isArray(d)) setChargeCodes(d)
    }).catch(() => {})
  }, [])

  const filtered = query.trim()
    ? (() => {
        const directMatches = chargeCodes.filter((c) =>
          c.code.startsWith(query) ||
          c.description.toLowerCase().includes(query.toLowerCase())
        )
        const matchedParentCodes = new Set(
          directMatches.filter((c) => c.parentCode == null).map((c) => c.code)
        )
        const children = chargeCodes.filter(
          (c) => c.parentCode != null && matchedParentCodes.has(c.parentCode) && !directMatches.includes(c)
        )
        return [...directMatches, ...children].slice(0, 10)
      })()
    : []

  function selectCode(code: ChargeCode) {
    setItem(code.description)
    setAmount(String(code.price))
    setCategory(code.category)
    setQuery(`${code.code} — ${code.description}`)
    setShowDropdown(false)
    setCodeSelected(true)
  }

  function clearCode() {
    setCodeSelected(false)
    setQuery('')
    setItem('')
    setAmount('')
    setCategory('')
  }

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
        {/* Code lookup */}
        <div className="relative">
          <FormField label="Charge Code / Description" required>
            <input
              type="text"
              placeholder="Type code (e.g. 102) or keyword (e.g. beer)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowDropdown(true)
                setCodeSelected(false)
                if (!e.target.value) { setItem(''); setAmount(''); setCategory('') }
              }}
              onFocus={() => query && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              className={inputCls}
            />
          </FormField>
          {showDropdown && filtered.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => selectCode(c)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-orange-50 text-left transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-orange-600 w-10">{c.parentCode ? `└${c.code}` : c.code}</span>
                    <span className="text-xs text-gray-500">{c.category}</span>
                    <span className={`text-sm font-medium ${c.parentCode ? 'text-gray-500 pl-2' : 'text-gray-800'}`}>{c.description}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">฿{c.price.toLocaleString()}</span>
                </button>
              ))}
              <button
                type="button"
                onMouseDown={() => { setShowDropdown(false); setCodeSelected(false) }}
                className="w-full px-4 py-2 text-xs text-gray-400 hover:bg-gray-50 text-left border-t border-gray-100"
              >
                Manual entry
              </button>
            </div>
          )}
        </div>

        {/* Description (editable) */}
        <FormField label="Description" required>
          <input
            type="text"
            placeholder="Item description..."
            value={item}
            onChange={(e) => setItem(e.target.value)}
            className={inputCls}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Amount (฿)" required>
            <input type="number" min={0} step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </FormField>
        </div>

        {/* Category — auto-filled when code selected, otherwise readonly display */}
        <FormField label="Category">
          {codeSelected ? (
            <div className={`${inputCls} bg-gray-50 text-gray-600`}>{category}</div>
          ) : (
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              <option value="">Select category...</option>
              {CHARGE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
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
  onConfirm: (data: { item: string; amount: number; date: string; paymentMethod?: string; currency?: string }) => Promise<void>
  onClose: () => void
}

export function PostPaymentModal({ reservation: res, onConfirm, onClose }: PostPaymentModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [paymentType, setPaymentType] = useState('Cash')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setting = useHotelSetting()
  const [currency, setCurrency] = useState<string | null>(null)
  const activeCurrency = currency ?? setting?.baseCurrency ?? 'THB'
  const isAlt = setting != null && activeCurrency === setting.altCurrency

  const hasCompany = !!(res.companyId && res.company)
  const isCityLedger = paymentType === 'City Ledger'
  const noCityLedgerCompany = isCityLedger && !hasCompany
  const creditAvailable = hasCompany ? Math.max(0, (res.company!.creditLimit ?? 0) - (res.company!.creditUsed ?? 0)) : 0

  async function handleConfirm() {
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0'); return }
    setError('')
    setLoading(true)
    try {
      await onConfirm({
        item: `Payment — ${paymentType}`,
        amount: parseFloat(amount),
        date,
        paymentMethod: paymentType,
        ...(isAlt && { currency: activeCurrency }),
      })
    } catch (e: any) {
      setError(e.message || 'Failed to post payment')
    } finally {
      setLoading(false)
    }
  }

  const charges = res.charges ?? []
  const totalCharges = charges.filter(c => c.amount > 0).reduce((s, c) => s + c.amount, 0)
  const totalPaid = Math.abs(charges.filter(c => c.amount < 0).reduce((s, c) => s + c.amount, 0))
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

        {isCityLedger && (
          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">City Ledger Account</p>
            {!hasCompany ? (
              <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                No company linked to this reservation — assign a corporate account before using City Ledger.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{res.company!.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${res.company!.type === 'AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                    {res.company!.type}
                  </span>
                </div>
                {res.company!.creditLimit > 0 && (
                  <p className="text-xs text-slate-600">
                    Available credit: <span className="font-bold text-sky-700">฿{creditAvailable.toLocaleString()}</span>
                    {' '}of ฿{res.company!.creditLimit.toLocaleString()}
                  </p>
                )}
                {(res.company!.bankName || res.company!.bankAccountNumber) && (
                  <div className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2 space-y-0.5">
                    {res.company!.bankName && <p><span className="text-slate-400">Bank:</span> <span className="font-semibold">{res.company!.bankName}</span></p>}
                    {res.company!.bankAccountName && <p><span className="text-slate-400">Account Name:</span> <span className="font-semibold">{res.company!.bankAccountName}</span></p>}
                    {res.company!.bankAccountNumber && <p><span className="text-slate-400">Account No:</span> <span className="font-mono font-bold">{res.company!.bankAccountNumber}</span></p>}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label={`Amount (${activeCurrency})`} required>
            <div className="flex gap-2">
              <input type="number" min={0} step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              {setting && (
                <select
                  value={activeCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 flex-shrink-0 border border-gray-200 rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={setting.baseCurrency}>{setting.baseCurrency}</option>
                  <option value={setting.altCurrency}>{setting.altCurrency}</option>
                </select>
              )}
            </div>
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </FormField>
        </div>
        {isAlt && setting && amount && parseFloat(amount) > 0 && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Converts to <span className="font-bold">{formatMoney(altToBase(parseFloat(amount), setting.fxRate), setting.baseCurrency)}</span> at house rate {setting.fxRate} {setting.baseCurrency}/{setting.altCurrency}
          </p>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>
      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading || noCityLedgerCompany} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Posting...' : 'Post Payment'}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Record Deposit Modal ──────────────────────────────────────────────────────

const DEPOSIT_METHODS = ['Bank Transfer', 'Cash', 'Credit Card', 'PromptPay', 'Mobile Pay']

interface RecordDepositModalProps {
  reservation: Reservation
  onSaved: (charge: { id: number; item: string; amount: number; date: string; category?: string | null }) => void
  onClose: () => void
}

export function RecordDepositModal({ reservation: res, onSaved, onClose }: RecordDepositModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const [method, setMethod] = useState('Bank Transfer')
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const setting = useHotelSetting()
  const [currency, setCurrency] = useState<string | null>(null)
  const activeCurrency = currency ?? setting?.baseCurrency ?? 'THB'
  const isAlt = setting != null && activeCurrency === setting.altCurrency

  const depositsPaid = (res.charges ?? [])
    .filter((c) => c.category === 'DEPOSIT')
    .reduce((s, c) => s + Math.abs(c.amount), 0)

  async function handleConfirm() {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) { setError('Amount must be greater than 0'); return }
    setError('')
    setLoading(true)
    try {
      const r = await fetch(`/api/reservations/${res.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parsed,
          method,
          date,
          reference: reference.trim() || undefined,
          ...(isAlt && { currency: activeCurrency }),
        }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Failed to record deposit'); setLoading(false); return }
      onSaved(data)
      onClose()
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Record Deposit" subtitle={res.guestName} icon={Banknote} iconBg="bg-violet-600" onClose={onClose}>
      <div className="p-6 space-y-4">
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Reservation Total</span>
            <span className="font-bold text-slate-800">฿{res.totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Deposits Received</span>
            <span className="font-bold text-violet-700">฿{depositsPaid.toLocaleString()}</span>
          </div>
        </div>

        <FormField label="Method" required>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={selectCls}>
            {DEPOSIT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label={`Amount (${activeCurrency})`} required>
            <div className="flex gap-2">
              <input type="number" min={0} step={0.01} placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
              {setting && (
                <select
                  value={activeCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-24 flex-shrink-0 border border-gray-200 rounded-lg px-2 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value={setting.baseCurrency}>{setting.baseCurrency}</option>
                  <option value={setting.altCurrency}>{setting.altCurrency}</option>
                </select>
              )}
            </div>
          </FormField>
          <FormField label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </FormField>
        </div>

        {isAlt && setting && amount && parseFloat(amount) > 0 && (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            Converts to <span className="font-bold">{formatMoney(altToBase(parseFloat(amount), setting.fxRate), setting.baseCurrency)}</span> at house rate {setting.fxRate} {setting.baseCurrency}/{setting.altCurrency}
          </p>
        )}

        <FormField label="Reference (slip / transaction no.)">
          <input
            type="text"
            placeholder="e.g. KBZ-20260612-0142"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className={inputCls}
          />
        </FormField>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
      </div>
      <div className="px-6 pb-6 flex gap-3 border-t border-gray-100 pt-4">
        <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50">Cancel</button>
        <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
          {loading ? 'Saving...' : 'Record Deposit'}
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
