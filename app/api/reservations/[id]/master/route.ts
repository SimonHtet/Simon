import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

// POST /api/reservations/[id]/master — link this reservation under a master
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { masterResId } = body

  if (!masterResId) {
    return NextResponse.json({ error: 'masterResId is required' }, { status: 400 })
  }
  if (masterResId === params.id) {
    return NextResponse.json({ error: 'Reservation cannot be its own master' }, { status: 400 })
  }

  try {
    const [res, master] = await Promise.all([
      prisma.reservation.findFirst({ where: { id: params.id, hotelId: hotelId! } }),
      prisma.reservation.findFirst({ where: { id: masterResId, hotelId: hotelId! } }),
    ])
    if (!res) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    if (!master) return NextResponse.json({ error: 'Master reservation not found' }, { status: 404 })

    await prisma.$transaction([
      prisma.reservation.update({ where: { id: params.id }, data: { masterResId, isMaster: false } }),
      prisma.reservation.update({ where: { id: masterResId }, data: { isMaster: true } }),
    ])

    return NextResponse.json({ linked: true })
  } catch (err) {
    console.error('[POST /api/reservations/[id]/master] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// DELETE /api/reservations/[id]/master — unlink this reservation from its master
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const res = await prisma.reservation.findFirst({ where: { id: params.id, hotelId: hotelId! } })
    if (!res) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    if (!res.masterResId) return NextResponse.json({ error: 'Not linked to a master' }, { status: 400 })

    const prevMasterId = res.masterResId

    await prisma.reservation.update({ where: { id: params.id }, data: { masterResId: null } })

    // If old master has no more linked reservations, clear its isMaster flag
    const remaining = await prisma.reservation.count({ where: { masterResId: prevMasterId } })
    if (remaining === 0) {
      await prisma.reservation.update({ where: { id: prevMasterId }, data: { isMaster: false } })
    }

    return NextResponse.json({ unlinked: true })
  } catch (err) {
    console.error('[DELETE /api/reservations/[id]/master] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
