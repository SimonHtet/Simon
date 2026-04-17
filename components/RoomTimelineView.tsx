'use client'

import { Room, Reservation } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'

interface Props {
  rooms: Room[]
  reservations: Reservation[]
  onSelectReservation?: (res: Reservation) => void
}

function getDays(count: number, offset: number): Date[] {
  const days: Date[] = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = offset; i < offset + count; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    days.push(d)
  }
  return days
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getResStatusColor(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-sky-400 text-white'
    case 'checked_in':
      return 'bg-emerald-500 text-white'
    case 'checked_out':
      return 'bg-gray-400 text-white'
    case 'cancelled':
      return 'bg-red-400 text-white'
    case 'no_show':
      return 'bg-orange-400 text-white'
    default:
      return 'bg-gray-300 text-gray-700'
  }
}

const DAY_BACK = 3
const DAY_FORWARD = 11
const TOTAL_DAYS = DAY_BACK + DAY_FORWARD
const CELL_WIDTH = 52 // px

export default function RoomTimelineView({ rooms, reservations, onSelectReservation }: Props) {
  const days = getDays(TOTAL_DAYS, -DAY_BACK)
  const today = toDateStr(new Date())
  const todayIndex = DAY_BACK

  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor
    return a.id.localeCompare(b.id)
  })

  // Map each reservation to its timeline span within our visible window
  function getSpan(res: Reservation) {
    const startStr = res.checkIn > toDateStr(days[0]) ? res.checkIn : toDateStr(days[0])
    const endStr = res.checkOut < toDateStr(days[days.length - 1]) ? res.checkOut : toDateStr(days[days.length - 1])
    const startIdx = days.findIndex((d) => toDateStr(d) === startStr)
    const endIdx = days.findIndex((d) => toDateStr(d) === endStr)
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null
    return { startIdx, endIdx, span: endIdx - startIdx }
  }

  const ROW_HEIGHT = 44

  return (
    <div className="p-6">
      <div className="overflow-x-auto">
        <div style={{ minWidth: 200 + CELL_WIDTH * TOTAL_DAYS }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
            {/* Room label column */}
            <div className="flex-shrink-0 w-[140px] px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200">
              Room
            </div>
            {/* Day columns */}
            {days.map((day, idx) => {
              const isToday = toDateStr(day) === today
              return (
                <div
                  key={idx}
                  style={{ width: CELL_WIDTH }}
                  className={`flex-shrink-0 text-center py-2 border-r border-gray-100 ${
                    isToday ? 'bg-sky-50' : ''
                  }`}
                >
                  <p className={`text-xs font-semibold ${isToday ? 'text-sky-600' : 'text-gray-500'}`}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </p>
                  <p className={`text-sm font-bold ${isToday ? 'text-sky-700' : 'text-gray-800'}`}>
                    {day.getDate()}
                  </p>
                  {isToday && (
                    <div className="mx-auto mt-0.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Room rows */}
          {sortedRooms.map((room) => {
            const roomRes = reservations.filter(
              (r) =>
                r.roomId === room.id &&
                r.status !== 'cancelled' &&
                r.checkIn < toDateStr(days[days.length - 1]) &&
                r.checkOut > toDateStr(days[0])
            )

            return (
              <div
                key={room.id}
                className="flex border-b border-gray-100 hover:bg-gray-50 relative"
                style={{ height: ROW_HEIGHT }}
              >
                {/* Room label */}
                <div className="flex-shrink-0 w-[140px] flex items-center px-3 border-r border-gray-200">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{room.id}</span>
                    <span className="ml-2 text-xs text-gray-400">
                      {ROOM_TYPES[room.type]?.name?.split(' ')[0] ?? room.type}
                    </span>
                  </div>
                </div>

                {/* Day cells */}
                <div className="relative flex flex-1">
                  {days.map((day, idx) => {
                    const isToday = toDateStr(day) === today
                    return (
                      <div
                        key={idx}
                        style={{ width: CELL_WIDTH }}
                        className={`flex-shrink-0 h-full border-r border-gray-100 ${
                          isToday ? 'bg-sky-50/50' : ''
                        }`}
                      />
                    )
                  })}

                  {/* Reservation blocks */}
                  {roomRes.map((res) => {
                    const span = getSpan(res)
                    if (!span) return null
                    return (
                      <button
                        key={res.id}
                        onClick={() => onSelectReservation?.(res)}
                        style={{
                          position: 'absolute',
                          left: span.startIdx * CELL_WIDTH + 2,
                          width: span.span * CELL_WIDTH - 4,
                          top: 4,
                          height: ROW_HEIGHT - 8,
                        }}
                        className={`rounded-md text-xs font-medium px-2 truncate flex items-center shadow-sm hover:opacity-80 transition-opacity ${getResStatusColor(res.status)}`}
                        title={`${res.guestName} · ${res.checkIn} → ${res.checkOut}`}
                      >
                        {span.span > 1 ? res.guestName : res.guestName.charAt(0)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
        {[
          { label: 'Confirmed', color: 'bg-sky-400' },
          { label: 'In House', color: 'bg-emerald-500' },
          { label: 'Checked Out', color: 'bg-gray-400' },
          { label: 'No Show', color: 'bg-orange-400' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 text-xs text-gray-500">
            <span className={`w-3 h-3 rounded ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
