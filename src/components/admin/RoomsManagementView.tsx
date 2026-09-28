import React, { useEffect, useState } from 'react';
import { Hotel, Room, RoomCategory, RoomStatus } from '../../types';
import {
  getRooms,
  getRoomCategories,
  updateRoomStatus,
  initialize30Rooms,
  createRoomCategory,
  updateRoomCategory,
} from '../../services/roomsService';
import { uploadImageToSupabase } from '../../services/storageService';
import { formatINR } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Bed,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

interface RoomsManagementViewProps {
  hotel: Hotel | null;
}

export const RoomsManagementView: React.FC<RoomsManagementViewProps> = ({ hotel }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [floorFilter, setFloorFilter] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Category modal (Create or Edit)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatPrice, setNewCatPrice] = useState(2500);
  const [newCatBed, setNewCatBed] = useState('King Bed');
  const [newCatSize, setNewCatSize] = useState(280);
  const [newCatMaxAdults, setNewCatMaxAdults] = useState(2);
  const [newCatImageUrl, setNewCatImageUrl] = useState('');
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');

  // 30 Rooms Auto-Setup
  const [isInitializing, setIsInitializing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (hotel?.id) {
      loadData();
    }
  }, [hotel?.id]);

  const loadData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [roomsData, catsData] = await Promise.all([
      getRooms(hotel.id),
      getRoomCategories(hotel.id, false),
    ]);
    setRooms(roomsData);
    setCategories(catsData);
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

  const openAddCategoryModal = () => {
    setEditingCategoryId(null);
    setNewCatName('');
    setNewCatDesc('');
    setNewCatPrice(2500);
    setNewCatBed('King Bed');
    setNewCatSize(280);
    setNewCatMaxAdults(2);
    setNewCatImageUrl('');
    setCategoryError('');
    setShowCategoryModal(true);
  };

  const openEditCategoryModal = (cat: RoomCategory) => {
    setEditingCategoryId(cat.id);
    setNewCatName(cat.name);
    setNewCatDesc(cat.description || '');
    setNewCatPrice(Number(cat.base_price));
    setNewCatBed(cat.bed_type || 'King Bed');
    setNewCatSize(Number(cat.room_size_sqft || 250));
    setNewCatMaxAdults(Number(cat.max_adults || 2));
    setNewCatImageUrl(cat.images?.[0] || '');
    setCategoryError('');
    setShowCategoryModal(true);
  };

  const handleCategoryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCatImage(true);
    setCategoryError('');

    const res = await uploadImageToSupabase(file, 'rooms');
    setIsUploadingCatImage(false);

    if (res.success && res.publicUrl) {
      setNewCatImageUrl(res.publicUrl);
    } else {
      setCategoryError(res.error || 'Failed to upload image to Supabase Storage.');
    }
    e.target.value = '';
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !newCatName.trim()) return;

    setIsCreatingCategory(true);
    setCategoryError('');

    const imagesArray = newCatImageUrl.trim()
      ? [newCatImageUrl.trim()]
      : ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'];

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
        setMessage(`Updated "${newCatName.trim()}" photo & tariff in Supabase!`);
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
      setNewCatImageUrl('');
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

      {/* Website Room Categories & Photos Manager */}
      {categories.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-serif font-bold text-base text-stone-900">
                Website Room Categories, Tariffs &amp; Photos ({categories.length})
              </h4>
              <p className="text-xs text-stone-500">
                Click <strong>Change Photo / Tariff</strong> on any category to upload a room photo to Supabase Storage (<code>hotel-media/rooms/</code>)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50/50 flex flex-col justify-between"
              >
                <div className="relative h-32 bg-stone-100">
                  {cat.images && cat.images[0] ? (
                    <img
                      src={cat.images[0]}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-stone-900/85 text-white text-xs font-serif font-bold rounded">
                    {formatINR(cat.base_price)}
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
                    <Upload className="w-3.5 h-3.5" />
                    <span>Change Photo / Tariff</span>
                  </button>
                </div>
              </div>
            ))}
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

      {/* ADD / EDIT ROOM CATEGORY MODAL */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title={editingCategoryId ? 'Edit Room Category & Photo' : 'Add Room Category'}
        subtitle="Upload room photo to Supabase Storage (hotel-media) and configure pricing"
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          {/* Upload Room Photo to Supabase Storage */}
          <div className="p-3.5 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/40 space-y-2 text-center">
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>
                {isUploadingCatImage
                  ? 'Uploading to Supabase...'
                  : 'Upload Room Photo to Supabase'}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCategoryFileUpload}
                disabled={isUploadingCatImage}
                className="hidden"
              />
            </label>
            <p className="text-[11px] text-stone-500">
              Saves photo in Supabase Storage bucket <code>hotel-media/rooms/</code>
            </p>
          </div>

          {newCatImageUrl && (
            <div className="aspect-video w-full rounded-lg overflow-hidden border border-stone-200 bg-stone-100">
              <img
                src={newCatImageUrl}
                alt="Room preview"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Room Image URL (Supabase Storage URL)
            </label>
            <input
              type="url"
              placeholder="https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/..."
              value={newCatImageUrl}
              onChange={(e) => setNewCatImageUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
            />
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
              disabled={isCreatingCategory || isUploadingCatImage}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {isCreatingCategory ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
