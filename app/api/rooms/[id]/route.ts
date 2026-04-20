import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

const VALID_STATUSES = ['available', 'dirty', 'maintenance', 'blocked']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { status } = body

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  // Housekeeping can only mark dirty rooms as available
  if (role === 'housekeeping' && status !== 'available') {
    return NextResponse.json({ error: 'Forbidden — housekeeping can only mark rooms clean' }, { status: 403 })
  }

  try {
    const room = await prisma.room.findFirst({
      where: { id: params.id, hotelId: hotelId! },
    })

    if (!room) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.room.update({
      where: { id: params.id },
      data: { status },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rooms/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
