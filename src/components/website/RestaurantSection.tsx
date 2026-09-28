import React, { useEffect, useState } from 'react';
import { Hotel, RestaurantItem } from '../../types';
import { getRestaurantItems } from '../../services/restaurantService';
import { formatINR } from '../../lib/utils';
import { Utensils } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface RestaurantSectionProps {
  hotel: Hotel | null;
}

export const RestaurantSection: React.FC<RestaurantSectionProps> = ({ hotel }) => {
  const [items, setItems] = useState<RestaurantItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hotel?.id) {
      loadItems();
    }
  }, [hotel?.id]);

  const loadItems = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getRestaurantItems(hotel.id, true);
    setItems(data);
    setIsLoading(false);
  };

  return (
    <section id="restaurant" className="py-20 bg-stone-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Dining &bull; Ground Floor
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            The Hotel Dining Room
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Located conveniently on the Ground Floor next to reception. Serving freshly cooked North Indian, Continental, and Chinese favorites, available for dine-in and 24-hr in-room dining.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-stone-200 rounded-xl h-24" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Restaurant Menu Under Preparation"
            message="No active restaurant menu items are currently published in the database. Menu items can be managed from the Staff PMS Portal."
            icon={<Utensils className="w-6 h-6 text-stone-400" />}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-white rounded-xl border border-stone-200 shadow-2xs hover:border-amber-300 transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {/* Veg / Non-veg dot symbol common in India */}
                    <span
                      className={`inline-flex items-center justify-center w-4 h-4 rounded-xs border p-0.5 ${
                        item.is_veg
                          ? 'border-emerald-700 text-emerald-700'
                          : 'border-rose-700 text-rose-700'
                      }`}
                      title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.is_veg ? 'bg-emerald-700' : 'bg-rose-700'
                        }`}
                      />
                    </span>
                    <h4 className="font-serif font-bold text-stone-900 text-sm">{item.name}</h4>
                  </div>
                  {item.description && (
                    <p className="text-xs text-stone-500 leading-relaxed max-w-sm">
                      {item.description}
                    </p>
                  )}
                  {item.category?.name && (
                    <span className="inline-block text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                      {item.category.name}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-serif font-bold text-sm text-stone-900">
                    {formatINR(item.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
