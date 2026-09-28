import React, { useEffect, useState } from 'react';
import { Hotel, Booking } from '../../types';
import { getBookings, cancelBooking } from '../../services/bookingService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Search,
  PlusCircle,
  XCircle,
  Eye,
  AlertTriangle,
} from 'lucide-react';

interface ReservationsViewProps {
  hotel: Hotel | null;
  onOpenNewBooking: () => void;
}

export const ReservationsView: React.FC<ReservationsViewProps> = ({
  hotel,
  onOpenNewBooking,
}) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Booking Details Modal
  const [viewBooking, setViewBooking] = useState<Booking | null>(null);

  // Cancel Booking Modal
  const [cancelTargetBooking, setCancelTargetBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadBookings();
    }
  }, [hotel?.id]);

  const loadBookings = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getBookings(hotel.id);
    setBookings(data);
    setIsLoading(false);
  };

  const handleConfirmCancel = async () => {
    if (!hotel?.id || !cancelTargetBooking) return;
    setIsCancelling(true);
    const res = await cancelBooking(cancelTargetBooking.id, hotel.id, cancelReason);
    setIsCancelling(false);

    if (res.success) {
      setCancelTargetBooking(null);
      setCancelReason('');
      loadBookings();
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const ref = (b.booking_reference || '').toLowerCase();
      const guest = `${b.guest?.first_name || ''} ${b.guest?.last_name || ''} ${b.guest_name || ''}`.toLowerCase();
      const phone = `${b.guest?.phone || ''} ${b.guest_phone || ''}`.toLowerCase();
      return ref.includes(q) || guest.includes(q) || phone.includes(q);
    }
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner message="Fetching reservation records from database..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">All Reservations</h3>
          <p className="text-xs text-stone-500">
            Total {bookings.length} reservations recorded in Supabase database
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewBooking}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search reference, guest name, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {['ALL', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'Pending'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-200/60 border border-stone-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredBookings.length === 0 ? (
          <EmptyState
            title="No Reservations Found"
            message={
              bookings.length === 0
                ? 'No bookings currently exist in the database.'
                : 'No bookings match your active filters or search terms.'
            }
            actionLabel={bookings.length === 0 ? 'Create New Booking' : undefined}
            onAction={bookings.length === 0 ? onOpenNewBooking : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Check-In / Out</th>
                  <th className="px-5 py-3">Guests</th>
                  <th className="px-5 py-3">Total Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono font-bold text-stone-900">
                      {b.booking_reference}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-stone-900">
                        {b.guest && b.guest.first_name
                          ? `${b.guest.first_name} ${b.guest.last_name || ''}`.trim()
                          : b.guest_name || 'Guest'}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {b.guest?.phone || b.guest_phone || ''}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-stone-600 whitespace-nowrap">
                      {formatDate(b.check_in_date)} &rarr; {formatDate(b.check_out_date)}
                    </td>
                    <td className="px-5 py-3 text-stone-600">
                      {b.adults}A {b.children > 0 ? `, ${b.children}C` : ''}
                    </td>
                    <td className="px-5 py-3 font-serif font-bold text-stone-900">
                      {formatINR(b.total_amount)}
                    </td>
                    <td className="px-5 py-3">
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
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-600 font-medium">
                        {b.source}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewBooking(b)}
                          title="View Details"
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {b.status !== 'Cancelled' && b.status !== 'Checked-Out' && (
                          <button
                            type="button"
                            onClick={() => setCancelTargetBooking(b)}
                            title="Cancel Booking"
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOOKING DETAILS MODAL */}
      {viewBooking && (
        <Modal
          isOpen={Boolean(viewBooking)}
          onClose={() => setViewBooking(null)}
          title={`Booking Folio: ${viewBooking.booking_reference}`}
          subtitle={`Created on ${formatDate(viewBooking.created_at)} &bull; Source: ${viewBooking.source}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="text-stone-500 uppercase font-semibold text-[10px] block">Guest Name</span>
                <span className="font-bold text-sm text-stone-900">
                  {viewBooking.guest && viewBooking.guest.first_name
                    ? `${viewBooking.guest.first_name} ${viewBooking.guest.last_name || ''}`.trim()
                    : viewBooking.guest_name || 'Guest'}
                </span>
                <div className="text-stone-600 mt-1">
                  {viewBooking.guest?.phone || viewBooking.guest_phone || ''}
                </div>
                <div className="text-stone-600">
                  {viewBooking.guest?.email || viewBooking.guest_email || ''}
                </div>
              </div>

              <div>
                <span className="text-stone-500 uppercase font-semibold text-[10px] block">Stay Details</span>
                <div className="font-bold text-stone-900 text-sm">
                  {formatDate(viewBooking.check_in_date)} &rarr; {formatDate(viewBooking.check_out_date)}
                </div>
                <div className="text-stone-600 mt-1">
                  Occupancy: {viewBooking.adults} Adults, {viewBooking.children} Children
                </div>
                <div className="mt-1">
                  Status: <span className="font-bold text-amber-800">{viewBooking.status}</span>
                </div>
              </div>
            </div>

            {/* Room info */}
            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-2">
              <h5 className="font-bold text-stone-900 uppercase text-[11px]">Assigned Room &amp; Charges</h5>
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span>Room Category</span>
                <span className="font-semibold">{viewBooking.booking_rooms?.[0]?.room?.category?.name || 'Standard'}</span>
              </div>
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span>Room Number</span>
                <span className="font-mono font-bold">
                  {viewBooking.booking_rooms?.[0]?.room?.room_number ? `Room ${viewBooking.booking_rooms[0].room.room_number}` : 'Unassigned'}
                </span>
              </div>
              <div className="flex justify-between border-b border-stone-100 pb-2">
                <span>Total Amount</span>
                <span className="font-serif font-bold text-stone-900">{formatINR(viewBooking.total_amount)}</span>
              </div>
              {viewBooking.special_requests && (
                <div className="pt-1 text-stone-600">
                  <span className="font-semibold text-stone-900">Special Requests:</span> {viewBooking.special_requests}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewBooking(null)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CANCEL MODAL */}
      {cancelTargetBooking && (
        <Modal
          isOpen={Boolean(cancelTargetBooking)}
          onClose={() => setCancelTargetBooking(null)}
          title={`Cancel Reservation: ${cancelTargetBooking.booking_reference}`}
          subtitle="This will update status to Cancelled and release assigned rooms"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
              <span>
                Are you sure you want to cancel this booking for{' '}
                {cancelTargetBooking.guest && cancelTargetBooking.guest.first_name
                  ? `${cancelTargetBooking.guest.first_name} ${cancelTargetBooking.guest.last_name || ''}`.trim()
                  : cancelTargetBooking.guest_name || 'Guest'}
                ?
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Guest requested cancellation, flight delayed, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCancelTargetBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
