import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const reservation = await prisma.reservation.findUnique({
    where: { id: params.id },
    select: { hotelId: true },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (reservation.hotelId !== hotelId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')

  if (!category) {
    return NextResponse.json({ error: 'category query param required' }, { status: 400 })
  }

  const result = await prisma.charge.deleteMany({
    where: {
      reservationId: params.id,
      category,
      amount: { gt: 0 },
    },
  })

  return NextResponse.json({ deleted: result.count })
}
