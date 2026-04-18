import { RoomStatus, ReservationStatus } from './types';

export const getStatusColor = (status: RoomStatus) => {
  switch (status) {
    case 'available': return 'bg-emerald-500';
    case 'occupied': return 'bg-rose-500';
    case 'dirty': return 'bg-amber-400';
    case 'maintenance': return 'bg-slate-400';
    case 'blocked': return 'bg-slate-600';
    default: return 'bg-slate-200';
  }
};

export const getResStatusBadge = (status: ReservationStatus) => {
  switch (status) {
    case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'checked_in': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'checked_out': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'cancelled': return 'bg-rose-100 text-rose-700 border-rose-200';
    case 'no_show': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

export const calculateNights = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = e.getTime() - s.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
