import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Grid3X3, 
  Clock, 
  User, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
import { 
  Room, 
  Reservation, 
  Toast, 
  ModalState 
} from './types';

// Data
import { 
  HOTEL_NAME, 
  LOCATION, 
  CURRENT_DATE_STR, 
  ROOM_TYPES, 
  INITIAL_ROOMS, 
  INITIAL_RESERVATIONS 
} from './data';

// Utils
import { calculateNights, getResStatusBadge } from './utils';

// Components
import { DashboardView } from './components/DashboardView';
import { ReservationsView } from './components/ReservationsView';
import { RoomGridView } from './components/RoomGridView';
import { RoomTimelineView } from './components/RoomTimelineView';
import { GuestHistoryView } from './components/GuestHistoryView';
import { ReservationDetailPanel } from './components/ReservationDetailPanel';
import { 
  ModalOverlay, 
  NewResModal, 
  NewTraceModal, 
  PackageConfigModal, 
  AddChargeModal, 
  PaymentMethodModal, 
  PostPaymentModal,
  CancelModal, 
  MoveRoomModal,
  ManagePackagesModal
} from './components/Modals';
import { CheckInModal } from './components/CheckInModal';
import { CheckOutModal } from './components/CheckOutModal';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reservations', label: 'Reservations', icon: ClipboardList },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'rooms', label: 'Room Grid', icon: Grid3X3 },
  { id: 'guests', label: 'Guest History', icon: User },
];

export default function App() {
  // --- State ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resFilter, setResFilter] = useState('All');
  const [floorFilter, setFloorFilter] = useState('All');
  const [modal, setModal] = useState<ModalState>({ type: null, data: null });
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [initialCheckInMode, setInitialCheckInMode] = useState(false);
  const [nightAuditCountdown, setNightAuditCountdown] = useState('');

  // --- Effects ---
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const auditTime = new Date();
      auditTime.setHours(23, 59, 0, 0);
      
      let diff = auditTime.getTime() - now.getTime();
      if (diff < 0) {
        auditTime.setDate(auditTime.getDate() + 1);
        diff = auditTime.getTime() - now.getTime();
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setNightAuditCountdown(`${hours}h ${minutes}m`);
    };
    
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, []);

  // --- Computed Stats ---
  const stats = useMemo(() => {
    const arrivals = reservations.filter(r => r.checkIn === '2024-12-07' && r.status === 'confirmed');
    const departures = reservations.filter(r => r.checkOut === '2024-12-07' && r.status === 'checked_in');
    const inHouse = reservations.filter(r => r.status === 'checked_in').length;
    const available = rooms.filter(r => r.status === 'available').length;
    const occupancy = Math.round((inHouse / rooms.length) * 100);

    return { arrivals, departures, inHouse, available, occupancy };
  }, [reservations, rooms]);

  // --- Handlers ---
  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleCheckIn = useCallback((res: Reservation) => {
    const room = rooms.find(r => r.id === res.room);
    if (!room) return;
    
    if (room.status === 'maintenance' || room.status === 'blocked') {
      addToast(`Cannot check in — Room ${res.room} is currently ${room.status}.`, 'error');
      return;
    }
    if (room.status === 'dirty') {
      addToast(`Warning: Room ${res.room} has not been cleaned. Check-in recorded.`, 'warning');
    }

    const now = new Date().toISOString();
    setReservations(prev => prev.map(r => 
      r.id === res.id ? { ...r, ...res, status: 'checked_in', actual_check_in: now, updated_at: now } : r
    ));
    setRooms(prev => prev.map(room => 
      room.id === res.room ? { ...room, status: 'occupied', resId: res.id } : room
    ));
    addToast(`${res.guest} checked in to Room ${res.room}`);
    setModal({ type: null, data: null });
  }, [rooms, addToast]);

  const handleCheckOut = useCallback((res: Reservation) => {
    const now = new Date().toISOString();
    setReservations(prev => prev.map(r => 
      r.id === res.id ? { ...r, status: 'checked_out', actual_check_out: now, updated_at: now } : r
    ));
    setRooms(prev => prev.map(room => 
      room.id === res.room ? { ...room, status: 'dirty', resId: null } : room
    ));
    addToast(`${res.guest} checked out. Room ${res.room} queued for cleaning.`);
    setModal({ type: null, data: null });
  }, [addToast]);

  const handleCancel = useCallback((res: Reservation, reason: string) => {
    const now = new Date().toISOString();
    setReservations(prev => prev.map(r => 
      r.id === res.id ? { ...r, status: 'cancelled', cancelled_at: now, cancellation_reason: reason, updated_at: now } : r
    ));
    setRooms(prev => prev.map(room => 
      room.id === res.room ? { ...room, status: 'available', resId: null } : room
    ));
    addToast(`Reservation ${res.reservation_number || res.id} cancelled`);
    setModal({ type: null, data: null });
  }, [addToast]);

  const handleMoveRoom = useCallback((res: Reservation, newRoomId: string, reason = '') => {
    const now = new Date().toISOString();
    const oldRoomId = res.room;
    setReservations(prev => prev.map(r => 
      r.id === res.id ? { ...r, room: newRoomId, room_id: newRoomId, updated_at: now, move_reason: reason } : r
    ));
    setRooms(prev => prev.map(room => {
      if (room.id === oldRoomId) return { ...room, status: 'dirty', resId: null };
      if (room.id === newRoomId) return { ...room, status: 'occupied', resId: res.id };
      return room;
    }));
    addToast(`${res.guest} moved from Room ${oldRoomId} to Room ${newRoomId}${reason ? ` (${reason})` : ''}`);
    setModal({ type: null, data: null });
  }, [addToast]);

  const handleNoShow = useCallback((res: Reservation) => {
    const now = new Date().toISOString();
    setReservations(prev => prev.map(r => 
      r.id === res.id ? { ...r, status: 'no_show', updated_at: now } : r
    ));
    setRooms(prev => prev.map(room => 
      room.id === res.room ? { ...room, status: 'available', resId: null } : room
    ));
    addToast(`${res.guest} marked as no-show. Room ${res.room} released.`, 'warning');
    setModal({ type: null, data: null });
  }, [addToast]);

  const handleExtendStay = useCallback((res: Reservation, extraNights = 1) => {
    const currentOut = new Date(res.checkOut);
    const newOut = new Date(currentOut);
    newOut.setDate(newOut.getDate() + extraNights);
    const newOutStr = newOut.toISOString().split('T')[0];
    
    const overlapping = reservations.find(r => 
      r.id !== res.id && 
      r.room === res.room && 
      r.status !== 'cancelled' &&
      r.status !== 'no_show' &&
      new Date(r.checkIn!) < newOut && 
      new Date(r.checkOut!) > new Date(res.checkOut!)
    );

    if (overlapping) {
      addToast(`Cannot extend stay — Room ${res.room} is booked for another guest.`, 'error');
      return;
    }

    setReservations(prev => prev.map(r => 
      r.id === res.id ? { ...r, checkOut: newOutStr, check_out_date: newOutStr, updated_at: new Date().toISOString() } : r
    ));
    addToast(`Stay extended for ${res.guest} until ${newOutStr}`);
  }, [reservations, addToast]);

  const handleTogglePackage = useCallback((resId: string, pkgId: string) => {
    setReservations(prev => prev.map(r => {
      if (r.id === resId) {
        const currentPackages = r.packages || {};
        const isActive = !currentPackages[pkgId]?.active;
        
        // If it's parking and we are activating it, we should have gone through the config modal
        // But if called from manage packages, we just toggle it.
        
        const updatedPackages = {
          ...currentPackages,
          [pkgId]: { ...currentPackages[pkgId], active: isActive }
        };

        if (isActive) {
          const packagePrices: Record<string, { label: string, price: number }> = {
            breakfast: { label: 'Daily Breakfast', price: 350 },
            transfer: { label: 'Airport Transfer', price: 800 },
            extrabed: { label: 'Extra Bed', price: 1000 },
            late_checkout: { label: 'Late Check-out', price: 500 },
            early_checkin: { label: 'Early Check-in', price: 500 },
            laundry_pkg: { label: 'Laundry Package', price: 300 },
            spa_access: { label: 'Spa & Wellness', price: 1200 },
          };

          const pkgInfo = packagePrices[pkgId];
          if (pkgInfo) {
            return { 
              ...r, 
              packages: updatedPackages, 
              charges: [...(r.charges || []), { 
                id: Date.now(), 
                item: `${pkgInfo.label} (Package)`, 
                amount: pkgInfo.price, 
                date: CURRENT_DATE_STR,
                category: 'OTHER'
              }] 
            };
          }
        } else {
          // When deactivating, we might want to remove the charge, but usually in PMS 
          // we keep the charge and the user has to manually void it. 
          // For this demo, let's just toggle the active state.
        }
        return { ...r, packages: updatedPackages };
      }
      return r;
    }));
  }, []);

  const handleUpdatePackageMetadata = useCallback((resId: string, pkgId: string, metadata: any) => {
    setReservations(prev => prev.map(r => 
      r.id === resId ? { 
        ...r, 
        packages: { 
          ...r.packages, 
          [pkgId]: { ...r.packages![pkgId], ...metadata, active: true } 
        } 
      } : r
    ));
    addToast('Package details updated');
    setModal({ type: null, data: null });
  }, [addToast]);

  const handleAddTrace = useCallback((resId: string, text: string, dept = 'Front Office') => {
    const newTrace = {
      id: Date.now(),
      text,
      date: CURRENT_DATE_STR,
      status: 'pending' as const,
      department: dept.toUpperCase()
    };
    setReservations(prev => prev.map(r => 
      r.id === resId ? { ...r, traces: [...(r.traces || []), newTrace] } : r
    ));
    addToast(`Trace added`);
    setModal({ type: null, data: null });
  }, [addToast]);

  const handleResolveTrace = useCallback((resId: string, traceId: number) => {
    setReservations(prev => prev.map(r => {
      if (r.id === resId) {
        return {
          ...r,
          traces: r.traces?.map(t => t.id === traceId ? { ...t, status: 'resolved' as const } : t)
        };
      }
      return r;
    }));
    addToast(`Trace resolved`);
  }, [addToast]);

  const handleCreateReservation = useCallback((newRes: any) => {
    const now = new Date().toISOString();
    const uuid = `RES-${Date.now()}`;
    
    setReservations(prev => {
      const resNum = `RES-2024-${String(prev.length + 1).padStart(5, '0')}`;
      const nights = calculateNights(newRes.checkIn, newRes.checkOut);
      
      const res: Reservation = { 
        ...newRes, 
        id: uuid, 
        hotel_id: 'HOTEL-001',
        reservation_number: resNum,
        guest_id: `GUEST-${Date.now()}`,
        room_id: newRes.room,
        room_type_id: rooms.find(r => r.id === newRes.room)?.type || 'STANDARD',
        status: 'confirmed', 
        check_in_date: newRes.checkIn,
        check_out_date: newRes.checkOut,
        rate_per_night: newRes.rate,
        total_nights: nights,
        total_amount: newRes.rate * nights,
        created_at: now,
        updated_at: now,
        created_by: 'USER-001',
        charges: [] 
      };
      
      addToast(`New reservation ${resNum} created`);
      return [...prev, res];
    });
    
    setModal({ type: null, data: null });
  }, [rooms, addToast]);

  const handleAddCharge = useCallback((resId: string, charge: any) => {
    setReservations(prev => prev.map(r => 
      r.id === resId ? { ...r, charges: [...(r.charges || []), { ...charge, id: Date.now(), date: charge.date || CURRENT_DATE_STR }] } : r
    ));
    addToast(charge.amount < 0 ? 'Payment posted' : 'Charge posted');
    setModal({ type: null, data: null });
  }, [addToast]);

  const handlePostPayment = useCallback((resId: string, item: string, amount: number, category: string) => {
    handleAddCharge(resId, { item, amount, category });
  }, [handleAddCharge]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 bottom-0 w-20 md:w-64 bg-[#0F2044] text-white z-40 transition-all">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <span className="hidden md:block text-xl font-black tracking-tighter">STAYWISE<span className="text-teal-400">.</span></span>
        </div>

        <nav className="mt-8 px-3 space-y-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="hidden md:block font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 right-0 px-6 hidden md:block space-y-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3 h-3 text-amber-400" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Night Audit</p>
            </div>
            <p className="text-sm font-bold text-amber-400">Runs in {nightAuditCountdown}</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Current Date</p>
            <p className="text-sm font-bold text-teal-400">{CURRENT_DATE_STR}</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="pl-20 md:pl-64 min-h-screen transition-all">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-black text-slate-900">{HOTEL_NAME}</h1>
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {LOCATION}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">System Live</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
              <img src="https://picsum.photos/seed/manager/100/100" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto h-full">
          {activeTab === 'dashboard' && (
            <DashboardView 
              stats={stats} 
              reservations={reservations} 
              rooms={rooms} 
              setSelectedResId={setSelectedResId} 
              setModal={setModal} 
              setInitialCheckInMode={setInitialCheckInMode} 
            />
          )}
          {activeTab === 'reservations' && (
            <ReservationsView 
              reservations={reservations}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              resFilter={resFilter}
              setResFilter={setResFilter}
              rooms={rooms}
              setSelectedResId={setSelectedResId}
              setInitialCheckInMode={setInitialCheckInMode}
              setModal={setModal}
              handleNoShow={handleNoShow}
            />
          )}
          {activeTab === 'timeline' && (
            <RoomTimelineView 
              rooms={rooms}
              reservations={reservations}
              setSelectedResId={setSelectedResId}
            />
          )}
          {activeTab === 'rooms' && (
            <RoomGridView 
              floorFilter={floorFilter}
              setFloorFilter={setFloorFilter}
              rooms={rooms}
              reservations={reservations}
              setSelectedResId={setSelectedResId}
              setInitialCheckInMode={setInitialCheckInMode}
              setModal={setModal}
            />
          )}
          {activeTab === 'guests' && (
            <GuestHistoryView 
              reservations={reservations}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}

          {selectedResId && (
            <ReservationDetailPanel 
              resId={selectedResId} 
              onClose={() => {
                setSelectedResId(null);
                setInitialCheckInMode(false);
              }} 
              initialCheckInMode={initialCheckInMode}
              reservations={reservations}
              rooms={rooms}
              ROOM_TYPES={ROOM_TYPES}
              setModal={setModal}
              setReservations={setReservations}
              handleCheckIn={handleCheckIn}
              handleTogglePackage={handleTogglePackage}
              handleResolveTrace={handleResolveTrace}
              addToast={addToast}
              calculateNights={calculateNights}
              getResStatusBadge={getResStatusBadge}
              handleNoShow={handleNoShow}
              handleExtendStay={handleExtendStay}
            />
          )}

          {/* Modals */}
          {modal.type && (
            <ModalOverlay type={modal.type} onClose={() => setModal({ type: null, data: null })}>
              {modal.type === 'check_in' && (
                <CheckInModal 
                  res={modal.data} 
                  reservations={reservations}
                  rooms={rooms}
                  ROOM_TYPES={ROOM_TYPES}
                  setModal={setModal}
                  handleTogglePackage={handleTogglePackage}
                  addToast={addToast}
                  handleCheckIn={handleCheckIn}
                />
              )}
              {modal.type === 'check_out' && (
                <CheckOutModal 
                  res={modal.data} 
                  reservations={reservations}
                  handleCheckOut={handleCheckOut}
                  calculateNights={calculateNights}
                  onClose={() => setModal({ type: null, data: null })}
                  setModal={setModal}
                />
              )}
              {modal.type === 'new_res' && (
                <NewResModal 
                  prefilled={modal.data} 
                  rooms={rooms}
                  reservations={reservations}
                  onCreate={handleCreateReservation}
                  onClose={() => setModal({ type: null, data: null })}
                />
              )}
              {modal.type === 'new_trace' && (
                <NewTraceModal 
                  res={modal.data} 
                  onAdd={handleAddTrace} 
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
              {modal.type === 'package_config' && (
                <PackageConfigModal 
                  res={modal.data.res} 
                  pkgId={modal.data.pkgId} 
                  onSave={handleUpdatePackageMetadata} 
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
              {modal.type === 'manage_packages' && (
                <ManagePackagesModal 
                  res={modal.data} 
                  onToggle={handleTogglePackage} 
                  onClose={() => setModal({ type: null, data: null })} 
                  setModal={setModal}
                />
              )}
              {modal.type === 'add_charge' && (
                <AddChargeModal 
                  res={modal.data} 
                  onAdd={handleAddCharge} 
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
              {modal.type === 'post_payment' && (
                <PostPaymentModal 
                  res={modal.data} 
                  onPost={handlePostPayment} 
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
              {modal.type === 'payment_method' && (
                <PaymentMethodModal 
                  res={modal.data} 
                  addToast={addToast}
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
              {modal.type === 'cancel' && (
                <CancelModal 
                  res={modal.data} 
                  onCancel={handleCancel} 
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
              {modal.type === 'move_room' && (
                <MoveRoomModal 
                  res={modal.data} 
                  rooms={rooms}
                  onMove={handleMoveRoom} 
                  onClose={() => setModal({ type: null, data: null })} 
                />
              )}
            </ModalOverlay>
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border ${
                toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' :
                toast.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' :
                'bg-amber-500 border-amber-400 text-white'
              }`}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                 toast.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
                 <Info className="w-5 h-5" />}
              </div>
              <p className="font-bold text-sm tracking-tight">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
