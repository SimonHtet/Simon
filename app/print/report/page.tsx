import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/rbac'
import { formatMoney } from '@/lib/currency'
import PrintBar from '../PrintBar'

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
}

const PM_LABELS: Record<string, string> = {
  cash: 'Cash',
  credit_card: 'Credit Card',
  debit_card: 'Debit Card',
  bank_transfer: 'Bank Transfer',
  promptpay: 'PromptPay',
  company_credit: 'Company Credit',
  city_ledger: 'City Ledger',
}

export default async function FlashReportPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as any).role ?? ''
  if (!hasPermission(role, 'VIEW_FINANCIALS')) redirect('/')

  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? '')
    ? searchParams.date!
    : new Date().toISOString().split('T')[0]
  const tomorrow = new Date(new Date(date + 'T12:00:00Z').getTime() + 86400000).toISOString().split('T')[0]
  const dayStart = new Date(date + 'T00:00:00.000Z')
  const dayEnd = new Date(date + 'T23:59:59.999Z')

  const [
    hotel,
    setting,
    rooms,
    inHouse,
    arrivalsToday,
    departuresToday,
    arrivalsTomorrow,
    departuresTomorrow,
    roomCharges,
    settledFolios,
    deposits,
    arUnpaid,
    nightAudit,
  ] = await Promise.all([
    prisma.hotel.findUnique({ where: { id: hotelId } }),
    prisma.hotelSetting.findUnique({ where: { id: hotelId } }),
    prisma.room.count({ where: { hotelId } }),
    prisma.reservation.findMany({
      where: { hotelId, status: 'checked_in' },
      select: { rate: true },
    }),
    prisma.reservation.findMany({
      where: { hotelId, checkIn: date, status: { in: ['confirmed', 'checked_in'] } },
      select: { guestName: true, roomId: true, roomTypeId: true, eta: true, status: true },
      orderBy: { roomId: 'asc' },
    }),
    prisma.reservation.findMany({
      where: { hotelId, checkOut: date, status: { in: ['checked_in', 'checked_out'] } },
      select: { guestName: true, roomId: true, status: true },
      orderBy: { roomId: 'asc' },
    }),
    prisma.reservation.count({
      where: { hotelId, checkIn: tomorrow, status: 'confirmed' },
    }),
    prisma.reservation.count({
      where: { hotelId, checkOut: tomorrow, status: 'checked_in' },
    }),
    prisma.charge.findMany({
      where: { reservation: { hotelId }, category: 'ROOM', date },
      select: { amount: true },
    }),
    prisma.folio.findMany({
      where: {
        reservation: { hotelId },
        status: 'settled',
        settledAt: { gte: dayStart, lte: dayEnd },
      },
      include: { charges: { include: { charge: { select: { amount: true } } } } },
    }),
    prisma.charge.findMany({
      where: { reservation: { hotelId }, category: 'DEPOSIT', createdAt: { gte: dayStart, lte: dayEnd } },
      select: { amount: true },
    }),
    prisma.creditTransaction.aggregate({
      where: { hotelId, status: 'unpaid', amount: { gt: 0 } },
      _sum: { amount: true },
    }),
    prisma.nightAudit.findUnique({
      where: { hotelId_businessDate: { hotelId, businessDate: date } },
    }),
  ])

  const base = setting?.baseCurrency ?? 'THB'
  const occupied = inHouse.length
  const occupancy = rooms > 0 ? (occupied / rooms) * 100 : 0
  const roomRevenue = roomCharges.reduce((s, c) => s + c.amount, 0)
  const roomsSold = nightAudit ? nightAudit.chargesPosted : occupied
  const adr = roomsSold > 0 ? roomRevenue / roomsSold : 0
  const revpar = rooms > 0 ? roomRevenue / rooms : 0
  const depositsTaken = deposits.reduce((s, c) => s + Math.abs(c.amount), 0)
  const arOutstanding = arUnpaid._sum.amount ?? 0

  // Collections by payment method (same formula as the revenue report)
  const pmMap: Record<string, number> = {}
  let totalCollected = 0
  for (const folio of settledFolios) {
    const total = folio.charges.reduce((s, fc) => s + fc.charge.amount, 0)
    if (total <= 0) continue
    const pm = folio.paymentMethod ?? 'unknown'
    pmMap[pm] = (pmMap[pm] ?? 0) + total
    totalCollected += total
  }

  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  const stat = (label: string, value: string, sub?: string) => (
    <div className="border border-slate-200 rounded p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm 16mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; }
        * { box-sizing: border-box; }
      `}</style>

      <PrintBar label={`Flash Report — ${date}`} />

      <div className="max-w-[760px] mx-auto my-8 bg-white shadow-sm p-10 print:shadow-none print:my-0 print:p-0">
        {/* Header */}
        <div className="flex items-end justify-between pb-4 border-b-2 border-slate-800 mb-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">{hotel?.name ?? 'Staywise Hotel'}</h1>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Manager Flash Report</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">{fmt(date)}</p>
            <p className={`text-xs font-bold ${nightAudit ? 'text-emerald-600' : 'text-amber-600'}`}>
              Night audit: {nightAudit ? `complete (${nightAudit.chargesPosted} charges)` : 'not run'}
            </p>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {stat('Occupancy', `${occupancy.toFixed(0)}%`, `${occupied} of ${rooms} rooms`)}
          {stat('Room Revenue', formatMoney(roomRevenue, base), 'posted room charges')}
          {stat('ADR', formatMoney(adr, base), `${roomsSold} room${roomsSold !== 1 ? 's' : ''} sold`)}
          {stat('RevPAR', formatMoney(revpar, base))}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-8">
          {stat('Collected Today', formatMoney(totalCollected, base), `${settledFolios.length} folio(s) settled`)}
          {stat('Deposits Taken', formatMoney(depositsTaken, base))}
          {stat('AR Outstanding', formatMoney(arOutstanding, base), 'city ledger + credit')}
          {stat('Tomorrow', `${arrivalsTomorrow} in / ${departuresTomorrow} out`)}
        </div>

        {/* Collections by method */}
        <div className="mb-8">
          <h2 className="font-black text-sm uppercase tracking-wide text-slate-700 mb-2">Collections by Payment Method</h2>
          {Object.keys(pmMap).length === 0 ? (
            <p className="text-sm text-slate-400 italic">No folios settled on this date.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <tbody>
                {Object.entries(pmMap).sort((a, b) => b[1] - a[1]).map(([pm, amount]) => (
                  <tr key={pm} className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-600">{PM_LABELS[pm] ?? pm}</td>
                    <td className="py-1.5 text-right font-bold text-slate-800">{formatMoney(amount, base)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300">
                  <td className="pt-2 font-black text-slate-800">Total</td>
                  <td className="pt-2 text-right font-black text-slate-900">{formatMoney(totalCollected, base)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Arrivals / departures */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="font-black text-sm uppercase tracking-wide text-slate-700 mb-2">Arrivals ({arrivalsToday.length})</h2>
            {arrivalsToday.length === 0 ? (
              <p className="text-sm text-slate-400 italic">None</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {arrivalsToday.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1 font-mono font-bold text-slate-500 w-14">{r.roomId}</td>
                      <td className="py-1 text-slate-700">{r.guestName}</td>
                      <td className="py-1 text-right text-slate-400">
                        {r.status === 'checked_in' ? '✓ arrived' : r.eta ? `ETA ${r.eta}` : 'pending'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <h2 className="font-black text-sm uppercase tracking-wide text-slate-700 mb-2">Departures ({departuresToday.length})</h2>
            {departuresToday.length === 0 ? (
              <p className="text-sm text-slate-400 italic">None</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <tbody>
                  {departuresToday.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-1 font-mono font-bold text-slate-500 w-14">{r.roomId}</td>
                      <td className="py-1 text-slate-700">{r.guestName}</td>
                      <td className="py-1 text-right text-slate-400">
                        {r.status === 'checked_out' ? '✓ departed' : 'in-house'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Signature */}
        <div className="mt-10 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16">
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Front Office Manager</p>
          </div>
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">General Manager / Owner</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-300 mt-8">Printed {printedAt} · Powered by Staywise PMS</p>
      </div>
    </>
  )
}
