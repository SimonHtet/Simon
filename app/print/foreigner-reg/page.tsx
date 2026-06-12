import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PrintBar from '../PrintBar'

// Immigration registration of foreign guests arriving on a given date.
// Shows full passport numbers deliberately — this is an official report.

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const DOMESTIC = ['thai', 'thailand', 'th']

export default async function ForeignerRegPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  const role = (session.user as any).role ?? ''
  if (role === 'housekeeping') redirect('/')

  const hotelId = (session.user as any).hotelId ?? 'HOTEL-001'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date ?? '')
    ? searchParams.date!
    : new Date().toISOString().split('T')[0]

  const [hotel, arrivals] = await Promise.all([
    prisma.hotel.findUnique({ where: { id: hotelId } }),
    prisma.reservation.findMany({
      where: {
        hotelId,
        checkIn: date,
        status: { in: ['checked_in', 'checked_out'] },
      },
      include: { guest: { select: { nationality: true, passportNumber: true, passportExpiry: true, birthday: true } } },
      orderBy: { roomId: 'asc' },
    }),
  ])

  const foreigners = arrivals.filter((r) => {
    const nat = (r.nationality ?? r.guest?.nationality ?? '').trim().toLowerCase()
    return nat !== '' && !DOMESTIC.includes(nat)
  })

  const printedAt = new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 14mm 16mm; }
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
        body { background: #f1f5f9; }
        * { box-sizing: border-box; }
      `}</style>

      <PrintBar label={`Foreign Guest Registration — ${date}`} />

      <div className="max-w-[1000px] mx-auto my-8 bg-white shadow-sm p-10 print:shadow-none print:my-0 print:p-0">
        {/* Header */}
        <div className="flex items-end justify-between pb-4 border-b-2 border-slate-800 mb-6">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">{hotel?.name ?? 'Staywise Hotel'}</h1>
            {hotel?.location && <p className="text-sm text-slate-500">{hotel.location}</p>}
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Foreign Guest Registration — Immigration Report</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-800">Arrivals on {fmt(date)}</p>
            <p className="text-xs text-slate-400">{foreigners.length} foreign guest{foreigners.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {foreigners.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-10">No foreign guest arrivals recorded for this date.</p>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50">
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-8">No</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Full Name</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-28">Nationality</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-32">Passport No</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-28">Date of Birth</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-20">Room</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-28">Check-in</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide w-28">Check-out</th>
                <th className="text-left py-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">Visa / Notes</th>
              </tr>
            </thead>
            <tbody>
              {foreigners.map((r, i) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="py-2 px-2 text-slate-400">{i + 1}</td>
                  <td className="py-2 px-2 font-bold text-slate-800">{r.guestName}</td>
                  <td className="py-2 px-2 text-slate-700">{r.nationality ?? r.guest?.nationality ?? '—'}</td>
                  <td className="py-2 px-2 font-mono text-slate-800">{r.passportNumber ?? r.guest?.passportNumber ?? '—'}</td>
                  <td className="py-2 px-2 text-slate-700">{r.birthday ?? r.guest?.birthday ?? '—'}</td>
                  <td className="py-2 px-2 font-mono font-bold text-slate-700">{r.roomId}</td>
                  <td className="py-2 px-2 text-slate-700">{fmt(r.checkIn)}</td>
                  <td className="py-2 px-2 text-slate-700">{fmt(r.checkOut)}</td>
                  <td className="py-2 px-2 text-slate-500">{r.visaDetails ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Signature */}
        <div className="mt-12 pt-6 border-t border-slate-200 grid grid-cols-2 gap-16 max-w-[600px]">
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Prepared By (Front Office)</p>
          </div>
          <div>
            <div className="h-10 border-b-2 border-dashed border-slate-300 mb-1" />
            <p className="text-xs text-slate-400 text-center">Manager</p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-300 mt-8">Printed {printedAt} · Powered by Staywise PMS</p>
      </div>
    </>
  )
}
