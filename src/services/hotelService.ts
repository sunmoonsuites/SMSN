import { getSupabase } from '../lib/supabase';
import {
  Hotel,
  HotelSettings,
  HeroConfig,
  AmenityItem,
  LandmarkItem,
  BanquetConfig,
  SocialLinks,
  FAQItem,
} from '../types';
import { logAction } from './auditService';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../lib/utils';

// Local storage key for dynamic configuration persistence
export const LOCAL_STORAGE_HOTEL_KEY = 'pms_dynamic_website_config';

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  badge: 'Sector 117, Noida • 30 Boutique Rooms',
  heading: 'Modern Comfort & Tranquility in Noida',
  description:
    'Experience attentive hospitality at our 30-room hotel in Sector 117, Noida. Featuring well-appointed rooms across three floors, dedicated dining, and premier connectivity to the Noida Expressway.',
  image_url: '',
  highlight1: '100% Verified Reservations',
  highlight2: 'Best Direct Tariff Guaranteed',
  highlight3: 'Zero Booking Fees',
};

export const DEFAULT_AMENITIES_LIST: AmenityItem[] = [
  {
    id: 'amenity-wifi',
    title: 'High-Speed Wi-Fi',
    desc: 'Seamless dual-band high-speed internet throughout all 30 guest rooms and public areas.',
    iconName: 'wifi',
    is_active: true,
  },
  {
    id: 'amenity-banquet',
    title: 'Ground Floor Banquet Hall',
    desc: 'Elegant banquet hall for kitty parties, birthdays, conferences, and intimate gatherings of up to 50 guests.',
    iconName: 'users',
    is_active: true,
  },
  {
    id: 'amenity-power',
    title: '100% Power Backup',
    desc: 'Heavy-duty automatic generator ensuring uninterrupted air conditioning and lighting 24/7.',
    iconName: 'zap',
    is_active: true,
  },
  {
    id: 'amenity-desk',
    title: '24/7 Reception & Concierge',
    desc: 'Always-available front desk team for check-in, local guidance, and taxi arrangements.',
    iconName: 'clock',
    is_active: true,
  },
  {
    id: 'amenity-parking',
    title: 'Free On-Site Parking',
    desc: 'Dedicated on-premises parking spots for hotel guests with round-the-clock security.',
    iconName: 'car',
    is_active: true,
  },
  {
    id: 'amenity-cleaning',
    title: 'Daily Housekeeping',
    desc: 'Thorough room cleaning, linen change, sanitized bathrooms, and fresh guest amenities.',
    iconName: 'sparkles',
    is_active: true,
  },
  {
    id: 'amenity-lift',
    title: 'Guest Elevator',
    desc: 'Modern automatic elevator serving Ground, 1st, 2nd, and 3rd floors effortlessly.',
    iconName: 'elevator',
    is_active: true,
  },
  {
    id: 'amenity-tv',
    title: 'Smart LED TV',
    desc: 'High-definition flat screen televisions with satellite channels in every room.',
    iconName: 'tv',
    is_active: true,
  },
  {
    id: 'amenity-tea',
    title: 'Tea & Coffee Maker',
    desc: 'Electric kettle with complimentary tea bags, coffee sachets, and bottled drinking water.',
    iconName: 'coffee',
    is_active: true,
  },
  {
    id: 'amenity-cctv',
    title: 'CCTV & Fire Safety',
    desc: 'Comprehensive security cameras across common corridors and compliant fire safety systems.',
    iconName: 'shield',
    is_active: true,
  },
];

export const DEFAULT_LANDMARKS_LIST: LandmarkItem[] = [
  {
    id: 'landmark-medanta',
    title: 'Medanta Hospital Noida',
    time: '5 Minutes',
    desc: 'Top-tier healthcare facility nearby.',
    iconType: 'hospital',
  },
  {
    id: 'landmark-metro',
    title: 'Sector 76 Metro Station',
    time: '5 Minutes',
    desc: 'Closest connectivity to Aqua Line Metro.',
    iconType: 'metro',
  },
  {
    id: 'landmark-mall',
    title: 'Spectrum Metro Mall',
    time: '7 Minutes',
    desc: 'Premium shopping and entertainment destination.',
    iconType: 'mall',
  },
  {
    id: 'landmark-banquet',
    title: 'Tivoli Lotus Court Banquet',
    time: '2 Minutes',
    desc: 'Prime landmark and event venue nearby.',
    iconType: 'landmark',
  },
];

export const DEFAULT_BANQUET_CONFIG: BanquetConfig = {
  title: 'Our Banquet Hall',
  subtitle: 'Events & Gatherings',
  description:
    'Host your special occasions in our elegant banquet hall, designed for comfort and versatility. Perfect for gatherings up to 50 guests, including kitty parties, birthdays, corporate conferences, and intimate celebrations.',
  capacity: 'Up to 50 Guests',
  events: 'Kitty Parties, Birthdays, Conferences',
  ambiance: 'Elegant & Versatile',
  service: 'Tailored Catering',
};

export const DEFAULT_SOCIAL_LINKS: SocialLinks = {
  instagram: 'https://instagram.com/sunmoonsuites',
  facebook: 'https://facebook.com/sunmoonsuites',
  tripadvisor: '',
  google_business: 'https://maps.google.com/?q=Sun+Moon+Suites+Sector+117+Noida',
};

export const DEFAULT_FAQ_ITEMS: FAQItem[] = [
  {
    question: 'What are the check-in and check-out timings?',
    answer: 'Check-in time starts at 14:00 (2:00 PM) and check-out is until 11:00 AM.',
  },
  {
    question: 'Is early check-in or late check-out available?',
    answer:
      'Early check-in and late check-out are subject to room availability upon arrival and may incur nominal additional charges.',
  },
  {
    question: 'What government identification is required at check-in?',
    answer:
      'All adult guests must present a valid government-approved photo ID with address (Aadhaar Card, Passport, Driving License, or Voter ID). PAN cards are NOT valid proof of address.',
  },
  {
    question: 'Is parking available on the hotel premises?',
    answer:
      'Yes, complimentary safe on-site parking is available for all registered hotel guests.',
  },
  {
    question: 'Is 100% power backup available for AC and lights?',
    answer:
      'Yes, our property is equipped with an automated heavy-duty generator ensuring 24/7 uninterrupted power for lighting, air conditioning, and elevators.',
  },
];

// Default baseline hotel record for Sector 117 Noida
export const DEFAULT_HOTEL_INFO: Partial<Hotel> = {
  name: 'Sun Moon Suites',
  tagline: 'Modern Hospitality & Comfort in Noida',
  description:
    'A 30-room boutique hotel located in Sector 117, Noida. Offering refined guest rooms across 3 floors, dedicated dining, high-speed Wi-Fi, and 24-hour reception services.',
  address: 'GT-20, Sector 117, Noida, Uttar Pradesh 201316',
  city: 'Noida',
  state: 'Uttar Pradesh',
  country: 'India',
  pincode: '201316',
  phone: '+91 93135 01001',
  email: 'sunmoonsuites@gmail.com',
  whatsapp: '+919313501001',
  gstin: '09AAACH7409R1ZZ',
  total_rooms: 30,
  latitude: 28.5724,
  longitude: 77.3892,
  google_maps_url:
    'https://www.google.com/maps/search/?api=1&query=Sun+Moon+Suites+GT-20+Sector+117+Noida+Uttar+Pradesh+201316',
  plus_code: 'H9FW+8F',
  check_in_time: '14:00',
  check_out_time: '11:00',
  currency: 'INR',
  currency_symbol: '₹',
  hero_config: DEFAULT_HERO_CONFIG,
  amenities_list: DEFAULT_AMENITIES_LIST,
  landmarks_list: DEFAULT_LANDMARKS_LIST,
  banquet_config: DEFAULT_BANQUET_CONFIG,
  cancellation_policy:
    'Free cancellation up to 24 hours prior to standard check-in time (14:00 hotel local time). Cancellations made within 24 hours of arrival will incur a 1-night tariff fee. No-shows are charged the full reservation amount.',
  terms_and_conditions:
    'All adult guests must carry valid government photo ID with address (Aadhaar, Passport, Driving License, or Voter ID). PAN card is not accepted as address proof. All guest rooms are strictly non-smoking.',
  privacy_policy:
    'We treat guest data with utmost confidentiality. Information collected is strictly used for reservations, security compliance, and statutory hotel registry reporting under Indian law.',
  social_links: DEFAULT_SOCIAL_LINKS,
  faq_items: DEFAULT_FAQ_ITEMS,
};

export const DEFAULT_SETTINGS: Partial<HotelSettings> = {
  booking_rules: {
    min_stay_nights: 1,
    max_stay_nights: 30,
    allow_same_day_booking: true,
    advance_booking_days: 180,
    child_age_free_limit: 5,
    gst_rate_below_7500: 12.0,
    gst_rate_above_7500: 18.0,
  },
  cancellation_policy: DEFAULT_HOTEL_INFO.cancellation_policy || '',
  terms_and_conditions: DEFAULT_HOTEL_INFO.terms_and_conditions || '',
  privacy_policy: DEFAULT_HOTEL_INFO.privacy_policy || '',
  payment_config: {
    gateway_provider: 'None',
    accept_cash_on_arrival: true,
    accept_upi: true,
    accept_card: true,
    online_payment_enabled: false,
  },
  seo_title: 'Sun Moon Suites | Hotel in Sector 117 Noida',
  meta_description:
    'Book your stay at Sun Moon Suites, Sector 117 Noida. 30 modern rooms, banquet hall, free Wi-Fi, power backup, and warm hospitality.',
  social_links: DEFAULT_SOCIAL_LINKS,
  faq_items: DEFAULT_FAQ_ITEMS,
};

// Safe helper to get stored local config
export function getStoredLocalConfig(): Partial<Hotel> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HOTEL_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading from localStorage:', e);
  }
  return {};
}

// Safe helper to write stored local config
export function saveStoredLocalConfig(config: Partial<Hotel>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_HOTEL_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
  }
}

// Columns that exist in the Supabase public.hotels table
const VALID_SUPABASE_HOTEL_COLUMNS = [
  'name',
  'tagline',
  'description',
  'address',
  'city',
  'state',
  'country',
  'pincode',
  'phone',
  'email',
  'whatsapp',
  'gstin',
  'logo_url',
  'total_rooms',
  'latitude',
  'longitude',
  'google_maps_url',
  'check_in_time',
  'check_out_time',
  'currency',
  'currency_symbol',
];

/**
 * Synchronous baseline hotel state (Defaults + LocalStorage overrides)
 * Used for instant 0ms initial rendering on the public website before cloud sync completes.
 */
export function getInitialHotelSync(): Hotel {
  const localConfig = getStoredLocalConfig();
  const unifiedHotel: Hotel = {
    id: localConfig.id || 'hotel-sun-moon-suites-noida-117',
    ...DEFAULT_HOTEL_INFO,
    ...localConfig,
    created_at: localConfig.created_at || new Date().toISOString(),
    updated_at: localConfig.updated_at || new Date().toISOString(),
  } as Hotel;

  unifiedHotel.phone = getCleanHotelPhone(unifiedHotel.phone);
  unifiedHotel.whatsapp = getCleanHotelWhatsApp(unifiedHotel.whatsapp);
  return unifiedHotel;
}

/**
 * Fetch Unified Hotel Data
 * Merges: Default baseline + localStorage user overrides + Supabase database values
 */
export async function getHotel(): Promise<Hotel | null> {
  const localConfig = getStoredLocalConfig();
  const supabase = getSupabase();

  // Baseline assembled from defaults + local storage custom overrides
  let unifiedHotel: Hotel = getInitialHotelSync();

  // If Supabase is connected, query the hotels table and overlay database columns
  if (supabase) {
    try {
      const { data, error } = await supabase.from('hotels').select('*').limit(1).maybeSingle();
      if (!error && data) {
        const dbData = data as Hotel;
        
        // Merge DB data with local config (local config takes precedence for rich CMS fields)
        unifiedHotel = {
          ...unifiedHotel,
          ...dbData,
          ...localConfig,
          id: dbData.id,
          // Ensure phone & whatsapp are sanitized
          phone: getCleanHotelPhone(localConfig.phone || dbData.phone),
          whatsapp: getCleanHotelWhatsApp(localConfig.whatsapp || dbData.whatsapp),
          // Rich CMS objects
          hero_config: localConfig.hero_config || DEFAULT_HERO_CONFIG,
          amenities_list: localConfig.amenities_list || DEFAULT_AMENITIES_LIST,
          landmarks_list: localConfig.landmarks_list || DEFAULT_LANDMARKS_LIST,
          banquet_config: localConfig.banquet_config || DEFAULT_BANQUET_CONFIG,
          social_links: localConfig.social_links || DEFAULT_SOCIAL_LINKS,
          faq_items: localConfig.faq_items || DEFAULT_FAQ_ITEMS,
          cancellation_policy: localConfig.cancellation_policy || DEFAULT_HOTEL_INFO.cancellation_policy,
          terms_and_conditions: localConfig.terms_and_conditions || DEFAULT_HOTEL_INFO.terms_and_conditions,
          privacy_policy: localConfig.privacy_policy || DEFAULT_HOTEL_INFO.privacy_policy,
        };

        // If DB has old placeholder phone/whatsapp, sync new ones silently
        if (dbData.phone?.includes('98765') || dbData.whatsapp?.includes('98765')) {
          supabase
            .from('hotels')
            .update({
              phone: unifiedHotel.phone,
              whatsapp: unifiedHotel.whatsapp,
            })
            .eq('id', dbData.id)
            .then(() => {
              console.log('Synchronized cleaned contact numbers to Supabase');
            });
        }
      }
    } catch (err) {
      console.warn('Supabase fetch failed; seamlessly using local storage dynamic profile:', err);
    }
  }

  return unifiedHotel;
}

/**
 * Update Hotel Data
 * Persists to localStorage immediately, dispatches live refresh event,
 * and updates Supabase if connected without ever breaking on column errors.
 */
export async function updateHotel(
  id: string,
  updates: Partial<Hotel>
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = getStoredLocalConfig();
    const merged: Partial<Hotel> = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Sanitize phone & whatsapp if updated
    if (merged.phone) merged.phone = getCleanHotelPhone(merged.phone);
    if (merged.whatsapp) merged.whatsapp = getCleanHotelWhatsApp(merged.whatsapp);

    // 1. Immediately save to LocalStorage (works 100% of the time, zero SQL commands needed)
    saveStoredLocalConfig(merged);

    // 2. Dispatch real-time custom event so all active components re-render immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel_data_updated', { detail: merged }));
    }

    // 3. If Supabase is available, sync safe columns
    const supabase = getSupabase();
    if (supabase) {
      try {
        const safeDbUpdates: Record<string, any> = {};
        for (const col of VALID_SUPABASE_HOTEL_COLUMNS) {
          if (col in updates && (updates as any)[col] !== undefined) {
            safeDbUpdates[col] = (updates as any)[col];
          }
        }

        if (Object.keys(safeDbUpdates).length > 0) {
          if (safeDbUpdates.phone) safeDbUpdates.phone = getCleanHotelPhone(safeDbUpdates.phone);
          if (safeDbUpdates.whatsapp) safeDbUpdates.whatsapp = getCleanHotelWhatsApp(safeDbUpdates.whatsapp);

          await supabase.from('hotels').update(safeDbUpdates).eq('id', id);
        }

        // Also sync policy & FAQ fields to hotel_settings if provided
        const settingsUpdates: Partial<HotelSettings> = {};
        if (updates.cancellation_policy) settingsUpdates.cancellation_policy = updates.cancellation_policy;
        if (updates.terms_and_conditions) settingsUpdates.terms_and_conditions = updates.terms_and_conditions;
        if (updates.privacy_policy) settingsUpdates.privacy_policy = updates.privacy_policy;
        if (updates.social_links) settingsUpdates.social_links = updates.social_links;
        if (updates.faq_items) settingsUpdates.faq_items = updates.faq_items;

        if (Object.keys(settingsUpdates).length > 0) {
          await supabase.from('hotel_settings').update(settingsUpdates).eq('hotel_id', id);
        }
      } catch (dbErr) {
        console.warn('Supabase background sync skipped/failed; changes persisted locally:', dbErr);
      }
    }

    // Always log audit trail if possible
    try {
      await logAction(id, 'Updated Hotel & Website CMS Configuration', 'Hotel', id, updates);
    } catch {
      // Ignore audit fail
    }

    return { success: true };
  } catch (err: any) {
    console.error('Update failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset all Hotel & CMS configurations to default factory settings
 */
export function resetHotelToDefaults(): Hotel {
  try {
    localStorage.removeItem(LOCAL_STORAGE_HOTEL_KEY);
  } catch (e) {
    console.warn(e);
  }

  const defaultHotel: Hotel = {
    id: 'hotel-sun-moon-suites-noida-117',
    ...DEFAULT_HOTEL_INFO,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Hotel;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hotel_data_updated', { detail: defaultHotel }));
  }

  return defaultHotel;
}

/**
 * Export complete website configuration as a JSON string
 */
export function exportHotelConfigJson(): string {
  const current = getStoredLocalConfig();
  const exportData = {
    ...DEFAULT_HOTEL_INFO,
    ...current,
    exported_at: new Date().toISOString(),
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Import complete website configuration from a JSON string
 */
export async function importHotelConfigJson(jsonString: string, hotelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON format' };
    }

    await updateHotel(hotelId, parsed);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Import failed: ${err.message}` };
  }
}

export async function getHotelSettings(hotelId: string): Promise<HotelSettings | null> {
  const localConfig = getStoredLocalConfig();
  const supabase = getSupabase();

  const baseSettings: HotelSettings = {
    id: 'local-settings-id',
    hotel_id: hotelId,
    ...DEFAULT_SETTINGS,
    cancellation_policy: localConfig.cancellation_policy || DEFAULT_SETTINGS.cancellation_policy || '',
    terms_and_conditions: localConfig.terms_and_conditions || DEFAULT_SETTINGS.terms_and_conditions || '',
    privacy_policy: localConfig.privacy_policy || DEFAULT_SETTINGS.privacy_policy || '',
    social_links: localConfig.social_links || DEFAULT_SETTINGS.social_links || DEFAULT_SOCIAL_LINKS,
    faq_items: localConfig.faq_items || DEFAULT_SETTINGS.faq_items || DEFAULT_FAQ_ITEMS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as HotelSettings;

  if (!supabase) {
    return baseSettings;
  }

  try {
    const { data, error } = await supabase
      .from('hotel_settings')
      .select('*')
      .eq('hotel_id', hotelId)
      .maybeSingle();

    if (!error && data) {
      return {
        ...baseSettings,
        ...(data as HotelSettings),
        cancellation_policy: localConfig.cancellation_policy || data.cancellation_policy,
        terms_and_conditions: localConfig.terms_and_conditions || data.terms_and_conditions,
        privacy_policy: localConfig.privacy_policy || data.privacy_policy,
        faq_items: localConfig.faq_items || data.faq_items || DEFAULT_FAQ_ITEMS,
        social_links: localConfig.social_links || data.social_links || DEFAULT_SOCIAL_LINKS,
      };
    }
  } catch (err) {
    console.warn('Error fetching hotel settings, using merged local:', err);
  }

  return baseSettings;
}

export async function updateHotelSettings(
  hotelId: string,
  updates: Partial<HotelSettings>
): Promise<{ success: boolean; error?: string }> {
  // Update local config
  const localUpdates: Partial<Hotel> = {};
  if (updates.cancellation_policy) localUpdates.cancellation_policy = updates.cancellation_policy;
  if (updates.terms_and_conditions) localUpdates.terms_and_conditions = updates.terms_and_conditions;
  if (updates.privacy_policy) localUpdates.privacy_policy = updates.privacy_policy;
  if (updates.social_links) localUpdates.social_links = updates.social_links;
  if (updates.faq_items) localUpdates.faq_items = updates.faq_items;

  await updateHotel(hotelId, localUpdates);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('hotel_settings').update(updates).eq('hotel_id', hotelId);
    } catch (e) {
      console.warn('Supabase settings update failed; locally saved:', e);
    }
  }

  return { success: true };
}
