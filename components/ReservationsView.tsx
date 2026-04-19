'use client'

import { useState } from 'react'
import { Reservation, ReservationStatus } from '@/types'
import { getResStatusBadge, getResStatusLabel, formatDate, formatCurrency } from '@/lib/utils'
import { Search, Plus, LogIn, LogOut, Eye } from 'lucide-react'

interface Props {
  reservations: Reservation[]
  onSelectReservation: (res: Reservation) => void
  onCheckIn: (res: Reservation) => void
  onCheckOut: (res: Reservation) => void
  onNewReservation: () => void
}

const STATUS_TABS: { key: 'all' | ReservationStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'checked_in', label: 'In House' },
  { key: 'checked_out', label: 'Checked Out' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'no_show', label: 'No Show' },
]

export default function ReservationsView({
  reservations,
  onSelectReservation,
  onCheckIn,
  onCheckOut,
  onNewReservation,
}: Props) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | ReservationStatus>('all')

  const filtered = reservations.filter((r) => {
    const matchesStatus = activeTab === 'all' || r.status === activeTab
    const q = search.toLowerCase()
    const matchesSearch =
      !q ||
      r.guestName.toLowerCase().includes(q) ||
      r.reservationNumber.toLowerCase().includes(q) ||
      r.roomId.toLowerCase().includes(q) ||
      (r.nationality || '').toLowerCase().includes(q)
    return matchesStatus && matchesSearch
  })

  const counts: Record<string, number> = { all: reservations.length }
  for (const r of reservations) {
    counts[r.status] = (counts[r.status] || 0) + 1
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search guest, room, reservation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent w-72"
          />
        </div>
        <button
          onClick={onNewReservation}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Status tabs */}
      <div className="px-4 border-b border-gray-200 flex gap-1 overflow-x-auto">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === key
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            {counts[key] !== undefined && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === key ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {['Res #', 'Guest', 'Room', 'Check In', 'Check Out', 'Nights', 'Amount', 'Status', 'Actions'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((res) => (
              <tr
                key={res.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  {res.reservationNumber}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{res.guestName}</p>
                  {res.vipStatus && (
                    <p className="text-xs text-amber-600">{res.vipStatus}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-gray-800">{res.roomId}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(res.checkIn)}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(res.checkOut)}</td>
                <td className="px-4 py-3 text-gray-600 text-center">{res.totalNights}</td>
                <td className="px-4 py-3 text-gray-900 font-medium whitespace-nowrap">
                  ฿{formatCurrency(res.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getResStatusBadge(res.status)}`}>
                    {getResStatusLabel(res.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {res.status === 'confirmed' && (
                      <button
                        onClick={() => onCheckIn(res)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                        title="Check In"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {res.status === 'checked_in' && (
                      <button
                        onClick={() => onCheckOut(res)}
                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 transition-colors"
                        title="Check Out"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onSelectReservation(res)}
                      className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-base">No reservations found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
