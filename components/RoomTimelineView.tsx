'use client'

import { useState, useCallback } from 'react'
import { Room, Reservation } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'
import { GripVertical } from 'lucide-react'

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
  const [dayOffset, setDayOffset] = useState(-DAY_BACK)
  const days = getDays(TOTAL_DAYS, dayOffset)
  const today = toDateStr(new Date())

  // Drag state
  const [dragResId, setDragResId] = useState<string | null>(null)
  const [dragOverRoomId, setDragOverRoomId] = useState<string | null>(null)
  const [dropError, setDropError] = useState<string | null>(null)

  const sortedRooms = [...rooms].sort((a, b) => {
    if (a.floor !== b.floor) return a.floor - b.floor
    return a.id.localeCompare(b.id)
  })

  function getSpan(res: Reservation) {
    const startStr = res.checkIn > toDateStr(days[0]) ? res.checkIn : toDateStr(days[0])
    const endStr = res.checkOut < toDateStr(days[days.length - 1]) ? res.checkOut : toDateStr(days[days.length - 1])
    const startIdx = days.findIndex((d) => toDateStr(d) === startStr)
    const endIdx = days.findIndex((d) => toDateStr(d) === endStr)
    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) return null
    return { startIdx, endIdx, span: endIdx - startIdx }
  }

  // Whether dropping draggedRes onto targetRoomId would conflict with another reservation
  const hasConflict = useCallback((targetRoomId: string, draggedRes: Reservation): boolean => {
    return reservations.some(
      (r) =>
        r.id !== draggedRes.id &&
        r.roomId === targetRoomId &&
        r.status !== 'cancelled' &&
        r.status !== 'checked_out' &&
        r.checkIn < draggedRes.checkOut &&
        r.checkOut > draggedRes.checkIn
    )
  }, [reservations])

  function isValidDropTarget(targetRoomId: string, draggedRes: Reservation): boolean {
    if (targetRoomId === draggedRes.roomId) return true
    return !hasConflict(targetRoomId, draggedRes)
  }

  function getDropTargetStyle(roomId: string): string {
    if (!dragResId || dragOverRoomId !== roomId) return ''
    const draggedRes = reservations.find((r) => r.id === dragResId)
    if (!draggedRes) return ''
    return isValidDropTarget(roomId, draggedRes)
      ? 'ring-2 ring-inset ring-teal-400 bg-teal-50/60'
      : 'ring-2 ring-inset ring-rose-400 bg-rose-50/60'
  }

  async function handleDrop(targetRoomId: string) {
    if (!dragResId) return
    const draggedRes = reservations.find((r) => r.id === dragResId)
    setDragResId(null)
    setDragOverRoomId(null)
    if (!draggedRes) return
    if (targetRoomId === draggedRes.roomId) return
    if (!isValidDropTarget(targetRoomId, draggedRes)) return

    try {
      const res = await fetch(`/api/reservations/${dragResId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: targetRoomId }),
      })
      if (!res.ok) {
        setDropError(dragResId)
        setTimeout(() => setDropError(null), 2000)
        return
      }
      // Refresh by re-selecting or triggering parent update
      onSelectReservation?.(draggedRes)
    } catch {
      setDropError(dragResId)
      setTimeout(() => setDropError(null), 2000)
    }
  }

  const ROW_HEIGHT = 44

  const firstDay = days[0]
  const lastDay = days[days.length - 1]
  const dateRangeLabel = `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <div className="p-6">
      {/* Navigation bar */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setDayOffset(prev => prev - 7)}
          className="px-3 py-1.5 text-sm font-semibold text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
        >
          ← Previous
        </button>
        <button
          onClick={() => setDayOffset(-DAY_BACK)}
          className="px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => setDayOffset(prev => prev + 7)}
          className="px-3 py-1.5 text-sm font-semibold text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
        >
          Next →
        </button>
        <span className="ml-2 text-sm font-medium text-gray-500">{dateRangeLabel}</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 200 + CELL_WIDTH * TOTAL_DAYS }}>
          {/* Header row */}
          <div className="flex sticky top-0 z-10 bg-white border-b border-gray-200">
            <div className="flex-shrink-0 w-[140px] px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-r border-gray-200">
              Room
            </div>
            {days.map((day, idx) => {
              const isToday = toDateStr(day) === today
              return (
                <div
                  key={idx}
                  style={{ width: CELL_WIDTH }}
                  className={`flex-shrink-0 text-center py-2 border-r border-gray-100 ${isToday ? 'bg-sky-50' : ''}`}
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

            const dropStyle = getDropTargetStyle(room.id)

            return (
              <div
                key={room.id}
                className={`flex border-b border-gray-100 hover:bg-gray-50 relative transition-colors ${dropStyle}`}
                style={{ height: ROW_HEIGHT }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverRoomId(room.id)
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the row entirely (not entering a child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverRoomId(null)
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  handleDrop(room.id)
                }}
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
                        className={`flex-shrink-0 h-full border-r border-gray-100 ${isToday ? 'bg-sky-50/50' : ''}`}
                      />
                    )
                  })}

                  {/* Reservation blocks */}
                  {roomRes.map((res) => {
                    const span = getSpan(res)
                    if (!span) return null
                    const canDrag = res.status === 'confirmed' || res.status === 'checked_in'
                    const isError = dropError === res.id
                    return (
                      <div
                        key={res.id}
                        draggable={canDrag}
                        onDragStart={(e) => {
                          if (!canDrag) { e.preventDefault(); return }
                          setDragResId(res.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragEnd={() => {
                          setDragResId(null)
                          setDragOverRoomId(null)
                        }}
                        style={{
                          position: 'absolute',
                          left: span.startIdx * CELL_WIDTH + 2,
                          width: span.span * CELL_WIDTH - 4,
                          top: 4,
                          height: ROW_HEIGHT - 8,
                          opacity: dragResId === res.id ? 0.5 : 1,
                        }}
                        className={`rounded-md text-xs font-medium px-1.5 flex items-center gap-1 shadow-sm transition-opacity select-none
                          ${isError ? 'ring-2 ring-rose-500 ring-offset-1' : ''}
                          ${getResStatusColor(res.status)}
                          ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
                        `}
                        title={`${res.guestName} · ${res.checkIn} → ${res.checkOut}`}
                        onClick={() => onSelectReservation?.(res)}
                      >
                        {canDrag && (
                          <GripVertical className="w-3 h-3 opacity-60 flex-shrink-0" />
                        )}
                        <span className="truncate">
                          {span.span > 1 ? res.guestName : res.guestName.charAt(0)}
                        </span>
                      </div>
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
        <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
          <GripVertical className="w-3 h-3" /> Drag to move room
        </div>
      </div>
    </div>
  )
}
