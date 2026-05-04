import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const companies = await prisma.company.findMany({
      where: { hotelId: hotelId! },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(companies)
  } catch (err) {
    console.error('[GET /api/companies] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))
  const {
    name,
    contactName,
    contactEmail,
    contactPhone,
    address,
    taxId,
    notes,
    type = 'COMPANY',
    contractRates = {},
    blackoutStart,
    blackoutEnd,
    active = true,
    creditLimit = 0,
    creditResetDay = 1,
  } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }
  if (!['COMPANY', 'AGENT'].includes(type)) {
    return NextResponse.json({ error: 'Type must be COMPANY or AGENT' }, { status: 400 })
  }

  try {
    const company = await prisma.company.create({
      data: {
        hotelId: hotelId!,
        name: name.trim(),
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        contactPhone: contactPhone || null,
        address: address || null,
        taxId: taxId || null,
        notes: notes || null,
        type,
        contractRates,
        blackoutStart: blackoutStart || null,
        blackoutEnd: blackoutEnd || null,
        active,
        creditLimit: creditLimit ?? 0,
        creditResetDay: creditResetDay ?? 1,
      },
    })
    return NextResponse.json(company, { status: 201 })
  } catch (err) {
    console.error('[POST /api/companies] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
