import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

export async function GET(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  const to = searchParams.get('to') ?? new Date().toISOString().split('T')[0]

  try {
    // Settled folios in date range (by settledAt)
    const fromDt = new Date(from + 'T00:00:00.000Z')
    const toDt = new Date(to + 'T23:59:59.999Z')

    const folios = await prisma.folio.findMany({
      where: {
        reservation: { hotelId: hotelId! },
        status: 'settled',
        settledAt: { gte: fromDt, lte: toDt },
      },
      include: {
        charges: {
          include: { charge: true },
        },
        reservation: {
          select: { id: true, guestName: true, companyId: true, company: { select: { id: true, name: true } } },
        },
      },
    })

    // Payment method breakdown
    const pmMap: Record<string, { count: number; amount: number }> = {}
    // Category breakdown
    const catMap: Record<string, number> = {}
    // Daily collected (by settledAt date)
    const dailyMap: Record<string, { date: string; collected: number; folios: number }> = {}

    let totalCollected = 0
    let totalFolios = 0

    for (const folio of folios) {
      const pm = folio.paymentMethod ?? 'unknown'
      const folioTotal = folio.charges.reduce((s, fc) => s + fc.charge.amount, 0)
      if (folioTotal <= 0) continue // skip zero/credit folios

      totalCollected += folioTotal
      totalFolios++

      if (!pmMap[pm]) pmMap[pm] = { count: 0, amount: 0 }
      pmMap[pm].count++
      pmMap[pm].amount += folioTotal

      for (const fc of folio.charges) {
        const cat = fc.charge.category ?? 'other'
        catMap[cat] = (catMap[cat] ?? 0) + fc.charge.amount
      }

      if (folio.settledAt) {
        const dk = folio.settledAt.toISOString().split('T')[0]
        if (!dailyMap[dk]) dailyMap[dk] = { date: dk, collected: 0, folios: 0 }
        dailyMap[dk].collected += folioTotal
        dailyMap[dk].folios++
      }
    }

    // Also fetch city ledger charges posted in range (CreditTransactions created in range)
    const cityLedgerTx = await prisma.creditTransaction.findMany({
      where: {
        hotelId: hotelId!,
        createdAt: { gte: fromDt, lte: toDt },
      },
      include: { company: { select: { id: true, name: true } } },
    })

    const cityLedgerPosted = cityLedgerTx
      .filter((t) => t.amount > 0)
      .reduce((s, t) => s + t.amount, 0)

    const cityLedgerPaid = cityLedgerTx
      .filter((t) => t.status === 'paid')
      .reduce((s, t) => s + t.amount, 0)

    // Deferred (city ledger) by company
    const deferredByCompany: Record<string, { name: string; amount: number }> = {}
    for (const tx of cityLedgerTx.filter((t) => t.amount > 0)) {
      const cid = tx.companyId
      if (!deferredByCompany[cid]) deferredByCompany[cid] = { name: tx.company.name, amount: 0 }
      deferredByCompany[cid].amount += tx.amount
    }

    return NextResponse.json({
      summary: {
        totalCollected,
        totalFolios,
        cityLedgerPosted,
        cityLedgerPaid,
        cityLedgerOutstanding: cityLedgerPosted - cityLedgerPaid,
      },
      byPaymentMethod: Object.entries(pmMap)
        .map(([method, v]) => ({ method, ...v }))
        .sort((a, b) => b.amount - a.amount),
      byCategory: Object.entries(catMap)
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount),
      daily: Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)),
      deferredByCompany: Object.entries(deferredByCompany)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.amount - a.amount),
    })
  } catch (err) {
    console.error('[GET /api/reports/revenue] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
