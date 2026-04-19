import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const company = await prisma.company.findFirst({
    where: { id: params.id, hotelId: hotelId! },
    include: {
      contractRates: true,
      reservations: {
        select: { id: true, totalAmount: true, status: true, totalNights: true },
      },
    },
  })

  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(company)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const company = await prisma.company.findFirst({
    where: { id: params.id, hotelId: hotelId! },
  })
  if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { name, contactName, contactEmail, contactPhone, rates } = body

  await prisma.companyRate.deleteMany({ where: { companyId: params.id } })

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: {
      name: name?.trim() || company.name,
      contactName: contactName !== undefined ? contactName || null : company.contactName,
      contactEmail: contactEmail !== undefined ? contactEmail || null : company.contactEmail,
      contactPhone: contactPhone !== undefined ? contactPhone || null : company.contactPhone,
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

  return NextResponse.json(updated)
}
