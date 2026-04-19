'use client'

import { Room, Reservation, DashboardStats } from '@/types'
import { getResStatusBadge, getResStatusLabel, formatDate } from '@/lib/utils'
import {
  BedDouble,
  Users,
  LogIn,
  LogOut,
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Clock,
  Eye,
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
  color,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-sm transition-shadow">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
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

  const s = stats

  return (
    <div className="p-6 space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Occupancy Rate"
          value={`${s?.occupancyRate ?? 0}%`}
          sub={`${s?.inHouse ?? 0} / ${s?.totalRooms ?? rooms.length} rooms`}
          icon={TrendingUp}
          color="bg-sky-500"
        />
        <StatCard
          label="In House"
          value={s?.inHouse ?? inHouse.length}
          sub="Currently checked in"
          icon={BedDouble}
          color="bg-blue-500"
        />
        <StatCard
          label="Today's Arrivals"
          value={s?.todayArrivals ?? todayArrivals.length}
          sub="Expected check-ins"
          icon={LogIn}
          color="bg-emerald-500"
        />
        <StatCard
          label="Today's Departures"
          value={s?.todayDepartures ?? todayDepartures.length}
          sub="Expected check-outs"
          icon={LogOut}
          color="bg-amber-500"
        />
        <StatCard
          label="Available Rooms"
          value={s?.availableRooms ?? rooms.filter((r) => r.status === 'available').length}
          sub="Ready for check-in"
          icon={CheckCircle}
          color="bg-teal-500"
        />
        <StatCard
          label="Pending Traces"
          value={s?.pendingTraces ?? 0}
          sub="Require attention"
          icon={AlertCircle}
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-500" />
              <h3 className="font-semibold text-gray-900">Today's Arrivals</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                {todayArrivals.length}
              </span>
            </div>
          </div>
          {todayArrivals.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No arrivals scheduled today</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayArrivals.map((res) => (
                <div
                  key={res.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{res.guestName}</p>
                    <p className="text-xs text-gray-500">
                      Room {res.roomId} · {res.totalNights}N
                      {res.vipStatus && (
                        <span className="ml-1.5 text-amber-600">{res.vipStatus}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCheckIn(res)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs rounded-lg font-medium transition-colors"
                    >
                      <LogIn className="w-3 h-3" />
                      Check In
                    </button>
                    <button
                      onClick={() => onSelectReservation(res)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Departures */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Today's Departures</h3>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                {todayDepartures.length}
              </span>
            </div>
          </div>
          {todayDepartures.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No departures scheduled today</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayDepartures.map((res) => (
                <div
                  key={res.id}
                  className="px-5 py-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{res.guestName}</p>
                    <p className="text-xs text-gray-500">
                      Room {res.roomId} · {res.totalNights}N
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCheckOut(res)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg font-medium transition-colors"
                    >
                      <LogOut className="w-3 h-3" />
                      Check Out
                    </button>
                    <button
                      onClick={() => onSelectReservation(res)}
                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* In-House guests */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Users className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-gray-900">In House</h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
            {inHouse.length}
          </span>
        </div>
        {inHouse.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            <BedDouble className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No guests currently in house</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Guest', 'Room', 'Check In', 'Check Out', 'Nights Left', 'Amount', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {inHouse.map((res) => {
                  const checkout = new Date(res.checkOut)
                  const now = new Date()
                  const nightsLeft = Math.ceil((checkout.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <tr key={res.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{res.guestName}</p>
                        {res.vipStatus && <p className="text-xs text-amber-600">{res.vipStatus}</p>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{res.roomId}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(res.checkIn)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(res.checkOut)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${nightsLeft <= 1 ? 'text-red-600' : 'text-gray-700'}`}>
                          {nightsLeft <= 0 ? 'Due today' : `${nightsLeft}N`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 font-medium">
                        ฿{res.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onCheckOut(res)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs rounded-lg font-medium transition-colors"
                          >
                            <LogOut className="w-3 h-3" />
                            C/O
                          </button>
                          <button
                            onClick={() => onSelectReservation(res)}
                            className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
