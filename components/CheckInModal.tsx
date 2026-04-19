'use client'

import { useState } from 'react'
import { Reservation } from '@/types'
import { formatDate } from '@/lib/utils'
import { X, LogIn, BedDouble, User, Calendar, Plane, Clock } from 'lucide-react'

interface Props {
  reservation: Reservation
  onConfirm: (data: { eta?: string; flightNumber?: string }) => void
  onClose: () => void
}

export default function CheckInModal({ reservation: res, onConfirm, onClose }: Props) {
  const [eta, setEta] = useState(res.eta || '')
  const [flightNumber, setFlightNumber] = useState(res.flightNumber || '')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm({ eta: eta || undefined, flightNumber: flightNumber || undefined })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <LogIn className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Confirm Check-In</h2>
              <p className="text-xs text-gray-500">{res.reservationNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Guest info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Guest</p>
                <p className="font-semibold text-gray-900">{res.guestName}</p>
                {res.nationality && (
                  <p className="text-xs text-gray-500">{res.nationality}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <BedDouble className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Room</p>
                <p className="font-semibold text-gray-900">Room {res.roomId}</p>
                <p className="text-xs text-gray-500">{res.roomTypeId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Stay</p>
                <p className="font-semibold text-gray-900">
                  {formatDate(res.checkIn)} → {formatDate(res.checkOut)}
                </p>
                <p className="text-xs text-gray-500">{res.totalNights} nights · {res.adults} adult{res.adults !== 1 ? 's' : ''}</p>
              </div>
            </div>
          </div>

          {/* ETA */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              <Clock className="w-3 h-3 inline mr-1" />
              ETA (Estimated Time of Arrival)
            </label>
            <input
              type="time"
              value={eta}
              onChange={(e) => setEta(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Flight number */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              <Plane className="w-3 h-3 inline mr-1" />
              Flight Number
            </label>
            <input
              type="text"
              placeholder="e.g. TG316"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Specials */}
          {res.specials && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Special Requests</p>
              <p className="text-sm text-amber-800">{res.specials}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? 'Checking in...' : 'Confirm Check-In'}
          </button>
        </div>
      </div>
    </div>
  )
}
