import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function dateInRange(dateStr: string, startStr: string, endStr: string) {
  return dateStr >= startStr && dateStr <= endStr
}

function overlapsMonth(checkIn: string, checkOut: string, startStr: string, endStr: string) {
  return checkIn <= endStr && checkOut > startStr
}

export async function GET(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') || String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1))

  const totalDays = daysInMonth(year, month)
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`

  const [reservations, rooms, companies] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        hotelId: hotelId!,
        status: { notIn: ['cancelled', 'no_show'] },
      },
      include: { charges: true },
    }),
    prisma.room.findMany({ where: { hotelId: hotelId! } }),
    prisma.company.findMany({ where: { hotelId: hotelId! } }),
  ])

  const totalRooms = rooms.length

  // Filter reservations that overlap with the selected month
  const monthRes = reservations.filter((r) =>
    overlapsMonth(r.checkIn, r.checkOut, monthStart, monthEnd)
  )

  // For each reservation, compute room-nights actually in the month
  function nightsInMonth(checkIn: string, checkOut: string): number {
    const start = checkIn < monthStart ? monthStart : checkIn
    const end = checkOut > monthEnd ? monthEnd : checkOut
    if (start >= end) return 0
    const s = new Date(start)
    const e = new Date(end)
    return Math.round((e.getTime() - s.getTime()) / 86400000)
  }

  // KPIs
  let totalRevenue = 0
  let totalNightsSold = 0

  for (const r of monthRes) {
    const nights = nightsInMonth(r.checkIn, r.checkOut)
    totalRevenue += r.rate * nights
    totalNightsSold += nights
  }

  const totalAvailableNights = totalRooms * totalDays
  const adr = totalNightsSold > 0 ? totalRevenue / totalNightsSold : 0
  const revpar = totalAvailableNights > 0 ? totalRevenue / totalAvailableNights : 0
  const occupancyPct = totalAvailableNights > 0 ? (totalNightsSold / totalAvailableNights) * 100 : 0

  // Revenue by source
  const sourceMap = new Map<string, { reservations: number; roomNights: number; revenue: number }>()
  for (const r of monthRes) {
    const src = r.source || 'Direct'
    const nights = nightsInMonth(r.checkIn, r.checkOut)
    const rev = r.rate * nights
    const entry = sourceMap.get(src) || { reservations: 0, roomNights: 0, revenue: 0 }
    entry.reservations += 1
    entry.roomNights += nights
    entry.revenue += rev
    sourceMap.set(src, entry)
  }
  const bySource = Array.from(sourceMap.entries())
    .map(([source, data]) => ({
      source,
      ...data,
      pct: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Corporate account performance
  const companyMap = new Map<
    string,
    { name: string; stays: number; roomNights: number; revenue: number }
  >()
  for (const r of monthRes) {
    const key = r.companyId || '__direct__'
    const name =
      r.companyId
        ? companies.find((c) => c.id === r.companyId)?.name || r.company || 'Unknown'
        : r.company || 'Walk-in / Direct'
    const nights = nightsInMonth(r.checkIn, r.checkOut)
    const rev = r.rate * nights
    const entry = companyMap.get(key) || { name, stays: 0, roomNights: 0, revenue: 0 }
    entry.stays += 1
    entry.roomNights += nights
    entry.revenue += rev
    companyMap.set(key, entry)
  }
  const byCorporate = Array.from(companyMap.values())
    .map((d) => ({
      ...d,
      avgRate: d.roomNights > 0 ? d.revenue / d.roomNights : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Nationality breakdown
  const natMap = new Map<string, number>()
  for (const r of monthRes) {
    const nat = r.nationality || 'Unknown'
    natMap.set(nat, (natMap.get(nat) || 0) + 1)
  }
  const totalGuests = monthRes.length
  const byNationality = Array.from(natMap.entries())
    .map(([nationality, count]) => ({
      nationality,
      count,
      pct: totalGuests > 0 ? (count / totalGuests) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // Room type performance
  const rtMap = new Map<
    string,
    { roomsAvailable: number; nightsSold: number; revenue: number }
  >()
  const roomTypeCountMap = new Map<string, number>()
  for (const room of rooms) {
    roomTypeCountMap.set(room.type, (roomTypeCountMap.get(room.type) || 0) + 1)
  }
  for (const r of monthRes) {
    const rt = r.roomTypeId
    const nights = nightsInMonth(r.checkIn, r.checkOut)
    const rev = r.rate * nights
    const entry = rtMap.get(rt) || {
      roomsAvailable: (roomTypeCountMap.get(rt) || 0) * totalDays,
      nightsSold: 0,
      revenue: 0,
    }
    entry.nightsSold += nights
    entry.revenue += rev
    rtMap.set(rt, entry)
  }
  // ensure all room types appear
  for (const [rt, count] of roomTypeCountMap.entries()) {
    if (!rtMap.has(rt)) {
      rtMap.set(rt, { roomsAvailable: count * totalDays, nightsSold: 0, revenue: 0 })
    }
  }
  const byRoomType = Array.from(rtMap.entries())
    .map(([roomType, data]) => ({
      roomType,
      roomsAvailable: roomTypeCountMap.get(roomType) || 0,
      totalAvailableNights: data.roomsAvailable,
      nightsSold: data.nightsSold,
      occupancyPct: data.roomsAvailable > 0 ? (data.nightsSold / data.roomsAvailable) * 100 : 0,
      revenue: data.revenue,
      adr: data.nightsSold > 0 ? data.revenue / data.nightsSold : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Last 30 days trend
  const today = new Date()
  const trend: Array<{
    date: string
    roomsOccupied: number
    occupancyPct: number
    revenue: number
  }> = []

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]

    let occupied = 0
    let dayRevenue = 0

    for (const r of reservations) {
      if (r.checkIn <= dateStr && r.checkOut > dateStr) {
        occupied += 1
        dayRevenue += r.rate
      }
    }

    trend.push({
      date: dateStr,
      roomsOccupied: occupied,
      occupancyPct: totalRooms > 0 ? (occupied / totalRooms) * 100 : 0,
      revenue: dayRevenue,
    })
  }

  return NextResponse.json({
    month,
    year,
    kpi: {
      totalRevenue,
      adr,
      revpar,
      occupancyPct,
      totalNightsSold,
      totalRooms,
    },
    bySource,
    byCorporate,
    byNationality,
    byRoomType,
    trend,
  })
}
