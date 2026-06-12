import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { calculateNights } from '@/lib/utils'
import { ROOM_TYPES } from '@/lib/constants'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'MOVE_ROOM')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { newRoomId, reason, newCheckIn, newCheckOut, pricingAction = 'no_change' } = body

  if (!newRoomId) {
    return NextResponse.json({ error: 'newRoomId is required' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { hotelId: true, roomId: true, roomTypeId: true, status: true, rate: true, totalNights: true, checkIn: true, checkOut: true },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newRoom = await prisma.room.findFirst({
      where: { id: newRoomId, hotelId: hotelId! },
      select: { id: true, type: true, status: true },
    })
    if (!newRoom) {
      return NextResponse.json({ error: 'New room not found' }, { status: 404 })
    }

    if (!['available', 'dirty'].includes(newRoom.status)) {
      return NextResponse.json(
        { error: `Room ${newRoomId} is not available (status: ${newRoom.status})` },
        { status: 400 }
      )
    }

    // Target room must be free for the stay dates (the new ones if provided,
    // otherwise the reservation's current dates)
    const rangeStart = newCheckIn ?? reservation.checkIn
    const rangeEnd = newCheckOut ?? reservation.checkOut
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId: newRoomId,
        id: { not: params.id },
        status: { in: ['confirmed', 'checked_in'] },
        checkIn: { lt: rangeEnd },
        checkOut: { gt: rangeStart },
      },
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'Room has a conflicting reservation on those dates' },
        { status: 400 }
      )
    }

    const oldRoomId = reservation.roomId

    await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: {
          roomId: newRoomId,
          roomTypeId: newRoom.type,
          moveReason: reason || null,
          ...(newCheckIn && { checkIn: newCheckIn }),
          ...(newCheckOut && { checkOut: newCheckOut }),
          ...(newCheckIn && newCheckOut && {
            totalNights: calculateNights(newCheckIn, newCheckOut),
            totalAmount: reservation.rate * calculateNights(newCheckIn, newCheckOut),
          }),
        },
        select: { id: true },
      }),
      prisma.room.update({
        where: { id: oldRoomId },
        data: {
          status: reservation.status === 'checked_in' ? 'dirty' : 'available',
          resId: null,
        },
      }),
      prisma.room.update({
        where: { id: newRoomId },
        data: {
          status: reservation.status === 'checked_in' ? 'occupied' : 'available',
          resId: reservation.status === 'checked_in' ? params.id : null,
        },
      }),
    ])

    // Apply pricing action when room type changes
    if (newRoom.type !== reservation.roomTypeId) {
      const newRate = ROOM_TYPES[newRoom.type]?.rate ?? reservation.rate
      const today = new Date().toISOString().split('T')[0]

      if (pricingAction === 'charge_diff') {
        await Promise.all([
          prisma.reservation.update({
            where: { id: params.id },
            data: { rate: newRate },
          }),
          prisma.charge.create({
            data: {
              reservationId: params.id,
              item: 'Room upgrade supplement',
              amount: (newRate - reservation.rate) * reservation.totalNights,
              date: today,
              category: 'ROOM',
            },
          }),
        ])
      } else if (pricingAction === 'credit_diff') {
        await Promise.all([
          prisma.reservation.update({
            where: { id: params.id },
            data: { rate: newRate },
          }),
          prisma.charge.create({
            data: {
              reservationId: params.id,
              item: 'Room downgrade credit',
              amount: -((reservation.rate - newRate) * reservation.totalNights),
              date: today,
              category: 'ROOM',
            },
          }),
        ])
      }
      // 'complimentary' and 'keep_rate': no rate or charge changes
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/reservations/[id]/move] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
