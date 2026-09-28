import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Hotel } from '../../types';
import { getCleanHotelWhatsApp } from '../../lib/utils';

interface FloatingWhatsAppButtonProps {
  hotel: Hotel | null;
}

export const FloatingWhatsAppButton: React.FC<FloatingWhatsAppButtonProps> = ({ hotel }) => {
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotel?.name || 'Sun Moon Suites'}, I have an enquiry.`
  )}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-500 text-white rounded-full shadow-lg hover:bg-emerald-600 transition-all duration-300 hover:scale-110 flex items-center justify-center"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle className="w-8 h-8" />
    </a>
  );
};
