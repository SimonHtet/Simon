import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

// POST — create default "Main" folio and assign all unassigned charges to it
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { hotelId: true, charges: true, folios: true },
    })
    if (!reservation || reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // If a "Main" folio already exists, return it
    const existing = reservation.folios.find((f) => f.name === 'Main')
    if (existing) {
      const folio = await prisma.folio.findUnique({
        where: { id: existing.id },
        include: { charges: { include: { charge: true } } },
      })
      return NextResponse.json(folio)
    }

    // Create "Main" folio
    const mainFolio = await prisma.folio.create({
      data: { reservationId: params.id, name: 'Main' },
    })

    // Assign all unassigned charges to Main folio
    const assignedChargeIds = await prisma.folioCharge.findMany({
      where: { charge: { reservationId: params.id } },
      select: { chargeId: true },
    })
    const assignedSet = new Set(assignedChargeIds.map((fc) => fc.chargeId))
    const unassigned = reservation.charges.filter((c) => !assignedSet.has(c.id))

    if (unassigned.length > 0) {
      await prisma.folioCharge.createMany({
        data: unassigned.map((c) => ({ folioId: mainFolio.id, chargeId: c.id })),
        skipDuplicates: true,
      })
    }

    const folio = await prisma.folio.findUnique({
      where: { id: mainFolio.id },
      include: { charges: { include: { charge: true } } },
    })
    return NextResponse.json(folio)
  } catch (err) {
    console.error('[POST /folios/init]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
