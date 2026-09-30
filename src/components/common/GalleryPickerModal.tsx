import React, { useEffect, useState } from 'react';
import { GalleryItem } from '../../types';
import { getGalleryItems } from '../../services/galleryService';
import { Modal } from './Modal';
import { CheckCircle2, Image as ImageIcon, Search } from 'lucide-react';

interface GalleryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  currentImageUrl?: string;
  defaultCategory?: string;
  onSelect: (imageUrl: string, item: GalleryItem) => void;
  title?: string;
}

const CATEGORIES = [
  'ALL',
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

const ROOM_SUB_CATEGORIES = new Set([
  'Rooms',
  'Standard Room',
  'Deluxe Room',
  'Super Deluxe Room',
  'Suite Room',
]);

export const GalleryPickerModal: React.FC<GalleryPickerModalProps> = ({
  isOpen,
  onClose,
  hotelId,
  currentImageUrl,
  defaultCategory = 'ALL',
  onSelect,
  title = 'Choose Photo from Website Gallery',
}) => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>(defaultCategory);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && hotelId) {
      setCategoryFilter(defaultCategory);
      loadGallery();
    }
  }, [isOpen, hotelId, defaultCategory]);

  const loadGallery = async () => {
    setIsLoading(true);
    const data = await getGalleryItems(hotelId);
    setImages(data);
    setIsLoading(false);
  };

  const filteredImages = images.filter((img) => {
    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'Rooms') {
        if (!ROOM_SUB_CATEGORIES.has(img.category)) return false;
      } else if (img.category !== categoryFilter) {
        return false;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCaption = (img.caption || '').toLowerCase().includes(q);
      const matchCat = (img.category || '').toLowerCase().includes(q);
      if (!matchCaption && !matchCat) return false;
    }
    return true;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle="Click any photo below from your Gallery to select it immediately"
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Category Filter + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-amber-800 text-white'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {cat === 'ALL' ? `All Photos (${images.length})` : cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gallery caption..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-stone-300 rounded-lg"
            />
          </div>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-stone-500">
            Loading photos from Website Gallery...
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="py-10 text-center bg-stone-50 rounded-xl border border-stone-200 p-6 space-y-2">
            <ImageIcon className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs font-bold text-stone-700">
              No photos found in this Gallery category.
            </p>
            <p className="text-[11px] text-stone-500">
              Switch to &ldquo;All Photos&rdquo; above or upload new photos in the{' '}
              <strong>Website Gallery</strong> tab first.
            </p>
            {categoryFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('ALL')}
                className="mt-1 px-3 py-1.5 bg-amber-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Show All Gallery Photos ({images.length})
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto p-1">
            {filteredImages.map((img) => {
              const isSelected = currentImageUrl === img.image_url;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    onSelect(img.image_url, img);
                    onClose();
                  }}
                  className={`group relative text-left rounded-xl overflow-hidden border-2 transition-all cursor-pointer bg-white ${
                    isSelected
                      ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md'
                      : 'border-stone-200 hover:border-amber-600 hover:shadow-sm'
                  }`}
                >
                  <div className="relative aspect-video bg-stone-100 overflow-hidden">
                    <img
                      src={img.image_url}
                      alt={img.caption || img.category}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded">
                      {img.category}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center gap-1 shadow">
                        <CheckCircle2 className="w-3 h-3" />
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between gap-1">
                    <span className="text-[11px] font-semibold text-stone-800 truncate">
                      {img.caption || img.category}
                    </span>
                    <span className="text-[10px] font-bold text-amber-800 shrink-0 group-hover:underline">
                      {isSelected ? 'Active' : 'Select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-[11px] text-stone-500">
          <span>
            Tip: To upload new images from your computer/mobile, go to the{' '}
            <strong>Website Gallery</strong> section.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
