'use client'

import { useState, useEffect } from 'react'
import { Reservation, Room, Charge, Trace, Company } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'
import { getResStatusBadge, getResStatusLabel, formatDate, formatCurrency } from '@/lib/utils'
import {
  X, LogIn, LogOut, Ban, AlertTriangle, ArrowRight, Clock, Plus,
  CreditCard, MessageSquare, Edit3, Check, ChevronDown, ChevronUp,
  BedDouble, User, Calendar, DollarSign, Tag, Phone, Mail, Globe,
  Plane, Eye, Star, Car, Package, Receipt, FileText, CheckCircle,
  Circle, Building2,
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
}

type Tab = 'overview' | 'charges' | 'traces' | 'packages'

const PACKAGE_DEFS = [
  { id: 'PARKING', label: 'Parking', icon: Car },
  { id: 'BREAKFAST', label: 'Breakfast', icon: Package },
  { id: 'AIRPORT', label: 'Airport Transfer', icon: Plane },
  { id: 'SPA', label: 'Spa Package', icon: Star },
]

function TabButton({ label, active, badge, onClick }: { label: string; active: boolean; badge?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${active ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'}`}>
          {badge}
        </span>
      )}
    </button>
  )
}

function InfoRow({ label, value, icon: Icon }: { label: string; value?: string | null; icon?: React.ElementType }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-sm">
      {Icon && <Icon className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div>
        <span className="text-gray-500">{label}: </span>
        <span className="text-gray-900 font-medium">{value}</span>
      </div>
    </div>
  )
}

function EditableField({
  label,
  value,
  type = 'text',
  onSave,
  placeholder,
}: {
  label: string
  value: string
  type?: string
  onSave: (v: string) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function save() {
    onSave(val)
    setEditing(false)
  }

  return (
    <div className="group">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type={type}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
            className="flex-1 border border-sky-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button onClick={save} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setVal(value); setEditing(false) }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-900 font-medium">{value || <span className="text-gray-400 italic">{placeholder || 'Not set'}</span>}</span>
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded transition-all"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
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
}: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [res] = useState(initialRes)
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'noshow' | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [companiesLoaded, setCompaniesLoaded] = useState(false)
  const [editingCompany, setEditingCompany] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialRes.companyId || '')

  async function loadCompanies() {
    if (companiesLoaded) return
    const data = await fetch('/api/companies').then((r) => r.json())
    setCompanies(data)
    setCompaniesLoaded(true)
  }

  async function saveCompany() {
    const company = companies.find((c) => c.id === selectedCompanyId)
    await onUpdateReservation(res.id, {
      companyId: selectedCompanyId || null,
      company: company?.name || '',
    } as any)
    setEditingCompany(false)
  }

  const totalCharges = res.charges.filter((c) => c.amount > 0).reduce((s, c) => s + c.amount, 0)
  const totalPayments = Math.abs(res.charges.filter((c) => c.amount < 0).reduce((s, c) => s + c.amount, 0))
  const balance = (totalCharges || res.totalAmount) - totalPayments
  const pendingTraces = res.traces.filter((t) => t.status === 'pending').length

  async function handleUpdate(field: string, value: any) {
    await onUpdateReservation(res.id, { [field]: value })
  }

  const roomType = ROOM_TYPES[res.roomTypeId]

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#0F2044] text-white px-6 py-5 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getResStatusBadge(res.status)}`}>
                {getResStatusLabel(res.status)}
              </span>
              {res.vipStatus && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs rounded-full">
                  <Star className="w-2.5 h-2.5" />
                  {res.vipStatus}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold">{res.guestName}</h2>
            <p className="text-sky-300 text-sm mt-0.5">{res.reservationNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors mt-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick info bar */}
        <div className="bg-[#0F2044]/5 border-b border-gray-200 px-6 py-3 flex flex-wrap gap-4 text-sm flex-shrink-0">
          <div className="flex items-center gap-1.5 text-gray-700">
            <BedDouble className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">Room {res.roomId}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-500">{roomType?.name ?? res.roomTypeId}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <span>{formatDate(res.checkIn)}</span>
            <span className="text-gray-400">→</span>
            <span>{formatDate(res.checkOut)}</span>
            <span className="text-gray-400">·</span>
            <span className="font-semibold">{res.totalNights}N</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-700">
            <DollarSign className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold">฿{formatCurrency(res.totalAmount)}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap gap-2 flex-shrink-0">
          {res.status === 'confirmed' && (
            <>
              <button
                onClick={() => onCheckIn(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Check In
              </button>
              <button
                onClick={() => onMoveRoom(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Move Room
              </button>
              <button
                onClick={() => setConfirmAction('cancel')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors border border-red-200"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={() => setConfirmAction('noshow')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold rounded-lg transition-colors border border-orange-200"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                No Show
              </button>
            </>
          )}
          {res.status === 'checked_in' && (
            <>
              <button
                onClick={() => onCheckOut(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Check Out
              </button>
              <button
                onClick={() => onMoveRoom(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Move Room
              </button>
              <button
                onClick={() => onExtendStay(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold rounded-lg transition-colors border border-teal-200"
              >
                <Clock className="w-3.5 h-3.5" />
                Extend Stay
              </button>
              <button
                onClick={() => onAddCharge(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold rounded-lg transition-colors border border-orange-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Charge
              </button>
              <button
                onClick={() => onPostPayment(res)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition-colors border border-green-200"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Payment
              </button>
            </>
          )}
          <button
            onClick={() => onAddTrace(res)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors border border-purple-200"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Add Trace
          </button>
        </div>

        {/* Cancel/NoShow confirmation */}
        {confirmAction && (
          <div className={`px-6 py-3 border-b flex-shrink-0 ${confirmAction === 'cancel' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-sm font-semibold mb-2 ${confirmAction === 'cancel' ? 'text-red-700' : 'text-orange-700'}`}>
              {confirmAction === 'cancel' ? 'Confirm Cancellation' : 'Confirm No Show'}
            </p>
            {confirmAction === 'cancel' && (
              <input
                type="text"
                placeholder="Cancellation reason (optional)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-red-200 rounded-lg px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirmAction === 'cancel') onCancel(res)
                  else onNoShow(res)
                  setConfirmAction(null)
                }}
                className={`flex-1 py-1.5 text-white text-xs font-semibold rounded-lg transition-colors ${
                  confirmAction === 'cancel' ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {confirmAction === 'cancel' ? 'Yes, Cancel' : 'Yes, No Show'}
              </button>
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-lg border transition-colors hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 flex px-6 overflow-x-auto flex-shrink-0 bg-white">
          <TabButton label="Overview" active={tab === 'overview'} onClick={() => setTab('overview')} />
          <TabButton label="Charges" active={tab === 'charges'} badge={res.charges.length} onClick={() => setTab('charges')} />
          <TabButton label="Traces" active={tab === 'traces'} badge={pendingTraces} onClick={() => setTab('traces')} />
          <TabButton label="Packages" active={tab === 'packages'} onClick={() => setTab('packages')} />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Guest Information */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  Guest Information
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <EditableField
                    label="Full Name"
                    value={res.guestName}
                    onSave={(v) => handleUpdate('guestName', v)}
                  />
                  <EditableField
                    label="Nationality"
                    value={res.nationality || ''}
                    onSave={(v) => handleUpdate('nationality', v)}
                    placeholder="Not provided"
                  />
                  <EditableField
                    label="Passport / ID"
                    value={res.passportNumber || ''}
                    onSave={(v) => handleUpdate('passportNumber', v)}
                    placeholder="Not provided"
                  />
                  <EditableField
                    label="VIP Status"
                    value={res.vipStatus || ''}
                    onSave={(v) => handleUpdate('vipStatus', v)}
                    placeholder="None"
                  />
                  <div className="group">
                    <p className="text-xs text-gray-500 mb-0.5">Company</p>
                    {editingCompany ? (
                      <div className="flex items-center gap-1">
                        <select
                          autoFocus
                          value={selectedCompanyId}
                          onChange={(e) => setSelectedCompanyId(e.target.value)}
                          className="flex-1 border border-sky-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
                        >
                          <option value="">None</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <button onClick={saveCompany} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => { setEditingCompany(false); setSelectedCompanyId(initialRes.companyId || '') }} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-gray-900 font-medium flex items-center gap-1">
                          {res.company
                            ? <><Building2 className="w-3.5 h-3.5 text-gray-400" />{res.company}</>
                            : <span className="text-gray-400 italic">None</span>}
                        </span>
                        <button
                          onClick={() => { loadCompanies(); setEditingCompany(true) }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-sky-500 hover:bg-sky-50 rounded transition-all"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Stay Details */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Stay Details
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Room</p>
                    <p className="text-sm font-semibold text-gray-900">Room {res.roomId}</p>
                    <p className="text-xs text-gray-500">{roomType?.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Occupancy</p>
                    <p className="text-sm font-semibold text-gray-900">{res.adults} Adult{res.adults !== 1 ? 's' : ''}{res.children > 0 ? `, ${res.children} Child${res.children !== 1 ? 'ren' : ''}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check In</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(res.checkIn)}</p>
                    {res.actualCheckIn && <p className="text-xs text-emerald-600">Actual: {new Date(res.actualCheckIn).toLocaleString()}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check Out</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(res.checkOut)}</p>
                    {res.actualCheckOut && <p className="text-xs text-amber-600">Actual: {new Date(res.actualCheckOut).toLocaleString()}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rate</p>
                    <p className="text-sm font-semibold text-gray-900">฿{formatCurrency(res.rate)}/night</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-semibold text-gray-900">฿{formatCurrency(res.totalAmount)}</p>
                    <p className="text-xs text-gray-500">{res.totalNights} nights</p>
                  </div>
                </div>
              </section>

              {/* Booking Info */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  Booking Information
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-4">
                  <EditableField
                    label="Source"
                    value={res.source || ''}
                    onSave={(v) => handleUpdate('source', v)}
                    placeholder="Not set"
                  />
                  <EditableField
                    label="Booking Ref"
                    value={res.bookingReference || ''}
                    onSave={(v) => handleUpdate('bookingReference', v)}
                    placeholder="None"
                  />
                  <EditableField
                    label="ETA"
                    value={res.eta || ''}
                    type="time"
                    onSave={(v) => handleUpdate('eta', v)}
                    placeholder="Not set"
                  />
                  <EditableField
                    label="Flight #"
                    value={res.flightNumber || ''}
                    onSave={(v) => handleUpdate('flightNumber', v)}
                    placeholder="None"
                  />
                  <div className="col-span-2">
                    <EditableField
                      label="Special Requests"
                      value={res.specials || ''}
                      onSave={(v) => handleUpdate('specials', v)}
                      placeholder="None"
                    />
                  </div>
                  <div className="col-span-2">
                    <EditableField
                      label="Visa Details"
                      value={res.visaDetails || ''}
                      onSave={(v) => handleUpdate('visaDetails', v)}
                      placeholder="None"
                    />
                  </div>
                </div>
              </section>

              {/* Housekeeping preferences */}
              <section>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BedDouble className="w-3.5 h-3.5" />
                  Housekeeping
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={res.turndown}
                      onChange={(e) => handleUpdate('turndown', e.target.checked)}
                      className="w-4 h-4 rounded accent-sky-500"
                    />
                    <span className="text-sm text-gray-700">Turndown Service</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={res.dnm}
                      onChange={(e) => handleUpdate('dnm', e.target.checked)}
                      className="w-4 h-4 rounded accent-red-500"
                    />
                    <span className="text-sm text-gray-700">Do Not Disturb</span>
                  </label>
                </div>
              </section>

              {/* Cancellation info */}
              {res.status === 'cancelled' && res.cancelledAt && (
                <section>
                  <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-3">Cancellation Details</h3>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                    <p><span className="text-gray-500">Cancelled: </span><span className="font-medium text-gray-900">{new Date(res.cancelledAt).toLocaleString()}</span></p>
                    {res.cancellationReason && <p className="mt-1"><span className="text-gray-500">Reason: </span><span className="font-medium text-gray-900">{res.cancellationReason}</span></p>}
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'charges' && (
            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Total Charges</p>
                  <p className="text-base font-bold text-gray-900">฿{formatCurrency(totalCharges || res.totalAmount)}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">Payments</p>
                  <p className="text-base font-bold text-green-700">฿{formatCurrency(totalPayments)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${balance > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className="text-xs text-gray-500 mb-1">Balance</p>
                  <p className={`text-base font-bold ${balance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                    ฿{formatCurrency(Math.abs(balance))}
                  </p>
                </div>
              </div>

              {/* Charges list */}
              {res.charges.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No charges posted yet</p>
                  {/* Default room charge */}
                  <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left">
                    <p className="text-xs text-gray-500 mb-2">Room Charge (from rate)</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">Room {res.roomId} × {res.totalNights}N @ ฿{formatCurrency(res.rate)}</span>
                      <span className="font-bold text-gray-900">฿{formatCurrency(res.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-semibold uppercase">Description</th>
                        <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-semibold uppercase">Category</th>
                        <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-semibold uppercase">Date</th>
                        <th className="px-4 py-2.5 text-right text-xs text-gray-500 font-semibold uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {res.charges.map((c) => (
                        <tr key={c.id} className={c.amount < 0 ? 'bg-green-50/50' : ''}>
                          <td className="px-4 py-2.5 text-gray-800">{c.item}</td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {c.category && (
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c.category}</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs">{c.date}</td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${c.amount < 0 ? 'text-green-700' : 'text-gray-900'}`}>
                            {c.amount < 0 ? '-' : ''}฿{formatCurrency(Math.abs(c.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => onAddCharge(res)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Charge
                </button>
                <button
                  onClick={() => onPostPayment(res)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-green-200 bg-green-50 hover:bg-green-100 text-green-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Post Payment
                </button>
              </div>
            </div>
          )}

          {tab === 'traces' && (
            <div className="p-6">
              {res.traces.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No traces added yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {res.traces.map((trace) => (
                    <div
                      key={trace.id}
                      className={`rounded-xl border p-4 ${
                        trace.status === 'resolved'
                          ? 'bg-gray-50 border-gray-200 opacity-70'
                          : 'bg-white border-purple-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              trace.status === 'resolved' ? 'bg-gray-400' : 'bg-purple-500'
                            }`} />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {trace.department}
                            </span>
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-400">{trace.date}</span>
                          </div>
                          <p className={`text-sm ${trace.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                            {trace.text}
                          </p>
                        </div>
                        {trace.status === 'pending' && (
                          <button
                            onClick={() => onResolveTrace(res.id, trace.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 text-xs font-semibold rounded-lg transition-colors border border-purple-200 flex-shrink-0"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Resolve
                          </button>
                        )}
                        {trace.status === 'resolved' && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => onAddTrace(res)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Trace
              </button>
            </div>
          )}

          {tab === 'packages' && (
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-500 mb-4">Manage add-on packages for this reservation.</p>
              {PACKAGE_DEFS.map((pkg) => {
                const existing = res.packages.find((p) => p.pkgId === pkg.id)
                const Icon = pkg.icon
                return (
                  <div
                    key={pkg.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-colors ${
                      existing?.active
                        ? 'bg-sky-50 border-sky-300'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${existing?.active ? 'bg-sky-100' : 'bg-gray-100'}`}>
                      <Icon className={`w-5 h-5 ${existing?.active ? 'text-sky-600' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{pkg.label}</p>
                      {existing?.active && pkg.id === 'PARKING' && (
                        <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                          {existing.licensePlate && <p>Plate: {existing.licensePlate}</p>}
                          {existing.carModel && <p>Vehicle: {existing.carModel}</p>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {existing?.active ? (
                        <span className="flex items-center gap-1 text-xs text-sky-600 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                          <Circle className="w-3.5 h-3.5" />
                          Not Active
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
