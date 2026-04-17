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

  if (!hasPermission(role!, 'NO_SHOW')) {
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

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id: params.id },
      data: { status: 'no_show' },
      include: {
        guest: true,
        room: true,
        charges: { orderBy: { createdAt: 'asc' } },
        traces: { orderBy: { createdAt: 'asc' } },
        packages: true,
      },
    }),
    prisma.room.update({
      where: { id: reservation.roomId },
      data: { status: 'available', resId: null },
    }),
  ])

  return NextResponse.json(updated)
}
