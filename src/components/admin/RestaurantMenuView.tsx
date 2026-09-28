import React, { useEffect, useState } from 'react';
import { Hotel, RestaurantItem, RestaurantCategory } from '../../types';
import {
  getRestaurantItems,
  getRestaurantCategories,
  createRestaurantCategory,
  createRestaurantItem,
  updateRestaurantItem,
  deleteRestaurantItem,
} from '../../services/restaurantService';
import { formatINR } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Utensils,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react';

interface RestaurantMenuViewProps {
  hotel: Hotel | null;
}

export const RestaurantMenuView: React.FC<RestaurantMenuViewProps> = ({ hotel }) => {
  const [items, setItems] = useState<RestaurantItem[]>([]);
  const [categoriesList, setCategoriesList] = useState<RestaurantCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [selectedCategoryName, setSelectedCategoryName] = useState('Main Course');
  const [price, setPrice] = useState<number>(350);
  const [isVeg, setIsVeg] = useState(true);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadMenu();
    }
  }, [hotel?.id]);

  const loadMenu = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [itemsData, catsData] = await Promise.all([
      getRestaurantItems(hotel.id, false),
      getRestaurantCategories(hotel.id),
    ]);
    setItems(itemsData);
    setCategoriesList(catsData);
    setIsLoading(false);
  };

  const handleToggleAvailable = async (item: RestaurantItem) => {
    if (!hotel?.id) return;
    const res = await updateRestaurantItem(item.id, hotel.id, {
      is_available: !item.is_available,
    });
    if (res.success) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!hotel?.id) return;
    const res = await deleteRestaurantItem(id, hotel.id);
    if (res.success) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !name.trim()) return;
    setIsSubmitting(true);

    // Find or create category
    let targetCatId: string | undefined = categoriesList.find(
      (c) => c.name.toLowerCase() === selectedCategoryName.toLowerCase()
    )?.id;

    if (!targetCatId) {
      const newCatRes = await createRestaurantCategory(hotel.id, selectedCategoryName);
      if (newCatRes.success && newCatRes.data) {
        targetCatId = newCatRes.data.id;
        setCategoriesList((prev) => [...prev, newCatRes.data!]);
      }
    }

    const res = await createRestaurantItem({
      hotel_id: hotel.id,
      name: name.trim(),
      category_id: targetCatId,
      price,
      is_veg: isVeg,
      description: description.trim() || undefined,
      is_available: true,
    });

    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setName('');
      setDescription('');
      loadMenu();
    }
  };

  const defaultCategories = [
    'Breakfast',
    'Starters & Appetizers',
    'Main Course',
    'Breads & Rice',
    'Desserts',
    'Beverages',
  ];

  const categories = categoriesList.length > 0 ? categoriesList.map((c) => c.name) : defaultCategories;

  const filtered = items.filter((item) => {
    const itemCat = item.category?.name || 'General';
    if (categoryFilter !== 'ALL' && itemCat !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q);
    }
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner message="Fetching dining menu items..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Restaurant &amp; Dining Menu
          </h3>
          <p className="text-xs text-stone-500">
            The Saffron Spices &bull; Multi-cuisine dining &amp; 24x7 in-room dining
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Menu Dish</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search dish name or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg font-medium text-stone-700"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Menu Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No Dishes Found"
          message={
            items.length === 0
              ? 'No menu items have been added yet to the restaurant database.'
              : 'No menu items match your search or filter.'
          }
          actionLabel={items.length === 0 ? 'Add First Dish' : undefined}
          onAction={items.length === 0 ? () => setShowAddModal(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-white rounded-xl border transition-all shadow-2xs space-y-3 ${
                item.is_available ? 'border-stone-200' : 'border-stone-200 opacity-60 bg-stone-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {/* Veg / Non-Veg badge */}
                  <span
                    className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                      item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    />
                  </span>
                  <h4 className="font-serif font-bold text-sm text-stone-900">{item.name}</h4>
                </div>

                <span className="font-serif font-bold text-sm text-stone-900">
                  {formatINR(item.price)}
                </span>
              </div>

              <p className="text-xs text-stone-600 line-clamp-2">
                {item.description || 'Authentic multi-cuisine preparation.'}
              </p>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-600 font-medium">
                  {item.category?.name || 'General'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleAvailable(item)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded cursor-pointer ${
                      item.is_available
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.is_available ? 'In Stock' : 'Out of Stock'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1 text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MENU ITEM MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Restaurant Dish"
        subtitle="The Saffron Spices &bull; In-Room Dining Menu"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Dish Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paneer Butter Masala, Murgh Biryani"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Category
              </label>
              <select
                value={selectedCategoryName}
                onChange={(e) => setSelectedCategoryName(e.target.value)}
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
                Price (INR) *
              </label>
              <input
                type="number"
                required
                min={20}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-serif font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Dietary Classification
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                <input
                  type="radio"
                  name="veg"
                  checked={isVeg}
                  onChange={() => setIsVeg(true)}
                />
                <span>Vegetarian (Green Dot)</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-stone-700 cursor-pointer">
                <input
                  type="radio"
                  name="veg"
                  checked={!isVeg}
                  onChange={() => setIsVeg(false)}
                />
                <span>Non-Vegetarian (Red Dot)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Description / Ingredients
            </label>
            <textarea
              rows={2}
              placeholder="Fresh cottage cheese cooked in creamy tomato butter gravy, served hot..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
            >
              {isSubmitting ? 'Saving...' : 'Add to Menu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
