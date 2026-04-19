'use client'

import { useState } from 'react'
import { Reservation, Charge } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { X, LogOut, BedDouble, User, Calendar, Receipt } from 'lucide-react'

interface Props {
  reservation: Reservation
  onConfirm: () => void
  onClose: () => void
}

export default function CheckOutModal({ reservation: res, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  const charges = res.charges.filter((c) => c.amount > 0)
  const payments = res.charges.filter((c) => c.amount < 0)

  const totalCharges = charges.reduce((sum, c) => sum + c.amount, 0)
  const totalPayments = Math.abs(payments.reduce((sum, c) => sum + c.amount, 0))
  const balance = totalCharges - totalPayments

  // If no charges posted, use the room rate total
  const displayTotal = totalCharges > 0 ? totalCharges : res.totalAmount
  const displayBalance = totalCharges > 0 ? balance : res.totalAmount - totalPayments

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <LogOut className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Confirm Check-Out</h2>
              <p className="text-xs text-gray-500">{res.reservationNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stay summary */}
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Guest
              </p>
              <p className="font-semibold text-gray-900">{res.guestName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <BedDouble className="w-3 h-3" /> Room
              </p>
              <p className="font-semibold text-gray-900">{res.roomId}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Stay
              </p>
              <p className="font-semibold text-gray-900">{res.totalNights}N</p>
              <p className="text-xs text-gray-500">{formatDate(res.checkIn)} – {formatDate(res.checkOut)}</p>
            </div>
          </div>

          {/* Folio */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Receipt className="w-4 h-4 text-gray-500" />
              <h3 className="font-semibold text-gray-800">Guest Folio</h3>
            </div>

            {res.charges.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Room Charge ({res.totalNights}N × ฿{formatCurrency(res.rate)})</span>
                  <span className="font-medium">฿{formatCurrency(res.totalAmount)}</span>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Description</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Date</th>
                      <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {res.charges.map((c) => (
                      <tr key={c.id} className={c.amount < 0 ? 'bg-green-50' : ''}>
                        <td className="px-4 py-2.5 text-gray-800">{c.item}</td>
                        <td className="px-4 py-2.5 text-gray-500">{c.date}</td>
                        <td className={`px-4 py-2.5 text-right font-medium ${c.amount < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                          {c.amount < 0 ? '-' : ''}฿{formatCurrency(Math.abs(c.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total Charges</span>
                <span>฿{formatCurrency(displayTotal)}</span>
              </div>
              {totalPayments > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Total Payments</span>
                  <span>- ฿{formatCurrency(totalPayments)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
                <span>Balance Due</span>
                <span className={displayBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                  ฿{formatCurrency(Math.abs(displayBalance))}
                  {displayBalance < 0 && ' (Credit)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? 'Checking out...' : 'Confirm Check-Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
