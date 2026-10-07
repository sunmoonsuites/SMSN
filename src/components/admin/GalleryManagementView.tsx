import React, { useEffect, useState } from 'react';
import { Hotel, GalleryItem } from '../../types';
import {
  getGalleryItems,
  addGalleryItem,
  addMultipleGalleryItems,
  deleteGalleryItem,
  aiOptimizeAllGalleryCaptions,
  updateGalleryItemCaption,
  generateSmartSeoGalleryCaption,
  reorderGalleryItemsInCategory,
  normalizeRoomCategoryName,
} from '../../services/galleryService';
import { getSupabaseFallbackForMirroredMedia } from '../../services/mediaFallbackMap';
import { uploadMultipleImagesToSupabase } from '../../services/storageService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Plus,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle2,
  Images,
  X,
  Sparkles,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';

interface GalleryManagementViewProps {
  hotel: Hotel | null;
}

interface PendingGalleryUpload {
  id: string;
  image_url: string;
  caption: string;
  category: string;
}

export const GalleryManagementView: React.FC<GalleryManagementViewProps> = ({ hotel }) => {
  const [images, setImages] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusBanner, setStatusBanner] = useState('');

  // Add / Batch Upload Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('Rooms');
  const [pendingUploads, setPendingUploads] = useState<PendingGalleryUpload[]>([]);
  const [manualUrl, setManualUrl] = useState('');
  const [manualCaption, setManualCaption] = useState('');

  // Multi-file upload progress state
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // AI SEO Optimization & Inline Edit State
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ completed: number; total: number }>({
    completed: 0,
    total: 0,
  });
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [editingCaptionValue, setEditingCaptionValue] = useState('');
  const [editingCategoryValue, setEditingCategoryValue] = useState('Rooms');

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

  // 1-Click AI Vision SEO Optimization for All Gallery Photos
  const handleAiOptimizeAllGallery = async () => {
    if (!hotel?.id || images.length === 0 || isAiOptimizing) return;
    setIsAiOptimizing(true);
    setAiProgress({ completed: 0, total: images.length });
    setStatusBanner('');

    const res = await aiOptimizeAllGalleryCaptions(
      hotel.id,
      hotel.name || 'Sun Moon Suites',
      hotel.address || 'GT-20, Sector 117',
      hotel.city || 'Noida',
      (completed, total) => {
        setAiProgress({ completed, total });
      }
    );

    if (res.success && res.items.length > 0) {
      setImages(res.items);
      window.dispatchEvent(new Event('hotel_data_updated'));
      setStatusBanner(
        `✨ AI Vision inspected all ${res.updatedCount} photos and updated each photo's Category, Name & SEO Caption according to its actual image content!`
      );
      setTimeout(() => setStatusBanner(''), 7000);
    }
    setIsAiOptimizing(false);
  };

  const handleSaveInlineEdit = async (id: string) => {
    if (!hotel?.id || !editingCaptionValue.trim()) {
      setEditingImageId(null);
      return;
    }
    const cleanCap = editingCaptionValue.trim();
    await updateGalleryItemCaption(id, hotel.id, cleanCap, editingCategoryValue);
    setImages((prev) =>
      prev.map((img) =>
        img.id === id ? { ...img, caption: cleanCap, category: editingCategoryValue } : img
      )
    );
    setEditingImageId(null);
    setStatusBanner('Photo category, name & caption saved to Supabase!');
    setTimeout(() => setStatusBanner(''), 3500);
  };

  const handleReorderInCategory = async (
    id: string,
    action: 'first' | 'prev' | 'next'
  ) => {
    if (!hotel?.id) return;
    const res = await reorderGalleryItemsInCategory(hotel.id, id, action);
    if (res.success) {
      setImages(res.items);
      setStatusBanner(
        action === 'first'
          ? 'Set photo as #1 Cover Photo for its category!'
          : 'Updated photo display order in category!'
      );
      setTimeout(() => setStatusBanner(''), 3000);
    }
  };

  const handleAiOptimizePendingUploads = async () => {
    if (pendingUploads.length === 0) return;
    const hotelName = hotel?.name || 'Sun Moon Suites';
    const address = hotel?.address || 'GT-20, Sector 117';
    const city = hotel?.city || 'Noida';

    try {
      const response = await fetch('/api/gallery/ai-seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName,
          address,
          city,
          items: pendingUploads.map((item, idx) => ({
            id: item.id,
            image_url: item.image_url,
            category: item.category || category || 'Rooms',
            currentCaption: item.caption || '',
            index: idx + 1,
          })),
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.optimized) && data.optimized.length > 0) {
          const map = new Map<string, { category: string; seoCaption: string }>();
          for (const entry of data.optimized) {
            if (entry?.id && entry?.seoCaption) {
              map.set(entry.id, {
                category: entry.category || category,
                seoCaption: entry.seoCaption,
              });
            }
          }
          setPendingUploads((prev) =>
            prev.map((item) => {
              const found = map.get(item.id);
              return found
                ? { ...item, category: found.category, caption: found.seoCaption }
                : item;
            })
          );
          return;
        }
      }
    } catch {
      // Fallback below
    }

    const catCounters: Record<string, number> = {};
    setPendingUploads((prev) =>
      prev.map((item) => {
        const c = item.category || category || 'Rooms';
        const idx = catCounters[c] || 0;
        catCounters[c] = idx + 1;
        return {
          ...item,
          caption: generateSmartSeoGalleryCaption(
            c,
            item.caption,
            idx,
            hotelName,
            item.image_url
          ),
        };
      })
    );
  };

  // Multi-file upload inside Modal (stages all uploaded files in pendingUploads list)
  const handleMultipleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setIsUploadingFiles(true);
    setUploadError('');
    setUploadProgress({ completed: 0, total: fileList.length });

    const results = await uploadMultipleImagesToSupabase(
      fileList,
      'gallery',
      (completed, total) => {
        setUploadProgress({ completed, total });
      }
    );

    setIsUploadingFiles(false);

    const newPending: PendingGalleryUpload[] = [];
    const errors: string[] = [];

    results.forEach((res, idx) => {
      if (res.success && res.publicUrl) {
        newPending.push({
          id: `pending-${Date.now()}-${idx}`,
          image_url: res.publicUrl,
          caption: generateSmartSeoGalleryCaption(
            category,
            res.fileName || '',
            pendingUploads.length + idx,
            hotel?.name || 'Sun Moon Suites'
          ),
          category,
        });
      } else if (res.error) {
        errors.push(res.error);
      }
    });

    if (newPending.length > 0) {
      setPendingUploads((prev) => [...prev, ...newPending]);
    }
    if (errors.length > 0) {
      setUploadError(errors[0]);
    }

    e.target.value = '';
  };

  // Quick 1-Step Direct Multi-File Upload & Save from Header
  const handleQuickDirectBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !hotel?.id) return;

    const targetCategory = categoryFilter === 'ALL' ? 'Rooms' : categoryFilter;
    setIsUploadingFiles(true);
    setUploadError('');
    setStatusBanner('');
    setUploadProgress({ completed: 0, total: fileList.length });

    const results = await uploadMultipleImagesToSupabase(
      fileList,
      'gallery',
      (completed, total) => {
        setUploadProgress({ completed, total });
      }
    );

    const validItems = results
      .filter((r) => r.success && r.publicUrl)
      .map((r, idx) => ({
        hotel_id: hotel.id,
        caption: generateSmartSeoGalleryCaption(
          targetCategory,
          r.fileName || '',
          images.length + idx,
          hotel.name || 'Sun Moon Suites'
        ),
        image_url: r.publicUrl!,
        category: targetCategory,
        sort_order: images.length + idx + 1,
        is_featured: false,
      }));

    if (validItems.length > 0) {
      await addMultipleGalleryItems(validItems);
      await loadGallery();
      setStatusBanner(
        `Successfully uploaded and saved ${validItems.length} photo${
          validItems.length > 1 ? 's' : ''
        } to "${targetCategory}" in Gallery!`
      );
      setTimeout(() => setStatusBanner(''), 5000);
    }

    setIsUploadingFiles(false);
    e.target.value = '';
  };

  const handleUpdatePendingCaption = (id: string, newCaption: string) => {
    setPendingUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, caption: newCaption } : item))
    );
  };

  const handleUpdatePendingCategory = (id: string, newCategory: string) => {
    setPendingUploads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCategory } : item))
    );
  };

  const handleRemovePending = (id: string) => {
    setPendingUploads((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id) return;

    setIsSubmitting(true);
    setUploadError('');

    // If user uploaded multiple files into pendingUploads
    if (pendingUploads.length > 0) {
      const batchPayload = pendingUploads.map((item, idx) => ({
        hotel_id: hotel.id,
        caption: item.caption.trim() || item.category,
        image_url: item.image_url,
        category: item.category,
        sort_order: images.length + idx + 1,
        is_featured: false,
      }));

      // Also include manual URL if entered
      if (manualUrl.trim()) {
        batchPayload.push({
          hotel_id: hotel.id,
          caption: manualCaption.trim() || category,
          image_url: manualUrl.trim(),
          category,
          sort_order: images.length + batchPayload.length + 1,
          is_featured: false,
        });
      }

      const res = await addMultipleGalleryItems(batchPayload);
      setIsSubmitting(false);

      if (res.success) {
        setShowAddModal(false);
        setPendingUploads([]);
        setManualUrl('');
        setManualCaption('');
        setStatusBanner(
          `Successfully saved ${batchPayload.length} photo${
            batchPayload.length > 1 ? 's' : ''
          } to Website Gallery!`
        );
        loadGallery();
        setTimeout(() => setStatusBanner(''), 5000);
      }
      return;
    }

    // Fallback if user only pasted a manual URL
    if (manualUrl.trim()) {
      const res = await addGalleryItem({
        hotel_id: hotel.id,
        caption: manualCaption.trim() || category,
        image_url: manualUrl.trim(),
        category,
        sort_order: images.length + 1,
        is_featured: false,
      });
      setIsSubmitting(false);
      if (res.success) {
        setShowAddModal(false);
        setManualUrl('');
        setManualCaption('');
        loadGallery();
      }
    } else {
      setIsSubmitting(false);
    }
  };

  const categories = [
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

  const roomSubCategories = new Set([
    'Rooms',
    'Standard Room',
    'Deluxe Room',
    'Super Deluxe Room',
    'Suite Room',
  ]);

  const filtered = images.filter((img) => {
    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'Rooms') return roomSubCategories.has(img.category);
    return img.category === categoryFilter;
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
            Central Website Photo Gallery (Supabase Storage)
          </h3>
          <p className="text-xs text-stone-500">
            Upload multiple photos together here. All other sections (Rooms, Hero Banner) select their images directly from this Gallery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 1-Click AI Auto-Optimize SEO Names & Captions Button */}
          <button
            type="button"
            onClick={handleAiOptimizeAllGallery}
            disabled={isAiOptimizing || images.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-800 hover:from-amber-700 hover:to-amber-900 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            title="AI Vision inspects each image and automatically sets its Category, Photo Name & Google SEO Caption according to what is in the photo"
          >
            <Sparkles className={`w-4 h-4 ${isAiOptimizing ? 'animate-spin' : ''}`} />
            <span>
              {isAiOptimizing
                ? `AI Vision Analyzing (${aiProgress.completed}/${aiProgress.total})...`
                : 'AI Auto-SEO Names & Captions'}
            </span>
          </button>

          {/* Quick 1-Step Multi-File Upload Button */}
          <label className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>
              {isUploadingFiles
                ? `Uploading (${uploadProgress.completed}/${uploadProgress.total})...`
                : 'Quick Upload Multiple Photos'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleQuickDirectBatchUpload}
              disabled={isUploadingFiles}
              className="hidden"
            />
          </label>

          {/* Open Upload Modal with Category & Caption customization */}
          <button
            type="button"
            onClick={() => {
              setUploadError('');
              setPendingUploads([]);
              if (categoryFilter !== 'ALL') {
                setCategory(categoryFilter);
              }
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload with Category / Captions</span>
          </button>
        </div>
      </div>

      {/* Live Batch Upload Progress Banner */}
      {isUploadingFiles && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-900">
            <span>
              Uploading multiple photos to Supabase Storage ({uploadProgress.completed} of{' '}
              {uploadProgress.total})...
            </span>
            <span>
              {uploadProgress.total > 0
                ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-700 transition-all duration-200"
              style={{
                width: `${
                  uploadProgress.total > 0
                    ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>
      )}

      {statusBanner && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusBanner}</span>
        </div>
      )}

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
        {categories.map((cat) => {
          const count = images.filter((i) => i.category === cat).length;
          return (
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
              {cat} ({count})
            </button>
          );
        })}
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
          actionLabel="Upload Multiple Photos"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img) => {
            const sameCatList = images.filter(
              (i) =>
                normalizeRoomCategoryName(i.category) ===
                normalizeRoomCategoryName(img.category)
            );
            const indexInCat = sameCatList.findIndex((i) => i.id === img.id);
            const isFirstInCat = indexInCat === 0;
            const isLastInCat = indexInCat === sameCatList.length - 1;

            return (
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
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getSupabaseFallbackForMirroredMedia(img.image_url);
                      if (fallback && target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 text-white text-[10px] font-bold rounded flex items-center gap-1">
                    <span>{img.category}</span>
                    {indexInCat >= 0 && (
                      <span className="text-amber-300">
                        {isFirstInCat ? '• #1 Cover' : `• #${indexInCat + 1}`}
                      </span>
                    )}
                  </span>

                  {/* Quick Order Controls within Category */}
                  {sameCatList.length > 1 && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/75 px-1.5 py-1 rounded-lg opacity-90 group-hover:opacity-100 transition-opacity">
                      {!isFirstInCat && (
                        <button
                          type="button"
                          onClick={() => handleReorderInCategory(img.id, 'first')}
                          className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-bold flex items-center gap-0.5 cursor-pointer"
                          title={`Make #1 Cover Photo for ${img.category}`}
                        >
                          <Star className="w-2.5 h-2.5" />
                          <span>#1 Cover</span>
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isFirstInCat}
                        onClick={() => handleReorderInCategory(img.id, 'prev')}
                        className="p-0.5 text-white hover:text-amber-300 disabled:opacity-30 cursor-pointer"
                        title="Move earlier in category"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLastInCat}
                        onClick={() => handleReorderInCategory(img.id, 'next')}
                        className="p-0.5 text-white hover:text-amber-300 disabled:opacity-30 cursor-pointer"
                        title="Move later in category"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

              <div className="px-1 space-y-1.5">
                {editingImageId === img.id ? (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      value={editingCaptionValue}
                      onChange={(e) => setEditingCaptionValue(e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-amber-400 rounded font-medium focus:outline-none"
                      placeholder="SEO Photo Name / Caption..."
                    />
                    <div className="flex items-center justify-between gap-1.5">
                      <select
                        value={editingCategoryValue}
                        onChange={(e) => setEditingCategoryValue(e.target.value)}
                        className="px-2 py-1 text-[10px] border border-stone-200 rounded bg-stone-50 text-stone-700 font-semibold"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(img.id)}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Save</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingImageId(null)}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-1.5">
                    {(() => {
                      const rawCap = img.caption || img.category;
                      const dashIdx = rawCap.indexOf(' — ');
                      const photoTitle = dashIdx > 0 ? rawCap.slice(0, dashIdx).trim() : '';
                      const seoDesc = dashIdx > 0 ? rawCap.slice(dashIdx + 3).trim() : rawCap;
                      return (
                        <div className="min-w-0 space-y-0.5" title={rawCap}>
                          {photoTitle && (
                            <p className="font-bold text-xs text-amber-900 truncate">
                              {photoTitle}
                            </p>
                          )}
                          <p
                            className={`${
                              photoTitle
                                ? 'text-[11px] text-stone-600 font-medium'
                                : 'font-semibold text-xs text-stone-900'
                            } line-clamp-2 leading-snug`}
                          >
                            {seoDesc}
                          </p>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingImageId(img.id);
                          setEditingCaptionValue(img.caption || img.category);
                          setEditingCategoryValue(img.category || 'Rooms');
                        }}
                        className="p-1 text-stone-400 hover:text-amber-700 rounded cursor-pointer"
                        title="Edit Photo Name & Caption"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
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
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* BATCH MULTI-FILE UPLOAD MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Upload Multiple Photos to Website Gallery"
        subtitle="Select multiple photos at once from your computer or mobile to upload to Supabase Storage"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveBatchSubmit} className="space-y-4">
          {/* Step 1: Default Category for Uploaded Batch */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              1. Select Default Category for Photos
            </label>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value;
                setCategory(newCat);
                setPendingUploads((prev) =>
                  prev.map((item) => ({ ...item, category: newCat }))
                );
              }}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-semibold"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Multi-file Device-to-Supabase Upload Box */}
          <div className="p-5 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/40 text-center space-y-2">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs">
              <Images className="w-4 h-4" />
              <span>
                {isUploadingFiles
                  ? `Uploading ${uploadProgress.completed} of ${uploadProgress.total} Photos...`
                  : 'Select Multiple Photos from Computer / Mobile'}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleMultipleFilesSelect}
                disabled={isUploadingFiles}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-stone-600 font-medium">
              You can select <strong>multiple files at once</strong> (Hold Ctrl / Shift on computer or tap multiple photos on mobile)
            </p>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Staged Multi-Photo Preview Grid */}
          {pendingUploads.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {pendingUploads.length} Photo{pendingUploads.length > 1 ? 's' : ''} Uploaded &amp; Ready to Save
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAiOptimizePendingUploads}
                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-700" />
                    <span>AI SEO Captions</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingUploads([])}
                    className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1 border border-stone-200 rounded-xl bg-stone-50">
                {pendingUploads.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 bg-white p-2 rounded-lg border border-stone-200 shadow-2xs"
                  >
                    <img
                      src={item.image_url}
                      alt={item.caption}
                      referrerPolicy="no-referrer"
                      className="w-16 h-12 object-cover rounded shrink-0 bg-stone-100"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <input
                        type="text"
                        value={item.caption}
                        onChange={(e) => handleUpdatePendingCaption(item.id, e.target.value)}
                        placeholder="Photo caption..."
                        className="w-full px-2 py-1 text-[11px] border border-stone-200 rounded font-medium"
                      />
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdatePendingCategory(item.id, e.target.value)}
                        className="w-full px-2 py-0.5 text-[10px] border border-stone-200 rounded text-stone-600 bg-stone-50"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePending(item.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Manual URL Input (collapsed/secondary) */}
          {pendingUploads.length === 0 && (
            <div className="pt-2 border-t border-stone-200/80 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Or Add by Direct Image URL (Optional)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="url"
                  placeholder="https://... (Image URL)"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono text-[11px]"
                />
                <input
                  type="text"
                  placeholder="Caption (e.g. Deluxe Room)"
                  value={manualCaption}
                  onChange={(e) => setManualCaption(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isUploadingFiles ||
                (pendingUploads.length === 0 && !manualUrl.trim())
              }
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting
                ? 'Saving to Gallery...'
                : pendingUploads.length > 0
                ? `Save All ${pendingUploads.length} Photo${
                    pendingUploads.length > 1 ? 's' : ''
                  } to Gallery`
                : 'Save to Website Gallery'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
