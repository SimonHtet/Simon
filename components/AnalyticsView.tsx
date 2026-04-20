'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Hotel, DollarSign, BarChart3, Users, Building2, RefreshCw } from 'lucide-react'

interface DailyStat {
  date: string
  revenue: number
  occupied: number
  arrivals: number
  departures: number
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
  daily: DailyStat[]
  bySource: { source: string; count: number }[]
  byCompany: { name: string; type: string; revenue: number; nights: number }[]
  byRoomType: { type: string; revenue: number; nights: number }[]
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4.5 h-4.5 text-white w-5 h-5" />
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

function LineChart({ data }: { data: DailyStat[] }) {
  if (data.length < 2) return <div className="h-40 flex items-center justify-center text-sm text-gray-400">Not enough data</div>

  const maxRev = Math.max(...data.map((d) => d.revenue), 1)
  const W = 600
  const H = 120
  const pad = 10

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - 2 * pad)
    const y = H - pad - ((d.revenue / maxRev) * (H - 2 * pad))
    return `${x},${y}`
  })

  const pathD = `M ${points.join(' L ')}`
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${W - pad},${H - pad} L ${pad},${H - pad} Z`

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={pathD} stroke="#0ea5e9" strokeWidth="2" fill="none" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = pad + (i / (data.length - 1)) * (W - 2 * pad)
          const y = H - pad - ((d.revenue / maxRev) * (H - 2 * pad))
          return <circle key={i} cx={x} cy={y} r="3" fill="#0ea5e9" />
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-2">
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.date?.slice(5)}</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
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

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/analytics?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function handleApply() { load() }

  const presets = [
    { label: '7D', days: 7 },
    { label: '30D', days: 30 },
    { label: '90D', days: 90 },
  ]

  function applyPreset(days: number) {
    const f = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    setFrom(f)
    setTo(today)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
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
            onClick={handleApply}
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

          {/* Revenue chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 text-sm">Daily Revenue</h3>
            <LineChart data={data.daily} />
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

          {/* Company breakdown */}
          {data.byCompany.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 text-sm flex items-center gap-2">
                <Building2 className="w-4 h-4 text-gray-400" /> Revenue by Company / Agent
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Name</th>
                      <th className="text-left py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Type</th>
                      <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Nights</th>
                      <th className="text-right py-2 text-xs text-gray-500 font-semibold uppercase tracking-wide">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCompany.map((co, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-2.5 font-medium text-gray-800">{co.name}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${co.type === 'AGENT' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'}`}>
                            {co.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-600">{co.nights}</td>
                        <td className="py-2.5 text-right font-semibold text-gray-900">฿{co.revenue.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
