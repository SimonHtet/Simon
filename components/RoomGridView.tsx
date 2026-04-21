'use client'

import { Room, Reservation } from '@/types'
import { ROOM_TYPES } from '@/lib/constants'
import { Wrench, Ban, BedDouble } from 'lucide-react'

interface Props {
  rooms: Room[]
  reservations: Reservation[]
  onSelectReservation?: (res: Reservation) => void
  onRefresh?: () => void
  onNewReservation?: (roomId: string) => void
}

function groupByFloor(rooms: Room[]): Record<number, Room[]> {
  return rooms.reduce(
    (acc, room) => {
      const floor = room.floor
      if (!acc[floor]) acc[floor] = []
      acc[floor].push(room)
      return acc
    },
    {} as Record<number, Room[]>
  )
}

const STATUS_STYLES: Record<
  string,
  { card: string; dot: string; label: string; text: string }
> = {
  available: {
    card: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    dot: 'bg-emerald-500',
    label: 'Available',
    text: 'text-emerald-700',
  },
  occupied: {
    card: 'bg-blue-50 border-blue-200 hover:border-blue-400',
    dot: 'bg-blue-500',
    label: 'Occupied',
    text: 'text-blue-700',
  },
  dirty: {
    card: 'bg-amber-50 border-amber-200 hover:border-amber-400',
    dot: 'bg-amber-500',
    label: 'Dirty',
    text: 'text-amber-700',
  },
  maintenance: {
    card: 'bg-red-50 border-red-200 hover:border-red-400',
    dot: 'bg-red-500',
    label: 'Maintenance',
    text: 'text-red-700',
  },
  blocked: {
    card: 'bg-slate-100 border-slate-300 hover:border-slate-400',
    dot: 'bg-slate-500',
    label: 'Blocked',
    text: 'text-slate-600',
  },
}

async function patchRoomStatus(roomId: string, status: string) {
  await fetch(`/api/rooms/${roomId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
}

export default function RoomGridView({ rooms, reservations, onSelectReservation, onRefresh, onNewReservation }: Props) {
  const byFloor = groupByFloor(rooms)
  const floors = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => a - b)

  function getActiveReservation(room: Room): Reservation | undefined {
    return reservations.find((r) => r.roomId === room.id && r.status === 'checked_in')
  }

  function getConfirmedReservation(room: Room): Reservation | undefined {
    return reservations.find((r) => r.roomId === room.id && r.status === 'confirmed')
  }

  function getRoomTypeName(typeId: string) {
    return ROOM_TYPES[typeId]?.name ?? typeId
  }

  return (
    <div className="p-6 space-y-8">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_STYLES).map(([status, s]) => (
          <div key={status} className="flex items-center gap-2 text-sm text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Floors */}
      {floors.map((floor) => (
        <div key={floor}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Floor {floor}
            </h3>
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-400">
              {byFloor[floor].length} rooms
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {byFloor[floor].map((room) => {
              const activeRes = getActiveReservation(room)
              const confirmedRes = getConfirmedReservation(room)
              const displayRes = activeRes || confirmedRes
              const s = STATUS_STYLES[room.status] ?? STATUS_STYLES.blocked

              const isClickable = !!displayRes || room.status === 'available'
              return (
                <div
                  key={room.id}
                  onClick={() => {
                    if (displayRes && onSelectReservation) {
                      onSelectReservation(displayRes)
                    } else if (room.status === 'available') {
                      onNewReservation?.(room.id)
                    }
                  }}
                  className={`
                    relative p-3 rounded-xl border-2 text-left transition-all duration-200
                    hover:shadow-md hover:-translate-y-0.5
                    ${s.card}
                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {/* Room number + dot */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-black text-slate-800">{room.id}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
                  </div>

                  {/* Room type */}
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-1">
                    {getRoomTypeName(room.type)}
                  </p>

                  {/* Status / Guest */}
                  {activeRes ? (
                    <p className="text-xs font-bold text-blue-700 truncate">{activeRes.guestName}</p>
                  ) : confirmedRes ? (
                    <p className="text-xs font-bold text-teal-600 truncate">
                      ARR: {confirmedRes.guestName.split(' ')[0]}
                    </p>
                  ) : (
                    <p className={`text-[10px] font-black uppercase tracking-wider ${s.text}`}>
                      {s.label}
                    </p>
                  )}

                  {/* Status icon overlays */}
                  {room.status === 'maintenance' && (
                    <div className="absolute top-2 right-2 text-red-400">
                      <Wrench className="w-3 h-3" />
                    </div>
                  )}
                  {room.status === 'blocked' && (
                    <div className="absolute top-2 right-2 text-slate-400">
                      <Ban className="w-3 h-3" />
                    </div>
                  )}
                  {room.status === 'occupied' && activeRes && (
                    <div className="absolute top-2 right-2 text-blue-300">
                      <BedDouble className="w-3 h-3" />
                    </div>
                  )}

                  {/* Mark Clean button for dirty rooms */}
                  {room.status === 'dirty' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await patchRoomStatus(room.id, 'available')
                        onRefresh?.()
                      }}
                      className="mt-1.5 w-full text-[9px] font-black px-2 py-1 bg-amber-500 hover:bg-emerald-600 text-white rounded-lg transition-colors uppercase tracking-wider"
                    >
                      ✓ Mark Clean
                    </button>
                  )}

                  {/* Maintenance toggle for available rooms */}
                  {room.status === 'available' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await patchRoomStatus(room.id, 'maintenance')
                        onRefresh?.()
                      }}
                      className="mt-1.5 w-full text-[9px] font-black px-2 py-1 bg-transparent hover:bg-red-100 text-slate-300 hover:text-red-600 border border-transparent hover:border-red-200 rounded-lg transition-all uppercase tracking-wider"
                    >
                      OOS
                    </button>
                  )}

                  {/* Release from maintenance */}
                  {room.status === 'maintenance' && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await patchRoomStatus(room.id, 'available')
                        onRefresh?.()
                      }}
                      className="mt-1.5 w-full text-[9px] font-black px-2 py-1 bg-red-100 hover:bg-emerald-100 text-red-600 hover:text-emerald-700 border border-red-200 hover:border-emerald-300 rounded-lg transition-all uppercase tracking-wider"
                    >
                      Release
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
