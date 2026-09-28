import React from 'react';
import { Hotel } from '../../types';
import { Phone, Mail, MapPin } from 'lucide-react';
import { getCleanHotelPhone } from '../../lib/utils';

interface FooterProps {
  hotel: Hotel | null;
  onOpenPolicy: (type: 'cancellation' | 'terms' | 'privacy' | 'faq') => void;
  onNavigateSection: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  hotel,
  onOpenPolicy,
  onNavigateSection,
}) => {
  const hotelName = hotel?.name || 'Sun Moon Suites';
  const phone = getCleanHotelPhone(hotel?.phone);
  const email = hotel?.email || 'reservations@sunmoonsuites.com';
  const address = hotel?.address || 'Plot No. 12, Sector 117';
  const city = hotel?.city || 'Noida';
  const state = hotel?.state || 'Uttar Pradesh';
  const pincode = hotel?.pincode || '201301';

  // Schema.org JSON-LD structured data for Google SEO
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: hotelName,
    description:
      hotel?.description ||
      'Boutique hotel with 30 rooms across 3 floors in Sector 117, Noida, Uttar Pradesh.',
    address: {
      '@type': 'PostalAddress',
      streetAddress: address,
      addressLocality: city,
      addressRegion: state,
      postalCode: pincode,
      addressCountry: 'IN',
    },
    telephone: phone,
    email: email,
    numberOfRooms: 30,
    checkinTime: hotel?.check_in_time || '14:00',
    checkoutTime: hotel?.check_out_time || '11:00',
    priceRange: '₹₹',
    currenciesAccepted: 'INR',
    paymentAccepted: 'Cash, Credit Card, UPI',
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Free Wi-Fi', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Banquet Hall', value: true },
      { '@type': 'LocationFeatureSpecification', name: '100% Power Backup', value: true },
      { '@type': 'LocationFeatureSpecification', name: 'Free Parking', value: true },
    ],
  };

  return (
    <footer className="bg-stone-950 text-stone-300 pt-16 pb-24 sm:pb-12 border-t border-stone-800">
      {/* JSON-LD Script for search engines */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand & Introduction */}
          <div className="space-y-4">
            <h4 className="font-serif text-2xl font-bold text-white tracking-tight">
              {hotelName}
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              {hotel?.description ||
                `A ${hotel?.total_rooms || 30}-room boutique hotel in ${city}. Offering refined accommodation across three floors with attentive hospitality, in-house dining, and seamless connectivity.`}
            </p>
            {hotel?.gstin && (
              <p className="text-[11px] text-stone-500 font-mono">
                GSTIN: {hotel.gstin}
              </p>
            )}

            {/* Social Links */}
            {hotel?.social_links && (
              <div className="flex items-center gap-3 pt-2 text-stone-400">
                {hotel.social_links.instagram && (
                  <a
                    href={hotel.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 text-xs font-medium"
                  >
                    Instagram
                  </a>
                )}
                {hotel.social_links.facebook && (
                  <a
                    href={hotel.social_links.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 text-xs font-medium"
                  >
                    Facebook
                  </a>
                )}
                {hotel.social_links.google_business && (
                  <a
                    href={hotel.social_links.google_business}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-amber-400 text-xs font-medium"
                  >
                    Google
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Navigation
            </h5>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection('rooms')}
                  className="hover:text-white transition-colors"
                >
                  Rooms &amp; Suites (30 Rooms)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection('banquet')}
                  className="hover:text-white transition-colors"
                >
                  Ground Floor Banquet Hall
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection('amenities')}
                  className="hover:text-white transition-colors"
                >
                  Hotel Amenities
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection('location')}
                  className="hover:text-white transition-colors"
                >
                  Location &amp; Directions
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigateSection('contact')}
                  className="hover:text-white transition-colors"
                >
                  Contact &amp; Enquiries
                </button>
              </li>
            </ul>
          </div>

          {/* Hotel Policies */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Hotel Information
            </h5>
            <ul className="space-y-2 text-xs text-stone-300">
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy('cancellation')}
                  className="hover:text-white transition-colors"
                >
                  Cancellation &amp; Refunds
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy('terms')}
                  className="hover:text-white transition-colors"
                >
                  Terms &amp; Guest Policies
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy('privacy')}
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenPolicy('faq')}
                  className="hover:text-white transition-colors"
                >
                  Frequently Asked Questions (FAQ)
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Reservations Desk
            </h5>
            <div className="space-y-2.5 text-xs text-stone-300">
              <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-white">
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>{phone}</span>
              </a>
              <a href={`mailto:${email}`} className="flex items-center gap-2 hover:text-white">
                <Mail className="w-3.5 h-3.5 text-amber-400" />
                <span>{email}</span>
              </a>
              <div className="flex items-start gap-2 text-stone-400">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{address}, {city}, {state} {pincode}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
          <p>&copy; {new Date().getFullYear()} {hotelName}. All rights reserved. {city}, {state}.</p>
          <p>{hotel?.total_rooms || 30}-Room Boutique Hotel &amp; Suites</p>
        </div>
      </div>
    </footer>
  );
};
