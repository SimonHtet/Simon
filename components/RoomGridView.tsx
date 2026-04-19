'use client'

import { Room, Reservation } from '@/types'
import { getStatusColor, getStatusBgColor } from '@/lib/utils'
import { ROOM_TYPES } from '@/lib/constants'
import { BedDouble, Wrench, Ban } from 'lucide-react'

interface Props {
  rooms: Room[]
  reservations: Reservation[]
  onSelectReservation?: (res: Reservation) => void
}

function groupByFloor(rooms: Room[]): Record<number, Room[]> {
  return rooms.reduce((acc, room) => {
    const floor = room.floor
    if (!acc[floor]) acc[floor] = []
    acc[floor].push(room)
    return acc
  }, {} as Record<number, Room[]>)
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'maintenance') return <Wrench className="w-3 h-3" />
  if (status === 'blocked') return <Ban className="w-3 h-3" />
  if (status === 'occupied') return <BedDouble className="w-3 h-3" />
  return null
}

export default function RoomGridView({ rooms, reservations, onSelectReservation }: Props) {
  const byFloor = groupByFloor(rooms)
  const floors = Object.keys(byFloor)
    .map(Number)
    .sort((a, b) => a - b)

  function getActiveReservation(room: Room): Reservation | undefined {
    return reservations.find(
      (r) => r.roomId === room.id && r.status === 'checked_in'
    )
  }

  function getConfirmedReservation(room: Room): Reservation | undefined {
    return reservations.find(
      (r) => r.roomId === room.id && r.status === 'confirmed'
    )
  }

  function getRoomTypeName(typeId: string) {
    return ROOM_TYPES[typeId]?.name ?? typeId
  }

  const statusLabels: Record<string, string> = {
    available: 'Available',
    occupied: 'Occupied',
    dirty: 'Dirty',
    maintenance: 'Maintenance',
    blocked: 'Blocked',
  }

  return (
    <div className="p-6 space-y-8">
      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {[
          { status: 'available', label: 'Available', color: 'bg-emerald-500' },
          { status: 'occupied', label: 'Occupied', color: 'bg-blue-500' },
          { status: 'dirty', label: 'Dirty', color: 'bg-amber-500' },
          { status: 'maintenance', label: 'Maintenance', color: 'bg-red-500' },
          { status: 'blocked', label: 'Blocked', color: 'bg-gray-500' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2 text-sm text-gray-600">
            <span className={`w-3 h-3 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>

      {/* Floors */}
      {floors.map((floor) => (
        <div key={floor}>
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Floor {floor}
            </h3>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">{byFloor[floor].length} rooms</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {byFloor[floor].map((room) => {
              const activeRes = getActiveReservation(room)
              const confirmedRes = getConfirmedReservation(room)
              const displayRes = activeRes || confirmedRes

              return (
                <button
                  key={room.id}
                  onClick={() => {
                    if (displayRes && onSelectReservation) {
                      onSelectReservation(displayRes)
                    }
                  }}
                  className={`
                    relative p-3 rounded-xl border-2 text-left transition-all duration-200
                    hover:shadow-md hover:-translate-y-0.5
                    ${getStatusBgColor(room.status as any)}
                    ${displayRes ? 'cursor-pointer' : 'cursor-default'}
                  `}
                >
                  {/* Status dot */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold text-gray-800">{room.id}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(room.status as any)}`} />
                  </div>

                  {/* Room type */}
                  <p className="text-xs text-gray-500 mb-1">{getRoomTypeName(room.type)}</p>

                  {/* Status / Guest */}
                  {activeRes ? (
                    <p className="text-xs font-medium text-blue-700 truncate">
                      {activeRes.guestName}
                    </p>
                  ) : confirmedRes ? (
                    <p className="text-xs font-medium text-sky-600 truncate">
                      ARR: {confirmedRes.guestName.split(' ')[0]}
                    </p>
                  ) : (
                    <p className={`text-xs font-medium ${
                      room.status === 'dirty' ? 'text-amber-600' :
                      room.status === 'maintenance' ? 'text-red-600' :
                      room.status === 'blocked' ? 'text-gray-600' :
                      'text-emerald-600'
                    }`}>
                      {statusLabels[room.status] ?? room.status}
                    </p>
                  )}

                  {/* Icon overlay for special statuses */}
                  {(room.status === 'maintenance' || room.status === 'blocked') && (
                    <div className="absolute top-2 right-2 text-gray-400">
                      <StatusIcon status={room.status} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
