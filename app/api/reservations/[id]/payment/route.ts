import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { altToBase, rateFor } from '@/lib/currency'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'POST_PAYMENT')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json()
  const { item, amount, date, paymentMethod, currency } = body

  if (!item || amount === undefined || !date) {
    return NextResponse.json({ error: 'item, amount, and date are required' }, { status: 400 })
  }

  let parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount)) {
    return NextResponse.json({ error: 'Amount must be a valid number' }, { status: 400 })
  }
  if (parsedAmount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }

  // Convert foreign-currency payments at the house rate server-side
  let fxNote = ''
  if (currency) {
    const setting = await prisma.hotelSetting.upsert({
      where: { id: hotelId! },
      update: {},
      create: { id: hotelId! },
    })
    const rate = rateFor(setting, currency)
    if (rate === null) {
      return NextResponse.json({ error: `No exchange rate configured for ${currency} — set it in Settings first` }, { status: 400 })
    }
    if (rate !== 1) {
      fxNote = ` (${currency} ${parsedAmount.toLocaleString()} @ ${rate})`
      parsedAmount = altToBase(parsedAmount, rate)
    }
  }

  if (parsedAmount > 500000) {
    return NextResponse.json({ error: 'Amount exceeds maximum allowed (500,000)' }, { status: 400 })
  }

  if (!DATE_REGEX.test(date)) {
    return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 })
  }

  const reservation = await prisma.reservation.findUnique({ where: { id: params.id } })
  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isCityLedger = paymentMethod === 'City Ledger'

  const payment = await prisma.$transaction(async (db) => {
    const charge = await db.charge.create({
      data: {
        reservationId: params.id,
        item: `${item}${fxNote}`,
        amount: -Math.abs(parsedAmount),
        date,
        category: 'PAYMENT',
      },
    })

    if (isCityLedger && reservation.companyId) {
      await db.creditTransaction.create({
        data: {
          companyId: reservation.companyId,
          hotelId: hotelId!,
          amount: parsedAmount,
          description: `Post Payment — Res ${reservation.id}`,
          reservationId: params.id,
          type: 'city_ledger',
          status: 'unpaid',
        },
      })
      await db.company.update({
        where: { id: reservation.companyId },
        data: { creditUsed: { increment: parsedAmount } },
      })
    }

    return charge
  })

  return NextResponse.json(payment, { status: 201 })
}
