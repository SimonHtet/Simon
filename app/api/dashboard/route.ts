import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const today = new Date().toISOString().split('T')[0]

  const [
    todayArrivalsCount,
    todayDeparturesCount,
    inHouseCount,
    availableRoomsCount,
    totalRoomsCount,
    pendingTracesCount,
  ] = await Promise.all([
    prisma.reservation.count({
      where: { hotelId: hotelId!, checkIn: today, status: 'confirmed' },
    }),
    prisma.reservation.count({
      where: { hotelId: hotelId!, checkOut: today, status: 'checked_in' },
    }),
    prisma.reservation.count({
      where: { hotelId: hotelId!, status: 'checked_in' },
    }),
    prisma.room.count({
      where: { hotelId: hotelId!, status: 'available' },
    }),
    prisma.room.count({
      where: { hotelId: hotelId! },
    }),
    prisma.trace.count({
      where: { status: 'pending', reservation: { hotelId: hotelId! } },
    }),
  ])

  const occupancyRate =
    totalRoomsCount > 0
      ? Math.round((inHouseCount / totalRoomsCount) * 100)
      : 0

  return NextResponse.json({
    todayArrivals: todayArrivalsCount,
    todayDepartures: todayDeparturesCount,
    inHouse: inHouseCount,
    availableRooms: availableRoomsCount,
    totalRooms: totalRoomsCount,
    occupancyRate,
    pendingTraces: pendingTracesCount,
  })
}
