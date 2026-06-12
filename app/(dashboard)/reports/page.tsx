'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/rbac'
import { FileBarChart, Globe, ExternalLink } from 'lucide-react'

const inputCls = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent'

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function ReportsPage() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string })?.role ?? ''
  const canViewFinancials = hasPermission(role, 'VIEW_FINANCIALS')

  const [flashDate, setFlashDate] = useState(today())
  const [regDate, setRegDate] = useState(today())

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Printable operational reports</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {canViewFinancials && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Manager Flash Report</h2>
                <p className="text-xs text-gray-500">Occupancy, revenue, ADR, collections, arrivals & departures</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <input
                type="date"
                value={flashDate}
                onChange={(e) => setFlashDate(e.target.value)}
                className={inputCls}
              />
              <button
                onClick={() => window.open(`/print/report?date=${flashDate}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Report
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Foreign Guest Registration</h2>
              <p className="text-xs text-gray-500">Immigration report of foreign guest arrivals (full passport numbers)</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <input
              type="date"
              value={regDate}
              onChange={(e) => setRegDate(e.target.value)}
              className={inputCls}
            />
            <button
              onClick={() => window.open(`/print/foreigner-reg?date=${regDate}`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <ExternalLink className="w-4 h-4" /> Open Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
