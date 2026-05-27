import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PrintTrigger from './PrintTrigger'

function fmt(date: string | Date) {
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

export default async function CompanyStatementPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'

  const [company, hotel] = await Promise.all([
    prisma.company.findFirst({
      where: { id: params.id, hotelId },
      include: {
        creditTransactions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.hotel.findUnique({ where: { id: hotelId } }),
  ])

  if (!company) redirect('/companies')

  const unpaid = company.creditTransactions.filter((t) => t.status === 'unpaid')
  const paid = company.creditTransactions.filter((t) => t.status === 'paid')
  const totalOutstanding = unpaid.reduce((s, t) => s + t.amount, 0)
  const totalPaid = paid.reduce((s, t) => s + t.amount, 0)
  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <PrintTrigger />
      <style>{`
        @page { size: A4; margin: 18mm 20mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print flex items-center gap-3 px-8 py-4 bg-white border-b border-slate-200 text-sm">
        <button onClick={() => window.close()} className="text-teal-600 font-semibold hover:underline">
          ← Close tab
        </button>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">City Ledger Statement — {company.name}</span>
        <button
          onClick={() => window.print()}
          className="ml-auto px-4 py-1.5 bg-slate-800 text-white text-xs font-bold rounded hover:bg-slate-700"
        >
          Print
        </button>
      </div>

      {/* Statement */}
      <div className="max-w-[700px] mx-auto my-8 bg-white shadow-sm p-10 print:shadow-none print:my-0 print:p-0">

        {/* Hotel header */}
        <div className="text-center pb-5 border-b-2 border-slate-800 mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {hotel?.name ?? 'Staywise Hotel'}
          </h1>
          {hotel?.location && (
            <p className="text-sm text-slate-500 mt-0.5">{hotel.location}</p>
          )}
          <p className="text-xs text-slate-400 mt-3 uppercase tracking-widest">City Ledger Statement</p>
        </div>

        {/* Company details */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-6 pb-5 border-b border-slate-200">
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wide">Company</span>
            <p className="font-bold text-slate-800">{company.name}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wide">Type</span>
            <p className="font-bold text-slate-800">{company.type}</p>
          </div>
          {company.contactName && (
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wide">Contact</span>
              <p className="font-bold text-slate-800">{company.contactName}</p>
            </div>
          )}
          {company.contactEmail && (
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wide">Email</span>
              <p className="font-bold text-slate-800">{company.contactEmail}</p>
            </div>
          )}
          {company.taxId && (
            <div>
              <span className="text-slate-400 text-xs uppercase tracking-wide">Tax ID</span>
              <p className="font-bold text-slate-800">{company.taxId}</p>
            </div>
          )}
          {company.address && (
            <div className="col-span-2">
              <span className="text-slate-400 text-xs uppercase tracking-wide">Address</span>
              <p className="font-bold text-slate-800">{company.address}</p>
            </div>
          )}
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wide">Credit Limit</span>
            <p className="font-bold text-slate-800">฿{fmtCurrency(company.creditLimit)}</p>
          </div>
          <div>
            <span className="text-slate-400 text-xs uppercase tracking-wide">Statement Date</span>
            <p className="font-bold text-slate-800">{fmt(new Date())}</p>
          </div>
        </div>

        {/* Outstanding charges */}
        <div className="mb-8">
          <h2 className="font-black text-sm uppercase tracking-wide text-slate-700 mb-3">
            Outstanding Charges
          </h2>
          {unpaid.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-4 text-center">No outstanding charges</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-50">
                  <th className="text-left py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Date</th>
                  <th className="text-left py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Amount</th>
                  <th className="text-center py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {unpaid.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100">
                    <td className="py-1.5 px-2 text-slate-400 text-xs">{fmt(tx.createdAt)}</td>
                    <td className="py-1.5 px-2 text-slate-700">{tx.description}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-slate-800">฿{fmtCurrency(tx.amount)}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold uppercase">Unpaid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-800">
                  <td colSpan={2} className="pt-3 px-2 font-black text-slate-900 text-sm uppercase tracking-wide">
                    Total Outstanding
                  </td>
                  <td className="pt-3 px-2 text-right font-black text-slate-900 text-lg">
                    ฿{fmtCurrency(totalOutstanding)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Paid transactions */}
        {paid.length > 0 && (
          <div className="mb-8">
            <h2 className="font-black text-sm uppercase tracking-wide text-slate-700 mb-3">
              Payment History
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y border-slate-300 bg-slate-50">
                  <th className="text-left py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Date</th>
                  <th className="text-left py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Amount</th>
                  <th className="text-center py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-20">Status</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 opacity-60">
                    <td className="py-1.5 px-2 text-slate-400 text-xs">{fmt(tx.createdAt)}</td>
                    <td className="py-1.5 px-2 text-slate-700">{tx.description}</td>
                    <td className="py-1.5 px-2 text-right font-medium text-slate-600">฿{fmtCurrency(tx.amount)}</td>
                    <td className="py-1.5 px-2 text-center">
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">Paid</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={2} className="pt-2 px-2 font-bold text-slate-500 text-xs uppercase tracking-wide">
                    Total Paid
                  </td>
                  <td className="pt-2 px-2 text-right font-bold text-slate-500">฿{fmtCurrency(totalPaid)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Signature */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16">
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Authorised By (Hotel)</p>
          </div>
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Received By ({company.name})</p>
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
