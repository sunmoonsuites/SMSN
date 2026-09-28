import React, { useEffect, useState } from 'react';
import { Hotel, Room, Booking } from '../../types';
import { getRooms } from '../../services/roomsService';
import { getBookings } from '../../services/bookingService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import {
  ChevronLeft,
  ChevronRight,
  Bed,
} from 'lucide-react';

interface CalendarViewProps {
  hotel: Hotel | null;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ hotel }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d;
  });

  const numDays = 14; // View 14 days ahead in matrix

  useEffect(() => {
    if (hotel?.id) {
      loadCalendarData();
    }
  }, [hotel?.id]);

  const loadCalendarData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [roomsData, bookingsData] = await Promise.all([
      getRooms(hotel.id),
      getBookings(hotel.id),
    ]);
    setRooms(roomsData);
    setBookings(bookingsData);
    setIsLoading(false);
  };

  // Generate days array
  const days: { date: Date; dateStr: string; label: string; dayNum: number }[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNum = d.getDate();
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ date: d, dateStr, label, dayNum });
  }

  const handlePrevDays = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() - 7);
    setStartDate(d);
  };

  const handleNextDays = () => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 7);
    setStartDate(d);
  };

  const handleResetToday = () => {
    setStartDate(new Date());
  };

  if (isLoading) {
    return <LoadingSpinner message="Building 30-room calendar matrix..." />;
  }

  // Group rooms by Floor (1, 2, 3)
  const floor1 = rooms.filter((r) => r.floor === 1);
  const floor2 = rooms.filter((r) => r.floor === 2);
  const floor3 = rooms.filter((r) => r.floor === 3);

  // Helper to find if a room has a booking on dateStr
  const getBookingForRoomOnDate = (roomId: string, dateStr: string): Booking | null => {
    for (const b of bookings) {
      if (b.status === 'Cancelled') continue;
      // Check if room assigned to booking
      const hasRoom = b.booking_rooms?.some((br) => br.room_id === roomId);
      if (hasRoom) {
        if (dateStr >= b.check_in_date && dateStr < b.check_out_date) {
          return b;
        }
      }
    }
    return null;
  };

  const renderFloorRows = (floorNum: number, floorRooms: Room[]) => (
    <>
      <tr className="bg-stone-100/80">
        <td
          colSpan={numDays + 1}
          className="px-4 py-2 font-serif font-bold text-xs uppercase tracking-wider text-stone-700 border-y border-stone-200"
        >
          Floor {floorNum} &bull; {floorRooms.length} Rooms
        </td>
      </tr>
      {floorRooms.map((room) => (
        <tr key={room.id} className="hover:bg-stone-50/50 transition-colors border-b border-stone-200">
          {/* Room label */}
          <td className="px-4 py-2.5 whitespace-nowrap bg-white sticky left-0 z-10 border-r border-stone-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-stone-900 text-sm">
                {room.room_number}
              </span>
              <span className="text-[10px] text-stone-500 truncate max-w-[80px]">
                {room.category?.name || 'Standard'}
              </span>
            </div>
          </td>

          {/* Date cells */}
          {days.map((day) => {
            const booking = getBookingForRoomOnDate(room.id, day.dateStr);
            const isToday = day.dateStr === new Date().toISOString().split('T')[0];

            return (
              <td
                key={day.dateStr}
                className={`p-1 text-center border-r border-stone-100 min-w-[58px] ${
                  isToday ? 'bg-amber-50/30' : ''
                }`}
              >
                {booking ? (
                  <div
                    title={`${booking.guest?.first_name || 'Guest'} (${booking.booking_reference}) - ${booking.status}`}
                    className={`text-[10px] p-1.5 rounded font-semibold truncate cursor-pointer transition-transform hover:scale-105 ${
                      booking.status === 'Checked-In'
                        ? 'bg-emerald-600 text-white'
                        : booking.status === 'Confirmed'
                        ? 'bg-blue-600 text-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {booking.guest?.first_name || 'Booked'}
                  </div>
                ) : (
                  <div className="h-6 rounded bg-stone-50/60 hover:bg-emerald-50/60 transition-colors" />
                )}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            30-Room Calendar Matrix
          </h3>
          <p className="text-xs text-stone-500">
            Full visual inventory across Floor 1, Floor 2, and Floor 3 in Sector 117 Noida
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToday}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-stone-200 hover:bg-stone-50 rounded-lg text-stone-700"
          >
            Today
          </button>
          <div className="flex items-center bg-white border border-stone-200 rounded-lg overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDays}
              className="p-1.5 text-stone-600 hover:bg-stone-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-stone-800 px-3 py-1">
              {days[0]?.label} {days[0]?.dayNum} &ndash; {days[days.length - 1]?.label}{' '}
              {days[days.length - 1]?.dayNum}
            </span>
            <button
              type="button"
              onClick={handleNextDays}
              className="p-1.5 text-stone-600 hover:bg-stone-100"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
        <span className="font-semibold text-stone-600 uppercase text-[10px]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-600" />
          <span className="text-stone-700">In-House (Checked-In)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-blue-600" />
          <span className="text-stone-700">Confirmed Booking</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-600" />
          <span className="text-stone-700">Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-stone-100 border border-stone-300" />
          <span className="text-stone-500">Available</span>
        </div>
      </div>

      {/* Matrix Table */}
      {rooms.length === 0 ? (
        <EmptyState
          title="No Rooms Configured"
          message="Initialize the 30-room hotel inventory in Rooms Management to visualize the calendar matrix."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-3 font-semibold uppercase text-stone-600 text-[11px] sticky left-0 bg-stone-50 z-20 border-r border-stone-200 min-w-[130px]">
                  Room / Floor
                </th>
                {days.map((day) => {
                  const isToday = day.dateStr === new Date().toISOString().split('T')[0];
                  return (
                    <th
                      key={day.dateStr}
                      className={`p-2 text-center border-r border-stone-100 min-w-[58px] ${
                        isToday ? 'bg-amber-100/60 font-bold text-amber-900' : 'text-stone-600'
                      }`}
                    >
                      <div className="text-[10px] uppercase font-bold">{day.label}</div>
                      <div className="text-sm font-serif font-bold">{day.dayNum}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {floor1.length > 0 && renderFloorRows(1, floor1)}
              {floor2.length > 0 && renderFloorRows(2, floor2)}
              {floor3.length > 0 && renderFloorRows(3, floor3)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
