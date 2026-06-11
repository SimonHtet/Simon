import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    let company = await prisma.company.findFirst({
      where: { id: params.id, hotelId: hotelId! },
    })
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Monthly reset check
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const todayDay = today.getDate()
    const thisMonth = todayStr.substring(0, 7)
    const lastResetMonth = company.lastCreditReset?.substring(0, 7)

    if (todayDay >= company.creditResetDay && lastResetMonth !== thisMonth) {
      company = await prisma.company.update({
        where: { id: params.id },
        data: { creditUsed: 0, lastCreditReset: todayStr },
      })
    }

    const transactions = await prisma.creditTransaction.findMany({
      where: { companyId: params.id, hotelId: hotelId! },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      creditLimit: company.creditLimit,
      creditUsed: company.creditUsed,
      creditAvailable: Math.max(0, company.creditLimit - company.creditUsed),
      transactions,
    })
  } catch (err) {
    console.error('[GET /companies/[id]/credit]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  // Front desk needs this to settle folios to company credit at checkout
  if (!hasPermission(role!, 'ADD_CHARGE')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { amount, description, reservationId, folioId, type = 'company_credit', override = false } = body
  const isCityLedger = type === 'city_ledger'

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 })
  }
  if (!description?.trim()) {
    return NextResponse.json({ error: 'description is required' }, { status: 400 })
  }

  try {
    const company = await prisma.company.findFirst({
      where: { id: params.id, hotelId: hotelId! },
    })
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (company.creditLimit > 0) {
      const creditAvailable = Math.max(0, company.creditLimit - company.creditUsed)
      // Managers can override the limit; the transaction is still recorded so
      // the receivable is never lost.
      const managerOverride = override === true && (role === 'admin' || role === 'manager')
      if (creditAvailable < amount && !managerOverride) {
        return NextResponse.json(
          { error: `Insufficient credit — ฿${creditAvailable.toLocaleString()} available` },
          { status: 400 }
        )
      }
    }

    const tx = await prisma.$transaction(async (db) => {
      const created = await db.creditTransaction.create({
        data: {
          companyId: params.id,
          hotelId: hotelId!,
          amount,
          description: description.trim(),
          reservationId: reservationId ?? null,
          folioId: folioId ?? null,
          type,
          status: 'unpaid',
        },
      })
      await db.company.update({
        where: { id: params.id },
        data: { creditUsed: { increment: amount } },
      })
      return created
    })

    return NextResponse.json(tx, { status: 201 })
  } catch (err) {
    console.error('[POST /companies/[id]/credit]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// PATCH — settle all unpaid transactions for this company
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'POST_PAYMENT')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  try {
    const company = await prisma.company.findFirst({ where: { id: params.id, hotelId: hotelId! } })
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const unpaid = await prisma.creditTransaction.findMany({
      where: { companyId: params.id, status: 'unpaid', amount: { gt: 0 } },
    })
    if (unpaid.length === 0) return NextResponse.json({ settled: 0, totalAmount: 0 })

    const totalAmount = unpaid.reduce((s, t) => s + t.amount, 0)

    await prisma.$transaction(async (db) => {
      await db.creditTransaction.updateMany({
        where: { companyId: params.id, status: 'unpaid', amount: { gt: 0 } },
        data: { status: 'paid', paidAt: new Date() },
      })
      if (totalAmount > 0) {
        await db.company.update({
          where: { id: params.id },
          data: { creditUsed: { decrement: totalAmount } },
        })
      }
    })

    return NextResponse.json({ settled: unpaid.length, totalAmount })
  } catch (err) {
    console.error('[PATCH /companies/[id]/credit]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
