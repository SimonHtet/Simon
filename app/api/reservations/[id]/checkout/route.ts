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

    if (reservation.status !== 'checked_in') {
      return NextResponse.json({ error: 'Reservation is not checked in' }, { status: 400 })
    }

    const [updated] = await prisma.$transaction([
      prisma.reservation.update({
        where: { id: params.id },
        data: {
          status: 'checked_out',
          actualCheckOut: new Date(),
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
        where: { id: reservation.roomId },
        data: { status: 'dirty', resId: null },
      }),
    ])

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[POST /api/reservations/[id]/checkout] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
