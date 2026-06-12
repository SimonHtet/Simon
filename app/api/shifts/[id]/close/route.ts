import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

// Blind cash drop: the clerk counts the drawer first, then the server reveals
// the expected figure and logs the variance.

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'CHECKOUT')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const shiftId = parseInt(params.id, 10)
  if (isNaN(shiftId)) return NextResponse.json({ error: 'Invalid shift id' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const countedCash = parseFloat(body.countedCash)
  if (isNaN(countedCash) || countedCash < 0 || countedCash > 10000000) {
    return NextResponse.json({ error: 'Counted cash must be 0 or a positive amount' }, { status: 400 })
  }
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null

  const shift = await prisma.shift.findUnique({ where: { id: shiftId } })
  if (!shift || shift.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Shift not found' }, { status: 404 })
  }
  if (shift.status !== 'open') {
    return NextResponse.json({ error: 'Shift is already closed' }, { status: 400 })
  }

  const now = new Date()

  // Cash that should be in the drawer since the shift opened:
  // 1. folios settled with cash during the window (balance = sum of folio charges)
  // 2. cash payments posted to reservations (negative PAYMENT charges)
  // 3. cash deposits taken (negative DEPOSIT charges)
  const [cashFolios, cashCharges] = await Promise.all([
    prisma.folio.findMany({
      where: {
        reservation: { hotelId: hotelId! },
        status: 'settled',
        paymentMethod: 'cash',
        settledAt: { gte: shift.openedAt, lte: now },
      },
      include: { charges: { include: { charge: { select: { amount: true } } } } },
    }),
    prisma.charge.findMany({
      where: {
        reservation: { hotelId: hotelId! },
        createdAt: { gte: shift.openedAt, lte: now },
        amount: { lt: 0 },
        OR: [
          { category: 'PAYMENT', item: { startsWith: 'Payment — Cash' } },
          { category: 'DEPOSIT', item: { startsWith: 'Deposit — Cash' } },
        ],
      },
      select: { amount: true, category: true },
    }),
  ])

  const folioCash = cashFolios.reduce((sum, f) => {
    const total = f.charges.reduce((s, fc) => s + fc.charge.amount, 0)
    return sum + Math.max(0, total)
  }, 0)
  const paymentCash = cashCharges
    .filter((c) => c.category === 'PAYMENT')
    .reduce((s, c) => s + Math.abs(c.amount), 0)
  const depositCash = cashCharges
    .filter((c) => c.category === 'DEPOSIT')
    .reduce((s, c) => s + Math.abs(c.amount), 0)

  const expectedCash = shift.openingFloat + folioCash + paymentCash + depositCash
  const variance = Math.round((countedCash - expectedCash) * 100) / 100
  const closedBy = (session!.user as any).email ?? 'unknown'

  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: {
      status: 'closed',
      closedAt: now,
      closedBy,
      expectedCash,
      countedCash,
      variance,
      notes,
    },
  })

  return NextResponse.json({
    ...updated,
    breakdown: {
      openingFloat: shift.openingFloat,
      folioCash,
      paymentCash,
      depositCash,
    },
  })
}
