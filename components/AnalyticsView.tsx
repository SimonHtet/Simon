'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, Hotel, DollarSign, BarChart3, Users, Building2, RefreshCw, Search } from 'lucide-react'

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
  }
  daily: DailyRevenue[]
  bySource: { source: string; count: number }[]
  byCompany: { name: string; type: string; revenue: number; nights: number }[]
  byRoomType: { type: string; revenue: number; nights: number }[]
  companiesRevenue: CompanyRevenue[]
  agentsRevenue: CompanyRevenue[]
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
  data: any[]
  valueKey: string
  labelKey: string
  colorClass?: string
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1)
  return (
    <div className="space-y-2">
      {data.slice(0, 8).map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 text-xs text-gray-600 truncate text-right">{item[labelKey]}</div>
          <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${colorClass} transition-all duration-500`}
              style={{ width: `${(item[valueKey] / max) * 100}%` }}
            />
            <span className="absolute right-2 top-0 h-full flex items-center text-xs font-medium text-gray-700">
              {typeof item[valueKey] === 'number' && item[valueKey] > 999
                ? `฿${(item[valueKey] / 1000).toFixed(0)}k`
                : item[valueKey]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

const VB_W = 600
const VB_H = 120
const VB_PAD = 10
const TOOLTIP_W = 168

function RevenueLineChart({
  data,
  compareData,
  showCompare,
}: {
  data: DailyRevenue[]
  compareData?: DailyRevenue[]
  showCompare: boolean
}) {
  // Only store the nearest data-point index — no raw pixel coords in state
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  if (data.length < 2) return (
    <div className="h-40 flex items-center justify-center text-sm text-gray-400">Not enough data</div>
  )

  const maxRev = Math.max(
    ...data.map((d) => d.roomRevenue + d.extraCharges),
    ...(compareData || []).map((d) => d.roomRevenue + d.extraCharges),
    1
  )

  function makePoints(arr: DailyRevenue[]) {
    return arr.map((d, i) => {
      const x = VB_PAD + (i / (arr.length - 1)) * (VB_W - 2 * VB_PAD)
      const y = VB_H - VB_PAD - (((d.roomRevenue + d.extraCharges) / maxRev) * (VB_H - 2 * VB_PAD))
      return { x, y, d }
    })
  }

  const pts = makePoints(data)
  const pathD = `M ${pts.map((p) => `${p.x},${p.y}`).join(' L ')}`
  const areaD = `M ${pts[0].x},${pts[0].y} L ${pts.map((p) => `${p.x},${p.y}`).join(' L ')} L ${VB_W - VB_PAD},${VB_H - VB_PAD} L ${VB_PAD},${VB_H - VB_PAD} Z`

  let cmpPathD = ''
  if (showCompare && compareData && compareData.length >= 2) {
    const cpts = makePoints(compareData)
    cmpPathD = `M ${cpts.map((p) => `${p.x},${p.y}`).join(' L ')}`
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setHoveredIdx(Math.round(ratio * (data.length - 1)))
  }

  // Active point lives in SVG viewBox coordinates — SVG handles all scaling
  const activePt = hoveredIdx !== null ? pts[hoveredIdx] : null

  // Convert viewBox x → rendered pixels only when positioning the HTML tooltip
  const renderedX = activePt && svgRef.current
    ? activePt.x * (svgRef.current.getBoundingClientRect().width / VB_W)
    : null
  const svgW = svgRef.current?.getBoundingClientRect().width ?? 600

  return (
    <div className="relative w-full">
      {showCompare && (
        <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-6 h-0.5 bg-sky-500 inline-block" /> Current period</span>
          <span className="flex items-center gap-1.5"><span className="w-6 h-0 border-t-2 border-dashed border-slate-400 inline-block" /> Previous year</span>
        </div>
      )}
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full cursor-crosshair"
          style={{ height: 140 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Full-area overlay so mouse events fire everywhere in the SVG */}
          <rect x="0" y="0" width="100%" height="100%" fill="transparent" pointerEvents="all" />
          <path d={areaD} fill="url(#areaGrad)" />
          {cmpPathD && (
            <path d={cmpPathD} stroke="#94a3b8" strokeWidth="1.5" fill="none" strokeDasharray="4 3" strokeLinejoin="round" />
          )}
          <path d={pathD} stroke="#0ea5e9" strokeWidth="2" fill="none" strokeLinejoin="round" />
          {/* Vertical dashed hairline + dot — both in viewBox space, SVG scales them */}
          {activePt && (
            <>
              <line
                x1={activePt.x} y1={VB_PAD}
                x2={activePt.x} y2={VB_H - VB_PAD}
                stroke="#0ea5e9" strokeWidth="1" strokeDasharray="3 2" opacity="0.45"
              />
              <circle cx={activePt.x} cy={activePt.y} r="4" fill="#0ea5e9" stroke="white" strokeWidth="2" />
            </>
          )}
        </svg>

        {/* Tooltip — left computed from viewBox x converted to rendered pixels */}
        {activePt && renderedX !== null && (
          (() => {
            const flipLeft = renderedX > svgW * 0.6
            const left = Math.max(0, Math.min(
              flipLeft ? renderedX - TOOLTIP_W - 12 : renderedX + 12,
              svgW - TOOLTIP_W
            ))
            const d = activePt.d
            return (
              <div
                className="absolute pointer-events-none z-10 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2.5 text-xs"
                style={{ left, top: 8, width: TOOLTIP_W }}
              >
                <p className="font-bold text-gray-800 mb-1.5">{d.date}</p>
                <div className="space-y-1">
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Room Rev</span><span className="font-semibold">฿{d.roomRevenue.toLocaleString()}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Extras</span><span className="font-semibold text-emerald-600">+฿{d.extraCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between gap-4"><span className="text-gray-500">Payments</span><span className="font-semibold text-teal-600">-฿{d.payments.toLocaleString()}</span></div>
                  <div className="flex justify-between gap-4 border-t border-gray-100 pt-1 mt-1"><span className="text-gray-700 font-bold">Net</span><span className={`font-bold ${d.netTotal < 0 ? 'text-rose-600' : 'text-gray-900'}`}>฿{d.netTotal.toLocaleString()}</span></div>
                </div>
              </div>
            )
          })()
        )}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-2">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
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
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics')
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

          {/* Revenue chart + daily table */}
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
                <RevenueLineChart
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

          {/* Companies and Agents tables */}
          <div className="flex gap-4 flex-wrap">
            <AccountTable rows={data.companiesRevenue} title="Companies" />
            <AccountTable rows={data.agentsRevenue} title="Travel Agents" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Bookings by Source
              </h3>
              {data.bySource.length > 0 ? (
                <BarChart data={data.bySource} valueKey="count" labelKey="source" colorClass="bg-sky-400" />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Hotel className="w-4 h-4 text-gray-400" /> Revenue by Room Type
              </h3>
              {data.byRoomType.length > 0 ? (
                <BarChart data={data.byRoomType} valueKey="revenue" labelKey="type" colorClass="bg-indigo-400" />
              ) : <p className="text-sm text-gray-400">No data</p>}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
