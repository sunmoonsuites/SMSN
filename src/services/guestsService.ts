import { getSupabase } from '../lib/supabase';
import { Guest, Booking } from '../types';
import { logAction } from './auditService';

function getLocalGuests(hotelId: string): Guest[] {
  try {
    const saved = localStorage.getItem('sunmoon_local_guests');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((g: any) => g.hotel_id === hotelId) : [];
    }
  } catch {
    // Ignore storage issues
  }
  return [];
}

function saveLocalGuest(guest: Guest) {
  try {
    const saved = localStorage.getItem('sunmoon_local_guests');
    const list: Guest[] = saved ? JSON.parse(saved) : [];
    const filtered = list.filter((g) => g.id !== guest.id && g.phone !== guest.phone);
    filtered.unshift(guest);
    localStorage.setItem('sunmoon_local_guests', JSON.stringify(filtered.slice(0, 200)));
  } catch {
    // Ignore storage issues
  }
}

export async function getGuests(hotelId: string, searchTerm: string = ''): Promise<Guest[]> {
  const localGuests = getLocalGuests(hotelId);
  const supabase = getSupabase();
  if (!supabase) return localGuests;

  try {
    let query = supabase.from('guests').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false });

    if (searchTerm.trim()) {
      const term = `%${searchTerm.trim()}%`;
      query = query.or(`first_name.ilike.${term},last_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    const dbGuests = (data as Guest[]) || [];
    const dbPhones = new Set(dbGuests.map((g) => g.phone));
    return [...dbGuests, ...localGuests.filter((lg) => !dbPhones.has(lg.phone))];
  } catch (err) {
    console.warn('Could not fetch guests from Supabase database, returning cached guests:', err);
    return localGuests;
  }
}

export async function findOrCreateGuest(
  hotelId: string,
  guestData: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string;
    id_type?: Guest['id_type'];
    id_number?: string;
    address?: string;
    city?: string;
    state?: string;
  }
): Promise<Guest | null> {
  const localGuests = getLocalGuests(hotelId);
  const trimmedPhone = guestData.phone.trim();
  const supabase = getSupabase();

  let existing: Guest | null = null;

  if (supabase) {
    try {
      // Check if guest exists with this phone number in this hotel
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('hotel_id', hotelId)
        .eq('phone', trimmedPhone)
        .maybeSingle();

      if (!error && data) {
        existing = data as Guest;
      }
    } catch {
      // If select failed or RLS blocked, fallback to local search
    }
  }

  if (!existing) {
    existing = localGuests.find((g) => g.phone === trimmedPhone) || null;
  }

  if (existing) {
    // Update missing info
    const updates: Partial<Guest> = {};
    if (guestData.email && !existing.email) updates.email = guestData.email;
    if (guestData.id_type && !existing.id_type) updates.id_type = guestData.id_type;
    if (guestData.id_number && !existing.id_number) updates.id_number = guestData.id_number;

    if (Object.keys(updates).length > 0) {
      if (supabase && !existing.id.startsWith('local-')) {
        try {
          await supabase.from('guests').update(updates).eq('id', existing.id);
        } catch (updateErr) {
          console.warn('Could not update guest in Supabase:', updateErr);
        }
      }
      const merged = { ...existing, ...updates } as Guest;
      saveLocalGuest(merged);
      return merged;
    }
    return existing;
  }

  const guestPayload = {
    hotel_id: hotelId,
    first_name: guestData.first_name.trim(),
    last_name: guestData.last_name.trim(),
    phone: trimmedPhone,
    email: guestData.email?.trim() || null,
    id_type: guestData.id_type || null,
    id_number: guestData.id_number?.trim() || null,
    address: guestData.address?.trim() || null,
    city: guestData.city?.trim() || null,
    state: guestData.state?.trim() || null,
  };

  // Insert new guest into Supabase
  if (supabase) {
    try {
      const { data: newGuest, error } = await supabase
        .from('guests')
        .insert([guestPayload])
        .select()
        .single();

      if (error) throw error;
      if (newGuest) {
        saveLocalGuest(newGuest as Guest);
        try {
          await logAction(hotelId, `Registered New Guest: ${guestData.first_name} ${guestData.last_name}`, 'Guest', newGuest.id);
        } catch {
          // Ignore audit log error
        }
        return newGuest as Guest;
      }
    } catch (err: any) {
      if (err?.code === '42501' || err?.message?.includes('row-level security')) {
        console.warn(
          'Supabase RLS Policy restriction on "guests" table (Code 42501). Falling back to local guest storage. Please execute the RLS policy fix in Supabase SQL Editor.',
          err
        );
      } else {
        console.warn('Could not insert guest into Supabase, saving locally:', err);
      }
    }
  }

  // Fallback: Store locally so guest info is not lost and can be viewed
  const fallbackGuest: Guest = {
    id: `local-guest-${Date.now()}`,
    hotel_id: hotelId,
    first_name: guestPayload.first_name,
    last_name: guestPayload.last_name,
    phone: guestPayload.phone,
    email: guestPayload.email || undefined,
    id_type: (guestPayload.id_type || undefined) as Guest['id_type'],
    id_number: guestPayload.id_number || undefined,
    address: guestPayload.address || undefined,
    city: guestPayload.city || undefined,
    state: guestPayload.state || undefined,
    total_stays: 1,
    total_spent: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveLocalGuest(fallbackGuest);
  return fallbackGuest;
}

export async function updateGuest(
  id: string,
  hotelId: string,
  updates: Partial<Guest>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  if (id.startsWith('local-') || !supabase) {
    const local = getLocalGuests(hotelId).find((g) => g.id === id);
    if (local) {
      saveLocalGuest({ ...local, ...updates });
      return { success: true };
    }
    if (!supabase) return { success: false, error: 'Database configuration required' };
  }

  try {
    const { error } = await supabase.from('guests').update(updates).eq('id', id);
    if (error) throw error;
    try {
      await logAction(hotelId, `Updated Guest Profile`, 'Guest', id, updates);
    } catch {
      // Ignore audit log error
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Could not update guest in Supabase:', err);
    return { success: false, error: err.message };
  }
}

export async function getGuestBookings(guestId: string): Promise<Booking[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_rooms(*, room:rooms(*), category:room_categories(*))')
      .eq('guest_id', guestId)
      .order('check_in_date', { ascending: false });

    if (error) throw error;
    return (data as Booking[]) || [];
  } catch (err) {
    console.error('Error fetching guest bookings:', err);
    return [];
  }
}
