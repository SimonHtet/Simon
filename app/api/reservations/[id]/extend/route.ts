import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'EXTEND_STAY')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { extraNights } = body

  const nights = parseInt(extraNights)
  if (isNaN(nights) || nights < 1 || nights > 30) {
    return NextResponse.json(
      { error: 'extraNights must be between 1 and 30' },
      { status: 400 }
    )
  }

  const currentCheckOut = new Date(reservation.checkOut)
  currentCheckOut.setDate(currentCheckOut.getDate() + nights)
  const newCheckOut = currentCheckOut.toISOString().split('T')[0]

  const overlap = await prisma.reservation.findFirst({
    where: {
      roomId: reservation.roomId,
      id: { not: params.id },
      status: { in: ['confirmed', 'checked_in'] },
      checkIn: { lt: newCheckOut },
      checkOut: { gt: reservation.checkOut },
    },
  })

  if (overlap) {
    return NextResponse.json(
      { error: 'Room is not available for the requested dates. Please choose different dates.' },
      { status: 400 }
    )
  }

  const newTotalNights = reservation.totalNights + nights
  const newTotalAmount = reservation.rate * newTotalNights

  const updated = await prisma.reservation.update({
    where: { id: params.id },
    data: {
      checkOut: newCheckOut,
      totalNights: newTotalNights,
      totalAmount: newTotalAmount,
    },
    include: {
      guest: true,
      room: true,
      charges: { orderBy: { createdAt: 'asc' } },
      traces: { orderBy: { createdAt: 'asc' } },
      packages: true,
      preferences: true,
    },
  })

  return NextResponse.json(updated)
}
