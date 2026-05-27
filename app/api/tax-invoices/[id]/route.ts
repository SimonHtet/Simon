import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const invoice = await prisma.taxInvoice.findFirst({
      where: { id: params.id, hotelId: hotelId! },
      include: { company: true },
    })
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(invoice)
  } catch (err) {
    console.error('[GET /api/tax-invoices/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  const body = await req.json().catch(() => ({}))

  try {
    const existing = await prisma.taxInvoice.findFirst({ where: { id: params.id, hotelId: hotelId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'void') return NextResponse.json({ error: 'Cannot edit a voided invoice' }, { status: 400 })

    const lineItems = body.lineItems ?? existing.lineItems
    const vatRate = body.vatRate ?? existing.vatRate
    const subtotal = Array.isArray(lineItems)
      ? lineItems.reduce((s: number, item: any) => s + (item.amount ?? 0), 0)
      : existing.subtotal
    const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100
    const totalAmount = subtotal + vatAmount

    const newStatus = body.status ?? existing.status
    const issuedAt = newStatus === 'issued' && existing.status !== 'issued'
      ? new Date()
      : existing.issuedAt

    const updated = await prisma.taxInvoice.update({
      where: { id: params.id },
      data: {
        companyId: body.companyId !== undefined ? body.companyId : existing.companyId,
        reservationId: body.reservationId !== undefined ? body.reservationId : existing.reservationId,
        billTo: body.billTo?.trim() ?? existing.billTo,
        billTaxId: body.billTaxId !== undefined ? body.billTaxId : existing.billTaxId,
        billAddress: body.billAddress !== undefined ? body.billAddress : existing.billAddress,
        lineItems,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        status: newStatus,
        issuedAt,
        dueDate: body.dueDate !== undefined ? body.dueDate : existing.dueDate,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      include: { company: { select: { id: true, name: true, type: true } } },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[PUT /api/tax-invoices/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { hotelId, error } = await getSessionOrUnauthorized()
  if (error) return error

  try {
    const existing = await prisma.taxInvoice.findFirst({ where: { id: params.id, hotelId: hotelId! } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.status === 'issued' || existing.status === 'paid') {
      // Void instead of delete
      await prisma.taxInvoice.update({ where: { id: params.id }, data: { status: 'void' } })
      return NextResponse.json({ voided: true })
    }
    await prisma.taxInvoice.delete({ where: { id: params.id } })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[DELETE /api/tax-invoices/[id]] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
