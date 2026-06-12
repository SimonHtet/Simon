import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionOrUnauthorized } from '@/lib/session'
import { hasPermission } from '@/lib/rbac'

async function nextInvoiceNumber(hotelId: string): Promise<string> {
  const now = new Date()
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `INV-${yyyymm}-`
  const last = await prisma.taxInvoice.findFirst({
    where: { hotelId, invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: 'desc' },
  })
  const seq = last ? parseInt(last.invoiceNumber.split('-')[2] ?? '0') + 1 : 1
  return `${prefix}${String(seq).padStart(4, '0')}`
}

export async function GET(req: NextRequest) {
  const { hotelId, role, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const companyId = searchParams.get('companyId')

  try {
    const invoices = await prisma.taxInvoice.findMany({
      where: {
        hotelId: hotelId!,
        ...(status ? { status } : {}),
        ...(companyId ? { companyId } : {}),
      },
      include: { company: { select: { id: true, name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(invoices)
  } catch (err) {
    console.error('[GET /api/tax-invoices] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { hotelId, role, session, error } = await getSessionOrUnauthorized()
  if (error) return error
  if (!hasPermission(role!, 'VIEW_FINANCIALS')) {
    return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const {
    companyId,
    reservationId,
    billTo,
    billTaxId,
    billAddress,
    lineItems = [],
    vatRate = 7,
    dueDate,
    notes,
    status = 'draft',
  } = body

  if (!billTo?.trim()) {
    return NextResponse.json({ error: 'Bill-to name is required' }, { status: 400 })
  }
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
  }

  const subtotal = lineItems.reduce((s: number, item: any) => s + (item.amount ?? 0), 0)
  const vatAmount = Math.round(subtotal * (vatRate / 100) * 100) / 100
  const totalAmount = subtotal + vatAmount

  try {
    const invoiceNumber = await nextInvoiceNumber(hotelId!)
    const invoice = await prisma.taxInvoice.create({
      data: {
        invoiceNumber,
        hotelId: hotelId!,
        companyId: companyId || null,
        reservationId: reservationId || null,
        billTo: billTo.trim(),
        billTaxId: billTaxId || null,
        billAddress: billAddress || null,
        lineItems,
        subtotal,
        vatRate,
        vatAmount,
        totalAmount,
        status,
        issuedAt: status === 'issued' ? new Date() : null,
        dueDate: dueDate || null,
        notes: notes || null,
        createdBy: (session?.user as any)?.name ?? null,
      },
      include: { company: { select: { id: true, name: true, type: true } } },
    })
    return NextResponse.json(invoice, { status: 201 })
  } catch (err) {
    console.error('[POST /api/tax-invoices] DB error:', err)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}
