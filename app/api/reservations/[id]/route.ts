import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

const RESERVATION_INCLUDE = {
  guest: true,
  room: true,
  charges: { orderBy: { createdAt: 'asc' as const } },
  traces: { orderBy: { createdAt: 'asc' as const } },
  packages: true,
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    include: RESERVATION_INCLUDE,
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(reservation)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const existing = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { hotelId: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    guestName,
    nationality,
    passportNumber,
    vipStatus,
    company,
    companyId,
    specials,
    eta,
    flightNumber,
    visaDetails,
    turndown,
    dnm,
    source,
    bookingReference,
    adults,
    children,
  } = body

  const reservation = await prisma.reservation.update({
    where: { id: params.id },
    data: {
      ...(guestName !== undefined && { guestName }),
      ...(nationality !== undefined && { nationality }),
      ...(passportNumber !== undefined && { passportNumber }),
      ...(vipStatus !== undefined && { vipStatus }),
      ...(company !== undefined && { company }),
      ...(companyId !== undefined && { companyId: companyId || null }),
      ...(specials !== undefined && { specials }),
      ...(eta !== undefined && { eta }),
      ...(flightNumber !== undefined && { flightNumber }),
      ...(visaDetails !== undefined && { visaDetails }),
      ...(turndown !== undefined && { turndown }),
      ...(dnm !== undefined && { dnm }),
      ...(source !== undefined && { source }),
      ...(bookingReference !== undefined && { bookingReference }),
      ...(adults !== undefined && { adults }),
      ...(children !== undefined && { children }),
    },
    include: RESERVATION_INCLUDE,
  })

  return NextResponse.json(reservation)
}
