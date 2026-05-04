import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string; txId: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const txId = parseInt(params.txId, 10)
  if (isNaN(txId)) return NextResponse.json({ error: 'Invalid txId' }, { status: 400 })

  try {
    const tx = await prisma.creditTransaction.findFirst({
      where: { id: txId, companyId: params.id, hotelId: hotelId! },
    })
    if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (tx.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

    const [updated] = await prisma.$transaction([
      prisma.creditTransaction.update({
        where: { id: txId },
        data: { status: 'paid', paidAt: new Date() },
      }),
      prisma.company.update({
        where: { id: params.id },
        data: { creditUsed: { decrement: tx.amount } },
      }),
    ])

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /companies/[id]/credit/[txId]]', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
