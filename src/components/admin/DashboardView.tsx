import React, { useEffect, useState } from 'react';
import { Hotel, DashboardStats, Booking } from '../../types';
import { getDashboardStats } from '../../services/reportsService';
import { getBookings } from '../../services/bookingService';
import { getRooms, initialize30Rooms } from '../../services/roomsService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { DailyHuddleWidget } from './DailyHuddleWidget';
import {
  Users,
  LogIn,
  LogOut,
  BedDouble,
  DollarSign,
  AlertCircle,
  PlusCircle,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  hotel: Hotel | null;
  onNavigateTab: (tab: any) => void;
  onOpenNewBooking: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  hotel,
  onNavigateTab,
  onOpenNewBooking,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [totalRoomsCount, setTotalRoomsCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializingRooms, setIsInitializingRooms] = useState(false);
  const [initSuccessMessage, setInitSuccessMessage] = useState('');

  useEffect(() => {
    if (hotel?.id) {
      loadDashboardData();
    }
  }, [hotel?.id]);

  const loadDashboardData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);

    const [statsData, bookingsData, roomsData] = await Promise.all([
      getDashboardStats(hotel.id),
      getBookings(hotel.id),
      getRooms(hotel.id),
    ]);

    setStats(statsData);
    setRecentBookings(bookingsData.slice(0, 6));
    setTotalRoomsCount(roomsData.length);
    setIsLoading(false);
  };

  const handleInit30Rooms = async () => {
    if (!hotel?.id) return;
    setIsInitializingRooms(true);
    const res = await initialize30Rooms(hotel.id);
    setIsInitializingRooms(false);

    if (res.success) {
      setInitSuccessMessage('30 Rooms successfully initialized across 3 floors (101-110, 201-210, 301-310)!');
      loadDashboardData();
      setTimeout(() => setInitSuccessMessage(''), 5000);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Calculating real-time property metrics..." />;
  }

  const occupancyRate =
    totalRoomsCount && totalRoomsCount > 0 && stats
      ? Math.round((stats.occupiedRoomsCount / totalRoomsCount) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 30 Rooms Auto-Setup Banner if Database has 0 rooms */}
      {totalRoomsCount === 0 && (
        <div className="p-4 bg-amber-50 border-2 border-dashed border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="font-serif font-bold text-amber-950 text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              Configure 30-Room Hotel Inventory
            </h4>
            <p className="text-xs text-amber-800">
              The property inventory currently has 0 rooms configured. Initialize the 30 rooms across 3 floors (10 per floor: 101–110, 201–210, 301–310) with standard Deluxe, Executive &amp; Suite categories.
            </p>
          </div>
          <button
            type="button"
            disabled={isInitializingRooms}
            onClick={handleInit30Rooms}
            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            {isInitializingRooms ? 'Setting Up...' : 'Initialize 30 Rooms'}
          </button>
        </div>
      )}

      {initSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{initSuccessMessage}</span>
        </div>
      )}

      {/* Daily Huddle Widget for Front Desk Shift Briefing */}
      <DailyHuddleWidget
        hotel={hotel}
        onNavigateTab={onNavigateTab}
        onRefreshParent={loadDashboardData}
      />

      {/* Top Stat Cards (Real data from Supabase) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Arrivals */}
        <div
          onClick={() => onNavigateTab('frontdesk')}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Today's Arrivals</span>
            <LogIn className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-3xl font-serif font-bold text-stone-900">
            {stats?.todayArrivalsCount || 0}
          </div>
          <p className="text-[11px] text-stone-400">Scheduled for check-in today</p>
        </div>

        {/* Today's Departures */}
        <div
          onClick={() => onNavigateTab('frontdesk')}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Today's Departures</span>
            <LogOut className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-3xl font-serif font-bold text-stone-900">
            {stats?.todayDeparturesCount || 0}
          </div>
          <p className="text-[11px] text-stone-400">Due for check-out today</p>
        </div>

        {/* In-House Guests */}
        <div
          onClick={() => onNavigateTab('frontdesk')}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>In-House Guests</span>
            <Users className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-3xl font-serif font-bold text-stone-900">
            {stats?.currentGuestsCount || 0}
          </div>
          <p className="text-[11px] text-stone-400">Currently residing in hotel</p>
        </div>

        {/* Rooms Occupancy */}
        <div
          onClick={() => onNavigateTab('rooms')}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer space-y-2"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-semibold uppercase tracking-wider">
            <span>Room Occupancy</span>
            <BedDouble className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-3xl font-serif font-bold text-stone-900">
            {occupancyRate}%
          </div>
          <p className="text-[11px] text-stone-500 font-medium">
            {stats?.occupiedRoomsCount || 0} Occupied &bull; {stats?.availableRoomsCount || 0} Available
          </p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Payments Collected */}
        <div
          onClick={() => onNavigateTab('payments')}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs cursor-pointer hover:border-amber-400 transition-colors space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 uppercase tracking-wider font-semibold">
            <span>Today's Collections</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {formatINR(stats?.todayRevenue || 0)}
          </div>
          <p className="text-[11px] text-stone-400">Recorded payments received today</p>
        </div>

        {/* Outstanding Invoice Balance */}
        <div
          onClick={() => onNavigateTab('billing')}
          className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs cursor-pointer hover:border-amber-400 transition-colors space-y-1.5"
        >
          <div className="flex items-center justify-between text-xs text-stone-500 uppercase tracking-wider font-semibold">
            <span>Outstanding Balance</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {formatINR(stats?.outstandingBalance || 0)}
          </div>
          <p className="text-[11px] text-stone-400">Unpaid or partially paid invoices</p>
        </div>

        {/* Quick Action Hub */}
        <div className="p-5 bg-stone-900 text-white rounded-xl shadow-2xs space-y-3 flex flex-col justify-between">
          <div className="text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center justify-between">
            <span>Quick Front Desk Action</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenNewBooking}
              className="flex-1 py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Walk-In Booking</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('frontdesk')}
              className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Check-In Desk
            </button>
          </div>
        </div>
      </div>

      {/* Recent Reservations Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h4 className="font-serif font-bold text-stone-900 text-base">Recent Reservations</h4>
            <p className="text-xs text-stone-500">Real-time bookings from website and front desk</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('reservations')}
            className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentBookings.length === 0 ? (
          <EmptyState
            title="No Bookings Recorded"
            message="There are no reservations currently recorded in the database. Use 'Walk-In Booking' or book through the public website."
            actionLabel="Create First Booking"
            onAction={onOpenNewBooking}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Booking Ref</th>
                  <th className="px-6 py-3">Guest Name</th>
                  <th className="px-6 py-3">Check-In / Out</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Total Amount</th>
                  <th className="px-6 py-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {recentBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-stone-900">
                      {b.booking_reference}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-stone-800">
                      {b.guest ? `${b.guest.first_name} ${b.guest.last_name || ''}` : 'Unknown Guest'}
                    </td>
                    <td className="px-6 py-3.5 text-stone-600">
                      {formatDate(b.check_in_date)} &rarr; {formatDate(b.check_out_date)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.status === 'Checked-In'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.status === 'Confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : b.status === 'Checked-Out'
                            ? 'bg-stone-200 text-stone-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-stone-900 font-serif">
                      {formatINR(b.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 text-stone-500">
                      <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px]">
                        {b.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
