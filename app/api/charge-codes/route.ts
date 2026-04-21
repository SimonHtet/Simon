import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const codes = await prisma.chargeCode.findMany({
      where: { hotelId: hotelId!, active: true },
      orderBy: { code: 'asc' },
    })
    return NextResponse.json(codes)
  } catch (err) {
    console.error('[GET /api/charge-codes] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { code, category, description, price, active = true } = body

  if (!code?.trim() || !category?.trim() || !description?.trim() || price == null) {
    return NextResponse.json({ error: 'code, category, description, price are required' }, { status: 400 })
  }

  try {
    const chargeCode = await prisma.chargeCode.create({
      data: {
        code: code.trim(),
        category: category.trim(),
        description: description.trim(),
        price: parseFloat(price),
        active,
        hotelId: hotelId!,
      },
    })
    return NextResponse.json(chargeCode, { status: 201 })
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Charge code already exists' }, { status: 409 })
    console.error('[POST /api/charge-codes] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
