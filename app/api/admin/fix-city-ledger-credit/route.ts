import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

// ONE-TIME migration: back-fill creditUsed for city_ledger CreditTransactions
// that were created before the fix. Hit POST once, then delete this file.
export async function POST() {
  const { role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (role !== 'admin' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Sum unpaid city_ledger transactions per company (company_credit was already tracked)
  const groups = await prisma.creditTransaction.groupBy({
    by: ['companyId'],
    where: { type: 'city_ledger', status: 'unpaid', amount: { gt: 0 } },
    _sum: { amount: true },
  })

  if (groups.length === 0) {
    return NextResponse.json({ message: 'Nothing to fix — no unpaid city ledger transactions found', updated: [] })
  }

  const updated: { companyId: string; delta: number; newCreditUsed: number }[] = []

  for (const g of groups) {
    const delta = g._sum.amount ?? 0
    if (delta <= 0) continue
    const company = await prisma.company.update({
      where: { id: g.companyId },
      data: { creditUsed: { increment: delta } },
      select: { id: true, name: true, creditUsed: true },
    })
    updated.push({ companyId: company.id, delta, newCreditUsed: company.creditUsed })
  }

  return NextResponse.json({ message: `Fixed ${updated.length} company/companies`, updated })
}
