import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const company = await prisma.company.findFirst({
      where: { id: params.id, hotelId: hotelId! },
      include: { reservations: { select: { id: true, reservationNumber: true, guestName: true, checkIn: true, checkOut: true, status: true, rate: true, totalAmount: true } } },
    })
    if (!company) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(company)
  } catch (err) {
    console.error('[GET /api/companies/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_COMPANIES')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))

  try {
    const existing = await prisma.company.findFirst({ where: { id: params.id, hotelId: hotelId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updated = await prisma.company.update({
      where: { id: params.id },
      data: {
        name: body.name ?? existing.name,
        contactName: body.contactName !== undefined ? body.contactName : existing.contactName,
        contactEmail: body.contactEmail !== undefined ? body.contactEmail : existing.contactEmail,
        contactPhone: body.contactPhone !== undefined ? body.contactPhone : existing.contactPhone,
        address: body.address !== undefined ? body.address : existing.address,
        taxId: body.taxId !== undefined ? body.taxId : existing.taxId,
        notes: body.notes !== undefined ? body.notes : existing.notes,
        type: body.type ?? existing.type,
        contractRates: body.contractRates ?? existing.contractRates,
        blackoutStart: body.blackoutStart !== undefined ? body.blackoutStart : existing.blackoutStart,
        blackoutEnd: body.blackoutEnd !== undefined ? body.blackoutEnd : existing.blackoutEnd,
        active: body.active !== undefined ? body.active : existing.active,
        creditLimit: body.creditLimit !== undefined ? body.creditLimit : existing.creditLimit,
        creditResetDay: body.creditResetDay !== undefined ? body.creditResetDay : existing.creditResetDay,
        bankName: body.bankName !== undefined ? body.bankName : existing.bankName,
        bankAccountName: body.bankAccountName !== undefined ? body.bankAccountName : existing.bankAccountName,
        bankAccountNumber: body.bankAccountNumber !== undefined ? body.bankAccountNumber : existing.bankAccountNumber,
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/companies/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'MANAGE_COMPANIES')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  try {
    const existing = await prisma.company.findFirst({ where: { id: params.id, hotelId: hotelId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check for linked reservations
    const linkedCount = await prisma.reservation.count({ where: { companyId: params.id } })
    if (linkedCount > 0) {
      // Soft delete — deactivate rather than hard delete
      await prisma.company.update({ where: { id: params.id }, data: { active: false } })
      return NextResponse.json({ deactivated: true, linkedCount })
    }

    await prisma.company.delete({ where: { id: params.id } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[DELETE /api/companies/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
