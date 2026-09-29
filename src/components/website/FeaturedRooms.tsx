import React, { useEffect, useState } from 'react';
import { Hotel, RoomCategory } from '../../types';
import { getRoomCategories, DEFAULT_ROOM_CATEGORIES } from '../../services/roomsService';
import { formatINR } from '../../lib/utils';
import { Bed, Users, Maximize2, ArrowRight } from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

interface FeaturedRoomsProps {
  hotel: Hotel | null;
  onSelectCategoryForBooking: (categoryId: string) => void;
}

export const FeaturedRooms: React.FC<FeaturedRoomsProps> = ({
  hotel,
  onSelectCategoryForBooking,
}) => {
  const [categories, setCategories] = useState<RoomCategory[]>(DEFAULT_ROOM_CATEGORIES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadCategories();
    }
  }, [hotel?.id]);

  const loadCategories = async () => {
    if (!hotel?.id) return;
    const data = await getRoomCategories(hotel.id, true);
    if (data && data.length > 0) {
      setCategories(data);
    }
    setIsLoading(false);
  };

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
            30 thoughtfully designed rooms spread across 3 floors. Each room features premium bedding, work desks, and climate control for business and leisure travelers in Noida.
          </p>
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
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Room Image or Placeholder */}
                <div className="relative h-56 bg-stone-100 flex items-center justify-center overflow-hidden">
                  {cat.images && cat.images.length > 0 ? (
                    <img
                      src={cat.images[0]}
                      alt={`${cat.name} at Sun Moon Suites Sector 117 Noida`}
                      width={600}
                      height={400}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6">
                      <Bed className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                      <span className="text-xs text-stone-400 font-medium">{cat.name}</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-stone-900/85 backdrop-blur-xs text-white px-3 py-1 rounded-full text-xs font-serif font-bold">
                    {formatINR(cat.base_price)} <span className="text-[10px] font-sans font-normal opacity-80">/ night</span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-stone-900 mb-1">
                      {cat.name}
                    </h3>
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

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectCategoryForBooking(cat.id)}
                      className="w-full py-2.5 bg-stone-900 hover:bg-amber-800 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Book Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
