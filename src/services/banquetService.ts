import { getSupabase } from '../lib/supabase';
import { BanquetEnquiry } from '../types';

const LOCAL_STORAGE_BANQUET_KEY = 'pms_banquet_enquiries';

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
  const newEnquiry: BanquetEnquiry = {
    id: `banquet-${Date.now()}`,
    ...enquiry,
    status: 'New',
    created_at: new Date().toISOString(),
  };

  // Always store locally first
  const existing = getStoredEnquiries();
  saveStoredEnquiries([newEnquiry, ...existing]);

  // Sync with Supabase if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('banquet_enquiries').insert([
        {
          ...enquiry,
          status: 'New',
        },
      ]);
    } catch (e) {
      console.warn('Supabase banquet enquiry sync failed; stored locally:', e);
    }
  }

  return { success: true };
}

export async function getBanquetEnquiries(hotelId: string): Promise<BanquetEnquiry[]> {
  const local = getStoredEnquiries().filter((e) => !e.hotel_id || e.hotel_id === hotelId);
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('banquet_enquiries')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as BanquetEnquiry[];
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
  // Update local
  const current = getStoredEnquiries();
  const updated = current.map((e) => (e.id === id ? { ...e, status } : e));
  saveStoredEnquiries(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('banquet_enquiries').update({ status }).eq('id', id);
    } catch (e) {
      console.warn(e);
    }
  }

  return { success: true };
}
