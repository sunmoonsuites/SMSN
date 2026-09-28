import { getSupabase } from '../lib/supabase';
import { BanquetEnquiry } from '../types';
import { isValidUuid, resolveSupabaseHotelId } from './hotelService';

const LOCAL_STORAGE_BANQUET_KEY = 'pms_banquet_enquiries';
const BANQUET_NOTE_PREFIX = 'BANQUET_ENQUIRY::';

function getStoredEnquiries(): BanquetEnquiry[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BANQUET_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

function saveStoredEnquiries(enquiries: BanquetEnquiry[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_BANQUET_KEY, JSON.stringify(enquiries));
  } catch (e) {
    console.warn(e);
  }
}

export async function createBanquetEnquiry(
  enquiry: Omit<BanquetEnquiry, 'id' | 'status' | 'created_at'>
): Promise<{ success: boolean; error?: string }> {
  let newEnquiry: BanquetEnquiry = {
    id: `banquet-${Date.now()}`,
    ...enquiry,
    status: 'New',
    created_at: new Date().toISOString(),
  };

  // Sync with Supabase `public.enquiries` table (which exists in initial_schema.sql)
  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(enquiry.hotel_id);
      if (resolvedHotelId) {
        const metaJson = JSON.stringify({
          event_type: enquiry.event_type,
          event_date: enquiry.event_date,
          guest_count: enquiry.guest_count,
          phone: enquiry.phone,
        });

        const { data: inserted } = await supabase
          .from('enquiries')
          .insert([
            {
              hotel_id: resolvedHotelId,
              name: enquiry.name,
              email: enquiry.email || 'banquet@sunmoonsuites.com',
              mobile: enquiry.phone,
              message: `[Banquet Enquiry] ${enquiry.event_type} for ${enquiry.guest_count} guests on ${enquiry.event_date || 'Flexible Date'}`,
              status: 'New',
              internal_notes: `${BANQUET_NOTE_PREFIX}${metaJson}`,
            },
          ])
          .select('*')
          .single();

        if (inserted?.id) {
          newEnquiry = {
            ...newEnquiry,
            id: inserted.id,
            hotel_id: resolvedHotelId,
            created_at: inserted.created_at || newEnquiry.created_at,
          };
        }
      }
    } catch (e) {
      console.warn('Supabase banquet enquiry sync failed; stored locally:', e);
    }
  }

  const existing = getStoredEnquiries();
  saveStoredEnquiries([newEnquiry, ...existing]);

  return { success: true };
}

export async function getBanquetEnquiries(hotelId: string): Promise<BanquetEnquiry[]> {
  const local = getStoredEnquiries();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        const { data, error } = await supabase
          .from('enquiries')
          .select('*')
          .eq('hotel_id', resolvedHotelId)
          .like('internal_notes', `${BANQUET_NOTE_PREFIX}%`)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const parsed: BanquetEnquiry[] = data.map((row: any) => {
            let meta: any = {};
            try {
              const jsonPart = (row.internal_notes || '').replace(BANQUET_NOTE_PREFIX, '');
              meta = JSON.parse(jsonPart);
            } catch {}
            return {
              id: row.id,
              hotel_id: row.hotel_id,
              name: row.name,
              phone: row.mobile || meta.phone || '',
              email: row.email === 'banquet@sunmoonsuites.com' ? '' : row.email,
              event_type: meta.event_type || 'Banquet Event',
              event_date: meta.event_date || '',
              guest_count: Number(meta.guest_count || 50),
              status: row.status || 'New',
              created_at: row.created_at,
            };
          });
          saveStoredEnquiries(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Using local banquet enquiries:', e);
    }
  }

  return local;
}

export async function updateBanquetEnquiryStatus(
  id: string,
  hotelId: string,
  status: BanquetEnquiry['status']
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredEnquiries();
  const updated = current.map((e) => (e.id === id ? { ...e, status } : e));
  saveStoredEnquiries(updated);

  const supabase = getSupabase();
  if (supabase && isValidUuid(id)) {
    try {
      await supabase.from('enquiries').update({ status }).eq('id', id);
    } catch (e) {
      console.warn(e);
    }
  }

  return { success: true };
}
