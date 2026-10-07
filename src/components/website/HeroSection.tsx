import React, { useState } from 'react';
import { Hotel } from '../../types';
import { Calendar, Users, ArrowRight, Shield, Award, MapPin } from 'lucide-react';
import { getTodayLocalDateStr, getNextDayLocalDateStr } from '../../lib/utils';

interface HeroSectionProps {
  hotel: Hotel | null;
  onSearchAvailability: (search: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) => void;
}

const SUN_MOON_FACADE_HERO =
  '/assets/mirrored/exterior---facade-sun-moon-suites-front-facade---muxpinlk.webp';
const SUN_MOON_FACADE_FALLBACK =
  'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602879979-main-gate.jpeg';

function isBuiltInHeroImage(url?: string): boolean {
  if (!url || url.trim() === '') return true;
  if (url.includes('1790602862099-reception.jpeg')) return true;
  if (url.includes('hero_hotel_image')) return true;
  if (url.includes('hero-hero-banner-image')) return true;
  return false;
}

function optimizeHeroImageUrl(url?: string): string {
  if (isBuiltInHeroImage(url)) return SUN_MOON_FACADE_HERO;
  if (url!.includes('images.unsplash.com') && !url!.includes('w=')) {
    return `${url}${url!.includes('?') ? '&' : '?'}auto=format&fit=crop&w=1200&q=80`;
  }
  return url!;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  hotel,
  onSearchAvailability,
}) => {
  const initialCheckIn = getTodayLocalDateStr();
  const initialCheckOut = getNextDayLocalDateStr(initialCheckIn);

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    if (!checkOut || checkOut <= newCheckIn) {
      setCheckOut(getNextDayLocalDateStr(newCheckIn));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchAvailability({ checkIn, checkOut, adults, children });
  };

  const customUrl = hotel?.hero_config?.image_url?.trim();
  const useLocalWebp = isBuiltInHeroImage(customUrl);
  const heroImg = optimizeHeroImageUrl(customUrl);

  const badge =
    hotel?.hero_config?.badge ||
    `${hotel?.city || 'Sector 117, Noida'} • ${hotel?.total_rooms || 30} Boutique Rooms`;
  const heading =
    hotel?.hero_config?.heading || 'Sun Moon Suites – Hotel in Sector 117 Noida';
  const description =
    hotel?.hero_config?.description ||
    hotel?.description ||
    'Experience attentive hospitality at our 30-room hotel in Sector 117, Noida. Featuring well-appointed rooms across three floors, dedicated dining, and premier connectivity to the Noida Expressway.';
  const highlight1 = hotel?.hero_config?.highlight1 || '100% Verified Reservations';
  const highlight2 = hotel?.hero_config?.highlight2 || 'Best Direct Tariff Guaranteed';
  const highlight3 = hotel?.hero_config?.highlight3 || 'Zero Booking Fees';

  return (
    <section
      id="hero"
      aria-label="Hotel Overview and Room Search"
      className="relative bg-stone-900 text-white overflow-hidden"
    >
      <img
        src={useLocalWebp ? '/assets/hero-hotel-mobile.webp' : heroImg}
        srcSet={
          useLocalWebp
            ? '/assets/hero-hotel-mobile.webp 720w, /assets/hero-hotel.webp 1080w'
            : undefined
        }
        sizes="100vw"
        alt={`${hotel?.name || 'Sun Moon Suites'} hotel building facade and grand entrance in Sector 117 Noida`}
        width={1080}
        height={720}
        fetchPriority="high"
        decoding="sync"
        className="absolute inset-0 w-full h-full object-cover z-0"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src !== SUN_MOON_FACADE_FALLBACK) {
            target.removeAttribute('srcset');
            target.src = SUN_MOON_FACADE_FALLBACK;
          }
        }}
      />
      <div className="absolute inset-0 bg-stone-950/65 z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36">
        <div className="max-w-3xl space-y-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs tracking-wider uppercase font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            <span>{badge}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            {heading}
          </h1>

          <p className="text-base sm:text-lg text-stone-200 font-normal leading-relaxed max-w-2xl">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-stone-200 font-medium">
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-300" aria-hidden="true" />
              {highlight1}
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-300" aria-hidden="true" />
              {highlight2}
            </span>
            <span>{highlight3}</span>
          </div>
        </div>

        {/* Real-time Booking Search Bar */}
        <div
          role="search"
          aria-label="Search Hotel Room Availability"
          className="mt-12 bg-white text-stone-900 rounded-2xl shadow-2xl p-4 sm:p-6 border border-stone-200"
        >
          <form
            action="/"
            method="get"
            onSubmit={handleSearch}
            aria-label="Room Availability Search Form"
            data-agent-action="search-hotel-availability"
            {...({
              toolname: 'search_hotel_availability',
              tooldescription:
                'Search real-time room availability and direct tariffs at Sun Moon Suites in Sector 117, Noida by check-in date, check-out date, adults, and children.',
            } as any)}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end"
          >
            {/* Check-In */}
            <div>
              <label
                htmlFor="hero-checkin-date"
                className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                Check-in Date
              </label>
              <input
                id="hero-checkin-date"
                name="checkIn"
                type="date"
                required
                aria-label="Check-in Date"
                {...({
                  toolparamdescription: 'Check-in date in YYYY-MM-DD format for hotel stay',
                } as any)}
                min={getTodayLocalDateStr()}
                value={checkIn}
                onChange={(e) => handleCheckInChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Check-Out */}
            <div>
              <label
                htmlFor="hero-checkout-date"
                className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                Check-out Date
              </label>
              <input
                id="hero-checkout-date"
                name="checkOut"
                type="date"
                required
                aria-label="Check-out Date"
                {...({
                  toolparamdescription: 'Check-out date in YYYY-MM-DD format for hotel stay',
                } as any)}
                min={getNextDayLocalDateStr(checkIn)}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Adults */}
            <div>
              <label
                htmlFor="hero-adults-select"
                className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                Adults (12+ yrs)
              </label>
              <select
                id="hero-adults-select"
                name="adults"
                aria-label="Number of Adults"
                {...({
                  toolparamdescription: 'Number of adult guests aged 12 years and above (1 to 6)',
                } as any)}
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
              <label
                htmlFor="hero-children-select"
                className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />
                Children (0-11 yrs)
              </label>
              <select
                id="hero-children-select"
                name="children"
                aria-label="Number of Children"
                {...({
                  toolparamdescription: 'Number of child guests aged 0 to 11 years (0 to 3)',
                } as any)}
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
                aria-label="Check Room Availability"
                className="w-full py-3 px-4 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer h-[42px]"
              >
                <span>Check Availability</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
