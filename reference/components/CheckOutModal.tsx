import React, { memo, useState } from 'react';
import { 
  X, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Receipt, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { Reservation } from '../types';

interface CheckOutModalProps {
  res: Reservation;
  reservations: Reservation[];
  handleCheckOut: (res: Reservation) => void;
  calculateNights: (start: string, end: string) => number;
  onClose: () => void;
  setModal: (modal: { type: string | null; data: any }) => void;
}

export const CheckOutModal = React.memo(({ 
  res, 
  reservations, 
  handleCheckOut, 
  calculateNights,
  onClose,
  setModal
}: CheckOutModalProps) => {
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGroupBilling, setIsGroupBilling] = useState(false);

  const nights = calculateNights(res.checkIn, res.checkOut);
  const roomCharges = res.rate * nights;
  const extraCharges = (res.charges || []).reduce((sum, c) => sum + c.amount, 0);
  const total = roomCharges + extraCharges;

  const groupReservations = reservations.filter(r => r.masterResId === res.id || (res.masterResId && r.id === res.masterResId) || (res.masterResId && r.masterResId === res.masterResId));
  const groupTotal = groupReservations.reduce((sum, r) => {
    const n = calculateNights(r.checkIn, r.checkOut);
    return sum + (r.rate * n) + (r.charges || []).reduce((s, c) => s + c.amount, 0);
  }, 0);

  const onConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      handleCheckOut(res);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
        <div>
          <h3 className="text-xl font-black tracking-tight uppercase">Final Settlement</h3>
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Room {res.room} • {res.guest}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8 space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Summary</p>
            {groupReservations.length > 1 && (
              <button 
                onClick={() => setIsGroupBilling(!isGroupBilling)}
                className={`text-[10px] font-black px-2 py-1 rounded transition-all ${isGroupBilling ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}
              >
                GROUP BILLING ({groupReservations.length})
              </button>
            )}
          </div>
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Room Charges ({nights} nights)</span>
              <span className="text-slate-900 font-bold">฿{roomCharges.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">Extra Charges / Mini Bar</span>
                <button 
                  onClick={() => setModal({ type: 'add_charge', data: res })}
                  className="p-1 bg-amber-100 text-amber-600 rounded hover:bg-amber-200 transition-colors"
                  title="Add new charge"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <span className="text-slate-900 font-bold">฿{extraCharges.toLocaleString()}</span>
            </div>
            {isGroupBilling && (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="text-amber-600 font-bold italic">Other Group Rooms</span>
                <span className="text-amber-600 font-bold">฿{(groupTotal - total).toLocaleString()}</span>
              </div>
            )}
            <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-lg font-black text-slate-900 uppercase tracking-tight">Total Balance</span>
              <span className="text-3xl font-mono font-black text-amber-600">฿{(isGroupBilling ? groupTotal : total).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Method</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'credit_card', label: 'Card', icon: <CreditCard className="w-5 h-5" /> },
              { id: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" /> },
              { id: 'qr', label: 'PromptPay', icon: <Smartphone className="w-5 h-5" /> },
            ].map(method => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  paymentMethod === method.id 
                    ? "border-amber-500 bg-amber-50 text-amber-700 shadow-md" 
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                {method.icon}
                <span className="text-[10px] font-black uppercase">{method.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">
          <Receipt className="w-5 h-5" /> Print Folio
        </button>
        <button 
          onClick={onConfirm}
          disabled={isProcessing}
          className="flex-[2] flex items-center justify-center gap-3 px-10 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>Settle & Check Out <ArrowRight className="w-5 h-5" /></>
          )}
        </button>
      </div>
    </div>
  );
});
