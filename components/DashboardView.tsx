'use client'

import { Room, Reservation, DashboardStats } from '@/types'
import { formatDate } from '@/lib/utils'
import {
  BedDouble,
  LogIn,
  LogOut,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react'

interface Props {
  rooms: Room[]
  reservations: Reservation[]
  stats: DashboardStats | null
  onSelectReservation: (res: Reservation) => void
  onCheckIn: (res: Reservation) => void
  onCheckOut: (res: Reservation) => void
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  valueColor = 'text-slate-900',
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  iconBg: string
  valueColor?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className={`text-2xl font-black ${valueColor}`}>{value}</p>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function getNationalityFlag(nationality: string | null | undefined): string {
  if (!nationality) return ''
  const flags: Record<string, string> = {
    Thai: '🇹🇭',
    Chinese: '🇨🇳',
    Japanese: '🇯🇵',
    Korean: '🇰🇷',
    American: '🇺🇸',
    British: '🇬🇧',
    German: '🇩🇪',
    French: '🇫🇷',
    Australian: '🇦🇺',
    Russian: '🇷🇺',
    Indian: '🇮🇳',
    Singapore: '🇸🇬',
  }
  return flags[nationality] || '🌐'
}

export default function DashboardView({
  rooms,
  reservations,
  stats,
  onSelectReservation,
  onCheckIn,
  onCheckOut,
}: Props) {
  const today = new Date().toISOString().split('T')[0]

  const todayArrivals = reservations.filter(
    (r) => r.checkIn === today && r.status === 'confirmed'
  )
  const todayDepartures = reservations.filter(
    (r) => r.checkOut === today && r.status === 'checked_in'
  )
  const inHouse = reservations.filter((r) => r.status === 'checked_in')
  const pendingTraces = reservations.reduce(
    (sum, r) => sum + r.traces.filter((t) => t.status === 'pending').length,
    0
  )

  const s = stats

  return (
    <div className="p-6 space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          label="Today's Arrivals"
          value={s?.todayArrivals ?? todayArrivals.length}
          sub="Expected check-ins"
          icon={LogIn}
          iconBg="bg-teal-500"
          valueColor="text-teal-700"
        />
        <StatCard
          label="Today's Departures"
          value={s?.todayDepartures ?? todayDepartures.length}
          sub="Expected check-outs"
          icon={LogOut}
          iconBg="bg-amber-500"
          valueColor="text-amber-700"
        />
        <StatCard
          label="In House"
          value={s?.inHouse ?? inHouse.length}
          sub="Currently checked in"
          icon={BedDouble}
          iconBg="bg-blue-500"
        />
        <StatCard
          label="Available Rooms"
          value={s?.availableRooms ?? rooms.filter((r) => r.status === 'available').length}
          sub="Ready for check-in"
          icon={CheckCircle}
          iconBg="bg-emerald-500"
          valueColor="text-emerald-700"
        />
        <StatCard
          label="Occupancy %"
          value={`${s?.occupancyRate ?? 0}%`}
          sub={`${s?.inHouse ?? inHouse.length} / ${s?.totalRooms ?? rooms.length} rooms`}
          icon={TrendingUp}
          iconBg="bg-indigo-500"
        />
      </div>

      {/* Arrivals + Departures */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <div className="p-1.5 bg-teal-100 rounded-lg">
              <LogIn className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Today's Arrivals
            </h3>
            <span className="ml-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-black rounded-full">
              {todayArrivals.length}
            </span>
          </div>
          {todayArrivals.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No arrivals scheduled today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {todayArrivals.map((res) => (
                <div
                  key={res.id}
                  onClick={() => onSelectReservation(res)}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {getNationalityFlag(res.nationality)} {res.guestName}
                        {res.traces.filter((t) => t.status === 'pending').length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Room {res.roomId} · {res.totalNights}N
                        {res.vipStatus && (
                          <span className="ml-1.5 text-amber-600 font-bold">{res.vipStatus}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {res.eta && (
                      <span className="text-xs text-slate-400 font-medium">{res.eta}</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCheckIn(res)
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-lg transition-colors shadow-sm shadow-teal-600/20"
                    >
                      <LogIn className="w-3 h-3" /> Check In
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Departures */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <LogOut className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              Today's Departures
            </h3>
            <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-black rounded-full">
              {todayDepartures.length}
            </span>
          </div>
          {todayDepartures.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No departures scheduled today</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {todayDepartures.map((res) => (
                <div
                  key={res.id}
                  onClick={() => onSelectReservation(res)}
                  className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      {getNationalityFlag(res.nationality)} {res.guestName}
                      {res.traces.filter((t) => t.status === 'pending').length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      Room {res.roomId} · {res.totalNights}N
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onCheckOut(res)
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-lg transition-colors shadow-sm shadow-amber-500/20"
                    >
                      <LogOut className="w-3 h-3" /> Check Out
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In House */}
      {inHouse.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <BedDouble className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
              In House
            </h3>
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-black rounded-full">
              {inHouse.length}
            </span>
            {pendingTraces > 0 && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span className="text-[10px] font-black text-amber-700 uppercase">
                  {pendingTraces} pending traces
                </span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Guest', 'Room', 'Check In', 'Check Out', 'Nights Left', 'Amount', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {inHouse.map((res) => {
                  const checkout = new Date(res.checkOut)
                  const now = new Date()
                  const nightsLeft = Math.ceil(
                    (checkout.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  )
                  return (
                    <tr
                      key={res.id}
                      onClick={() => onSelectReservation(res)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900">
                          {getNationalityFlag(res.nationality)} {res.guestName}
                        </p>
                        {res.vipStatus && (
                          <p className="text-xs text-amber-600 font-bold">{res.vipStatus}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-black text-slate-800">{res.roomId}</td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {formatDate(res.checkIn)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {formatDate(res.checkOut)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-black text-sm ${
                            nightsLeft <= 1 ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {nightsLeft <= 0 ? 'Due today' : `${nightsLeft}N`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-black text-slate-900">
                        ฿{res.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCheckOut(res)
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-black rounded-lg transition-colors border border-amber-200"
                        >
                          <LogOut className="w-3 h-3" /> C/O
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
