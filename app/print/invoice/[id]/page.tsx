import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { HOTEL_NAME, LOCATION } from '@/lib/constants'
import { TaxInvoiceLineItem } from '@/types'
import PrintTrigger from './PrintTrigger'
import PrintToolbar from './PrintToolbar'

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtMoney(n: number) {
  return '฿' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  issued: 'bg-sky-100 text-sky-700',
  paid: 'bg-emerald-100 text-emerald-700',
  void: 'bg-red-100 text-red-500',
}

export default async function PrintInvoicePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'

  const invoice = await prisma.taxInvoice.findFirst({
    where: { id: params.id, hotelId },
    include: { company: true },
  })
  if (!invoice) notFound()

  const lineItems = invoice.lineItems as TaxInvoiceLineItem[]
  const issuedDate = fmtDate(invoice.issuedAt ?? invoice.createdAt)
  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <PrintTrigger />
      <style>{`
        @page { size: A4; margin: 18mm 20mm; }
        @media print {
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; }
        * { box-sizing: border-box; }
      `}</style>

      <PrintToolbar invoiceNumber={invoice.invoiceNumber} />

      {/* Invoice document */}
      <div className="max-w-[720px] mx-auto my-8 bg-white shadow-sm p-10 print:shadow-none print:my-0 print:p-0">

        {/* Header */}
        <div className="flex justify-between items-start pb-5 border-b-2 border-slate-800 mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {HOTEL_NAME}<span className="text-sky-400">.</span>
            </h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-0.5">Property Management</p>
            <p className="text-xs text-slate-400 mt-1">{LOCATION}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">TAX INVOICE</p>
            <p className="text-sm text-slate-400 font-normal">ใบกำกับภาษี</p>
            <p className="text-sm font-bold text-sky-600 font-mono mt-1">{invoice.invoiceNumber}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase ${STATUS_BADGE[invoice.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Bill To / Details grid */}
        <div className="grid grid-cols-2 gap-6 mb-6 pb-5 border-b border-slate-200">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Bill To / ผู้รับบริการ</p>
            <p className="font-bold text-slate-900">{invoice.billTo}</p>
            {invoice.billTaxId && <p className="text-sm text-slate-500 mt-0.5">Tax ID: {invoice.billTaxId}</p>}
            {invoice.billAddress && <p className="text-sm text-slate-500 mt-0.5">{invoice.billAddress}</p>}
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Invoice Date</p>
              <p className="text-sm font-semibold text-slate-800">{issuedDate}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Due Date</p>
                <p className="text-sm font-semibold text-slate-800">{invoice.dueDate}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full text-sm border-collapse mb-0">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="text-left py-2 px-3 text-xs font-bold uppercase tracking-wide w-8">#</th>
              <th className="text-left py-2 px-3 text-xs font-bold uppercase tracking-wide">Description / รายการ</th>
              <th className="text-right py-2 px-3 text-xs font-bold uppercase tracking-wide w-14">Qty</th>
              <th className="text-right py-2 px-3 text-xs font-bold uppercase tracking-wide w-28">Unit Price</th>
              <th className="text-right py-2 px-3 text-xs font-bold uppercase tracking-wide w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="py-2 px-3 text-slate-400">{i + 1}</td>
                <td className="py-2 px-3 text-slate-700">{item.description}</td>
                <td className="py-2 px-3 text-right text-slate-600">{item.quantity}</td>
                <td className="py-2 px-3 text-right text-slate-600">{fmtMoney(item.unitPrice)}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">{fmtMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mt-2 mb-6">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-semibold">{fmtMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span className="text-slate-500">VAT {invoice.vatRate}%</span>
              <span className="font-semibold">{fmtMoney(invoice.vatAmount)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-slate-800">
              <span className="font-black text-slate-900 text-base">Total / รวมทั้งสิ้น</span>
              <span className="font-black text-sky-700 text-base">{fmtMoney(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-6 p-3 bg-sky-50 border border-sky-200 rounded-lg">
            <p className="text-xs font-bold text-sky-700 uppercase tracking-wide mb-1">Notes / Payment Terms</p>
            <p className="text-sm text-sky-900">{invoice.notes}</p>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16">
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Authorised By — {HOTEL_NAME}</p>
          </div>
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Received By — {invoice.billTo}</p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-300 mt-8">
          Printed {printedAt} · Powered by Staywise PMS
        </p>
      </div>
    </>
  )
}
