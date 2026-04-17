import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

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
  const { item, amount, date } = body

  if (!item || amount === undefined || !date) {
    return NextResponse.json({ error: 'item, amount, and date are required' }, { status: 400 })
  }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount)) {
    return NextResponse.json({ error: 'Amount must be a valid number' }, { status: 400 })
  }
  if (parsedAmount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
  }
  if (parsedAmount > 500000) {
    return NextResponse.json({ error: 'Amount exceeds maximum allowed (฿500,000)' }, { status: 400 })
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

  const payment = await prisma.charge.create({
    data: {
      reservationId: params.id,
      item,
      amount: -Math.abs(parsedAmount),
      date,
      category: 'PAYMENT',
    },
  })

  return NextResponse.json(payment, { status: 201 })
}
