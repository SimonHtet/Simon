'use client'

import { useState, useEffect, useCallback } from 'react'
import { Room, Reservation, DashboardStats } from '@/types'
import DashboardView from '@/components/DashboardView'
import ReservationDetailPanel from '@/components/ReservationDetailPanel'
import CheckInModal from '@/components/CheckInModal'
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
  | 'checkin'
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
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [loading, setLoading] = useState(true)

  const refreshData = useCallback(async () => {
    const [roomsRes, resRes, statsRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/reservations'),
      fetch('/api/dashboard'),
    ])
    const [roomsData, resData, statsData] = await Promise.all([
      roomsRes.json(),
      resRes.json(),
      statsRes.json(),
    ])
    setRooms(roomsData)
    setReservations(resData)
    setStats(statsData)

    // Refresh selected reservation if open
    if (selectedRes) {
      const updated = resData.find((r: Reservation) => r.id === selectedRes.id)
      if (updated) setSelectedRes(updated)
    }
  }, [selectedRes?.id])

  useEffect(() => {
    refreshData().finally(() => setLoading(false))
  }, [])

  async function handleCheckIn(res: Reservation) {
    setSelectedRes(res)
    setActiveModal('checkin')
  }

  async function handleCheckInConfirm(data: { eta?: string; flightNumber?: string }) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setActiveModal(null)
    await refreshData()
  }

  async function handleCheckOut(res: Reservation) {
    setSelectedRes(res)
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

  async function handleMoveRoomConfirm(newRoomId: string, reason: string) {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newRoomId, reason }),
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

  return (
    <>
      <DashboardView
        rooms={rooms}
        reservations={reservations}
        stats={stats}
        onSelectReservation={setSelectedRes}
        onCheckIn={handleCheckIn}
        onCheckOut={handleCheckOut}
      />

      {/* Detail Panel */}
      {selectedRes && !activeModal && (
        <ReservationDetailPanel
          reservation={selectedRes}
          rooms={rooms}
          onClose={() => setSelectedRes(null)}
          onCheckIn={handleCheckIn}
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
      {activeModal === 'checkin' && selectedRes && (
        <CheckInModal
          reservation={selectedRes}
          onConfirm={handleCheckInConfirm}
          onClose={() => setActiveModal(null)}
        />
      )}
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
