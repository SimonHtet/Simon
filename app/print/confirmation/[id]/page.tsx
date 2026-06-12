import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatMoney, baseToAlt } from '@/lib/currency'
import ShareControls from './ShareControls'

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function nights(checkIn: string, checkOut: string) {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  return Math.max(1, Math.round(diff / 86400000))
}

export default async function ConfirmationPrintPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'

  const [reservation, hotel, setting] = await Promise.all([
    prisma.reservation.findUnique({
      where: { id: params.id },
      include: { charges: { where: { category: 'DEPOSIT' } } },
    }),
    prisma.hotel.findUnique({ where: { id: hotelId } }),
    prisma.hotelSetting.findUnique({ where: { id: hotelId } }),
  ])

  if (!reservation || reservation.hotelId !== hotelId) redirect('/reservations')

  const n = nights(reservation.checkIn, reservation.checkOut)
  const total = reservation.rate * n
  const depositPaid = reservation.charges.reduce((s, c) => s + Math.abs(c.amount), 0)
  const balanceDue = Math.max(0, total - depositPaid)
  const base = setting?.baseCurrency ?? 'THB'
  const alt = setting?.altCurrency ?? 'USD'
  const fxRate = setting?.fxRate ?? 0
  const hotelName = hotel?.name ?? 'Staywise Hotel'

  const shareText = [
    `🏨 ${hotelName} — Booking Confirmation`,
    ``,
    `Confirmation No: ${reservation.reservationNumber}`,
    `Guest: ${reservation.guestName}`,
    `Room: ${reservation.roomTypeId}`,
    `Check-in: ${fmt(reservation.checkIn)} (from 14:00)`,
    `Check-out: ${fmt(reservation.checkOut)} (by 12:00)`,
    `Nights: ${n}`,
    `Rate: ${formatMoney(reservation.rate, base)}/night`,
    `Total: ${formatMoney(total, base)}`,
    ...(depositPaid > 0
      ? [`Deposit received: ${formatMoney(depositPaid, base)}`, `Balance due: ${formatMoney(balanceDue, base)}`]
      : []),
    ``,
    `We look forward to welcoming you!`,
    ...(hotel?.location ? [`📍 ${hotel.location}`] : []),
  ].join('\n')

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

      <ShareControls resNumber={reservation.reservationNumber} shareText={shareText} />

      <div className="max-w-[700px] mx-auto my-8 bg-white shadow-sm p-10 print:shadow-none print:my-0 print:p-0">
        {/* Header */}
        <div className="text-center pb-5 border-b-2 border-slate-800 mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{hotelName}</h1>
          {hotel?.location && <p className="text-sm text-slate-500 mt-0.5">{hotel.location}</p>}
          <p className="text-xs text-slate-400 mt-3 uppercase tracking-widest">Booking Confirmation</p>
        </div>

        {/* Confirmation number banner */}
        <div className="text-center mb-6 py-4 bg-slate-50 rounded border border-slate-200">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Confirmation Number</p>
          <p className="text-2xl font-black tracking-wider text-slate-900">{reservation.reservationNumber}</p>
        </div>

        {/* Stay details */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm mb-6 pb-5 border-b border-slate-200">
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Guest Name</span><p className="font-bold text-slate-800">{reservation.guestName}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Room Type</span><p className="font-bold text-slate-800">{reservation.roomTypeId}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Check-in</span><p className="font-bold text-slate-800">{fmt(reservation.checkIn)}</p><p className="text-xs text-slate-400">from 14:00</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Check-out</span><p className="font-bold text-slate-800">{fmt(reservation.checkOut)}</p><p className="text-xs text-slate-400">by 12:00</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Guests</span><p className="font-bold text-slate-800">{reservation.adults} Adult{reservation.adults !== 1 ? 's' : ''}{reservation.children > 0 ? `, ${reservation.children} Child${reservation.children !== 1 ? 'ren' : ''}` : ''}</p></div>
          <div><span className="text-slate-400 text-xs uppercase tracking-wide">Nights</span><p className="font-bold text-slate-800">{n}</p></div>
        </div>

        {/* Pricing */}
        <table className="w-full text-sm border-collapse mb-6">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-600">Room rate ({formatMoney(reservation.rate, base)} × {n} night{n !== 1 ? 's' : ''})</td>
              <td className="py-2 text-right font-bold text-slate-800">{formatMoney(total, base)}</td>
            </tr>
            {depositPaid > 0 && (
              <>
                <tr className="border-b border-slate-100">
                  <td className="py-2 text-slate-600">Deposit received</td>
                  <td className="py-2 text-right font-bold text-emerald-700">({formatMoney(depositPaid, base)})</td>
                </tr>
                <tr>
                  <td className="py-2 font-black text-slate-800">Balance due at hotel</td>
                  <td className="py-2 text-right font-black text-slate-900">{formatMoney(balanceDue, base)}</td>
                </tr>
              </>
            )}
            {fxRate > 0 && (
              <tr>
                <td className="pt-1 text-xs text-slate-400" colSpan={2}>
                  ≈ {formatMoney(baseToAlt(depositPaid > 0 ? balanceDue : total, fxRate), alt)} at house rate of {fxRate} {base}/{alt}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {reservation.specials && (
          <div className="mb-6 text-sm">
            <span className="text-slate-400 text-xs uppercase tracking-wide">Special Requests</span>
            <p className="text-slate-700 mt-1">{reservation.specials}</p>
          </div>
        )}

        {/* Policies */}
        <div className="text-xs text-slate-400 leading-relaxed border-t border-slate-200 pt-4">
          <p>Please present this confirmation and a valid passport or ID at check-in.</p>
          <p>For changes or cancellation, contact the hotel quoting your confirmation number.</p>
        </div>

        <p className="text-center text-xs text-slate-300 mt-8">Powered by Staywise PMS</p>
      </div>
    </>
  )
}
