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

  try {
    const room = await prisma.room.findFirst({
      where: { id: params.id, hotelId: hotelId! },
    })
    if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Rate update — admin/manager only
    if (body.rate !== undefined) {
      if (role !== 'admin' && role !== 'manager') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const rate = parseFloat(body.rate)
      if (isNaN(rate) || rate < 0) {
        return NextResponse.json({ error: 'Invalid rate' }, { status: 400 })
      }
      const updated = await prisma.room.update({ where: { id: params.id }, data: { rate } })
      return NextResponse.json(updated)
    }

    // Status update — existing logic
    const { status } = body
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    if (role === 'housekeeping' && status !== 'available') {
      return NextResponse.json({ error: 'Forbidden — housekeeping can only mark rooms clean' }, { status: 403 })
    }
    if (room.status === 'occupied' && room.resId) {
      return NextResponse.json({ error: 'Room is occupied — check the guest out first' }, { status: 400 })
    }
    const updated = await prisma.room.update({ where: { id: params.id }, data: { status } })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PATCH /api/rooms/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
