import React, { memo } from 'react';
import { 
  ArrowRightLeft, 
  Clock, 
  ChevronRight, 
  Plus 
} from 'lucide-react';
import { Room, Reservation } from '../types';
import { getStatusColor } from '../utils';
import { ROOM_TYPES } from '../data';

interface RoomGridViewProps {
  floorFilter: string;
  setFloorFilter: (filter: string) => void;
  rooms: Room[];
  reservations: Reservation[];
  setSelectedResId: (id: string | null) => void;
  setInitialCheckInMode: (mode: boolean) => void;
  setModal: (modal: { type: string | null; data: any }) => void;
}

export const RoomGridView = React.memo(({ 
  floorFilter, 
  setFloorFilter, 
  rooms, 
  reservations, 
  setSelectedResId, 
  setInitialCheckInMode, 
  setModal 
}: RoomGridViewProps) => {
  const filteredRooms = floorFilter === 'All' ? rooms : rooms.filter(r => r.floor === parseInt(floorFilter.split(' ')[1]));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Room Grid</h2>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          {['All', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'].map(f => (
            <button
              key={f}
              onClick={() => setFloorFilter(f)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${floorFilter === f ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredRooms.map(room => {
          const res = room.resId ? reservations.find(r => r.id === room.resId) : null;
          const arrival = reservations.find(r => r.room === room.id && r.checkIn === '2024-12-07' && r.status === 'confirmed');
          return (
            <div 
              key={room.id}
              onClick={() => {
                if (arrival) {
                  setSelectedResId(arrival.id);
                  setInitialCheckInMode(true);
                } else if (room.status === 'occupied' && room.resId) {
                  setSelectedResId(room.resId);
                } else if (room.status === 'available') {
                  setModal({ type: 'new_res', data: { room: room.id } });
                }
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 flex flex-col justify-between h-40 ${
                room.status === 'occupied' ? 'border-rose-200 bg-rose-50' : 
                arrival ? 'border-teal-200 bg-teal-50' :
                room.status === 'available' ? 'border-emerald-200 bg-emerald-50' : 
                'border-slate-200 bg-white'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-2xl font-black text-slate-900">{room.id}</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{ROOM_TYPES[room.type].name}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${getStatusColor(room.status)}`}></div>
              </div>

              {room.status === 'occupied' && res ? (
                <div className="mt-2">
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{res.guest}</p>
                  <p className="text-[10px] text-slate-500">Out: {res.checkOut}</p>
                </div>
              ) : arrival ? (
                <div className="mt-2">
                  <p className="text-xs font-bold text-teal-600 uppercase">Arrival Today</p>
                  <p className="text-sm font-bold text-slate-800 line-clamp-1">{arrival.guest}</p>
                </div>
              ) : room.status === 'available' ? (
                <div className="mt-2">
                  <p className="text-xs font-bold text-emerald-700 uppercase">Available</p>
                  <p className="text-sm font-bold text-slate-900">฿{ROOM_TYPES[room.type].rate.toLocaleString()}</p>
                </div>
              ) : (
                <div className="mt-2">
                  <p className="text-xs font-bold text-slate-400 uppercase">{room.status}</p>
                </div>
              )}

              <div className="flex justify-end mt-auto gap-1.5">
                {room.status === 'occupied' && res && (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'move_room', data: res }); }}
                      className="p-1.5 bg-white/60 rounded-lg hover:bg-white text-indigo-600 transition-colors shadow-sm"
                      title="Move Room"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setModal({ type: 'check_out', data: res }); }}
                      className="p-1.5 bg-white/60 rounded-lg hover:bg-white text-amber-600 transition-colors shadow-sm"
                      title="Check Out"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <div className="p-1.5 bg-white/60 rounded-lg group-hover:bg-white transition-colors shadow-sm">
                  {room.status === 'occupied' ? (
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
