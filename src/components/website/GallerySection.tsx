import React, { useEffect, useState } from 'react';
import { Hotel, GalleryItem } from '../../types';
import { getGalleryItems, getStoredGallery } from '../../services/galleryService';
import { getSupabaseFallbackForMirroredMedia } from '../../services/mediaFallbackMap';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface GallerySectionProps {
  hotel: Hotel | null;
}

function buildGalleryImageAlt(item: GalleryItem, index: number, hotelName: string): string {
  const cleanCaption = item.caption?.trim();
  const cleanCategory = item.category?.trim() || 'Hotel Room';
  if (cleanCaption) {
    const lower = cleanCaption.toLowerCase();
    if (lower.includes('sector 117') || lower.includes('sun moon')) {
      return cleanCaption;
    }
    return `${cleanCaption} at ${hotelName} in Sector 117 Noida`;
  }
  return `${cleanCategory} interior view ${index + 1} at ${hotelName} hotel in Sector 117 Noida`;
}

function getGalleryFallbackImage(category?: string, idx: number = 0): string {
  const norm = (category || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (norm.includes('super-deluxe')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766473773-t4m2-dsc06758-59-60-copy-2.jpg';
  }
  if (norm.includes('deluxe')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766507446-eq1w-dsc06971-2-3-copy-2.jpg';
  }
  if (norm.includes('standard')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766506349-btxh-dsc06965-6-7-copy-2.jpg';
  }
  if (norm.includes('suite')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602889189-room.jpeg';
  }
  if (norm.includes('banquet')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766452744-r8ge-dsc06674-5-6-copy.jpg';
  }
  if (norm.includes('lobby') || norm.includes('hotel') || norm.includes('reception')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602862099-reception.jpeg';
  }
  if (norm.includes('exterior') || norm.includes('facade') || norm.includes('entrance')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602879979-main-gate.jpeg';
  }

  const rotation = [
    'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766507446-eq1w-dsc06971-2-3-copy-2.jpg',
    'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602862099-reception.jpeg',
    'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602889189-room.jpeg',
    'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766452744-r8ge-dsc06674-5-6-copy.jpg',
    'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766473773-t4m2-dsc06758-59-60-copy-2.jpg',
    'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766506349-btxh-dsc06965-6-7-copy-2.jpg',
  ];
  return rotation[idx % rotation.length];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ hotel }) => {
  const [items, setItems] = useState<GalleryItem[]>(() =>
    getStoredGallery().filter((i) => !i.image_url?.includes('unsplash.com'))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (hotel?.id) {
      loadGallery();
    }
    const handleRefresh = () => {
      if (hotel?.id) loadGallery();
    };
    window.addEventListener('hotel_data_updated', handleRefresh);
    return () => window.removeEventListener('hotel_data_updated', handleRefresh);
  }, [hotel?.id]);

  const loadGallery = async () => {
    if (!hotel?.id) return;
    const data = await getGalleryItems(hotel.id);
    if (data && data.length > 0) {
      setItems(data.filter((i) => !i.image_url?.includes('unsplash.com')));
    }
    setIsLoading(false);
  };

  const roomSubCategories = new Set([
    'Rooms',
    'Standard Room',
    'Deluxe Room',
    'Super Deluxe Room',
    'Suite Room',
  ]);

  const orderedCategories = [
    'All',
    'Standard Room',
    'Deluxe Room',
    'Super Deluxe Room',
    'Suite Room',
    'Rooms',
    'Banquet Hall',
    'Hotel & Lobby',
    'Dining',
    'Exterior & Facade',
  ];

  const existingCategories = new Set(items.map((i) => i.category));
  const hasAnyRoomPhoto = items.some((i) => roomSubCategories.has(i.category));

  const categories = [
    ...orderedCategories.filter((cat) => {
      if (cat === 'All') return true;
      if (cat === 'Rooms') return hasAnyRoomPhoto && existingCategories.has('Rooms');
      return existingCategories.has(cat);
    }),
    ...Array.from(existingCategories).filter((c) => !orderedCategories.includes(c)),
  ];

  const filtered =
    selectedCategory === 'All'
      ? items
      : selectedCategory === 'Rooms'
      ? items.filter((i) => roomSubCategories.has(i.category))
      : items.filter((i) => i.category === selectedCategory);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % filtered.length : null
        );
      }
      if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + filtered.length) % filtered.length : null
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filtered.length]);

  return (
    <section id="gallery" className="py-20 bg-stone-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Visual Tour
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Hotel Photo Gallery
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            Take a look inside our rooms, ground floor reception, dining areas, and guest spaces in Sector 117 Noida.
          </p>
        </div>

        {/* Category Tabs */}
        {categories.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-800 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-stone-200 rounded-xl h-48" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Gallery Images Coming Soon"
            message="No photos have been uploaded to the database yet. Hotel administrators can upload room and property photos in the Staff PMS Portal."
            icon={<ImageIcon className="w-6 h-6 text-stone-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setLightboxIndex(idx)}
                className="group relative rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs aspect-[3/2] cursor-pointer"
                title="Click to view full HD photo"
              >
                <img
                  src={item.image_url}
                  alt={buildGalleryImageAlt(item, idx, hotel?.name || 'Sun Moon Suites')}
                  width={1280}
                  height={853}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const directFallback = getSupabaseFallbackForMirroredMedia(item.image_url);
                    const fallback = directFallback || getGalleryFallbackImage(item.category, idx);
                    if (!target.src.endsWith(fallback)) {
                      target.src = fallback;
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end justify-between p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-xs font-medium truncate pr-2">{item.caption || item.category}</p>
                  <span className="p-1 rounded-md bg-stone-900/70 text-white shrink-0">
                    <Maximize2 className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full-Screen HD Lightbox Modal */}
        {lightboxIndex !== null && filtered[lightboxIndex] && (
          <div
            className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Bar */}
            <div
              className="w-full max-w-5xl flex items-center justify-between text-white pb-3 border-b border-stone-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                  {filtered[lightboxIndex].category} • {lightboxIndex + 1} of {filtered.length}
                </span>
                <h3 className="text-sm sm:text-base font-serif font-bold text-stone-100 truncate max-w-xl">
                  {filtered[lightboxIndex].caption || `${hotel?.name || 'Sun Moon Suites'} Gallery Photo`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white cursor-pointer transition-colors"
                aria-label="Close photo view"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Full HD Image */}
            <div
              className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filtered[lightboxIndex].image_url}
                alt={filtered[lightboxIndex].caption || 'Hotel photo'}
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                onError={(e) => {
                  const target = e.currentTarget;
                  const directFallback = getSupabaseFallbackForMirroredMedia(filtered[lightboxIndex].image_url);
                  if (directFallback && target.src !== directFallback) {
                    target.src = directFallback;
                  }
                }}
              />

              {filtered.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) =>
                        prev !== null ? (prev - 1 + filtered.length) % filtered.length : 0
                      );
                    }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-900/80 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-lg"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex((prev) =>
                        prev !== null ? (prev + 1) % filtered.length : 0
                      );
                    }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-stone-900/80 hover:bg-amber-700 text-white cursor-pointer transition-colors shadow-lg"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div
              className="w-full max-w-2xl text-center text-stone-300 text-xs px-4 py-2 bg-stone-900/60 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <span>{filtered[lightboxIndex].caption || 'Sun Moon Suites, Sector 117, Noida'}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
