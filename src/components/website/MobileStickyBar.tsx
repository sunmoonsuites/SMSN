import React from 'react';
import { Hotel } from '../../types';
import { Phone, MessageCircle, CalendarCheck } from 'lucide-react';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';

interface MobileStickyBarProps {
  hotel: Hotel | null;
  onOpenBooking: () => void;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({
  hotel,
  onOpenBooking,
}) => {
  const phone = getCleanHotelPhone(hotel?.phone);
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const hotelName = hotel?.name || 'Sun Moon Suites';

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotelName}, I would like to check room availability in Sector 117 Noida.`
  )}`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 px-3 py-2 flex items-center justify-between gap-2 shadow-2xl">
      <a
        href={`tel:${phone.replace(/\s+/g, '')}`}
        className="flex-1 py-2.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <Phone className="w-3.5 h-3.5 text-stone-700" />
        <span>Call</span>
      </a>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>WhatsApp</span>
      </a>

      <button
        type="button"
        onClick={onOpenBooking}
        className="flex-2 py-2.5 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs uppercase font-bold tracking-wider flex items-center justify-center gap-1.5 shadow-sm"
      >
        <CalendarCheck className="w-4 h-4" />
        <span>Book Now</span>
      </button>
    </div>
  );
};
