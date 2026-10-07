import { getSupabase } from '../lib/supabase';
import { BookingIntentLog, BookingIntentSummary, BookingIntentButtonSource } from '../types';
import { getVisitorIdentity } from './visitorService';
import { emitPMSNotification } from './notificationService';

const LOCAL_INTENTS_KEY = 'pms_booking_intents_v2';
const LATEST_INTENT_ID_KEY = 'sms_latest_intent_id';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getLocalIntents(): BookingIntentLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_INTENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalIntents(list: BookingIntentLog[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep up to 250 entries to keep storage lean
    localStorage.setItem(LOCAL_INTENTS_KEY, JSON.stringify(list.slice(0, 250)));
  } catch (e) {
    console.warn('[BookingIntentService] Local storage write error:', e);
  }
}

function detectDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  const ua = navigator.userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(ua)) return 'mobile';
  if (/ipad|tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

export interface RecordIntentParams {
  hotelId?: string;
  buttonSource: BookingIntentButtonSource | string;
  checkIn?: string;
  checkOut?: string;
  guestsCount?: number;
  roomTypeName?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}

/**
 * Records a booking intent click event asynchronously with complete fault tolerance.
 */
export async function recordBookingIntent(params: RecordIntentParams): Promise<string> {
  const visitor = getVisitorIdentity();
  const visitorId = visitor.visitorId || `anon_${Date.now()}`;
  const deviceType = detectDeviceType();
  const now = new Date().toISOString();

  const newIntent: BookingIntentLog = {
    id: `intent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    hotel_id: params.hotelId,
    visitor_id: visitorId,
    button_source: params.buttonSource,
    check_in: params.checkIn,
    check_out: params.checkOut,
    guests_count: params.guestsCount || 2,
    room_type_name: params.roomTypeName,
    guest_name: params.guestName,
    guest_phone: params.guestPhone,
    guest_email: params.guestEmail,
    device_type: deviceType,
    converted_to_booking: false,
    created_at: now,
    updated_at: now,
  };

  // 1. Always record into local resilient storage immediately
  const existing = getLocalIntents();
  saveLocalIntents([newIntent, ...existing]);

  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(LATEST_INTENT_ID_KEY, newIntent.id);
    } catch {
      // Ignore session storage errors
    }
  }

  // 2. Notify PMS notification center if guest contact is known
  if (params.guestName || params.guestPhone) {
    emitPMSNotification({
      id: `notif-intent-${newIntent.id}`,
      type: 'enquiry',
      title: `Booking Search • ${params.guestName || 'Website Guest'}`,
      message: `Checked room availability (${params.checkIn || 'Dates TBD'}): ${params.guestPhone || ''}`,
      targetTab: 'reservations',
    }).catch(() => {});
  }

  // 3. Asynchronously persist to Supabase if table exists
  try {
    const supabase = getSupabase();
    if (supabase) {
      const payload: Record<string, any> = {
        visitor_id: visitorId,
        button_source: params.buttonSource,
        check_in: params.checkIn || null,
        check_out: params.checkOut || null,
        guests_count: params.guestsCount || 2,
        room_type_name: params.roomTypeName || null,
        guest_name: params.guestName || null,
        guest_phone: params.guestPhone || null,
        guest_email: params.guestEmail || null,
        device_type: deviceType,
        converted_to_booking: false,
      };

      const resolvedHotelId =
        params.hotelId && UUID_REGEX.test(params.hotelId)
          ? params.hotelId
          : 'ca8ca4c4-d493-490f-8d30-774e8fca42b6';
      payload.hotel_id = resolvedHotelId;

      supabase
        .from('booking_intent_logs')
        .insert([payload])
        .select('id')
        .single()
        .then(({ data, error }: { data: any; error: any }) => {
          if (!error && data?.id && typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(LATEST_INTENT_ID_KEY, data.id);
            } catch {}
          }
        });
    }
  } catch (err) {
    console.debug('[BookingIntentService] Supabase write skipped or pending table:', err);
  }

  return newIntent.id;
}

/**
 * Attaches guest contact details to the active booking intent session
 * (e.g. when guest fills Name / Mobile on Step 2 of the booking modal).
 */
export async function attachGuestToLatestIntent(guest: {
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}): Promise<void> {
  const visitor = getVisitorIdentity();
  let latestId = typeof window !== 'undefined' ? sessionStorage.getItem(LATEST_INTENT_ID_KEY) : null;

  // Update in local store
  const current = getLocalIntents();
  let updated = false;

  const mapped = current.map((item) => {
    if (!updated && (item.id === latestId || item.visitor_id === visitor.visitorId)) {
      updated = true;
      return {
        ...item,
        guest_name: guest.guestName || item.guest_name,
        guest_phone: guest.guestPhone || item.guest_phone,
        guest_email: guest.guestEmail || item.guest_email,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });

  if (updated) {
    saveLocalIntents(mapped);
  }

  // Update in Supabase
  try {
    const supabase = getSupabase();
    if (supabase && (latestId || visitor.visitorId)) {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (guest.guestName) updateData.guest_name = guest.guestName;
      if (guest.guestPhone) updateData.guest_phone = guest.guestPhone;
      if (guest.guestEmail) updateData.guest_email = guest.guestEmail;

      let query = supabase.from('booking_intent_logs').update(updateData);
      if (latestId && UUID_REGEX.test(latestId)) {
        query = query.eq('id', latestId);
      } else {
        query = query.eq('visitor_id', visitor.visitorId);
      }
      await query;
    }
  } catch {}
}

/**
 * Marks the active intent session as successfully converted into a confirmed booking.
 */
export async function markLatestIntentConverted(bookingReference: string): Promise<void> {
  const visitor = getVisitorIdentity();
  let latestId = typeof window !== 'undefined' ? sessionStorage.getItem(LATEST_INTENT_ID_KEY) : null;

  // Update local store
  const current = getLocalIntents();
  let updated = false;

  const mapped = current.map((item) => {
    if (!updated && (item.id === latestId || item.visitor_id === visitor.visitorId)) {
      updated = true;
      return {
        ...item,
        converted_to_booking: true,
        booking_reference: bookingReference,
        updated_at: new Date().toISOString(),
      };
    }
    return item;
  });

  if (updated) {
    saveLocalIntents(mapped);
  }

  // Update Supabase
  try {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase.from('booking_intent_logs').update({
        converted_to_booking: true,
        booking_reference: bookingReference,
        updated_at: new Date().toISOString(),
      });
      if (latestId && UUID_REGEX.test(latestId)) {
        query = query.eq('id', latestId);
      } else {
        query = query.eq('visitor_id', visitor.visitorId);
      }
      await query;
    }
  } catch {}
}

/**
 * Fetches the intent summary & recent log entries for the PMS Admin Dashboard.
 */
export async function getBookingIntentSummary(hotelId?: string): Promise<BookingIntentSummary> {
  const localItems = getLocalIntents();
  let mergedItems: BookingIntentLog[] = [...localItems];

  // Try fetching from Supabase
  try {
    const supabase = getSupabase();
    if (supabase) {
      let query = supabase
        .from('booking_intent_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const resolvedHotelId =
        hotelId && UUID_REGEX.test(hotelId)
          ? hotelId
          : 'ca8ca4c4-d493-490f-8d30-774e8fca42b6';
      query = query.or(`hotel_id.eq.${resolvedHotelId},hotel_id.is.null`);

      const { data, error } = await query;
      if (!error && Array.isArray(data) && data.length > 0) {
        // Merge Supabase entries with local entries (avoiding duplicates)
        const seenIds = new Set(data.map((d) => d.id));
        const uniqueLocal = localItems.filter((loc) => !seenIds.has(loc.id));
        mergedItems = [...data, ...uniqueLocal];
      }
    }
  } catch (err) {
    console.debug('[BookingIntentService] Supabase read fallback to local items:', err);
  }

  // Filter for today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayItems = mergedItems.filter((item) => item.created_at.slice(0, 10) === todayStr);

  const todayIntentCount = todayItems.length;
  const todayConvertedCount = todayItems.filter((item) => item.converted_to_booking).length;
  const todayDroppedCount = Math.max(0, todayIntentCount - todayConvertedCount);
  const conversionRate =
    todayIntentCount > 0 ? Math.round((todayConvertedCount / todayIntentCount) * 100) : 0;

  return {
    todayIntentCount,
    todayConvertedCount,
    todayDroppedCount,
    conversionRate,
    recentIntents: mergedItems.slice(0, 30),
  };
}
