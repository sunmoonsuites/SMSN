import React, { useEffect, useState } from 'react';
import { Hotel, Booking, Room } from '../../types';
import {
  getBookings,
  checkInBooking,
  checkOutBooking,
} from '../../services/bookingService';
import { getRooms } from '../../services/roomsService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { DailyHuddleWidget } from './DailyHuddleWidget';
import {
  LogIn,
  LogOut,
  Users,
  Search,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Bed,
} from 'lucide-react';

interface FrontDeskViewProps {
  hotel: Hotel | null;
  onOpenNewBooking: () => void;
}

export const FrontDeskView: React.FC<FrontDeskViewProps> = ({
  hotel,
  onOpenNewBooking,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'arrivals' | 'departures' | 'inhouse'>('arrivals');
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Check-In Modal state
  const [checkInModalBooking, setCheckInModalBooking] = useState<Booking | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [idType, setIdType] = useState('Aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [checkInError, setCheckInError] = useState('');
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);

  // Check-Out Modal state
  const [checkOutModalBooking, setCheckOutModalBooking] = useState<Booking | null>(null);
  const [isProcessingCheckOut, setIsProcessingCheckOut] = useState(false);
  const [checkOutError, setCheckOutError] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (hotel?.id) {
      loadData();
    }
  }, [hotel?.id]);

  const loadData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [bookingsData, roomsData] = await Promise.all([
      getBookings(hotel.id),
      getRooms(hotel.id),
    ]);
    setAllBookings(bookingsData);
    setAllRooms(roomsData);
    setIsLoading(false);
  };

  // Filter listings
  const arrivals = allBookings.filter(
    (b) =>
      b.check_in_date === todayStr &&
      (b.status === 'Confirmed' || b.status === 'Pending')
  );

  const departures = allBookings.filter(
    (b) => b.check_out_date === todayStr && b.status === 'Checked-In'
  );

  const inHouse = allBookings.filter((b) => b.status === 'Checked-In');

  const currentList =
    activeSubTab === 'arrivals'
      ? arrivals
      : activeSubTab === 'departures'
      ? departures
      : inHouse;

  const filteredList = currentList.filter((b) => {
    const guestName = b.guest
      ? `${b.guest.first_name} ${b.guest.last_name || ''}`.trim()
      : b.guest_name || '';
    const phone = b.guest?.phone || b.guest_phone || '';
    const ref = b.booking_reference || '';
    const q = searchQuery.toLowerCase();
    return guestName.toLowerCase().includes(q) || phone.includes(q) || ref.toLowerCase().includes(q);
  });

  // Available rooms for check-in
  const availableRooms = allRooms.filter((r) => r.status === 'Available');

  const handleStartCheckIn = (b: Booking) => {
    setCheckInModalBooking(b);
    setCheckInError('');
    setIdNumber(b.guest?.id_number || '');
    setIdType(b.guest?.id_type || 'Aadhaar');
    setSelectedRoomId(availableRooms[0]?.id || '');
  };

  const handleConfirmCheckIn = async () => {
    if (!hotel?.id || !checkInModalBooking) return;
    if (!selectedRoomId) {
      setCheckInError('Please select an available room from the 30-room inventory.');
      return;
    }
    if (!idNumber.trim()) {
      setCheckInError('Government Photo ID number is mandatory for guest registration in India.');
      return;
    }

    setIsProcessingCheckIn(true);
    setCheckInError('');

    const res = await checkInBooking(
      checkInModalBooking.id,
      hotel.id,
      selectedRoomId,
      idType,
      idNumber.trim()
    );

    setIsProcessingCheckIn(false);

    if (res.success) {
      setCheckInModalBooking(null);
      loadData();
    } else {
      setCheckInError(res.error || 'Failed to complete check-in.');
    }
  };

  const handleStartCheckOut = (b: Booking) => {
    setCheckOutModalBooking(b);
    setCheckOutError('');
  };

  const handleConfirmCheckOut = async () => {
    if (!hotel?.id || !checkOutModalBooking) return;
    setIsProcessingCheckOut(true);
    setCheckOutError('');

    const res = await checkOutBooking(checkOutModalBooking.id, hotel.id);
    setIsProcessingCheckOut(false);

    if (res.success) {
      setCheckOutModalBooking(null);
      loadData();
    } else {
      setCheckOutError(res.error || 'Failed to process check-out.');
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading front desk operations..." />;
  }

  return (
    <div className="space-y-6">
      {/* Front Desk Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">Front Desk Operations</h3>
          <p className="text-xs text-stone-500">
            Today's Date: <span className="font-semibold text-stone-800">{todayStr}</span> &bull; 30-Room Property Desk
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewBooking}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Walk-In Reservation</span>
          </button>
        </div>
      </div>

      {/* Daily Huddle Shift Briefing Widget */}
      <DailyHuddleWidget hotel={hotel} onRefreshParent={loadData} />

      {/* Tabs: Arrivals, Departures, In-House */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('arrivals')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'arrivals'
              ? 'border-amber-700 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <LogIn className="w-4 h-4" />
          <span>Today's Arrivals ({arrivals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('departures')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'departures'
              ? 'border-amber-700 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <LogOut className="w-4 h-4" />
          <span>Today's Departures ({departures.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('inhouse')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'inhouse'
              ? 'border-amber-700 text-amber-800'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>All In-House Guests ({inHouse.length})</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search by guest name, phone, or booking reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
        />
      </div>

      {/* Table Listing */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredList.length === 0 ? (
          <EmptyState
            title={`No ${activeSubTab} for today`}
            message={`There are no bookings matching the ${activeSubTab} criteria in the database.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Booking Ref</th>
                  <th className="px-6 py-3">Guest Name &amp; Contact</th>
                  <th className="px-6 py-3">Assigned Room</th>
                  <th className="px-6 py-3">Stay Dates</th>
                  <th className="px-6 py-3">Total / Balance</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredList.map((b) => {
                  const assignedRoom = b.booking_rooms?.[0]?.room;
                  return (
                    <tr key={b.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono font-bold text-stone-900">
                        {b.booking_reference}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-stone-900">
                          {b.guest && b.guest.first_name
                            ? `${b.guest.first_name} ${b.guest.last_name || ''}`.trim()
                            : b.guest_name || 'Guest'}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {b.guest?.phone || b.guest_phone || ''}
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {assignedRoom ? (
                          <span className="font-semibold text-stone-900 font-mono bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            Room {assignedRoom.room_number} (Fl {assignedRoom.floor})
                          </span>
                        ) : (
                          <span className="text-amber-800 text-[11px] font-medium bg-amber-50 px-2 py-0.5 rounded">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-stone-600">
                        {formatDate(b.check_in_date)} &rarr; {formatDate(b.check_out_date)}
                      </td>
                      <td className="px-6 py-3.5 font-serif font-bold text-stone-900">
                        {formatINR(b.total_amount)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.status === 'Checked-In'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'Confirmed'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-stone-100 text-stone-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        {b.status === 'Confirmed' || b.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleStartCheckIn(b)}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Check-In Guest
                          </button>
                        ) : b.status === 'Checked-In' ? (
                          <button
                            type="button"
                            onClick={() => handleStartCheckOut(b)}
                            className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Check-Out
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CHECK-IN MODAL */}
      {checkInModalBooking && (
        <Modal
          isOpen={Boolean(checkInModalBooking)}
          onClose={() => setCheckInModalBooking(null)}
          title={`Guest Check-In — Ref: ${checkInModalBooking.booking_reference}`}
          subtitle="Assign 30-room physical inventory & record statutory ID proof"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
              <span className="font-semibold text-stone-900">Guest:</span>{' '}
              {checkInModalBooking.guest && checkInModalBooking.guest.first_name
                ? `${checkInModalBooking.guest.first_name} ${checkInModalBooking.guest.last_name || ''}`.trim()
                : checkInModalBooking.guest_name || 'Guest'}{' '}
              &bull; {checkInModalBooking.guest?.phone || checkInModalBooking.guest_phone || 'N/A'}
            </div>

            {/* Room Assignment */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1">
                <Bed className="w-3.5 h-3.5 text-amber-700" />
                Assign Physical Room (from 30 available rooms) *
              </label>
              {availableRooms.length === 0 ? (
                <p className="text-xs text-rose-600 font-medium">
                  No rooms currently marked 'Available'. Clean or release a room first in Housekeeping.
                </p>
              ) : (
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                >
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} &bull; Floor {r.floor} &bull; {r.category?.name || 'Standard'}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Statutory ID Capture (Mandatory in India) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  ID Proof Document *
                </label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  ID Document Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234 5678 9012"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
                />
              </div>
            </div>

            {checkInError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkInError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCheckInModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingCheckIn || availableRooms.length === 0}
                onClick={handleConfirmCheckIn}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{isProcessingCheckIn ? 'Assigning...' : 'Complete Check-In'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CHECK-OUT MODAL */}
      {checkOutModalBooking && (
        <Modal
          isOpen={Boolean(checkOutModalBooking)}
          onClose={() => setCheckOutModalBooking(null)}
          title={`Guest Check-Out — Ref: ${checkOutModalBooking.booking_reference}`}
          subtitle="Finalize folio, free room inventory & trigger housekeeping"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-500">Guest Name</span>
                <span className="font-semibold text-stone-900">
                  {checkOutModalBooking.guest && checkOutModalBooking.guest.first_name
                    ? `${checkOutModalBooking.guest.first_name} ${checkOutModalBooking.guest.last_name || ''}`.trim()
                    : checkOutModalBooking.guest_name || 'Guest'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Total Room Charges</span>
                <span className="font-serif font-bold text-stone-900">
                  {formatINR(checkOutModalBooking.total_amount)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <span className="text-stone-700 font-semibold">Room Status After Check-Out</span>
                <span className="text-amber-800 font-semibold">Auto-set to Cleaning</span>
              </div>
            </div>

            {checkOutError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{checkOutError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setCheckOutModalBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingCheckOut}
                onClick={handleConfirmCheckOut}
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{isProcessingCheckOut ? 'Processing...' : 'Confirm Check-Out'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
