import { getSupabase } from '../lib/supabase';
import {
  Hotel,
  HotelSettings,
  HeroConfig,
  AmenityItem,
  LandmarkItem,
  BanquetConfig,
  InsightsConfig,
  InauguralOfferConfig,
  EmailVerificationConfig,
  BookingEngineConfig,
  GSTSlab,
  RoomCategory,
  SocialLinks,
  FAQItem,
} from '../types';
import { logAction } from './auditService';
import { getCleanHotelPhone, getCleanHotelWhatsApp, DEFAULT_GST_SLABS } from '../lib/utils';

// Local storage key used strictly as a fast initial-render cache mirrored from Supabase
export const LOCAL_STORAGE_HOTEL_KEY = 'pms_dynamic_website_config';
const CMS_JSON_PREFIX = 'CMS_JSON::';

export function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  badge: 'Sector 117, Noida • 30 Boutique Rooms',
  heading: 'Modern Comfort & Tranquility in Noida',
  description:
    'Experience attentive hospitality at our 30-room hotel in Sector 117, Noida. Featuring well-appointed rooms across three floors, dedicated dining, and premier connectivity to the Noida Expressway.',
  image_url:
    '/assets/mirrored/exterior---facade-sun-moon-suites-front-facade---muxpinlk.webp',
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
  is_enabled: true,
  title: 'Our Banquet Hall',
  subtitle: 'Events & Gatherings',
  description:
    'Host your special occasions in our elegant banquet hall, designed for comfort and versatility. Perfect for gatherings up to 50 guests, including kitty parties, birthdays, corporate conferences, and intimate celebrations.',
  capacity: 'Up to 50 Guests',
  events: 'Kitty Parties, Birthdays, Conferences',
  ambiance: 'Elegant & Versatile',
  service: 'Tailored Catering',
};

export const DEFAULT_INSIGHTS_CONFIG: InsightsConfig = {
  is_enabled: true,
  title: 'Local Insights, Events & Travel Tips',
  subtitle: 'Noida Travel & Hospitality Guide',
  description:
    'Explore helpful guides on local events in Noida, metro connectivity, medical stay tips, and hospitality updates from Sun Moon Suites in Sector 117.',
};

export const DEFAULT_INAUGURAL_OFFER_CONFIG: InauguralOfferConfig = {
  is_enabled: true,
  offer_price: 999,
  badge_text: '🎉 Inaugural Offer',
  banner_text: 'Grand Inaugural Offer — All Room Categories at Flat ₹999 / Night!',
};

export const DEFAULT_EMAIL_VERIFICATION_CONFIG: EmailVerificationConfig = {
  is_enabled: true,
  sender_email: 'sunmoonsuites@gmail.com',
  gmail_app_password: '',
  sender_name: 'Sun Moon Suites',
  google_client_id: '',
  brevo_api_key: '',
  resend_api_key: '',
};

export function normalizeEmailVerificationConfig(
  raw?: Partial<EmailVerificationConfig> | null
): EmailVerificationConfig {
  if (!raw) return { ...DEFAULT_EMAIL_VERIFICATION_CONFIG };
  return {
    ...DEFAULT_EMAIL_VERIFICATION_CONFIG,
    ...raw,
    is_enabled: raw.is_enabled !== false,
    sender_email: raw.sender_email?.trim() || DEFAULT_EMAIL_VERIFICATION_CONFIG.sender_email,
    gmail_app_password: raw.gmail_app_password?.trim() || '',
    sender_name: raw.sender_name?.trim() || DEFAULT_EMAIL_VERIFICATION_CONFIG.sender_name,
    google_client_id: raw.google_client_id?.trim() || '',
    brevo_api_key: raw.brevo_api_key?.trim() || '',
    resend_api_key: raw.resend_api_key?.trim() || '',
  };
}

export const DEFAULT_BOOKING_ENGINE_CONFIG: BookingEngineConfig = {
  is_enabled: true,
  mode: 'yanolja_link_inbuilt',
  yanolja_booking_url: 'https://letsbook.me/booking/sunmoonsuites',
  yanolja_hotel_code: '63594',
  yanolja_api_key: '',
  yanolja_api_endpoint: 'https://live.ipms247.com/booking/reservation_api/listing.php',
  razorpay_enabled: false,
  razorpay_key_id: '',
  razorpay_key_secret: '',
  payment_collection_mode: 'pay_at_hotel',
  prepaid_discount_enabled: true,
  prepaid_discount_percent: 5,
  gst_slabs: DEFAULT_GST_SLABS,
  gst_rate_below_7500: 5,
  gst_rate_above_7500: 18,
  gst_threshold_amount: 7500,
};

export function normalizeBookingEngineConfig(
  raw?: Partial<BookingEngineConfig> | null
): BookingEngineConfig {
  if (!raw) return { ...DEFAULT_BOOKING_ENGINE_CONFIG };
  // Upgrade legacy 'builtin' default from earlier configuration to 'yanolja_link_inbuilt'
  const isLegacyBuiltin = !raw.mode || raw.mode === 'builtin';
  const rawSlabs = Array.isArray(raw.gst_slabs) && raw.gst_slabs.length > 0 ? raw.gst_slabs : DEFAULT_GST_SLABS;
  return {
    ...DEFAULT_BOOKING_ENGINE_CONFIG,
    ...raw,
    is_enabled: isLegacyBuiltin ? true : raw.is_enabled !== false,
    mode: isLegacyBuiltin ? 'yanolja_link_inbuilt' : raw.mode,
    prepaid_discount_enabled: raw.prepaid_discount_enabled !== false,
    prepaid_discount_percent: typeof raw.prepaid_discount_percent === 'number' ? raw.prepaid_discount_percent : 5,
    gst_slabs: rawSlabs,
    gst_rate_below_7500: typeof raw.gst_rate_below_7500 === 'number' ? raw.gst_rate_below_7500 : 5,
    gst_rate_above_7500: typeof raw.gst_rate_above_7500 === 'number' ? raw.gst_rate_above_7500 : 18,
    gst_threshold_amount: typeof raw.gst_threshold_amount === 'number' ? raw.gst_threshold_amount : 7500,
    yanolja_booking_url:
      raw.yanolja_booking_url?.trim() || DEFAULT_BOOKING_ENGINE_CONFIG.yanolja_booking_url,
    yanolja_hotel_code:
      raw.yanolja_hotel_code?.trim() || DEFAULT_BOOKING_ENGINE_CONFIG.yanolja_hotel_code,
  };
}

export function buildYanoljaBookingUrl(
  baseUrl?: string,
  params?: {
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  }
): string {
  const cleanBase = (baseUrl || 'https://letsbook.me/booking/sunmoonsuites').split('?')[0].trim();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);

  const checkIn = params?.checkIn || tomorrow.toISOString().split('T')[0];
  const checkOut = params?.checkOut || dayAfter.toISOString().split('T')[0];
  const adults = params?.adults ?? 2;
  const children = params?.children ?? 0;

  const query = new URLSearchParams({
    checkin: checkIn,
    checkout: checkOut,
    adults: String(adults),
    children: String(children),
  });

  return `${cleanBase}?${query.toString()}`;
}

/**
 * Returns the active per-night tariff for a room category, taking the hotel's
 * Inaugural Offer into account when enabled, along with the original base_price.
 */
export function getEffectiveRoomPrice(
  cat: Pick<RoomCategory, 'base_price'>,
  hotel?: Partial<Hotel> | null
): {
  effectivePrice: number;
  originalPrice: number;
  isInauguralActive: boolean;
  badgeText: string;
  discountPercent: number;
} {
  const originalPrice = Number(cat.base_price) || 1500;
  const localHotel = hotel || getStoredLocalConfig();
  const offer = localHotel?.inaugural_offer ?? DEFAULT_INAUGURAL_OFFER_CONFIG;
  const offerPrice = Number(offer?.offer_price);

  if (offer?.is_enabled && offerPrice > 0) {
    const discountPercent =
      originalPrice > offerPrice
        ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
        : 0;
    return {
      effectivePrice: offerPrice,
      originalPrice,
      isInauguralActive: true,
      badgeText: offer.badge_text || '🎉 Inaugural Offer',
      discountPercent,
    };
  }

  return {
    effectivePrice: originalPrice,
    originalPrice,
    isInauguralActive: false,
    badgeText: '',
    discountPercent: 0,
  };
}

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
  phone: '+91 8586868442',
  email: 'sunmoonsuites@gmail.com',
  whatsapp: '918586868442',
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
  insights_config: DEFAULT_INSIGHTS_CONFIG,
  inaugural_offer: DEFAULT_INAUGURAL_OFFER_CONFIG,
  email_verification_config: DEFAULT_EMAIL_VERIFICATION_CONFIG,
  booking_engine_config: DEFAULT_BOOKING_ENGINE_CONFIG,
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
    gst_rate_below_7500: 5.0,
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

export function saveStoredLocalConfig(config: Partial<Hotel>): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_HOTEL_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
  }
}

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
 * Helper to encode dynamic Website CMS fields into `public.hotels.logo_url`
 * (`public.hotels` has full public SELECT & UPDATE permissions in Supabase).
 */
function encodeCmsPayloadForHotelsTable(config: Partial<Hotel>): string {
  const cmsObject = {
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
    insights_config: config.insights_config || DEFAULT_INSIGHTS_CONFIG,
    inaugural_offer: config.inaugural_offer || DEFAULT_INAUGURAL_OFFER_CONFIG,
    email_verification_config:
      config.email_verification_config || DEFAULT_EMAIL_VERIFICATION_CONFIG,
    booking_engine_config: config.booking_engine_config || DEFAULT_BOOKING_ENGINE_CONFIG,
    cancellation_policy:
      config.cancellation_policy || DEFAULT_HOTEL_INFO.cancellation_policy || '',
    terms_and_conditions:
      config.terms_and_conditions || DEFAULT_HOTEL_INFO.terms_and_conditions || '',
    privacy_policy: config.privacy_policy || DEFAULT_HOTEL_INFO.privacy_policy || '',
    social_links: config.social_links || DEFAULT_SOCIAL_LINKS,
    faq_items:
      config.faq_items && config.faq_items.length > 0 ? config.faq_items : DEFAULT_FAQ_ITEMS,
    updated_at: new Date().toISOString(),
  };
  return `${CMS_JSON_PREFIX}${JSON.stringify(cmsObject)}`;
}

/**
 * Helper to decode dynamic Website CMS fields stored in `public.hotels.logo_url`
 */
function decodeCmsPayloadFromHotelsTable(rawLogoUrl?: string | null): Partial<Hotel> | null {
  if (!rawLogoUrl || !rawLogoUrl.startsWith(CMS_JSON_PREFIX)) {
    return null;
  }
  try {
    const jsonStr = rawLogoUrl.slice(CMS_JSON_PREFIX.length);
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse CMS JSON from hotels.logo_url:', e);
  }
  return null;
}

/**
 * Resolves the canonical UUID of the hotel row in Supabase `public.hotels`.
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
      logo_url: encodeCmsPayloadForHotelsTable({ ...DEFAULT_HOTEL_INFO, ...local }),
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
 */
export function getInitialHotelSync(): Hotel {
  const localConfig = getStoredLocalConfig();
  const unifiedHotel: Hotel = {
    id: localConfig.id || 'ca8ca4c4-d493-490f-8d30-774e8fca42b6',
    ...DEFAULT_HOTEL_INFO,
    ...localConfig,
    email_verification_config: normalizeEmailVerificationConfig(
      localConfig.email_verification_config
    ),
    booking_engine_config: normalizeBookingEngineConfig(localConfig.booking_engine_config),
    created_at: localConfig.created_at || new Date().toISOString(),
    updated_at: localConfig.updated_at || new Date().toISOString(),
  } as Hotel;

  unifiedHotel.phone = getCleanHotelPhone(unifiedHotel.phone);
  unifiedHotel.whatsapp = getCleanHotelWhatsApp(unifiedHotel.whatsapp);
  return unifiedHotel;
}

/**
 * Persists all hotel profile columns AND all dynamic Website CMS settings
 * directly into `public.hotels` (which has full read/write permissions in Supabase)
 * as well as `public.hotel_settings`.
 */
async function persistFullHotelConfigToSupabase(
  targetHotelId: string,
  config: Partial<Hotel>
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !isValidUuid(targetHotelId)) return false;

  try {
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

    // Store complete dynamic Website CMS configuration in `public.hotels.logo_url`
    safeHotelRowUpdates.logo_url = encodeCmsPayloadForHotelsTable(config);

    const { error: hotelUpdateErr } = await supabase
      .from('hotels')
      .update(safeHotelRowUpdates)
      .eq('id', targetHotelId);

    if (hotelUpdateErr) {
      console.warn('Supabase hotels table update error:', hotelUpdateErr);
    }

    // Also attempt to sync to `public.hotel_settings` if RLS allows
    try {
      const cleanSocialLinks: SocialLinks = {
        instagram: config.social_links?.instagram ?? DEFAULT_SOCIAL_LINKS.instagram,
        facebook: config.social_links?.facebook ?? DEFAULT_SOCIAL_LINKS.facebook,
        tripadvisor: config.social_links?.tripadvisor ?? DEFAULT_SOCIAL_LINKS.tripadvisor,
        google_business:
          config.social_links?.google_business ?? DEFAULT_SOCIAL_LINKS.google_business,
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
        social_links: {
          ...cleanSocialLinks,
          cms_initialized: true,
          plus_code: config.plus_code || 'H9FW+8F',
          hero_config: config.hero_config || DEFAULT_HERO_CONFIG,
          amenities_list: config.amenities_list || DEFAULT_AMENITIES_LIST,
          landmarks_list: config.landmarks_list || DEFAULT_LANDMARKS_LIST,
          banquet_config: config.banquet_config || DEFAULT_BANQUET_CONFIG,
          insights_config: config.insights_config || DEFAULT_INSIGHTS_CONFIG,
          inaugural_offer: config.inaugural_offer || DEFAULT_INAUGURAL_OFFER_CONFIG,
          email_verification_config:
            config.email_verification_config || DEFAULT_EMAIL_VERIFICATION_CONFIG,
          booking_engine_config:
            config.booking_engine_config || DEFAULT_BOOKING_ENGINE_CONFIG,
        },
      };

      await supabase.from('hotel_settings').upsert(settingsPayload, { onConflict: 'hotel_id' });
    } catch {
      // Ignore if hotel_settings RLS restricts anon update; public.hotels already stored it
    }

    return !hotelUpdateErr;
  } catch (err) {
    console.warn('Error persisting hotel CMS config to Supabase:', err);
    return false;
  }
}

/**
 * Fetch Unified Hotel & Website CMS Data from Supabase (Single Source of Truth)
 * Always prioritizes `public.hotels` in Supabase over any stale localStorage data.
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

    const [hotelRes, settingsRes] = await Promise.all([
      supabase.from('hotels').select('*').eq('id', resolvedHotelId).maybeSingle(),
      supabase.from('hotel_settings').select('*').eq('hotel_id', resolvedHotelId).maybeSingle(),
    ]);

    const dbHotel = hotelRes.data as Hotel | null;
    const dbSettings = settingsRes.data as any;

    if (dbHotel) {
      // Decode rich CMS payload stored in `public.hotels.logo_url`
      const cmsFromHotelsTable = decodeCmsPayloadFromHotelsTable(dbHotel.logo_url);
      const rawSettingsSocial =
        dbSettings?.social_links && typeof dbSettings.social_links === 'object'
          ? dbSettings.social_links
          : {};

      // If `public.hotels.logo_url` doesn't have the CMS JSON encoded yet, seed it once
      // while strictly keeping `dbHotel` columns (phone, whatsapp, address, etc.) from Supabase!
      if (!cmsFromHotelsTable) {
        const initialCmsSeed: Partial<Hotel> = {
          ...DEFAULT_HOTEL_INFO,
          ...localConfig,
          ...dbHotel, // <-- Supabase dbHotel ALWAYS wins over localConfig!
          id: dbHotel.id,
          phone: getCleanHotelPhone(dbHotel.phone),
          whatsapp: getCleanHotelWhatsApp(dbHotel.whatsapp),
          hero_config:
            rawSettingsSocial.hero_config || localConfig.hero_config || DEFAULT_HERO_CONFIG,
          amenities_list:
            rawSettingsSocial.amenities_list ||
            localConfig.amenities_list ||
            DEFAULT_AMENITIES_LIST,
          landmarks_list:
            rawSettingsSocial.landmarks_list ||
            localConfig.landmarks_list ||
            DEFAULT_LANDMARKS_LIST,
          banquet_config:
            rawSettingsSocial.banquet_config ||
            localConfig.banquet_config ||
            DEFAULT_BANQUET_CONFIG,
          insights_config:
            rawSettingsSocial.insights_config ||
            localConfig.insights_config ||
            DEFAULT_INSIGHTS_CONFIG,
          inaugural_offer:
            rawSettingsSocial.inaugural_offer ||
            localConfig.inaugural_offer ||
            DEFAULT_INAUGURAL_OFFER_CONFIG,
          email_verification_config:
            rawSettingsSocial.email_verification_config ||
            localConfig.email_verification_config ||
            DEFAULT_EMAIL_VERIFICATION_CONFIG,
          plus_code:
            rawSettingsSocial.plus_code ||
            localConfig.plus_code ||
            DEFAULT_HOTEL_INFO.plus_code ||
            'H9FW+8F',
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
          social_links: localConfig.social_links || DEFAULT_SOCIAL_LINKS,
          faq_items:
            localConfig.faq_items && localConfig.faq_items.length > 0
              ? localConfig.faq_items
              : DEFAULT_FAQ_ITEMS,
        };

        await persistFullHotelConfigToSupabase(dbHotel.id, initialCmsSeed);
        saveStoredLocalConfig(initialCmsSeed);
        return initialCmsSeed as Hotel;
      }

      // Pick ALL fields directly from Supabase (`dbHotel` + `cmsFromHotelsTable`)
      unifiedHotel = {
        ...DEFAULT_HOTEL_INFO,
        ...dbHotel,
        id: dbHotel.id,
        logo_url: undefined,
        phone: getCleanHotelPhone(dbHotel.phone),
        whatsapp: getCleanHotelWhatsApp(dbHotel.whatsapp),
        plus_code:
          cmsFromHotelsTable.plus_code ||
          rawSettingsSocial.plus_code ||
          DEFAULT_HOTEL_INFO.plus_code ||
          'H9FW+8F',
        hero_config: {
          ...DEFAULT_HERO_CONFIG,
          ...(cmsFromHotelsTable.hero_config || rawSettingsSocial.hero_config || {}),
        },
        amenities_list:
          Array.isArray(cmsFromHotelsTable.amenities_list) &&
          cmsFromHotelsTable.amenities_list.length > 0
            ? cmsFromHotelsTable.amenities_list
            : DEFAULT_AMENITIES_LIST,
        landmarks_list:
          Array.isArray(cmsFromHotelsTable.landmarks_list) &&
          cmsFromHotelsTable.landmarks_list.length > 0
            ? cmsFromHotelsTable.landmarks_list
            : DEFAULT_LANDMARKS_LIST,
        banquet_config: {
          ...DEFAULT_BANQUET_CONFIG,
          ...(cmsFromHotelsTable.banquet_config || rawSettingsSocial.banquet_config || {}),
        },
        insights_config: {
          ...DEFAULT_INSIGHTS_CONFIG,
          ...(cmsFromHotelsTable.insights_config || rawSettingsSocial.insights_config || {}),
        },
        inaugural_offer: {
          ...DEFAULT_INAUGURAL_OFFER_CONFIG,
          ...(cmsFromHotelsTable.inaugural_offer || rawSettingsSocial.inaugural_offer || {}),
        },
        email_verification_config: normalizeEmailVerificationConfig(
          cmsFromHotelsTable.email_verification_config ||
            rawSettingsSocial.email_verification_config ||
            localConfig.email_verification_config
        ),
        booking_engine_config: normalizeBookingEngineConfig(
          cmsFromHotelsTable.booking_engine_config ||
            rawSettingsSocial.booking_engine_config ||
            localConfig.booking_engine_config
        ),
        social_links: {
          ...DEFAULT_SOCIAL_LINKS,
          ...(cmsFromHotelsTable.social_links || {}),
        },
        faq_items:
          Array.isArray(cmsFromHotelsTable.faq_items) && cmsFromHotelsTable.faq_items.length > 0
            ? cmsFromHotelsTable.faq_items
            : DEFAULT_FAQ_ITEMS,
        cancellation_policy:
          cmsFromHotelsTable.cancellation_policy ||
          dbSettings?.cancellation_policy ||
          DEFAULT_HOTEL_INFO.cancellation_policy,
        terms_and_conditions:
          cmsFromHotelsTable.terms_and_conditions ||
          dbSettings?.terms_and_conditions ||
          DEFAULT_HOTEL_INFO.terms_and_conditions,
        privacy_policy:
          cmsFromHotelsTable.privacy_policy ||
          dbSettings?.privacy_policy ||
          DEFAULT_HOTEL_INFO.privacy_policy,
      } as Hotel;

      // Mirror Supabase data into localStorage cache
      saveStoredLocalConfig(unifiedHotel);
    }
  } catch (err) {
    console.warn('Supabase fetch failed; falling back to cached config:', err);
  }

  return unifiedHotel;
}

/**
 * Update Hotel & Website CMS Data in Supabase (`public.hotels`)
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

    if (merged.phone) merged.phone = getCleanHotelPhone(merged.phone);
    if (merged.whatsapp) merged.whatsapp = getCleanHotelWhatsApp(merged.whatsapp);

    const supabase = getSupabase();
    if (supabase) {
      const targetHotelId = await resolveSupabaseHotelId(id || existing.id);
      if (targetHotelId) {
        merged.id = targetHotelId;
        await persistFullHotelConfigToSupabase(targetHotelId, merged);
      }
    }

    saveStoredLocalConfig(merged);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('hotel_data_updated', { detail: merged }));
    }

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
    } catch {}

    return { success: true };
  } catch (err: any) {
    console.error('Update failed:', err);
    return { success: false, error: err.message };
  }
}

export async function resetHotelToDefaults(hotelId?: string): Promise<Hotel> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_HOTEL_KEY);
  } catch (e) {
    console.warn(e);
  }

  const resolvedId =
    (await resolveSupabaseHotelId(hotelId)) ||
    hotelId ||
    'ca8ca4c4-d493-490f-8d30-774e8fca42b6';

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

export function exportHotelConfigJson(): string {
  const current = getStoredLocalConfig();
  const exportData = {
    ...DEFAULT_HOTEL_INFO,
    ...current,
    exported_at: new Date().toISOString(),
  };
  return JSON.stringify(exportData, null, 2);
}

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
  const resolvedId = (await resolveSupabaseHotelId(hotelId)) || hotel?.id || hotelId;

  return {
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

  return updateHotel(hotelId, localUpdates);
}
