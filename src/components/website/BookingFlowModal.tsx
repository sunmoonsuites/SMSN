import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Hotel, RoomCategory } from '../../types';
import { checkRoomAvailability, createBooking, AvailabilityResult } from '../../services/bookingService';
import { validatePromoCode } from '../../services/offersService';
import { formatINR, calculateNights, getCleanHotelWhatsApp } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  Calendar,
  Users,
  CheckCircle2,
  Tag,
  ArrowRight,
  ArrowLeft,
  Bed,
  Maximize2,
  MessageCircle,
} from 'lucide-react';

interface BookingFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotel: Hotel | null;
  initialSearch?: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    selectedCategoryId?: string;
  };
  onBookingSuccess?: (bookingRef: string) => void;
}

export const BookingFlowModal: React.FC<BookingFlowModalProps> = ({
  isOpen,
  onClose,
  hotel,
  initialSearch,
  onBookingSuccess,
}) => {
  const [step, setStep] = useState<'search' | 'rooms' | 'guest' | 'review' | 'confirmed'>('search');

  // Dates & Guests
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // Availability & Selection
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<AvailabilityResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AvailabilityResult | null>(null);

  // Guest Details
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Promo Code
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBookingRef, setConfirmedBookingRef] = useState('');

  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date();
      dayAfter.setDate(dayAfter.getDate() + 2);

      const inDate = initialSearch?.checkIn || tomorrow.toISOString().split('T')[0];
      const outDate = initialSearch?.checkOut || dayAfter.toISOString().split('T')[0];

      setCheckIn(inDate);
      setCheckOut(outDate);
      setAdults(initialSearch?.adults || 2);
      setChildren(initialSearch?.children || 0);
      setAppliedPromo(null);
      setPromoError('');
      setSubmitError('');

      // Auto check availability if dates provided
      fetchAvailability(inDate, outDate, initialSearch?.selectedCategoryId);
    }
  }, [isOpen, initialSearch]);

  const fetchAvailability = async (inDate: string, outDate: string, autoSelectCatId?: string) => {
    if (!hotel?.id) return;
    setIsLoadingAvailability(true);
    setStep('rooms');

    const results = await checkRoomAvailability(hotel.id, inDate, outDate);
    setAvailableCategories(results);
    setIsLoadingAvailability(false);

    if (autoSelectCatId) {
      const match = results.find((r) => r.categoryId === autoSelectCatId);
      if (match && match.availableRoomCount > 0) {
        setSelectedResult(match);
      }
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim() || !hotel?.id || !selectedResult) return;
    setIsValidatingPromo(true);
    setPromoError('');

    const res = await validatePromoCode(hotel.id, promoInput.trim(), selectedResult.subtotal);
    setIsValidatingPromo(false);

    if (res.valid) {
      setAppliedPromo({
        code: promoInput.trim().toUpperCase(),
        discount: res.discountAmount,
        message: res.message,
      });
      setPromoInput('');
    } else {
      setPromoError(res.message);
    }
  };

  const nights = calculateNights(checkIn, checkOut);
  const roomTotal = selectedResult ? selectedResult.ratePerNight * nights : 0;
  const discountTotal = appliedPromo ? appliedPromo.discount : 0;
  const taxableTotal = Math.max(0, roomTotal - discountTotal);
  const taxAmount = Math.round((taxableTotal * (taxableTotal > 7500 ? 18 : 12)) / 100);
  const grandTotal = taxableTotal + taxAmount;

  const handleConfirmBooking = async () => {
    if (!hotel?.id || !selectedResult) return;
    if (!guestFirstName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      setSubmitError('Please fill in all mandatory guest details (First Name, Mobile, Email).');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const res = await createBooking({
      hotelId: hotel.id,
      guestName: `${guestFirstName.trim()} ${guestLastName.trim()}`.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults,
      children,
      categoryId: selectedResult.categoryId,
      ratePerNight: selectedResult.ratePerNight,
      source: 'Website',
      promoCode: appliedPromo?.code,
      discountAmount: discountTotal,
      specialRequests: specialRequests.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success && res.booking) {
      setConfirmedBookingRef(res.booking.booking_reference);
      setStep('confirmed');
      if (onBookingSuccess) onBookingSuccess(res.booking.booking_reference);
    } else {
      setSubmitError(res.error || 'Failed to confirm booking. Please try again.');
    }
  };

  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const whatsappBookingUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotel?.name || 'Sun Moon Suites'}, I have confirmed booking ${confirmedBookingRef} for dates ${checkIn} to ${checkOut}. Please share confirmation.`
  )}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'confirmed'
          ? 'Booking Confirmed!'
          : `Reserve Your Stay — ${hotel?.name || 'Sun Moon Suites'}`
      }
      subtitle={
        step === 'confirmed'
          ? `Booking Reference: ${confirmedBookingRef}`
          : 'Direct Booking Guarantee &bull; Instant Confirmation'
      }
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Step Navigation Indicator */}
        {step !== 'confirmed' && (
          <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span className={step === 'rooms' ? 'text-amber-800 font-bold' : ''}>1. Select Room</span>
            <span>&rarr;</span>
            <span className={step === 'guest' ? 'text-amber-800 font-bold' : ''}>2. Guest Information</span>
            <span>&rarr;</span>
            <span className={step === 'review' ? 'text-amber-800 font-bold' : ''}>3. Review &amp; Guarantee</span>
          </div>
        )}

        {/* STEP 1: ROOMS SELECTION */}
        {step === 'rooms' && (
          <div className="space-y-5">
            {/* Quick date adjust banner */}
            <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  {checkIn} &rarr; {checkOut} ({nights} {nights === 1 ? 'Night' : 'Nights'})
                </span>
                <span className="flex items-center gap-1.5 font-medium text-stone-700">
                  <Users className="w-3.5 h-3.5 text-amber-700" />
                  {adults} Adults {children > 0 ? `, ${children} Children` : ''}
                </span>
              </div>
            </div>

            {isLoadingAvailability ? (
              <LoadingSpinner message="Checking real-time room availability in database..." />
            ) : availableCategories.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300">
                <p className="text-sm font-medium text-stone-700">No room categories found</p>
                <p className="text-xs text-stone-500 mt-1">
                  The hotel room categories have not been initialized yet in Supabase. Please configure them in the Staff Portal.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {availableCategories.map((result) => {
                  const isAvailable = result.availableRoomCount > 0;
                  const isSelected = selectedResult?.categoryId === result.categoryId;

                  return (
                    <div
                      key={result.categoryId}
                      className={`p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-amber-700 bg-amber-50/50 ring-2 ring-amber-600/20'
                          : isAvailable
                          ? 'border-stone-200 hover:border-stone-400 bg-white'
                          : 'border-stone-200 bg-stone-50 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-serif text-base font-bold text-stone-900">
                              {result.category.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                                isAvailable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isAvailable
                                ? `${result.availableRoomCount} Available`
                                : 'Sold Out'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                            <span className="flex items-center gap-1">
                              <Bed className="w-3.5 h-3.5 text-stone-400" />
                              {result.category.bed_type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5 text-stone-400" />
                              {result.category.room_size_sqft} sq.ft
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-stone-400" />
                              Max {result.category.max_adults} Adults
                            </span>
                          </div>

                          {result.category.description && (
                            <p className="text-xs text-stone-600 line-clamp-1 pt-1">
                              {result.category.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-lg font-bold text-stone-900 font-serif">
                              {formatINR(result.ratePerNight)}
                              <span className="text-xs font-normal text-stone-500"> / night</span>
                            </div>
                            <div className="text-[11px] text-stone-500">
                              Total: {formatINR(result.total)} incl. GST
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedResult(result);
                              setStep('guest');
                            }}
                            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-800 text-white'
                                : isAvailable
                                ? 'bg-stone-900 text-white hover:bg-stone-800'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: GUEST DETAILS */}
        {step === 'guest' && (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-semibold">{selectedResult?.category.name}</span> &bull;{' '}
                {nights} {nights === 1 ? 'Night' : 'Nights'} ({checkIn} to {checkOut})
              </div>
              <button
                type="button"
                onClick={() => setStep('rooms')}
                className="text-amber-800 underline font-medium hover:text-amber-950"
              >
                Change Room
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sharma"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+91 93135 01001"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Special Requests (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Quiet room, high floor, late arrival time..."
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setStep('rooms')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="button"
                disabled={!guestFirstName.trim() || !guestPhone.trim() || !guestEmail.trim()}
                onClick={() => setStep('review')}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg flex items-center gap-2"
              >
                Continue to Review
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & CONFIRM */}
        {step === 'review' && (
          <div className="space-y-5">
            {/* Booking Breakdown */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
              <div className="flex justify-between items-start pb-3 border-b border-stone-200">
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900">
                    {selectedResult?.category.name}
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {checkIn} to {checkOut} &bull; {nights} {nights === 1 ? 'Night' : 'Nights'} &bull;{' '}
                    {adults} Adults
                  </p>
                </div>
                <div className="text-right font-medium text-stone-900 text-sm">
                  {formatINR(roomTotal)}
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="pt-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Promo Code (e.g. WELCOME10)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg uppercase font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!promoInput.trim() || isValidatingPromo}
                    onClick={handleApplyPromo}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                  >
                    {isValidatingPromo ? 'Checking...' : 'Apply'}
                  </button>
                </div>

                {appliedPromo && (
                  <p className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {appliedPromo.message}
                  </p>
                )}
                {promoError && <p className="text-xs text-rose-600 mt-1">{promoError}</p>}
              </div>

              {/* Bill Details */}
              <div className="pt-2 border-t border-stone-200 space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Room Tariff</span>
                  <span>{formatINR(roomTotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount ({appliedPromo?.code})</span>
                    <span>- {formatINR(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxes (GST)</span>
                  <span>{formatINR(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-200 font-serif">
                  <span>Total Amount Due</span>
                  <span>{formatINR(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Guest Summary */}
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600">
              <span className="font-semibold text-stone-900">Guest:</span> {guestFirstName}{' '}
              {guestLastName} &bull; {guestPhone} &bull; {guestEmail}
            </div>

            {/* Payment & Guarantee Mode */}
            <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
              <p className="font-semibold mb-1">Pay on Arrival &bull; Guaranteed Reservation</p>
              <p className="text-[11px] text-amber-800">
                No credit card required upfront. Pay upon check-in via Cash, UPI (Google Pay, PhonePe, Paytm), or Card.
                Standard check-in time is {hotel?.check_in_time || '14:00'}.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setStep('guest')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmBooking}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? 'Securing Booking...' : `Confirm Booking (${formatINR(grandTotal)})`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMED */}
        {step === 'confirmed' && (
          <div className="text-center py-6 space-y-5">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Thank You, {guestFirstName}!
              </h3>
              <p className="text-sm text-stone-600">
                Your reservation at {hotel?.name || 'Sun Moon Suites'} is confirmed.
              </p>
            </div>

            <div className="max-w-md mx-auto p-4 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-stone-200 pb-2">
                <span className="text-stone-500">Booking Reference</span>
                <span className="font-mono font-bold text-stone-900 text-sm">
                  {confirmedBookingRef}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Room Category</span>
                <span className="font-semibold text-stone-800">{selectedResult?.category.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-in Date</span>
                <span className="text-stone-800">
                  {checkIn} (from {hotel?.check_in_time || '14:00'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-out Date</span>
                <span className="text-stone-800">
                  {checkOut} (until {hotel?.check_out_time || '11:00'})
                </span>
              </div>
              <div className="flex justify-between font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount Payable</span>
                <span>{formatINR(grandTotal)}</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={whatsappBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp for Confirmation
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
