import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const rooms = await prisma.room.findMany({
      where: { hotelId: hotelId! },
      orderBy: [{ floor: 'asc' }, { id: 'asc' }],
    })
    return NextResponse.json(rooms)
  } catch (err) {
    console.error('[/api/rooms] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
