import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0]
  const compareYear = searchParams.get('compareYear')

  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        hotelId: hotelId!,
        status: { in: ['checked_in', 'checked_out'] },
        checkIn: { lte: to },
        checkOut: { gte: from },
      },
      include: {
        charges: true,
        company: { select: { id: true, name: true, type: true } },
      },
    })

    const rooms = await prisma.room.findMany({ where: { hotelId: hotelId! } })
    const totalRooms = rooms.length

    function buildDailyMap(rangeFrom: string, rangeTo: string, rsvs: typeof reservations) {
      const days: Record<string, {
        date: string; roomRevenue: number; extraCharges: number; payments: number; netTotal: number
        occupied: number; arrivals: number; departures: number
      }> = {}
      const cur = new Date(rangeFrom)
      const end = new Date(rangeTo)
      while (cur <= end) {
        const d = cur.toISOString().split('T')[0]
        days[d] = { date: d, roomRevenue: 0, extraCharges: 0, payments: 0, netTotal: 0, occupied: 0, arrivals: 0, departures: 0 }
        cur.setDate(cur.getDate() + 1)
      }

      for (const res of rsvs) {
        const ciDate = new Date(res.checkIn)
        const coDate = new Date(res.checkOut)
        if (days[res.checkIn]) days[res.checkIn].arrivals++
        if (days[res.checkOut]) days[res.checkOut].departures++

        const nightStart = ciDate < new Date(rangeFrom) ? new Date(rangeFrom) : ciDate
        const nightEnd = coDate > new Date(rangeTo) ? new Date(rangeTo) : coDate
        let nc = new Date(nightStart)
        while (nc < nightEnd) {
          const dk = nc.toISOString().split('T')[0]
          if (days[dk]) {
            days[dk].roomRevenue += res.rate
            days[dk].occupied++
          }
          nc.setDate(nc.getDate() + 1)
        }

        // Extra charges and payments by date
        for (const charge of res.charges) {
          if (days[charge.date]) {
            if (charge.amount > 0) days[charge.date].extraCharges += charge.amount
            else days[charge.date].payments += Math.abs(charge.amount)
          }
        }
      }

      for (const d of Object.values(days)) {
        d.netTotal = d.roomRevenue + d.extraCharges - d.payments
      }
      return days
    }

    const days = buildDailyMap(from, to, reservations)

    let totalRevenue = 0
    let totalRoomNights = 0
    const sourceMap: Record<string, number> = {}
    const companyMap: Record<string, {
      id: string; name: string; type: string; revenue: number; nights: number
      reservationCount: number; lastStay: string
    }> = {}
    const roomTypeMap: Record<string, { revenue: number; nights: number }> = {}

    for (const res of reservations) {
      const ciDate = new Date(res.checkIn)
      const coDate = new Date(res.checkOut)
      const resSource = res.source ?? 'Direct'
      sourceMap[resSource] = (sourceMap[resSource] ?? 0) + 1

      if (res.companyId && res.company) {
        if (!companyMap[res.companyId]) {
          companyMap[res.companyId] = {
            id: res.companyId,
            name: res.company.name,
            type: res.company.type,
            revenue: 0, nights: 0, reservationCount: 0, lastStay: '',
          }
        }
        companyMap[res.companyId].revenue += res.totalAmount
        companyMap[res.companyId].nights += res.totalNights
        companyMap[res.companyId].reservationCount++
        if (!companyMap[res.companyId].lastStay || res.checkOut > companyMap[res.companyId].lastStay) {
          companyMap[res.companyId].lastStay = res.checkOut
        }
      }

      const rt = res.roomTypeId
      if (!roomTypeMap[rt]) roomTypeMap[rt] = { revenue: 0, nights: 0 }
      roomTypeMap[rt].revenue += res.totalAmount
      roomTypeMap[rt].nights += res.totalNights

      const nightStart = ciDate < new Date(from) ? new Date(from) : ciDate
      const nightEnd = coDate > new Date(to) ? new Date(to) : coDate
      let nc = new Date(nightStart)
      while (nc < nightEnd) {
        totalRevenue += res.rate
        totalRoomNights++
        nc.setDate(nc.getDate() + 1)
      }
    }

    const dayCount = Object.keys(days).length || 1
    const avgOccupancy = totalRoomNights / (totalRooms * dayCount)
    const avgRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0
    const revPar = totalRevenue / (totalRooms * dayCount)

    const allCompanies = Object.values(companyMap)
    const companiesRevenue = allCompanies
      .filter((c) => c.type === 'COMPANY')
      .map((c) => ({ ...c, avgRate: c.nights > 0 ? Math.round(c.revenue / c.nights) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
    const agentsRevenue = allCompanies
      .filter((c) => c.type === 'AGENT')
      .map((c) => ({ ...c, avgRate: c.nights > 0 ? Math.round(c.revenue / c.nights) : 0 }))
      .sort((a, b) => b.revenue - a.revenue)

    // Compare year support
    let lastYearDaily: typeof Object.values(days) | null = null
    if (compareYear) {
      const yearDiff = new Date(from).getFullYear() - parseInt(compareYear)
      const lyFrom = new Date(from)
      lyFrom.setFullYear(lyFrom.getFullYear() - yearDiff)
      const lyTo = new Date(to)
      lyTo.setFullYear(lyTo.getFullYear() - yearDiff)
      const lyFromStr = lyFrom.toISOString().split('T')[0]
      const lyToStr = lyTo.toISOString().split('T')[0]

      const lyReservations = await prisma.reservation.findMany({
        where: {
          hotelId: hotelId!,
          status: { in: ['checked_in', 'checked_out'] },
          checkIn: { lte: lyToStr },
          checkOut: { gte: lyFromStr },
        },
        include: { charges: true },
      })

      const lyDays = buildDailyMap(lyFromStr, lyToStr, lyReservations as any)
      lastYearDaily = Object.values(lyDays)
    }

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
      byCompany: allCompanies.sort((a, b) => b.revenue - a.revenue),
      byRoomType: Object.entries(roomTypeMap).map(([type, v]) => ({ type, ...v })).sort((a, b) => b.revenue - a.revenue),
      companiesRevenue,
      agentsRevenue,
      ...(lastYearDaily !== null ? { lastYearDaily } : {}),
    })
  } catch (err) {
    console.error('[GET /api/analytics] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
