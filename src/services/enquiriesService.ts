import { getSupabase } from '../lib/supabase';
import { Enquiry } from '../types';
import { logAction } from './auditService';
import { emitPMSNotification } from './notificationService';

const LOCAL_ENQUIRIES_KEY = 'pms_custom_enquiries';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getLocalEnquiries(): Enquiry[] {
  try {
    const raw = localStorage.getItem(LOCAL_ENQUIRIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalEnquiries(list: Enquiry[]) {
  try {
    localStorage.setItem(LOCAL_ENQUIRIES_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage issues
  }
}

export async function submitEnquiry(
  hotelId: string,
  data: { name: string; email: string; mobile: string; message: string }
): Promise<{ success: boolean; error?: string }> {
  const newEnquiry: Enquiry = {
    id: `enq-${Date.now()}`,
    hotel_id: hotelId || 'default-hotel-id',
    name: data.name.trim(),
    email: data.email.trim(),
    mobile: data.mobile.trim(),
    message: data.message.trim(),
    status: 'New',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = getLocalEnquiries();
  saveLocalEnquiries([newEnquiry, ...current]);

  await emitPMSNotification({
    id: `notif-enq-${newEnquiry.id}`,
    type: 'enquiry',
    title: `Incoming Enquiry • ${newEnquiry.name}`,
    message: `${newEnquiry.name} (${newEnquiry.mobile || newEnquiry.email}): "${newEnquiry.message.slice(0, 100)}"`,
    targetTab: 'enquiries',
    meta: {
      guestName: newEnquiry.name,
      contact: newEnquiry.mobile || newEnquiry.email,
    },
  });

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(hotelId)) {
    try {
      await supabase.from('enquiries').insert([
        {
          hotel_id: hotelId,
          name: newEnquiry.name,
          email: newEnquiry.email,
          mobile: newEnquiry.mobile,
          message: newEnquiry.message,
          status: 'New',
        },
      ]);
    } catch {
      // Local storage already saved
    }
  }

  return { success: true };
}

export async function getEnquiries(hotelId: string): Promise<Enquiry[]> {
  const localList = getLocalEnquiries();
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(hotelId)) return localList;

  try {
    const { data, error } = await supabase
      .from('enquiries')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });

    if (error) return localList;
    const remoteList = (data as Enquiry[]) || [];
    return remoteList.length > 0 ? remoteList : localList;
  } catch {
    return localList;
  }
}

export async function updateEnquiryStatus(
  id: string,
  hotelId: string,
  status: 'New' | 'Read' | 'Resolved',
  internalNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const current = getLocalEnquiries();
  const updated = current.map((e) =>
    e.id === id
      ? {
          ...e,
          status,
          ...(internalNotes !== undefined ? { internal_notes: internalNotes } : {}),
          updated_at: new Date().toISOString(),
        }
      : e
  );
  saveLocalEnquiries(updated);

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(id)) {
    try {
      const updates: any = { status };
      if (internalNotes !== undefined) updates.internal_notes = internalNotes;
      await supabase.from('enquiries').update(updates).eq('id', id);
      await logAction(hotelId, `Marked Enquiry as ${status}`, 'Enquiry', id);
    } catch {
      // Handled locally
    }
  }

  return { success: true };
}
