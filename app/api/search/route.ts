import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

// Global search — guests by name, reservations by number, rooms by id
export async function GET(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json([])

  try {
    const results = await prisma.reservation.findMany({
      where: {
        hotelId: hotelId!,
        OR: [
          { guestName: { contains: q, mode: 'insensitive' } },
          { reservationNumber: { contains: q, mode: 'insensitive' } },
          { roomId: { equals: q } },
        ],
      },
      select: {
        id: true,
        reservationNumber: true,
        guestName: true,
        roomId: true,
        status: true,
        checkIn: true,
        checkOut: true,
      },
      orderBy: [{ status: 'asc' }, { checkIn: 'desc' }],
      take: 8,
    })
    return NextResponse.json(results)
  } catch (err) {
    console.error('[GET /api/search] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
