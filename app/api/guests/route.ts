import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const guests = await prisma.guest.findMany({
    where: { hotelId: hotelId! },
    orderBy: { name: 'asc' },
    include: {
      reservations: {
        select: { id: true, status: true, checkIn: true, checkOut: true, roomId: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return NextResponse.json(guests)
}
