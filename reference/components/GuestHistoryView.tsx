import React, { memo, useMemo } from 'react';
import { Search, Info } from 'lucide-react';
import { Reservation } from '../types';
import { getResStatusBadge } from '../utils';

interface GuestHistoryViewProps {
  reservations: Reservation[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const GuestHistoryView = React.memo(({ 
  reservations, 
  searchQuery, 
  setSearchQuery 
}: GuestHistoryViewProps) => {
  const guests = useMemo(() => {
    const guestMap = new Map();
    reservations.forEach(res => {
      if (!guestMap.has(res.guest_id)) {
        guestMap.set(res.guest_id, {
          id: res.guest_id,
          name: res.guest,
          nationality: res.nationality,
          preferences: res.preferences || {},
          firstName: res.firstName,
          lastName: res.lastName,
          preferredName: res.preferredName,
          birthday: res.birthday,
          company: res.company,
          vipStatus: res.vipStatus,
          passportNumber: res.passportNumber,
          stays: [] as Reservation[]
        });
      }
      guestMap.get(res.guest_id).stays.push(res);
    });
    return Array.from(guestMap.values());
  }, [reservations]);

  const filteredGuests = guests.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Guest History</h2>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search guest name..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGuests.map(guest => (
            <div key={guest.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-2xl shadow-inner">
                  {guest.nationality}
                </div>
                <div>
                  <h4 className="font-black text-slate-900">{guest.name}</h4>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{guest.stays.length} Stays</p>
                    {guest.vipStatus && guest.vipStatus !== 'None' && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded uppercase">{guest.vipStatus}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" /> Preferences
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Smoking</p>
                      <p className="text-[10px] font-bold text-slate-700">{guest.preferences.smoking || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Bed</p>
                      <p className="text-[10px] font-bold text-slate-700">{guest.preferences.bed || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Recent Stays</p>
                  <div className="space-y-2">
                    {guest.stays.slice(0, 3).map(stay => (
                      <div key={stay.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-md">
                        <span className="font-bold text-slate-600">{stay.checkIn}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold border ${getResStatusBadge(stay.status)}`}>
                          {stay.status.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
