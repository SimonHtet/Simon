'use client'

import { useState, useEffect, useCallback } from 'react'
import { Room, Reservation } from '@/types'
import GuestHistoryView from '@/components/GuestHistoryView'
import ReservationDetailPanel from '@/components/ReservationDetailPanel'

export default function GuestsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(async (id: string): Promise<Reservation | null> => {
    const res = await fetch(`/api/reservations/${id}`)
    if (!res.ok) return null
    return res.json()
  }, [])

  const refreshData = useCallback(async () => {
    // Refresh selected reservation detail in parallel with the list fetches
    const detailPromise = selectedRes ? fetchDetail(selectedRes.id) : null
    const [roomsRes, resRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/reservations?includeAll=1'),
    ])
    const [roomsData, resData] = await Promise.all([roomsRes.json(), resRes.json()])
    setRooms(roomsData)
    setReservations(resData)
    if (detailPromise) {
      const updated = await detailPromise
      if (updated) setSelectedRes(updated)
    }
  }, [selectedRes?.id, fetchDetail])

  // Open the panel immediately with the list data, hydrate full detail in background
  const handleSelectReservation = useCallback((res: Reservation) => {
    setSelectedRes(res)
    fetchDetail(res.id).then((detail) => {
      if (detail) setSelectedRes((prev) => (prev?.id === res.id ? detail : prev))
    })
  }, [fetchDetail])

  useEffect(() => {
    refreshData().finally(() => setLoading(false))
  }, [])

  async function handleResolveTrace(reservationId: string, traceId: number) {
    await fetch(`/api/reservations/${reservationId}/traces`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ traceId }),
    })
    await refreshData()
  }

  async function handleUpdateReservation(id: string, data: Partial<Reservation>) {
    await fetch(`/api/reservations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    await refreshData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <GuestHistoryView
        reservations={reservations}
        onSelectReservation={handleSelectReservation}
      />

      {selectedRes && (
        <ReservationDetailPanel
          reservation={selectedRes}
          rooms={rooms}
          onClose={() => setSelectedRes(null)}
          onCheckIn={() => {}}
          onCheckOut={() => {}}
          onCancel={() => {}}
          onNoShow={() => {}}
          onMoveRoom={() => {}}
          onExtendStay={() => {}}
          onAddCharge={() => {}}
          onPostPayment={() => {}}
          onAddTrace={() => {}}
          onResolveTrace={handleResolveTrace}
          onUpdateReservation={handleUpdateReservation}
        />
      )}
    </>
  )
}
