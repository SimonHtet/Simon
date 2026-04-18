'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Reservation, Room } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'
import {
  getResStatusBadge,
  getResStatusLabel,
  calculateNights,
  formatDate,
  formatCurrency,
} from '@/lib/utils'
import {
  X,
  Pencil,
  UserCheck,
  Sparkles,
  CalendarCheck,
  CreditCard,
  MessageSquare,
  Key,
  Car,
  Receipt,
  MapPin,
  Plus,
  AlertCircle,
  Settings,
  ClipboardList,
  History,
  Package,
  CheckCircle2,
  ArrowLeft,
  Save,
  Printer,
  FileText,
  Check,
  ArrowRightLeft,
  Grid3X3,
  Star,
} from 'lucide-react'

interface Props {
  reservation: Reservation
  rooms: Room[]
  onClose: () => void
  onCheckIn: (res: Reservation) => void
  onCheckOut: (res: Reservation) => void
  onCancel: (res: Reservation) => void
  onNoShow: (res: Reservation) => void
  onMoveRoom: (res: Reservation) => void
  onExtendStay: (res: Reservation) => void
  onAddCharge: (res: Reservation) => void
  onPostPayment: (res: Reservation) => void
  onAddTrace: (res: Reservation) => void
  onResolveTrace: (reservationId: string, traceId: number) => Promise<void>
  onUpdateReservation: (id: string, data: Partial<Reservation>) => Promise<void>
  initialCheckInMode?: boolean
}

const PACKAGE_DEFS = [
  { id: 'PARKING',   label: 'Parking (Car)',     Icon: Car },
  { id: 'BREAKFAST', label: 'Daily Breakfast',   Icon: Receipt },
  { id: 'AIRPORT',   label: 'Airport Transfer',  Icon: MapPin },
  { id: 'EXTRABED',  label: 'Extra Bed',         Icon: Plus },
  { id: 'LATE_CO',   label: 'Late Check-out',    Icon: CalendarCheck },
  { id: 'EARLY_CI',  label: 'Early Check-in',    Icon: CalendarCheck },
  { id: 'LAUNDRY',   label: 'Laundry Package',   Icon: Sparkles },
  { id: 'SPA',       label: 'Spa & Wellness',    Icon: UserCheck },
]

const PACKAGE_RATES: Record<string, { amount: number; perNight: boolean }> = {
  BREAKFAST: { amount: 150, perNight: true },
  PARKING:   { amount: 200, perNight: false },
  AIRPORT:   { amount: 500, perNight: false },
  EXTRABED:  { amount: 300, perNight: true },
  LATE_CO:   { amount: 500, perNight: false },
  EARLY_CI:  { amount: 500, perNight: false },
  LAUNDRY:   { amount: 200, perNight: true },
  SPA:       { amount: 0,   perNight: false },
}

export default function ReservationDetailPanel({
  reservation: initialRes,
  rooms,
  onClose,
  onCheckIn,
  onCheckOut,
  onCancel,
  onNoShow,
  onMoveRoom,
  onExtendStay,
  onAddCharge,
  onPostPayment,
  onAddTrace,
  onResolveTrace,
  onUpdateReservation,
  initialCheckInMode = false,
}: Props) {
  const [localRes, setLocalRes] = useState(initialRes)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [checkInMode, setCheckInMode] = useState(initialCheckInMode)
  const [activeTab, setActiveTab] = useState('charges')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [successState, setSuccessState] = useState(false)
  const [checkInTime, setCheckInTime] = useState<string | null>(null)
  const [verification, setVerification] = useState({
    idVerified: false,
    roomReady: false,
    rateConfirmed: false,
    paymentConfirmed: false,
    keysIssued: 0,
    specialRequests: false,
  })
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'noshow' | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [activePackages, setActivePackages] = useState<Set<string>>(
    () => new Set(initialRes.packages.filter((p) => p.active).map((p) => p.pkgId))
  )
  const [showPackageManager, setShowPackageManager] = useState(false)

  const room = rooms.find((r) => r.id === localRes.roomId)
  const roomTypeName = ROOM_TYPES[localRes.roomTypeId]?.name ?? localRes.roomTypeId
  const nights = calculateNights(localRes.checkIn, localRes.checkOut)

  const totalRoomAndCharges =
    localRes.rate * nights +
    localRes.charges.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0)
  const totalPayments = Math.abs(
    localRes.charges.filter((c) => c.amount < 0).reduce((s, c) => s + c.amount, 0)
  )
  const balance = totalRoomAndCharges - totalPayments

  const allVerified =
    verification.idVerified &&
    verification.roomReady &&
    verification.rateConfirmed &&
    verification.paymentConfirmed &&
    verification.keysIssued > 0 &&
    verification.specialRequests &&
    !!localRes.passportNumber

  useEffect(() => {
    setLocalRes(initialRes)
  }, [initialRes])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault()
        if (localRes.status === 'confirmed') {
          setCheckInMode(true)
          setEditingField('passportNumber')
        }
      } else if (e.key === 'F6') {
        e.preventDefault()
        if (localRes.status === 'checked_in') onCheckOut(localRes)
      } else if (e.key === 'F8') {
        e.preventDefault()
        if (localRes.status === 'checked_in') onMoveRoom(localRes)
      } else if (e.key === 'Escape') {
        if (confirmAction) setConfirmAction(null)
        else if (checkInMode) setCheckInMode(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [localRes, checkInMode, confirmAction, onClose, onCheckOut, onMoveRoom])

  function handleFieldSave(field: string, value: any) {
    const updated = { ...localRes, [field]: value }
    setLocalRes(updated)
    setEditingField(null)
    onUpdateReservation(localRes.id, { [field]: value })
  }

  function onConfirmCheckIn() {
    onCheckIn(localRes)
    setSuccessState(true)
    setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    setTimeout(() => {
      setSuccessState(false)
      setCheckInMode(false)
    }, 3000)
  }

  async function togglePackage(pkgId: string) {
    const isActive = activePackages.has(pkgId)
    if (isActive) {
      setActivePackages((prev) => { const s = new Set(prev); s.delete(pkgId); return s })
      return
    }
    // Toggle ON
    setActivePackages((prev) => new Set(Array.from(prev).concat(pkgId)))
    const rate = PACKAGE_RATES[pkgId]
    if (!rate || rate.amount === 0) return
    const chargeAmount = rate.perNight ? rate.amount * nights : rate.amount
    const today = new Date().toISOString().split('T')[0]
    const def = PACKAGE_DEFS.find((p) => p.id === pkgId)
    const chargeData = {
      item: def?.label ?? pkgId,
      amount: chargeAmount,
      date: today,
      category: pkgId,
    }
    setLocalRes((prev) => ({
      ...prev,
      charges: [...prev.charges, { id: Date.now(), ...chargeData }],
    }))
    await fetch(`/api/reservations/${localRes.id}/charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chargeData),
    })
  }

  function EditableField({
    label,
    value,
    field,
    type = 'text',
    className = '',
  }: {
    label: string
    value: string | null | undefined
    field: string
    type?: string
    className?: string
  }) {
    const isEditing = editingField === field
    return (
      <div
        className={`group relative p-1.5 border border-transparent hover:border-slate-200 rounded transition-all cursor-pointer ${className}`}
        onClick={() => !isEditing && setEditingField(field)}
      >
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">
          {label}
        </p>
        {isEditing ? (
          <input
            autoFocus
            type={type}
            className="w-full text-[13px] font-medium text-slate-800 bg-teal-50 outline-none border-b border-teal-500 py-0.5"
            value={(localRes as any)[field] || ''}
            onChange={(e) => setLocalRes((prev) => ({ ...prev, [field]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFieldSave(field, (localRes as any)[field])
              if (e.key === 'Escape') {
                setLocalRes(initialRes)
                setEditingField(null)
              }
            }}
            onBlur={() => handleFieldSave(field, (localRes as any)[field])}
          />
        ) : (
          <div className="flex items-center justify-between min-h-[1.25rem]">
            <p className="text-[13px] font-medium text-slate-800 truncate">{value || '---'}</p>
            <Pencil className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl h-[90vh] max-h-[900px] shadow-2xl rounded-xl overflow-hidden flex flex-col border border-slate-200"
      >
        {/* HEADER */}
        <div
          className={`h-14 border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-500 ${
            successState
              ? 'bg-emerald-600 border-emerald-700'
              : checkInMode
              ? 'bg-teal-600 border-teal-700'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-4">
            <h2
              className={`text-xl font-mono font-black tracking-tighter ${
                checkInMode || successState ? 'text-white' : 'text-slate-900'
              }`}
            >
              {successState
                ? `✓ CHECKED IN AT ${checkInTime}`
                : checkInMode
                ? 'CHECK-IN VERIFICATION'
                : localRes.reservationNumber}
            </h2>

            {checkInMode && !successState && (
              <div className="flex items-center gap-3 ml-4">
                {[
                  { step: 1, label: 'Verify ID' },
                  { step: 2, label: 'Confirm Stay' },
                  { step: 3, label: 'Issue Keys' },
                ].map((s, i) => {
                  const cur = !verification.idVerified
                    ? 1
                    : !verification.roomReady || !verification.rateConfirmed
                    ? 2
                    : 3
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          cur === s.step
                            ? 'bg-white text-teal-600'
                            : 'bg-teal-500/50 text-teal-100'
                        }`}
                      >
                        {s.step}
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          cur === s.step ? 'text-white' : 'text-teal-200'
                        }`}
                      >
                        {s.label}
                      </span>
                      {i < 2 && <div className="w-4 h-px bg-teal-500/50 mx-1" />}
                    </div>
                  )
                })}
              </div>
            )}

            {!checkInMode && !successState && (
              <>
                {localRes.traces.filter((t) => t.status === 'pending').length > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                      {localRes.traces.filter((t) => t.status === 'pending').length} Traces
                    </span>
                  </div>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${getResStatusBadge(localRes.status)}`}
                >
                  {getResStatusLabel(localRes.status)}
                </span>
                {localRes.vipStatus && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-400/30 text-amber-600 text-xs rounded">
                    <Star className="w-2.5 h-2.5" /> {localRes.vipStatus}
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flex items-center gap-6">
            {localRes.createdAt && (
              <div className="text-right space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Created</p>
                <p className="text-[11px] font-medium text-slate-600">
                  {new Date(localRes.createdAt).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors ml-2 ${
                checkInMode || successState ? 'hover:bg-white/10' : 'hover:bg-slate-200'
              }`}
            >
              <X
                className={`w-5 h-5 ${
                  checkInMode || successState ? 'text-white' : 'text-slate-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* BODY: 40/60 SPLIT */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT: GUEST INFO */}
          <div className="w-[40%] border-r border-slate-200 p-6 bg-white overflow-y-auto overscroll-contain">
            <div className="mb-6 flex justify-between items-start">
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Guest Name
                </p>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                  {localRes.guestName}
                </h1>
              </div>
              {checkInMode && (
                <div className="text-right">
                  <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mb-1">
                    Check-in Time
                  </p>
                  <p className="text-lg font-mono font-bold text-teal-700 leading-none">
                    {currentTime.toLocaleTimeString([], { hour12: false })}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <EditableField
                label="Last Name"
                value={localRes.guest?.lastName || localRes.guestName.split(' ').slice(1).join(' ')}
                field="lastName"
              />
              <EditableField
                label="First Name"
                value={localRes.guest?.firstName || localRes.guestName.split(' ')[0]}
                field="firstName"
              />
              <EditableField
                label="Phone Number"
                value={localRes.guest?.phone || ''}
                field="phone"
              />
              <EditableField label="Company" value={localRes.company} field="company" />
              <EditableField label="Nationality" value={localRes.nationality} field="nationality" />
              <EditableField label="Language" value="English" field="language" />

              {/* Passport — highlighted in check-in mode */}
              <div
                className={`col-span-2 transition-all duration-300 ${
                  checkInMode
                    ? 'ring-2 ring-teal-500 ring-offset-4 rounded-lg p-1 bg-teal-50/30'
                    : ''
                }`}
              >
                <div className="relative">
                  <EditableField
                    label="Passport / ID"
                    value={localRes.passportNumber}
                    field="passportNumber"
                    className={
                      checkInMode && !localRes.passportNumber ? 'border border-rose-400 bg-rose-50' : ''
                    }
                  />
                  {checkInMode && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded uppercase tracking-widest shadow-sm z-10">
                      Verify
                    </div>
                  )}
                  {checkInMode && !localRes.passportNumber && (
                    <p className="text-[8px] font-bold text-rose-600 mt-1 pl-1">
                      Required for check-in
                    </p>
                  )}
                </div>
              </div>

              <EditableField
                label="VIP Status"
                value={localRes.vipStatus}
                field="vipStatus"
                className={localRes.vipStatus ? 'bg-indigo-50/50' : ''}
              />
              <EditableField label="Member No." value={''} field="memberNo" />
              <EditableField
                label="Email"
                value={localRes.guest?.email || ''}
                field="email"
              />
              <EditableField
                label="Booking Source"
                value={localRes.source}
                field="source"
              />
            </div>

            {/* STAY SUMMARY */}
            <div className="mt-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Stay Summary
                  </p>
                  {localRes.source && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider bg-slate-100 text-slate-600 border-slate-200">
                      {localRes.source}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                      Check-In
                    </p>
                    <p className="text-xs font-bold text-slate-700">{formatDate(localRes.checkIn)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                      Check-Out
                    </p>
                    <p className="text-xs font-bold text-slate-700">{formatDate(localRes.checkOut)}</p>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                      Total Stay
                    </p>
                    <p className="text-sm font-black text-slate-900">{nights} Nights</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">
                      Total Amount
                    </p>
                    <p className="text-2xl font-mono font-black leading-none text-slate-900">
                      ฿{formatCurrency(localRes.totalAmount)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: STAY / CHECK-IN ZONE */}
          <div className="w-[60%] overflow-y-auto overscroll-contain bg-slate-50/30">
            <div className="p-6 pb-0">
              <AnimatePresence mode="wait">
                {checkInMode ? (
                  <motion.div
                    key="checklist"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          Verification Checklist
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Step 2 of 3</p>
                      </div>
                      <div className="p-1">
                        {[
                          {
                            id: 'idVerified',
                            label: 'Guest ID verified (passport/national ID)',
                            Icon: UserCheck,
                          },
                          {
                            id: 'roomReady',
                            label: 'Room is ready and clean',
                            Icon: Sparkles,
                          },
                          {
                            id: 'rateConfirmed',
                            label: 'Rate and dates confirmed with guest',
                            Icon: CalendarCheck,
                          },
                          {
                            id: 'paymentConfirmed',
                            label: 'Payment method confirmed',
                            Icon: CreditCard,
                          },
                          {
                            id: 'specialRequests',
                            label: `Special requests noted: "${localRes.specials || 'None'}"`,
                            Icon: MessageSquare,
                          },
                        ].map((item) => {
                          const checked = (verification as any)[item.id]
                          return (
                            <label
                              key={item.id}
                              className={`flex items-center gap-3 px-4 h-9 rounded-lg cursor-pointer transition-all ${
                                checked ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setVerification((prev) => ({
                                    ...prev,
                                    [item.id]: !checked,
                                  }))
                                }
                                className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <item.Icon
                                className={`w-3.5 h-3.5 ${
                                  checked ? 'text-emerald-600' : 'text-slate-400'
                                }`}
                              />
                              <span
                                className={`text-[11px] font-medium flex-1 ${
                                  checked ? 'text-emerald-600' : 'text-slate-600'
                                }`}
                              >
                                {item.label}
                              </span>
                              {checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                            </label>
                          )
                        })}

                        {/* Keys Issued */}
                        <div className="flex items-center h-9 px-3 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex items-center gap-2 flex-1">
                            <Key className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              Keys Issued
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3].map((num) => (
                              <button
                                key={num}
                                onClick={() =>
                                  setVerification((prev) => ({ ...prev, keysIssued: num }))
                                }
                                className={`w-7 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${
                                  verification.keysIssued === num
                                    ? 'bg-teal-600 text-white shadow-sm'
                                    : 'bg-white border border-slate-200 text-slate-400 hover:border-teal-300 hover:text-teal-600'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="fields"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="grid grid-cols-3 gap-x-4 gap-y-3"
                  >
                    <EditableField
                      label="Arrival Date"
                      value={formatDate(localRes.checkIn)}
                      field="checkIn"
                    />
                    <EditableField
                      label="Departure Date"
                      value={formatDate(localRes.checkOut)}
                      field="checkOut"
                    />
                    <div className="p-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Nights
                      </p>
                      <p className="text-[13px] font-medium text-slate-800">{nights}</p>
                    </div>

                    <EditableField label="Room Number" value={localRes.roomId} field="roomId" />
                    <div className="p-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Room Type
                      </p>
                      <p className="text-[13px] font-medium text-slate-800">{roomTypeName}</p>
                    </div>
                    <div className="p-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Floor
                      </p>
                      <p className="text-[13px] font-medium text-slate-800">{room?.floor ?? '—'}</p>
                    </div>

                    <div className="p-1.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Daily Rate
                      </p>
                      <p className="text-[13px] font-medium text-slate-800">
                        ฿{formatCurrency(localRes.rate)}
                      </p>
                    </div>
                    <EditableField
                      label="Adults"
                      value={String(localRes.adults)}
                      field="adults"
                    />
                    <EditableField
                      label="Children"
                      value={String(localRes.children)}
                      field="children"
                    />

                    <EditableField label="Source" value={localRes.source || ''} field="source" />
                    <EditableField
                      label="Booking Ref"
                      value={localRes.bookingReference || ''}
                      field="bookingReference"
                    />
                    <EditableField
                      label="ETA"
                      value={localRes.eta || ''}
                      field="eta"
                      type="time"
                    />

                    <div className="flex items-center gap-4 p-1.5 col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localRes.turndown}
                          onChange={(e) => handleFieldSave('turndown', e.target.checked)}
                          className="w-3.5 h-3.5 accent-teal-500"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Turndown
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={localRes.dnm}
                          onChange={(e) => handleFieldSave('dnm', e.target.checked)}
                          className="w-3.5 h-3.5 accent-teal-500"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase">
                          Do Not Disturb
                        </span>
                      </label>
                    </div>
                    <EditableField
                      label="Special Requests"
                      value={localRes.specials || ''}
                      field="specials"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* PACKAGES */}
              <div className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Packages &amp; Add-ons
                  </p>
                  <button
                    onClick={() => setShowPackageManager((v) => !v)}
                    className="text-[9px] font-black text-teal-600 uppercase tracking-wider hover:text-teal-700 transition-colors flex items-center gap-1"
                  >
                    {showPackageManager ? (
                      <><X className="w-3 h-3" /> Close</>
                    ) : (
                      'Manage'
                    )}
                  </button>
                </div>

                {showPackageManager ? (
                  /* EXPANDED MANAGER */
                  <div className="p-3 bg-white space-y-1.5">
                    {PACKAGE_DEFS.map(({ id, label, Icon }) => {
                      const active = activePackages.has(id)
                      const rate = PACKAGE_RATES[id]
                      const priceLabel = !rate
                        ? ''
                        : rate.amount === 0
                        ? 'Manual charge'
                        : rate.perNight
                        ? `฿${rate.amount} / night`
                        : `฿${rate.amount} / stay`
                      return (
                        <div
                          key={id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                            active
                              ? 'bg-teal-50 border-teal-300'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-[11px] font-black ${active ? 'text-teal-800' : 'text-slate-700'}`}>
                              {label}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {priceLabel}
                            </p>
                          </div>
                          <button
                            onClick={() => togglePackage(id)}
                            className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-all ${
                              active
                                ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-400 hover:border-teal-300 hover:text-teal-600'
                            }`}
                          >
                            {active ? 'On' : 'Off'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* COMPACT SUMMARY GRID */
                  <div className="p-3 bg-white grid grid-cols-2 gap-2">
                    {PACKAGE_DEFS.map(({ id, label, Icon }) => {
                      const active = activePackages.has(id)
                      const rate = PACKAGE_RATES[id]
                      const badgeText = !rate
                        ? ''
                        : rate.amount === 0
                        ? 'Manual'
                        : rate.perNight
                        ? `฿${rate.amount}/night`
                        : `฿${rate.amount}/stay`
                      return (
                        <button
                          key={id}
                          onClick={() => togglePackage(id)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all ${
                            active
                              ? 'bg-teal-50 border-teal-400 text-teal-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${active ? 'text-teal-600' : 'text-slate-400'}`} />
                            <span className="text-[10px] font-bold">{label}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`text-[9px] font-bold ${active ? 'text-teal-500' : 'text-slate-300'}`}>
                              {badgeText}
                            </span>
                            {active && <CheckCircle2 className="w-3 h-3 text-teal-500 ml-0.5" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* TABS */}
            <div className="mt-6 px-6 pb-6">
              <div className="flex border-b border-slate-200 mb-4">
                {[
                  { id: 'charges', label: 'Charges', Icon: Receipt },
                  { id: 'traces', label: 'Traces', Icon: AlertCircle },
                  { id: 'preferences', label: 'Preferences', Icon: Settings },
                  { id: 'notes', label: 'Notes', Icon: ClipboardList },
                  { id: 'history', label: 'History', Icon: History },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all relative ${
                      activeTab === tab.id ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <tab.Icon className="w-3.5 h-3.5" /> {tab.label}
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 min-h-[200px]">
                {/* CHARGES TAB */}
                {activeTab === 'charges' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Current Folio
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onPostPayment(localRes)}
                          className="flex items-center gap-1.5 px-2 py-1 bg-teal-600 text-white rounded text-[10px] font-black uppercase hover:bg-teal-700 transition-all shadow-sm"
                        >
                          <CreditCard className="w-3 h-3" /> Post Payment
                        </button>
                        <button
                          onClick={() => onAddCharge(localRes)}
                          className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                        >
                          <Plus className="w-3 h-3" /> Add Charge
                        </button>
                      </div>
                    </div>
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200">
                          {['Date', 'Description', 'Qty', 'Amount'].map((h) => (
                            <th
                              key={h}
                              className={`py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest ${
                                h === 'Amount' ? 'text-right' : h === 'Qty' ? 'text-center' : ''
                              }`}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="text-[11px]">
                        <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="py-1.5 text-slate-500 font-medium">
                            {formatDate(localRes.checkIn)}
                          </td>
                          <td className="py-1.5 font-black text-slate-700">
                            Room Charge — {roomTypeName}
                          </td>
                          <td className="py-1.5 text-center font-bold">1</td>
                          <td className="py-1.5 text-right font-black text-slate-900">
                            ฿{formatCurrency(localRes.rate * nights)}
                          </td>
                        </tr>
                        {localRes.charges.map((c) => (
                          <tr
                            key={c.id}
                            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                          >
                            <td className="py-1.5 text-slate-500 font-medium">{c.date}</td>
                            <td className="py-1.5 font-black text-slate-700">{c.item}</td>
                            <td className="py-1.5 text-center font-bold">1</td>
                            <td
                              className={`py-1.5 text-right font-black ${
                                c.amount < 0 ? 'text-teal-600' : 'text-slate-900'
                              }`}
                            >
                              {c.amount < 0
                                ? `(฿${formatCurrency(Math.abs(c.amount))})`
                                : `฿${formatCurrency(c.amount)}`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="pt-4 flex justify-end">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Total Charges
                          </p>
                          <p className="text-sm font-bold text-slate-600">
                            ฿{formatCurrency(totalRoomAndCharges)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Total Payments
                          </p>
                          <p className="text-sm font-bold text-teal-600">
                            ฿{formatCurrency(totalPayments)}
                          </p>
                        </div>
                        <div className="col-span-2 border-t border-slate-200 pt-2 text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Balance Due
                          </p>
                          <p
                            className={`text-2xl font-black ${
                              balance > 0 ? 'text-rose-600' : 'text-teal-600'
                            }`}
                          >
                            ฿{formatCurrency(balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TRACES TAB */}
                {activeTab === 'traces' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Inter-departmental Traces
                      </p>
                      <button
                        onClick={() => onAddTrace(localRes)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase hover:bg-amber-100 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> New Trace
                      </button>
                    </div>
                    <div className="space-y-3">
                      {localRes.traces.length > 0 ? (
                        localRes.traces.map((trace) => (
                          <div
                            key={trace.id}
                            className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-4 hover:bg-amber-100/50 transition-colors"
                          >
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                            <div className="flex-1">
                              <p
                                className={`text-sm font-bold text-slate-800 leading-relaxed ${
                                  trace.status === 'resolved'
                                    ? 'line-through text-slate-400'
                                    : ''
                                }`}
                              >
                                {trace.text}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-wider">
                                {trace.date} · {trace.department} · {trace.status}
                              </p>
                            </div>
                            {trace.status === 'pending' && (
                              <button
                                onClick={() => onResolveTrace(localRes.id, trace.id)}
                                className="px-3 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-black text-amber-600 uppercase hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                          No active traces for this reservation
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PREFERENCES TAB */}
                {activeTab === 'preferences' && (
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Smoking', val: 'Non-Smoking' },
                      { label: 'Bed Type', val: 'King' },
                      { label: 'Pillow', val: 'Feather' },
                      { label: 'Floor', val: 'High Floor' },
                      { label: 'View', val: 'River View' },
                      { label: 'Temp', val: '22°C' },
                      { label: 'Allergies', val: 'None' },
                    ].map((pref, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all"
                      >
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                          {pref.label}
                        </p>
                        <p className="text-sm font-black text-slate-700">{pref.val}</p>
                      </div>
                    ))}
                    <div className="col-span-4 mt-4">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                        Special Requests
                      </p>
                      <textarea
                        className="w-full p-4 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                        rows={3}
                        defaultValue={localRes.specials || ''}
                        onBlur={(e) => handleFieldSave('specials', e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                    No notes yet
                  </div>
                )}

                {/* HISTORY TAB */}
                {activeTab === 'history' && (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">
                    No previous stays on record
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CANCEL CONFIRM BAR */}
        {confirmAction && (
          <div
            className={`px-6 py-3 border-t shrink-0 ${
              confirmAction === 'cancel'
                ? 'bg-red-50 border-red-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <p
              className={`text-sm font-semibold mb-2 ${
                confirmAction === 'cancel' ? 'text-red-700' : 'text-orange-700'
              }`}
            >
              {confirmAction === 'cancel' ? 'Confirm Cancellation?' : 'Mark as No Show?'}
            </p>
            {confirmAction === 'cancel' && (
              <input
                type="text"
                placeholder="Cancellation reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-red-200 rounded-lg px-3 py-1.5 text-sm mb-2 focus:outline-none"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirmAction === 'cancel') onCancel(localRes)
                  else onNoShow(localRes)
                  setConfirmAction(null)
                  onClose()
                }}
                className={`flex-1 py-1.5 text-white text-xs font-semibold rounded-lg ${
                  confirmAction === 'cancel'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* ACTION BAR */}
        <div className="h-16 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
          {checkInMode ? (
            <>
              <button
                onClick={() => setCheckInMode(false)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Reservation
              </button>
              <div className="flex items-center gap-4">
                {!allVerified && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    All items must be verified
                  </p>
                )}
                <button
                  disabled={!allVerified || successState}
                  onClick={onConfirmCheckIn}
                  className={`flex items-center gap-3 px-8 py-2.5 font-black rounded-lg transition-all shadow-lg ${
                    allVerified
                      ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20 active:scale-95'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Confirm Check-In
                  <span className="opacity-50 text-[10px] font-bold">Enter ↵</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <Printer className="w-4 h-4" /> Print Folio
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <FileText className="w-4 h-4" /> Reg Card
                </button>
              </div>

              <div className="flex items-center gap-3">
                {localRes.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => {
                        setCheckInMode(true)
                        setEditingField('passportNumber')
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
                    >
                      Check In{' '}
                      <span className="text-[10px] opacity-60 font-mono bg-white/20 px-1 rounded">
                        F5
                      </span>
                    </button>
                    <button
                      onClick={() => setConfirmAction('cancel')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-lg hover:bg-rose-50 transition-all"
                    >
                      Cancel <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onNoShow(localRes)
                        onClose()
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 transition-all"
                    >
                      No Show
                    </button>
                  </>
                )}
                {localRes.status === 'checked_in' && (
                  <>
                    <button
                      onClick={() => onCheckOut(localRes)}
                      className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    >
                      Check Out{' '}
                      <span className="text-[10px] opacity-60 font-mono bg-white/20 px-1 rounded">
                        F6
                      </span>
                    </button>
                    <button
                      onClick={() => onMoveRoom(localRes)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-all"
                    >
                      Move Room{' '}
                      <span className="text-[10px] opacity-60 font-mono bg-indigo-100 px-1 rounded">
                        F8
                      </span>
                    </button>
                    <button
                      onClick={() => onExtendStay(localRes)}
                      className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 transition-all"
                    >
                      Extend Stay
                    </button>
                  </>
                )}
                {(localRes.status === 'checked_out' ||
                  localRes.status === 'cancelled' ||
                  localRes.status === 'no_show') && (
                  <button
                    disabled
                    className="px-6 py-2 bg-slate-200 text-slate-400 font-bold rounded-lg cursor-not-allowed"
                  >
                    {getResStatusLabel(localRes.status)}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
