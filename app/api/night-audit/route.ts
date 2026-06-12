import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

function today() {
  return new Date().toISOString().split('T')[0]
}

export async function GET(_req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const audit = await prisma.nightAudit.findUnique({
    where: { hotelId_businessDate: { hotelId: hotelId!, businessDate: today() } },
  })
  return NextResponse.json({ ran: !!audit, audit: audit ?? null })
}

export async function POST(_req: NextRequest) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'POST_PAYMENT')) {
    return NextResponse.json({ error: 'Forbidden — manager or admin required' }, { status: 403 })
  }

  const businessDate = today()

  // Idempotency — reject if already ran today
  const existing = await prisma.nightAudit.findUnique({
    where: { hotelId_businessDate: { hotelId: hotelId!, businessDate } },
  })
  if (existing) {
    return NextResponse.json(
      { error: `Night audit already ran for ${businessDate} — ${existing.chargesPosted} charge(s) posted at ${existing.createdAt}` },
      { status: 409 }
    )
  }

  // Get all checked-in reservations
  const reservations = await prisma.reservation.findMany({
    where: { hotelId: hotelId!, status: 'checked_in' },
    select: { id: true, roomId: true, roomTypeId: true, rate: true, guestName: true },
  })

  if (reservations.length === 0) {
    return NextResponse.json({ error: 'No checked-in reservations — nothing to post' }, { status: 400 })
  }

  // Post room charges in a transaction
  const charges = reservations.map((res) => ({
    reservationId: res.id,
    item: `Room Charge — ${res.roomId} (${res.roomTypeId})`,
    amount: res.rate,
    date: businessDate,
    category: 'ROOM',
  }))

  const totalAmount = charges.reduce((sum, c) => sum + c.amount, 0)
  const runBy = (session!.user as any).email ?? 'unknown'

  await prisma.$transaction([
    prisma.charge.createMany({ data: charges }),
    prisma.nightAudit.create({
      data: {
        hotelId: hotelId!,
        businessDate,
        chargesPosted: charges.length,
        totalAmount,
        runBy,
      },
    }),
  ])

  // Link the new charges to existing Main folios so they appear in print immediately
  const [newCharges, mainFolios] = await Promise.all([
    prisma.charge.findMany({
      where: {
        reservationId: { in: reservations.map((r) => r.id) },
        date: businessDate,
        category: 'ROOM',
        item: { startsWith: 'Room Charge —' },
        folioCharge: null,
      },
      select: { id: true, reservationId: true },
    }),
    prisma.folio.findMany({
      where: { reservationId: { in: reservations.map((r) => r.id) }, name: 'Main' },
      select: { id: true, reservationId: true },
    }),
  ])

  if (newCharges.length > 0 && mainFolios.length > 0) {
    const folioByRes = new Map(mainFolios.map((f) => [f.reservationId, f.id]))
    const links = newCharges
      .filter((c) => folioByRes.has(c.reservationId))
      .map((c) => ({ folioId: folioByRes.get(c.reservationId)!, chargeId: c.id }))
    if (links.length > 0) {
      await prisma.folioCharge.createMany({ data: links, skipDuplicates: true })
    }
  }

  return NextResponse.json({
    ok: true,
    businessDate,
    chargesPosted: charges.length,
    totalAmount,
    runBy,
    reservations: reservations.map((r) => ({ id: r.id, guestName: r.guestName, roomId: r.roomId, amount: r.rate })),
  })
}
