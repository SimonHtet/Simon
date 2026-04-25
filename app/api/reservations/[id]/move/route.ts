import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { calculateNights } from '@/lib/utils'

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
  const { newRoomId, reason, newCheckIn, newCheckOut } = body

  if (!newRoomId) {
    return NextResponse.json({ error: 'newRoomId is required' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
    })

    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const newRoom = await prisma.room.findFirst({
      where: { id: newRoomId, hotelId: hotelId! },
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

    if (newCheckIn && newCheckOut) {
      const conflict = await prisma.reservation.findFirst({
        where: {
          roomId: newRoomId,
          id: { not: params.id },
          status: { in: ['confirmed', 'checked_in'] },
          checkIn: { lt: newCheckOut },
          checkOut: { gt: newCheckIn },
        },
      })
      if (conflict) {
        return NextResponse.json(
          { error: 'Room has a conflicting reservation on those dates' },
          { status: 400 }
        )
      }
    }

    const oldRoomId = reservation.roomId

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: {
          roomId: newRoomId,
          moveReason: reason || null,
          ...(newCheckIn && { checkIn: newCheckIn }),
          ...(newCheckOut && { checkOut: newCheckOut }),
          ...(newCheckIn && newCheckOut && {
            totalNights: calculateNights(newCheckIn, newCheckOut),
            totalAmount: reservation.rate * calculateNights(newCheckIn, newCheckOut),
          }),
        },
        include: {
          guest: true,
          room: true,
          charges: { orderBy: { createdAt: 'asc' } },
          traces: { orderBy: { createdAt: 'asc' } },
          packages: true,
          preferences: true,
        },
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

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[POST /api/reservations/[id]/move] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
