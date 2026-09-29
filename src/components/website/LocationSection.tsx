import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Hotel, LandmarkItem } from '../../types';
import { DEFAULT_LANDMARKS_LIST } from '../../services/hotelService';
import { MapPin, Navigation, Train, Building, Plane, Car, ShoppingBag } from 'lucide-react';

interface LocationSectionProps {
  hotel: Hotel | null;
}

const getLandmarkIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'hospital':
      return <Building className="w-4 h-4 text-amber-700" aria-hidden="true" />;
    case 'metro':
    case 'train':
      return <Train className="w-4 h-4 text-amber-700" aria-hidden="true" />;
    case 'mall':
    case 'shopping':
      return <ShoppingBag className="w-4 h-4 text-amber-700" aria-hidden="true" />;
    case 'airport':
      return <Plane className="w-4 h-4 text-amber-700" aria-hidden="true" />;
    case 'transit':
    case 'car':
      return <Car className="w-4 h-4 text-amber-700" aria-hidden="true" />;
    default:
      return <Building className="w-4 h-4 text-amber-700" aria-hidden="true" />;
  }
};

export const LocationSection: React.FC<LocationSectionProps> = ({ hotel }) => {
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const address = hotel?.address || 'GT-20, Sector 117';
  const city = hotel?.city || 'Noida';
  const state = hotel?.state || 'Uttar Pradesh';
  const pincode = hotel?.pincode || '201316';
  const plusCode = hotel?.plus_code || 'H9FW+8F';
  const hotelName = hotel?.name || 'Sun Moon Suites';

  const mapsUrl =
    hotel?.google_maps_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${hotelName} ${address} ${city} ${state} ${pincode}`
    )}`;

  const connectivity: LandmarkItem[] =
    hotel?.landmarks_list && hotel.landmarks_list.length > 0
      ? hotel.landmarks_list
      : DEFAULT_LANDMARKS_LIST;

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(
    `${hotelName} ${address} ${city} ${state} ${pincode}`
  )}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <section id="location" className="py-20 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Prime {city} Location
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            How to Reach Us
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Situated in {address}, {city}, offering peaceful surroundings while staying minutes from key transit routes, healthcare, and commercial centers.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Address & Connectivity Card */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-amber-100 rounded-lg text-amber-800 shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-lg">Hotel Address</h3>
                  <p className="text-sm text-stone-600 leading-relaxed mt-1">
                    {address}, {city}, {state} — {pincode}, India<br />
                    {plusCode && <span className="text-stone-600 font-mono text-xs">Plus Code: {plusCode}</span>}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-amber-800 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                  Open in Google Maps
                </a>
              </div>
            </div>

            {/* Distance Highlights */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-stone-700">
                Key Transit &amp; Landmarks
              </h3>
              <div className="space-y-2">
                {connectivity.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-50/75 rounded-xl border border-stone-200/80 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{getLandmarkIcon(item.iconType)}</div>
                      <div>
                        <span className="font-semibold text-stone-900">{item.title}</span>
                        <p className="text-[11px] text-stone-600 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <span className="font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deferred Map Frame (Eliminates 600KB third-party JS blocking during initial mobile load) */}
          <div
            ref={mapContainerRef}
            className="lg:col-span-7 rounded-2xl overflow-hidden border border-stone-200 shadow-sm h-96 sm:h-[450px] relative bg-stone-100 flex items-center justify-center"
          >
            {shouldLoadMap ? (
              <iframe
                title={`Hotel Location Map ${city}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={embedUrl}
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <MapPin className="w-8 h-8 text-amber-800 mx-auto" aria-hidden="true" />
                <p className="font-serif font-bold text-stone-900 text-base">
                  {hotelName} — {address}, {city}
                </p>
                <button
                  type="button"
                  onClick={() => setShouldLoadMap(true)}
                  className="px-4 py-2 bg-amber-800 text-white text-xs font-semibold rounded-lg"
                >
                  Load Interactive Map
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Local SEO Neighbourhood & Proximity Coverage Block (Visually Hidden, Present in DOM for SEO) */}
        <div className="sr-only">
          <h3 className="font-serif font-bold text-sm text-stone-900">
            Preferred Boutique Hotel Near Central Noida Sectors, Hospitals &amp; Wedding Venues
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Conveniently located at <strong>{address}, {city} ({pincode})</strong>, <strong>{hotelName}</strong> is a preferred boutique stay for guests searching for a{' '}
            <Link to="/hotel-in-sector-117-noida" className="text-amber-900 underline hover:text-amber-700 font-semibold">
              hotel in Sector 117 Noida
            </Link>
            , accommodation near{' '}
            <Link to="/hotel-near-medanta-hospital-noida" className="text-amber-900 underline hover:text-amber-700 font-semibold">
              Medanta Hospital Noida
            </Link>
            , wedding guest rooms near{' '}
            <Link to="/hotel-near-tivoli-lotus-court-noida" className="text-amber-900 underline hover:text-amber-700 font-semibold">
              Tivoli Lotus Court Banquet Sector 117
            </Link>
            , and rooms near{' '}
            <Link to="/hotel-near-sector-76-metro-noida" className="text-amber-900 underline hover:text-amber-700 font-semibold">
              Sector 76 Metro Station &amp; Spectrum Metro Mall Sector 75
            </Link>
            . We welcome families, patient attendants, wedding guests, and corporate travelers visiting{' '}
            <strong>
              Sector 117, Sector 116, Sector 115, Sector 118, Sector 119, Sector 120, Sector 121, Sector 122,
              Sector 74, Sector 75, Sector 76, Sector 77, Sector 78, Sector 50, and Sector 51 in Noida
            </strong>.
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            <Link
              to="/hotel-in-sector-117-noida"
              className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 rounded-lg text-stone-800 font-medium transition-colors"
            >
              Sector 117 Noida Hotel Guide
            </Link>
            <Link
              to="/hotel-near-medanta-hospital-noida"
              className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 rounded-lg text-stone-800 font-medium transition-colors"
            >
              Stay Near Medanta Hospital Noida
            </Link>
            <Link
              to="/hotel-near-tivoli-lotus-court-noida"
              className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 rounded-lg text-stone-800 font-medium transition-colors"
            >
              Rooms Near Tivoli Lotus Court
            </Link>
            <Link
              to="/hotel-near-sector-76-metro-noida"
              className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-stone-200 rounded-lg text-stone-800 font-medium transition-colors"
            >
              Hotel Near Sector 76 Metro &amp; Spectrum Mall
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
