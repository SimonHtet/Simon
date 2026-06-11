import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { generateReservationNumber, calculateNights, maskPassport } from '@/lib/utils'

const ACTIVE_STATUSES = ['confirmed', 'checked_in']
const DEFAULT_LIST_DAYS_BACK = 30
const MAX_LIST_LIMIT = 2000

// Full include — used for POST response and single-record endpoints
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

// Slim select — list endpoints only (no charges/packages/folios/guest record)
const RESERVATION_LIST_SELECT = {
  id: true,
  reservationNumber: true,
  hotelId: true,
  guestId: true,
  guestName: true,
  nationality: true,
  passportNumber: true,
  roomId: true,
  roomTypeId: true,
  status: true,
  checkIn: true,
  checkOut: true,
  rate: true,
  totalNights: true,
  totalAmount: true,
  adults: true,
  children: true,
  source: true,
  vipStatus: true,
  companyId: true,
  specials: true,
  eta: true,
  isMaster: true,
  masterResId: true,
  createdAt: true,
  updatedAt: true,
  room: { select: { id: true, floor: true, type: true, status: true } },
  company: { select: { id: true, name: true } },
  traces: { where: { status: 'pending' as const }, select: { id: true } },
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

export async function GET(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const statusParam = searchParams.get('status')
  const includeAll = searchParams.get('includeAll') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '500') || 500, MAX_LIST_LIMIT)

  const where: Prisma.ReservationWhereInput = { hotelId: hotelId! }

  if (statusParam) {
    const statuses = statusParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (statuses.length) where.status = { in: statuses }
  } else if (!includeAll) {
    where.OR = [
      { status: { in: ACTIVE_STATUSES } },
      {
        checkOut: {
          gte: from ?? new Date(Date.now() - DEFAULT_LIST_DAYS_BACK * 86400000).toISOString().split('T')[0],
        },
      },
    ]
  }

  if (from && !where.OR) where.checkOut = { gte: from }
  if (to) where.checkIn = { ...(where.checkIn as object | undefined), lte: to }

  try {
    const reservations = await prisma.reservation.findMany({
      where,
      select: RESERVATION_LIST_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const masked = reservations.map((r) => ({
      ...r,
      passportNumber: maskPassport(r.passportNumber),
    }))

    return NextResponse.json(masked)
  } catch (err) {
    console.error('[/api/reservations] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'CREATE_RESERVATION')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    guestName,
    firstName,
    lastName,
    nationality,
    email,
    phone,
    passportNumber,
    vipStatus,
    companyId,
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

  try {
    // Match by stable identifiers only — never fall back to name alone to avoid
    // merging two different guests who happen to share a name.
    const stableIds: Prisma.GuestWhereInput[] = []
    if (passportNumber) stableIds.push({ passportNumber })
    if (email) stableIds.push({ email })
    if (phone) stableIds.push({ phone })

    let guest = stableIds.length > 0
      ? await prisma.guest.findFirst({ where: { hotelId: hotelId!, OR: stableIds } })
      : null

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

    // No double-booking — reject if an active reservation overlaps these dates
    const conflict = await prisma.reservation.findFirst({
      where: {
        roomId,
        status: { in: ACTIVE_STATUSES },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
      select: { reservationNumber: true, guestName: true, checkIn: true, checkOut: true },
    })
    if (conflict) {
      return NextResponse.json(
        { error: `Room ${roomId} is already booked ${conflict.checkIn} → ${conflict.checkOut} (${conflict.reservationNumber})` },
        { status: 409 }
      )
    }

    // Retry on the rare reservationNumber collision via unique-constraint error
    const buildResData = (reservationNumber: string) => ({
      reservationNumber,
      hotelId: hotelId!,
      guestId: guest!.id,
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
      companyId: companyId || null,
      specials: specials || null,
      eta: eta || null,
      flightNumber: flightNumber || null,
      isMaster: false,
    })

    let reservation
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        reservation = await prisma.$transaction(async (tx) => {
          const created = await tx.reservation.create({
            data: buildResData(generateReservationNumber()),
            include: RESERVATION_INCLUDE,
          })
          if (status === 'checked_in') {
            await tx.room.update({
              where: { id: roomId },
              data: { status: 'occupied', resId: created.id },
            })
          }
          return created
        })
        break
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue
        throw e
      }
    }

    if (!reservation) {
      return NextResponse.json({ error: 'Could not allocate reservation number' }, { status: 500 })
    }

    return NextResponse.json(reservation, { status: 201 })
  } catch (err) {
    console.error('[POST /api/reservations] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
