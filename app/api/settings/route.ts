import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

const CURRENCIES = ['THB', 'MMK', 'USD', 'EUR', 'SGD', 'CNY']

export async function GET(_req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const setting = await prisma.hotelSetting.upsert({
    where: { id: hotelId! },
    update: {},
    create: { id: hotelId! },
  })
  return NextResponse.json(setting)
}

export async function PUT(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error

  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { baseCurrency, altCurrency, fxRate } = body

  if (baseCurrency !== undefined && !CURRENCIES.includes(baseCurrency)) {
    return NextResponse.json({ error: 'Invalid base currency' }, { status: 400 })
  }
  if (altCurrency !== undefined && !CURRENCIES.includes(altCurrency)) {
    return NextResponse.json({ error: 'Invalid alternate currency' }, { status: 400 })
  }
  if (baseCurrency && altCurrency && baseCurrency === altCurrency) {
    return NextResponse.json({ error: 'Base and alternate currency must differ' }, { status: 400 })
  }

  let parsedRate: number | undefined
  if (fxRate !== undefined) {
    parsedRate = parseFloat(fxRate)
    if (isNaN(parsedRate) || parsedRate <= 0 || parsedRate > 100000) {
      return NextResponse.json({ error: 'Exchange rate must be a positive number' }, { status: 400 })
    }
  }

  const setting = await prisma.hotelSetting.upsert({
    where: { id: hotelId! },
    update: {
      ...(baseCurrency !== undefined && { baseCurrency }),
      ...(altCurrency !== undefined && { altCurrency }),
      ...(parsedRate !== undefined && { fxRate: parsedRate }),
    },
    create: {
      id: hotelId!,
      ...(baseCurrency !== undefined && { baseCurrency }),
      ...(altCurrency !== undefined && { altCurrency }),
      ...(parsedRate !== undefined && { fxRate: parsedRate }),
    },
  })
  return NextResponse.json(setting)
}
