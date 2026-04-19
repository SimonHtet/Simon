'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, DollarSign, BedDouble, BarChart3, Users, Calendar,
} from 'lucide-react'
import { ROOM_TYPES } from '@/lib/constants'

const FLAG_MAP: Record<string, string> = {
  American: '🇺🇸',
  French: '🇫🇷',
  Japanese: '🇯🇵',
  Nigerian: '🇳🇬',
  Russian: '🇷🇺',
  Singaporean: '🇸🇬',
  Thai: '🇹🇭',
  British: '🇬🇧',
  German: '🇩🇪',
  Chinese: '🇨🇳',
  Australian: '🇦🇺',
  Canadian: '🇨🇦',
  Korean: '🇰🇷',
  Indian: '🇮🇳',
  Italian: '🇮🇹',
  Spanish: '🇪🇸',
  Brazilian: '🇧🇷',
  Dutch: '🇳🇱',
  Swedish: '🇸🇪',
  Swiss: '🇨🇭',
  Unknown: '🌍',
}

interface KPI {
  totalRevenue: number
  adr: number
  revpar: number
  occupancyPct: number
  totalNightsSold: number
  totalRooms: number
}

interface SourceRow {
  source: string
  reservations: number
  roomNights: number
  revenue: number
  pct: number
}

interface CorporateRow {
  name: string
  stays: number
  roomNights: number
  revenue: number
  avgRate: number
}

interface NatRow {
  nationality: string
  count: number
  pct: number
}

interface RoomTypeRow {
  roomType: string
  roomsAvailable: number
  totalAvailableNights: number
  nightsSold: number
  occupancyPct: number
  revenue: number
  adr: number
}

interface TrendRow {
  date: string
  roomsOccupied: number
  occupancyPct: number
  revenue: number
}

interface AnalyticsData {
  month: number
  year: number
  kpi: KPI
  bySource: SourceRow[]
  byCorporate: CorporateRow[]
  byNationality: NatRow[]
  byRoomType: RoomTypeRow[]
  trend: TrendRow[]
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string
  value: string
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

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function AnalyticsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  async function load(m: number, y: number) {
    setLoading(true)
    const res = await fetch(`/api/analytics?month=${m}&year=${y}`)
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { load(month, year) }, [month, year])

  const todayStr = now.toISOString().split('T')[0]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics & Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Performance insights from reservation data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-500 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          {/* Row 1 — KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Revenue"
              value={`฿${fmt(data.kpi.totalRevenue)}`}
              sub={`${MONTHS[month - 1]} ${year}`}
              icon={DollarSign}
              color="bg-teal-500"
            />
            <StatCard
              label="ADR"
              value={`฿${fmt(data.kpi.adr)}`}
              sub="Avg daily rate"
              icon={TrendingUp}
              color="bg-sky-500"
            />
            <StatCard
              label="RevPAR"
              value={`฿${fmt(data.kpi.revpar)}`}
              sub="Rev per avail room"
              icon={BarChart3}
              color="bg-indigo-500"
            />
            <StatCard
              label="Occupancy"
              value={`${data.kpi.occupancyPct.toFixed(1)}%`}
              sub={`${data.kpi.totalRooms} total rooms`}
              icon={BedDouble}
              color="bg-amber-500"
            />
            <StatCard
              label="Room Nights Sold"
              value={fmt(data.kpi.totalNightsSold)}
              sub="This month"
              icon={Users}
              color="bg-emerald-500"
            />
          </div>

          {/* Row 2 — Revenue by source + Corporate */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by source */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Revenue by Source</h2>
              </div>
              {data.bySource.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Res.</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Nights</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.bySource.map((row, i) => (
                      <tr key={row.source} className={i === 0 ? 'bg-teal-50' : ''}>
                        <td className={`px-4 py-3 font-medium ${i === 0 ? 'text-teal-800' : 'text-gray-800'}`}>
                          {i === 0 && <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 mr-2 mb-0.5" />}
                          {row.source}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.reservations}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.roomNights}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${i === 0 ? 'text-teal-700' : 'text-gray-900'}`}>
                          ฿{fmt(row.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{row.pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Corporate account performance */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Corporate Account Performance</h2>
              </div>
              {data.byCorporate.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Stays</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Nights</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byCorporate.map((row) => (
                      <tr key={row.name}>
                        <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.stays}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.roomNights}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">฿{fmt(row.revenue)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">฿{fmt(row.avgRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Row 3 — Nationality + Room type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nationality breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Nationality Breakdown</h2>
              </div>
              {data.byNationality.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nationality</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Guests</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">% of total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byNationality.map((row) => (
                      <tr key={row.nationality}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          <span className="mr-2">{FLAG_MAP[row.nationality] ?? '🌍'}</span>
                          {row.nationality}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.count}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-400 rounded-full" style={{ width: `${row.pct}%` }} />
                            </div>
                            <span className="text-gray-500 text-xs w-10 text-right">{row.pct.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Room type performance */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Room Type Performance</h2>
              </div>
              {data.byRoomType.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No data</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Rooms</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Nights</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Occ%</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">ADR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.byRoomType.map((row) => (
                      <tr key={row.roomType}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {ROOM_TYPES[row.roomType]?.name ?? row.roomType}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.roomsAvailable}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{row.nightsSold}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            row.occupancyPct >= 70 ? 'bg-teal-50 text-teal-700' :
                            row.occupancyPct >= 40 ? 'bg-amber-50 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {row.occupancyPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">฿{fmt(row.revenue)}</td>
                        <td className="px-4 py-3 text-right text-gray-500">฿{fmt(row.adr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Row 4 — 30-day trend */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Occupancy & Revenue Trend — Last 30 Days</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Rooms Occupied</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Occupancy %</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...data.trend].reverse().map((row) => {
                    const isToday = row.date === todayStr
                    return (
                      <tr key={row.date} className={isToday ? 'bg-sky-50' : ''}>
                        <td className={`px-4 py-2.5 font-medium ${isToday ? 'text-sky-800' : 'text-gray-700'}`}>
                          {isToday && <span className="inline-block w-1.5 h-1.5 rounded-full bg-sky-500 mr-2 mb-0.5" />}
                          {new Date(row.date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                          {isToday && <span className="ml-2 text-xs bg-sky-200 text-sky-800 px-1.5 py-0.5 rounded-full">Today</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{row.roomsOccupied}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-xs font-medium ${
                            row.occupancyPct >= 70 ? 'text-teal-700' :
                            row.occupancyPct >= 40 ? 'text-amber-700' : 'text-gray-500'
                          }`}>
                            {row.occupancyPct.toFixed(1)}%
                          </span>
                        </td>
                        <td className={`px-4 py-2.5 text-right font-semibold ${isToday ? 'text-sky-800' : 'text-gray-900'}`}>
                          {row.revenue > 0 ? `฿${fmt(row.revenue)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
