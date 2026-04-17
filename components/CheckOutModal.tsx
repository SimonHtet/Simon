'use client'

import { useState } from 'react'
import { Reservation } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { X, CreditCard, Banknote, Smartphone, Receipt, ArrowRight, Plus } from 'lucide-react'

interface Props {
  reservation: Reservation
  onConfirm: () => void
  onClose: () => void
}

export default function CheckOutModal({ reservation: res, onConfirm, onClose }: Props) {
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [loading, setLoading] = useState(false)
  const [isGroupBilling, setIsGroupBilling] = useState(false)

  const nights = res.totalNights
  const roomCharges = res.rate * nights
  const extraCharges = res.charges
    .filter((c) => c.amount > 0)
    .reduce((sum, c) => sum + c.amount, 0)
  const payments = Math.abs(
    res.charges.filter((c) => c.amount < 0).reduce((sum, c) => sum + c.amount, 0)
  )
  const total = roomCharges + extraCharges - payments

  const hasGroup = !!res.masterResId

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
          <div>
            <h3 className="text-xl font-black tracking-tight uppercase">Final Settlement</h3>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">
              Room {res.roomId} · {res.guestName}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Billing Summary */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Billing Summary
              </p>
              {hasGroup && (
                <button
                  onClick={() => setIsGroupBilling(!isGroupBilling)}
                  className={`text-[10px] font-black px-2 py-1 rounded transition-all ${
                    isGroupBilling ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  GROUP BILLING
                </button>
              )}
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Room Charges ({nights} nights)</span>
                <span className="text-slate-900 font-bold">฿{formatCurrency(roomCharges)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Extra Charges / Mini Bar</span>
                  <button
                    className="p-1 bg-amber-100 text-amber-600 rounded hover:bg-amber-200 transition-colors"
                    title="Add charge"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-slate-900 font-bold">฿{formatCurrency(extraCharges)}</span>
              </div>
              {payments > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Payments Received</span>
                  <span className="text-teal-600 font-bold">− ฿{formatCurrency(payments)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Total Balance
                </span>
                <span className="text-3xl font-mono font-black text-amber-600">
                  ฿{formatCurrency(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'credit_card', label: 'Card', Icon: CreditCard },
                { id: 'cash', label: 'Cash', Icon: Banknote },
                { id: 'qr', label: 'PromptPay', Icon: Smartphone },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === id
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">
            <Receipt className="w-5 h-5" /> Print Folio
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-[2] flex items-center justify-center gap-3 px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                Settle &amp; Check Out <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
