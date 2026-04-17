import React, { memo, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Pencil, 
  UserCheck, 
  Sparkles, 
  CalendarCheck, 
  CreditCard, 
  MessageSquare, 
  Key, 
  Car, 
  Receipt, 
  MapPin, 
  Plus, 
  AlertCircle, 
  Settings, 
  ClipboardList, 
  History, 
  Package, 
  CheckCircle2, 
  ArrowLeft, 
  Save, 
  Printer, 
  FileText, 
  Check, 
  ArrowRightLeft, 
  Grid3X3 
} from 'lucide-react';
import { Reservation, Room, RoomType } from '../types';

interface ReservationDetailPanelProps {
  resId: string;
  onClose: () => void;
  initialCheckInMode?: boolean;
  reservations: Reservation[];
  rooms: Room[];
  ROOM_TYPES: Record<string, RoomType>;
  setModal: (modal: { type: string | null; data: any }) => void;
  setReservations: React.Dispatch<React.SetStateAction<Reservation[]>>;
  handleCheckIn: (res: Reservation) => void;
  handleTogglePackage: (resId: string, pkgId: string) => void;
  handleResolveTrace: (resId: string, traceId: number) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  calculateNights: (start: string, end: string) => number;
  getResStatusBadge: (status: string) => string;
  handleNoShow: (res: Reservation) => void;
  handleExtendStay: (res: Reservation) => void;
}

export const ReservationDetailPanel = React.memo(({ 
  resId, 
  onClose, 
  initialCheckInMode = false, 
  reservations, 
  rooms, 
  ROOM_TYPES, 
  setModal, 
  setReservations, 
  handleCheckIn, 
  handleTogglePackage, 
  handleResolveTrace, 
  addToast, 
  calculateNights, 
  getResStatusBadge,
  handleNoShow,
  handleExtendStay
}: ReservationDetailPanelProps) => {
    const res = reservations.find(r => r.id === resId);
    if (!res) return null;
    const room = rooms.find(r => r.id === res.room);
    if (!room) return null;
    
    const [activeDetailTab, setActiveDetailTab] = useState('charges');
    const [editingField, setEditingField] = useState<string | null>(null);
    const [localRes, setLocalRes] = useState(res);
    const [checkInMode, setCheckInMode] = useState(initialCheckInMode);
    const [verification, setVerification] = useState({
      idVerified: false,
      roomReady: false,
      rateConfirmed: false,
      paymentConfirmed: false,
      keysIssued: 0,
      specialRequests: false
    });
    const [successState, setSuccessState] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live clock for check-in
    useEffect(() => {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }, []);

    // Sync local state when global state changes
    useEffect(() => {
      setLocalRes(res);
    }, [res]);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F5') {
          e.preventDefault();
          if (res.status === 'confirmed') {
            setCheckInMode(true);
            setEditingField('passportNumber');
          }
        } else if (e.key === 'F6') {
          e.preventDefault();
          if (res.status === 'checked_in') setModal({ type: 'check_out', data: res });
        } else if (e.key === 'F8') {
          e.preventDefault();
          if (res.status === 'checked_in') setModal({ type: 'move_room', data: res });
        } else if (e.key === 'Enter') {
          if (checkInMode && allVerified && !successState) {
            onConfirmCheckIn();
          }
        } else if (e.key === 'Escape') {
          if (checkInMode) {
            setCheckInMode(false);
          } else {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [res, onClose, checkInMode]);

    const handleFieldSave = (field: string, value: any) => {
      setLocalRes(prev => ({ ...prev, [field]: value }));
      setEditingField(null);
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, [field]: value } : r));
    };

    const EditableField = ({ label, value, field, type = 'text', className = "" }: any) => {
      const isEditing = editingField === field;
      return (
        <div 
          className={`group relative p-1.5 border border-transparent hover:border-slate-200 rounded transition-all cursor-pointer ${className}`}
          onClick={() => !isEditing && setEditingField(field)}
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 leading-none">{label}</p>
          {isEditing ? (
            <input
              autoFocus
              type={type}
              className="w-full text-[13px] font-medium text-slate-800 bg-teal-50 outline-none border-b border-teal-500 py-0.5"
              value={(localRes as any)[field] || ''}
              onChange={(e) => setLocalRes(prev => ({ ...prev, [field]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFieldSave(field, (localRes as any)[field]);
                if (e.key === 'Escape') {
                  setLocalRes(res);
                  setEditingField(null);
                }
              }}
              onBlur={() => handleFieldSave(field, (localRes as any)[field])}
            />
          ) : (
            <div className="flex items-center justify-between min-h-[1.25rem]">
              <p className="text-[13px] font-medium text-slate-800 truncate">{value || '---'}</p>
              <Pencil className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}
        </div>
      );
    };

    const totalCharges = (res.rate * calculateNights(res.checkIn, res.checkOut)) + (res.charges || []).reduce((sum, c) => sum + c.amount, 0);

    const balanceColor = res.status === 'checked_out' && totalCharges > 0 
      ? 'text-rose-600' 
      : totalCharges === 0 
        ? 'text-emerald-600' 
        : 'text-slate-900';

    const allVerified = verification.idVerified && 
                        verification.roomReady && 
                        verification.rateConfirmed && 
                        verification.paymentConfirmed && 
                        verification.keysIssued > 0 && 
                        verification.specialRequests &&
                        res.passportNumber;

    const [hasPulsed, setHasPulsed] = useState(false);
    useEffect(() => {
      if (allVerified && !hasPulsed) {
        setHasPulsed(true);
      } else if (!allVerified) {
        setHasPulsed(false);
      }
    }, [allVerified, hasPulsed]);

    const onConfirmCheckIn = () => {
      handleCheckIn(res);
      setSuccessState(true);
      setCheckInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setTimeout(() => {
        setSuccessState(false);
        setCheckInMode(false);
      }, 3000);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-full max-w-5xl h-[90vh] max-h-[900px] shadow-2xl rounded-xl overflow-hidden flex flex-col border border-slate-200"
        >
          {/* HEADER BAR */}
          <div className={`h-14 border-b px-6 flex items-center justify-between shrink-0 transition-colors duration-500 ${
            successState ? 'bg-emerald-600 border-emerald-700' :
            checkInMode ? 'bg-[#0D9488] border-teal-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-4">
              <h2 className={`text-xl font-mono font-black tracking-tighter transition-colors ${
                checkInMode || successState ? 'text-white' : 'text-slate-900'
              }`}>
                {successState ? `✓ CHECKED IN AT ${checkInTime}` :
                 checkInMode ? 'CHECK-IN VERIFICATION' : 
                 (res.reservation_number || res.id.slice(0, 10))}
              </h2>
              {checkInMode && !successState && (
                <div className="flex items-center gap-3 ml-4">
                  {[
                    { step: 1, label: 'Verify ID', action: () => setEditingField('passportNumber') },
                    { step: 2, label: 'Confirm Stay', action: () => setActiveDetailTab('charges') },
                    { step: 3, label: 'Issue Keys', action: () => {} }
                  ].map((s, i) => {
                    const currentStep = !verification.idVerified ? 1 : (!verification.roomReady || !verification.rateConfirmed || !verification.paymentConfirmed) ? 2 : 3;
                    return (
                      <button 
                        key={i} 
                        onClick={s.action}
                        className="flex items-center gap-2 group cursor-pointer"
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                          currentStep === s.step ? 'bg-white text-teal-600' : 'bg-teal-500/50 text-teal-100 group-hover:bg-teal-400'
                        }`}>
                          {s.step}
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          currentStep === s.step ? 'text-white' : 'text-teal-200 group-hover:text-white'
                        }`}>
                          {s.label}
                        </span>
                        {i < 2 && <div className="w-4 h-px bg-teal-500/50 mx-1"></div>}
                      </button>
                    );
                  })}
                </div>
              )}
              {!checkInMode && !successState && (
                <>
                  {res.traces && res.traces.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                      <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
                        {res.traces.length} Traces
                      </span>
                    </div>
                  )}
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border uppercase tracking-wider ${getResStatusBadge(res.status)}`}>
                    {res.status.replace('_', ' ')}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-6 text-right">
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Created By</p>
                <p className="text-[11px] font-medium text-slate-600">Admin on 01 Dec 2024, 14:20</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Last Updated</p>
                <p className="text-[11px] font-medium text-slate-600">07 Dec 2024, 09:15</p>
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors ml-2">
                <X className={`w-5 h-5 ${checkInMode || successState ? 'text-white' : 'text-slate-400'}`} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* GUEST ZONE (40%) */}
            <div className="w-[40%] border-r border-slate-200 p-6 bg-white overflow-y-auto overscroll-contain">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Guest Name</p>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{res.guest}</h1>
                </div>
                {checkInMode && (
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-teal-600 uppercase tracking-widest mb-1">Check-in Time</p>
                    <p className="text-lg font-mono font-bold text-teal-700 leading-none">
                      {currentTime.toLocaleTimeString([], { hour12: false })}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <EditableField label="Last Name" value={res.guest.split(' ')[1]} field="lastName" />
                <EditableField label="First Name" value={res.guest.split(' ')[0]} field="firstName" />
                <EditableField label="Phone Number" value="+66 81-234-5678" field="phone" />
                <EditableField label="Company" value={res.company} field="company" />
                <EditableField label="Nationality" value={res.nationality} field="nationality" />
                <EditableField label="Language" value="English" field="language" />
                
                <div className={`col-span-2 transition-all duration-300 ${
                  checkInMode ? 'ring-2 ring-teal-500 ring-offset-4 rounded-lg p-1 bg-teal-50/30' : ''
                }`}>
                  <div className="relative">
                    <EditableField 
                      label="Passport / ID" 
                      value={res.passportNumber} 
                      field="passportNumber" 
                      className={`${checkInMode && !res.passportNumber ? 'border-rose-500 bg-rose-50' : ''}`}
                    />
                    {checkInMode && (
                      <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded uppercase tracking-widest shadow-sm z-10">
                        Verify
                      </div>
                    )}
                    {checkInMode && !res.passportNumber && (
                      <p className="text-[8px] font-bold text-rose-600 mt-1 pl-1">
                        Required for check-in
                      </p>
                    )}
                  </div>
                </div>

                <EditableField label="Expiry Date" value="12 Oct 2028" field="passportExpiry" />
                <EditableField label="VIP Status" value={res.vipStatus} field="vipStatus" className={res.vipStatus !== 'None' ? "bg-indigo-50/50" : ""} />
                <EditableField label="Member No." value="SW-99281" field="memberNo" />
                <EditableField label="City" value="Bangkok" field="city" />
                <EditableField label="Country" value="Thailand" field="country" />
              </div>

              {/* STAY SUMMARY BOX */}
              <div className="mt-auto pt-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay Summary</p>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black border uppercase tracking-wider ${
                      res.source === 'Booking.com' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      res.source === 'Walk-in' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {res.source}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Check-In</p>
                      <p className="text-xs font-bold text-slate-700">{res.checkIn}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Check-Out</p>
                      <p className="text-xs font-bold text-slate-700">{res.checkOut}</p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Total Stay</p>
                      <p className="text-sm font-black text-slate-900">{calculateNights(res.checkIn, res.checkOut)} Nights</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Total Amount</p>
                      <p className={`text-2xl font-mono font-black leading-none ${balanceColor}`}>
                        ฿{totalCharges.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STAY ZONE (60%) */}
            <div className="w-[60%] overflow-y-auto overscroll-contain bg-slate-50/30">
              <div className="p-6 pb-0">
                <AnimatePresence mode="wait">
                  {checkInMode ? (
                    <motion.div 
                      key="checklist"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4"
                    >
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Verification Checklist</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Step 2 of 3</p>
                        </div>
                        <div className="p-1">
                          {[
                            { id: 'idVerified', label: 'Guest ID verified (passport/national ID)', icon: <UserCheck className="w-3.5 h-3.5" /> },
                            { id: 'roomReady', label: 'Room is ready and clean', icon: <Sparkles className="w-3.5 h-3.5" /> },
                            { id: 'rateConfirmed', label: 'Rate and dates confirmed with guest', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
                            { id: 'paymentConfirmed', label: 'Payment method confirmed', icon: <CreditCard className="w-3.5 h-3.5" /> },
                            { id: 'specialRequests', label: `Special requests noted: "${res.specials || 'None'}"`, icon: <MessageSquare className="w-3.5 h-3.5" /> },
                          ].map((item: any) => (
                            <label 
                              key={item.id}
                              className={`flex items-center gap-3 px-4 h-9 rounded-lg cursor-pointer transition-all group ${
                                (verification as any)[item.id] ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="relative flex items-center justify-center">
                                <input 
                                  type="checkbox"
                                  checked={(verification as any)[item.id]}
                                  onChange={() => setVerification(prev => ({ ...prev, [item.id]: !(prev as any)[item.id] }))}
                                  className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                                {(verification as any)[item.id] && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                  >
                                    <Check className="w-3 h-3 text-white" />
                                  </motion.div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-1">
                                <div className={(verification as any)[item.id] ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-500'}>
                                  {item.icon}
                                </div>
                                <span className={`text-[11px] font-medium transition-colors ${(verification as any)[item.id] ? 'text-emerald-600' : 'text-slate-600'}`}>
                                  {item.label}
                                </span>
                              </div>
                              {(verification as any)[item.id] && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </label>
                          ))}

                          {/* Keys Selector Integrated */}
                          <div className="flex items-center h-9 px-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-2 flex-1">
                              <Key className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Keys Issued</span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3].map(num => (
                                <button
                                  key={num}
                                  onClick={() => setVerification(prev => ({ ...prev, keysIssued: num }))}
                                  className={`w-7 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${
                                    verification.keysIssued === num 
                                      ? 'bg-teal-600 text-white shadow-sm' 
                                      : 'bg-white border border-slate-200 text-slate-400 hover:border-teal-300 hover:text-teal-600'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="fields"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="grid grid-cols-3 gap-x-4 gap-y-3"
                    >
                      <EditableField label="Arrival Date" value={res.checkIn} field="checkIn" />
                      <EditableField label="Departure Date" value={res.checkOut} field="checkOut" />
                      <div className="p-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Nights</p>
                        <p className="text-[13px] font-medium text-slate-800">{calculateNights(res.checkIn, res.checkOut)}</p>
                      </div>

                      <EditableField label="Room Number" value={res.room} field="room" />
                      <div className="p-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Room Type</p>
                        <p className="text-[13px] font-medium text-slate-800">{ROOM_TYPES[room.type].name}</p>
                      </div>
                      <div className="p-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Floor</p>
                        <p className="text-[13px] font-medium text-slate-800">{room.floor}</p>
                      </div>

                      <EditableField label="Rate Code" value="RACK_BB" field="rateCode" />
                      <EditableField label="Daily Rate" value={`฿${res.rate.toLocaleString()}`} field="rate" />
                      <div className="p-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Currency</p>
                        <p className="text-[13px] font-medium text-slate-800">THB</p>
                      </div>

                      <EditableField label="Adults" value={res.adults} field="adults" />
                      <EditableField label="Children" value={res.children} field="children" />
                      <EditableField label="No. of Rooms" value="1" field="numRooms" />

                      <EditableField label="Source" value={res.source} field="source" />
                      <EditableField label="Market" value="Leisure" field="market" />
                      <EditableField label="Origin" value="Direct" field="origin" />

                      <EditableField label="Payment" value="Credit Card" field="payment" />
                      <EditableField label="OTA Ref" value={res.booking_reference || "---"} field="otaRef" />
                      <EditableField label="Confirmation#" value="CONF-88219" field="confNum" />

                      <EditableField label="ETA" value="14:00" field="eta" />
                      <div className="flex items-center gap-4 p-1.5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 accent-teal-500" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Turndown</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-3.5 h-3.5 accent-teal-500" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase">DNM</span>
                        </label>
                      </div>
                      <EditableField label="Specials" value={res.specials || "None"} field="specials" />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* PACKAGES & ADD-ONS */}
                <div className="mt-6 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Packages & Add-ons
                    </p>
                    <button 
                      onClick={() => setModal({ type: 'manage_packages', data: res })}
                      className="text-[9px] font-bold text-indigo-600 uppercase hover:underline"
                    >
                      Manage
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'parking', label: 'Parking (Car)', icon: <Car className="w-3.5 h-3.5" /> },
                      { id: 'breakfast', label: 'Daily Breakfast', icon: <Receipt className="w-3.5 h-3.5" /> },
                      { id: 'transfer', label: 'Airport Transfer', icon: <MapPin className="w-3.5 h-3.5" /> },
                      { id: 'extrabed', label: 'Extra Bed', icon: <Plus className="w-3.5 h-3.5" /> },
                      { id: 'late_checkout', label: 'Late Check-out', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
                      { id: 'early_checkin', label: 'Early Check-in', icon: <CalendarCheck className="w-3.5 h-3.5" /> },
                      { id: 'laundry_pkg', label: 'Laundry Package', icon: <Sparkles className="w-3.5 h-3.5" /> },
                      { id: 'spa_access', label: 'Spa & Wellness', icon: <UserCheck className="w-3.5 h-3.5" /> },
                    ].map(pkg => {
                      const pkgData = (res.packages && res.packages[pkg.id]) || { active: false };
                      return (
                        <button 
                          key={pkg.id}
                          onClick={() => {
                            if (pkg.id === 'parking' && !pkgData.active) {
                              setModal({ type: 'package_config', data: { res, pkgId: pkg.id } });
                            } else {
                              handleTogglePackage(res.id, pkg.id);
                              addToast(`${pkg.label} ${!pkgData.active ? 'added' : 'removed'}`);
                            }
                          }}
                          className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                            pkgData.active 
                              ? "bg-white border-indigo-200 text-indigo-700 shadow-sm" 
                              : "bg-slate-50/50 border-slate-100 text-slate-400 hover:border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {pkg.icon}
                            <div className="text-left">
                              <span className="text-[10px] font-bold block leading-none">{pkg.label}</span>
                              {pkg.id === 'parking' && pkgData.active && pkgData.licensePlate && (
                                <span className="text-[8px] opacity-70 uppercase tracking-tighter">{pkgData.licensePlate}</span>
                              )}
                            </div>
                          </div>
                          {pkgData.active && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* TABS SECTION (SCROLLABLE) */}
              <div className="mt-6 px-6 pb-6">
                <div className="flex border-b border-slate-200 mb-4">
                  {[
                    { id: 'charges', label: 'Charges', icon: <Receipt className="w-3.5 h-3.5" /> },
                    { id: 'traces', label: 'Traces', icon: <AlertCircle className="w-3.5 h-3.5" /> },
                    { id: 'preferences', label: 'Preferences', icon: <Settings className="w-3.5 h-3.5" /> },
                    { id: 'notes', label: 'Notes', icon: <ClipboardList className="w-3.5 h-3.5" /> },
                    { id: 'history', label: 'History', icon: <History className="w-3.5 h-3.5" /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDetailTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all relative ${
                        activeDetailTab === tab.id ? "text-teal-600" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {tab.icon} {tab.label}
                      {activeDetailTab === tab.id && (
                        <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="pr-2">
                  <div className="bg-white rounded-xl border border-slate-200 p-4 min-h-[200px]">
                  {activeDetailTab === 'charges' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Folio</p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setModal({ type: 'post_payment', data: res })}
                            className="flex items-center gap-1.5 px-2 py-1 bg-teal-600 text-white rounded text-[10px] font-black uppercase hover:bg-teal-700 transition-all shadow-sm"
                          >
                            <CreditCard className="w-3 h-3" /> Post Payment
                          </button>
                          <button 
                            onClick={() => setModal({ type: 'add_charge', data: res })}
                            className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
                          >
                            <Plus className="w-3 h-3" /> Add Charge
                          </button>
                        </div>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Staff</th>
                          </tr>
                        </thead>
                        <tbody className="text-[11px]">
                          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-1.5 text-slate-500 font-medium">{res.checkIn}</td>
                            <td className="py-1.5 font-black text-slate-700">Room Charge - {ROOM_TYPES[room.type].name}</td>
                            <td className="py-1.5 text-center font-bold">1</td>
                            <td className="py-1.5 text-right font-black text-slate-900">฿{res.rate.toLocaleString()}</td>
                            <td className="py-1.5 text-right text-slate-400 font-bold">SYS</td>
                          </tr>
                          {(res.charges || []).map(c => (
                            <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                              <td className="py-1.5 text-slate-500 font-medium">{c.date}</td>
                              <td className="py-1.5 font-black text-slate-700 flex items-center gap-2">
                                {c.category === 'PAYMENT' && <CreditCard className="w-3 h-3 text-teal-600" />}
                                {c.item}
                              </td>
                              <td className="py-1.5 text-center font-bold">1</td>
                              <td className={`py-1.5 text-right font-black ${c.amount < 0 ? 'text-teal-600' : 'text-slate-900'}`}>
                                {c.amount < 0 ? `(฿${Math.abs(c.amount).toLocaleString()})` : `฿${c.amount.toLocaleString()}`}
                              </td>
                              <td className="py-1.5 text-right text-slate-400 font-bold">ADMIN</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="pt-4 flex justify-end">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 bg-slate-50 px-6 py-4 rounded-xl border border-slate-100">
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Charges</p>
                            <p className="text-sm font-bold text-slate-600">฿{((res.rate * calculateNights(res.checkIn, res.checkOut)) + (res.charges || []).filter(c => c.amount > 0).reduce((sum, c) => sum + c.amount, 0)).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Payments</p>
                            <p className="text-sm font-bold text-teal-600">฿{Math.abs((res.charges || []).filter(c => c.amount < 0).reduce((sum, c) => sum + c.amount, 0)).toLocaleString()}</p>
                          </div>
                          <div className="col-span-2 border-t border-slate-200 pt-2 text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance Due</p>
                            <p className={`text-2xl font-black ${totalCharges > 0 ? 'text-rose-600' : 'text-teal-600'}`}>
                              ฿{totalCharges.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'traces' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Inter-departmental Traces</p>
                        <button 
                          onClick={() => setModal({ type: 'new_trace', data: res })}
                          className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg text-xs font-black uppercase hover:bg-amber-100 transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" /> New Trace
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(res.traces || []).length > 0 ? (res.traces || []).map(trace => (
                          <div key={trace.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex items-start gap-4 transition-all hover:bg-amber-100/50">
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-amber-500 shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800 leading-relaxed">{trace.text}</p>
                              <p className="text-[10px] text-slate-400 mt-2 uppercase font-black tracking-wider">{trace.date} • {trace.department || 'FRONT OFFICE'} • {trace.status}</p>
                            </div>
                            {trace.status === 'pending' && (
                              <button 
                                onClick={() => handleResolveTrace(res.id, trace.id)}
                                className="px-3 py-1 bg-white border border-amber-200 rounded-lg text-[10px] font-black text-amber-600 uppercase hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all shadow-sm"
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        )) : (
                          <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm italic">No active traces for this reservation</div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'preferences' && (
                    <div className="grid grid-cols-4 gap-4">
                      {[
                        { label: 'Smoking', val: res.preferences?.smoking || 'Non-Smoking' },
                        { label: 'Bed Type', val: res.preferences?.bed || 'King' },
                        { label: 'Pillow', val: res.preferences?.pillow || 'Feather' },
                        { label: 'Floor', val: 'High Floor' },
                        { label: 'View', val: 'River View' },
                        { label: 'Temp', val: '22°C' },
                        { label: 'Allergies', val: 'None' }
                      ].map((pref, i) => (
                        <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 transition-all hover:border-teal-200 hover:bg-teal-50/30">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{pref.label}</p>
                          <p className="text-sm font-black text-slate-700">{pref.val}</p>
                        </div>
                      ))}
                      <div className="col-span-4 mt-4">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Special Requests</p>
                        <textarea 
                          className="w-full p-4 text-sm font-bold text-slate-700 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 transition-all"
                          rows={3}
                          defaultValue="Guest requested extra towels and a quiet room away from the elevator."
                        />
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'notes' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Internal Traces & Notes</p>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase hover:bg-slate-200 transition-all shadow-sm">
                          <Plus className="w-3.5 h-3.5" /> Add Note
                        </button>
                      </div>
                      <div className="space-y-3">
                        {[
                          { date: '07 Dec 09:15', staff: 'Admin', text: 'Guest called to confirm late arrival at 14:00.' },
                          { date: '01 Dec 14:20', staff: 'System', text: 'Reservation created via Direct Booking.' }
                        ].map((note, i) => (
                          <div key={i} className="flex gap-4 text-sm py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                            <span className="text-slate-400 font-mono shrink-0 font-bold">{note.date}</span>
                            <span className="font-black text-teal-600 shrink-0 uppercase text-[10px] tracking-widest">[{note.staff}]</span>
                            <span className="text-slate-700 font-bold">{note.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'history' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Previous Stays</p>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Total: 2 Stays | 5 Nights</p>
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dates</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Room</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Nights</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                            <th className="py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs">
                          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 text-slate-500 font-medium">12-15 Oct 2024</td>
                            <td className="py-2.5 font-black text-slate-700">204</td>
                            <td className="py-2.5 text-center font-bold">3</td>
                            <td className="py-2.5 text-right font-black text-slate-900">฿5,400</td>
                            <td className="py-2.5 text-right text-emerald-600 font-black uppercase text-[10px] tracking-widest">Checked Out</td>
                          </tr>
                          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 text-slate-500 font-medium">01-03 Sep 2024</td>
                            <td className="py-2.5 font-black text-slate-700">102</td>
                            <td className="py-2.5 text-center font-bold">2</td>
                            <td className="py-2.5 text-right font-black text-slate-900">฿2,400</td>
                            <td className="py-2.5 text-right text-emerald-600 font-black uppercase text-[10px] tracking-widest">Checked Out</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION BAR */}
          <div className="h-16 bg-slate-100 border-t border-slate-200 px-6 flex items-center justify-between shrink-0">
            {checkInMode ? (
              <>
                <button 
                  onClick={() => setCheckInMode(false)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Reservation
                </button>
                <div className="flex items-center gap-4">
                  {!allVerified && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All items must be verified</p>
                  )}
                  <button 
                    disabled={!allVerified || successState}
                    onClick={onConfirmCheckIn}
                    className={`flex items-center gap-3 px-8 py-2.5 font-black rounded-lg transition-all shadow-lg ${
                      allVerified 
                        ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-600/20 active:scale-95' 
                        : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    } ${allVerified && !hasPulsed ? 'animate-[pulse_1s_ease-in-out_1]' : ''}`}
                  >
                    Confirm Check-In
                    <span className="opacity-50 text-[10px] font-bold">Enter ↵</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
                <button 
                  onClick={() => addToast(`Printing Registration Card for ${res.guest}...`, 'success')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Printer className="w-4 h-4" /> Print Folio
                </button>
                <button 
                  onClick={() => addToast(`Generating Registration Card for ${res.guest}...`, 'success')}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <FileText className="w-4 h-4" /> Reg Card
                </button>
              </div>
            )}

            {!checkInMode && (
            <div className="flex items-center gap-3">
              {res.status === 'confirmed' && (
                <>
                  <button 
                    onClick={() => {
                      setCheckInMode(true);
                      setEditingField('passportNumber');
                    }}
                    className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
                    title="F5"
                  >
                    Check In <Check className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setModal({ type: 'cancel', data: res })}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 text-rose-600 font-bold rounded-lg hover:bg-rose-50 transition-all"
                  >
                    Cancel <X className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => { handleNoShow(res); onClose(); }}
                    className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 transition-all"
                  >
                    No Show
                  </button>
                </>
              )}
              {res.status === 'checked_in' && (
                <>
                  <button 
                    onClick={() => setModal({ type: 'check_out', data: res })}
                    className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20"
                    title="F6"
                  >
                    Check Out <ArrowRightLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setModal({ type: 'move_room', data: res })}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-indigo-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 transition-all"
                    title="F8"
                  >
                    Move Room <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleExtendStay(res)}
                    className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-300 transition-all"
                  >
                    Extend Stay
                  </button>
                </>
              )}
              {res.status === 'checked_out' && (
                <button className="px-6 py-2 bg-slate-200 text-slate-400 font-bold rounded-lg cursor-not-allowed">
                  Checked Out
                </button>
              )}
            </div>
            )}
          </div>
        </motion.div>
      </div>
    );
});
