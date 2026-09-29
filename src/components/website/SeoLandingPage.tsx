import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Hotel } from '../../types';
import { SeoPageConfig, BASE_SITE_URL, DEDICATED_LANDING_PAGES } from '../../lib/seoConfig';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';
import {
  MapPin,
  CheckCircle2,
  Phone,
  MessageCircle,
  Navigation,
  ArrowRight,
  ChevronRight,
  HelpCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { FeaturedRooms } from './FeaturedRooms';

interface SeoLandingPageProps {
  config: SeoPageConfig;
  hotel: Hotel | null;
  onOpenBooking: () => void;
  onSelectCategoryForBooking: (categoryId: string) => void;
  onNavigateSection: (sectionId: string) => void;
}

export const SeoLandingPage: React.FC<SeoLandingPageProps> = ({
  config,
  hotel,
  onOpenBooking,
  onSelectCategoryForBooking,
  onNavigateSection,
}) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [config.path]);

  const hotelName = hotel?.name || 'Sun Moon Suites';
  const phone = getCleanHotelPhone(hotel?.phone);
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);
  const address = hotel?.address || 'GT-20, Sector 117';
  const city = hotel?.city || 'Noida';
  const state = hotel?.state || 'Uttar Pradesh';
  const pincode = hotel?.pincode || '201316';

  const mapsUrl =
    hotel?.google_maps_url ||
    'https://www.google.com/maps/search/?api=1&query=Sun+Moon+Suites+GT-20+Sector+117+Noida+Uttar+Pradesh+201316';

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotelName}, I am looking for room availability (${config.primaryKeyword}).`
  )}`;

  const pageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Sun Moon Suites Home',
            item: `${BASE_SITE_URL}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: config.primaryKeyword,
            item: config.canonical,
          },
        ],
      },
      ...(config.faqs.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: config.faqs.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: faq.answer,
                },
              })),
            },
          ]
        : []),
    ],
  };

  const otherPages = Object.values(DEDICATED_LANDING_PAGES).filter((p) => p.path !== config.path);

  return (
    <div className="bg-stone-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }}
      />

      {/* Breadcrumb Navigation Bar */}
      <nav
        aria-label="Breadcrumb"
        className="bg-stone-100 border-b border-stone-200 py-2.5 px-4 sm:px-6 lg:px-8 text-xs text-stone-600"
      >
        <div className="max-w-7xl mx-auto flex items-center gap-1.5 flex-wrap">
          <Link to="/" className="hover:text-amber-800 font-medium transition-colors">
            Sun Moon Suites Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-stone-400" aria-hidden="true" />
          <span className="text-stone-900 font-semibold">{config.primaryKeyword}</span>
        </div>
      </nav>

      {/* Hero Header */}
      <section className="relative bg-stone-900 text-white py-16 sm:py-24 overflow-hidden">
        <img
          src="/assets/hero-hotel-mobile.webp"
          srcSet="/assets/hero-hotel-mobile.webp 720w, /assets/hero-hotel.webp 1080w"
          sizes="100vw"
          alt={`${hotelName} boutique hotel interior in Sector 117 Noida — ${config.primaryKeyword}`}
          width={1080}
          height={720}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-stone-950/70" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs tracking-wider uppercase font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
            <span>{config.badge}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            {config.h1}
          </h1>

          <p className="text-base sm:text-lg text-stone-200 leading-relaxed max-w-3xl">
            {config.intro}
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {config.highlights.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-xs sm:text-sm text-stone-100 bg-white/5 border border-white/10 rounded-xl p-3"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          {/* Conversion CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-4">
            <button
              type="button"
              onClick={onOpenBooking}
              className="px-6 py-3 bg-amber-700 hover:bg-amber-800 text-white text-xs uppercase tracking-widest font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span>Check Availability &amp; Book Your Stay</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>

            <a
              href={`tel:${phone.replace(/\s+/g, '')}`}
              className="px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Phone className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Call for Booking: {phone}</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
              <span>WhatsApp Desk</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <section className="py-16 bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {config.sections.map((sec, idx) => (
            <article key={idx} className="space-y-4">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                {sec.h2}
              </h2>
              {sec.h3 && (
                <h3 className="text-sm uppercase tracking-wider font-bold text-amber-800">
                  {sec.h3}
                </h3>
              )}
              <div className="space-y-3 text-sm sm:text-base text-stone-700 leading-relaxed">
                {sec.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>
              {sec.bullets && sec.bullets.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {sec.bullets.map((bullet, bIdx) => (
                    <li
                      key={bIdx}
                      className="flex items-start gap-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 text-xs sm:text-sm text-stone-700"
                    >
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}

          {/* Nearby Places & Distance Table */}
          <div className="p-6 sm:p-8 rounded-2xl bg-stone-50 border border-stone-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
                  Location &amp; Nearby Noida Landmarks
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  Starting from <strong>{hotelName}</strong> at {address}, {city}, {state} — {pincode}
                </p>
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-900 hover:bg-amber-800 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors self-start"
              >
                <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Get Directions</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.nearbyPlaces.map((place, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-xl border border-stone-200 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <h3 className="font-serif font-bold text-stone-900 text-sm">{place.name}</h3>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{place.purpose}</p>
                  </div>
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-semibold text-amber-900">
                    <span>{place.distance}</span>
                    <span className="inline-flex items-center gap-1 bg-amber-100/80 px-2 py-0.5 rounded">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {place.travelTime}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Room Categories for Instant Booking */}
      <FeaturedRooms hotel={hotel} onSelectCategoryForBooking={onSelectCategoryForBooking} />

      {/* FAQ Section */}
      {config.faqs.length > 0 && (
        <section className="py-16 bg-white border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
                Helpful Information
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {config.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-2"
                >
                  <h3 className="font-serif font-bold text-stone-900 text-base flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-1" aria-hidden="true" />
                    <span>{faq.question}</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-6">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Logical Internal Linking Hub */}
      <section className="py-14 bg-stone-100 border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">
                Explore More About {hotelName} Noida
              </h2>
              <p className="text-xs text-stone-600 mt-1">
                Quick links to rooms, amenities, directions, and nearby Noida travel guides.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/rooms"
                className="px-3.5 py-2 bg-white hover:bg-amber-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 transition-colors"
              >
                View Rooms
              </Link>
              <Link
                to="/amenities"
                className="px-3.5 py-2 bg-white hover:bg-amber-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 transition-colors"
              >
                Hotel Amenities
              </Link>
              <Link
                to="/location"
                className="px-3.5 py-2 bg-white hover:bg-amber-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-800 transition-colors"
              >
                Noida Location Map
              </Link>
              <Link
                to="/contact"
                onClick={() => onNavigateSection('contact')}
                className="px-3.5 py-2 bg-amber-700 hover:bg-amber-800 rounded-lg text-xs font-semibold text-white transition-colors"
              >
                Contact Sun Moon Suites
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {otherPages.map((page) => (
              <Link
                key={page.path}
                to={page.path}
                className="p-4 bg-white rounded-xl border border-stone-200 hover:border-amber-600 transition-all group flex flex-col justify-between space-y-2"
              >
                <div>
                  <h3 className="font-serif font-bold text-sm text-stone-900 group-hover:text-amber-800 transition-colors">
                    {page.primaryKeyword}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-2">{page.description}</p>
                </div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider inline-flex items-center gap-1 pt-1">
                  <span>Read Local Guide</span>
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
