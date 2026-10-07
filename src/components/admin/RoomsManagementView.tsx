import React, { useEffect, useState } from 'react';
import { Hotel, Room, RoomCategory, RoomStatus, GalleryItem } from '../../types';
import {
  getRooms,
  getRoomCategories,
  updateRoomStatus,
  initialize30Rooms,
  createRoomCategory,
  updateRoomCategory,
} from '../../services/roomsService';
import {
  updateHotel,
  getEffectiveRoomPrice,
  DEFAULT_INAUGURAL_OFFER_CONFIG,
} from '../../services/hotelService';
import {
  getGalleryItems,
  getPhotosForRoomCategory,
  normalizeRoomCategoryName,
  updateGalleryItemCaption,
} from '../../services/galleryService';
import { getSupabaseFallbackForMirroredMedia } from '../../services/mediaFallbackMap';
import { formatINR } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import { GalleryPickerModal } from '../common/GalleryPickerModal';
import {
  Bed,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Images,
  X,
} from 'lucide-react';

interface RoomsManagementViewProps {
  hotel: Hotel | null;
}

export const RoomsManagementView: React.FC<RoomsManagementViewProps> = ({ hotel }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Category modal (Create or Edit)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFullGalleryPicker, setShowFullGalleryPicker] = useState(false);
  const [galleryFilterInModal, setGalleryFilterInModal] = useState<string>('ALL');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatPrice, setNewCatPrice] = useState(2500);
  const [newCatBed, setNewCatBed] = useState('King Bed');
  const [newCatSize, setNewCatSize] = useState(280);
  const [newCatMaxAdults, setNewCatMaxAdults] = useState(2);
  const [newCatImages, setNewCatImages] = useState<string[]>([]);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // 30 Rooms Auto-Setup
  const [isInitializing, setIsInitializing] = useState(false);
  const [message, setMessage] = useState('');

  // Inaugural Offer State
  const initialInaugural = hotel?.inaugural_offer ?? DEFAULT_INAUGURAL_OFFER_CONFIG;
  const [inauguralEnabled, setInauguralEnabled] = useState<boolean>(
    initialInaugural.is_enabled !== false
  );
  const [inauguralPrice, setInauguralPrice] = useState<number>(
    Number(initialInaugural.offer_price) || 999
  );
  const [inauguralBanner, setInauguralBanner] = useState<string>(
    initialInaugural.banner_text ||
      'Grand Inaugural Offer — All Room Categories at Flat ₹999 / Night!'
  );
  const [isSavingInaugural, setIsSavingInaugural] = useState(false);

  useEffect(() => {
    const cfg = hotel?.inaugural_offer ?? DEFAULT_INAUGURAL_OFFER_CONFIG;
    setInauguralEnabled(cfg.is_enabled !== false);
    setInauguralPrice(Number(cfg.offer_price) || 999);
    setInauguralBanner(
      cfg.banner_text || 'Grand Inaugural Offer — All Room Categories at Flat ₹999 / Night!'
    );
  }, [hotel?.inaugural_offer]);

  const handleSaveInauguralOffer = async (nextEnabled?: boolean) => {
    if (!hotel?.id) return;
    const targetEnabled = nextEnabled !== undefined ? nextEnabled : inauguralEnabled;
    setInauguralEnabled(targetEnabled);
    setIsSavingInaugural(true);
    const res = await updateHotel(hotel.id, {
      inaugural_offer: {
        is_enabled: targetEnabled,
        offer_price: Number(inauguralPrice) || 999,
        badge_text: '🎉 Inaugural Offer',
        banner_text:
          inauguralBanner.trim() ||
          `Grand Inaugural Offer — All Room Categories at Flat ₹${Number(inauguralPrice) || 999} / Night!`,
      },
    });
    setIsSavingInaugural(false);
    if (res.success) {
      setMessage(
        targetEnabled
          ? `🎉 Inaugural Offer Active: All Room Categories are now displayed at ${formatINR(
              Number(inauguralPrice) || 999
            )} / night on the website!`
          : 'Inaugural Offer turned OFF. Website now displays standard room category tariffs.'
      );
      setTimeout(() => setMessage(''), 5000);
    }
  };

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
    setIsLoading(true);
    const [roomsData, catsData, galleryData] = await Promise.all([
      getRooms(hotel.id),
      getRoomCategories(hotel.id, false),
      getGalleryItems(hotel.id),
    ]);
    setRooms(roomsData);
    setCategories(catsData);
    setGalleryImages(galleryData);
    setIsLoading(false);
  };

  const handleInit30 = async () => {
    if (!hotel?.id) return;
    setIsInitializing(true);
    setMessage('');
    const res = await initialize30Rooms(hotel.id);
    setIsInitializing(false);

    if (res.success) {
      setMessage(
        'Successfully initialized 30 hotel rooms across 3 floors (101–110, 201–210, 301–310)!'
      );
      loadData();
      setTimeout(() => setMessage(''), 5000);
    } else {
      setMessage(res.error || 'Failed to initialize rooms');
    }
  };

  const handleQuickStatusChange = async (roomId: string, newStatus: RoomStatus) => {
    if (!hotel?.id) return;
    const res = await updateRoomStatus(roomId, newStatus, hotel.id);
    if (res.success) {
      setRooms((prev) =>
        prev.map((r) => (r.id === roomId ? { ...r, status: newStatus } : r))
      );
    }
  };

  const openAddCategoryModal = async () => {
    let latestGallery = galleryImages;
    if (hotel?.id) {
      latestGallery = await getGalleryItems(hotel.id);
      setGalleryImages(latestGallery);
    }
    setEditingCategoryId(null);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatPrice(2500);
    setNewCatBed('King Bed');
    setNewCatSize(280);
    setNewCatMaxAdults(2);
    setNewCatImages(latestGallery[0]?.image_url ? [latestGallery[0].image_url] : []);
    setGalleryFilterInModal('ALL');
    setCategoryError('');
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = async (cat: RoomCategory) => {
    let latestGallery = galleryImages;
    if (hotel?.id) {
      latestGallery = await getGalleryItems(hotel.id);
      setGalleryImages(latestGallery);
    }
    const existingPhotos = getPhotosForRoomCategory(
      cat,
      latestGallery,
      hotel?.name || 'Sun Moon Suites'
    ).map((p) => p.url);

    setEditingCategoryId(cat.id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || '');
    setNewCatPrice(Number(cat.base_price));
    setNewCatBed(cat.bed_type || 'King Bed');
    setNewCatSize(Number(cat.room_size_sqft || 250));
    setNewCatMaxAdults(Number(cat.max_adults || 2));
    setNewCatImages(existingPhotos);

    const normTarget = normalizeRoomCategoryName(cat.name);
    const matchingGalleryTab =
      normTarget === 'suite room'
        ? 'Suite Room'
        : normTarget === 'super deluxe room'
        ? 'Super Deluxe Room'
        : normTarget === 'deluxe room'
        ? 'Deluxe Room'
        : normTarget === 'standard room'
        ? 'Standard Room'
        : cat.name;

    const hasSpecificGalleryTag = latestGallery.some(
      (g) => normalizeRoomCategoryName(g.category) === normTarget
    );
    setGalleryFilterInModal(hasSpecificGalleryTag ? matchingGalleryTab : 'ALL');
    setCategoryError('');
    setShowCategoryModal(true);
  };

  const handleTogglePhotoInCategory = (imageUrl: string) => {
    setNewCatImages((prev) => {
      if (prev.includes(imageUrl)) {
        return prev.filter((u) => u !== imageUrl);
      }
      return [...prev, imageUrl];
    });
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !newCatName.trim()) return;

    setIsCreatingCategory(true);
    setCategoryError('');

    const imagesArray =
      newCatImages.length > 0
        ? newCatImages
        : [
            galleryImages[0]?.image_url ||
              'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
          ];

    // Keep Gallery room category tags in sync if user added/removed photos in this modal
    const normCat = normalizeRoomCategoryName(newCatName);
    const canonicalGalleryCat =
      normCat === 'suite room'
        ? 'Suite Room'
        : normCat === 'super deluxe room'
        ? 'Super Deluxe Room'
        : normCat === 'deluxe room'
        ? 'Deluxe Room'
        : normCat === 'standard room'
        ? 'Standard Room'
        : newCatName.trim();

    const selectedSet = new Set(imagesArray);
    for (const g of galleryImages) {
      const gNorm = normalizeRoomCategoryName(g.category);
      if (selectedSet.has(g.image_url) && gNorm !== normCat) {
        await updateGalleryItemCaption(g.id, hotel.id, g.caption || canonicalGalleryCat, canonicalGalleryCat);
      } else if (!selectedSet.has(g.image_url) && gNorm === normCat) {
        await updateGalleryItemCaption(g.id, hotel.id, g.caption || 'Rooms', 'Rooms');
      }
    }

    if (editingCategoryId) {
      const res = await updateRoomCategory(editingCategoryId, hotel.id, {
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        base_price: Number(newCatPrice),
        max_adults: Number(newCatMaxAdults),
        bed_type: newCatBed,
        room_size_sqft: Number(newCatSize),
        images: imagesArray,
      });

      setIsCreatingCategory(false);
      if (res.success) {
        setShowCategoryModal(false);
        window.dispatchEvent(new Event('hotel_data_updated'));
        setMessage(
          `Saved ${imagesArray.length} photo${imagesArray.length > 1 ? 's' : ''} & tariff for "${newCatName.trim()}"!`
        );
        loadData();
        setTimeout(() => setMessage(''), 4000);
      } else {
        setCategoryError(res.error || 'Failed to update category');
      }
      return;
    }

    const res = await createRoomCategory({
      hotel_id: hotel.id,
      name: newCatName.trim(),
      slug: newCatName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: newCatDesc.trim() || undefined,
      base_price: Number(newCatPrice),
      max_adults: Number(newCatMaxAdults),
      max_children: 1,
      bed_type: newCatBed,
      room_size_sqft: Number(newCatSize),
      amenities: [
        'Air Conditioning',
        'Free Wi-Fi',
        'Smart TV',
        'Electric Kettle',
        'Power Backup',
      ],
      images: imagesArray,
      is_active: true,
    });

    setIsCreatingCategory(false);

    if (res.success) {
      setShowCategoryModal(false);
      setNewCatName('');
      setNewCatDesc('');
      setNewCatImages([]);
      window.dispatchEvent(new Event('hotel_data_updated'));
      loadData();
    } else {
      setCategoryError(res.error || 'Failed to create category');
    }
  };

  const filteredRooms = rooms.filter((r) => {
    if (floorFilter !== 'ALL' && r.floor !== floorFilter) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    return true;
  });

  const modalRoomSubCats = new Set([
    'Rooms',
    'Standard Room',
    'Deluxe Room',
    'Super Deluxe Room',
    'Suite Room',
  ]);

  const modalGalleryFiltered = galleryImages.filter((img) => {
    if (galleryFilterInModal === 'ALL') return true;
    if (galleryFilterInModal === 'Rooms') return modalRoomSubCats.has(img.category);
    return img.category === galleryFilterInModal;
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading 30-room property inventory..." />;
  }

  const roomStatuses: RoomStatus[] = [
    'Available',
    'Reserved',
    'Occupied',
    'Cleaning',
    'Maintenance',
    'Out of Order',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            30-Room Property Inventory &amp; Website Room Photos
          </h3>
          <p className="text-xs text-stone-500">
            {rooms.length} / 30 Rooms Configured &bull; Sector 117, Noida
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {rooms.length < 30 && (
            <button
              type="button"
              disabled={isInitializing}
              onClick={handleInit30}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isInitializing ? 'Setting Up...' : 'Auto-Setup 30 Rooms'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddCategoryModal}
            className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Room Category</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* 1-Click Inaugural Flat Offer Manager */}
      <div className="p-4 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-800 text-white text-[10px] font-extrabold uppercase tracking-wider">
                🎉 Inaugural Offer Control
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  inauguralEnabled
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {inauguralEnabled ? `LIVE ON WEBSITE (${formatINR(inauguralPrice)} / Night)` : 'OFF (Regular Tariffs)'}
              </span>
            </div>
            <h4 className="font-serif font-bold text-base text-stone-900">
              All Room Categories Flat Offer Rate (Strikethrough Regular Tariff + Offer Badge)
            </h4>
            <p className="text-xs text-stone-600">
              When turned <strong>ON</strong>, all 4 room categories show their regular tariff crossed out (e.g. <span className="line-through">₹2,000</span>) and book at your flat offer rate (<strong>{formatINR(inauguralPrice)}/night</strong>). Turning it <strong>OFF</strong> immediately restores regular room tariffs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isSavingInaugural}
              onClick={() => handleSaveInauguralOffer(!inauguralEnabled)}
              className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-colors cursor-pointer shadow-xs ${
                inauguralEnabled
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  : 'bg-stone-800 hover:bg-stone-900 text-white'
              }`}
            >
              {inauguralEnabled ? '✓ Offer is ON (Click to Turn OFF)' : 'Turn ON Inaugural Offer'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-2 border-t border-amber-200/70 items-end">
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Flat Offer Price / Night (INR)
            </label>
            <input
              type="number"
              min={100}
              value={inauguralPrice}
              onChange={(e) => setInauguralPrice(Number(e.target.value))}
              className="w-full px-3 py-1.5 text-xs font-bold border border-stone-300 rounded-lg bg-white"
            />
          </div>
          <div className="sm:col-span-7">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-700 mb-1">
              Website Offer Banner Text
            </label>
            <input
              type="text"
              value={inauguralBanner}
              onChange={(e) => setInauguralBanner(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg bg-white"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              disabled={isSavingInaugural}
              onClick={() => handleSaveInauguralOffer(inauguralEnabled)}
              className="w-full py-1.5 px-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              {isSavingInaugural ? 'Saving...' : 'Save Offer'}
            </button>
          </div>
        </div>
      </div>

      {/* Website Room Categories & Photos Manager */}
      {categories.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif font-bold text-base text-stone-900">
                Website Room Categories, Tariffs &amp; Photos ({categories.length})
              </h4>
              <p className="text-xs text-stone-500">
                Click <strong>Manage Photos</strong> on any room category to edit its regular tariff or manage its display photos from your Website Gallery
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map((cat) => {
              const catPhotos = getPhotosForRoomCategory(
                cat,
                galleryImages,
                hotel?.name || 'Sun Moon Suites'
              );
              const priceInfo = getEffectiveRoomPrice(cat, {
                ...hotel,
                inaugural_offer: {
                  is_enabled: inauguralEnabled,
                  offer_price: inauguralPrice,
                  badge_text: '🎉 Inaugural Offer',
                  banner_text: inauguralBanner,
                },
              });
              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/50 flex flex-col justify-between"
                >
                  <div className="relative h-32 bg-stone-100">
                    {catPhotos.length > 0 ? (
                      <img
                        src={catPhotos[0].url}
                        alt={cat.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = getSupabaseFallbackForMirroredMedia(catPhotos[0]?.url);
                          if (fallback && target.src !== fallback) {
                            target.src = fallback;
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-stone-900/85 text-white text-xs font-serif font-bold rounded flex items-center gap-1">
                      {priceInfo.isInauguralActive &&
                        priceInfo.originalPrice > priceInfo.effectivePrice && (
                          <span className="text-[10px] text-stone-300 line-through font-normal">
                            {formatINR(priceInfo.originalPrice)}
                          </span>
                        )}
                      <span className={priceInfo.isInauguralActive ? 'text-amber-300' : ''}>
                        {formatINR(priceInfo.effectivePrice)}
                      </span>
                    </span>
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-stone-900/85 text-amber-300 text-[10px] font-bold rounded flex items-center gap-1">
                      <Images className="w-3 h-3" />
                      <span>{catPhotos.length} {catPhotos.length === 1 ? 'Photo' : 'Photos'}</span>
                    </span>
                  </div>

                  <div className="p-3 space-y-2">
                    <div>
                      <h5 className="font-bold text-xs text-stone-900">{cat.name}</h5>
                      <p className="text-[11px] text-stone-500 truncate">
                        {cat.bed_type} &bull; {cat.room_size_sqft || 250} Sq.Ft
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => openEditCategoryModal(cat)}
                      className="w-full py-1.5 px-2.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Images className="w-3.5 h-3.5" />
                      <span>Manage {cat.name} Photos ({catPhotos.length})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floor & Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-2xs">
        {/* Floor Pills */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold uppercase text-stone-500 mr-1.5">Floor:</span>
          {(['ALL', 1, 2, 3] as const).map((fl) => (
            <button
              key={fl}
              type="button"
              onClick={() => setFloorFilter(fl)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                floorFilter === fl
                  ? 'bg-amber-800 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {fl === 'ALL' ? 'All Floors' : `Floor ${fl}`}
            </button>
          ))}
        </div>

        {/* Status Dropdown / Pills */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold uppercase text-stone-500 mr-1">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 text-xs bg-stone-100 border border-stone-200 rounded-lg font-medium text-stone-700"
          >
            <option value="ALL">All Statuses</option>
            {roomStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rooms Grid */}
      {filteredRooms.length === 0 ? (
        <EmptyState
          title="No Rooms Found"
          message="No rooms match your filter or the hotel inventory has not been initialized."
          actionLabel={rooms.length === 0 ? 'Initialize 30 Rooms' : undefined}
          onAction={rooms.length === 0 ? handleInit30 : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {filteredRooms.map((room) => {
            const statusColors: Record<RoomStatus, string> = {
              Available: 'border-emerald-300 bg-emerald-50/40 text-emerald-900',
              Occupied: 'border-rose-300 bg-rose-50/40 text-rose-900',
              Reserved: 'border-blue-300 bg-blue-50/40 text-blue-900',
              Cleaning: 'border-amber-300 bg-amber-50/40 text-amber-900',
              Maintenance: 'border-stone-400 bg-stone-100 text-stone-800',
              'Out of Order': 'border-red-400 bg-red-100 text-red-900',
            };

            return (
              <div
                key={room.id}
                className={`p-4 rounded-xl border transition-all shadow-2xs space-y-3 ${
                  statusColors[room.status] || 'border-stone-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">
                      Floor {room.floor}
                    </span>
                    <h4 className="font-mono font-bold text-2xl text-stone-900">
                      {room.room_number}
                    </h4>
                  </div>
                  <Bed className="w-5 h-5 text-stone-400" />
                </div>

                <div>
                  <span className="text-xs font-semibold text-stone-800 block truncate">
                    {room.category?.name || 'Standard'}
                  </span>
                  <span className="text-[11px] text-stone-500 font-serif">
                    {room.category?.base_price ? formatINR(room.category.base_price) : '—'} / night
                  </span>
                </div>

                {/* Quick Status Selector */}
                <div className="pt-1 border-t border-stone-200/60">
                  <select
                    value={room.status}
                    onChange={(e) =>
                      handleQuickStatusChange(room.id, e.target.value as RoomStatus)
                    }
                    className="w-full px-2 py-1 text-[11px] font-bold rounded border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-amber-700"
                  >
                    {roomStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT ROOM CATEGORY MODAL (MULTI-PHOTO GALLERY SELECTION) */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={
          editingCategoryId
            ? `Manage Photos & Tariff — ${newCatName || 'Room Category'}`
            : 'Add Room Category'
        }
        subtitle="Click multiple photos below from your Website Gallery to assign them exclusively to this room category"
        maxWidth="xl"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          {/* Selected Room Photos Strip + Gallery Selector */}
          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-800">
                  Selected Photos for {newCatName || 'This Room'} ({newCatImages.length}) *
                </label>
                <p className="text-[11px] text-stone-500">
                  Click any photo in the Gallery grid below to add or remove it from {newCatName || 'this room'}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFullGalleryPicker(true)}
                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Images className="w-3.5 h-3.5" />
                <span>Add Photo from Full Gallery ({galleryImages.length})</span>
              </button>
            </div>

            {/* Active Selected Images Strip */}
            {newCatImages.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto p-2 bg-white rounded-lg border border-emerald-200">
                {newCatImages.map((imgUrl, idx) => (
                  <div
                    key={`${imgUrl}-${idx}`}
                    className="relative w-24 h-16 rounded-md overflow-hidden shrink-0 border border-stone-200 group"
                  >
                    <img
                      src={imgUrl}
                      alt={`${newCatName} photo ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getSupabaseFallbackForMirroredMedia(imgUrl);
                        if (fallback && target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-stone-900/85 text-white text-[9px] font-bold rounded">
                      {idx === 0 ? '#1 Cover' : `#${idx + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTogglePhotoInCategory(imgUrl)}
                      className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 cursor-pointer"
                      title="Remove photo from this room"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Category Filter Pills for Gallery inside Modal (Includes the 4 Room Categories) */}
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  'ALL',
                  'Standard Room',
                  'Deluxe Room',
                  'Super Deluxe Room',
                  'Suite Room',
                  'Rooms',
                  'Hotel & Lobby',
                  'Banquet Hall',
                  'Dining',
                ] as const
              ).map((catTab) => (
                <button
                  key={catTab}
                  type="button"
                  onClick={() => setGalleryFilterInModal(catTab)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md cursor-pointer transition-colors ${
                    galleryFilterInModal === catTab
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  {catTab === 'ALL' ? `All Gallery (${galleryImages.length})` : catTab}
                </button>
              ))}
            </div>

            {/* Interactive Multi-Select Gallery Grid inside Modal */}
            {modalGalleryFiltered.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-500 bg-white rounded-lg border border-stone-200">
                No photos found in &ldquo;{galleryFilterInModal}&rdquo;. Switch to &ldquo;All Gallery&rdquo; above or upload photos in the{' '}
                <strong>Photo Gallery</strong> section first.
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto p-1">
                {modalGalleryFiltered.map((img) => {
                  const selectedIndex = newCatImages.indexOf(img.image_url);
                  const isSelected = selectedIndex !== -1;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => handleTogglePhotoInCategory(img.image_url)}
                      className={`group relative rounded-lg overflow-hidden border-2 text-left transition-all cursor-pointer bg-white ${
                        isSelected
                          ? 'border-emerald-600 ring-2 ring-emerald-500/30'
                          : 'border-stone-200 hover:border-amber-600'
                      }`}
                    >
                      <div className="aspect-video bg-stone-100 relative">
                        <img
                          src={img.image_url}
                          alt={img.caption || img.category}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallback = getSupabaseFallbackForMirroredMedia(img.image_url);
                            if (fallback && target.src !== fallback) {
                              target.src = fallback;
                            }
                          }}
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-emerald-900/25 flex items-center justify-center">
                            <span className="px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-bold rounded flex items-center gap-0.5 shadow">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              #{selectedIndex + 1} Selected
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="p-1">
                        <p className="text-[10px] font-medium text-stone-700 truncate">
                          {img.caption || img.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Category Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Deluxe Room, Executive Suite"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Base Price per Night (INR) *
            </label>
            <input
              type="number"
              required
              min={500}
              value={newCatPrice}
              onChange={(e) => setNewCatPrice(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Bed Type
              </label>
              <input
                type="text"
                value={newCatBed}
                onChange={(e) => setNewCatBed(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Room Size (Sq.Ft)
              </label>
              <input
                type="number"
                value={newCatSize}
                onChange={(e) => setNewCatSize(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Max Adults Occupancy
            </label>
            <select
              value={newCatMaxAdults}
              onChange={(e) => setNewCatMaxAdults(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n} Adults
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Air conditioned room with city view, ergonomic work desk, premium mattress..."
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
            />
          </div>

          {categoryError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{categoryError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowCategoryModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingCategory}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {isCreatingCategory ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Full Screen Gallery Picker Modal */}
      {hotel?.id && (
        <GalleryPickerModal
          isOpen={showFullGalleryPicker}
          onClose={() => setShowFullGalleryPicker(false)}
          hotelId={hotel.id}
          currentImageUrl={newCatImages[0] || ''}
          defaultCategory="ALL"
          title={`Add Photo to ${newCatName || 'Room Category'}`}
          onSelect={(imageUrl) => {
            setNewCatImages((prev) => (prev.includes(imageUrl) ? prev : [...prev, imageUrl]));
          }}
        />
      )}
    </div>
  );
};
