import React, { useEffect, useState } from 'react';
import { Hotel, GalleryItem } from '../../types';
import { getGalleryItems, getStoredGallery } from '../../services/galleryService';
import { Image as ImageIcon } from 'lucide-react';
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
    return '/assets/mirrored/rooms-super-deluxe-room-muxpexke.webp';
  }
  if (norm.includes('deluxe')) {
    return '/assets/mirrored/rooms-deluxe-room-muxpexhe.webp';
  }
  if (norm.includes('standard')) {
    return '/assets/mirrored/rooms-standard-room-muxpex8w.webp';
  }
  if (norm.includes('suite')) {
    return '/assets/mirrored/rooms-suite-room-muxpexmf.webp';
  }
  if (norm.includes('banquet')) {
    return '/assets/mirrored/banquet-banquet-hall-muxpexo9.webp';
  }
  if (norm.includes('lobby') || norm.includes('hotel') || norm.includes('reception')) {
    return '/assets/mirrored/lobby-hotel-lobby-muxpexqc.webp';
  }
  if (norm.includes('exterior') || norm.includes('facade') || norm.includes('entrance')) {
    return '/assets/mirrored/exterior---facade-hotel-entrance-ramp-and-gate---muxpirso.webp';
  }

  const rotation = [
    '/assets/mirrored/rooms-deluxe-room-muxpexhe.webp',
    '/assets/mirrored/lobby-hotel-lobby-muxpexqc.webp',
    '/assets/mirrored/rooms-suite-room-muxpexmf.webp',
    '/assets/mirrored/banquet-banquet-hall-muxpexo9.webp',
    '/assets/mirrored/rooms-super-deluxe-room-muxpexke.webp',
    '/assets/mirrored/rooms-standard-room-muxpex8w.webp',
  ];
  return rotation[idx % rotation.length];
}

export const GallerySection: React.FC<GallerySectionProps> = ({ hotel }) => {
  const [items, setItems] = useState<GalleryItem[]>(() => getStoredGallery());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

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
      setItems(data);
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
                className="group relative rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs aspect-4/3"
              >
                <img
                  src={item.image_url}
                  alt={buildGalleryImageAlt(item, idx, hotel?.name || 'Sun Moon Suites')}
                  width={600}
                  height={450}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = getGalleryFallbackImage(item.category, idx);
                    if (!target.src.endsWith(fallback)) {
                      target.src = fallback;
                    }
                  }}
                />
                {item.caption && (
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent flex items-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium">{item.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
