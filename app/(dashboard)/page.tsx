'use client'

import { useState, useEffect, useCallback } from 'react'
import { Room, Reservation, DashboardStats } from '@/types'
import DashboardView from '@/components/DashboardView'
import ReservationDetailPanel from '@/components/ReservationDetailPanel'
import CheckOutModal from '@/components/CheckOutModal'
import {
  NewReservationModal,
  MoveRoomModal,
  ExtendStayModal,
  AddChargeModal,
  PostPaymentModal,
  AddTraceModal,
} from '@/components/Modals'

type ActiveModal =
  | 'checkout'
  | 'newReservation'
  | 'moveRoom'
  | 'extendStay'
  | 'addCharge'
  | 'postPayment'
  | 'addTrace'
  | null

export default function DashboardPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)
  const [checkInMode, setCheckInMode] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const fetchDetail = useCallback(async (id: string): Promise<Reservation | null> => {
    const res = await fetch(`/api/reservations/${id}`)
    if (!res.ok) return null
    return res.json()
  }, [])

  const refreshData = useCallback(async () => {
    const [roomsRes, resRes, statsRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/reservations'),
      fetch('/api/dashboard'),
    ])

    if (!roomsRes.ok) throw new Error(`Rooms API ${roomsRes.status}: ${await roomsRes.text()}`)
    if (!resRes.ok) throw new Error(`Reservations API ${resRes.status}: ${await resRes.text()}`)
    if (!statsRes.ok) throw new Error(`Dashboard API ${statsRes.status}: ${await statsRes.text()}`)

    const [roomsData, resData, statsData] = await Promise.all([
      roomsRes.json(),
      resRes.json(),
      statsRes.json(),
    ])
    setRooms(Array.isArray(roomsData) ? roomsData : [])
    setReservations(Array.isArray(resData) ? resData : [])
    setStats(statsData)

    // Refresh selected reservation detail from individual endpoint
    if (selectedRes) {
      const updated = await fetchDetail(selectedRes.id)
      if (updated) setSelectedRes(updated)
    }
  }, [selectedRes?.id, fetchDetail])

  useEffect(() => {
    refreshData()
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSelectReservation(res: Reservation) {
    const detail = await fetchDetail(res.id)
    setSelectedRes(detail ?? res)
  }

  // Called from dashboard rows — opens the panel in check-in mode
  async function handleCheckIn(res: Reservation) {
    const detail = await fetchDetail(res.id)
    setSelectedRes(detail ?? res)
    setCheckInMode(true)
  }

  // Called from the panel's "Confirm Check-In" button — makes the actual API call
  async function handleCheckInConfirm(res: Reservation) {
    await fetch(`/api/reservations/${res.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    await refreshData()
  }

  async function handleCheckOut(res: Reservation) {
    const detail = await fetchDetail(res.id)
    setSelectedRes(detail ?? res)
    setActiveModal('checkout')
  }

  async function handleCheckOutConfirm() {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/checkout`, { method: 'POST' })
    setActiveModal(null)
    await refreshData()
  }

  async function handleCancel(res: Reservation) {
    await fetch(`/api/reservations/${res.id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '' }),
    })
    await refreshData()
  }

  async function handleNoShow(res: Reservation) {
    await fetch(`/api/reservations/${res.id}/noshow`, { method: 'POST' })
    await refreshData()
  }

  async function handleMoveRoom(res: Reservation) {
    setSelectedRes(res)
    setActiveModal('moveRoom')
  }

  async function handleMoveRoomConfirm(newRoomId: string, reason: string, pricingAction: string) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRoomId, reason, pricingAction }),
    })
    setActiveModal(null)
    await refreshData()
  }

  async function handleExtendStay(res: Reservation) {
    setSelectedRes(res)
    setActiveModal('extendStay')
  }

  async function handleExtendStayConfirm(extraNights: number) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraNights }),
    })
    setActiveModal(null)
    await refreshData()
  }

  async function handleAddCharge(res: Reservation) {
    setSelectedRes(res)
    setActiveModal('addCharge')
  }

  async function handleAddChargeConfirm(data: { item: string; amount: number; date: string; category?: string }) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/charges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setActiveModal(null)
    await refreshData()
  }

  async function handlePostPayment(res: Reservation) {
    setSelectedRes(res)
    setActiveModal('postPayment')
  }

  async function handlePostPaymentConfirm(data: { item: string; amount: number; date: string }) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setActiveModal(null)
    await refreshData()
  }

  async function handleAddTrace(res: Reservation) {
    setSelectedRes(res)
    setActiveModal('addTrace')
  }

  async function handleAddTraceConfirm(data: { text: string; date: string; department: string }) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/traces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setActiveModal(null)
    await refreshData()
  }

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

  async function handleNewReservation(data: any) {
    await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setActiveModal(null)
    await refreshData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <p className="text-sm font-bold text-red-500 uppercase tracking-widest">Failed to load</p>
        <p className="text-xs text-slate-500 max-w-md font-mono">{loadError}</p>
        <button
          onClick={() => { setLoadError(null); setLoading(true); refreshData().catch((e) => setLoadError(e.message)).finally(() => setLoading(false)) }}
          className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <>
      <DashboardView
        rooms={rooms}
        reservations={reservations}
        stats={stats}
        onSelectReservation={handleSelectReservation}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />

      {/* Detail Panel */}
      {selectedRes && !activeModal && (
        <ReservationDetailPanel
          reservation={selectedRes}
          rooms={rooms}
          initialCheckInMode={checkInMode}
          onClose={() => { setSelectedRes(null); setCheckInMode(false) }}
          onCheckIn={handleCheckInConfirm}
          onCheckOut={handleCheckOut}
          onCancel={handleCancel}
          onNoShow={handleNoShow}
          onMoveRoom={handleMoveRoom}
          onExtendStay={handleExtendStay}
          onAddCharge={handleAddCharge}
          onPostPayment={handlePostPayment}
          onAddTrace={handleAddTrace}
          onResolveTrace={handleResolveTrace}
          onUpdateReservation={handleUpdateReservation}
        />
      )}

      {/* Modals */}
      {activeModal === 'checkout' && selectedRes && (
        <CheckOutModal
          reservation={selectedRes}
          onConfirm={handleCheckOutConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'newReservation' && (
        <NewReservationModal
          rooms={rooms}
          onConfirm={handleNewReservation}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'moveRoom' && selectedRes && (
        <MoveRoomModal
          reservation={selectedRes}
          rooms={rooms}
          onConfirm={handleMoveRoomConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'extendStay' && selectedRes && (
        <ExtendStayModal
          reservation={selectedRes}
          onConfirm={handleExtendStayConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'addCharge' && selectedRes && (
        <AddChargeModal
          reservation={selectedRes}
          onConfirm={handleAddChargeConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'postPayment' && selectedRes && (
        <PostPaymentModal
          reservation={selectedRes}
          onConfirm={handlePostPaymentConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'addTrace' && selectedRes && (
        <AddTraceModal
          reservation={selectedRes}
          onConfirm={handleAddTraceConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  )
}
