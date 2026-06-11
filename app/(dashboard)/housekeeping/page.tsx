'use client'

import { useState, useEffect, useCallback } from 'react'
import { Room } from '@/types'
import { Sparkles, BedDouble, Wrench, Ban, CheckCircle2 } from 'lucide-react'
import { toast } from '@/lib/toast'
import { PageSkeleton } from '@/components/Skeletons'

const STATUS_META: Record<string, { label: string; dot: string; card: string }> = {
  dirty:       { label: 'Needs Cleaning', dot: 'bg-amber-500',   card: 'bg-amber-50 border-amber-200' },
  available:   { label: 'Clean & Ready',  dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200' },
  occupied:    { label: 'Occupied',       dot: 'bg-blue-500',    card: 'bg-blue-50 border-blue-200' },
  maintenance: { label: 'Maintenance',    dot: 'bg-red-500',     card: 'bg-red-50 border-red-200' },
  blocked:     { label: 'Blocked',        dot: 'bg-gray-400',    card: 'bg-gray-50 border-gray-200' },
}

const SECTION_ORDER = ['dirty', 'occupied', 'available', 'maintenance', 'blocked']

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [cleaningId, setCleaningId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/rooms')
    if (r.ok) {
      const data = await r.json()
      setRooms(Array.isArray(data) ? data : [])
    }
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function markClean(room: Room) {
    setCleaningId(room.id)
    try {
      const r = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'available' }),
      })
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        toast(data.error ?? 'Could not update room', 'error')
        return
      }
      toast(`Room ${room.id} marked clean`)
      await load()
    } finally {
      setCleaningId(null)
    }
  }

  if (loading) return <PageSkeleton />

  const byStatus = SECTION_ORDER.map((status) => ({
    status,
    rooms: rooms.filter((r) => r.status === status).sort((a, b) => a.id.localeCompare(b.id)),
  })).filter((s) => s.rooms.length > 0)

  const dirtyCount = rooms.filter((r) => r.status === 'dirty').length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" /> Housekeeping Board
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {dirtyCount === 0
              ? 'All rooms are clean — nothing to do'
              : `${dirtyCount} room${dirtyCount !== 1 ? 's' : ''} waiting to be cleaned`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {SECTION_ORDER.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${STATUS_META[s].dot}`} />
              {STATUS_META[s].label}
            </span>
          ))}
        </div>
      </div>

      {byStatus.map(({ status, rooms: sectionRooms }) => (
        <div key={status} className="mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${STATUS_META[status].dot}`} />
            {STATUS_META[status].label} ({sectionRooms.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {sectionRooms.map((room) => (
              <div
                key={room.id}
                className={`p-3 rounded-xl border ${STATUS_META[status].card} flex flex-col`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-slate-900">{room.id}</span>
                  {status === 'occupied' && <BedDouble className="w-3.5 h-3.5 text-blue-400" />}
                  {status === 'maintenance' && <Wrench className="w-3.5 h-3.5 text-red-400" />}
                  {status === 'blocked' && <Ban className="w-3.5 h-3.5 text-gray-400" />}
                  {status === 'available' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-[10px] text-slate-500 capitalize mb-2">
                  Floor {room.floor} · {room.type.toLowerCase()}
                </p>
                {status === 'dirty' && (
                  <button
                    onClick={() => markClean(room)}
                    disabled={cleaningId === room.id}
                    className="mt-auto w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {cleaningId === room.id ? '…' : (<><Sparkles className="w-3 h-3" /> Mark Clean</>)}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
