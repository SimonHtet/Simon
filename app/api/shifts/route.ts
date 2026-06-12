import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

// One cash drawer per hotel — a single open shift at a time.

export async function GET(_req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'CHECKOUT')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const [current, history] = await Promise.all([
    prisma.shift.findFirst({
      where: { hotelId: hotelId!, status: 'open' },
      orderBy: { openedAt: 'desc' },
    }),
    prisma.shift.findMany({
      where: { hotelId: hotelId!, status: 'closed' },
      orderBy: { closedAt: 'desc' },
      take: 20,
    }),
  ])
  return NextResponse.json({ current, history })
}

export async function POST(req: NextRequest) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'CHECKOUT')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const openingFloat = parseFloat(body.openingFloat ?? 0)
  if (isNaN(openingFloat) || openingFloat < 0 || openingFloat > 500000) {
    return NextResponse.json({ error: 'Opening float must be 0 or a positive amount' }, { status: 400 })
  }

  const existing = await prisma.shift.findFirst({
    where: { hotelId: hotelId!, status: 'open' },
  })
  if (existing) {
    return NextResponse.json(
      { error: `A shift is already open (opened by ${existing.openedBy}) — close it before starting a new one` },
      { status: 409 }
    )
  }

  const openedBy = (session!.user as any).email ?? 'unknown'
  const shift = await prisma.shift.create({
    data: { hotelId: hotelId!, openedBy, openingFloat },
  })
  return NextResponse.json(shift, { status: 201 })
}
