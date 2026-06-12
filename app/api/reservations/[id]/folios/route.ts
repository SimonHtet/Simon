import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { hotelId: true },
    })
    if (!reservation || reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const folios = await prisma.folio.findMany({
      where: { reservationId: params.id },
      include: { charges: { include: { charge: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(folios)
  } catch (err) {
    console.error('[GET /folios]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { name, paymentMethod } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { hotelId: true },
    })
    if (!reservation || reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const folio = await prisma.folio.create({
      data: {
        reservationId: params.id,
        name: name.trim(),
        paymentMethod: paymentMethod || null,
      },
      include: { charges: { include: { charge: true } } },
    })
    return NextResponse.json(folio)
  } catch (err) {
    console.error('[POST /folios]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
