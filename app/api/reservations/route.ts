import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { generateReservationNumber, calculateNights, maskPassport } from '@/lib/utils'

const RESERVATION_INCLUDE = {
  guest: true,
  room: true,
  charges: { orderBy: { createdAt: 'asc' as const } },
  traces: { orderBy: { createdAt: 'asc' as const } },
  packages: true,
}

const MAX_LENGTHS: Record<string, number> = {
  guestName: 100,
  source: 50,
  bookingReference: 100,
  specials: 500,
  eta: 10,
  flightNumber: 20,
  visaDetails: 200,
}

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const reservations = await prisma.reservation.findMany({
    where: { hotelId: hotelId! },
    include: RESERVATION_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  const masked = reservations.map((r) => ({
    ...r,
    passportNumber: maskPassport(r.passportNumber),
    guest: r.guest
      ? { ...r.guest, passportNumber: maskPassport(r.guest.passportNumber) }
      : null,
  }))

  return NextResponse.json(masked)
}

export async function POST(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'CREATE_RESERVATION')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const {
    guestName,
    firstName,
    lastName,
    nationality,
    email,
    phone,
    passportNumber,
    vipStatus,
    company,
    roomId,
    roomTypeId,
    checkIn,
    checkOut,
    rate,
    adults = 1,
    children = 0,
    source,
    bookingReference,
    specials,
    eta,
    flightNumber,
    status = 'confirmed',
  } = body

  // Length validation
  for (const [field, max] of Object.entries(MAX_LENGTHS)) {
    const value = body[field]
    if (value && typeof value === 'string' && value.length > max) {
      return NextResponse.json(
        { error: `${field} exceeds maximum length of ${max} characters` },
        { status: 400 }
      )
    }
  }

  // Adults / children validation
  const parsedAdults = parseInt(adults)
  if (isNaN(parsedAdults) || parsedAdults < 1 || parsedAdults > 20) {
    return NextResponse.json({ error: 'Adults must be between 1 and 20' }, { status: 400 })
  }
  const parsedChildren = parseInt(children)
  if (isNaN(parsedChildren) || parsedChildren < 0 || parsedChildren > 10) {
    return NextResponse.json({ error: 'Children must be between 0 and 10' }, { status: 400 })
  }

  if (!guestName || !roomId || !checkIn || !checkOut || !rate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const totalNights = calculateNights(checkIn, checkOut)
  const totalAmount = rate * totalNights

  // Upsert guest scoped to this hotel
  let guest = await prisma.guest.findFirst({
    where: { name: guestName, hotelId: hotelId! },
  })

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        name: guestName,
        firstName: firstName || null,
        lastName: lastName || null,
        nationality: nationality || null,
        email: email || null,
        phone: phone || null,
        passportNumber: passportNumber || null,
        vipStatus: vipStatus || null,
        company: company || null,
        hotelId: hotelId!,
      },
    })
  }

  // Room must belong to this hotel
  const room = await prisma.room.findFirst({
    where: { id: roomId, hotelId: hotelId! },
  })
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  let reservationNumber = generateReservationNumber()
  let existing = await prisma.reservation.findUnique({ where: { reservationNumber } })
  while (existing) {
    reservationNumber = generateReservationNumber()
    existing = await prisma.reservation.findUnique({ where: { reservationNumber } })
  }

  const reservation = await prisma.reservation.create({
    data: {
      reservationNumber,
      hotelId: hotelId!,
      guestId: guest.id,
      guestName,
      nationality: nationality || null,
      roomId,
      roomTypeId: roomTypeId || room.type,
      status,
      checkIn,
      checkOut,
      rate,
      totalNights,
      totalAmount,
      adults: parsedAdults,
      children: parsedChildren,
      source: source || null,
      bookingReference: bookingReference || null,
      vipStatus: vipStatus || null,
      passportNumber: passportNumber || null,
      company: company || null,
      specials: specials || null,
      eta: eta || null,
      flightNumber: flightNumber || null,
      isMaster: false,
    },
    include: RESERVATION_INCLUDE,
  })

  if (status === 'checked_in') {
    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'occupied', resId: reservation.id },
    })
  }

  return NextResponse.json(reservation, { status: 201 })
}
