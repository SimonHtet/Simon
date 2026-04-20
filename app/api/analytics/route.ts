import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0]

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        hotelId: hotelId!,
        status: { in: ['checked_in', 'checked_out'] },
        checkIn: { lte: to },
        checkOut: { gte: from },
      },
      include: { charges: true, company: { select: { id: true, name: true, type: true } } },
    })

    const rooms = await prisma.room.findMany({ where: { hotelId: hotelId! } })
    const totalRooms = rooms.length

    // Build daily map between from and to dates
    const days: Record<string, { date: string; revenue: number; occupied: number; arrivals: number; departures: number }> = {}
    const cur = new Date(from)
    const end = new Date(to)
    while (cur <= end) {
      const d = cur.toISOString().split('T')[0]
      days[d] = { date: d, revenue: 0, occupied: 0, arrivals: 0, departures: 0 }
      cur.setDate(cur.getDate() + 1)
    }

    let totalRevenue = 0
    let totalNights = 0
    let totalRoomNights = 0
    const sourceMap: Record<string, number> = {}
    const companyMap: Record<string, { name: string; type: string; revenue: number; nights: number }> = {}
    const roomTypeMap: Record<string, { revenue: number; nights: number }> = {}

    for (const res of reservations) {
      const ciDate = new Date(res.checkIn)
      const coDate = new Date(res.checkOut)
      const resSource = res.source ?? 'Direct'
      sourceMap[resSource] = (sourceMap[resSource] ?? 0) + 1

      if (res.companyId && res.company) {
        if (!companyMap[res.companyId]) {
          companyMap[res.companyId] = { name: res.company.name, type: res.company.type, revenue: 0, nights: 0 }
        }
        companyMap[res.companyId].revenue += res.totalAmount
        companyMap[res.companyId].nights += res.totalNights
      }

      const rt = res.roomTypeId
      if (!roomTypeMap[rt]) roomTypeMap[rt] = { revenue: 0, nights: 0 }
      roomTypeMap[rt].revenue += res.totalAmount
      roomTypeMap[rt].nights += res.totalNights

      // Arrivals and departures
      const ciStr = res.checkIn
      const coStr = res.checkOut
      if (days[ciStr]) days[ciStr].arrivals++
      if (days[coStr]) days[coStr].departures++

      // Per-night revenue and occupancy
      const d2 = new Date(from)
      const d3 = new Date(to)
      const nightStart = ciDate < d2 ? d2 : ciDate
      const nightEnd = coDate > d3 ? d3 : coDate

      let nightCur = new Date(nightStart)
      while (nightCur < nightEnd) {
        const dk = nightCur.toISOString().split('T')[0]
        if (days[dk]) {
          days[dk].revenue += res.rate
          days[dk].occupied++
        }
        totalRevenue += res.rate
        totalNights++
        totalRoomNights++
        nightCur.setDate(nightCur.getDate() + 1)
      }
    }

    const dayCount = Object.keys(days).length || 1
    const avgOccupancy = totalRoomNights / (totalRooms * dayCount)
    const avgRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0
    const revPar = totalRevenue / (totalRooms * dayCount)

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalReservations: reservations.length,
        avgOccupancy: Math.round(avgOccupancy * 100),
        avgRate: Math.round(avgRate),
        revPar: Math.round(revPar),
        totalRoomNights,
      },
      daily: Object.values(days),
      bySource: Object.entries(sourceMap).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count),
      byCompany: Object.values(companyMap).sort((a, b) => b.revenue - a.revenue),
      byRoomType: Object.entries(roomTypeMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.revenue - a.revenue),
    })
  } catch (err) {
    console.error('[GET /api/analytics] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
