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

  if (!hasPermission(role!, 'ADD_CHARGE')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { item, amount, date, category } = body

  if (typeof item !== 'string' || item.trim().length === 0) {
    return NextResponse.json({ error: 'Item description is required' }, { status: 400 })
  }
  if (item.length > 200) {
    return NextResponse.json({ error: 'Item description too long (max 200 chars)' }, { status: 400 })
  }

  const parsedAmount = parseFloat(amount)
  if (isNaN(parsedAmount)) {
    return NextResponse.json({ error: 'Amount must be a valid number' }, { status: 400 })
  }
  if (parsedAmount === 0) {
    return NextResponse.json({ error: 'Amount cannot be zero' }, { status: 400 })
  }
  if (Math.abs(parsedAmount) > 500000) {
    return NextResponse.json({ error: 'Amount exceeds maximum allowed (฿500,000)' }, { status: 400 })
  }

  if (!date || !DATE_REGEX.test(date)) {
    return NextResponse.json({ error: 'Date must be in YYYY-MM-DD format' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: params.id },
      select: { hotelId: true },
    })
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    if (reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const charge = await prisma.charge.create({
      data: {
        reservationId: params.id,
        item: item.trim(),
        amount: parsedAmount,
        date,
        category: category || null,
      },
    })

    // Auto-link to Main folio if one already exists so the charge is immediately visible in print
    const mainFolio = await prisma.folio.findFirst({
      where: { reservationId: params.id, name: 'Main' },
      select: { id: true },
    })
    if (mainFolio) {
      await prisma.folioCharge.create({ data: { folioId: mainFolio.id, chargeId: charge.id } })
    }

    return NextResponse.json(charge, { status: 201 })
  } catch (err) {
    console.error('[POST /api/reservations/[id]/charges] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
