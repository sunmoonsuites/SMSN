import React, { useState } from 'react';
import { Hotel } from '../../types';
import { Phone, MessageCircle, Menu, X, Clock } from 'lucide-react';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';

interface NavbarProps {
  hotel: Hotel | null;
  onOpenBooking: () => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  hotel,
  onOpenBooking,
  onNavigateSection,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const phone = getCleanHotelPhone(hotel?.phone);
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const hotelName = hotel?.name || 'Sun Moon Suites';
  const isBanquetEnabled = hotel?.banquet_config?.is_enabled !== false;

  const navLinks = [
    { label: 'Rooms', id: 'rooms' },
    ...(isBanquetEnabled ? [{ label: 'Banquet Hall', id: 'banquet' }] : []),
    { label: 'Amenities', id: 'amenities' },
    { label: 'Offers', id: 'offers' },
    { label: 'Gallery', id: 'gallery' },
    { label: 'Location', id: 'location' },
    { label: 'Contact', id: 'contact' },
  ];

  const handleNavClick = (id: string) => {
    onNavigateSection(id);
    setMobileMenuOpen(false);
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotelName}, I would like to enquire about room availability.`
  )}`;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-all">
      {/* Top Bar with Contact Info */}
      <div className="bg-stone-900 text-stone-300 text-xs px-4 py-2 hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-6">
          <a
            href={`tel:${phone.replace(/\s+/g, '')}`}
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-amber-400" />
            <span>{phone}</span>
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>WhatsApp Enquiry</span>
          </a>
          <span className="text-stone-500">|</span>
          <span className="text-stone-400">{hotel?.address || 'Sector 117'}, {hotel?.city || 'Noida'}</span>
        </div>

        <div className="flex items-center gap-1.5 text-stone-400">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>
            Check-In: {hotel?.check_in_time || '14:00'} &bull; Check-Out: {hotel?.check_out_time || '11:00'}
          </span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigateSection('hero')}
            className="text-left group cursor-pointer"
          >
            <h1 className="font-serif text-2xl sm:text-2xl font-bold tracking-tight text-stone-900 group-hover:text-amber-800 transition-colors">
              {hotelName}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-stone-500 font-sans">
              {hotel?.city || 'Noida'} &bull; {hotel?.total_rooms || 30} Luxury Rooms
            </p>
          </button>
        </div>

        {/* Desktop Menu */}
        <nav className="hidden lg:flex items-center gap-7">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNavClick(link.id)}
              className="text-sm font-medium text-stone-700 hover:text-amber-800 tracking-wide transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenBooking}
            className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs uppercase tracking-widest font-semibold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            Book Now
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenBooking}
            className="sm:hidden px-3.5 py-1.5 bg-amber-700 text-white text-xs font-semibold rounded-md shadow-xs"
          >
            Book
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-stone-200 px-4 pt-2 pb-6 space-y-3 shadow-xl">
          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavClick(link.id)}
                className="text-left px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 rounded-md"
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-stone-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                onOpenBooking();
                setMobileMenuOpen(false);
              }}
              className="w-full py-3 bg-amber-700 text-white text-center text-xs uppercase tracking-widest font-bold rounded-lg shadow-sm"
            >
              Book Your Stay
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
