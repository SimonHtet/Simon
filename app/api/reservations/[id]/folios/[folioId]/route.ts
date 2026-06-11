import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { calculateNights } from '@/lib/utils'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; folioId: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const folioId = parseInt(params.folioId, 10)
  if (isNaN(folioId)) return NextResponse.json({ error: 'Invalid folioId' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { name, paymentMethod, status, amountTendered } = body

  try {
    const folio = await prisma.folio.findUnique({
      where: { id: folioId },
      include: {
        charges: { include: { charge: { select: { amount: true } } } },
        reservation: { select: { hotelId: true, rate: true, checkIn: true, checkOut: true } },
      },
    })
    if (!folio || folio.reservation.hotelId !== hotelId || folio.reservationId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Settling a folio means collecting its outstanding balance — validate it
    if (status === 'settled' && folio.status !== 'settled') {
      const pm = paymentMethod ?? folio.paymentMethod
      if (!pm) {
        return NextResponse.json({ error: 'A payment method is required to settle a folio' }, { status: 400 })
      }

      // Same balance formula as the check-out modal: Main carries the room cost
      const chargesSum = folio.charges.reduce((s, fc) => s + fc.charge.amount, 0)
      const balance = folio.name.toLowerCase() === 'main'
        ? chargesSum + folio.reservation.rate * calculateNights(folio.reservation.checkIn, folio.reservation.checkOut)
        : chargesSum

      if (balance > 0) {
        if (pm === 'cash') {
          const tendered = parseFloat(amountTendered)
          if (isNaN(tendered) || tendered < balance) {
            return NextResponse.json(
              { error: `Cash tendered must cover the balance of ฿${balance.toLocaleString()}` },
              { status: 400 }
            )
          }
        }
        if (pm === 'company_credit' || pm === 'city_ledger') {
          // The balance must already be posted to the company account
          const tx = await prisma.creditTransaction.findFirst({
            where: { folioId, reservationId: params.id, amount: { gt: 0 } },
          })
          if (!tx) {
            return NextResponse.json(
              { error: 'Post the balance to the company account before settling to credit / city ledger' },
              { status: 400 }
            )
          }
        }
      }
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
