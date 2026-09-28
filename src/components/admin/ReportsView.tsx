import React, { useEffect, useState } from 'react';
import { Hotel, DashboardStats } from '../../types';
import { getDashboardStats } from '../../services/reportsService';
import { getBookings } from '../../services/bookingService';
import { getRooms } from '../../services/roomsService';
import { getExpenses } from '../../services/expensesService';
import { formatINR } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import {
  BarChart3,
  TrendingUp,
  CreditCard,
  Bed,
  Calendar,
  DollarSign,
  PieChart,
} from 'lucide-react';

interface ReportsViewProps {
  hotel: Hotel | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ hotel }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [totalRoomsCount, setTotalRoomsCount] = useState<number>(0);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [totalBookingsCount, setTotalBookingsCount] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hotel?.id) {
      loadReportData();
    }
  }, [hotel?.id]);

  const loadReportData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);

    const [statsData, roomsData, expData, bookingsData] = await Promise.all([
      getDashboardStats(hotel.id),
      getRooms(hotel.id),
      getExpenses(hotel.id),
      getBookings(hotel.id),
    ]);

    setStats(statsData);
    setTotalRoomsCount(roomsData.length);
    setTotalBookingsCount(bookingsData.length);

    const expSum = expData.reduce((acc, curr) => acc + curr.amount, 0);
    setTotalExpenses(expSum);

    const revSum = bookingsData.reduce((acc, curr) => {
      if (curr.status !== 'Cancelled') {
        return acc + curr.total_amount;
      }
      return acc;
    }, 0);
    setTotalRevenue(revSum);

    setIsLoading(false);
  };

  if (isLoading) {
    return <LoadingSpinner message="Calculating dynamic financial analytics..." />;
  }

  const occupancyRate =
    totalRoomsCount > 0 && stats
      ? Math.round((stats.occupiedRoomsCount / totalRoomsCount) * 100)
      : 0;

  const netOperatingProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Property Reports &amp; Financial Analytics
          </h3>
          <p className="text-xs text-stone-500">
            Real-time P&amp;L, Occupancy &amp; Revenue computed exclusively from database records
          </p>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-stone-500">
            <span>Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {formatINR(totalRevenue)}
          </div>
          <p className="text-[11px] text-stone-400">From {totalBookingsCount} confirmed bookings</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-stone-500">
            <span>Operating Expenses</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {formatINR(totalExpenses)}
          </div>
          <p className="text-[11px] text-stone-400">Electricity, laundry, fuel, supplies</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-stone-500">
            <span>Net Operating Profit</span>
            <BarChart3 className="w-4 h-4 text-amber-700" />
          </div>
          <div
            className={`text-2xl font-serif font-bold ${
              netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatINR(netOperatingProfit)}
          </div>
          <p className="text-[11px] text-stone-400">Revenue minus operating expenses</p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs uppercase font-bold text-stone-500">
            <span>Live Occupancy Rate</span>
            <Bed className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">{occupancyRate}%</div>
          <p className="text-[11px] text-stone-400">
            {stats?.occupiedRoomsCount || 0} of {totalRoomsCount} rooms active
          </p>
        </div>
      </div>

      {/* Financial Health Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <h4 className="font-serif font-bold text-stone-900 text-base">
          30-Room Property Performance Summary
        </h4>

        {totalBookingsCount === 0 && totalExpenses === 0 ? (
          <EmptyState
            title="Database Ready for Operations"
            message="No reservations or expenses have been recorded yet. As front desk operations, online bookings, and hotel expenses are logged, this report will dynamically compute full financial breakdowns."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Occupancy Breakdown
              </span>
              <div className="flex justify-between text-xs">
                <span>Total 30-Room Inventory</span>
                <span className="font-mono font-bold">{totalRoomsCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Occupied / Reserved</span>
                <span className="font-mono font-bold text-emerald-700">
                  {stats?.occupiedRoomsCount || 0}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Available for Sale</span>
                <span className="font-mono font-bold text-stone-700">
                  {stats?.availableRoomsCount || 0}
                </span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Cash Flow Breakdown
              </span>
              <div className="flex justify-between text-xs">
                <span>Gross Recorded Revenue</span>
                <span className="font-serif font-bold">{formatINR(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Logged Expenses</span>
                <span className="font-serif font-bold text-rose-700">{formatINR(totalExpenses)}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-stone-200 pt-1">
                <span className="font-bold">Estimated Operating Margin</span>
                <span className="font-serif font-bold text-stone-900">
                  {totalRevenue > 0
                    ? `${Math.round((netOperatingProfit / totalRevenue) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Regulatory Compliance
              </span>
              <div className="text-xs text-stone-600 space-y-1">
                <div>State Jurisdiction: Uttar Pradesh (09)</div>
                <div>Statutory ID Logging: Aadhaar, Passport, DL</div>
                <div>GST Rates Applied: 12% / 18% Room, 5% Dining</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
