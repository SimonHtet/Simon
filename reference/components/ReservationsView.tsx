import React, { memo } from 'react';
import { 
  Plus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowRightLeft, 
  ChevronRight 
} from 'lucide-react';
import { Reservation, Room } from '../types';
import { getResStatusBadge } from '../utils';
import { ROOM_TYPES } from '../data';

interface ReservationsViewProps {
  reservations: Reservation[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  resFilter: string;
  setResFilter: (filter: string) => void;
  rooms: Room[];
  setSelectedResId: (id: string | null) => void;
  setInitialCheckInMode: (mode: boolean) => void;
  setModal: (modal: { type: string | null; data: any }) => void;
  handleNoShow: (res: Reservation) => void;
}

export const ReservationsView = React.memo(({ 
  reservations, 
  searchQuery, 
  setSearchQuery, 
  resFilter, 
  setResFilter, 
  rooms, 
  setSelectedResId, 
  setInitialCheckInMode, 
  setModal, 
  handleNoShow 
}: ReservationsViewProps) => {
  const filteredRes = reservations.filter(res => {
    const matchesSearch = res.guest.toLowerCase().includes(searchQuery.toLowerCase()) || res.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = resFilter === 'All' || 
                         (resFilter === 'In-House' && res.status === 'checked_in') ||
                         (resFilter === 'Arrivals' && res.checkIn === '2024-12-07') ||
                         (resFilter === 'Confirmed' && res.status === 'confirmed') ||
                         (resFilter === 'Cancelled' && res.status === 'cancelled');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Reservations</h2>
        <button 
          onClick={() => setModal({ type: 'new_res', data: null })}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" /> New Reservation
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search guest or reservation ID..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
            {['All', 'In-House', 'Arrivals', 'Confirmed', 'Cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setResFilter(f)}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${resFilter === f ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-4 py-3">Res#</th>
                <th className="px-4 py-3">Guest</th>
                <th className="px-4 py-3">Room</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredRes.map(res => (
                <tr key={res.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-4 text-xs font-mono font-bold text-slate-500">{res.reservation_number || res.id.slice(0, 8)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{res.nationality}</span>
                      <span className="font-bold text-slate-900">{res.guest}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{res.room}</span>
                      <span className="text-[10px] text-slate-400">{ROOM_TYPES[rooms.find(r => r.id === res.room)?.type || 'STANDARD']?.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{res.checkIn}</td>
                  <td className="px-4 py-4 text-sm text-slate-600">{res.checkOut}</td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-900">฿{res.rate.toLocaleString()}</td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getResStatusBadge(res.status)}`}>
                      {res.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {res.status === 'confirmed' && (
                        <>
                          <button 
                            onClick={() => {
                              setSelectedResId(res.id);
                              setInitialCheckInMode(true);
                            }} 
                            className="p-1.5 text-teal-600 hover:bg-teal-50 rounded-md" 
                            title="Check In"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => setModal({ type: 'cancel', data: res })} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md" title="Cancel"><XCircle className="w-4 h-4" /></button>
                          <button 
                            onClick={() => {
                              if (window.confirm(`Mark reservation for ${res.guest} as No-Show?`)) {
                                handleNoShow(res);
                              }
                            }} 
                            className="p-1.5 text-rose-800 hover:bg-rose-100 rounded-md" 
                            title="Mark as No-Show"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {res.status === 'checked_in' && (
                        <>
                          <button onClick={() => setModal({ type: 'check_out', data: res })} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md" title="Check Out"><Clock className="w-4 h-4" /></button>
                          <button onClick={() => setModal({ type: 'move_room', data: res })} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md" title="Move Room"><ArrowRightLeft className="w-4 h-4" /></button>
                        </>
                      )}
                      <button onClick={() => setSelectedResId(res.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});
