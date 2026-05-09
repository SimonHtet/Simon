'use client'

import { useState, useEffect, useCallback } from 'react'
import { Room, Reservation } from '@/types'
import RoomTimelineView from '@/components/RoomTimelineView'
import ReservationDetailPanel from '@/components/ReservationDetailPanel'
import CheckOutModal from '@/components/CheckOutModal'
import {
  MoveRoomModal,
  ExtendStayModal,
  AddChargeModal,
  PostPaymentModal,
  AddTraceModal,
} from '@/components/Modals'

export default function TimelinePage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null)
  const [activeModal, setActiveModal] = useState<'extendStay' | 'moveRoom' | 'addCharge' | 'postPayment' | 'addTrace' | 'checkout' | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDetail = useCallback(async (id: string): Promise<Reservation | null> => {
    const res = await fetch(`/api/reservations/${id}`)
    if (!res.ok) return null
    return res.json()
  }, [])

  const refreshData = useCallback(async () => {
    const [roomsRes, resRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/reservations'),
    ])
    const [roomsData, resData] = await Promise.all([roomsRes.json(), resRes.json()])
    setRooms(roomsData)
    setReservations(resData)
    if (selectedRes) {
      const updated = await fetchDetail(selectedRes.id)
      if (updated) setSelectedRes(updated)
    }
  }, [selectedRes?.id, fetchDetail])

  async function handleSelectReservation(res: Reservation) {
    const detail = await fetchDetail(res.id)
    setSelectedRes(detail ?? res)
  }

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

  async function handleCheckOut(res: Reservation) {
    const alreadyHaveDetail = selectedRes?.id === res.id
    setSelectedRes(alreadyHaveDetail ? selectedRes! : res)
    setActiveModal('checkout')
    if (!alreadyHaveDetail) {
      const id = res.id
      fetchDetail(id).then(detail => {
        if (detail) setSelectedRes(prev => prev?.id === id ? detail : prev)
      })
    }
  }

  async function handleCheckOutConfirm() {
    if (!selectedRes) return
    await fetch(`/api/reservations/${selectedRes.id}/checkout`, { method: 'POST' })
    setActiveModal(null)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <RoomTimelineView
        rooms={rooms}
        reservations={reservations}
        onSelectReservation={handleSelectReservation}
        onRefresh={refreshData}
      />

      {selectedRes && !activeModal && (
        <ReservationDetailPanel
          reservation={selectedRes}
          rooms={rooms}
          onClose={() => setSelectedRes(null)}
          onCheckIn={() => {}}
          onCheckOut={handleCheckOut}
          onCancel={() => {}}
          onNoShow={() => {}}
          onMoveRoom={handleMoveRoom}
          onExtendStay={handleExtendStay}
          onAddCharge={handleAddCharge}
          onPostPayment={handlePostPayment}
          onAddTrace={handleAddTrace}
          onResolveTrace={handleResolveTrace}
          onUpdateReservation={handleUpdateReservation}
        />
      )}

      {activeModal === 'checkout' && selectedRes && (
        <CheckOutModal reservation={selectedRes} onConfirm={handleCheckOutConfirm} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'extendStay' && selectedRes && (
        <ExtendStayModal reservation={selectedRes} onConfirm={handleExtendStayConfirm} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'moveRoom' && selectedRes && (
        <MoveRoomModal reservation={selectedRes} rooms={rooms} onConfirm={handleMoveRoomConfirm} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'addCharge' && selectedRes && (
        <AddChargeModal reservation={selectedRes} onConfirm={handleAddChargeConfirm} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'postPayment' && selectedRes && (
        <PostPaymentModal reservation={selectedRes} onConfirm={handlePostPaymentConfirm} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'addTrace' && selectedRes && (
        <AddTraceModal reservation={selectedRes} onConfirm={handleAddTraceConfirm} onClose={() => setActiveModal(null)} />
      )}
    </>
  )
}
