import React, { memo, useState } from 'react';
import { 
  X, 
  Plus, 
  Calendar, 
  User, 
  MapPin, 
  Check, 
  CreditCard, 
  Smartphone, 
  Banknote, 
  AlertCircle, 
  ArrowRightLeft,
  Receipt,
  Sparkles,
  CheckCircle2,
  Car
} from 'lucide-react';
import { Reservation, Room, Charge } from '../types';
import { ROOM_TYPES } from '../data';

interface ModalOverlayProps {
  children: React.ReactNode;
  onClose: () => void;
  type: string;
}

export const ModalOverlay = React.memo(({ children, onClose, type }: ModalOverlayProps) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
    <div className="absolute inset-0" onClick={onClose}></div>
    <div className="relative z-10 w-full flex justify-center">
      {children}
    </div>
  </div>
));

interface NewResModalProps {
  prefilled: any;
  rooms: Room[];
  reservations: Reservation[];
  onCreate: (res: any) => void;
  onClose: () => void;
}

export const NewResModal = React.memo(({ prefilled, rooms, reservations, onCreate, onClose }: NewResModalProps) => {
  const [formData, setFormData] = useState({
    guest: '',
    room: prefilled?.room || '',
    checkIn: '2024-12-07',
    checkOut: '2024-12-08',
    nationality: '🇹🇭',
    rate: 1200
  });

  const selectedRoom = rooms.find(r => r.id === formData.room);
  const roomRate = selectedRoom ? ROOM_TYPES[selectedRoom.type].rate : 1200;

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">New Reservation</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3 h-3" /> Guest Full Name
            </label>
            <input 
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
              placeholder="Enter guest name"
              value={formData.guest}
              onChange={(e) => setFormData({...formData, guest: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Room Number
              </label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700 appearance-none"
                value={formData.room}
                onChange={(e) => setFormData({...formData, room: e.target.value})}
              >
                <option value="">Select Room</option>
                {rooms.filter(r => r.status === 'available').map(r => (
                  <option key={r.id} value={r.id}>{r.id} - {ROOM_TYPES[r.type].name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nationality</label>
              <input 
                type="text" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                value={formData.nationality}
                onChange={(e) => setFormData({...formData, nationality: e.target.value})}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Arrival
              </label>
              <input 
                type="date" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                value={formData.checkIn}
                onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" /> Departure
              </label>
              <input 
                type="date" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
                value={formData.checkOut}
                onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
              />
            </div>
          </div>
        </div>
        <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 flex justify-between items-center">
          <div>
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Estimated Rate</p>
            <p className="text-xl font-black text-teal-700">฿{roomRate.toLocaleString()}<span className="text-xs font-bold opacity-60">/night</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Total Stay</p>
            <p className="text-sm font-black text-teal-700">฿{roomRate.toLocaleString()}</p>
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => onCreate({...formData, rate: roomRate})}
          className="flex-[2] px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
        >
          Create Reservation
        </button>
      </div>
    </div>
  );
});

interface NewTraceModalProps {
  res: Reservation;
  onAdd: (resId: string, text: string, department: string) => void;
  onClose: () => void;
}

export const NewTraceModal = React.memo(({ res, onAdd, onClose }: NewTraceModalProps) => {
  const [text, setText] = useState('');
  const [dept, setDept] = useState('FRONT OFFICE');
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-500 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">New Trace</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-700"
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          >
            <option>FRONT OFFICE</option>
            <option>HOUSEKEEPING</option>
            <option>MAINTENANCE</option>
            <option>FOOD & BEVERAGE</option>
            <option>CONCIERGE</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trace Message</label>
          <textarea 
            autoFocus
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-slate-700"
            rows={4}
            placeholder="What needs to be done?"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => onAdd(res.id, text, dept)}
          className="flex-[2] px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl transition-all shadow-lg shadow-amber-500/20"
        >
          Add Trace
        </button>
      </div>
    </div>
  );
});

interface PackageConfigModalProps {
  res: Reservation;
  pkgId: string;
  onSave: (resId: string, pkgId: string, metadata: any) => void;
  onClose: () => void;
}

export const PackageConfigModal = React.memo(({ res, pkgId, onSave, onClose }: PackageConfigModalProps) => {
  const [metadata, setMetadata] = useState({ licensePlate: '', carModel: '' });
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Parking Details</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">License Plate</label>
          <input 
            autoFocus
            type="text" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
            placeholder="e.g. 1กข 1234"
            value={metadata.licensePlate}
            onChange={(e) => setMetadata({...metadata, licensePlate: e.target.value})}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Car Model / Color</label>
          <input 
            type="text" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
            placeholder="e.g. Toyota Camry White"
            value={metadata.carModel}
            onChange={(e) => setMetadata({...metadata, carModel: e.target.value})}
          />
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => onSave(res.id, pkgId, metadata)}
          className="flex-[2] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          Save & Enable
        </button>
      </div>
    </div>
  );
});

export const ManagePackagesModal = React.memo(({ res, onToggle, onClose, setModal }: { res: Reservation, onToggle: (resId: string, pkgId: string) => void, onClose: () => void, setModal: (modal: any) => void }) => {
  const availablePackages = [
    { id: 'parking', label: 'Parking (Car)', icon: <Car className="w-5 h-5" />, price: 0 },
    { id: 'breakfast', label: 'Daily Breakfast', icon: <Receipt className="w-5 h-5" />, price: 350 },
    { id: 'transfer', label: 'Airport Transfer', icon: <MapPin className="w-5 h-5" />, price: 800 },
    { id: 'extrabed', label: 'Extra Bed', icon: <Plus className="w-5 h-5" />, price: 1000 },
    { id: 'late_checkout', label: 'Late Check-out', icon: <Calendar className="w-5 h-5" />, price: 500 },
    { id: 'early_checkin', label: 'Early Check-in', icon: <Calendar className="w-5 h-5" />, price: 500 },
    { id: 'laundry_pkg', label: 'Laundry Package', icon: <Sparkles className="w-5 h-5" />, price: 300 },
    { id: 'spa_access', label: 'Spa & Wellness', icon: <User className="w-5 h-5" />, price: 1200 },
  ];

  return (
    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Manage Packages & Add-ons</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-2 gap-4">
          {availablePackages.map(pkg => {
            const pkgData = (res.packages && res.packages[pkg.id]) || { active: false };
            return (
              <button 
                key={pkg.id}
                onClick={() => {
                  if (pkg.id === 'parking' && !pkgData.active) {
                    setModal({ type: 'package_config', data: { res, pkgId: pkg.id } });
                  } else {
                    onToggle(res.id, pkg.id);
                  }
                }}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  pkgData.active 
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md" 
                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${pkgData.active ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {pkg.icon}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-black uppercase tracking-tight block">{pkg.label}</span>
                    <span className="text-[10px] font-bold opacity-60">฿{pkg.price.toLocaleString()} / stay</span>
                  </div>
                </div>
                {pkgData.active && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
        <button onClick={onClose} className="px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20">
          Done
        </button>
      </div>
    </div>
  );
});

interface AddChargeModalProps {
  res: Reservation;
  onAdd: (resId: string, charge: Omit<Charge, 'id'>) => void;
  onClose: () => void;
}

export const AddChargeModal = React.memo(({ res, onAdd, onClose }: AddChargeModalProps) => {
  const [formData, setFormData] = useState({ item: '', amount: 0, category: 'F&B' });
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Add Charge</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            <option value="F&B">Food & Beverage</option>
            <option value="MINIBAR">Mini Bar</option>
            <option value="LAUNDRY">Laundry</option>
            <option value="DAMAGE">Damage / Loss</option>
            <option value="TRANSPORT">Transportation</option>
            <option value="OTHER">Other Service</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Description</label>
          <input 
            autoFocus
            type="text" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
            placeholder="e.g. Mini Bar - Beer"
            value={formData.item}
            onChange={(e) => setFormData({...formData, item: e.target.value})}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount (THB)</label>
          <input 
            type="number" 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-slate-700"
            value={formData.amount}
            onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
          />
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => onAdd(res.id, { ...formData, date: '2024-12-07' })}
          className="flex-[2] px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
        >
          Post Charge
        </button>
      </div>
    </div>
  );
});

interface PaymentMethodModalProps {
  res: Reservation;
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  onClose: () => void;
}

export const PostPaymentModal = React.memo(({ res, onPost, onClose }: { res: Reservation, onPost: (resId: string, item: string, amount: number, category: string) => void, onClose: () => void }) => {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState('VISA');
  
  const paymentMethods = [
    { id: 'VISA', label: 'Visa', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'MASTERCARD', label: 'Mastercard', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'AMEX', label: 'Amex', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'CASH', label: 'Cash', icon: <Banknote className="w-5 h-5" /> },
    { id: 'TRANSFER', label: 'Bank Transfer', icon: <Smartphone className="w-5 h-5" /> },
  ];

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-teal-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Post Payment</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Method</label>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  method === m.id 
                    ? "border-teal-500 bg-teal-50 text-teal-700 shadow-md" 
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                }`}
              >
                {m.icon}
                <span className="text-[9px] font-black uppercase">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment Amount (THB)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-2xl text-slate-700 focus:ring-2 focus:ring-teal-500 transition-all"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => {
            onPost(res.id, `Payment - ${method}`, -amount, 'PAYMENT');
            onClose();
          }}
          className="flex-[2] px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl transition-all shadow-lg shadow-teal-600/20"
        >
          Post Payment
        </button>
      </div>
    </div>
  );
});

export const PaymentMethodModal = React.memo(({ res, addToast, onClose }: PaymentMethodModalProps) => {
  const [method, setMethod] = useState('credit_card');
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Payment Method</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'credit_card', label: 'Card', icon: <CreditCard className="w-5 h-5" /> },
            { id: 'cash', label: 'Cash', icon: <Banknote className="w-5 h-5" /> },
            { id: 'qr', label: 'PromptPay', icon: <Smartphone className="w-5 h-5" /> },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setMethod(m.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                method === m.id 
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md" 
                  : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
              }`}
            >
              {m.icon}
              <span className="text-[10px] font-black uppercase">{m.label}</span>
            </button>
          ))}
        </div>
        {method === 'credit_card' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Card Number</label>
              <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" placeholder="**** **** **** 4421" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expiry</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" placeholder="MM/YY" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CVV</label>
                <input type="text" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700" placeholder="***" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => {
            addToast('Payment method updated successfully', 'success');
            onClose();
          }}
          className="flex-[2] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          Update Method
        </button>
      </div>
    </div>
  );
});

interface CancelModalProps {
  res: Reservation;
  onCancel: (res: Reservation, reason: string) => void;
  onClose: () => void;
}

export const CancelModal = React.memo(({ res, onCancel, onClose }: CancelModalProps) => {
  const [reason, setReason] = useState('Guest Request');
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-rose-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Cancel Reservation</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-xs font-medium text-rose-700">Are you sure you want to cancel the reservation for <span className="font-black">{res.guest}</span>? This action cannot be undone.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancellation Reason</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-slate-700"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option>Guest Request</option>
            <option>Duplicate Booking</option>
            <option>Travel Plans Changed</option>
            <option>No Deposit Received</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Keep Res</button>
        <button 
          onClick={() => onCancel(res, reason)}
          className="flex-[2] px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition-all shadow-lg shadow-rose-600/20"
        >
          Confirm Cancellation
        </button>
      </div>
    </div>
  );
});

interface MoveRoomModalProps {
  res: Reservation;
  rooms: Room[];
  onMove: (res: Reservation, newRoomId: string, reason: string) => void;
  onClose: () => void;
}

export const MoveRoomModal = React.memo(({ res, rooms, onMove, onClose }: MoveRoomModalProps) => {
  const [newRoom, setNewRoom] = useState('');
  const [reason, setReason] = useState('Guest Request');
  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
        <h3 className="text-xl font-black tracking-tight uppercase">Move Room</h3>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-8 space-y-6">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Room</label>
          <div className="px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-500">{res.room}</div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ArrowRightLeft className="w-3 h-3" /> New Room Assignment
          </label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
          >
            <option value="">Select Available Room</option>
            {rooms.filter(r => r.status === 'available').map(r => (
              <option key={r.id} value={r.id}>{r.id} - {ROOM_TYPES[r.type].name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason for Move</label>
          <select 
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option>Guest Request</option>
            <option>Room Maintenance Issue</option>
            <option>Upgrade</option>
            <option>Downgrade</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onClose} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
        <button 
          onClick={() => onMove(res, newRoom, reason)}
          disabled={!newRoom}
          className="flex-[2] px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          Confirm Move
        </button>
      </div>
    </div>
  );
});
