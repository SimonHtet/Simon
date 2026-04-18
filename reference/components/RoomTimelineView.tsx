import React, { memo, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter 
} from 'lucide-react';
import { Room, Reservation } from '../types';
import { ROOM_TYPES } from '../data';

interface RoomTimelineViewProps {
  rooms: Room[];
  reservations: Reservation[];
  setSelectedResId: (id: string | null) => void;
}

export const RoomTimelineView = memo(({ 
  rooms, 
  reservations, 
  setSelectedResId 
}: RoomTimelineViewProps) => {
  const [timelineStart, setTimelineStart] = useState(new Date(2024, 11, 7));
  const [timelineFilter, setTimelineFilter] = useState('All');
  const [roomSearch, setRoomSearch] = useState('');

  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(timelineStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [timelineStart]);

  const filteredRooms = useMemo(() => {
    let result = timelineFilter === 'All' ? rooms : rooms.filter(r => r.type === timelineFilter);
    if (roomSearch) {
      result = result.filter(r => r.id.toLowerCase().includes(roomSearch.toLowerCase()));
    }
    return result;
  }, [rooms, timelineFilter, roomSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Room Timeline</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm p-1">
            <button onClick={() => {
              const d = new Date(timelineStart);
              d.setDate(d.getDate() - 7);
              setTimelineStart(d);
            }} className="p-1.5 hover:bg-slate-50 rounded text-slate-600"><ChevronLeft className="w-4 h-4" /></button>
            <div className="px-4 py-1.5 text-xs font-bold text-slate-700 flex items-center gap-2">
              {timelineStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {dates[13].toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </div>
            <button onClick={() => {
              const d = new Date(timelineStart);
              d.setDate(d.getDate() + 7);
              setTimelineStart(d);
            }} className="p-1.5 hover:bg-slate-50 rounded text-slate-600"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="flex bg-white rounded-lg border border-slate-200 shadow-sm p-1">
            {['All', 'STANDARD', 'DELUXE', 'SUITE'].map(t => (
              <button
                key={t}
                onClick={() => setTimelineFilter(t)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded transition-all ${timelineFilter === t ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        <div className="flex border-b border-slate-100 bg-slate-50/50">
          <div className="w-48 shrink-0 p-4 border-r border-slate-100 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search rooms..." 
              className="bg-transparent text-xs font-medium outline-none w-full"
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 flex overflow-x-auto no-scrollbar">
            {dates.map((date, i) => (
              <div key={i} className={`flex-1 min-w-[80px] p-3 text-center border-r border-slate-100 last:border-0 ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-slate-100/50' : ''}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{date.toLocaleDateString('en-GB', { weekday: 'short' })}</p>
                <p className={`text-sm font-black ${date.getDate() === 7 && date.getMonth() === 11 ? 'text-teal-600' : 'text-slate-700'}`}>{date.getDate()}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredRooms.map(room => (
            <div key={room.id} className="flex border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
              <div className="w-48 shrink-0 p-4 border-r border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 group-hover:text-teal-600 transition-colors">{room.id}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{ROOM_TYPES[room.type].name}</p>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  room.status === 'dirty' ? 'bg-amber-400' : 
                  room.status === 'maintenance' ? 'bg-slate-400' : 'bg-emerald-500'
                }`}></div>
              </div>
              <div className="flex-1 flex relative h-16">
                {dates.map((_, i) => (
                  <div key={i} className="flex-1 min-w-[80px] border-r border-slate-50/50 last:border-0"></div>
                ))}
                
                {/* Reservation Blocks */}
                {reservations.filter(res => res.room === room.id && res.status !== 'cancelled').map(res => {
                  const checkIn = new Date(res.checkIn);
                  const checkOut = new Date(res.checkOut);
                  
                  const startDiff = Math.floor((checkIn.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
                  const duration = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                  
                  if (startDiff + duration < 0 || startDiff > 13) return null;
                  
                  const left = Math.max(0, startDiff) * (100 / 14);
                  const width = (Math.min(14, startDiff + duration) - Math.max(0, startDiff)) * (100 / 14);
                  
                  return (
                    <motion.button
                      key={res.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedResId(res.id)}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      className={`absolute top-2 bottom-2 px-3 rounded-lg shadow-sm flex items-center gap-2 overflow-hidden border-2 transition-all hover:shadow-md hover:scale-[1.02] z-10 ${
                        res.status === 'checked_in' ? 'bg-emerald-500 border-emerald-400 text-white' : 
                        res.status === 'confirmed' ? 'bg-blue-500 border-blue-400 text-white' :
                        'bg-slate-400 border-slate-300 text-white'
                      }`}
                    >
                      <span className="text-xs font-black truncate">{res.guest}</span>
                      {res.traces && res.traces.length > 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse shrink-0"></div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">In-House</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-400"></div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checked Out</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Drag to move reservation</span>
          </div>
        </div>
      </div>
    </div>
  );
});
