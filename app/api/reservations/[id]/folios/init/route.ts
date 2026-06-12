import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

// POST — ensure a "Main" folio exists and all unassigned charges are on it.
// Caller (CheckOutModal) discards the response and re-fetches /folios, so we
// return only { ok, folioId } and skip the heavy nested re-read.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    // Round-trip 1: ownership check + existing Main folio + unassigned
    // charge IDs, all in parallel.
    const [reservation, unassigned] = await Promise.all([
      prisma.reservation.findUnique({
        where: { id: params.id },
        select: {
          hotelId: true,
          folios: { where: { name: 'Main' }, select: { id: true } },
        },
      }),
      // folioCharge is a one-to-one back-relation on Charge, so `folioCharge: null`
      // lets the DB return unassigned charges in a single indexed query.
      prisma.charge.findMany({
        where: { reservationId: params.id, folioCharge: null },
        select: { id: true },
      }),
    ])

    if (!reservation || reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let mainFolioId = reservation.folios[0]?.id

    // Round-trip 2 (only if Main is missing): create it.
    if (!mainFolioId) {
      const created = await prisma.folio.create({
        data: { reservationId: params.id, name: 'Main' },
        select: { id: true },
      })
      mainFolioId = created.id
    }

    // Round-trip 3 (only if there are unassigned charges): bulk-link.
    if (unassigned.length > 0) {
      await prisma.folioCharge.createMany({
        data: unassigned.map((c) => ({ folioId: mainFolioId!, chargeId: c.id })),
        skipDuplicates: true,
      })
    }

    // Return the full folio list so the caller skips a separate GET /folios round trip.
    const folios = await prisma.folio.findMany({
      where: { reservationId: params.id },
      include: { charges: { include: { charge: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ ok: true, folioId: mainFolioId, folios })
  } catch (err) {
    console.error('[POST /folios/init]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
