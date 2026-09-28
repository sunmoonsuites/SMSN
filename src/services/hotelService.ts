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

// Local storage key used strictly as a fast initial-render cache mirrored from Supabase
export const LOCAL_STORAGE_HOTEL_KEY = 'pms_dynamic_website_config';

export function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

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
 * Resolves the canonical UUID of the hotel row in Supabase `public.hotels`.
 * If `public.hotels` is empty, automatically inserts the baseline hotel record.
 */
export async function resolveSupabaseHotelId(preferredId?: string): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    if (isValidUuid(preferredId)) {
      const { data: existingById } = await supabase
        .from('hotels')
        .select('id')
        .eq('id', preferredId!)
        .maybeSingle();
      if (existingById?.id) return existingById.id;
    }

    const { data: firstHotel } = await supabase
      .from('hotels')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstHotel?.id) {
      return firstHotel.id;
    }

    // No hotel row exists yet in Supabase — seed the primary hotel record
    const local = getStoredLocalConfig();
    const seedPayload = {
      name: local.name || DEFAULT_HOTEL_INFO.name || 'Sun Moon Suites',
      tagline: local.tagline || DEFAULT_HOTEL_INFO.tagline,
      description: local.description || DEFAULT_HOTEL_INFO.description,
      address: local.address || DEFAULT_HOTEL_INFO.address || 'GT-20, Sector 117, Noida',
      city: local.city || DEFAULT_HOTEL_INFO.city || 'Noida',
      state: local.state || DEFAULT_HOTEL_INFO.state || 'Uttar Pradesh',
      country: local.country || DEFAULT_HOTEL_INFO.country || 'India',
      pincode: local.pincode || DEFAULT_HOTEL_INFO.pincode || '201316',
      phone: getCleanHotelPhone(local.phone || DEFAULT_HOTEL_INFO.phone),
      email: local.email || DEFAULT_HOTEL_INFO.email || 'sunmoonsuites@gmail.com',
      whatsapp: getCleanHotelWhatsApp(local.whatsapp || DEFAULT_HOTEL_INFO.whatsapp),
      gstin: local.gstin || DEFAULT_HOTEL_INFO.gstin || '09AAACH7409R1ZZ',
      total_rooms: Number(local.total_rooms || DEFAULT_HOTEL_INFO.total_rooms || 30),
      latitude: local.latitude ?? DEFAULT_HOTEL_INFO.latitude,
      longitude: local.longitude ?? DEFAULT_HOTEL_INFO.longitude,
      google_maps_url: local.google_maps_url || DEFAULT_HOTEL_INFO.google_maps_url,
      check_in_time: local.check_in_time || DEFAULT_HOTEL_INFO.check_in_time || '14:00',
      check_out_time: local.check_out_time || DEFAULT_HOTEL_INFO.check_out_time || '11:00',
      currency: local.currency || DEFAULT_HOTEL_INFO.currency || 'INR',
      currency_symbol: local.currency_symbol || DEFAULT_HOTEL_INFO.currency_symbol || '₹',
    };

    const { data: inserted } = await supabase
      .from('hotels')
      .insert([seedPayload])
      .select('id')
      .single();

    return inserted?.id || null;
  } catch (err) {
    console.warn('Error resolving Supabase hotel ID:', err);
    return null;
  }
}

/**
 * Synchronous baseline hotel state (Defaults + LocalStorage cache)
 * Used for instant 0ms initial rendering before Supabase cloud query completes.
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
 * Internal helper to persist all dynamic website CMS settings into Supabase
 * (`public.hotels` + `public.hotel_settings`).
 * Stores rich CMS objects (`hero_config`, `amenities_list`, `landmarks_list`,
 * `banquet_config`, `plus_code`, `social_links`, `faq_items`, policies) in
 * `public.hotel_settings` so they work across all devices without needing manual SQL.
 */
async function persistFullHotelConfigToSupabase(
  targetHotelId: string,
  config: Partial<Hotel>
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !isValidUuid(targetHotelId)) return false;

  try {
    // 1. Update core hotel columns in public.hotels
    const safeHotelRowUpdates: Record<string, any> = {};
    for (const col of VALID_SUPABASE_HOTEL_COLUMNS) {
      if (col in config && (config as any)[col] !== undefined) {
        safeHotelRowUpdates[col] = (config as any)[col];
      }
    }

    if (safeHotelRowUpdates.phone) {
      safeHotelRowUpdates.phone = getCleanHotelPhone(safeHotelRowUpdates.phone);
    }
    if (safeHotelRowUpdates.whatsapp) {
      safeHotelRowUpdates.whatsapp = getCleanHotelWhatsApp(safeHotelRowUpdates.whatsapp);
    }

    if (Object.keys(safeHotelRowUpdates).length > 0) {
      await supabase.from('hotels').update(safeHotelRowUpdates).eq('id', targetHotelId);
    }

    // 2. Pack dynamic Website CMS settings into public.hotel_settings
    const cleanSocialLinks: SocialLinks = {
      instagram: config.social_links?.instagram ?? DEFAULT_SOCIAL_LINKS.instagram,
      facebook: config.social_links?.facebook ?? DEFAULT_SOCIAL_LINKS.facebook,
      tripadvisor: config.social_links?.tripadvisor ?? DEFAULT_SOCIAL_LINKS.tripadvisor,
      google_business: config.social_links?.google_business ?? DEFAULT_SOCIAL_LINKS.google_business,
    };

    // JSONB payload stored in `social_links` column of `public.hotel_settings`
    // Guarantees 100% compatibility with existing Supabase schema while storing all CMS objects
    const socialAndCmsJsonPayload = {
      ...cleanSocialLinks,
      cms_initialized: true,
      plus_code: config.plus_code || DEFAULT_HOTEL_INFO.plus_code || 'H9FW+8F',
      hero_config: config.hero_config || DEFAULT_HERO_CONFIG,
      amenities_list:
        config.amenities_list && config.amenities_list.length > 0
          ? config.amenities_list
          : DEFAULT_AMENITIES_LIST,
      landmarks_list:
        config.landmarks_list && config.landmarks_list.length > 0
          ? config.landmarks_list
          : DEFAULT_LANDMARKS_LIST,
      banquet_config: config.banquet_config || DEFAULT_BANQUET_CONFIG,
      cms_updated_at: new Date().toISOString(),
    };

    const settingsPayload = {
      hotel_id: targetHotelId,
      cancellation_policy:
        config.cancellation_policy || DEFAULT_HOTEL_INFO.cancellation_policy || '',
      terms_and_conditions:
        config.terms_and_conditions || DEFAULT_HOTEL_INFO.terms_and_conditions || '',
      privacy_policy: config.privacy_policy || DEFAULT_HOTEL_INFO.privacy_policy || '',
      seo_title: `${config.name || 'Sun Moon Suites'} | Hotel in ${config.city || 'Sector 117 Noida'}`,
      meta_description:
        config.description ||
        config.hero_config?.description ||
        DEFAULT_SETTINGS.meta_description ||
        '',
      faq_items:
        config.faq_items && config.faq_items.length > 0 ? config.faq_items : DEFAULT_FAQ_ITEMS,
      social_links: socialAndCmsJsonPayload,
    };

    // Upsert by unique constraint (hotel_id) on public.hotel_settings
    const { error: upsertErr } = await supabase
      .from('hotel_settings')
      .upsert(settingsPayload, { onConflict: 'hotel_id' });

    if (upsertErr) {
      // Fallback: check if row exists and update or insert
      const { data: existingSettings } = await supabase
        .from('hotel_settings')
        .select('id')
        .eq('hotel_id', targetHotelId)
        .maybeSingle();

      if (existingSettings?.id) {
        await supabase
          .from('hotel_settings')
          .update(settingsPayload)
          .eq('hotel_id', targetHotelId);
      } else {
        await supabase.from('hotel_settings').insert([settingsPayload]);
      }
    }

    return true;
  } catch (err) {
    console.warn('Error persisting full hotel CMS config to Supabase:', err);
    return false;
  }
}

/**
 * Fetch Unified Hotel & Website CMS Data from Supabase (Single Source of Truth)
 * Picks all profile fields from `public.hotels` and all dynamic Website CMS
 * configurations (`hero_config`, `amenities_list`, `landmarks_list`, `banquet_config`,
 * `plus_code`, policies, `faq_items`, `social_links`) from `public.hotel_settings`.
 */
export async function getHotel(): Promise<Hotel | null> {
  const localConfig = getStoredLocalConfig();
  const supabase = getSupabase();

  let unifiedHotel: Hotel = getInitialHotelSync();

  if (!supabase) {
    return unifiedHotel;
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(localConfig.id);
    if (!resolvedHotelId) {
      return unifiedHotel;
    }

    // Fetch both `hotels` and `hotel_settings` in parallel from Supabase
    const [hotelRes, settingsRes] = await Promise.all([
      supabase.from('hotels').select('*').eq('id', resolvedHotelId).maybeSingle(),
      supabase.from('hotel_settings').select('*').eq('hotel_id', resolvedHotelId).maybeSingle(),
    ]);

    const dbHotel = hotelRes.data as Hotel | null;
    const dbSettings = settingsRes.data as any;

    if (dbHotel) {
      const rawSocialAndCms =
        dbSettings?.social_links && typeof dbSettings.social_links === 'object'
          ? dbSettings.social_links
          : {};

      const isCmsInitializedInDb = Boolean(
        rawSocialAndCms.cms_initialized ||
          rawSocialAndCms.hero_config ||
          dbSettings?.hero_config
      );

      // If Supabase hotel_settings does not have the dynamic CMS initialized yet,
      // push the current local/default configuration to Supabase once so Supabase becomes the Single Source of Truth.
      const hasLegacyPlaceholderAddress =
        dbHotel.address === 'Plot No. 12, Sector 117' ||
        dbHotel.pincode === '201301' ||
        dbHotel.phone?.includes('98765') ||
        dbHotel.whatsapp?.includes('98765');

      if (!isCmsInitializedInDb || hasLegacyPlaceholderAddress) {
        const initialSyncConfig: Partial<Hotel> = {
          ...DEFAULT_HOTEL_INFO,
          ...dbHotel,
          ...localConfig,
          id: dbHotel.id,
          address:
            hasLegacyPlaceholderAddress
              ? localConfig.address || DEFAULT_HOTEL_INFO.address
              : dbHotel.address || localConfig.address || DEFAULT_HOTEL_INFO.address,
          pincode:
            hasLegacyPlaceholderAddress
              ? localConfig.pincode || DEFAULT_HOTEL_INFO.pincode
              : dbHotel.pincode || localConfig.pincode || DEFAULT_HOTEL_INFO.pincode,
          phone: getCleanHotelPhone(localConfig.phone || dbHotel.phone || DEFAULT_HOTEL_INFO.phone),
          whatsapp: getCleanHotelWhatsApp(
            localConfig.whatsapp || dbHotel.whatsapp || DEFAULT_HOTEL_INFO.whatsapp
          ),
          hero_config: localConfig.hero_config || DEFAULT_HERO_CONFIG,
          amenities_list:
            localConfig.amenities_list && localConfig.amenities_list.length > 0
              ? localConfig.amenities_list
              : DEFAULT_AMENITIES_LIST,
          landmarks_list:
            localConfig.landmarks_list && localConfig.landmarks_list.length > 0
              ? localConfig.landmarks_list
              : DEFAULT_LANDMARKS_LIST,
          banquet_config: localConfig.banquet_config || DEFAULT_BANQUET_CONFIG,
          plus_code: localConfig.plus_code || DEFAULT_HOTEL_INFO.plus_code || 'H9FW+8F',
          cancellation_policy:
            localConfig.cancellation_policy ||
            dbSettings?.cancellation_policy ||
            DEFAULT_HOTEL_INFO.cancellation_policy,
          terms_and_conditions:
            localConfig.terms_and_conditions ||
            dbSettings?.terms_and_conditions ||
            DEFAULT_HOTEL_INFO.terms_and_conditions,
          privacy_policy:
            localConfig.privacy_policy ||
            dbSettings?.privacy_policy ||
            DEFAULT_HOTEL_INFO.privacy_policy,
          faq_items:
            localConfig.faq_items && localConfig.faq_items.length > 0
              ? localConfig.faq_items
              : Array.isArray(dbSettings?.faq_items) && dbSettings.faq_items.length > 0
              ? dbSettings.faq_items
              : DEFAULT_FAQ_ITEMS,
          social_links: localConfig.social_links || DEFAULT_SOCIAL_LINKS,
        };

        await persistFullHotelConfigToSupabase(dbHotel.id, initialSyncConfig);
        unifiedHotel = {
          ...unifiedHotel,
          ...initialSyncConfig,
          id: dbHotel.id,
        } as Hotel;
        saveStoredLocalConfig(unifiedHotel);
        return unifiedHotel;
      }

      // Pick ALL Website Settings directly from Supabase (`dbHotel` + `dbSettings`)
      const dbHeroConfig: HeroConfig = {
        ...DEFAULT_HERO_CONFIG,
        ...(dbSettings?.hero_config && Object.keys(dbSettings.hero_config).length > 0
          ? dbSettings.hero_config
          : rawSocialAndCms.hero_config || {}),
      };

      const dbAmenitiesList: AmenityItem[] =
        Array.isArray(dbSettings?.amenities_list) && dbSettings.amenities_list.length > 0
          ? dbSettings.amenities_list
          : Array.isArray(rawSocialAndCms.amenities_list) && rawSocialAndCms.amenities_list.length > 0
          ? rawSocialAndCms.amenities_list
          : DEFAULT_AMENITIES_LIST;

      const dbLandmarksList: LandmarkItem[] =
        Array.isArray(dbSettings?.landmarks_list) && dbSettings.landmarks_list.length > 0
          ? dbSettings.landmarks_list
          : Array.isArray(rawSocialAndCms.landmarks_list) && rawSocialAndCms.landmarks_list.length > 0
          ? rawSocialAndCms.landmarks_list
          : DEFAULT_LANDMARKS_LIST;

      const dbBanquetConfig: BanquetConfig = {
        ...DEFAULT_BANQUET_CONFIG,
        ...(dbSettings?.banquet_config && Object.keys(dbSettings.banquet_config).length > 0
          ? dbSettings.banquet_config
          : rawSocialAndCms.banquet_config || {}),
      };

      const dbSocialLinks: SocialLinks = {
        instagram: rawSocialAndCms.instagram ?? DEFAULT_SOCIAL_LINKS.instagram,
        facebook: rawSocialAndCms.facebook ?? DEFAULT_SOCIAL_LINKS.facebook,
        tripadvisor: rawSocialAndCms.tripadvisor ?? DEFAULT_SOCIAL_LINKS.tripadvisor,
        google_business: rawSocialAndCms.google_business ?? DEFAULT_SOCIAL_LINKS.google_business,
      };

      const dbFaqItems: FAQItem[] =
        Array.isArray(dbSettings?.faq_items) && dbSettings.faq_items.length > 0
          ? dbSettings.faq_items
          : DEFAULT_FAQ_ITEMS;

      unifiedHotel = {
        ...DEFAULT_HOTEL_INFO,
        ...dbHotel,
        id: dbHotel.id,
        phone: getCleanHotelPhone(dbHotel.phone),
        whatsapp: getCleanHotelWhatsApp(dbHotel.whatsapp),
        plus_code:
          dbHotel.plus_code ||
          dbSettings?.plus_code ||
          rawSocialAndCms.plus_code ||
          DEFAULT_HOTEL_INFO.plus_code ||
          'H9FW+8F',
        hero_config: dbHeroConfig,
        amenities_list: dbAmenitiesList,
        landmarks_list: dbLandmarksList,
        banquet_config: dbBanquetConfig,
        social_links: dbSocialLinks,
        faq_items: dbFaqItems,
        cancellation_policy:
          dbSettings?.cancellation_policy || DEFAULT_HOTEL_INFO.cancellation_policy,
        terms_and_conditions:
          dbSettings?.terms_and_conditions || DEFAULT_HOTEL_INFO.terms_and_conditions,
        privacy_policy: dbSettings?.privacy_policy || DEFAULT_HOTEL_INFO.privacy_policy,
      } as Hotel;

      // Mirror Supabase state to localStorage cache so subsequent page loads start with fresh Supabase data
      saveStoredLocalConfig(unifiedHotel);
    }
  } catch (err) {
    console.warn('Supabase fetch failed; falling back to cached config:', err);
  }

  return unifiedHotel;
}

/**
 * Update Hotel & Website CMS Data
 * Stores all dynamic website settings in Supabase (`public.hotels` + `public.hotel_settings`),
 * mirrors to local cache, and dispatches live refresh event.
 */
export async function updateHotel(
  id: string,
  updates: Partial<Hotel>
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = getStoredLocalConfig();
    const merged: Partial<Hotel> = {
      ...DEFAULT_HOTEL_INFO,
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Sanitize phone & whatsapp
    if (merged.phone) merged.phone = getCleanHotelPhone(merged.phone);
    if (merged.whatsapp) merged.whatsapp = getCleanHotelWhatsApp(merged.whatsapp);

    // Resolve real Supabase hotel UUID and persist to Supabase first
    const supabase = getSupabase();
    if (supabase) {
      const targetHotelId = await resolveSupabaseHotelId(id || existing.id);
      if (targetHotelId) {
        merged.id = targetHotelId;
        await persistFullHotelConfigToSupabase(targetHotelId, merged);
      }
    }

    // Mirror updated state to localStorage cache
    saveStoredLocalConfig(merged);

    // Dispatch real-time custom event so all active components re-render immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel_data_updated', { detail: merged }));
    }

    // Log audit trail
    try {
      if (merged.id && isValidUuid(merged.id)) {
        await logAction(
          merged.id,
          'Updated Hotel & Website CMS Configuration in Supabase',
          'Hotel',
          merged.id,
          updates
        );
      }
    } catch {
      // Ignore audit log failure
    }

    return { success: true };
  } catch (err: any) {
    console.error('Update failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Reset all Hotel & CMS configurations to default factory settings in both Supabase and local cache
 */
export async function resetHotelToDefaults(hotelId?: string): Promise<Hotel> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_HOTEL_KEY);
  } catch (e) {
    console.warn(e);
  }

  const resolvedId = (await resolveSupabaseHotelId(hotelId)) || hotelId || 'hotel-sun-moon-suites-noida-117';

  const defaultHotel: Hotel = {
    id: resolvedId,
    ...DEFAULT_HOTEL_INFO,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Hotel;

  if (isValidUuid(resolvedId)) {
    await persistFullHotelConfigToSupabase(resolvedId, defaultHotel);
  }

  saveStoredLocalConfig(defaultHotel);

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
 * Import complete website configuration from a JSON string and store in Supabase
 */
export async function importHotelConfigJson(
  jsonString: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
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
  const hotel = await getHotel();
  const supabase = getSupabase();
  const resolvedId = (await resolveSupabaseHotelId(hotelId)) || hotel?.id || hotelId;

  const baseSettings: HotelSettings = {
    id: 'local-settings-id',
    hotel_id: resolvedId,
    ...DEFAULT_SETTINGS,
    cancellation_policy:
      hotel?.cancellation_policy || DEFAULT_SETTINGS.cancellation_policy || '',
    terms_and_conditions:
      hotel?.terms_and_conditions || DEFAULT_SETTINGS.terms_and_conditions || '',
    privacy_policy: hotel?.privacy_policy || DEFAULT_SETTINGS.privacy_policy || '',
    social_links: hotel?.social_links || DEFAULT_SETTINGS.social_links || DEFAULT_SOCIAL_LINKS,
    faq_items: hotel?.faq_items || DEFAULT_SETTINGS.faq_items || DEFAULT_FAQ_ITEMS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as HotelSettings;

  if (!supabase || !isValidUuid(resolvedId)) {
    return baseSettings;
  }

  try {
    const { data, error } = await supabase
      .from('hotel_settings')
      .select('*')
      .eq('hotel_id', resolvedId)
      .maybeSingle();

    if (!error && data) {
      return {
        ...baseSettings,
        ...(data as HotelSettings),
        cancellation_policy: data.cancellation_policy || baseSettings.cancellation_policy,
        terms_and_conditions: data.terms_and_conditions || baseSettings.terms_and_conditions,
        privacy_policy: data.privacy_policy || baseSettings.privacy_policy,
        faq_items:
          Array.isArray(data.faq_items) && data.faq_items.length > 0
            ? data.faq_items
            : baseSettings.faq_items,
        social_links: {
          instagram: data.social_links?.instagram ?? baseSettings.social_links.instagram,
          facebook: data.social_links?.facebook ?? baseSettings.social_links.facebook,
          tripadvisor: data.social_links?.tripadvisor ?? baseSettings.social_links.tripadvisor,
          google_business:
            data.social_links?.google_business ?? baseSettings.social_links.google_business,
        },
      };
    }
  } catch (err) {
    console.warn('Error fetching hotel settings:', err);
  }

  return baseSettings;
}

export async function updateHotelSettings(
  hotelId: string,
  updates: Partial<HotelSettings>
): Promise<{ success: boolean; error?: string }> {
  const localUpdates: Partial<Hotel> = {};
  if (updates.cancellation_policy) localUpdates.cancellation_policy = updates.cancellation_policy;
  if (updates.terms_and_conditions) localUpdates.terms_and_conditions = updates.terms_and_conditions;
  if (updates.privacy_policy) localUpdates.privacy_policy = updates.privacy_policy;
  if (updates.social_links) localUpdates.social_links = updates.social_links;
  if (updates.faq_items) localUpdates.faq_items = updates.faq_items;

  await updateHotel(hotelId, localUpdates);

  const supabase = getSupabase();
  const resolvedId = await resolveSupabaseHotelId(hotelId);
  if (supabase && resolvedId) {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.booking_rules) dbUpdates.booking_rules = updates.booking_rules;
      if (updates.payment_config) dbUpdates.payment_config = updates.payment_config;
      if (updates.seo_title) dbUpdates.seo_title = updates.seo_title;
      if (updates.meta_description) dbUpdates.meta_description = updates.meta_description;
      if (Object.keys(dbUpdates).length > 0) {
        await supabase.from('hotel_settings').update(dbUpdates).eq('hotel_id', resolvedId);
      }
    } catch (e) {
      console.warn('Supabase settings update failed:', e);
    }
  }

  return { success: true };
}
