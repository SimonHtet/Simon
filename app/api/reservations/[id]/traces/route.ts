import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json()
  const { text, date, department } = body

  if (!text || !date) {
    return NextResponse.json({ error: 'text and date are required' }, { status: 400 })
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: params.id } })
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const trace = await prisma.trace.create({
    data: {
      reservationId: params.id,
      text,
      date,
      status: 'pending',
      department: department || 'FRONT OFFICE',
    },
  })

  return NextResponse.json(trace, { status: 201 })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json()
  const { traceId } = body

  if (!traceId) {
    return NextResponse.json({ error: 'traceId is required' }, { status: 400 })
  }

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { hotelId: true },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const trace = await prisma.trace.update({
    where: { id: parseInt(traceId) },
    data: { status: 'resolved' },
  })

  return NextResponse.json(trace)
}
