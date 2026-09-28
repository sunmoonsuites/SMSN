import React, { useEffect, useState } from 'react';
import { Hotel, GalleryItem } from '../../types';
import { getGalleryItems, DEFAULT_GALLERY_ITEMS } from '../../services/galleryService';
import { Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface GallerySectionProps {
  hotel: Hotel | null;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ hotel }) => {
  const [items, setItems] = useState<GalleryItem[]>(DEFAULT_GALLERY_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    if (hotel?.id) {
      loadGallery();
    }
  }, [hotel?.id]);

  const loadGallery = async () => {
    if (!hotel?.id) return;
    const data = await getGalleryItems(hotel.id);
    if (data && data.length > 0) {
      setItems(data);
    }
    setIsLoading(false);
  };

  const categories = ['All', ...Array.from(new Set(items.map((i) => i.category)))];
  const filtered = selectedCategory === 'All' ? items : items.filter((i) => i.category === selectedCategory);

  return (
    <section id="gallery" className="py-20 bg-stone-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Visual Tour
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Hotel Photo Gallery
          </h3>
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
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs aspect-4/3"
              >
                <img
                  src={item.image_url}
                  alt={item.caption || item.category}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
