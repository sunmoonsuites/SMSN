import React, { useEffect, useState } from 'react';
import { Hotel, RoomCategory, GalleryItem } from '../../types';
import {
  getRoomCategories,
  getStoredCategories,
} from '../../services/roomsService';
import {
  getEffectiveRoomPrice,
  DEFAULT_INAUGURAL_OFFER_CONFIG,
} from '../../services/hotelService';
import {
  getGalleryItems,
  getStoredGallery,
  getPhotosForRoomCategory,
} from '../../services/galleryService';
import { getSupabaseFallbackForMirroredMedia } from '../../services/mediaFallbackMap';
import { formatINR } from '../../lib/utils';
import {
  Bed,
  Users,
  Maximize2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Images,
  X,
  CheckCircle2,
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface FeaturedRoomsProps {
  hotel: Hotel | null;
  onSelectCategoryForBooking: (categoryId: string) => void;
}

function getCategoryFallbackImage(categoryName?: string): string {
  const norm = (categoryName || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
  if (norm.includes('super-deluxe')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766473773-t4m2-dsc06758-59-60-copy-2.jpg';
  }
  if (norm.includes('deluxe')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766507446-eq1w-dsc06971-2-3-copy-2.jpg';
  }
  if (norm.includes('suite')) {
    return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602889189-room.jpeg';
  }
  return 'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766506349-btxh-dsc06965-6-7-copy-2.jpg';
}

export const FeaturedRooms: React.FC<FeaturedRoomsProps> = ({
  hotel,
  onSelectCategoryForBooking,
}) => {
  const [categories, setCategories] = useState<RoomCategory[]>(() => getStoredCategories());
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(() => getStoredGallery());
  const [isLoading, setIsLoading] = useState(false);

  // Per-card active slide index: { [categoryId]: number }
  const [cardPhotoIndex, setCardPhotoIndex] = useState<Record<string, number>>({});

  // Room-Specific Lightbox Modal state (shows ONLY the selected Room Category's photos)
  const [lightboxCategory, setLightboxCategory] = useState<RoomCategory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  const hotelName = hotel?.name || 'Sun Moon Suites';

  useEffect(() => {
    if (hotel?.id) {
      loadData();
    }
    const handleRefresh = () => {
      if (hotel?.id) loadData();
    };
    window.addEventListener('hotel_data_updated', handleRefresh);
    return () => window.removeEventListener('hotel_data_updated', handleRefresh);
  }, [hotel?.id]);

  const loadData = async () => {
    if (!hotel?.id) return;
    const [catsData, galData] = await Promise.all([
      getRoomCategories(hotel.id, true),
      getGalleryItems(hotel.id),
    ]);
    if (catsData && catsData.length > 0) {
      setCategories(catsData);
    }
    if (galData && galData.length > 0) {
      setGalleryItems(galData);
    }
    setIsLoading(false);
  };

  const handleCardPrev = (e: React.MouseEvent, catId: string, total: number) => {
    e.stopPropagation();
    if (total <= 1) return;
    setCardPhotoIndex((prev) => {
      const current = prev[catId] || 0;
      return { ...prev, [catId]: (current - 1 + total) % total };
    });
  };

  const handleCardNext = (e: React.MouseEvent, catId: string, total: number) => {
    e.stopPropagation();
    if (total <= 1) return;
    setCardPhotoIndex((prev) => {
      const current = prev[catId] || 0;
      return { ...prev, [catId]: (current + 1) % total };
    });
  };

  const openRoomPhotoModal = (cat: RoomCategory, startIndex: number = 0) => {
    setLightboxCategory(cat);
    setLightboxIndex(startIndex);
  };

  const lightboxPhotos = lightboxCategory
    ? getPhotosForRoomCategory(lightboxCategory, galleryItems, hotelName)
    : [];

  const inauguralConfig = hotel?.inaugural_offer ?? DEFAULT_INAUGURAL_OFFER_CONFIG;
  const isGlobalInauguralActive =
    Boolean(inauguralConfig?.is_enabled) && Number(inauguralConfig?.offer_price) > 0;

  return (
    <section id="rooms" className="py-20 bg-stone-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Accommodations
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Curated Rooms &amp; Suites
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            30 thoughtfully designed rooms across 4 categories—Standard Room, Deluxe Room, Super Deluxe Room, and Suite Room. Click any room photo to browse photos exclusively for that room category.
          </p>

          {isGlobalInauguralActive && (
            <div className="pt-2">
              <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-700 via-amber-800 to-stone-900 text-white text-xs sm:text-sm font-bold shadow-md border border-amber-400/40">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[11px] uppercase tracking-wider font-extrabold">
                  {inauguralConfig.badge_text || '🎉 Inaugural Offer'}
                </span>
                <span>
                  {inauguralConfig.banner_text ||
                    `All Room Categories at Flat ${formatINR(Number(inauguralConfig.offer_price))} / Night!`}
                </span>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
            {[1, 2].map((n) => (
              <div key={n} className="bg-stone-200 rounded-2xl h-80" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            title="No Room Categories Configured"
            message="No active room categories are currently configured in the database. Open the Staff PMS Portal to add room categories and configure the 30 rooms."
            actionLabel="Configure in PMS Portal"
            onAction={() => {
              window.dispatchEvent(new CustomEvent('open_admin_portal'));
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {categories.map((cat) => {
              const roomPhotos = getPhotosForRoomCategory(cat, galleryItems, hotelName);
              const totalPhotos = roomPhotos.length;
              const activeIdx = totalPhotos > 0 ? (cardPhotoIndex[cat.id] || 0) % totalPhotos : 0;
              const activePhoto = roomPhotos[activeIdx];
              const priceInfo = getEffectiveRoomPrice(cat, hotel);

              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group"
                >
                  {/* Room Category Interactive Photo Slider */}
                  <div
                    onClick={() => totalPhotos > 0 && openRoomPhotoModal(cat, activeIdx)}
                    className="relative h-60 bg-stone-100 flex items-center justify-center overflow-hidden cursor-pointer"
                  >
                    {activePhoto ? (
                      <img
                        src={activePhoto.url}
                        alt={
                          activePhoto.caption ||
                          `${cat.name} with ${cat.bed_type || 'comfortable bedding'} at ${hotelName} hotel in Sector 117 Noida`
                        }
                        width={600}
                        height={400}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const directFallback = getSupabaseFallbackForMirroredMedia(activePhoto.url);
                          const fallback = directFallback || getCategoryFallbackImage(cat.name);
                          if (!target.src.endsWith(fallback)) {
                            target.src = fallback;
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center p-6">
                        <Bed className="w-10 h-10 text-stone-300 mx-auto mb-2" aria-hidden="true" />
                        <span className="text-xs text-stone-400 font-medium">{cat.name}</span>
                      </div>
                    )}

                    {/* Inaugural Offer Badge (Top Left) */}
                    {priceInfo.isInauguralActive && (
                      <div className="absolute top-3 left-3 bg-amber-500 text-stone-950 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-sm flex items-center gap-1">
                        <span>{priceInfo.badgeText}</span>
                        {priceInfo.discountPercent > 0 && (
                          <span className="bg-stone-900 text-amber-300 px-1.5 py-0.2 rounded-full text-[9px] uppercase">
                            {priceInfo.discountPercent}% OFF
                          </span>
                        )}
                      </div>
                    )}

                    {/* Price Badge */}
                    <div className="absolute top-3 right-3 bg-stone-900/90 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-serif font-bold shadow-xs flex items-center gap-1.5">
                      {priceInfo.isInauguralActive &&
                        priceInfo.originalPrice > priceInfo.effectivePrice && (
                          <span className="text-[11px] text-stone-300 line-through font-normal opacity-85">
                            {formatINR(priceInfo.originalPrice)}
                          </span>
                        )}
                      <span className={priceInfo.isInauguralActive ? 'text-amber-300 text-sm' : ''}>
                        {formatINR(priceInfo.effectivePrice)}
                      </span>
                      <span className="text-[10px] font-sans font-normal opacity-80">/ night</span>
                    </div>

                    {/* View Only This Room's Photos Badge */}
                    {totalPhotos > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openRoomPhotoModal(cat, activeIdx);
                        }}
                        className="absolute bottom-3 left-3 bg-stone-900/85 hover:bg-amber-800 backdrop-blur-xs text-white px-3 py-1.5 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      >
                        <Images className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                        <span>
                          {cat.name} Photos ({activeIdx + 1}/{totalPhotos})
                        </span>
                      </button>
                    )}

                    {/* Left / Right Slider Controls when room has multiple photos */}
                    {totalPhotos > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => handleCardPrev(e, cat.id, totalPhotos)}
                          aria-label={`Previous ${cat.name} photo`}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleCardNext(e, cat.id, totalPhotos)}
                          aria-label={`Next ${cat.name} photo`}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-900/75 hover:bg-stone-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        {/* Dots Indicator */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-stone-900/65 px-2 py-1 rounded-full">
                          {roomPhotos.slice(0, 6).map((_, dotIdx) => (
                            <span
                              key={dotIdx}
                              className={`block rounded-full transition-all ${
                                dotIdx === activeIdx
                                  ? 'w-3.5 h-1.5 bg-amber-400'
                                  : 'w-1.5 h-1.5 bg-white/60'
                              }`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3 className="font-serif text-xl font-bold text-stone-900">
                          {cat.name}
                        </h3>
                        {totalPhotos > 0 && (
                          <button
                            type="button"
                            onClick={() => openRoomPhotoModal(cat, 0)}
                            className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                          >
                            View {totalPhotos} {totalPhotos === 1 ? 'Photo' : 'Photos'}
                          </button>
                        )}
                      </div>

                      {cat.description && (
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                          {cat.description}
                        </p>
                      )}

                      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-stone-100 mt-4 text-[11px] text-stone-600 font-medium">
                        <span className="flex items-center gap-1">
                          <Bed className="w-3.5 h-3.5 text-amber-700" />
                          {cat.bed_type}
                        </span>
                        <span className="flex items-center gap-1">
                          <Maximize2 className="w-3.5 h-3.5 text-amber-700" />
                          {cat.room_size_sqft} sq.ft
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-amber-700" />
                          Up to {cat.max_adults}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2.5">
                      {totalPhotos > 0 && (
                        <button
                          type="button"
                          onClick={() => openRoomPhotoModal(cat, 0)}
                          className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Images className="w-3.5 h-3.5 text-amber-800" />
                          <span>Photos ({totalPhotos})</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onSelectCategoryForBooking(cat.id)}
                        className="flex-1 py-2.5 bg-stone-900 hover:bg-amber-800 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Book {cat.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Room-Specific Photo Gallery Modal (Shows ONLY the clicked Room Category's photos) */}
      {lightboxCategory && lightboxPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={() => setLightboxCategory(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-stone-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                    Room Category Gallery
                  </span>
                  <span className="text-xs text-stone-300">
                    Photo {lightboxIndex + 1} of {lightboxPhotos.length}
                  </span>
                </div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{lightboxCategory.name} —</span>
                  {(() => {
                    const lbPrice = getEffectiveRoomPrice(lightboxCategory, hotel);
                    return (
                      <>
                        {lbPrice.isInauguralActive &&
                          lbPrice.originalPrice > lbPrice.effectivePrice && (
                            <span className="text-sm text-stone-400 line-through font-normal">
                              {formatINR(lbPrice.originalPrice)}
                            </span>
                          )}
                        <span className="text-amber-300">
                          {formatINR(lbPrice.effectivePrice)} / night
                        </span>
                        {lbPrice.isInauguralActive && (
                          <span className="px-2 py-0.5 bg-amber-500 text-stone-950 text-[10px] font-sans font-extrabold rounded-full">
                            {lbPrice.badgeText}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setLightboxCategory(null)}
                aria-label="Close room photo gallery"
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Large Room Photo Viewer */}
            <div className="relative bg-stone-950 flex items-center justify-center h-64 sm:h-[420px] overflow-hidden">
              <img
                src={lightboxPhotos[lightboxIndex]?.url}
                alt={
                  lightboxPhotos[lightboxIndex]?.caption ||
                  `${lightboxCategory.name} at ${hotelName} Sector 117 Noida`
                }
                referrerPolicy="no-referrer"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  const currentUrl = lightboxPhotos[lightboxIndex]?.url;
                  const directFallback = getSupabaseFallbackForMirroredMedia(currentUrl);
                  const fallback = directFallback || getCategoryFallbackImage(lightboxCategory?.name);
                  if (!target.src.endsWith(fallback)) {
                    target.src = fallback;
                  }
                }}
              />

              {lightboxPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-900/80 hover:bg-amber-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxIndex((lightboxIndex + 1) % lightboxPhotos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-stone-900/80 hover:bg-amber-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Caption Overlay */}
              {lightboxPhotos[lightboxIndex]?.caption && (
                <div className="absolute bottom-3 inset-x-4 text-center">
                  <span className="inline-block px-3.5 py-1.5 rounded-lg bg-stone-900/85 text-stone-100 text-xs font-medium">
                    {lightboxPhotos[lightboxIndex].caption}
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip (Only this Room Category's Photos) */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-4 overflow-y-auto">
              {lightboxPhotos.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {lightboxPhotos.map((photo, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className={`relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        idx === lightboxIndex
                          ? 'border-amber-700 ring-2 ring-amber-500/30 scale-105'
                          : 'border-stone-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `${lightboxCategory.name} photo ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = getCategoryFallbackImage(lightboxCategory?.name);
                          if (!target.src.endsWith(fallback)) {
                            target.src = fallback;
                          }
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Room Quick Specs & Book CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-stone-200">
                <div className="flex flex-wrap items-center gap-3 text-xs text-stone-700">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Bed className="w-3.5 h-3.5 text-amber-700" />
                    {lightboxCategory.bed_type}
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Maximize2 className="w-3.5 h-3.5 text-amber-700" />
                    {lightboxCategory.room_size_sqft} sq.ft
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    Up to {lightboxCategory.max_adults} Adults
                  </span>
                  {(lightboxCategory.amenities || []).slice(0, 3).map((am, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-stone-200 text-[11px] text-stone-600"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {am}
                    </span>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const catId = lightboxCategory.id;
                    setLightboxCategory(null);
                    onSelectCategoryForBooking(catId);
                  }}
                  className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-xs uppercase tracking-wider font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <span>Book {lightboxCategory.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
