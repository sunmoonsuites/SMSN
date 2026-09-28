import { DashboardStats } from '../types';
import { getRooms } from './roomsService';
import { getBookings } from './bookingService';
import { getPayments, getInvoices } from './billingService';
import { getExpenses } from './expensesService';

export interface ReportMetrics {
  totalBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  totalNightsSold: number;
  occupancyPercentage: number;
  grossRoomRevenue: number;
  otherRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  netOperatingIncome: number;
  outstandingBalance: number;
  averageDailyRate: number;
  revenuePerAvailableRoom: number;
}

export async function getDashboardStats(hotelId: string): Promise<DashboardStats> {
  const today = new Date().toISOString().split('T')[0];

  try {
    const [allRooms, allBookings, allPayments, allInvoices] = await Promise.all([
      getRooms(hotelId),
      getBookings(hotelId),
      getPayments(hotelId),
      getInvoices(hotelId),
    ]);

    const availableRoomsCount = allRooms.filter((r) => r.status === 'Available').length;
    const occupiedRoomsCount = allRooms.filter((r) => r.status === 'Occupied').length;

    const todayArrivalsCount = allBookings.filter(
      (b) => b.check_in_date === today && (b.status === 'Confirmed' || b.status === 'Pending')
    ).length;

    const todayDeparturesCount = allBookings.filter(
      (b) => b.check_out_date === today && b.status === 'Checked-In'
    ).length;

    const inHouseBookings = allBookings.filter((b) => b.status === 'Checked-In');
    const currentGuestsCount = inHouseBookings.reduce(
      (sum, b) => sum + (Number(b.adults) || 1) + (Number(b.children) || 0),
      0
    );

    const pendingBookingsCount = allBookings.filter((b) => b.status === 'Pending').length;

    const todayRevenue = allPayments
      .filter((p) => p.status === 'Completed' && p.payment_date?.startsWith(today))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const outstandingBalance = allInvoices
      .filter((inv) => inv.status === 'Unpaid' || inv.status === 'Partially Paid')
      .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

    return {
      todayArrivalsCount,
      todayDeparturesCount,
      currentGuestsCount,
      availableRoomsCount,
      occupiedRoomsCount,
      pendingBookingsCount,
      todayRevenue,
      outstandingBalance,
    };
  } catch {
    return {
      todayArrivalsCount: 0,
      todayDeparturesCount: 0,
      currentGuestsCount: 0,
      availableRoomsCount: 0,
      occupiedRoomsCount: 0,
      pendingBookingsCount: 0,
      todayRevenue: 0,
      outstandingBalance: 0,
    };
  }
}

export async function getReportMetrics(
  hotelId: string,
  startDate: string,
  endDate: string
): Promise<ReportMetrics> {
  try {
    const [allBookings, allPayments, allExpenses, allInvoices] = await Promise.all([
      getBookings(hotelId),
      getPayments(hotelId),
      getExpenses(hotelId),
      getInvoices(hotelId),
    ]);

    const rangeBookings = allBookings.filter(
      (b) => b.check_in_date >= startDate && b.check_in_date <= endDate
    );

    const totalBookings = rangeBookings.length;
    const confirmedBookings = rangeBookings.filter(
      (b) => b.status === 'Confirmed' || b.status === 'Checked-In' || b.status === 'Checked-Out'
    ).length;
    const cancelledBookings = rangeBookings.filter((b) => b.status === 'Cancelled').length;

    let totalNightsSold = 0;
    let grossRoomRevenue = 0;

    rangeBookings.forEach((b) => {
      if (b.status !== 'Cancelled') {
        const start = new Date(b.check_in_date);
        const end = new Date(b.check_out_date);
        const diff = Math.max(
          1,
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        );
        totalNightsSold += diff;
        grossRoomRevenue += Number(b.total_room_charges || b.total_amount || 0);
      }
    });

    const startRange = new Date(startDate);
    const endRange = new Date(endDate);
    const daysInRange = Math.max(
      1,
      Math.ceil((endRange.getTime() - startRange.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const totalRoomCapacity = 30 * daysInRange;

    const occupancyPercentage =
      totalRoomCapacity > 0
        ? Math.min(100, Math.round((totalNightsSold / totalRoomCapacity) * 100))
        : 0;

    const rangePayments = allPayments.filter((p) => {
      const pDate = (p.payment_date || '').split('T')[0];
      return p.status === 'Completed' && pDate >= startDate && pDate <= endDate;
    });

    const totalRevenue =
      rangePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0) || grossRoomRevenue;
    const otherRevenue = Math.max(0, totalRevenue - grossRoomRevenue);

    const rangeExpenses = allExpenses.filter(
      (e) => e.date >= startDate && e.date <= endDate
    );
    const totalExpenses = rangeExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netOperatingIncome = totalRevenue - totalExpenses;

    const outstandingBalance = allInvoices
      .filter((inv) => inv.status === 'Unpaid' || inv.status === 'Partially Paid')
      .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0);

    const averageDailyRate =
      totalNightsSold > 0 ? Math.round(grossRoomRevenue / totalNightsSold) : 0;
    const revenuePerAvailableRoom =
      totalRoomCapacity > 0 ? Math.round(grossRoomRevenue / totalRoomCapacity) : 0;

    return {
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalNightsSold,
      occupancyPercentage,
      grossRoomRevenue,
      otherRevenue,
      totalRevenue,
      totalExpenses,
      netOperatingIncome,
      outstandingBalance,
      averageDailyRate,
      revenuePerAvailableRoom,
    };
  } catch {
    return {
      totalBookings: 0,
      confirmedBookings: 0,
      cancelledBookings: 0,
      totalNightsSold: 0,
      occupancyPercentage: 0,
      grossRoomRevenue: 0,
      otherRevenue: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netOperatingIncome: 0,
      outstandingBalance: 0,
      averageDailyRate: 0,
      revenuePerAvailableRoom: 0,
    };
  }
}
