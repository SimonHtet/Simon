'use client'

import { useState } from 'react'
import { Reservation, ReservationStatus } from '@/types'
import { getResStatusBadge, getResStatusLabel, formatDate, formatCurrency } from '@/lib/utils'
import { Search, Plus, LogIn, LogOut, ChevronRight } from 'lucide-react'

interface Props {
  reservations: Reservation[]
  onSelectReservation: (res: Reservation) => void
  onCheckIn: (res: Reservation) => void
  onCheckOut: (res: Reservation) => void
  onNewReservation: () => void
}

const STATUS_TABS: { key: 'all' | ReservationStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'checked_in', label: 'In-House' },
  { key: 'confirmed', label: 'Arrivals' },
  { key: 'checked_out', label: 'Checked Out' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'no_show', label: 'No Show' },
]

function getNationalityFlag(nationality: string | null | undefined): string {
  if (!nationality) return ''
  const flags: Record<string, string> = {
    Thai: '🇹🇭',
    Chinese: '🇨🇳',
    Japanese: '🇯🇵',
    Korean: '🇰🇷',
    American: '🇺🇸',
    British: '🇬🇧',
    German: '🇩🇪',
    French: '🇫🇷',
    Australian: '🇦🇺',
    Russian: '🇷🇺',
    Indian: '🇮🇳',
    Singapore: '🇸🇬',
  }
  return flags[nationality] || ''
}

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
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search guest, room, reservation #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent w-72 bg-slate-50"
          />
        </div>
        <button
          onClick={onNewReservation}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-black transition-colors shadow-sm shadow-teal-600/20"
        >
          <Plus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Status tabs */}
      <div className="px-4 border-b border-slate-200 flex gap-1 overflow-x-auto bg-white">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-2.5 text-[10px] font-black whitespace-nowrap border-b-2 transition-colors uppercase tracking-wider ${
              activeTab === key
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {label}
            {counts[key] !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === key
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-slate-50/30">
        <table className="w-full text-sm">
          <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <tr>
              {['Res #', 'Guest', 'Room', 'Check In', 'Check Out', 'Rate', 'Status', 'Actions'].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((res) => (
              <tr
                key={res.id}
                onClick={() => onSelectReservation(res)}
                className="hover:bg-white cursor-pointer transition-colors group"
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-500 font-bold">
                  {res.reservationNumber}
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    {getNationalityFlag(res.nationality)} {res.guestName}
                    {res.vipStatus && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded uppercase tracking-wider">
                        {res.vipStatus}
                      </span>
                    )}
                  </p>
                  {res.nationality && (
                    <p className="text-xs text-slate-400 font-medium">{res.nationality}</p>
                  )}
                </td>
                <td className="px-4 py-3 font-black text-slate-800">{res.roomId}</td>
                <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                  {formatDate(res.checkIn)}
                </td>
                <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                  {formatDate(res.checkOut)}
                </td>
                <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                  ฿{formatCurrency(res.rate)}<span className="text-slate-400 font-medium text-xs">/n</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2.5 py-1 rounded text-[10px] font-black border uppercase tracking-wider ${getResStatusBadge(res.status)}`}
                  >
                    {getResStatusLabel(res.status)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {res.status === 'confirmed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCheckIn(res)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-lg transition-colors"
                      >
                        <LogIn className="w-3 h-3" /> Check In
                      </button>
                    )}
                    {res.status === 'checked_in' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onCheckOut(res)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg transition-colors"
                      >
                        <LogOut className="w-3 h-3" /> Check Out
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectReservation(res)
                      }}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="View Details"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-base font-bold">No reservations found</p>
            <p className="text-sm mt-1 font-medium">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
