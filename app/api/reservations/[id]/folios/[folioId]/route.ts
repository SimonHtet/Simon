import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; folioId: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const folioId = parseInt(params.folioId, 10)
  if (isNaN(folioId)) return NextResponse.json({ error: 'Invalid folioId' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { name, paymentMethod, status } = body

  try {
    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      include: { reservation: { select: { hotelId: true } } },
    })
    if (!folio || folio.reservation.hotelId !== hotelId || folio.reservationId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await prisma.folio.update({
      where: { id: folioId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod || null }),
        ...(status !== undefined && {
          status,
          settledAt: status === 'settled' ? new Date() : null,
        }),
      },
      include: { charges: { include: { charge: true } } },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /folios/[folioId]]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
