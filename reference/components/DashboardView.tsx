import React, { memo } from 'react';
import { 
  CalendarDays, 
  Clock, 
  User, 
  Grid3X3, 
  CheckCircle2, 
  AlertCircle, 
  Plus 
} from 'lucide-react';
import { Reservation, Room } from '../types';
import { getStatusColor } from '../utils';

interface DashboardViewProps {
  stats: {
    arrivals: Reservation[];
    departures: Reservation[];
    inHouse: number;
    available: number;
    occupancy: number;
  };
  reservations: Reservation[];
  rooms: Room[];
  setSelectedResId: (id: string | null) => void;
  setModal: (modal: { type: string | null; data: any }) => void;
  setInitialCheckInMode: (mode: boolean) => void;
}

export const DashboardView = React.memo(({ 
  stats, 
  reservations, 
  rooms, 
  setSelectedResId, 
  setModal, 
  setInitialCheckInMode 
}: DashboardViewProps) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    {/* Stats Bar */}
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {[
        { label: "Today's Arrivals", value: stats.arrivals.length, sub: "RES-06, 07, 10", icon: <CalendarDays className="w-5 h-5 text-blue-600" /> },
        { label: "Today's Departures", value: stats.departures.length, sub: "RES-02 checks out", icon: <Clock className="w-5 h-5 text-amber-600" /> },
        { label: "In-House", value: stats.inHouse, sub: "Guests currently staying", icon: <User className="w-5 h-5 text-emerald-600" /> },
        { label: "Available Rooms", value: stats.available, sub: "Ready for check-in", icon: <Grid3X3 className="w-5 h-5 text-teal-600" /> },
        { label: "Occupancy", value: `${stats.occupancy}%`, sub: "Overall performance", icon: <CheckCircle2 className="w-5 h-5 text-indigo-600" /> },
      ].map((stat, i) => (
        <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-slate-50 rounded-lg">{stat.icon}</div>
            <span className="text-2xl font-bold text-slate-900">{stat.value}</span>
          </div>
          <p className="text-sm font-medium text-slate-600">{stat.label}</p>
          <p className="text-xs text-slate-400 mt-1">{stat.sub}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Arrivals Today */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-teal-600" /> Arrivals Today
          </h3>
          <span className="text-[10px] font-black px-2 py-0.5 bg-teal-100 text-teal-700 rounded uppercase tracking-wider">{stats.arrivals.length} Pending</span>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Guest</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Room</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">ETA</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.arrivals.length > 0 ? stats.arrivals.map(res => (
                <tr key={res.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedResId(res.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{res.nationality}</span>
                      <div className="flex flex-col">
                        <p className="text-xs font-bold text-slate-900">{res.guest}</p>
                        {res.traces && res.traces.length > 0 && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>
                            <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">{res.traces.length} Traces</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-600">{res.room}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-slate-600">{res.eta || '14:00'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setModal({ type: 'new_trace', data: res }); }}
                        className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                        title="Add Trace"
                      >
                        <AlertCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedResId(res.id);
                          setInitialCheckInMode(true);
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-black rounded uppercase transition-all shadow-sm"
                      >
                        Check In
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 text-xs italic">No more arrivals today</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Departures Today */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" /> Departures Today
          </h3>
          <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 rounded uppercase tracking-wider">{stats.departures.length} Pending</span>
        </div>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Guest</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Room</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Balance</th>
                <th className="px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.departures.length > 0 ? stats.departures.map(res => {
                const calculateNights = (start: string, end: string) => {
                  const s = new Date(start);
                  const e = new Date(end);
                  const diff = e.getTime() - s.getTime();
                  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                };
                const total = (res.rate * calculateNights(res.checkIn, res.checkOut)) + (res.charges || []).reduce((sum, c) => sum + c.amount, 0);
                return (
                  <tr key={res.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedResId(res.id)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{res.nationality}</span>
                        <div className="flex flex-col">
                          <p className="text-xs font-bold text-slate-900">{res.guest}</p>
                          {res.traces && res.traces.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></div>
                              <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">{res.traces.length} Traces</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-slate-600">{res.room}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-bold ${total > 0 ? 'text-rose-600' : 'text-teal-600'}`}>฿{total.toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setModal({ type: 'new_trace', data: res }); }}
                          className="p-1.5 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                          title="Add Trace"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setModal({ type: 'check_out', data: res }); }}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black rounded uppercase transition-all shadow-sm"
                        >
                          Check Out
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 text-xs italic">No more departures today</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Active Traces Widget */}
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" /> Active Traces
        </h3>
        <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-700 rounded uppercase tracking-wider">
          {reservations.reduce((acc, res) => acc + (res.traces?.filter(t => t.status === 'pending').length || 0), 0)} Pending
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reservations.filter(res => res.traces?.some(t => t.status === 'pending')).map(res => (
          <div key={res.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-amber-300 transition-all group cursor-pointer" onClick={() => setSelectedResId(res.id)}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Room {res.room}</p>
                <p className="text-xs font-bold text-slate-900">{res.guest}</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setModal({ type: 'new_trace', data: res }); }}
                className="p-1 hover:bg-amber-100 text-amber-600 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2">
              {res.traces?.filter(t => t.status === 'pending').map(trace => (
                <div key={trace.id} className="flex gap-2 items-start">
                  <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0"></div>
                  <p className="text-[11px] text-slate-600 leading-tight italic">"{trace.text}"</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {reservations.filter(res => res.traces?.some(t => t.status === 'pending')).length === 0 && (
          <div className="col-span-full py-8 text-center text-slate-400 text-xs italic">
            No active traces across the property
          </div>
        )}
      </div>
    </div>

    {/* Room Status Grid */}
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800">Room Status Grid</h3>
        <div className="flex gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Available</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Occupied</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-400"></div> Dirty</div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-400"></div> Maint.</div>
        </div>
      </div>
      
      <div className="space-y-6">
        {[1, 2, 3, 4].map(floor => (
          <div key={floor}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Floor {floor}</p>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-3">
              {rooms.filter(r => r.floor === floor).map(room => (
                <button
                  key={room.id}
                  onClick={() => {
                    const arrival = reservations.find(r => r.room === room.id && r.checkIn === '2024-12-07' && r.status === 'confirmed');
                    if (arrival) {
                      setSelectedResId(arrival.id);
                      setInitialCheckInMode(true);
                    } else if (room.status === 'occupied') {
                      setSelectedResId(room.resId);
                    } else if (room.status === 'available') {
                      setModal({ type: 'new_res', data: { room: room.id } });
                    }
                  }}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center text-white transition-all hover:scale-105 shadow-sm relative group ${getStatusColor(room.status)}`}
                >
                  <span className="text-lg font-bold">{room.id}</span>
                  <span className="text-[10px] opacity-80 font-medium">{room.type[0]}</span>
                  
                  {room.status === 'occupied' && (
                    <div className="absolute top-1 right-1 flex gap-0.5">
                      {reservations.find(res => res.id === room.resId)?.traces?.some(t => t.status === 'pending') && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 border border-white animate-pulse"></div>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const res = reservations.find(r => r.id === room.resId);
                          if (res) setModal({ type: 'new_trace', data: res });
                        }}
                        className="w-4 h-4 bg-white/20 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/40"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  {room.status === 'available' && reservations.find(r => r.room === room.id && r.checkIn === '2024-12-07' && r.status === 'confirmed') && (
                    <div className="absolute top-1 right-1">
                      <div className="w-2 h-2 rounded-full bg-teal-400 border border-white animate-pulse"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));
