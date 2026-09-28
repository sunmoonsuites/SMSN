import React, { useEffect, useState } from 'react';
import { Hotel, GalleryItem } from '../../types';
import {
  getGalleryItems,
  addGalleryItem,
  deleteGalleryItem,
} from '../../services/galleryService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Plus,
  Trash2,
} from 'lucide-react';

interface GalleryManagementViewProps {
  hotel: Hotel | null;
}

export const GalleryManagementView: React.FC<GalleryManagementViewProps> = ({ hotel }) => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Add Image Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('Rooms');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadGallery();
    }
  }, [hotel?.id]);

  const loadGallery = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getGalleryItems(hotel.id);
    setImages(data);
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!hotel?.id) return;
    const res = await deleteGalleryItem(id, hotel.id);
    if (res.success) {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !imageUrl.trim()) return;
    setIsSubmitting(true);

    const res = await addGalleryItem({
      hotel_id: hotel.id,
      caption: caption.trim() || undefined,
      image_url: imageUrl.trim(),
      category,
      sort_order: images.length + 1,
      is_featured: false,
    });

    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setCaption('');
      setImageUrl('');
      loadGallery();
    }
  };

  const categories = ['Rooms', 'Banquet Hall', 'Lobby & Reception', 'Exterior & Facade'];

  const filtered = images.filter((img) => {
    if (categoryFilter !== 'ALL' && img.category !== categoryFilter) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner message="Fetching gallery photographs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Property Photo Gallery
          </h3>
          <p className="text-xs text-stone-500">
            Visual showcase of rooms, lobby, dining, and banquets on the public website
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Photo</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            categoryFilter === 'ALL'
              ? 'bg-amber-800 text-white'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          All Photos ({images.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-amber-800 text-white'
                : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Photos Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Photos Found"
          message={
            images.length === 0
              ? 'No photos currently in the gallery database.'
              : 'No photos match the selected category.'
          }
          actionLabel={images.length === 0 ? 'Upload First Photo' : undefined}
          onAction={images.length === 0 ? () => setShowAddModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img) => (
            <div
              key={img.id}
              className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs group space-y-2 p-2"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-stone-100">
                <img
                  src={img.image_url}
                  alt={img.caption || 'Hotel photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-bold rounded">
                  {img.category}
                </span>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-xs text-stone-900 truncate">
                  {img.caption || img.category}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD PHOTO MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Gallery Photograph"
        subtitle="Add high-resolution image URL for property showcase"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Photo Caption
            </label>
            <input
              type="text"
              placeholder="e.g. Deluxe Room City View, Grand Banquet Hall"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Image URL *
            </label>
            <input
              type="url"
              required
              placeholder="https://images.unsplash.com/..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {isSubmitting ? 'Adding...' : 'Add Photograph'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
