import { getSupabase } from '../lib/supabase';
import { Offer } from '../types';
import { logAction } from './auditService';
import {
  isValidUuid,
  resolveSupabaseHotelId,
  getEffectiveRoomPrice,
} from './hotelService';

const LOCAL_STORAGE_OFFERS_KEY = 'pms_custom_offers';

export const DEFAULT_OFFERS: Offer[] = [
  {
    id: 'offer-welcome10',
    hotel_id: 'default-hotel-id',
    title: 'Direct Booking Special',
    description:
      'Get an exclusive 10% instant discount when you book directly with us through our official website.',
    promo_code: 'WELCOME10',
    discount_type: 'percentage',
    discount_value: 10,
    min_booking_amount: 1000,
    start_date: '2025-01-01',
    end_date: '2028-12-31',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'offer-sunmoon15',
    hotel_id: 'default-hotel-id',
    title: 'Luxury Weekend Retreat',
    description: 'Enjoy 15% off on stays above ₹4,000 for Executive and Suite reservations.',
    promo_code: 'SUNMOON15',
    discount_type: 'percentage',
    discount_value: 15,
    min_booking_amount: 4000,
    start_date: '2025-01-01',
    end_date: '2028-12-31',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'offer-flat500',
    hotel_id: 'default-hotel-id',
    title: 'Early Bird Flat ₹500 Off',
    description: 'Flat ₹500 off on any room reservation with instant confirmation.',
    promo_code: 'FLAT500',
    discount_type: 'flat',
    discount_value: 500,
    min_booking_amount: 2000,
    start_date: '2025-01-01',
    end_date: '2028-12-31',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getStoredOffers(): Offer[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_OFFERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_OFFERS;
}

function saveStoredOffers(offers: Offer[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_OFFERS_KEY, JSON.stringify(offers));
  } catch (e) {
    console.warn(e);
  }
}

export async function getOffers(hotelId: string, activeOnly: boolean = false): Promise<Offer[]> {
  const localOffers = getStoredOffers();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        const { data: allDbOffers, error } = await supabase
          .from('offers')
          .select('*')
          .eq('hotel_id', resolvedHotelId)
          .order('created_at', { ascending: false });

        if (!error && allDbOffers) {
          if (allDbOffers.length === 0 && localOffers.length > 0) {
            // Seed initial offers into Supabase once so Supabase is the Single Source of Truth
            const seedRows = localOffers.map((o) => ({
              hotel_id: resolvedHotelId,
              title: o.title,
              description: o.description || '',
              promo_code: o.promo_code.toUpperCase(),
              discount_type: o.discount_type,
              discount_value: Number(o.discount_value),
              min_booking_amount: Number(o.min_booking_amount || 0),
              start_date: o.start_date || '2025-01-01',
              end_date: o.end_date || '2028-12-31',
              is_active: o.is_active !== false,
              image_url: o.image_url || null,
              terms: o.terms || null,
            }));

            const { data: seeded } = await supabase
              .from('offers')
              .upsert(seedRows, { onConflict: 'hotel_id,promo_code' })
              .select('*');

            if (seeded && seeded.length > 0) {
              saveStoredOffers(seeded as Offer[]);
              if (activeOnly) {
                const today = new Date().toISOString().split('T')[0];
                return (seeded as Offer[]).filter(
                  (o) => o.is_active && o.start_date <= today && o.end_date >= today
                );
              }
              return seeded as Offer[];
            }
          } else {
            saveStoredOffers(allDbOffers as Offer[]);
            if (activeOnly) {
              const today = new Date().toISOString().split('T')[0];
              return (allDbOffers as Offer[]).filter(
                (o) => o.is_active && o.start_date <= today && o.end_date >= today
              );
            }
            return allDbOffers as Offer[];
          }
        }
      }
    } catch (err) {
      console.warn('Using local offers (DB pending):', err);
    }
  }

  if (activeOnly) {
    const today = new Date().toISOString().split('T')[0];
    return localOffers.filter(
      (o) => o.is_active && o.start_date <= today && o.end_date >= today
    );
  }

  return localOffers;
}

export async function validatePromoCode(
  hotelId: string,
  code: string,
  bookingAmount: number
): Promise<{ valid: boolean; discountAmount: number; message: string; offer?: Offer }> {
  const { isInauguralActive } = getEffectiveRoomPrice({ base_price: 1500 });
  if (isInauguralActive) {
    return {
      valid: false,
      discountAmount: 0,
      message: 'Inaugural Offer is already applied. Additional coupon codes cannot be combined.',
    };
  }

  const normalizedCode = code.trim().toUpperCase();
  const allOffers = await getOffers(hotelId, true);

  const offer = allOffers.find((o) => o.promo_code.toUpperCase() === normalizedCode);

  if (!offer) {
    return {
      valid: false,
      discountAmount: 0,
      message: 'Invalid or expired promo code. Try WELCOME10 or FLAT500.',
    };
  }

  if (offer.min_booking_amount && bookingAmount < Number(offer.min_booking_amount)) {
    return {
      valid: false,
      discountAmount: 0,
      message: `This coupon requires a minimum booking amount of ₹${offer.min_booking_amount}`,
    };
  }

  let discount = 0;
  if (offer.discount_type === 'percentage') {
    discount = Math.round((bookingAmount * Number(offer.discount_value)) / 100);
  } else {
    discount = Math.min(bookingAmount, Number(offer.discount_value));
  }

  return {
    valid: true,
    discountAmount: discount,
    message: `Coupon '${offer.promo_code}' applied! Saved ₹${discount}`,
    offer,
  };
}

export async function createOffer(
  offerData: Omit<Offer, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Offer; error?: string }> {
  let newOffer: Offer = {
    id: `offer-${Date.now()}`,
    ...offerData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(offerData.hotel_id);
      if (resolvedHotelId) {
        const dbPayload = {
          ...offerData,
          hotel_id: resolvedHotelId,
          promo_code: offerData.promo_code.toUpperCase(),
        };
        const { data: inserted } = await supabase
          .from('offers')
          .upsert([dbPayload], { onConflict: 'hotel_id,promo_code' })
          .select('*')
          .single();

        if (inserted) {
          newOffer = inserted as Offer;
        }
      }
    } catch (e) {
      console.warn('Supabase offer insert skipped; stored locally:', e);
    }
  }

  const current = getStoredOffers();
  saveStoredOffers([newOffer, ...current.filter((o) => o.id !== newOffer.id)]);

  try {
    if (isValidUuid(newOffer.hotel_id)) {
      await logAction(
        newOffer.hotel_id,
        `Created Promotional Offer: ${offerData.title} (${offerData.promo_code})`,
        'Offer',
        newOffer.id
      );
    }
  } catch {}

  return { success: true, data: newOffer };
}

export async function updateOffer(
  id: string,
  hotelId: string,
  updates: Partial<Offer>
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredOffers();
  const targetOffer = current.find((o) => o.id === id);
  const updated = current.map((o) =>
    o.id === id ? { ...o, ...updates, updated_at: new Date().toISOString() } : o
  );
  saveStoredOffers(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (isValidUuid(id)) {
        await supabase.from('offers').update(updates).eq('id', id);
      } else if (resolvedHotelId && targetOffer?.promo_code) {
        await supabase
          .from('offers')
          .update(updates)
          .eq('hotel_id', resolvedHotelId)
          .eq('promo_code', targetOffer.promo_code);
      }
    } catch (e) {
      console.warn('Supabase offer update skipped; updated locally:', e);
    }
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
    if (resolvedHotelId) {
      await logAction(resolvedHotelId, `Updated Offer`, 'Offer', id, updates);
    }
  } catch {}

  return { success: true };
}

export async function deleteOffer(
  id: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredOffers();
  const targetOffer = current.find((o) => o.id === id);
  const filtered = current.filter((o) => o.id !== id);
  saveStoredOffers(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (isValidUuid(id)) {
        await supabase.from('offers').delete().eq('id', id);
      } else if (resolvedHotelId && targetOffer?.promo_code) {
        await supabase
          .from('offers')
          .delete()
          .eq('hotel_id', resolvedHotelId)
          .eq('promo_code', targetOffer.promo_code);
      }
    } catch (e) {
      console.warn('Supabase offer delete skipped; deleted locally:', e);
    }
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
    if (resolvedHotelId) {
      await logAction(resolvedHotelId, `Deleted Offer`, 'Offer', id);
    }
  } catch {}

  return { success: true };
}
