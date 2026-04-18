'use client'

import { useState } from 'react'
import { Reservation } from '@/types'
import { formatCurrency, formatDate, calculateNights } from '@/lib/utils'
import { X, Printer } from 'lucide-react'

interface Props {
  reservation: Reservation
  onConfirm: () => void
  onClose: () => void
}

const PAYMENT_METHODS = [
  { id: 'credit_card',   label: 'Credit Card' },
  { id: 'cash',          label: 'Cash' },
  { id: 'bank_transfer', label: 'Bank Transfer' },
  { id: 'promptpay',     label: 'PromptPay / QR' },
  { id: 'city_ledger',   label: 'City Ledger' },
]

export default function CheckOutModal({ reservation: res, onConfirm, onClose }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [loading, setLoading] = useState(false)

  const nights = calculateNights(res.checkIn, res.checkOut)
  const roomTotal = res.rate * nights
  const positiveCharges = res.charges.filter((c) => c.amount > 0)
  const payments = res.charges.filter((c) => c.amount < 0)
  const extraTotal = positiveCharges.reduce((s, c) => s + c.amount, 0)
  const paymentTotal = Math.abs(payments.reduce((s, c) => s + c.amount, 0))
  const balance = roomTotal + extraTotal - paymentTotal

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header — plain, no color band */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between shrink-0">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              Guest Folio &amp; Settlement
            </p>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {res.guestName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Room {res.roomId} &nbsp;·&nbsp; {res.reservationNumber} &nbsp;·&nbsp;{' '}
              {formatDate(res.checkIn)} → {formatDate(res.checkOut)} &nbsp;({nights}N)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors mt-0.5"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Body: 60/40 split */}
        <div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-slate-200">

          {/* LEFT — Itemized folio */}
          <div className="flex-[3] overflow-y-auto p-6">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
              Folio Statement
            </p>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  {['Date', 'Description', 'Ref', 'Amount'].map((h) => (
                    <th
                      key={h}
                      className={`pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest ${
                        h === 'Amount' ? 'text-right' : h === 'Ref' ? 'text-center' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Room charge */}
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                    {formatDate(res.checkIn)}
                  </td>
                  <td className="py-2 pr-3 text-[12px] font-bold text-slate-800">
                    Room Charge — {res.roomId}
                    <span className="ml-2 text-[10px] font-medium text-slate-400">
                      ({nights}N × ฿{formatCurrency(res.rate)})
                    </span>
                  </td>
                  <td className="py-2 text-center text-[10px] text-slate-400">ROOM</td>
                  <td className="py-2 text-right text-[12px] font-black text-slate-900">
                    ฿{formatCurrency(roomTotal)}
                  </td>
                </tr>

                {/* Extra charges */}
                {positiveCharges.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {c.date}
                    </td>
                    <td className="py-2 pr-3 text-[12px] font-bold text-slate-800">{c.item}</td>
                    <td className="py-2 text-center text-[10px] text-slate-400">
                      {c.category ?? '—'}
                    </td>
                    <td className="py-2 text-right text-[12px] font-black text-slate-900">
                      ฿{formatCurrency(c.amount)}
                    </td>
                  </tr>
                ))}

                {/* Subtotal */}
                <tr className="border-b border-slate-300">
                  <td colSpan={3} className="pt-3 pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Sub-total
                  </td>
                  <td className="pt-3 pb-2 text-right text-[12px] font-black text-slate-800">
                    ฿{formatCurrency(roomTotal + extraTotal)}
                  </td>
                </tr>

                {/* Payments */}
                {payments.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-2 pr-3 text-[11px] text-slate-500 font-medium whitespace-nowrap">
                      {c.date}
                    </td>
                    <td className="py-2 pr-3 text-[12px] font-bold text-teal-700">{c.item}</td>
                    <td className="py-2 text-center text-[10px] text-teal-500">PMT</td>
                    <td className="py-2 text-right text-[12px] font-black text-teal-600">
                      (฿{formatCurrency(Math.abs(c.amount))})
                    </td>
                  </tr>
                ))}

                {/* Balance */}
                <tr>
                  <td colSpan={3} className="pt-4 text-[11px] font-black text-slate-900 uppercase tracking-wider">
                    Balance Due
                  </td>
                  <td className={`pt-4 text-right text-xl font-black ${balance > 0 ? 'text-slate-900' : 'text-teal-600'}`}>
                    ฿{formatCurrency(balance)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* RIGHT — Settlement panel */}
          <div className="flex-[2] flex flex-col p-6 bg-slate-50">
            {/* Balance hero */}
            <div className="mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Amount to Collect
              </p>
              <p className={`text-4xl font-mono font-black leading-none ${balance > 0 ? 'text-slate-900' : 'text-teal-600'}`}>
                ฿{formatCurrency(balance)}
              </p>
              {balance <= 0 && (
                <p className="text-[10px] font-bold text-teal-500 mt-1 uppercase tracking-wider">
                  Settled — no balance due
                </p>
              )}
            </div>

            {/* Payment method — radio list */}
            <div className="flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Payment Method
              </p>
              <div className="space-y-1">
                {PAYMENT_METHODS.map(({ id, label }) => (
                  <label
                    key={id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                      paymentMethod === id
                        ? 'bg-white border-slate-400 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={id}
                      checked={paymentMethod === id}
                      onChange={() => setPaymentMethod(id)}
                      className="accent-slate-700 w-3.5 h-3.5"
                    />
                    <span className={`text-sm font-bold ${paymentMethod === id ? 'text-slate-900' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Signature line */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Guest Signature
              </p>
              <div className="border-b-2 border-dashed border-slate-300 h-10 rounded-sm bg-white" />
              <p className="text-[9px] text-slate-300 mt-1.5 text-center">
                Sign above to authorise payment
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 bg-white shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-black rounded-lg hover:bg-slate-50 transition-all"
          >
            <Printer className="w-4 h-4" /> Print Folio
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-500 text-sm font-bold rounded-lg hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-lg transition-all shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirm Check-Out'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
