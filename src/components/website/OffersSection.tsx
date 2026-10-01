import React, { useEffect, useState } from 'react';
import { Hotel, Offer } from '../../types';
import { getOffers, DEFAULT_OFFERS } from '../../services/offersService';
import {
  DEFAULT_INAUGURAL_OFFER_CONFIG,
  getEffectiveRoomPrice,
} from '../../services/hotelService';
import { formatDate, formatINR } from '../../lib/utils';
import { Tag, Copy, Check, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface OffersSectionProps {
  hotel: Hotel | null;
  onSelectOfferCode?: (code: string) => void;
}

export const OffersSection: React.FC<OffersSectionProps> = ({
  hotel,
  onSelectOfferCode,
}) => {
  const [offers, setOffers] = useState<Offer[]>(DEFAULT_OFFERS);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const inauguralConfig = hotel?.inaugural_offer ?? DEFAULT_INAUGURAL_OFFER_CONFIG;
  const { isInauguralActive, effectivePrice, badgeText } = getEffectiveRoomPrice(
    { base_price: 1500 },
    hotel
  );

  useEffect(() => {
    if (hotel?.id) {
      loadOffers();
    }
  }, [hotel?.id]);

  const loadOffers = async () => {
    if (!hotel?.id) return;
    const data = await getOffers(hotel.id, true);
    setOffers(data);
    setIsLoading(false);
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
    if (onSelectOfferCode) onSelectOfferCode(code);
  };

  // If no active offers and no inaugural offer, do not render an empty block
  if (!isLoading && offers.length === 0 && !isInauguralActive) {
    return null;
  }

  return (
    <section id="offers" className="py-20 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold flex items-center justify-center gap-1">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Special Promotions
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            {isInauguralActive ? 'Grand Inaugural Offer' : 'Direct Booking Privileges'}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {isInauguralActive
              ? 'Our special flat Inaugural Offer tariff is automatically applied on all room categories during booking—no coupon code needed.'
              : 'Apply any single promotional coupon code during checkout for guaranteed direct booking savings on your stay.'}
          </p>
        </div>

        {isInauguralActive ? (
          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-white to-amber-50/70 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-800 text-white text-xs font-extrabold uppercase tracking-wider">
                <span>{badgeText || '🎉 Inaugural Offer'}</span>
                <span>&bull; Auto-Applied</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                {inauguralConfig.banner_text ||
                  `All Room Categories at Flat ${formatINR(effectivePrice)} / Night!`}
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Book Standard Room, Deluxe Room, Super Deluxe Room, or Suite Room at flat{' '}
                <strong>{formatINR(effectivePrice)} / night</strong> (+ GST). Because this maximum inaugural discount is already applied automatically, additional promo codes or coupons cannot be combined.
              </p>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 pt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Instant Discount Applied Automatically at Checkout (No Coupon Required)</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onSelectOfferCode) onSelectOfferCode('');
              }}
              className="px-5 py-3 bg-stone-900 hover:bg-amber-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              <span>Book at {formatINR(effectivePrice)}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="p-6 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 relative overflow-hidden flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-200/70 text-amber-950 font-serif font-bold text-xs">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `₹${offer.discount_value} FLAT OFF`}
                  </div>

                  <h3 className="font-serif text-xl font-bold text-stone-900">{offer.title}</h3>
                  {offer.description && (
                    <p className="text-xs text-stone-600 leading-relaxed">{offer.description}</p>
                  )}

                  <div className="text-[11px] text-stone-500 pt-1">
                    Valid until {formatDate(offer.end_date)}
                    {offer.min_booking_amount > 0 && ` • Min spend ₹${offer.min_booking_amount}`}
                    {' • Single coupon per booking'}
                  </div>
                </div>

                <div className="pt-5 flex items-center justify-between border-t border-amber-200/80 mt-4">
                  <div className="flex items-center gap-1 font-mono font-bold text-sm text-stone-900 bg-white px-3 py-1.5 rounded-lg border border-stone-200">
                    <Tag className="w-3.5 h-3.5 text-amber-700" />
                    {offer.promo_code}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(offer.promo_code)}
                    className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedCode === offer.promo_code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
