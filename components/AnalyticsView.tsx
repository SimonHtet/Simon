'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Hotel, DollarSign, BarChart3, Users, Search, RefreshCw } from 'lucide-react'

interface DailyRevenue {
  date: string
  roomRevenue: number
  extraCharges: number
  payments: number
  netTotal: number
  occupied: number
  arrivals: number
  departures: number
}

interface CompanyRevenue {
  id: string
  name: string
  type: string
  revenue: number
  nights: number
  reservationCount: number
  avgRate: number
  lastStay: string
}

interface AnalyticsData {
  summary: {
    totalRevenue: number
    totalReservations: number
    avgOccupancy: number
    avgRate: number
    revPar: number
    totalRoomNights: number
    totalRooms?: number
  }
  daily: DailyRevenue[]
  bySource: { source: string; count: number }[]
  bySourceRevenue: { source: string; count: number; revenue: number }[]
  byCompany: { name: string; type: string; revenue: number; nights: number }[]
  byRoomType: { type: string; revenue: number; nights: number }[]
  companiesRevenue: CompanyRevenue[]
  agentsRevenue: CompanyRevenue[]
  losDistribution: { nights: string; count: number }[]
  lastYearDaily?: DailyRevenue[]
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function BarChart({ data, valueKey, labelKey, colorClass = 'bg-sky-500' }: {
  data: Record<string, unknown>[]
  valueKey: string
  labelKey: string
  colorClass?: string
}) {
  const max = Math.max(...data.map((d) => d[valueKey] as number), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 text-xs text-gray-600 truncate text-right">{item[labelKey] as string}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${colorClass} transition-all duration-500`}
              style={{ width: `${((item[valueKey] as number) / max) * 100}%` }}
            />
            <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium text-gray-700">
              {typeof item[valueKey] === 'number' && (item[valueKey] as number) > 999
                ? `฿${((item[valueKey] as number) / 1000).toFixed(0)}k`
                : item[valueKey] as string}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function ColumnChart({
  data,
  compareData,
  showCompare,
}: {
  data: DailyRevenue[]
  compareData?: DailyRevenue[]
  showCompare: boolean
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (!data.length) return <div className="h-40 flex items-center justify-center text-sm text-gray-400">No data</div>

  const maxVal = Math.max(
    ...data.map((d) => d.roomRevenue + d.extraCharges),
    ...(compareData || []).map((d) => d.roomRevenue + d.extraCharges),
    1
  )

  const step = Math.ceil(data.length / 60)
  const sampled = data.filter((_, i) => i % step === 0)
  const sampledCmp = compareData ? compareData.filter((_, i) => i % step === 0) : []

  return (
    <div className="space-y-2">
      {showCompare && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-teal-500 inline-block" /> Current</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-300 inline-block" /> Last Year</span>
        </div>
      )}
      <div className="flex items-end gap-0.5 h-48 relative">
        {sampled.map((d, i) => {
          const val = d.roomRevenue + d.extraCharges
          const cmpVal = sampledCmp[i] ? sampledCmp[i].roomRevenue + sampledCmp[i].extraCharges : 0
          const heightPct = (val / maxVal) * 100
          const cmpHeightPct = (cmpVal / maxVal) * 100
          const isHovered = hoveredIdx === i
          return (
            <div
              key={d.date}
              className="flex-1 flex items-end gap-px relative group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {showCompare && sampledCmp[i] && (
                <div
                  className="flex-1 bg-slate-300 rounded-t-sm transition-all"
                  style={{ height: `${cmpHeightPct}%`, minHeight: cmpVal > 0 ? 2 : 0 }}
                />
              )}
              <div
                className={`flex-1 rounded-t-sm transition-all ${isHovered ? 'bg-teal-400' : 'bg-teal-500'}`}
                style={{ height: `${heightPct}%`, minHeight: val > 0 ? 2 : 0 }}
              />
              {isHovered && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs whitespace-nowrap pointer-events-none">
                  <p className="font-bold text-gray-800 mb-1">{d.date}</p>
                  <div className="space-y-0.5">
                    <div className="flex justify-between gap-4"><span className="text-gray-500">Room</span><span className="font-semibold">฿{d.roomRevenue.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-gray-500">Extras</span><span className="font-semibold text-emerald-600">+฿{d.extraCharges.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4"><span className="text-gray-500">Payments</span><span className="font-semibold text-teal-600">-฿{d.payments.toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4 border-t border-gray-100 pt-1"><span className="font-bold text-gray-700">Net</span><span className={`font-bold ${d.netTotal < 0 ? 'text-rose-600' : 'text-gray-900'}`}>฿{d.netTotal.toLocaleString()}</span></div>
                    {showCompare && sampledCmp[i] && (
                      <div className="flex justify-between gap-4 border-t border-gray-100 pt-1"><span className="text-slate-400">Last Year</span><span className="text-slate-500">฿{(sampledCmp[i].roomRevenue + sampledCmp[i].extraCharges).toLocaleString()}</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-start gap-0.5 mt-1">
        {sampled.map((d, i) => {
          const showLabel = sampled.length <= 14
            ? true
            : sampled.length <= 31
            ? i % 2 === 0
            : sampled.length <= 60
            ? i % 5 === 0
            : i % 10 === 0
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center">
              {showLabel ? (
                <span
                  className="text-[9px] text-gray-400 leading-none"
                  style={{
                    writingMode: sampled.length > 20 ? 'vertical-rl' : 'horizontal-tb',
                    transform: sampled.length > 20 ? 'rotate(180deg)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.date.slice(5)}
                </span>
              ) : (
                <span className="text-[9px] text-transparent leading-none">·</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OccupancyChart({ data, totalRooms }: { data: DailyRevenue[]; totalRooms: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const step = Math.ceil(data.length / 60)
  const sampled = data.filter((_, i) => i % step === 0)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 text-sm mb-4">Daily Occupancy %</h3>
      <div className="flex items-end gap-0.5 h-24">
        {sampled.map((d, i) => {
          const pct = totalRooms > 0 ? Math.min((d.occupied / totalRooms) * 100, 100) : 0
          const isHovered = hoveredIdx === i
          const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-sky-400' : 'bg-amber-400'
          return (
            <div
              key={d.date}
              className="flex-1 flex items-end relative group"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                className={`w-full rounded-t-sm transition-all ${isHovered ? 'opacity-80' : ''} ${color}`}
                style={{ height: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
              />
              {isHovered && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-20 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs whitespace-nowrap pointer-events-none">
                  <p className="font-bold text-gray-800">{d.date}</p>
                  <p className="text-gray-600">{d.occupied} / {totalRooms} rooms · <span className="font-bold text-sky-600">{Math.round(pct)}%</span></p>
                  <p className="text-gray-500">Arrivals: {d.arrivals} · Departures: {d.departures}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-start gap-0.5 mt-1">
        {sampled.map((d, i) => {
          const showLabel = sampled.length <= 14
            ? true
            : sampled.length <= 31
            ? i % 2 === 0
            : sampled.length <= 60
            ? i % 5 === 0
            : i % 10 === 0
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center">
              {showLabel ? (
                <span
                  className="text-[9px] text-gray-400 leading-none"
                  style={{
                    writingMode: sampled.length > 20 ? 'vertical-rl' : 'horizontal-tb',
                    transform: sampled.length > 20 ? 'rotate(180deg)' : 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.date.slice(5)}
                </span>
              ) : (
                <span className="text-[9px] text-transparent leading-none">·</span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> ≥80%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-sky-400 inline-block" /> 50–79%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400 inline-block" /> &lt;50%</span>
      </div>
    </div>
  )
}

function TopDays({ data }: { data: DailyRevenue[] }) {
  const top5 = [...data].sort((a, b) => b.netTotal - a.netTotal).slice(0, 5)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <h3 className="font-semibold text-gray-800 text-sm mb-4">🏆 Top 5 Revenue Days</h3>
      <div className="space-y-2">
        {top5.map((d, i) => {
          const maxNet = top5[0].netTotal || 1
          return (
            <div key={d.date} className="flex items-center gap-3">
              <span className={`text-xs font-black w-5 ${i === 0 ? 'text-amber-500' : 'text-gray-400'}`}>#{i + 1}</span>
              <span className="text-xs text-gray-600 w-16 shrink-0">{d.date.slice(5)}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-teal-500 rounded-full"
                  style={{ width: `${(d.netTotal / maxNet) * 100}%` }}
                />
                <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-bold text-gray-700">
                  ฿{d.netTotal.toLocaleString()}
                </span>
              </div>
              <div className="text-right text-[10px] text-gray-400 w-20 shrink-0">
                <div>Rm: ฿{d.roomRevenue.toLocaleString()}</div>
                <div className="text-emerald-600">+฿{d.extraCharges.toLocaleString()}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SourceRevenueChart({ data }: { data: { source: string; count: number; revenue: number }[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 text-xs text-gray-600 truncate text-right">{item.source}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-sky-400 transition-all duration-500"
              style={{ width: `${(item.revenue / maxRev) * 100}%` }}
            />
            <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium text-gray-700">
              ฿{(item.revenue / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="text-[10px] text-gray-400 w-16 text-right shrink-0">{item.count} stays</div>
        </div>
      ))}
    </div>
  )
}

function DailyTable({ data }: { data: DailyRevenue[] }) {
  const totals = data.reduce((acc, d) => ({
    roomRevenue: acc.roomRevenue + d.roomRevenue,
    extraCharges: acc.extraCharges + d.extraCharges,
    payments: acc.payments + d.payments,
    netTotal: acc.netTotal + d.netTotal,
  }), { roomRevenue: 0, extraCharges: 0, payments: 0, netTotal: 0 })

  return (
    <div className="overflow-y-auto max-h-[260px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pr-3">Date</th>
            <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pr-2">Room</th>
            <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pr-2">Extras</th>
            <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide pr-2">Pmts</th>
            <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Net</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date} className={`border-b border-gray-50 ${d.netTotal < 0 ? 'bg-rose-50/60' : ''}`}>
              <td className="py-1.5 pr-3 text-gray-600 font-medium">{d.date.slice(5)}</td>
              <td className="py-1.5 pr-2 text-right text-gray-700">{d.roomRevenue > 0 ? d.roomRevenue.toLocaleString() : '—'}</td>
              <td className="py-1.5 pr-2 text-right text-emerald-600">{d.extraCharges > 0 ? d.extraCharges.toLocaleString() : '—'}</td>
              <td className="py-1.5 pr-2 text-right text-teal-600">{d.payments > 0 ? d.payments.toLocaleString() : '—'}</td>
              <td className={`py-1.5 text-right font-semibold ${d.netTotal < 0 ? 'text-rose-600' : 'text-gray-900'}`}>{d.netTotal.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
            <td className="py-2 pr-3 text-[10px] text-gray-500 uppercase tracking-wide">Total</td>
            <td className="py-2 pr-2 text-right text-gray-800">{totals.roomRevenue.toLocaleString()}</td>
            <td className="py-2 pr-2 text-right text-emerald-700">{totals.extraCharges.toLocaleString()}</td>
            <td className="py-2 pr-2 text-right text-teal-700">{totals.payments.toLocaleString()}</td>
            <td className={`py-2 text-right ${totals.netTotal < 0 ? 'text-rose-600' : 'text-gray-900'}`}>{totals.netTotal.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function AccountTable({ rows, title }: { rows: CompanyRevenue[]; title: string }) {
  const [search, setSearch] = useState('')
  const filtered = rows.filter((r) => !search || r.name.toLowerCase().includes(search.toLowerCase()))
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 w-36"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No data</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide"># Stays</th>
              <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Revenue</th>
              <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Avg Rate</th>
              <th className="text-right py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide">Last Stay</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((co, i) => (
              <tr key={co.id ?? i} className="border-b border-gray-50 hover:bg-gray-50/50">
                <td className="py-2 font-medium text-gray-800 max-w-[120px] truncate" title={co.name}>{co.name}</td>
                <td className="py-2 text-right text-gray-600">{co.reservationCount}</td>
                <td className="py-2 text-right font-semibold text-gray-900">฿{co.revenue.toLocaleString()}</td>
                <td className="py-2 text-right text-gray-600">฿{co.avgRate.toLocaleString()}</td>
                <td className="py-2 text-right text-gray-500">{co.lastStay ? co.lastStay.slice(5) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function AnalyticsView() {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(today)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [compareYear, setCompareYear] = useState(false)

  async function load(fromVal = from, toVal = to, cmp = compareYear) {
    setLoading(true)
    setError('')
    try {
      const cy = cmp ? `&compareYear=${new Date(fromVal).getFullYear() - 1}` : ''
      const res = await fetch(`/api/analytics?from=${fromVal}&to=${toVal}${cy}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setData(json)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(from, to) }, [])

  const presets = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
  ]

  function applyPreset(days: number) {
    const f = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    setFrom(f)
    setTo(today)
    load(f, today)
  }

  function handleToggleCompare() {
    const next = !compareYear
    setCompareYear(next)
    load(from, to, next)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Revenue and occupancy insights</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => applyPreset(p.days)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Last {p.label}
            </button>
          ))}
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500" />
          <span className="text-gray-400 text-xs">→</span>
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500" />
          <button
            onClick={() => load(from, to)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Apply
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={`฿${(data.summary.totalRevenue / 1000).toFixed(0)}k`} sub={`${data.summary.totalRoomNights} room nights`} icon={DollarSign} color="bg-emerald-500" />
            <KpiCard label="Avg Occupancy" value={`${data.summary.avgOccupancy}%`} sub="of total rooms" icon={Hotel} color="bg-sky-500" />
            <KpiCard label="Avg Daily Rate" value={`฿${data.summary.avgRate.toLocaleString()}`} sub="per occupied room" icon={TrendingUp} color="bg-indigo-500" />
            <KpiCard label="RevPAR" value={`฿${data.summary.revPar.toLocaleString()}`} sub="revenue per available room" icon={BarChart3} color="bg-purple-500" />
          </div>

          {/* Revenue column chart + daily table */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-gray-800 text-sm">Daily Revenue</h3>
              <button
                onClick={handleToggleCompare}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  compareYear
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Compare Last Year
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ColumnChart
                  data={data.daily}
                  compareData={data.lastYearDaily}
                  showCompare={compareYear && !!data.lastYearDaily}
                />
              </div>
              <div className="lg:col-span-1">
                <DailyTable data={data.daily} />
              </div>
            </div>
          </div>

          {/* Occupancy % chart */}
          <OccupancyChart data={data.daily} totalRooms={data.summary.totalRooms ?? 40} />

          {/* Top 5 days + Source revenue — 2 col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopDays data={data.daily} />
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Revenue by Source
              </h3>
              {data.bySourceRevenue?.length > 0 ? (
                <SourceRevenueChart data={data.bySourceRevenue} />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>

          {/* Room type revenue + Length of Stay — 2 col grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Hotel className="w-4 h-4 text-gray-400" /> Revenue by Room Type
              </h3>
              {data.byRoomType.length > 0 ? (
                <BarChart data={data.byRoomType as Record<string, unknown>[]} valueKey="revenue" labelKey="type" colorClass="bg-indigo-400" />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm">Length of Stay</h3>
              {data.losDistribution?.length > 0 ? (
                <BarChart data={data.losDistribution as Record<string, unknown>[]} valueKey="count" labelKey="nights" colorClass="bg-purple-400" />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>

          {/* Companies and Agents tables */}
          <div className="flex gap-4 flex-wrap">
            <AccountTable rows={data.companiesRevenue} title="Companies" />
            <AccountTable rows={data.agentsRevenue} title="Travel Agents" />
          </div>
        </>
      ) : null}
    </div>
  )
}
