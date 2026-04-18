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

  if (!hasPermission(role!, 'MOVE_ROOM')) {
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
  const { newRoomId, reason } = body

  if (!newRoomId) {
    return NextResponse.json({ error: 'newRoomId is required' }, { status: 400 })
  }

  // Room must belong to this hotel
  const newRoom = await prisma.room.findFirst({
    where: { id: newRoomId, hotelId: hotelId! },
  })
  if (!newRoom) {
    return NextResponse.json({ error: 'New room not found' }, { status: 404 })
  }

  if (newRoom.status !== 'available') {
    return NextResponse.json(
      { error: `Room ${newRoomId} is not available (status: ${newRoom.status})` },
      { status: 400 }
    )
  }

  const oldRoomId = reservation.roomId

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id: params.id },
      data: {
        roomId: newRoomId,
        moveReason: reason || null,
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
      data: { status: 'dirty', resId: null },
    }),
    prisma.room.update({
      where: { id: newRoomId },
      data: { status: 'occupied', resId: params.id },
    }),
  ])

  return NextResponse.json(updated)
}
