import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'CHECKOUT')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
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

    if (reservation.status !== 'checked_out') {
      return NextResponse.json({ error: 'Reservation is not checked out' }, { status: 400 })
    }

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: {
          status: 'checked_in',
          actualCheckOut: null,
        },
      }),
      prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: 'occupied', resId: params.id },
      }),
    ])

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[POST /api/reservations/[id]/undo-checkout] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
