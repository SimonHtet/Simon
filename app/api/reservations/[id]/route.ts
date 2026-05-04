import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

const RESERVATION_INCLUDE = {
  guest: true,
  room: true,
  company: true,
  charges: { orderBy: { createdAt: 'asc' as const } },
  traces: { orderBy: { createdAt: 'asc' as const } },
  packages: true,
  preferences: true,
  folios: { include: { charges: { include: { charge: true } } } },
  linkedReservations: { select: { id: true, reservationNumber: true, guestName: true, roomId: true, checkIn: true, checkOut: true, status: true } },
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
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
  } catch (err) {
    console.error('[GET /api/reservations/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
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

    const body = await req.json().catch(() => ({}))
    const {
      guestName,
      nationality,
      passportNumber,
      vipStatus,
      company,
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
      preferredName,
      birthday,
      passportExpiry,
      language,
      memberNumber,
      city,
      country,
      notes,
    } = body

    const reservation = await prisma.reservation.update({
      where: { id: params.id },
      data: {
        ...(guestName !== undefined && { guestName }),
        ...(nationality !== undefined && { nationality }),
        ...(passportNumber !== undefined && { passportNumber }),
        ...(vipStatus !== undefined && { vipStatus }),
        ...(company !== undefined && { company }),
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
        ...(preferredName !== undefined && { preferredName }),
        ...(birthday !== undefined && { birthday }),
        ...(passportExpiry !== undefined && { passportExpiry }),
        ...(language !== undefined && { language }),
        ...(memberNumber !== undefined && { memberNumber }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
        ...(notes !== undefined && { notes }),
      },
      include: RESERVATION_INCLUDE,
    })

    return NextResponse.json(reservation)
  } catch (err) {
    console.error('[PUT /api/reservations/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
