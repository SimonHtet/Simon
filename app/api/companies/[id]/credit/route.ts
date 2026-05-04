import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

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
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const { amount, description, reservationId, folioId } = body

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

    const creditAvailable = Math.max(0, company.creditLimit - company.creditUsed)
    if (creditAvailable < amount) {
      return NextResponse.json(
        { error: `Insufficient credit — ฿${creditAvailable.toLocaleString()} available` },
        { status: 400 }
      )
    }

    const [tx] = await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          companyId: params.id,
          hotelId: hotelId!,
          amount,
          description: description.trim(),
          reservationId: reservationId ?? null,
          folioId: folioId ?? null,
          status: 'unpaid',
        },
      }),
      prisma.company.update({
        where: { id: params.id },
        data: { creditUsed: { increment: amount } },
      }),
    ])

    return NextResponse.json(tx, { status: 201 })
  } catch (err) {
    console.error('[POST /companies/[id]/credit]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
