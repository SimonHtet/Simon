import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET() {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const companies = await prisma.company.findMany({
    where: { hotelId: hotelId! },
    include: {
      contractRates: true,
      _count: { select: { reservations: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(companies)
}

export async function POST(req: NextRequest) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json()
  const { name, contactName, contactEmail, contactPhone, rates } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
  }

  const company = await prisma.company.create({
    data: {
      name: name.trim(),
      contactName: contactName || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      hotelId: hotelId!,
      contractRates: rates?.length
        ? {
            create: rates.map((r: { roomType: string; contractRate: number }) => ({
              roomType: r.roomType,
              contractRate: parseFloat(String(r.contractRate)),
            })),
          }
        : undefined,
    },
    include: { contractRates: true },
  })

  return NextResponse.json(company, { status: 201 })
}
