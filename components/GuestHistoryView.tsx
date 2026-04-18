'use client'

import { useState } from 'react'
import { Reservation, Guest } from '@/types'
import { getResStatusBadge, getResStatusLabel, formatDate } from '@/lib/utils'
import { Search, Star, User, Phone, Mail, Globe, ChevronDown, ChevronUp } from 'lucide-react'

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

function mostCommon(values: (string | null | undefined)[]): string | null {
  const counts: Record<string, number> = {}
  for (const v of values) {
    if (v) counts[v] = (counts[v] ?? 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted[0]?.[0] ?? null
}

function GuestProfileSection({
  entry,
}: {
  entry: GuestSummary
}) {
  const g = entry.guest
  const [prefNotes, setPrefNotes] = useState(g.preferenceNotes ?? '')
  const [saving, setSaving] = useState(false)

  // Aggregate preferences from all stays
  const allPrefs = entry.reservations.map((r) => r.preferences)
  const aggPref = {
    smoking: mostCommon(allPrefs.map((p) => p?.smoking)),
    bed: mostCommon(allPrefs.map((p) => p?.bed)),
    pillow: mostCommon(allPrefs.map((p) => p?.pillow)),
    floor: mostCommon(allPrefs.map((p) => p?.floor)),
    view: mostCommon(allPrefs.map((p) => p?.view)),
    temperature: mostCommon(allPrefs.map((p) => p?.temperature)),
    allergies: mostCommon(allPrefs.map((p) => p?.allergies)),
  }

  const hasAnyPref = Object.values(aggPref).some(Boolean)

  // Unique non-empty specials across stays
  const uniqueSpecials = Array.from(
    new Set(
      entry.reservations
        .map((r) => r.specials?.trim())
        .filter((s): s is string => !!s)
    )
  )

  async function savePrefNotes() {
    setSaving(true)
    await fetch(`/api/guests/${g.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferenceNotes: prefNotes }),
    })
    setSaving(false)
  }

  return (
    <div className="mb-4 p-4 bg-white border border-slate-200 rounded-xl space-y-4">
      <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest">
        Guest Profile
      </p>

      {/* Aggregated preferences */}
      {hasAnyPref && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
            Typical Preferences (from past stays)
          </p>
          <div className="grid grid-cols-4 gap-2">
            {([
              { key: 'smoking', label: 'Smoking' },
              { key: 'bed', label: 'Bed' },
              { key: 'pillow', label: 'Pillow' },
              { key: 'floor', label: 'Floor' },
              { key: 'view', label: 'View' },
              { key: 'temperature', label: 'Temp' },
              { key: 'allergies', label: 'Allergies' },
            ] as { key: keyof typeof aggPref; label: string }[])
              .filter(({ key }) => aggPref[key])
              .map(({ key, label }) => (
                <div key={key} className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    {label}
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">{aggPref[key]}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Preference notes (editable) */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
          Staff Notes
        </p>
        <textarea
          className="w-full p-3 text-sm text-slate-700 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none placeholder:text-slate-300"
          rows={2}
          placeholder="e.g. Always requests high floor, allergic to feather pillows, prefers quiet rooms..."
          value={prefNotes}
          onChange={(e) => setPrefNotes(e.target.value)}
          onBlur={savePrefNotes}
        />
        {saving && (
          <p className="text-[9px] text-teal-500 font-bold mt-0.5">Saving…</p>
        )}
      </div>

      {/* Unique specials from past stays */}
      {uniqueSpecials.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2">
            Typical Special Requests
          </p>
          <div className="space-y-1">
            {uniqueSpecials.map((s, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg"
              >
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <p className="text-xs text-slate-600">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
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
          className="w-full max-w-md pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
              className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-teal-200 transition-colors"
            >
              {/* Guest header */}
              <button
                className="w-full flex items-center gap-4 p-4 text-left"
                onClick={() => setExpanded(isExpanded ? null : g.id)}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white font-black text-sm">
                  {g.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900">{g.name}</span>
                    {g.vipStatus && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-black border border-amber-200">
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

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">
                      {entry.totalStays} stay{entry.totalStays !== 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-gray-500">฿{entry.totalSpend.toLocaleString()}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  {/* Guest Profile */}
                  <GuestProfileSection entry={entry} />

                  {/* Reservation History */}
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Reservation History
                  </h4>
                  <div className="space-y-2">
                    {entry.reservations
                      .sort((a, b) => (b.checkIn > a.checkIn ? 1 : -1))
                      .map((res) => (
                        <button
                          key={res.id}
                          onClick={() => onSelectReservation?.(res)}
                          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-bold text-gray-800">
                              {res.reservationNumber} · Room {res.roomId}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(res.checkIn)} → {formatDate(res.checkOut)} ({res.totalNights}N)
                            </p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-black ${getResStatusBadge(res.status)}`}
                          >
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
