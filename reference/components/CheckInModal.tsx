import React, { memo, useState } from 'react';
import { 
  X, 
  Check, 
  Package, 
  Car, 
  Receipt, 
  MapPin, 
  Plus, 
  CheckCircle2 
} from 'lucide-react';
import { Reservation, Room, RoomType } from '../types';

interface CheckInModalProps {
  res: Reservation;
  reservations: Reservation[];
  rooms: Room[];
  ROOM_TYPES: Record<string, RoomType>;
  setModal: (modal: { type: string | null; data: any }) => void;
  handleTogglePackage: (resId: string, pkgId: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  handleCheckIn: (res: Reservation) => void;
}

export const CheckInModal = React.memo(({ 
  res, 
  reservations, 
  rooms, 
  ROOM_TYPES, 
  setModal, 
  handleTogglePackage, 
  addToast, 
  handleCheckIn 
}: CheckInModalProps) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    passport: res.passportNumber || '',
    phone: '+66 ',
    email: '',
    address: ''
  });
  const [verification, setVerification] = useState({
    idVerified: false,
    paymentConfirmed: false,
    roomReady: true
  });

  const room = rooms.find(r => r.id === res.room);

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
        <div>
          <h3 className="text-xl font-black tracking-tight uppercase">Check-In Process</h3>
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Step {step} of 3: {step === 1 ? 'Guest Verification' : step === 2 ? 'Packages & Services' : 'Final Confirmation'}</p>
        </div>
        <button onClick={() => setModal({ type: null, data: null })} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passport / ID Number</label>
                <input 
                  type="text" 
                  value={formData.passport}
                  onChange={(e) => setFormData({...formData, passport: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                  placeholder="Enter Passport ID"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Checklist</p>
              {[
                { id: 'idVerified', label: 'Physical ID / Passport verified' },
                { id: 'paymentConfirmed', label: 'Payment method / Deposit secured' },
                { id: 'roomReady', label: 'Room inspection complete' }
              ].map(item => (
                <label key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={(verification as any)[item.id]}
                    onChange={() => setVerification({...verification, [item.id]: !(verification as any)[item.id]})}
                    className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-bold text-slate-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Packages & Services</p>
              <button 
                onClick={() => setModal({ type: 'manage_packages', data: res })}
                className="text-[10px] font-black text-teal-600 uppercase hover:underline"
              >
                Manage All Add-ons
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'parking', label: 'Parking (Car)', icon: <Car className="w-5 h-5" /> },
                { id: 'breakfast', label: 'Daily Breakfast', icon: <Receipt className="w-5 h-5" /> },
                { id: 'transfer', label: 'Airport Transfer', icon: <MapPin className="w-5 h-5" /> },
                { id: 'extrabed', label: 'Extra Bed', icon: <Plus className="w-5 h-5" /> },
              ].map(pkg => {
                const pkgData = (res.packages && res.packages[pkg.id]) || { active: false };
                return (
                  <button 
                    key={pkg.id}
                    onClick={() => {
                      handleTogglePackage(res.id, pkg.id);
                      addToast(`${pkg.label} ${!pkgData.active ? 'added' : 'removed'}`);
                    }}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      pkgData.active 
                        ? "bg-teal-50 border-teal-500 text-teal-700 shadow-md" 
                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {pkg.icon}
                      <span className="text-sm font-black uppercase tracking-tight">{pkg.label}</span>
                    </div>
                    {pkgData.active && <CheckCircle2 className="w-5 h-5 text-teal-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center animate-in slide-in-from-right-4 duration-300">
            <div className="w-20 h-20 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-slate-900 mb-2">Ready to Check In</h4>
              <p className="text-slate-500 max-w-md mx-auto">All verifications complete. Room {res.room} is assigned and ready for {res.guest}.</p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Room Number</span>
                <span className="text-lg font-black text-slate-900">{res.room}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Room Type</span>
                <span className="text-sm font-bold text-slate-700">{room ? ROOM_TYPES[room.type].name : 'Standard'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Departure Date</span>
                <span className="text-sm font-bold text-slate-700">{res.checkOut}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
        <button 
          onClick={() => step > 1 && setStep(step - 1)}
          className={`px-6 py-2 font-bold text-slate-500 hover:text-slate-700 transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : ''}`}
        >
          Back
        </button>
        <div className="flex gap-3">
          {step < 3 ? (
            <button 
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!formData.passport || !verification.idVerified || !verification.paymentConfirmed)}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={() => {
                handleCheckIn(res);
                setModal({ type: null, data: null });
              }}
              className="px-10 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
            >
              Complete Check-In
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
