'use client'

import { useState } from 'react'
import { Reservation, Guest } from '@/types'
import { getResStatusBadge, getResStatusLabel, formatDate } from '@/lib/utils'
import { Search, Star, User, Phone, Mail, Globe } from 'lucide-react'

interface Props {
  reservations: Reservation[]
  onSelectReservation?: (res: Reservation) => void
}

interface GuestSummary {
  guest: Guest
  reservations: Reservation[]
  totalStays: number
  totalSpend: number
  lastStay: string
}

function deriveGuests(reservations: Reservation[]): GuestSummary[] {
  const map = new Map<string, GuestSummary>()

  for (const res of reservations) {
    const guestId = res.guestId
    if (!map.has(guestId)) {
      map.set(guestId, {
        guest: res.guest || {
          id: guestId,
          name: res.guestName,
          nationality: res.nationality || null,
          vipStatus: res.vipStatus || null,
        } as Guest,
        reservations: [],
        totalStays: 0,
        totalSpend: 0,
        lastStay: '',
      })
    }
    const entry = map.get(guestId)!
    entry.reservations.push(res)
    if (res.status === 'checked_out' || res.status === 'checked_in') {
      entry.totalStays += 1
      entry.totalSpend += res.totalAmount
    }
    if (!entry.lastStay || res.checkIn > entry.lastStay) {
      entry.lastStay = res.checkIn
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalStays - a.totalStays)
}

export default function GuestHistoryView({ reservations, onSelectReservation }: Props) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const guests = deriveGuests(reservations)

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase()
    return (
      g.guest.name.toLowerCase().includes(q) ||
      (g.guest.email || '').toLowerCase().includes(q) ||
      (g.guest.nationality || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-6">
      {/* Search */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search guests by name, email, nationality..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      <div className="text-sm text-gray-500 mb-4">{filtered.length} guests</div>

      <div className="space-y-3">
        {filtered.map((entry) => {
          const g = entry.guest
          const isExpanded = expanded === g.id

          return (
            <div
              key={g.id}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-sky-200 transition-colors"
            >
              {/* Guest header */}
              <button
                className="w-full flex items-center gap-4 p-4 text-left"
                onClick={() => setExpanded(isExpanded ? null : g.id)}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {g.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{g.name}</span>
                    {g.vipStatus && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium border border-amber-200">
                        <Star className="w-3 h-3" />
                        {g.vipStatus}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {g.nationality && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {g.nationality}
                      </span>
                    )}
                    {g.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {g.email}
                      </span>
                    )}
                    {g.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {g.phone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">{entry.totalStays} stay{entry.totalStays !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-500">฿{entry.totalSpend.toLocaleString()}</p>
                </div>
              </button>

              {/* Expanded reservations */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Reservation History
                  </h4>
                  <div className="space-y-2">
                    {entry.reservations
                      .sort((a, b) => (b.checkIn > a.checkIn ? 1 : -1))
                      .map((res) => (
                        <button
                          key={res.id}
                          onClick={() => onSelectReservation?.(res)}
                          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-sky-300 hover:bg-sky-50 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {res.reservationNumber} · Room {res.roomId}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(res.checkIn)} → {formatDate(res.checkOut)} ({res.totalNights}N)
                            </p>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getResStatusBadge(res.status)}`}>
                            {getResStatusLabel(res.status)}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No guests found</p>
          </div>
        )}
      </div>
    </div>
  )
}
