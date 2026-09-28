import React, { useEffect, useState } from 'react';
import { Hotel, GalleryItem } from '../../types';
import {
  getGalleryItems,
  addGalleryItem,
  deleteGalleryItem,
} from '../../services/galleryService';
import { uploadImageToSupabase } from '../../services/storageService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
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
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFile(true);
    setUploadError('');

    const res = await uploadImageToSupabase(file, 'gallery');
    setIsUploadingFile(false);

    if (res.success && res.publicUrl) {
      setImageUrl(res.publicUrl);
      if (!caption.trim()) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
        setCaption(cleanName);
      }
    } else {
      setUploadError(res.error || 'Failed to upload image to Supabase Storage.');
    }
    e.target.value = '';
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
      setUploadError('');
      loadGallery();
    }
  };

  const categories = ['Rooms', 'Banquet Hall', 'Hotel & Lobby', 'Dining', 'Exterior & Facade'];

  const filtered = images.filter((img) => {
    if (categoryFilter !== 'ALL' && img.category !== categoryFilter) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner message="Fetching gallery photographs from Supabase..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Property Photo Gallery (Supabase Storage)
          </h3>
          <p className="text-xs text-stone-500">
            Upload photos directly to your Supabase <code>hotel-media</code> bucket and display them live on the website
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setUploadError('');
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Upload / Add Photo</span>
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
                  referrerPolicy="no-referrer"
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
                  title="Delete Photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / UPLOAD PHOTO MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Upload Hotel Photo to Supabase"
        subtitle="Upload directly from your device to Supabase Storage (hotel-media) or paste a public URL"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {/* Direct Device-to-Supabase Upload Box */}
          <div className="p-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/40 text-center space-y-2">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>
                {isUploadingFile ? 'Uploading to Supabase Storage...' : 'Choose Photo from Computer / Mobile'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploadingFile}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-stone-500">
              Uploads directly to Supabase Storage bucket <code>hotel-media/gallery/</code> (JPG, PNG, WebP)
            </p>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {imageUrl && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Image Ready for Website Display</span>
              </div>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
                <img
                  src={imageUrl}
                  alt="Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

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
              Supabase Storage Public URL (or Image Link) *
            </label>
            <input
              type="url"
              required
              placeholder="https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/..."
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
              disabled={isSubmitting || isUploadingFile || !imageUrl.trim()}
              className="px-5 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Save to Website Gallery'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
