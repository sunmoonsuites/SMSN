import React from 'react';
import { Hotel, LandmarkItem } from '../../types';
import { DEFAULT_LANDMARKS_LIST } from '../../services/hotelService';
import { MapPin, Navigation, Train, Building, Plane, Car, ShoppingBag } from 'lucide-react';

interface LocationSectionProps {
  hotel: Hotel | null;
}

const getLandmarkIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'hospital':
      return <Building className="w-4 h-4 text-amber-700" />;
    case 'metro':
    case 'train':
      return <Train className="w-4 h-4 text-amber-700" />;
    case 'mall':
    case 'shopping':
      return <ShoppingBag className="w-4 h-4 text-amber-700" />;
    case 'airport':
      return <Plane className="w-4 h-4 text-amber-700" />;
    case 'transit':
    case 'car':
      return <Car className="w-4 h-4 text-amber-700" />;
    default:
      return <Building className="w-4 h-4 text-amber-700" />;
  }
};

export const LocationSection: React.FC<LocationSectionProps> = ({ hotel }) => {
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
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            How to Reach Us
          </h3>
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
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-stone-900 text-lg">Hotel Address</h4>
                  <p className="text-sm text-stone-600 leading-relaxed mt-1">
                    {address}, {city}, {state} — {pincode}, India<br />
                    {plusCode && <span className="text-stone-500 font-mono text-xs">Plus Code: {plusCode}</span>}
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
                  <Navigation className="w-3.5 h-3.5" />
                  Open in Google Maps
                </a>
              </div>
            </div>

            {/* Distance Highlights */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-wider text-stone-700">
                Key Transit &amp; Landmarks
              </h4>
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
                        <p className="text-[11px] text-stone-500 mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                    <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded shrink-0">
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Map Frame */}
          <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-stone-200 shadow-sm h-96 sm:h-[450px] relative bg-stone-100">
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
          </div>
        </div>
      </div>
    </section>
  );
};
