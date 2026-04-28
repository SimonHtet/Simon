import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = parseInt(params.id)

  try {
    const existing = await prisma.chargeCode.findFirst({ where: { id, hotelId: hotelId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.chargeCode.update({
      where: { id },
      data: {
        code: body.code ?? existing.code,
        category: body.category ?? existing.category,
        description: body.description ?? existing.description,
        price: body.price != null ? parseFloat(body.price) : existing.price,
        active: body.active !== undefined ? body.active : existing.active,
        ...(body.parentCode !== undefined && { parentCode: body.parentCode || null }),
      },
    })
    return NextResponse.json(updated)
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Charge code already exists' }, { status: 409 })
    console.error('[PUT /api/charge-codes/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = parseInt(params.id)

  try {
    const existing = await prisma.chargeCode.findFirst({ where: { id, hotelId: hotelId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.chargeCode.update({ where: { id }, data: { active: false } })
    return NextResponse.json({ deactivated: true })
  } catch (err) {
    console.error('[DELETE /api/charge-codes/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
