import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'
import { calculateNights } from '@/lib/utils'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

// Early departure: pull the check-out date forward so billing reflects the
// nights actually stayed instead of the original booking.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'EXTEND_STAY')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { newCheckOut } = body

  if (!newCheckOut || !DATE_REGEX.test(newCheckOut)) {
    return NextResponse.json({ error: 'newCheckOut must be in YYYY-MM-DD format' }, { status: 400 })
  }

  try {
    const reservation = await prisma.reservation.findUnique({ where: { id: params.id } })
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }
    if (reservation.hotelId !== hotelId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (reservation.status !== 'checked_in') {
      return NextResponse.json({ error: 'Only in-house reservations can be shortened' }, { status: 400 })
    }
    if (newCheckOut <= reservation.checkIn) {
      return NextResponse.json({ error: 'New check-out must be after check-in' }, { status: 400 })
    }
    if (newCheckOut >= reservation.checkOut) {
      return NextResponse.json({ error: 'New check-out must be earlier than the current one — use Extend Stay to lengthen' }, { status: 400 })
    }

    const newTotalNights = calculateNights(reservation.checkIn, newCheckOut)
    const updated = await prisma.reservation.update({
      where: { id: params.id },
      data: {
        checkOut: newCheckOut,
        totalNights: newTotalNights,
        totalAmount: reservation.rate * newTotalNights,
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[POST /api/reservations/[id]/shorten] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
