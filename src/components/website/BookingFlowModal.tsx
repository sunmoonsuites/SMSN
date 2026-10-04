import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Hotel, RoomCategory } from '../../types';
import { checkRoomAvailability, createBooking, AvailabilityResult } from '../../services/bookingService';
import { validatePromoCode } from '../../services/offersService';
import {
  getEffectiveRoomPrice,
  DEFAULT_BOOKING_ENGINE_CONFIG,
  buildYanoljaBookingUrl,
  updateHotelSettings,
  updateHotel,
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
import {
  getExistingGoogleUser,
  triggerGoogleSignIn,
  saveVerifiedGoogleGuest,
  GoogleUserProfile,
} from '../../services/googleAuthService';
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
  Lock,
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
  const [step, setStep] = useState<'search' | 'rooms' | 'auth' | 'guest' | 'verify_email' | 'review' | 'confirmed'>('search');

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

  // Lock status of fields:
  // Google login: all fetched fields (First Name, Last Name, Mobile, Email) are auto-filled and locked (not editable).
  // Unfetched fields remain editable.
  // OTP verify: only Email is auto-filled and locked; First Name, Last Name, Mobile remain editable.
  const [lockedFields, setLockedFields] = useState<{
    email: boolean;
    firstName: boolean;
    lastName: boolean;
    phone: boolean;
  }>({
    email: false,
    firstName: false,
    lastName: false,
    phone: false,
  });

  // Email OTP & Google Verification State
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [verifiedVia, setVerifiedVia] = useState<'otp' | 'google' | ''>('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState('');
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
        const cleanEmail = user.email.toLowerCase().trim();
        const firstName = user.given_name || (user.name ? user.name.split(' ')[0] : '');
        const lastName =
          user.family_name ||
          (user.name && user.name.split(' ').length > 1
            ? user.name.split(' ').slice(1).join(' ')
            : '');
        const phone = user.phone || '';

        if (!guestEmail) setGuestEmail(cleanEmail);
        if (!guestFirstName && firstName) setGuestFirstName(firstName);
        if (!guestLastName && lastName) setGuestLastName(lastName);
        if (!guestPhone && phone) setGuestPhone(phone);

        setIsEmailVerified(true);
        setVerifiedEmail(cleanEmail);
        setVerifiedVia('google');
        setLockedFields({
          email: true,
          firstName: !!firstName,
          lastName: !!lastName,
          phone: !!phone,
        });
      }
    });
  }, []);

  const handleGoogleVerified = (user: GoogleUserProfile) => {
    const cleanEmail = (user.email || '').toLowerCase().trim();
    const firstName = user.given_name || (user.name ? user.name.split(' ')[0] : '');
    const lastName =
      user.family_name ||
      (user.name && user.name.split(' ').length > 1
        ? user.name.split(' ').slice(1).join(' ')
        : '');
    const phone = user.phone || '';

    setGuestEmail(cleanEmail);
    if (firstName) setGuestFirstName(firstName);
    if (lastName) setGuestLastName(lastName);
    if (phone) setGuestPhone(phone);

    setIsEmailVerified(true);
    setVerifiedEmail(cleanEmail);
    setVerifiedVia('google');

    // As requested:
    // "Agar Wo Google Se Login Karta Hai To Sari Details Jaise First Name, Last Name, Mobile No., Email Address Automatically Fill Ho Jayenge Not Editable. Agar Koi Field Fetch Nahi Hui Hai To Wo Editable Rahegi Usme Guest Apni Detail Dal Payega."
    setLockedFields({
      email: !!cleanEmail,
      firstName: !!firstName,
      lastName: !!lastName,
      phone: !!phone,
    });

    setOtpSuccessMessage(`Logged in with Google as ${cleanEmail}`);
    setOtpError('');
    setGoogleAuthError('');

    // After verification, advance directly to Guest details
    setStep('guest');
  };

  const handleDirectGoogleSignIn = async () => {
    setGoogleAuthError('');
    setOtpError('');
    setIsGoogleSigningIn(true);

    const effectiveId = (
      hotel?.email_verification_config?.google_client_id ||
      (typeof localStorage !== 'undefined'
        ? localStorage.getItem('sms_google_client_id') || ''
        : '') ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      ''
    ).trim();

    try {
      const res = await triggerGoogleSignIn(effectiveId);
      setIsGoogleSigningIn(false);

      if (res.success && res.user) {
        handleGoogleVerified(res.user);
      } else if (res.error && res.error !== 'POPUP_OPENED') {
        setGoogleAuthError(res.error);
      }
    } catch (err: any) {
      setIsGoogleSigningIn(false);
      setGoogleAuthError(err?.message || 'Google Sign-In popup could not be opened.');
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
    if (!guestEmail.trim() || !guestEmail.includes('@')) {
      setOtpError('Please enter a valid email address.');
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
    } else {
      setOtpError(res.error || 'Failed to send verification email. Please check your connection.');
    }
  };

  const handleVerifyOtpCode = async () => {
    if (!guestEmail.trim()) {
      setOtpError('Please enter your email address first.');
      return;
    }
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit code received on your email.');
      return;
    }
    setIsVerifyingOtp(true);
    setOtpError('');

    const res = await verifyOtp(guestEmail.trim(), otpCode.trim());
    setIsVerifyingOtp(false);

    if (res.verified) {
      const cleanEmail = guestEmail.trim().toLowerCase();
      setIsEmailVerified(true);
      setVerifiedEmail(cleanEmail);
      setVerifiedVia('otp');

      // Rule:
      // "Agar Koi OTP Se Verify Karta Hai To Kewal Email Autofill Ho jayegi or Not Editable Rahegi & Baki Sari Fields Editable Hongi."
      setLockedFields({
        email: true,
        firstName: false,
        lastName: false,
        phone: false,
      });

      setOtpSuccessMessage('Email verified successfully via OTP!');
      setOtpError('');
      setTimeout(() => {
        setStep('guest');
      }, 400);
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
    setStep('review');
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
      setSubmitError('Guest login or verification is required before confirming your booking.');
      setStep('auth');
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
          : 'Direct Booking Guarantee • Instant Confirmation'
      }
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Step Navigation Indicator */}
        {step !== 'confirmed' && (
          <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span className={step === 'rooms' ? 'text-amber-800 font-bold' : ''}>1. Select Room</span>
            <span>&rarr;</span>
            <span className={step === 'auth' ? 'text-amber-800 font-bold' : ''}>2. Login / Verify</span>
            <span>&rarr;</span>
            <span className={step === 'guest' ? 'text-amber-800 font-bold' : ''}>3. Guest Details</span>
            <span>&rarr;</span>
            <span className={step === 'review' ? 'text-amber-800 font-bold' : ''}>4. Review &amp; Confirm</span>
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
                              if (isEmailVerified && verifiedEmail) {
                                setStep('guest');
                              } else {
                                setStep('auth');
                              }
                            }}
                            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-800 text-white'
                                : isAvailable
                                ? 'bg-stone-900 text-white hover:bg-stone-800'
                                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select Room'}
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

        {/* STEP 2: GUEST LOGIN & VERIFICATION */}
        {step === 'auth' && (
          <div className="space-y-5">
            {/* Room Summary Header */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold text-amber-950">{selectedResult?.category.name}</span> &bull;{' '}
                {nights} {nights === 1 ? 'Night' : 'Nights'} ({formatDate(checkIn)} to {formatDate(checkOut)}) &bull;{' '}
                <span className="font-semibold text-stone-900">{formatINR(grandTotal)}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep('rooms')}
                className="text-amber-800 underline font-medium hover:text-amber-950 cursor-pointer"
              >
                Change Room
              </button>
            </div>

            {/* Login Selection Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
              <div className="text-center space-y-1">
                <h3 className="font-serif text-xl font-bold text-stone-900">
                  Guest Verification &amp; Login
                </h3>
                <p className="text-xs text-stone-600 max-w-md mx-auto">
                  Aage badhne ke liye please sign in karein. Google se 1-Click login karein ya Email OTP se verify karein.
                </p>
              </div>

              {/* Two Prominent Verification Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OPTION 1: GOOGLE / GMAIL LOGIN */}
                <div className="p-5 rounded-xl border-2 border-amber-600/40 hover:border-amber-700 bg-amber-50/20 transition-all flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Recommended &bull; 1-Click
                      </span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="font-bold text-stone-900 text-sm">
                      Login via Google / Gmail
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Instant Gmail verification. First Name, Last Name, Mobile &amp; Email automatically fill ho jayenge aur non-editable rahenge.
                    </p>
                  </div>

                  <div className="pt-2 space-y-3">
                    <button
                      type="button"
                      disabled={isGoogleSigningIn}
                      onClick={() => handleDirectGoogleSignIn()}
                      className="w-full py-3.5 px-4 bg-white hover:bg-stone-50 border-2 border-stone-300 hover:border-amber-700 rounded-xl font-bold text-sm text-stone-900 flex items-center justify-center gap-3 shadow-2xs transition-all cursor-pointer group disabled:opacity-60"
                    >
                      {isGoogleSigningIn ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-amber-800" />
                          <span>Connecting to Google Accounts...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.43 7.31 24 12 24z"/>
                            <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"/>
                            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                          </svg>
                          <span className="text-stone-900 group-hover:text-amber-950 font-bold">
                            Sign in with Google
                          </span>
                        </>
                      )}
                    </button>

                    {googleAuthError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-medium leading-relaxed text-left">
                        {googleAuthError}
                      </div>
                    )}

                    <p className="text-[11px] text-stone-500 text-center pt-0.5">
                      Official Google Account Chooser &bull; 1-Click Verification
                    </p>
                  </div>
                </div>

                {/* OPTION 2: EMAIL OTP VERIFICATION */}
                <div className="p-5 rounded-xl border border-stone-200 bg-white transition-all space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                      Option 2
                    </span>
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-amber-800" />
                      Verify via Email OTP
                    </h4>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      Apni email enter kijiye, OTP verify hone par email autofill &amp; locked rahegi, baki sab details editable rahengi.
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                        Email Address *
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="name@gmail.com"
                          value={guestEmail}
                          onChange={(e) => {
                            setGuestEmail(e.target.value);
                            setOtpError('');
                          }}
                          className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white"
                        />
                        <button
                          type="button"
                          disabled={isSendingOtp || !guestEmail.trim()}
                          onClick={handleRequestOtp}
                          className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
                        >
                          {isSendingOtp ? 'Sending...' : otpCountdown > 0 ? `Resend (${otpCountdown}s)` : 'Send OTP'}
                        </button>
                      </div>
                    </div>

                    {/* Messages */}
                    {otpSuccessMessage && (
                      <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{otpSuccessMessage}</span>
                      </div>
                    )}
                    {otpWarning && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                        {otpWarning}
                      </div>
                    )}
                    {otpError && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                        {otpError}
                      </div>
                    )}

                    {/* Enter 6-digit OTP code */}
                    {(otpSuccessMessage || otpDevCode) && (
                      <div className="pt-2 space-y-2 border-t border-stone-100">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600">
                          Enter 6-Digit OTP Code:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={otpCode}
                            onChange={(e) => {
                              setOtpCode(e.target.value.replace(/\D/g, ''));
                              setOtpError('');
                            }}
                            className="w-full px-3 py-2 text-center tracking-widest text-sm font-mono font-bold border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 bg-white"
                          />
                          <button
                            type="button"
                            disabled={isVerifyingOtp || otpCode.trim().length !== 6}
                            onClick={handleVerifyOtpCode}
                            className="px-4 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                          >
                            {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                          </button>
                        </div>

                        {otpDevCode && (
                          <button
                            type="button"
                            onClick={() => {
                              setOtpCode(otpDevCode);
                            }}
                            className="w-full py-1 text-center text-[10px] text-amber-800 bg-amber-50 border border-dashed border-amber-300 rounded hover:bg-amber-100 font-semibold cursor-pointer"
                          >
                            ⚡ Auto-Fill Instant Code: {otpDevCode}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setStep('rooms')}
                  className="text-stone-600 hover:text-stone-900 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Room Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: GUEST DETAILS */}
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

            {/* VERIFIED GUEST BANNER */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-950">
                  {verifiedVia === 'google' ? 'Logged in via Google' : 'Verified via Email OTP'}:{' '}
                  <span className="font-mono font-medium text-emerald-900">{guestEmail}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('auth')}
                className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold underline cursor-pointer self-start sm:self-auto"
              >
                Switch Account
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    First Name *
                  </label>
                  {lockedFields.firstName && (
                    <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-stone-400" />
                      Google Verified (Locked)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  readOnly={lockedFields.firstName}
                  disabled={lockedFields.firstName}
                  placeholder="e.g. Rahul"
                  value={guestFirstName}
                  onChange={(e) => setGuestFirstName(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg font-medium ${
                    lockedFields.firstName
                      ? 'bg-stone-100 border-stone-200 text-stone-700 cursor-not-allowed'
                      : 'bg-white border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-700'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Last Name
                  </label>
                  {lockedFields.lastName && (
                    <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-stone-400" />
                      Google Verified (Locked)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  readOnly={lockedFields.lastName}
                  disabled={lockedFields.lastName}
                  placeholder="e.g. Sharma"
                  value={guestLastName}
                  onChange={(e) => setGuestLastName(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg font-medium ${
                    lockedFields.lastName
                      ? 'bg-stone-100 border-stone-200 text-stone-700 cursor-not-allowed'
                      : 'bg-white border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-700'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Mobile Number *
                  </label>
                  {lockedFields.phone ? (
                    <span className="text-[10px] text-stone-500 font-semibold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5 text-stone-400" />
                      Google Verified (Locked)
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-800 font-medium">
                      Editable (Please enter mobile)
                    </span>
                  )}
                </div>
                <input
                  type="tel"
                  required
                  readOnly={lockedFields.phone}
                  disabled={lockedFields.phone}
                  placeholder="+91 93135 01001"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg font-medium ${
                    lockedFields.phone
                      ? 'bg-stone-100 border-stone-200 text-stone-700 cursor-not-allowed'
                      : 'bg-white border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-700'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                    Email Address *
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {verifiedVia === 'google' ? 'Google Verified (Locked)' : 'OTP Verified (Locked)'}
                  </span>
                </div>
                <input
                  type="email"
                  required
                  readOnly
                  disabled
                  placeholder="name@example.com"
                  value={guestEmail}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-stone-100 text-stone-700 font-medium cursor-not-allowed font-mono"
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
                onClick={() => setStep('auth')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Login
              </button>

              <button
                type="button"
                disabled={!guestFirstName.trim() || !guestPhone.trim() || !guestEmail.trim()}
                onClick={handleProceedFromGuest}
                className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                Continue to Review &amp; Guarantee
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
                onClick={() => setStep('guest')}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Guest Info
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

  </>
  );
};
