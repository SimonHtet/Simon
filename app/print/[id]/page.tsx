import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PrintControls from './PrintControls'

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

function nights(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}

function folioTotal(folio: { charges: { charge: { amount: number } }[] }) {
  return folio.charges.reduce((sum, fc) => sum + fc.charge.amount, 0)
}

export default async function FolioPrintPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'

  const [reservation, hotel] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id: params.id },
      include: {
        folios: {
          include: {
            charges: {
              include: { charge: true },
              orderBy: { id: 'asc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    }),
    prisma.hotel.findUnique({ where: { id: hotelId } }),
  ])

  if (!reservation || reservation.hotelId !== hotelId) redirect('/reservations')

  const n = nights(reservation.checkIn, reservation.checkOut)
  const grandTotal = reservation.folios.reduce((sum, f) => sum + folioTotal(f), 0)
  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <style>{`
        @page { size: A4; margin: 18mm 20mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; }
        * { box-sizing: border-box; }
      `}</style>

      <PrintControls resNumber={reservation.reservationNumber} />

      {/* Receipt */}
      <div className="max-w-[700px] mx-auto my-8 bg-white shadow-sm p-10 print:shadow-none print:my-0 print:p-0">

        {/* Header */}
        <div className="text-center pb-5 border-b-2 border-slate-800 mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
            {hotel?.name ?? 'Staywise Hotel'}
          </h1>
          {hotel?.location && (
            <p className="text-sm text-slate-500 mt-0.5">{hotel.location}</p>
          )}
          <p className="text-xs text-slate-400 mt-3 uppercase tracking-widest">Guest Folio</p>
        </div>

        {/* Reservation summary */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-6 pb-5 border-b border-slate-200">
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Guest</span><p className="font-bold text-slate-800">{reservation.guestName}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Reservation #</span><p className="font-bold text-slate-800">{reservation.reservationNumber}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Room</span><p className="font-bold text-slate-800">{reservation.roomId} · {reservation.roomTypeId}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Guests</span><p className="font-bold text-slate-800">{reservation.adults} Adult{reservation.adults !== 1 ? 's' : ''}{reservation.children > 0 ? `, ${reservation.children} Child${reservation.children !== 1 ? 'ren' : ''}` : ''}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Check-in</span><p className="font-bold text-slate-800">{fmt(reservation.checkIn)}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Check-out</span><p className="font-bold text-slate-800">{fmt(reservation.checkOut)}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Nights</span><p className="font-bold text-slate-800">{n}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Rate / Night</span><p className="font-bold text-slate-800">฿{fmtCurrency(reservation.rate)}</p></div>
        </div>

        {/* Folios */}
        {reservation.folios.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">No folio charges recorded.</p>
        ) : (
          reservation.folios.map((folio) => (
            <div key={folio.id} className="mb-8 break-inside-avoid">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-black text-sm uppercase tracking-wide text-slate-700">{folio.name}</h2>
                <span className="text-xs text-slate-400 uppercase">{folio.paymentMethod ?? '—'} · {folio.status}</span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-y border-slate-300 bg-slate-50">
                    <th className="text-left py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-24">Date</th>
                    <th className="text-left py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Description</th>
                    <th className="text-right py-1.5 px-2 text-xs font-bold text-slate-500 uppercase tracking-wide w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {folio.charges.map((fc) => (
                    <tr key={fc.id} className="border-b border-slate-100">
                      <td className="py-1.5 px-2 text-slate-400 text-xs">{fc.charge.date}</td>
                      <td className="py-1.5 px-2 text-slate-700">{fc.charge.item}</td>
                      <td className={`py-1.5 px-2 text-right font-medium ${fc.charge.amount < 0 ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {fc.charge.amount < 0
                          ? `(฿${fmtCurrency(Math.abs(fc.charge.amount))})`
                          : `฿${fmtCurrency(fc.charge.amount)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td colSpan={2} className="pt-2 px-2 font-black text-slate-700 text-sm">Folio Total</td>
                    <td className="pt-2 px-2 text-right font-black text-slate-900">฿{fmtCurrency(folioTotal(folio))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))
        )}

        {/* Grand total */}
        {reservation.folios.length > 1 && (
          <div className="flex justify-end border-t-2 border-slate-800 pt-3 mb-8">
            <div className="text-right">
              <span className="text-xs uppercase tracking-widest text-slate-500 mr-6">Grand Total</span>
              <span className="text-xl font-black text-slate-900">฿{fmtCurrency(grandTotal)}</span>
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16">
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Guest Signature</p>
          </div>
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Authorized By</p>
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
