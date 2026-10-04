import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Hotel, RoomCategory } from '../../types';
import { checkRoomAvailability, createBooking, AvailabilityResult } from '../../services/bookingService';
import { validatePromoCode } from '../../services/offersService';
import {
  getEffectiveRoomPrice,
  DEFAULT_BOOKING_ENGINE_CONFIG,
  buildYanoljaBookingUrl,
} from '../../services/hotelService';
import {
  formatINR,
  formatDate,
  calculateNights,
  getCleanHotelWhatsApp,
  getTodayLocalDateStr,
  getNextDayLocalDateStr,
} from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { sendVerificationOtp, verifyOtp } from '../../services/emailVerificationService';
import { GoogleAuthModal } from '../auth/GoogleAuthModal';
import { getExistingGoogleUser } from '../../services/googleAuthService';
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
  Mail,
  Key,
  RefreshCw,
  Info,
  Sparkles,
  ShieldCheck,
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
  const [step, setStep] = useState<'search' | 'rooms' | 'guest' | 'verify_email' | 'review' | 'confirmed'>('search');

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

  // Email OTP & Google Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedVia, setVerifiedVia] = useState<'otp' | 'google' | ''>('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMessage, setOtpSuccessMessage] = useState('');
  const [otpWarning, setOtpWarning] = useState('');
  const [otpDevCode, setOtpDevCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);

  // Check for verified Google session
  useEffect(() => {
    getExistingGoogleUser().then((user) => {
      if (user?.email) {
        if (!guestEmail) setGuestEmail(user.email);
        if (!guestFirstName && user.name) {
          const parts = user.name.split(' ');
          setGuestFirstName(parts[0] || '');
          if (parts.length > 1) setGuestLastName(parts.slice(1).join(' '));
        }
        setIsEmailVerified(true);
        setVerifiedEmail(user.email);
        setVerifiedVia('google');
      }
    });
  }, []);

  const handleGoogleVerified = (data: { email: string; name: string }) => {
    setGuestEmail(data.email);
    if (data.name) {
      const parts = data.name.trim().split(' ');
      if (!guestFirstName) setGuestFirstName(parts[0] || '');
      if (!guestLastName && parts.length > 1) setGuestLastName(parts.slice(1).join(' '));
    }
    setIsEmailVerified(true);
    setVerifiedEmail(data.email);
    setVerifiedVia('google');
    setOtpSuccessMessage('Email verified via Google successfully!');
    setOtpError('');
    setIsGoogleModalOpen(false);

    // If guest details (first name & phone) are already filled, advance to review
    if (guestPhone.trim() && (guestFirstName.trim() || data.name)) {
      setStep('review');
    }
  };

  // Promo Code
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; message: string } | null>(null);
  const [promoError, setPromoError] = useState('');
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmedBookingRef, setConfirmedBookingRef] = useState('');
  const [paidOnlineRef, setPaidOnlineRef] = useState('');

  const engineConfig = hotel?.booking_engine_config ?? DEFAULT_BOOKING_ENGINE_CONFIG;
  const isRazorpayActive = Boolean(
    engineConfig?.razorpay_enabled && engineConfig?.razorpay_key_id?.trim()
  );
  const paymentMode = isRazorpayActive
    ? engineConfig?.payment_collection_mode || 'both'
    : 'pay_at_hotel';

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'razorpay' | 'pay_at_hotel'>(
    'pay_at_hotel'
  );

  useEffect(() => {
    if (isRazorpayActive && (paymentMode === 'online_only' || paymentMode === 'both')) {
      setSelectedPaymentMethod('razorpay');
    } else {
      setSelectedPaymentMethod('pay_at_hotel');
    }
  }, [isRazorpayActive, paymentMode, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const today = getTodayLocalDateStr();
      const inDate = initialSearch?.checkIn || today;
      let outDate = initialSearch?.checkOut || getNextDayLocalDateStr(inDate);
      if (outDate <= inDate) {
        outDate = getNextDayLocalDateStr(inDate);
      }
      const inAdults = initialSearch?.adults || 2;
      const inChildren = initialSearch?.children || 0;

      setCheckIn(inDate);
      setCheckOut(outDate);
      setAdults(inAdults);
      setChildren(inChildren);
      setAppliedPromo(null);
      setPromoError('');
      setSubmitError('');

      // Auto check availability if dates provided
      fetchAvailability(inDate, outDate, initialSearch?.selectedCategoryId, inAdults, inChildren);
    }
  }, [isOpen, initialSearch]);

  const fetchAvailability = async (
    inDate: string,
    outDate: string,
    autoSelectCatId?: string,
    adultsCount: number = adults,
    childrenCount: number = children
  ) => {
    if (!hotel?.id) return;
    setIsLoadingAvailability(true);
    setStep('rooms');

    const results = await checkRoomAvailability(
      hotel.id,
      inDate,
      outDate,
      adultsCount,
      childrenCount
    );
    setAvailableCategories(results);
    setIsLoadingAvailability(false);

    if (autoSelectCatId) {
      const match = results.find((r) => r.categoryId === autoSelectCatId);
      if (match && match.availableRoomCount > 0) {
        setSelectedResult(match);
      }
    }
  };

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleRequestOtp = async () => {
    if (!guestEmail.trim()) {
      setSubmitError('Please enter a valid email address.');
      return;
    }
    setIsSendingOtp(true);
    setOtpError('');
    setOtpSuccessMessage('');
    setOtpWarning('');

    const res = await sendVerificationOtp(
      guestEmail.trim(),
      guestFirstName.trim(),
      hotel?.email_verification_config
    );

    setIsSendingOtp(false);
    if (res.success) {
      setOtpSuccessMessage(res.message || `Verification code sent to ${guestEmail.trim()}`);
      if (res.devCode) setOtpDevCode(res.devCode);
      if (res.warning) setOtpWarning(res.warning);
      setOtpCountdown(30);
      setStep('verify_email');
    } else {
      setOtpError(res.error || 'Failed to send verification email. Please check your connection.');
      setStep('verify_email');
    }
  };

  const handleVerifyOtpCode = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit code received on your email.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError('');

    const res = await verifyOtp(guestEmail.trim(), otpCode.trim());
    setIsVerifyingOtp(false);

    if (res.verified) {
      setIsEmailVerified(true);
      setVerifiedEmail(guestEmail.trim());
      setVerifiedVia('otp');
      setOtpSuccessMessage('Email verified successfully!');
      setTimeout(() => {
        setStep('review');
      }, 500);
    } else {
      setOtpError(res.error || 'Invalid verification code. Please try again.');
    }
  };

  const handleProceedFromGuest = async () => {
    if (!guestFirstName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      setSubmitError('Please fill in all mandatory guest details (First Name, Mobile, Email).');
      return;
    }
    setSubmitError('');
    const isVerificationEnabled = hotel?.email_verification_config?.is_enabled !== false;
    if (isVerificationEnabled) {
      if (isEmailVerified && verifiedEmail.toLowerCase() === guestEmail.trim().toLowerCase()) {
        setStep('review');
      } else {
        await handleRequestOtp();
      }
    } else {
      setStep('review');
    }
  };

  const priceInfo = selectedResult
    ? getEffectiveRoomPrice(selectedResult.category, hotel)
    : getEffectiveRoomPrice({ base_price: 1500 }, hotel);
  const isOfferAlreadyApplied = Boolean(
    priceInfo.isInauguralActive ||
      (selectedResult &&
        Number(selectedResult.category.base_price) > Number(selectedResult.ratePerNight))
  );

  useEffect(() => {
    if (isOfferAlreadyApplied && appliedPromo) {
      setAppliedPromo(null);
      setPromoInput('');
      setPromoError('');
    }
  }, [isOfferAlreadyApplied, appliedPromo]);

  const handleApplyPromo = async () => {
    if (isOfferAlreadyApplied) {
      setPromoError('Inaugural Offer is already applied. Additional coupons cannot be combined.');
      return;
    }
    if (appliedPromo) {
      setPromoError('Only a single coupon can be applied per booking.');
      return;
    }
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
  const originalRoomTotal = selectedResult
    ? Number(selectedResult.category.base_price || selectedResult.ratePerNight) * nights
    : 0;
  const roomTotal = selectedResult ? selectedResult.ratePerNight * nights : 0;
  const inauguralSavings = Math.max(0, originalRoomTotal - roomTotal);
  const discountTotal = !isOfferAlreadyApplied && appliedPromo ? appliedPromo.discount : 0;
  const taxableTotal = Math.max(0, roomTotal - discountTotal);
  const taxAmount = Math.round((taxableTotal * (taxableTotal > 7500 ? 18 : 12)) / 100);
  const grandTotal = taxableTotal + taxAmount;

  const finalizeBookingRecord = async (paymentRef?: string) => {
    if (!hotel?.id || !selectedResult) return;
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
      categoryName: selectedResult.category.name,
      yanoljaRoomTypeUnkid: selectedResult.yanoljaRoomTypeUnkid,
      yanoljaRoomRateUnkid: selectedResult.yanoljaRoomRateUnkid,
      ratePerNight: selectedResult.ratePerNight,
      source: 'Website',
      promoCode: !isOfferAlreadyApplied ? appliedPromo?.code : undefined,
      discountAmount: discountTotal,
      specialRequests: specialRequests.trim() || undefined,
      paymentStatus: paymentRef ? 'Paid' : 'Pending',
      paidAmount: paymentRef ? grandTotal : 0,
      paymentReference: paymentRef,
    });

    setIsSubmitting(false);

    if (res.success && res.booking) {
      setPaidOnlineRef(paymentRef || '');
      setConfirmedBookingRef(res.booking.booking_reference);
      setStep('confirmed');
      if (onBookingSuccess) onBookingSuccess(res.booking.booking_reference);
    } else {
      setSubmitError(res.error || 'Failed to confirm booking. Please try again.');
    }
  };

  const handleConfirmBooking = async () => {
    if (!hotel?.id || !selectedResult) return;
    if (!guestFirstName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      setSubmitError('Please fill in all mandatory guest details (First Name, Mobile, Email).');
      return;
    }

    const isVerificationEnabled = hotel?.email_verification_config?.is_enabled !== false;
    if (
      isVerificationEnabled &&
      (!isEmailVerified || verifiedEmail.toLowerCase() !== guestEmail.trim().toLowerCase())
    ) {
      setSubmitError('Email verification required. Please verify your email before confirming.');
      setStep('verify_email');
      return;
    }

    if (isRazorpayActive && selectedPaymentMethod === 'razorpay') {
      setIsSubmitting(true);
      setSubmitError('');

      try {
        if (!(window as any).Razorpay) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Could not load Razorpay checkout script.'));
            document.body.appendChild(script);
          });
        }

        const rzpOptions = {
          key: engineConfig.razorpay_key_id?.trim(),
          amount: Math.round(grandTotal * 100),
          currency: 'INR',
          name: hotel?.name || 'Sun Moon Suites',
          description: `${selectedResult.category.name} (${nights} ${
            nights === 1 ? 'Night' : 'Nights'
          }: ${formatDate(checkIn)} to ${formatDate(checkOut)})`,
          prefill: {
            name: `${guestFirstName.trim()} ${guestLastName.trim()}`.trim(),
            email: guestEmail.trim(),
            contact: guestPhone.trim(),
          },
          theme: {
            color: '#92400e',
          },
          handler: async (response: any) => {
            const payId = response?.razorpay_payment_id || `rzp_${Date.now()}`;
            await finalizeBookingRecord(payId);
          },
          modal: {
            ondismiss: () => {
              setIsSubmitting(false);
            },
          },
        };

        const rzp = new (window as any).Razorpay(rzpOptions);
        rzp.on('payment.failed', (resp: any) => {
          setIsSubmitting(false);
          setSubmitError(
            resp?.error?.description || 'Payment failed. Please try again or select Pay on Arrival.'
          );
        });
        rzp.open();
      } catch (err: any) {
        setIsSubmitting(false);
        setSubmitError(err?.message || 'Unable to initialize Razorpay payment gateway.');
      }
      return;
    }

    await finalizeBookingRecord();
  };

  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const whatsappBookingUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotel?.name || 'Sun Moon Suites'}, I have confirmed booking ${confirmedBookingRef} for dates ${formatDate(checkIn)} to ${formatDate(checkOut)}. Please share confirmation.`
  )}`;

  return (
    <>
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
            {hotel?.email_verification_config?.is_enabled !== false && (
              <>
                <span>&rarr;</span>
                <span className={step === 'verify_email' ? 'text-amber-800 font-bold' : ''}>
                  3. Verify Email
                </span>
              </>
            )}
            <span>&rarr;</span>
            <span className={step === 'review' ? 'text-amber-800 font-bold' : ''}>
              {hotel?.email_verification_config?.is_enabled !== false
                ? '4. Review & Guarantee'
                : '3. Review & Guarantee'}
            </span>
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
                  {formatDate(checkIn)} &rarr; {formatDate(checkOut)} ({nights} {nights === 1 ? 'Night' : 'Nights'})
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
                            {result.category.base_price > result.ratePerNight && (
                              <div className="flex items-center justify-end gap-1.5 mb-0.5">
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-extrabold uppercase rounded">
                                  {hotel?.inaugural_offer?.badge_text || '🎉 Inaugural Offer'}
                                </span>
                                <span className="text-xs text-stone-400 line-through font-serif">
                                  {formatINR(result.category.base_price)}
                                </span>
                              </div>
                            )}
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
                {nights} {nights === 1 ? 'Night' : 'Nights'} ({formatDate(checkIn)} to {formatDate(checkOut)})
              </div>
              <button
                type="button"
                onClick={() => setStep('rooms')}
                className="text-amber-800 underline font-medium hover:text-amber-950"
              >
                Change Room
              </button>
            </div>

            {/* 2 VERIFICATION OPTIONS SELECTOR BANNER */}
            <div className="p-3.5 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/50 space-y-2.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  Verification Options (Choose Option 1 or 2)
                </span>
                {isEmailVerified && verifiedEmail.toLowerCase() === guestEmail.trim().toLowerCase() ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified {verifiedVia === 'google' ? 'via Gmail' : 'via OTP'}
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-800 font-medium">
                    Instant Gmail Login or 6-Digit Email OTP
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* OPTION 1: Continue with Gmail */}
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(true)}
                  className="w-full px-3 py-2.5 bg-white hover:bg-stone-50 border border-stone-300 hover:border-amber-700 rounded-lg text-stone-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs group"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.43 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                  </svg>
                  <span>Option 1: Quick Verify via Gmail</span>
                </button>

                {/* OPTION 2: Verify by OTP */}
                <button
                  type="button"
                  onClick={() => {
                    if (!guestEmail.trim()) {
                      setSubmitError('Please enter your email address below first.');
                      return;
                    }
                    handleRequestOtp();
                  }}
                  className="w-full px-3 py-2.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-stone-700" />
                  <span>Option 2: Verify by Email OTP</span>
                </button>
              </div>
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Email Address *
                  </label>
                  {isEmailVerified && verifiedEmail.toLowerCase() === guestEmail.trim().toLowerCase() && (
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Verified {verifiedVia === 'google' ? 'via Gmail' : 'via OTP'}
                    </span>
                  )}
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={guestEmail}
                  onChange={(e) => {
                    const newEmail = e.target.value;
                    setGuestEmail(newEmail);
                    if (isEmailVerified && verifiedEmail.toLowerCase() !== newEmail.trim().toLowerCase()) {
                      setIsEmailVerified(false);
                      setVerifiedEmail('');
                      setVerifiedVia('');
                    }
                  }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium ${
                    isEmailVerified && verifiedEmail.toLowerCase() === guestEmail.trim().toLowerCase()
                      ? 'border-emerald-400 bg-emerald-50/40 text-emerald-950 font-semibold'
                      : 'border-stone-300'
                  }`}
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
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <button
                type="button"
                disabled={!guestFirstName.trim() || !guestPhone.trim() || !guestEmail.trim() || isSendingOtp}
                onClick={handleProceedFromGuest}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                {isSendingOtp ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Sending Code...
                  </>
                ) : hotel?.email_verification_config?.is_enabled !== false &&
                  (!isEmailVerified || verifiedEmail.toLowerCase() !== guestEmail.trim().toLowerCase()) ? (
                  <>
                    Verify Email &amp; Continue
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Continue to Review
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP: EMAIL VERIFICATION */}
        {step === 'verify_email' && (
          <div className="space-y-5">
            <div className="p-6 bg-gradient-to-b from-amber-50/60 to-white rounded-2xl border border-amber-200/80 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Mail className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif font-bold text-lg text-stone-900">
                  Verify Your Email Address
                </h4>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  A 6-digit verification code has been dispatched via Gmail to:
                </p>
                <p className="text-sm font-bold text-amber-900 font-mono">
                  {guestEmail}
                </p>
              </div>

              {/* 6-Digit Code Input */}
              <div className="max-w-xs mx-auto space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700">
                  Enter 6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                    if (otpError) setOtpError('');
                  }}
                  className="w-full text-center tracking-[12px] font-mono text-2xl font-bold py-3 px-4 border-2 border-amber-700/60 rounded-xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 bg-white"
                />

                {/* Auto-fill button when instant dev code is available */}
                {otpDevCode && (
                  <div className="flex items-center justify-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode(otpDevCode);
                        if (otpError) setOtpError('');
                      }}
                      className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                      <span>Auto-Fill Instant Code ({otpDevCode})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dev/Test Mode Banner (Shown if App Password not yet configured or SMTP issue) */}
              {otpDevCode && (
                <div className="max-w-md mx-auto p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Instant Verification Active: </span>
                    <span className="font-mono font-bold text-sm bg-amber-200/70 px-1.5 py-0.5 rounded">{otpDevCode}</span>
                    <p className="text-[11px] text-amber-800 mt-1">
                      {otpWarning || 'You can click Auto-Fill Code above or enter it manually to verify your reservation without delay.'}
                    </p>
                  </div>
                </div>
              )}

              {otpError && (
                <div className="max-w-xs mx-auto p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  {otpError}
                </div>
              )}

              {otpSuccessMessage && !otpError && (
                <div className="max-w-xs mx-auto p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {otpSuccessMessage}
                </div>
              )}

              {/* Action Buttons: Verify & Resend */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isVerifyingOtp || otpCode.trim().length !== 6}
                  onClick={handleVerifyOtpCode}
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isVerifyingOtp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    <>
                      Verify Code &amp; Continue
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isSendingOtp || otpCountdown > 0}
                  onClick={handleRequestOtp}
                  className="w-full sm:w-auto px-4 py-2.5 border border-stone-300 hover:bg-stone-50 disabled:opacity-50 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                  {otpCountdown > 0
                    ? `Resend in ${otpCountdown}s`
                    : isSendingOtp
                    ? 'Sending...'
                    : 'Resend Code'}
                </button>
              </div>

              {/* OPTION 1 FAST ALTERNATIVE: QUICK VERIFY WITH GMAIL */}
              <div className="pt-3 border-t border-amber-200/60 max-w-sm mx-auto space-y-2">
                <p className="text-[11px] text-stone-500 font-medium">
                  OTP email delay ho raha hai? Quick Gmail se verify karein:
                </p>
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(true)}
                  className="w-full py-2.5 px-4 bg-white hover:bg-stone-50 border border-stone-300 hover:border-amber-700 rounded-xl text-xs font-bold text-stone-800 flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.43 7.31 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                  </svg>
                  <span>Option 1: Verify Instantly via Gmail (Skip OTP)</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setStep('guest')}
                  className="text-stone-500 hover:text-amber-800 text-xs underline cursor-pointer"
                >
                  Mistyped your email? Change Email Address
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setStep('guest')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Guest Info
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
                    {formatDate(checkIn)} to {formatDate(checkOut)} &bull; {nights} {nights === 1 ? 'Night' : 'Nights'} &bull;{' '}
                    {adults} Adults
                  </p>
                </div>
                <div className="text-right font-medium text-stone-900 text-sm">
                  {formatINR(roomTotal)}
                </div>
              </div>

              {/* Promo Code / Offer Status */}
              {isOfferAlreadyApplied ? (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    {hotel?.inaugural_offer?.badge_text || '🎉 Inaugural Offer'} Already Applied
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium">
                    No other offer or coupon can be combined
                  </span>
                </div>
              ) : (
                <div className="pt-1">
                  {!appliedPromo ? (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Have a Coupon Code? (Single coupon allowed)"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg uppercase font-semibold bg-white"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={!promoInput.trim() || isValidatingPromo}
                        onClick={handleApplyPromo}
                        className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg disabled:opacity-50 cursor-pointer"
                      >
                        {isValidatingPromo ? 'Checking...' : 'Apply'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                      <p className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {appliedPromo.message} <span className="text-[10px] text-emerald-700 font-normal">(1 Coupon Applied)</span>
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedPromo(null);
                          setPromoError('');
                          setPromoInput('');
                        }}
                        className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {promoError && <p className="text-xs text-rose-600 mt-1">{promoError}</p>}
                </div>
              )}

              {/* Bill Details */}
              <div className="pt-2 border-t border-stone-200 space-y-1.5 text-xs text-stone-600">
                {isOfferAlreadyApplied && inauguralSavings > 0 && (
                  <>
                    <div className="flex justify-between text-stone-400">
                      <span>Regular Room Tariff ({nights} {nights === 1 ? 'Night' : 'Nights'})</span>
                      <span className="line-through">{formatINR(originalRoomTotal)}</span>
                    </div>
                    <div className="flex justify-between text-amber-800 font-semibold">
                      <span>{hotel?.inaugural_offer?.badge_text || '🎉 Inaugural Offer'} Savings</span>
                      <span>- {formatINR(inauguralSavings)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span>{isOfferAlreadyApplied ? 'Offer Room Tariff' : 'Room Tariff'}</span>
                  <span>{formatINR(roomTotal)}</span>
                </div>
                {!isOfferAlreadyApplied && discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount ({appliedPromo?.code})</span>
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
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-600 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-semibold text-stone-900">Guest:</span> {guestFirstName}{' '}
                {guestLastName} &bull; {guestPhone} &bull; {guestEmail}
              </div>
              {isEmailVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Email Verified
                </span>
              )}
            </div>

            {/* Payment & Guarantee Mode */}
            {isRazorpayActive && paymentMode !== 'pay_at_hotel' ? (
              <div className="space-y-2.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Select Payment Method
                </label>
                <div
                  className={`grid grid-cols-1 ${
                    paymentMode === 'both' ? 'sm:grid-cols-2' : ''
                  } gap-3 text-xs`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentMethod('razorpay')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedPaymentMethod === 'razorpay'
                        ? 'border-amber-700 bg-amber-50/90 ring-2 ring-amber-600/20 text-amber-950'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>Pay Online Now (Razorpay)</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-extrabold uppercase">
                        Instant Paid
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1">
                      Pay securely on this website via UPI (GPay, PhonePe, Paytm), Credit/Debit Card, or NetBanking.
                    </p>
                  </button>

                  {paymentMode === 'both' && (
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod('pay_at_hotel')}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPaymentMethod === 'pay_at_hotel'
                          ? 'border-amber-700 bg-amber-50/90 ring-2 ring-amber-600/20 text-amber-950'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span>Pay on Arrival at Hotel</span>
                        <span className="px-2 py-0.5 bg-stone-200 text-stone-700 rounded text-[10px] font-bold uppercase">
                          Reception
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1">
                        Reserve your room now and pay upon check-in via Cash, UPI, or Card at the front desk.
                      </p>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900">
                <p className="font-semibold mb-1">Pay on Arrival &bull; Guaranteed Reservation</p>
                <p className="text-[11px] text-amber-800">
                  No credit card required upfront. Pay upon check-in via Cash, UPI (Google Pay, PhonePe, Paytm), or Card.
                  Standard check-in time is {hotel?.check_in_time || '14:00'}.
                </p>
              </div>
            )}

            {submitError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {submitError}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-stone-200">
              <button
                type="button"
                onClick={() =>
                  setStep(
                    hotel?.email_verification_config?.is_enabled !== false
                      ? 'verify_email'
                      : 'guest'
                  )
                }
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
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
                {isSubmitting
                  ? 'Processing...'
                  : isRazorpayActive && selectedPaymentMethod === 'razorpay'
                  ? `Pay Online & Confirm (${formatINR(grandTotal)})`
                  : `Confirm Booking (${formatINR(grandTotal)})`}
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
                  {formatDate(checkIn)} (from {hotel?.check_in_time || '14:00'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Check-out Date</span>
                <span className="text-stone-800">
                  {formatDate(checkOut)} (until {hotel?.check_out_time || '11:00'})
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

    {/* Google Sign-In & Instant Verification Modal */}
    <GoogleAuthModal
      isOpen={isGoogleModalOpen}
      onClose={() => setIsGoogleModalOpen(false)}
      onSuccess={handleGoogleVerified}
      onSwitchToOtp={() => {
        setIsGoogleModalOpen(false);
        if (guestEmail.trim()) {
          handleRequestOtp();
        }
      }}
      initialEmail={guestEmail}
      initialName={guestFirstName ? `${guestFirstName} ${guestLastName}`.trim() : ''}
    />
  </>
  );
};
