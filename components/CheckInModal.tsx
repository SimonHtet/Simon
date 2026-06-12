'use client'

import { useState } from 'react'
import { Reservation } from '@/types'
import { formatDate } from '@/lib/utils'
import { X, Check, Car, Receipt, MapPin, Plus, CheckCircle2 } from 'lucide-react'

interface Props {
  reservation: Reservation
  onConfirm: (data: { eta?: string; flightNumber?: string }) => void
  onClose: () => void
}

const PACKAGES = [
  { id: 'PARKING', label: 'Parking (Car)', Icon: Car },
  { id: 'BREAKFAST', label: 'Daily Breakfast', Icon: Receipt },
  { id: 'AIRPORT', label: 'Airport Transfer', Icon: MapPin },
  { id: 'EXTRABED', label: 'Extra Bed', Icon: Plus },
]

export default function CheckInModal({ reservation: res, onConfirm, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [passport, setPassport] = useState(res.passportNumber || '')
  const [phone, setPhone] = useState(res.guest?.phone || '+66 ')
  const [verification, setVerification] = useState({
    idVerified: false,
    paymentConfirmed: false,
    roomReady: false,
  })
  const [activePackages, setActivePackages] = useState<Set<string>>(
    new Set(res.packages.filter((p) => p.active).map((p) => p.pkgId))
  )
  const [loading, setLoading] = useState(false)

  const canProceedStep1 =
    passport.trim() !== '' && verification.idVerified && verification.paymentConfirmed

  function togglePackage(pkgId: string) {
    setActivePackages((prev) => {
      const next = new Set(prev)
      if (next.has(pkgId)) next.delete(pkgId)
      else next.add(pkgId)
      return next
    })
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm({})
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">Check-In Process</h3>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
              Step {step} of 3:{' '}
              {step === 1
                ? 'Guest Verification'
                : step === 2
                ? 'Packages & Services'
                : 'Final Confirmation'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Passport / ID Number
                  </label>
                  <input
                    type="text"
                    value={passport}
                    onChange={(e) => setPassport(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                    placeholder="Enter Passport / ID"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Contact Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Verification Checklist
                </p>
                {[
                  { id: 'idVerified', label: 'Physical ID / Passport verified' },
                  { id: 'paymentConfirmed', label: 'Payment method / Deposit secured' },
                  { id: 'roomReady', label: 'Room inspection complete' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={(verification as any)[item.id]}
                      onChange={() =>
                        setVerification((v) => ({ ...v, [item.id]: !(v as any)[item.id] }))
                      }
                      className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Select Packages & Services
              </p>
              <div className="grid grid-cols-2 gap-4">
                {PACKAGES.map(({ id, label, Icon }) => {
                  const active = activePackages.has(id)
                  return (
                    <button
                      key={id}
                      onClick={() => togglePackage(id)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        active
                          ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-md'
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="text-sm font-black uppercase tracking-tight">{label}</span>
                      </div>
                      {active && <CheckCircle2 className="w-5 h-5 text-teal-500" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-2xl font-black text-slate-900 mb-2">Ready to Check In</h4>
                <p className="text-slate-500 max-w-md mx-auto">
                  All verifications complete. Room {res.roomId} is assigned and ready for{' '}
                  {res.guestName}.
                </p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Room Number
                  </span>
                  <span className="text-lg font-black text-slate-900">{res.roomId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Room Type
                  </span>
                  <span className="text-sm font-bold text-slate-700">{res.roomTypeId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Departure Date
                  </span>
                  <span className="text-sm font-bold text-slate-700">{formatDate(res.checkOut)}</span>
                </div>
              </div>
              {res.specials && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left">
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1">
                    Special Requests
                  </p>
                  <p className="text-sm text-amber-800 font-medium">{res.specials}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className={`px-6 py-2 font-bold text-slate-500 hover:text-slate-700 transition-colors ${
              step === 1 ? 'opacity-0 pointer-events-none' : ''
            }`}
          >
            Back
          </button>
          <div className="flex gap-3">
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !canProceedStep1}
                className="px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="px-10 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
              >
                {loading ? 'Checking In...' : 'Complete Check-In'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
