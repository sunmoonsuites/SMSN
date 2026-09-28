import React, { useState } from 'react';
import HeroImage from '../../assets/images/hero_hotel_image_1790078637116.jpg';
import { Hotel } from '../../types';
import { Calendar, Users, ArrowRight, Shield, Award, MapPin } from 'lucide-react';

interface HeroSectionProps {
  hotel: Hotel | null;
  onSearchAvailability: (search: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  hotel,
  onSearchAvailability,
}) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const [checkIn, setCheckIn] = useState(tomorrow.toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState(dayAfter.toISOString().split('T')[0]);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchAvailability({ checkIn, checkOut, adults, children });
  };

  const heroImg = hotel?.hero_config?.image_url || HeroImage;
  const badge = hotel?.hero_config?.badge || `${hotel?.city || 'Sector 117, Noida'} • ${hotel?.total_rooms || 30} Boutique Rooms`;
  const heading = hotel?.hero_config?.heading || hotel?.tagline || 'Modern Comfort & Tranquility in Noida';
  const description = hotel?.hero_config?.description || hotel?.description ||
    'Experience attentive hospitality at our 30-room hotel in Sector 117, Noida. Featuring well-appointed rooms across three floors, dedicated dining, and premier connectivity to the Noida Expressway.';
  const highlight1 = hotel?.hero_config?.highlight1 || '100% Verified Reservations';
  const highlight2 = hotel?.hero_config?.highlight2 || 'Best Direct Tariff Guaranteed';
  const highlight3 = hotel?.hero_config?.highlight3 || 'Zero Booking Fees';

  return (
    <div id="hero" className="relative text-white overflow-hidden">
      <img
        src={heroImg}
        alt={hotel?.name || 'Hotel'}
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div className="absolute inset-0 bg-stone-950/60 z-0" />

      {/* Decorative subtle texture */}
      <div
        className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36">
        <div className="max-w-3xl space-y-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs tracking-wider uppercase font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            {badge}
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            {heading}
          </h2>

          <p className="text-base sm:text-lg text-stone-300 font-normal leading-relaxed max-w-2xl">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-stone-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              {highlight1}
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              {highlight2}
            </span>
            <span>{highlight3}</span>
          </div>
        </div>

        {/* Real-time Booking Search Bar */}
        <div className="mt-12 bg-white text-stone-900 rounded-2xl shadow-2xl p-4 sm:p-6 border border-stone-200">
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Check-In */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                Check-in Date
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Check-Out */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                Check-out Date
              </label>
              <input
                type="date"
                required
                min={checkIn}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Adults */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                Adults (12+ yrs)
              </label>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-medium"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Adult' : 'Adults'}
                  </option>
                ))}
              </select>
            </div>

            {/* Children */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-amber-700" />
                Children (0-11 yrs)
              </label>
              <select
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-medium"
              >
                {[0, 1, 2, 3].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Child' : 'Children'}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer h-[42px]"
              >
                <span>Check Availability</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
