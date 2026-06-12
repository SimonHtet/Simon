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
  const { baseCurrency, altCurrency, fxRate, fxRates } = body

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

  // Rate table: { CODE: units of baseCurrency per 1 CODE }
  let parsedRates: Record<string, number> | undefined
  if (fxRates !== undefined) {
    if (typeof fxRates !== 'object' || fxRates === null || Array.isArray(fxRates)) {
      return NextResponse.json({ error: 'fxRates must be an object of currency: rate' }, { status: 400 })
    }
    parsedRates = {}
    for (const [code, value] of Object.entries(fxRates)) {
      if (!CURRENCIES.includes(code)) {
        return NextResponse.json({ error: `Invalid currency in rates: ${code}` }, { status: 400 })
      }
      const r = parseFloat(value as string)
      if (isNaN(r) || r <= 0 || r > 10000000) {
        return NextResponse.json({ error: `Rate for ${code} must be a positive number` }, { status: 400 })
      }
      parsedRates[code] = r
    }
  }

  // Keep the operative pair rate in sync with the table: payments and deposits
  // convert via fxRate, which must always equal the alt currency's table entry
  const current = await prisma.hotelSetting.findUnique({ where: { id: hotelId! } })
  const effectiveAlt = altCurrency ?? current?.altCurrency ?? 'USD'
  if (parsedRates && parsedRates[effectiveAlt] !== undefined) {
    parsedRate = parsedRates[effectiveAlt]
  }

  const data = {
    ...(baseCurrency !== undefined && { baseCurrency }),
    ...(altCurrency !== undefined && { altCurrency }),
    ...(parsedRate !== undefined && { fxRate: parsedRate }),
    ...(parsedRates !== undefined && { fxRates: parsedRates }),
  }
  const setting = await prisma.hotelSetting.upsert({
    where: { id: hotelId! },
    update: data,
    create: { id: hotelId!, ...data },
  })
  return NextResponse.json(setting)
}
