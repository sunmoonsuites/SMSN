import React, { useEffect, useState } from 'react';
import { Hotel, Offer } from '../../types';
import {
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
} from '../../services/offersService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Tag,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';

interface OffersManagementViewProps {
  hotel: Hotel | null;
}

export const OffersManagementView: React.FC<OffersManagementViewProps> = ({ hotel }) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Offer Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minSpend, setMinSpend] = useState<number>(0);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadOffers();
    }
  }, [hotel?.id]);

  const loadOffers = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getOffers(hotel.id, false);
    setOffers(data);
    setIsLoading(false);
  };

  const handleToggleActive = async (offer: Offer) => {
    if (!hotel?.id) return;
    const res = await updateOffer(offer.id, hotel.id, {
      is_active: !offer.is_active,
    });
    if (res.success) {
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, is_active: !o.is_active } : o))
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!hotel?.id) return;
    const res = await deleteOffer(id, hotel.id);
    if (res.success) {
      setOffers((prev) => prev.filter((o) => o.id !== id));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !code.trim() || !title.trim()) return;
    setIsSubmitting(true);

    const res = await createOffer({
      hotel_id: hotel.id,
      promo_code: code.trim().toUpperCase(),
      title: title.trim(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_booking_amount: Number(minSpend),
      start_date: startDate,
      end_date: endDate,
      description: description.trim() || undefined,
      is_active: true,
    });

    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setCode('');
      setTitle('');
      setDescription('');
      loadOffers();
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Fetching promo codes and discount offers..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Special Offers &amp; Promo Codes
          </h3>
          <p className="text-xs text-stone-500">
            Manage promotional discounts applied during direct website booking engine checkout
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Promo Code</span>
        </button>
      </div>

      {/* Offers Grid */}
      {offers.length === 0 ? (
        <EmptyState
          title="No Special Offers"
          message="No active promotional codes configured. Add codes like 'WELCOME10' for direct booking discounts."
          actionLabel="Create Promo Code"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className={`p-5 bg-white rounded-xl border transition-all shadow-2xs space-y-4 ${
                offer.is_active ? 'border-stone-200' : 'border-stone-200 opacity-60 bg-stone-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-sm bg-amber-100 text-amber-900 px-2.5 py-1 rounded border border-amber-300 tracking-wider">
                    {offer.promo_code}
                  </span>
                  <h4 className="font-serif font-bold text-base text-stone-900 mt-2">
                    {offer.title}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-xl font-serif font-bold text-amber-800">
                    {offer.discount_type === 'percentage'
                      ? `${offer.discount_value}% OFF`
                      : `${formatINR(offer.discount_value)} OFF`}
                  </span>
                </div>
              </div>

              {offer.description && (
                <p className="text-xs text-stone-600 line-clamp-2">{offer.description}</p>
              )}

              <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>
                    Valid: {formatDate(offer.start_date)} &rarr; {formatDate(offer.end_date)}
                  </span>
                </div>
                {offer.min_booking_amount > 0 && (
                  <div>Min Booking Spend: {formatINR(offer.min_booking_amount)}</div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(offer)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded cursor-pointer ${
                    offer.is_active
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-stone-200 text-stone-700'
                  }`}
                >
                  {offer.is_active ? 'Active' : 'Disabled'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(offer.id)}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD OFFER MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Promotional Code"
        subtitle="Configure discount percentage or flat INR value for website bookings"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Promo Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. WELCOME10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono font-bold uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Offer Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Welcome Discount"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Discount Type
              </label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                required
                min={1}
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Valid From
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Valid To
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Minimum Booking Spend (INR)
            </label>
            <input
              type="number"
              min={0}
              value={minSpend}
              onChange={(e) => setMinSpend(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Get flat 10% instant discount on direct website reservations..."
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
              {isSubmitting ? 'Saving...' : 'Save Promo Code'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
