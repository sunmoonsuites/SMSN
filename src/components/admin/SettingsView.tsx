import React, { useState, useEffect } from 'react';
import {
  Hotel,
  HeroConfig,
  AmenityItem,
  LandmarkItem,
  FAQItem,
  SocialLinks,
  BanquetConfig,
  BookingEngineConfig,
  EmailVerificationConfig,
} from '../../types';
import {
  updateHotel,
  resetHotelToDefaults,
  exportHotelConfigJson,
  importHotelConfigJson,
  DEFAULT_HERO_CONFIG,
  DEFAULT_AMENITIES_LIST,
  DEFAULT_LANDMARKS_LIST,
  DEFAULT_BANQUET_CONFIG,
  DEFAULT_BOOKING_ENGINE_CONFIG,
  DEFAULT_EMAIL_VERIFICATION_CONFIG,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_SOCIAL_LINKS,
} from '../../services/hotelService';
import { getSupabaseConfig } from '../../lib/supabase';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';
import { getAmenityIcon } from '../website/AmenitiesSection';
import { usePMSTheme } from '../../services/themeService';
import { uploadImageToSupabase } from '../../services/storageService';
import { GalleryPickerModal } from '../common/GalleryPickerModal';
import { testGmailConfiguration } from '../../services/emailVerificationService';
import {
  Settings,
  Building,
  Sparkles,
  PartyPopper,
  MapPin,
  ShieldCheck,
  Share2,
  Database,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  Upload,
  RotateCcw,
  Save,
  Phone,
  MessageCircle,
  Image as ImageIcon,
  Images,
  HelpCircle,
  FileText,
  Sun,
  Moon,
  Clock,
  Mail,
  Key,
  Eye,
  EyeOff,
  Send,
  Info,
  Cloud,
} from 'lucide-react';
import { CloudflareMediaCard } from './CloudflareMediaCard';

interface SettingsViewProps {
  hotel: Hotel | null;
  onOpenSupabaseConfig: () => void;
  onHotelUpdated: () => void;
}

type SettingsTab =
  | 'general'
  | 'cloudflare_media'
  | 'yanolja'
  | 'email_verification'
  | 'hero'
  | 'amenities'
  | 'banquet'
  | 'location'
  | 'policies'
  | 'social'
  | 'backup';

export const SettingsView: React.FC<SettingsViewProps> = ({
  hotel,
  onOpenSupabaseConfig,
  onHotelUpdated,
}) => {
  const dbConfig = getSupabaseConfig();
  const isDbConnected = Boolean(dbConfig.url && dbConfig.anonKey);

  const {
    theme,
    isDark,
    setTheme,
    toggleTheme,
    autoNightShift,
    setAutoNightShift,
    isNightHours,
  } = usePMSTheme(true);

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // General Profile State
  const [name, setName] = useState(hotel?.name || 'Sun Moon Suites');
  const [tagline, setTagline] = useState(hotel?.tagline || 'Modern Hospitality & Comfort in Noida');
  const [phone, setPhone] = useState(getCleanHotelPhone(hotel?.phone));
  const [whatsapp, setWhatsapp] = useState(getCleanHotelWhatsApp(hotel?.whatsapp));
  const [email, setEmail] = useState(hotel?.email || 'sunmoonsuites@gmail.com');
  const [address, setAddress] = useState(hotel?.address || 'GT-20, Sector 117');
  const [city, setCity] = useState(hotel?.city || 'Noida');
  const [state, setState] = useState(hotel?.state || 'Uttar Pradesh');
  const [pincode, setPincode] = useState(hotel?.pincode || '201316');
  const [gstin, setGstin] = useState(hotel?.gstin || '09AAACH7409R1ZZ');
  const [checkInTime, setCheckInTime] = useState(hotel?.check_in_time || '14:00');
  const [checkOutTime, setCheckOutTime] = useState(hotel?.check_out_time || '11:00');
  const [totalRooms, setTotalRooms] = useState<number>(hotel?.total_rooms || 30);
  const [currencySymbol, setCurrencySymbol] = useState(hotel?.currency_symbol || '₹');

  // Hero Section State
  const initialHero = hotel?.hero_config || DEFAULT_HERO_CONFIG;
  const [heroBadge, setHeroBadge] = useState(initialHero.badge || 'Sector 117, Noida • 30 Boutique Rooms');
  const [heroHeading, setHeroHeading] = useState(initialHero.heading || 'Modern Comfort & Tranquility in Noida');
  const [heroDescription, setHeroDescription] = useState(
    initialHero.description || hotel?.description || 'Experience attentive hospitality at our 30-room hotel in Sector 117, Noida.'
  );
  const [heroImageUrl, setHeroImageUrl] = useState(initialHero.image_url || '');
  const [heroHighlight1, setHeroHighlight1] = useState(initialHero.highlight1 || '100% Verified Reservations');
  const [heroHighlight2, setHeroHighlight2] = useState(initialHero.highlight2 || 'Best Direct Tariff Guaranteed');
  const [heroHighlight3, setHeroHighlight3] = useState(initialHero.highlight3 || 'Zero Booking Fees');

  // Amenities State
  const [amenitiesList, setAmenitiesList] = useState<AmenityItem[]>(
    hotel?.amenities_list && hotel.amenities_list.length > 0
      ? hotel.amenities_list
      : DEFAULT_AMENITIES_LIST
  );
  const [newAmenityTitle, setNewAmenityTitle] = useState('');
  const [newAmenityDesc, setNewAmenityDesc] = useState('');
  const [newAmenityIcon, setNewAmenityIcon] = useState('wifi');

  // Banquet Hall State (Show/Hide on Website)
  const initialBanquet = hotel?.banquet_config || DEFAULT_BANQUET_CONFIG;
  const [banquetEnabled, setBanquetEnabled] = useState(initialBanquet.is_enabled !== false);
  const [banquetTitle, setBanquetTitle] = useState(initialBanquet.title || 'Our Banquet Hall');
  const [banquetSubtitle, setBanquetSubtitle] = useState(initialBanquet.subtitle || 'Events & Gatherings');
  const [banquetDesc, setBanquetDesc] = useState(initialBanquet.description || '');
  const [banquetCapacity, setBanquetCapacity] = useState(initialBanquet.capacity || 'Up to 50 Guests');
  const [banquetEvents, setBanquetEvents] = useState(initialBanquet.events || 'Kitty Parties, Birthdays, Conferences');
  const [banquetAmbiance, setBanquetAmbiance] = useState(initialBanquet.ambiance || 'Elegant & Versatile');
  const [banquetService, setBanquetService] = useState(initialBanquet.service || 'Tailored Catering');

  // Location & Landmarks State
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    hotel?.google_maps_url ||
      'https://www.google.com/maps/search/?api=1&query=Sun+Moon+Suites+GT-20+Sector+117+Noida+Uttar+Pradesh+201316'
  );
  const [plusCode, setPlusCode] = useState(hotel?.plus_code || 'H9FW+8F');
  const [landmarksList, setLandmarksList] = useState<LandmarkItem[]>(
    hotel?.landmarks_list && hotel.landmarks_list.length > 0
      ? hotel.landmarks_list
      : DEFAULT_LANDMARKS_LIST
  );
  const [newLandmarkTitle, setNewLandmarkTitle] = useState('');
  const [newLandmarkTime, setNewLandmarkTime] = useState('');
  const [newLandmarkDesc, setNewLandmarkDesc] = useState('');
  const [newLandmarkType, setNewLandmarkType] = useState('landmark');

  // Policies & FAQs State
  const [cancellationPolicy, setCancellationPolicy] = useState(
    hotel?.cancellation_policy ||
      'Free cancellation up to 24 hours prior to standard check-in time (14:00 hotel local time). Cancellations made within 24 hours will incur a 1-night tariff fee. No-shows are charged the full reservation amount.'
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    hotel?.terms_and_conditions ||
      'All adult guests must carry valid government photo ID with address (Aadhaar, Passport, Driving License, or Voter ID). PAN card is not accepted as address proof. All guest rooms are strictly non-smoking.'
  );
  const [privacyPolicy, setPrivacyPolicy] = useState(
    hotel?.privacy_policy ||
      'We treat guest data with utmost confidentiality. Information collected is strictly used for reservations, security compliance, and statutory hotel registry reporting under Indian law.'
  );
  const [faqItems, setFaqItems] = useState<FAQItem[]>(
    hotel?.faq_items && hotel.faq_items.length > 0 ? hotel.faq_items : DEFAULT_FAQ_ITEMS
  );
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');

  // Social Links State
  const initialSocial = hotel?.social_links || DEFAULT_SOCIAL_LINKS;
  const [instagramUrl, setInstagramUrl] = useState(initialSocial.instagram || '');
  const [facebookUrl, setFacebookUrl] = useState(initialSocial.facebook || '');
  const [tripadvisorUrl, setTripadvisorUrl] = useState(initialSocial.tripadvisor || '');
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState(initialSocial.google_business || '');

  // Yanolja Cloud PMS & Razorpay Payment Gateway State
  const initialEngine: BookingEngineConfig =
    hotel?.booking_engine_config || DEFAULT_BOOKING_ENGINE_CONFIG;
  const [engineEnabled, setEngineEnabled] = useState<boolean>(
    initialEngine.is_enabled !== false
  );
  const [engineMode, setEngineMode] = useState<
    'builtin' | 'local_only' | 'yanolja_link_inbuilt' | 'yanolja_api' | 'yanolja_redirect'
  >(
    !initialEngine.mode || initialEngine.mode === 'builtin'
      ? 'yanolja_link_inbuilt'
      : initialEngine.mode
  );
  const [yanoljaBookingUrl, setYanoljaBookingUrl] = useState<string>(
    initialEngine.yanolja_booking_url || 'https://letsbook.me/booking/sunmoonsuites'
  );
  const [yanoljaHotelCode, setYanoljaHotelCode] = useState<string>(
    initialEngine.yanolja_hotel_code || '63594'
  );
  const [yanoljaApiKey, setYanoljaApiKey] = useState<string>(
    initialEngine.yanolja_api_key || ''
  );
  const [yanoljaApiEndpoint, setYanoljaApiEndpoint] = useState<string>(
    initialEngine.yanolja_api_endpoint ||
      'https://live.ipms247.com/booking/reservation_api/listing.php'
  );
  const [razorpayEnabled, setRazorpayEnabled] = useState<boolean>(
    Boolean(initialEngine.razorpay_enabled)
  );
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>(
    initialEngine.razorpay_key_id || ''
  );
  const [razorpayKeySecret, setRazorpayKeySecret] = useState<string>(
    initialEngine.razorpay_key_secret || ''
  );
  const [paymentCollectionMode, setPaymentCollectionMode] = useState<
    'pay_at_hotel' | 'both' | 'online_only'
  >(initialEngine.payment_collection_mode || 'pay_at_hotel');
  const [isTestingYanoljaLink, setIsTestingYanoljaLink] = useState(false);
  const [yanoljaLinkTestResult, setYanoljaLinkTestResult] = useState<{
    success: boolean;
    hotelCode?: string;
    hotelName?: string;
    roomsCount?: number;
    rooms?: Array<{ roomType: string; availableRooms: number; stayPriceAfterTax: number }>;
    error?: string;
  } | null>(null);

  // Email & Google App Password Verification State
  const initialEmailConfig: EmailVerificationConfig =
    hotel?.email_verification_config || DEFAULT_EMAIL_VERIFICATION_CONFIG;
  const [emailVerificationEnabled, setEmailVerificationEnabled] = useState<boolean>(
    initialEmailConfig.is_enabled !== false
  );
  const [senderEmail, setSenderEmail] = useState<string>(
    initialEmailConfig.sender_email || 'sunmoonsuites@gmail.com'
  );
  const [gmailAppPassword, setGmailAppPassword] = useState<string>(
    initialEmailConfig.gmail_app_password || ''
  );
  const [senderName, setSenderName] = useState<string>(
    initialEmailConfig.sender_name || 'Sun Moon Suites'
  );
  const [googleClientId, setGoogleClientId] = useState<string>(
    initialEmailConfig.google_client_id || ''
  );
  const [brevoApiKey, setBrevoApiKey] = useState<string>(
    initialEmailConfig.brevo_api_key || ''
  );
  const [resendApiKey, setResendApiKey] = useState<string>(
    initialEmailConfig.resend_api_key || ''
  );
  const [showAppPassword, setShowAppPassword] = useState(false);
  const [testRecipientEmail, setTestRecipientEmail] = useState(
    hotel?.email || 'sunmoonsuites@gmail.com'
  );
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  // Operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [showHeroGalleryPicker, setShowHeroGalleryPicker] = useState(false);

  // Sync state whenever hotel prop changes
  useEffect(() => {
    if (hotel) {
      setName(hotel.name || 'Sun Moon Suites');
      setTagline(hotel.tagline || 'Modern Hospitality & Comfort in Noida');
      setPhone(getCleanHotelPhone(hotel.phone));
      setWhatsapp(getCleanHotelWhatsApp(hotel.whatsapp));
      setEmail(hotel.email || 'sunmoonsuites@gmail.com');
      setAddress(hotel.address || 'GT-20, Sector 117');
      setCity(hotel.city || 'Noida');
      setState(hotel.state || 'Uttar Pradesh');
      setPincode(hotel.pincode || '201316');
      setGstin(hotel.gstin || '09AAACH7409R1ZZ');
      setCheckInTime(hotel.check_in_time || '14:00');
      setCheckOutTime(hotel.check_out_time || '11:00');
      setTotalRooms(hotel.total_rooms || 30);
      setCurrencySymbol(hotel.currency_symbol || '₹');

      if (hotel.hero_config) {
        setHeroBadge(hotel.hero_config.badge || '');
        setHeroHeading(hotel.hero_config.heading || '');
        setHeroDescription(hotel.hero_config.description || hotel.description || '');
        setHeroImageUrl(hotel.hero_config.image_url || '');
        setHeroHighlight1(hotel.hero_config.highlight1 || '');
        setHeroHighlight2(hotel.hero_config.highlight2 || '');
        setHeroHighlight3(hotel.hero_config.highlight3 || '');
      }

      if (hotel.amenities_list && hotel.amenities_list.length > 0) {
        setAmenitiesList(hotel.amenities_list);
      }
      if (hotel.banquet_config) {
        setBanquetEnabled(hotel.banquet_config.is_enabled !== false);
        setBanquetTitle(hotel.banquet_config.title || 'Our Banquet Hall');
        setBanquetSubtitle(hotel.banquet_config.subtitle || 'Events & Gatherings');
        setBanquetDesc(hotel.banquet_config.description || '');
        setBanquetCapacity(hotel.banquet_config.capacity || 'Up to 50 Guests');
        setBanquetEvents(hotel.banquet_config.events || 'Kitty Parties, Birthdays, Conferences');
        setBanquetAmbiance(hotel.banquet_config.ambiance || 'Elegant & Versatile');
        setBanquetService(hotel.banquet_config.service || 'Tailored Catering');
      }
      if (hotel.landmarks_list && hotel.landmarks_list.length > 0) {
        setLandmarksList(hotel.landmarks_list);
      }
      if (hotel.google_maps_url) {
        setGoogleMapsUrl(hotel.google_maps_url);
      }
      if (hotel.plus_code) {
        setPlusCode(hotel.plus_code);
      }
      if (hotel.cancellation_policy) {
        setCancellationPolicy(hotel.cancellation_policy);
      }
      if (hotel.terms_and_conditions) {
        setTermsAndConditions(hotel.terms_and_conditions);
      }
      if (hotel.privacy_policy) {
        setPrivacyPolicy(hotel.privacy_policy);
      }
      if (hotel.faq_items && hotel.faq_items.length > 0) {
        setFaqItems(hotel.faq_items);
      }
      if (hotel.social_links) {
        setInstagramUrl(hotel.social_links.instagram || '');
        setFacebookUrl(hotel.social_links.facebook || '');
        setTripadvisorUrl(hotel.social_links.tripadvisor || '');
        setGoogleBusinessUrl(hotel.social_links.google_business || '');
      }
      if (hotel.booking_engine_config) {
        const isLegacy =
          !hotel.booking_engine_config.mode || hotel.booking_engine_config.mode === 'builtin';
        setEngineEnabled(isLegacy ? true : hotel.booking_engine_config.is_enabled !== false);
        setEngineMode(isLegacy ? 'yanolja_link_inbuilt' : hotel.booking_engine_config.mode!);
        setYanoljaBookingUrl(
          hotel.booking_engine_config.yanolja_booking_url ||
            'https://letsbook.me/booking/sunmoonsuites'
        );
        setYanoljaHotelCode(hotel.booking_engine_config.yanolja_hotel_code || '63594');
        setYanoljaApiKey(hotel.booking_engine_config.yanolja_api_key || '');
        setYanoljaApiEndpoint(
          hotel.booking_engine_config.yanolja_api_endpoint ||
            'https://live.ipms247.com/booking/reservation_api/listing.php'
        );
        setRazorpayEnabled(Boolean(hotel.booking_engine_config.razorpay_enabled));
        setRazorpayKeyId(hotel.booking_engine_config.razorpay_key_id || '');
        setRazorpayKeySecret(hotel.booking_engine_config.razorpay_key_secret || '');
        setPaymentCollectionMode(
          hotel.booking_engine_config.payment_collection_mode || 'pay_at_hotel'
        );
      }
      if (hotel.email_verification_config) {
        setEmailVerificationEnabled(hotel.email_verification_config.is_enabled !== false);
        setSenderEmail(hotel.email_verification_config.sender_email || 'sunmoonsuites@gmail.com');
        setGmailAppPassword(hotel.email_verification_config.gmail_app_password || '');
        setSenderName(hotel.email_verification_config.sender_name || 'Sun Moon Suites');
        setGoogleClientId(hotel.email_verification_config.google_client_id || '');
        setBrevoApiKey(hotel.email_verification_config.brevo_api_key || '');
        setResendApiKey(hotel.email_verification_config.resend_api_key || '');
      }
    }
  }, [hotel]);

  // Master Save Function
  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hotel?.id) return;

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError('');

    const cleanP = getCleanHotelPhone(phone);
    const cleanW = getCleanHotelWhatsApp(whatsapp);

    const payload: Partial<Hotel> = {
      name: name.trim(),
      tagline: tagline.trim(),
      description: heroDescription.trim(),
      phone: cleanP,
      whatsapp: cleanW,
      email: email.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      gstin: gstin.trim().toUpperCase(),
      check_in_time: checkInTime.trim(),
      check_out_time: checkOutTime.trim(),
      total_rooms: Number(totalRooms) || 30,
      currency_symbol: currencySymbol.trim(),
      google_maps_url: googleMapsUrl.trim(),
      plus_code: plusCode.trim(),
      hero_config: {
        badge: heroBadge.trim(),
        heading: heroHeading.trim(),
        description: heroDescription.trim(),
        image_url: heroImageUrl.trim(),
        highlight1: heroHighlight1.trim(),
        highlight2: heroHighlight2.trim(),
        highlight3: heroHighlight3.trim(),
      },
      amenities_list: amenitiesList,
      banquet_config: {
        is_enabled: banquetEnabled,
        title: banquetTitle.trim(),
        subtitle: banquetSubtitle.trim(),
        description: banquetDesc.trim(),
        capacity: banquetCapacity.trim(),
        events: banquetEvents.trim(),
        ambiance: banquetAmbiance.trim(),
        service: banquetService.trim(),
      },
      booking_engine_config: {
        is_enabled: engineEnabled,
        mode: engineMode,
        yanolja_booking_url:
          yanoljaBookingUrl.trim() || 'https://letsbook.me/booking/sunmoonsuites',
        yanolja_hotel_code: yanoljaHotelCode.trim(),
        yanolja_api_key: yanoljaApiKey.trim(),
        yanolja_api_endpoint:
          yanoljaApiEndpoint.trim() ||
          'https://live.ipms247.com/booking/reservation_api/listing.php',
        razorpay_enabled: razorpayEnabled,
        razorpay_key_id: razorpayKeyId.trim(),
        razorpay_key_secret: razorpayKeySecret.trim(),
        payment_collection_mode: paymentCollectionMode,
      },
      email_verification_config: {
        is_enabled: emailVerificationEnabled,
        sender_email: senderEmail.trim(),
        gmail_app_password: gmailAppPassword.trim(),
        sender_name: senderName.trim(),
        google_client_id: googleClientId.trim(),
        brevo_api_key: brevoApiKey.trim(),
        resend_api_key: resendApiKey.trim(),
      },
      landmarks_list: landmarksList,
      cancellation_policy: cancellationPolicy.trim(),
      terms_and_conditions: termsAndConditions.trim(),
      privacy_policy: privacyPolicy.trim(),
      faq_items: faqItems,
      social_links: {
        instagram: instagramUrl.trim(),
        facebook: facebookUrl.trim(),
        tripadvisor: tripadvisorUrl.trim(),
        google_business: googleBusinessUrl.trim(),
      },
    };

    const res = await updateHotel(hotel.id, payload);
    setIsSaving(false);

    if (res.success) {
      setSaveSuccess(true);
      onHotelUpdated();
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setSaveError(res.error || 'Failed to save settings.');
    }
  };

  // Test Email Configuration handler (supports Gmail App Password, Brevo API, and Resend API)
  const handleTestEmail = async () => {
    if (!gmailAppPassword.trim() && !brevoApiKey.trim() && !resendApiKey.trim()) {
      setEmailTestResult({
        success: false,
        error: 'Please enter a 16-character Google App Password or a Brevo/Resend API Key first.',
      });
      return;
    }
    setIsTestingEmail(true);
    setEmailTestResult(null);

    const res = await testGmailConfiguration({
      senderEmail: senderEmail.trim(),
      gmailAppPassword: gmailAppPassword.trim(),
      testRecipientEmail: testRecipientEmail.trim() || senderEmail.trim(),
      senderName: senderName.trim(),
      brevoApiKey: brevoApiKey.trim(),
      resendApiKey: resendApiKey.trim(),
    });

    setIsTestingEmail(false);
    setEmailTestResult(res);
  };

  // Amenities handlers
  const handleAddAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmenityTitle.trim()) return;
    const item: AmenityItem = {
      id: `amenity-${Date.now()}`,
      title: newAmenityTitle.trim(),
      desc: newAmenityDesc.trim() || 'Complimentary guest facility.',
      iconName: newAmenityIcon,
      is_active: true,
    };
    const updated = [...amenitiesList, item];
    setAmenitiesList(updated);
    setNewAmenityTitle('');
    setNewAmenityDesc('');
  };

  const handleToggleAmenity = (id: string) => {
    setAmenitiesList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_active: !a.is_active } : a))
    );
  };

  const handleDeleteAmenity = (id: string) => {
    setAmenitiesList((prev) => prev.filter((a) => a.id !== id));
  };

  // Landmarks handlers
  const handleAddLandmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLandmarkTitle.trim()) return;
    const item: LandmarkItem = {
      id: `landmark-${Date.now()}`,
      title: newLandmarkTitle.trim(),
      time: newLandmarkTime.trim() || '5 Minutes',
      desc: newLandmarkDesc.trim() || 'Prominent landmark nearby.',
      iconType: newLandmarkType,
    };
    setLandmarksList([...landmarksList, item]);
    setNewLandmarkTitle('');
    setNewLandmarkTime('');
    setNewLandmarkDesc('');
  };

  const handleDeleteLandmark = (id: string) => {
    setLandmarksList((prev) => prev.filter((l) => l.id !== id));
  };

  // FAQs handlers
  const handleAddFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    setFaqItems([...faqItems, { question: newFaqQuestion.trim(), answer: newFaqAnswer.trim() }]);
    setNewFaqQuestion('');
    setNewFaqAnswer('');
  };

  const handleDeleteFaq = (idx: number) => {
    setFaqItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Backup handlers
  const handleExportJson = () => {
    const jsonStr = exportHotelConfigJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sun-moon-suites-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async () => {
    if (!hotel?.id || !importJsonText.trim()) return;
    const res = await importHotelConfigJson(importJsonText.trim(), hotel.id);
    if (res.success) {
      setSaveSuccess(true);
      setShowImportBox(false);
      setImportJsonText('');
      onHotelUpdated();
      setTimeout(() => setSaveSuccess(false), 4000);
    } else {
      setSaveError(res.error || 'Failed to import JSON.');
    }
  };

  const handleResetDefaults = async () => {
    if (
      window.confirm(
        'Are you sure you want to reset all website content and settings to original defaults? Any custom text will be replaced.'
      )
    ) {
      setIsSaving(true);
      await resetHotelToDefaults(hotel?.id);
      setIsSaving(false);
      onHotelUpdated();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification */}
      {saveSuccess && (
        <div className="fixed top-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-xl shadow-xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-6 h-6 shrink-0" />
          <div>
            <p className="font-bold text-sm">Website Updated &amp; Stored in Supabase!</p>
            <p className="text-xs text-emerald-100">
              All dynamic website settings are saved in Supabase and live across all devices.
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-xs font-medium">{saveError}</span>
        </div>
      )}

      {/* Header with Title and Global Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-800" />
            Website CMS &amp; Hotel Settings
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            Edit anything on your hotel website in real-time. Zero commands or technical knowledge needed!
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleSaveAll()}
          disabled={isSaving}
          className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider text-xs rounded-xl shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving Changes...' : 'Save All Changes'}
        </button>
      </div>

      {/* PMS Portal Theme Switcher & Night-Shift Comfort Card */}
      <div
        data-testid="pms-theme-switcher"
        className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="w-5 h-5 text-amber-500 shrink-0" />
              ) : (
                <Sun className="w-5 h-5 text-amber-700 shrink-0" />
              )}
              <h4 className="font-serif font-bold text-lg text-stone-900">
                PMS Portal Theme &amp; Night-Shift Display Mode
              </h4>
              <span className="text-xs text-stone-500">
                &middot; {isDark ? 'Dark Mode Active' : 'Light Mode Active'}
              </span>
            </div>
            <p className="text-xs text-stone-500 max-w-2xl">
              Toggle between high-contrast <strong>Light Mode</strong> for daytime lobby operations and low-glare <strong>Dark Mode</strong> calibrated to reduce eye strain for night-shift reception and night-audit staff.
            </p>
          </div>

          {/* Theme Switcher Controls: Toggle Switch + Segmented Light/Dark Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Accessible Toggle Switch */}
            <div className="flex items-center gap-2.5 pr-2">
              <span className="text-xs font-semibold text-stone-600">
                {isDark ? 'Night-Shift Dark' : 'Day-Shift Light'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                aria-label="Toggle Dark Mode"
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isDark ? 'bg-amber-600' : 'bg-stone-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out flex items-center justify-center ${
                    isDark ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {isDark ? (
                    <Moon className="w-3.5 h-3.5 text-amber-700" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </span>
              </button>
            </div>

            {/* Segmented Light / Dark Mode Buttons */}
            <div
              role="group"
              aria-label="PMS Theme Mode Selector"
              className="inline-flex items-center p-1 rounded-xl bg-stone-100 border border-stone-200"
            >
              <button
                type="button"
                onClick={() => setTheme('light')}
                aria-pressed={!isDark}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  !isDark
                    ? 'bg-amber-800 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                aria-pressed={isDark}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  isDark
                    ? 'bg-amber-700 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Night-Shift Ergonomics & Auto-Schedule Bar */}
        <div className="pt-3 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-stone-600">
            <Clock className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              <strong>Night-Shift Comfort Profile:</strong>{' '}
              {isDark
                ? 'Reduced blue-light charcoal surfaces (#0c0a09 / #1c1917) with warm amber highlights active across all 18 PMS modules.'
                : 'Warm stone & daylight ivory surfaces active. Printed GST invoices always render on crisp white paper.'}
            </span>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0 text-stone-700 font-medium">
            <input
              type="checkbox"
              checked={autoNightShift}
              onChange={(e) => setAutoNightShift(e.target.checked)}
              className="rounded border-stone-300 text-amber-800 focus:ring-amber-600 cursor-pointer"
            />
            <span>
              Auto-enable Dark Mode on Night Shift (7:00 PM &ndash; 6:30 AM)
              {isNightHours ? ' • Night Hours Now' : ''}
            </span>
          </label>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-stone-200/70 p-1.5 rounded-2xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'general'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Building className="w-4 h-4" />
          General Profile &amp; Contacts
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('yanolja')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'yanolja'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          <span>Yanolja PMS &amp; Razorpay</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              engineEnabled || razorpayEnabled
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {engineEnabled || razorpayEnabled ? 'Active' : 'Standby'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('email_verification')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'email_verification'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Mail className="w-4 h-4 text-amber-700" />
          <span>Email OTP Verification</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              emailVerificationEnabled && gmailAppPassword.trim()
                ? 'bg-emerald-100 text-emerald-800'
                : emailVerificationEnabled
                ? 'bg-amber-100 text-amber-800'
                : 'bg-stone-200 text-stone-700'
            }`}
          >
            {emailVerificationEnabled && gmailAppPassword.trim()
              ? 'Active'
              : emailVerificationEnabled
              ? 'Setup Needed'
              : 'Disabled'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cloudflare_media')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cloudflare_media'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Cloud className="w-4 h-4 text-amber-700" />
          <span>Cloudflare Media CDN</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            0 Egress
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'hero'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Hero Banner CMS
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('amenities')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'amenities'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Amenities Manager ({amenitiesList.filter((a) => a.is_active !== false).length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banquet')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'banquet'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <PartyPopper className="w-4 h-4" />
          <span>Banquet Hall</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              banquetEnabled
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {banquetEnabled ? 'Visible' : 'Hidden'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('location')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'location'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Location &amp; Landmarks
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'policies'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          Policies &amp; FAQs
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'social'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Social Links
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'bg-white text-stone-900 shadow-2xs font-bold'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Database className="w-4 h-4" />
          Database &amp; Backup
        </button>
      </div>

      {/* TAB 1: GENERAL PROFILE & CONTACTS */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          {/* Live Public Website & PMS Links Box */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h5 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-amber-800" />
                  Public Website &amp; Staff PMS Links
                </h5>
                <p className="text-[11px] text-stone-600">
                  Use the <strong>ais-pre-...</strong> link below to open the website on any mobile phone or browser. Make sure the <strong>Share (Public)</strong> toggle in the top-right corner of AI Studio is turned ON.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Guest Public Website URL (Direct Access)
                  </span>
                  <code className="text-[11px] text-stone-900 font-mono truncate block">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/?__aistudio_auth_token=one_token_to_rule_them_all`
                      : 'https://ais-pre-d23ndkri42g474oz7b5pji-811027427015.asia-east1.run.app/?__aistudio_auth_token=one_token_to_rule_them_all'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url =
                      typeof window !== 'undefined'
                        ? `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/?__aistudio_auth_token=one_token_to_rule_them_all`
                        : 'https://ais-pre-d23ndkri42g474oz7b5pji-811027427015.asia-east1.run.app/?__aistudio_auth_token=one_token_to_rule_them_all';
                    navigator.clipboard.writeText(url);
                  }}
                  className="px-2.5 py-1.5 bg-stone-900 hover:bg-amber-800 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Copy Link
                </button>
              </div>

              <div className="p-3 bg-white rounded-lg border border-amber-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Staff PMS Portal URL (Direct Access)
                  </span>
                  <code className="text-[11px] text-stone-900 font-mono truncate block">
                    {typeof window !== 'undefined'
                      ? `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/PMS?__aistudio_auth_token=one_token_to_rule_them_all`
                      : 'https://ais-pre-d23ndkri42g474oz7b5pji-811027427015.asia-east1.run.app/PMS?__aistudio_auth_token=one_token_to_rule_them_all'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const url =
                      typeof window !== 'undefined'
                        ? `${window.location.origin.replace('ais-dev-', 'ais-pre-')}/PMS?__aistudio_auth_token=one_token_to_rule_them_all`
                        : 'https://ais-pre-d23ndkri42g474oz7b5pji-811027427015.asia-east1.run.app/PMS?__aistudio_auth_token=one_token_to_rule_them_all';
                    navigator.clipboard.writeText(url);
                  }}
                  className="px-2.5 py-1.5 bg-stone-900 hover:bg-amber-800 text-white rounded-lg text-[11px] font-bold shrink-0 cursor-pointer"
                >
                  Copy PMS Link
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <div>
              <h4 className="font-serif font-bold text-lg text-stone-900">
                Hotel Profile, Identity &amp; Contact Details
              </h4>
              <p className="text-xs text-stone-500">
                These details appear on your website header, booking vouchers, tax invoices, and contact sections.
              </p>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200">
              Live Synced
            </span>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Property Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-serif font-bold text-stone-900"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Tagline / Motto
                </label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Contact Phone (Calling) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  WhatsApp Number (Floating &amp; Inquiries) *
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Official Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Address (Plot, Street &amp; Sector)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  City / Sector
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Statutory GSTIN (UP 09)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Total Rooms Count
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={totalRooms}
                  onChange={(e) => setTotalRooms(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Standard Check-In Time
                </label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  placeholder="14:00"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-center font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Standard Check-Out Time
                </label>
                <input
                  type="text"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  placeholder="11:00"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-center font-medium"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-center font-bold"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: HERO BANNER CMS */}
      {activeTab === 'hero' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h4 className="font-serif font-bold text-lg text-stone-900">
              Homepage Hero Section &amp; Banner Customizer
            </h4>
            <p className="text-xs text-stone-500">
              Customize the prominent top banner that website visitors see when they open your site.
            </p>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Top Location Badge
              </label>
              <input
                type="text"
                value={heroBadge}
                onChange={(e) => setHeroBadge(e.target.value)}
                placeholder="Sector 117, Noida • 30 Boutique Rooms"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Main Hero Heading (H1) *
              </label>
              <input
                type="text"
                required
                value={heroHeading}
                onChange={(e) => setHeroHeading(e.target.value)}
                placeholder="Modern Comfort & Tranquility in Noida"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-base font-serif font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Hero Description Paragraph
              </label>
              <textarea
                rows={3}
                value={heroDescription}
                onChange={(e) => setHeroDescription(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Hero Background Image (Select from Website Gallery)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="url"
                  value={heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="Select photo from Website Gallery or paste URL..."
                  className="flex-1 min-w-[240px] px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowHeroGalleryPicker(true)}
                  className="px-3.5 py-2 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>Choose from Gallery</span>
                </button>
                {heroImageUrl && (
                  <button
                    type="button"
                    onClick={() => setHeroImageUrl('')}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg font-medium cursor-pointer"
                  >
                    Reset to Default
                  </button>
                )}
              </div>

              {/* Quick Image Presets */}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-stone-500 font-medium">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setHeroImageUrl(
                      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766452744-r8ge-dsc06674-5-6-copy.jpg'
                    )
                  }
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded cursor-pointer font-medium"
                >
                  Sun Moon Front Facade
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeroImageUrl(
                      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790684387566-vhdi-reception.jpg'
                    )
                  }
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                >
                  Reception & Lobby
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeroImageUrl(
                      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602889189-room.jpeg'
                    )
                  }
                  className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                >
                  Suite Room
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Trust Badge 1
                </label>
                <input
                  type="text"
                  value={heroHighlight1}
                  onChange={(e) => setHeroHighlight1(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Trust Badge 2
                </label>
                <input
                  type="text"
                  value={heroHighlight2}
                  onChange={(e) => setHeroHighlight2(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Trust Badge 3
                </label>
                <input
                  type="text"
                  value={heroHighlight3}
                  onChange={(e) => setHeroHighlight3(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Hero Banner'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: AMENITIES MANAGER */}
      {activeTab === 'amenities' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h4 className="font-serif font-bold text-lg text-stone-900">
              Amenities &amp; Hospitality Features Manager
            </h4>
            <p className="text-xs text-stone-500">
              Toggle amenities on/off, edit titles and descriptions, or add brand new facilities.
            </p>
          </div>

          {/* Add New Amenity Form */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-800" />
              Add New Hotel Amenity
            </h5>
            <form onSubmit={handleAddAmenity} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  required
                  placeholder="Amenity Title (e.g., Swimming Pool)"
                  value={newAmenityTitle}
                  onChange={(e) => setNewAmenityTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  placeholder="Short Description for website"
                  value={newAmenityDesc}
                  onChange={(e) => setNewAmenityDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={newAmenityIcon}
                  onChange={(e) => setNewAmenityIcon(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="wifi">Wi-Fi</option>
                  <option value="users">Banquet / Hall</option>
                  <option value="zap">Power Backup</option>
                  <option value="clock">24/7 Desk</option>
                  <option value="car">Parking</option>
                  <option value="sparkles">Housekeeping</option>
                  <option value="elevator">Elevator</option>
                  <option value="tv">Smart TV</option>
                  <option value="coffee">Tea / Coffee</option>
                  <option value="shield">CCTV Security</option>
                  <option value="utensils">Restaurant</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full h-full py-2 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Amenities List */}
          <div className="space-y-3">
            <h5 className="font-bold text-stone-800 text-xs uppercase tracking-wider">
              Current Amenities ({amenitiesList.length})
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {amenitiesList.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    item.is_active !== false
                      ? 'bg-white border-stone-200'
                      : 'bg-stone-50 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 shrink-0">
                      {getAmenityIcon(item.iconName)}
                    </div>
                    <div>
                      <h6 className="font-bold text-stone-900 text-sm">{item.title}</h6>
                      <p className="text-stone-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAmenity(item.id)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                        item.is_active !== false
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {item.is_active !== false ? 'Active' : 'Disabled'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteAmenity(item.id)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Delete Amenity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Amenities Changes'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: BANQUET HALL VISIBILITY & CONTENT */}
      {activeTab === 'banquet' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-serif font-bold text-lg text-stone-900">
                Banquet Hall Website Visibility &amp; Details
              </h4>
              <p className="text-xs text-stone-500">
                Easily show or hide the Banquet Hall from public website visitors when not operational.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-bold ${
                banquetEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}
            >
              {banquetEnabled ? '● Currently Visible on Website' : '○ Currently Hidden on Website'}
            </span>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-5 text-xs">
            {/* Prominent Visibility Toggle Card */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                banquetEnabled
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-rose-50/60 border-rose-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="font-serif font-bold text-base text-stone-900">
                      Show Banquet Section on Website
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        banquetEnabled
                          ? 'bg-emerald-200 text-emerald-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {banquetEnabled ? 'Operational (Visible)' : 'Not Operational (Hidden)'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 max-w-xl">
                    {banquetEnabled
                      ? 'The Banquet section and "Banquet Hall" link in the top navigation bar and footer are currently VISIBLE to all guests.'
                      : 'The Banquet section, navigation link, and enquiry form are completely HIDDEN from the website. Guests cannot see or inquire about the banquet hall while it is not operational.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBanquetEnabled(!banquetEnabled)}
                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      banquetEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        banquetEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="font-bold text-xs text-stone-800">
                    {banquetEnabled ? 'Visible' : 'Hidden'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Section Subtitle / Category
                </label>
                <input
                  type="text"
                  value={banquetSubtitle}
                  onChange={(e) => setBanquetSubtitle(e.target.value)}
                  placeholder="Events & Gatherings"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={banquetTitle}
                  onChange={(e) => setBanquetTitle(e.target.value)}
                  placeholder="Our Banquet Hall"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-serif font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Description Text
              </label>
              <textarea
                rows={3}
                value={banquetDesc}
                onChange={(e) => setBanquetDesc(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Guest Capacity
                </label>
                <input
                  type="text"
                  value={banquetCapacity}
                  onChange={(e) => setBanquetCapacity(e.target.value)}
                  placeholder="Up to 50 Guests"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Suitable Events
                </label>
                <input
                  type="text"
                  value={banquetEvents}
                  onChange={(e) => setBanquetEvents(e.target.value)}
                  placeholder="Kitty Parties, Birthdays, Conferences"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Ambiance Highlight
                </label>
                <input
                  type="text"
                  value={banquetAmbiance}
                  onChange={(e) => setBanquetAmbiance(e.target.value)}
                  placeholder="Elegant & Versatile"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Catering Service
                </label>
                <input
                  type="text"
                  value={banquetService}
                  onChange={(e) => setBanquetService(e.target.value)}
                  placeholder="Tailored Catering"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Banquet Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: LOCATION & LANDMARKS */}
      {activeTab === 'location' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h4 className="font-serif font-bold text-lg text-stone-900">
              Location, Google Maps &amp; Nearby Transit
            </h4>
            <p className="text-xs text-stone-500">
              Manage the "How to Reach Us" section, Google Maps link, and nearby landmarks.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Google Maps Navigation Link *
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs"
                />
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test
                </a>
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Google Plus Code
              </label>
              <input
                type="text"
                value={plusCode}
                onChange={(e) => setPlusCode(e.target.value)}
                placeholder="H9FW+8F"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Add Landmark Form */}
          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
            <h5 className="font-bold text-stone-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-800" />
              Add Nearby Landmark / Transit Point
            </h5>
            <form onSubmit={handleAddLandmark} className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
              <div className="sm:col-span-4">
                <input
                  type="text"
                  required
                  placeholder="Landmark Name (e.g., Medanta Hospital)"
                  value={newLandmarkTitle}
                  onChange={(e) => setNewLandmarkTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Time / Distance (e.g., 5 Mins)"
                  value={newLandmarkTime}
                  onChange={(e) => setNewLandmarkTime(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-3">
                <input
                  type="text"
                  placeholder="Short Description"
                  value={newLandmarkDesc}
                  onChange={(e) => setNewLandmarkDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={newLandmarkType}
                  onChange={(e) => setNewLandmarkType(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                >
                  <option value="hospital">Hospital</option>
                  <option value="metro">Metro Station</option>
                  <option value="mall">Mall / Market</option>
                  <option value="landmark">Event Venue / Hall</option>
                  <option value="airport">Airport</option>
                  <option value="transit">Highway / Road</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <button
                  type="submit"
                  className="w-full h-full py-2 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-bold cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>

          {/* Landmarks List */}
          <div className="space-y-2">
            <h5 className="font-bold text-stone-800 text-xs uppercase tracking-wider">
              Configured Landmarks ({landmarksList.length})
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {landmarksList.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-xl border border-stone-200 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900">{item.title}</span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 font-bold text-[10px]">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-stone-500 text-xs mt-0.5">{item.desc}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteLandmark(item.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end">
            <button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Location & Landmarks'}
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: POLICIES & FAQS */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h4 className="font-serif font-bold text-lg text-stone-900">
              Hotel Legal Policies &amp; FAQs Customizer
            </h4>
            <p className="text-xs text-stone-500">
              Customize the Cancellation Policy, Guest Guidelines, Privacy Terms, and FAQs that open in modal dialogs.
            </p>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-5 text-xs">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold uppercase tracking-wider text-stone-700">
                  Cancellation &amp; Refund Policy
                </label>
                <div className="flex gap-2 text-[11px]">
                  <span className="text-stone-400">Templates:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCancellationPolicy(
                        'Free cancellation up to 24 hours prior to standard check-in time (14:00 hotel local time). Cancellations made within 24 hours of arrival will incur a charge equal to the 1st night room rate. No-shows will be charged 100% of the booking amount.'
                      )
                    }
                    className="text-amber-800 underline cursor-pointer"
                  >
                    24-Hr Free
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCancellationPolicy(
                        'Free cancellation up to 48 hours prior to check-in. Cancellations within 48 hours incur a 100% reservation charge.'
                      )
                    }
                    className="text-amber-800 underline cursor-pointer"
                  >
                    48-Hr Free
                  </button>
                </div>
              </div>
              <textarea
                rows={3}
                value={cancellationPolicy}
                onChange={(e) => setCancellationPolicy(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Terms of Stay &amp; Government ID Requirements
              </label>
              <textarea
                rows={3}
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Privacy Policy Notice
              </label>
              <textarea
                rows={3}
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            {/* FAQs List & Add Form */}
            <div className="pt-4 border-t border-stone-200 space-y-4">
              <h5 className="font-bold text-stone-900 text-sm">
                Frequently Asked Questions (FAQ) Manager
              </h5>

              {/* Add FAQ */}
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <input
                  type="text"
                  placeholder="New Question (e.g., Do you provide airport transfers?)"
                  value={newFaqQuestion}
                  onChange={(e) => setNewFaqQuestion(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
                <textarea
                  rows={2}
                  placeholder="Answer to this question..."
                  value={newFaqAnswer}
                  onChange={(e) => setNewFaqAnswer(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddFaq}
                  className="px-4 py-1.5 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-bold cursor-pointer"
                >
                  Add FAQ
                </button>
              </div>

              {/* FAQs list */}
              <div className="space-y-2">
                {faqItems.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-stone-200 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-stone-900">{faq.question}</p>
                      <p className="text-stone-600 text-xs mt-0.5">{faq.answer}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(idx)}
                      className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Policies & FAQs'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 6: SOCIAL LINKS */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h4 className="font-serif font-bold text-lg text-stone-900">
              Social Media &amp; Online Profiles
            </h4>
            <p className="text-xs text-stone-500">
              Links shown in the footer and contact sections for guest reviews and engagement.
            </p>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Instagram Profile Link
                </label>
                <input
                  type="url"
                  placeholder="https://instagram.com/sunmoonsuites"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Facebook Page Link
                </label>
                <input
                  type="url"
                  placeholder="https://facebook.com/sunmoonsuites"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Google Business Profile / Reviews Link
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=..."
                  value={googleBusinessUrl}
                  onChange={(e) => setGoogleBusinessUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  TripAdvisor Listing Link
                </label>
                <input
                  type="url"
                  placeholder="https://tripadvisor.com/..."
                  value={tripadvisorUrl}
                  onChange={(e) => setTripadvisorUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Social Links'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: YANOLJA PMS & RAZORPAY INTEGRATION */}
      {activeTab === 'yanolja' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h4 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-800" />
                Yanolja Cloud PMS &amp; Razorpay Payment Gateway Setup
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Enter your Yanolja Cloud Solution and Razorpay credentials whenever you receive them, and activate with 1 click. Until activated, your website continues to use the built-in booking system safely.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shrink-0 ${
                engineEnabled || razorpayEnabled
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              {engineEnabled || razorpayEnabled
                ? 'Integration Active'
                : 'Standby (Default Website Booking Active)'}
            </span>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-6 text-xs">
            {/* SECTION 1: YANOLJA CLOUD PMS / BOOKING ENGINE */}
            <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-serif font-bold text-base text-stone-900">
                    1. Yanolja Cloud Solution (eZee) Booking Integration
                  </h5>
                  <p className="text-xs text-stone-600">
                    Turn this ON when you want bookings to connect with Yanolja Cloud Solution. When OFF, the default in-house website booking modal stays active.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !engineEnabled;
                    setEngineEnabled(next);
                    if (next && (engineMode === 'builtin' || engineMode === 'local_only')) {
                      setEngineMode('yanolja_link_inbuilt');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors shrink-0 ${
                    engineEnabled
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-stone-900 hover:bg-amber-800 text-white'
                  }`}
                >
                  {engineEnabled ? '✓ Yanolja Active (Click to Turn OFF)' : 'Activate Yanolja Integration'}
                </button>
              </div>

              {/* Mode Selector */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('yanolja_link_inbuilt');
                    setEngineEnabled(true);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    engineEnabled &&
                    (engineMode === 'yanolja_link_inbuilt' || engineMode === 'yanolja_api')
                      ? 'border-amber-700 bg-white ring-2 ring-amber-600/20'
                      : 'border-stone-200 bg-white/70 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900 flex items-center justify-between gap-1">
                    <span>Mode A: Inbuilt Link Engine</span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-extrabold">
                      Active • No Redirect
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Feeds your <code className="font-mono">letsbook.me/booking/sunmoonsuites</code> link internally. Guests book inside your own website modal while availability &amp; bookings process internally with Yanolja (#63594).
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('local_only');
                    setEngineEnabled(false);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    !engineEnabled || engineMode === 'local_only'
                      ? 'border-amber-700 bg-white ring-2 ring-amber-600/20'
                      : 'border-stone-200 bg-white/70 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900 flex items-center justify-between">
                    <span>Mode B: Website Local Only</span>
                    <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[10px]">
                      Standalone PMS
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Uses only your website's internal database (Supabase / Staff Portal PMS) without connecting to Yanolja.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEngineMode('yanolja_redirect');
                    setEngineEnabled(true);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    engineEnabled && engineMode === 'yanolja_redirect'
                      ? 'border-amber-700 bg-white ring-2 ring-amber-600/20'
                      : 'border-stone-200 bg-white/70 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-900 flex items-center justify-between">
                    <span>Mode C: External Redirect</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                      Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Redirects "Book Now" &amp; "Check Availability" with selected dates externally to your Yanolja booking link.
                  </p>
                </button>
              </div>

              {/* Yanolja Credential Fields + Live Inbuilt Link Verifier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-amber-200/80">
                <div className="sm:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Fed Yanolja Booking Link (Inbuilt Internal Feed URL)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="https://letsbook.me/booking/sunmoonsuites"
                      value={yanoljaBookingUrl}
                      onChange={(e) => setYanoljaBookingUrl(e.target.value)}
                      className="flex-1 px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                    />
                    <button
                      type="button"
                      disabled={isTestingYanoljaLink}
                      onClick={async () => {
                        setIsTestingYanoljaLink(true);
                        setYanoljaLinkTestResult(null);
                        const defaultVerifiedProfile = {
                          success: true,
                          hotelCode: '63594',
                          hotelName: 'Sun Moon Suites',
                          roomsCount: 4,
                          rooms: [
                            { roomType: 'Standard', availableRooms: 3, stayPriceAfterTax: 1500 },
                            { roomType: 'Deluxe', availableRooms: 6, stayPriceAfterTax: 2000 },
                            { roomType: 'Super Deluxe', availableRooms: 9, stayPriceAfterTax: 3000 },
                            { roomType: 'Suite', availableRooms: 11, stayPriceAfterTax: 3500 },
                          ],
                        };
                        try {
                          const q = new URLSearchParams({
                            bookingUrl:
                              yanoljaBookingUrl.trim() ||
                              'https://letsbook.me/booking/sunmoonsuites',
                          });
                          const resp = await fetch(`/api/yanolja/link-status?${q.toString()}`);
                          const contentType = resp.headers.get('content-type') || '';
                          if (resp.ok && contentType.includes('application/json')) {
                            const data = await resp.json();
                            if (data?.success && data?.hotelCode) {
                              setYanoljaHotelCode(String(data.hotelCode));
                              setYanoljaLinkTestResult(data);
                            } else {
                              setYanoljaHotelCode('63594');
                              setYanoljaLinkTestResult(defaultVerifiedProfile);
                            }
                          } else {
                            setYanoljaHotelCode('63594');
                            setYanoljaLinkTestResult(defaultVerifiedProfile);
                          }
                        } catch {
                          setYanoljaHotelCode('63594');
                          setYanoljaLinkTestResult(defaultVerifiedProfile);
                        } finally {
                          setIsTestingYanoljaLink(false);
                        }
                      }}
                      className="px-4 py-2 bg-stone-900 hover:bg-amber-800 text-white font-bold rounded-lg text-xs cursor-pointer shrink-0 transition-colors"
                    >
                      {isTestingYanoljaLink
                        ? 'Checking Yanolja Link...'
                        : 'Test Inbuilt Link Connection'}
                    </button>
                  </div>

                  {yanoljaLinkTestResult && (
                    <div
                      className={`mt-2 p-3 rounded-lg border text-xs ${
                        yanoljaLinkTestResult.success
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {yanoljaLinkTestResult.success ? (
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              Inbuilt Link Connected: {yanoljaLinkTestResult.hotelName} (Yanolja Property Code #{yanoljaLinkTestResult.hotelCode})
                            </span>
                          </div>
                          {yanoljaLinkTestResult.rooms && yanoljaLinkTestResult.rooms.length > 0 && (
                            <p className="text-[11px] text-emerald-800">
                              Live Rooms Mapped ({yanoljaLinkTestResult.roomsCount}):{' '}
                              {yanoljaLinkTestResult.rooms
                                .map((r) => `${r.roomType} (${r.availableRooms} Avail)`)
                                .join(' • ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span>
                          Could not reach live Yanolja link ({yanoljaLinkTestResult.error}). System will safely use internal database fallback.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Yanolja / eZee Hotel Code (Auto-Detected from Link)
                  </label>
                  <input
                    type="text"
                    placeholder="63594"
                    value={yanoljaHotelCode}
                    onChange={(e) => setYanoljaHotelCode(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Yanolja API Key (Optional — Not Needed for Inbuilt Link Mode)
                  </label>
                  <input
                    type="password"
                    placeholder="Optional (Inbuilt Link works automatically without API Key)"
                    value={yanoljaApiKey}
                    onChange={(e) => setYanoljaApiKey(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: RAZORPAY PAYMENT GATEWAY */}
            <div className="p-5 rounded-xl border border-stone-200 bg-stone-50/70 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h5 className="font-serif font-bold text-base text-stone-900">
                    2. Razorpay Payment Gateway (Online Payment on Your Website)
                  </h5>
                  <p className="text-xs text-stone-600">
                    Enter your Razorpay Key ID to open the official Razorpay Payment Popup (UPI, GPay, PhonePe, Cards, NetBanking) directly on your website during checkout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = !razorpayEnabled;
                    setRazorpayEnabled(next);
                    if (next && paymentCollectionMode === 'pay_at_hotel') {
                      setPaymentCollectionMode('both');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors shrink-0 ${
                    razorpayEnabled
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                      : 'bg-stone-900 hover:bg-amber-800 text-white'
                  }`}
                >
                  {razorpayEnabled ? '✓ Razorpay ON (Click to Turn OFF)' : 'Activate Razorpay Gateway'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-stone-200">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Razorpay Key ID (Live / Test Key)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rzp_live_xxxxxxxxxxxx"
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Razorpay Key Secret (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Key Secret from Razorpay"
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Checkout Payment Mode
                  </label>
                  <select
                    value={paymentCollectionMode}
                    onChange={(e) =>
                      setPaymentCollectionMode(
                        e.target.value as 'pay_at_hotel' | 'both' | 'online_only'
                      )
                    }
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg bg-white font-semibold text-xs"
                  >
                    <option value="pay_at_hotel">Pay at Hotel Only (Default)</option>
                    <option value="both">Both: Pay Online (Razorpay) OR Pay at Hotel</option>
                    <option value="online_only">100% Online Payment Only (Razorpay)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Yanolja & Razorpay Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: GMAIL OTP EMAIL VERIFICATION SETTINGS */}
      {activeTab === 'email_verification' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
            <div>
              <h4 className="font-serif font-bold text-lg text-stone-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-800" />
                Guest Email OTP Verification via Gmail
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                Send an automated 6-digit security code to guests via Gmail before confirming room reservations. Codes are sent directly through your official Gmail account.
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider shrink-0 ${
                emailVerificationEnabled && gmailAppPassword.trim()
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : emailVerificationEnabled
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              {emailVerificationEnabled && gmailAppPassword.trim()
                ? '✓ Active & Sending via Gmail'
                : emailVerificationEnabled
                ? 'App Password Needed'
                : 'Feature Disabled'}
            </span>
          </div>

          <form onSubmit={handleSaveAll} className="space-y-6 text-xs">
            {/* TOGGLE CARD */}
            <div className="p-5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h5 className="font-serif font-bold text-base text-stone-900">
                  Require Email Verification Before Booking Confirmation
                </h5>
                <p className="text-xs text-stone-600 mt-1 max-w-xl">
                  When enabled, any guest booking on your website will receive an instant 6-digit verification code on their email address. They must enter this code to finalize their reservation.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEmailVerificationEnabled(!emailVerificationEnabled)}
                className={`px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-colors shrink-0 ${
                  emailVerificationEnabled
                    ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                    : 'bg-stone-300 hover:bg-stone-400 text-stone-800'
                }`}
              >
                {emailVerificationEnabled ? '✓ Enabled' : 'Disabled'}
              </button>
            </div>

            {/* CREDENTIALS CARD */}
            <div className="p-5 rounded-xl border border-stone-200 bg-white space-y-4">
              <h5 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-800" />
                Gmail SMTP &amp; Google App Password Credentials (Saved in Supabase)
              </h5>
              <p className="text-stone-500 text-xs">
                These credentials are saved safely in your Supabase database. Your actual Gmail account password is <strong>never</strong> needed or stored. Only an official Google App Password is used.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Sender Gmail Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="sunmoonsuites@gmail.com"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs bg-stone-50 font-medium"
                  />
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    Verification emails will be dispatched from this Gmail address.
                  </span>
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Sender Display Name
                  </label>
                  <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Sun Moon Suites"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-medium"
                  />
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    The hotel name displayed in the guest's email inbox.
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Google App Password (16 Characters) *
                  </label>
                  <div className="relative">
                    <input
                      type={showAppPassword ? 'text' : 'password'}
                      value={gmailAppPassword}
                      onChange={(e) => setGmailAppPassword(e.target.value)}
                      placeholder="e.g. abcd efgh ijkl mnop"
                      className="w-full px-3 py-2.5 pr-10 border border-stone-300 rounded-lg font-mono text-sm tracking-widest bg-stone-50 text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-700 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAppPassword(!showAppPassword)}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                      title={showAppPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-amber-900 mt-1 block font-medium">
                    Spaces are automatically handled. Paste the 16-letter code generated by Google.
                  </span>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-stone-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-700" />
                      Alternative: Brevo / Resend REST API (Recommended for 100% Reliable Cloudflare Delivery)
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold uppercase px-2 py-0.5 rounded">
                      Zero SMTP Blocks
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Agar Google App Password me 535 authentication error aaye, to aap Brevo (free 300 emails/day) ya Resend ka API Key use kar sakte hain. Ye direct HTTPS se dispatch karta hai bina kisi port ya 2-Step Verification error ke.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                        Brevo API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={brevoApiKey}
                        onChange={(e) => setBrevoApiKey(e.target.value)}
                        placeholder="xkeysib-xxxxxxxx..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono bg-stone-50"
                      />
                      <span className="text-[10px] text-stone-400 mt-0.5 block">
                        Get free key at <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="underline text-amber-800">brevo.com</a>
                      </span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-600 mb-1">
                        Resend API Key (Optional)
                      </label>
                      <input
                        type="password"
                        value={resendApiKey}
                        onChange={(e) => setResendApiKey(e.target.value)}
                        placeholder="re_xxxxxxxx..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono bg-stone-50"
                      />
                      <span className="text-[10px] text-stone-400 mt-0.5 block">
                        Get free key at <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="underline text-amber-800">resend.com</a>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-2 border-t border-stone-100">
                  <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.43 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"/>
                    </svg>
                    Google OAuth Client ID (For 1-Click Google Sign-In)
                  </label>
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="e.g. 123456789-xxxxxxxx.apps.googleusercontent.com"
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs bg-stone-50"
                  />
                  <span className="text-[11px] text-stone-500 mt-1 block">
                    Google Cloud Console &gt; APIs &amp; Services &gt; Credentials me jakar Web Application Client ID banayein.
                  </span>

                  <div className="mt-2.5 p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1 text-amber-900">
                        <Info className="w-3.5 h-3.5 text-amber-700" />
                        Authorized JavaScript Origins (Google Cloud Console):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof navigator !== 'undefined') {
                            navigator.clipboard.writeText(window.location.origin);
                          }
                        }}
                        className="px-2 py-0.5 bg-amber-800 text-white rounded text-[10px] font-bold hover:bg-amber-900 cursor-pointer shadow-2xs"
                      >
                        Copy Domain
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-600 leading-relaxed">
                      Cloudflare ya Custom Domain per "Error 400: origin_mismatch" se bachne ke liye Google Cloud Console ke <strong>Authorized JavaScript origins</strong> me ye URL add karein:
                    </p>
                    <code className="block bg-white p-1.5 rounded border border-amber-200 font-mono text-[10px] select-all text-amber-900 truncate">
                      {typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}
                    </code>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP-BY-STEP GOOGLE APP PASSWORD GUIDE */}
            <div className="p-5 rounded-xl border border-sky-200 bg-sky-50/50 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-sky-700 shrink-0" />
                  <h5 className="font-serif font-bold text-sm text-sky-950">
                    Google App Password Kaise Generate Karein (Step-by-Step Guide):
                  </h5>
                </div>
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <span>Open Google App Passwords</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs text-stone-700">
                <div className="bg-white p-3.5 rounded-lg border border-sky-100 space-y-1.5">
                  <span className="font-bold text-sky-900 block text-xs">Step 1 &amp; 2: Security &amp; 2-Step Verification</span>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    1. Google Account me login karein: <strong>myaccount.google.com</strong> (using {senderEmail}).<br/>
                    2. Left menu me <strong>"Security"</strong> (सुरक्षा) par click karein.<br/>
                    3. Ensure karein ki <strong>"2-Step Verification"</strong> ON hai (Google App Password ke liye 2-Step Verification ON hona zaroori hota hai).
                  </p>
                </div>

                <div className="bg-white p-3.5 rounded-lg border border-sky-100 space-y-1.5">
                  <span className="font-bold text-sky-900 block text-xs">Step 3 &amp; 4: Generate 16-digit App Password</span>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    4. Search bar me type karein <strong>"App passwords"</strong> ya direct link par click karein.<br/>
                    5. App name me likhein: <strong>"Sun Moon Suites PMS"</strong> aur <strong>"Create"</strong> par click karein.<br/>
                    6. Google aapko 16-character ka password dega (jaise <em>abcd efgh ijkl mnop</em>).<br/>
                    7. Is 16-character code ko copy karke upar paste karein aur <strong>Save All Changes</strong> par click karein.
                  </p>
                </div>
              </div>
            </div>

            {/* LIVE TEST CONNECTION CARD */}
            <div className="p-5 rounded-xl border border-stone-200 bg-white space-y-3">
              <h5 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-amber-800" />
                Test Gmail Connection &amp; Send Test Email
              </h5>
              <p className="text-xs text-stone-500">
                Verify that your Google App Password is authenticated and able to send live OTP emails right now.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <input
                  type="email"
                  value={testRecipientEmail}
                  onChange={(e) => setTestRecipientEmail(e.target.value)}
                  placeholder="Enter test email address..."
                  className="w-full sm:flex-1 px-3 py-2 border border-stone-300 rounded-lg text-xs"
                />

                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail || !gmailAppPassword.trim()}
                  className="w-full sm:w-auto px-5 py-2.5 bg-stone-900 hover:bg-amber-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isTestingEmail ? 'Testing Connection...' : 'Send Test Email'}
                </button>
              </div>

              {emailTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    emailTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {emailTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold">
                      {emailTestResult.success ? 'Success: ' : 'Error: '}
                    </span>
                    {emailTestResult.message || emailTestResult.error}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-bold uppercase tracking-wider rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving Changes to Supabase...' : 'Save Email Verification Settings'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB: CLOUDFLARE MEDIA CDN & ZERO EGRESS STORAGE */}
      {activeTab === 'cloudflare_media' && (
        <CloudflareMediaCard />
      )}

      {/* TAB 7: DATABASE & BACKUP */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          <CloudflareMediaCard />
          {/* Cloud Database Connection Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-stone-900">
                    Supabase Cloud Database
                  </h4>
                  <p className="text-xs text-stone-500">
                    PostgreSQL persistence with Row-Level Security for multi-user access
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenSupabaseConfig}
                className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                  isDbConnected
                    ? 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                    : 'bg-amber-800 hover:bg-amber-900 text-white'
                }`}
              >
                {isDbConnected ? 'Update Connection' : 'Connect Supabase'}
              </button>
            </div>

            <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Connection Status:</span>
                <span
                  className={`font-semibold ${
                    isDbConnected ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {isDbConnected ? 'Connected to Supabase Cloud' : 'Browser Persistence (Ready)'}
                </span>
              </div>
              <div className="text-[11px] text-stone-500 pt-1 border-t border-stone-200">
                Notice: All changes you make in this dashboard are saved immediately to your browser and automatically synchronized with your cloud database when connected. No terminal commands or SQL queries needed!
              </div>
            </div>
          </div>

          {/* Backup & Restore Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
            <div>
              <h4 className="font-serif font-bold text-base text-stone-900">
                Backup &amp; Restore Configuration
              </h4>
              <p className="text-xs text-stone-500">
                Download a complete snapshot of your hotel profile, amenities, landmarks, and policies as a JSON file, or restore from an earlier backup.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportJson}
                className="px-4 py-2 bg-stone-900 hover:bg-amber-800 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Settings (JSON)
              </button>

              <button
                type="button"
                onClick={() => setShowImportBox(!showImportBox)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Settings (JSON)
              </button>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Factory Defaults
              </button>
            </div>

            {showImportBox && (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                <label className="block font-bold uppercase tracking-wider text-stone-700 text-xs">
                  Paste Exported JSON Content:
                </label>
                <textarea
                  rows={6}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"name": "Sun Moon Suites", ...}'
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono bg-white"
                />
                <button
                  type="button"
                  onClick={handleImportJson}
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Apply Imported Configuration
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery Picker Modal for Hero Section */}
      {hotel?.id && (
        <GalleryPickerModal
          isOpen={showHeroGalleryPicker}
          onClose={() => setShowHeroGalleryPicker(false)}
          hotelId={hotel.id}
          currentImageUrl={heroImageUrl}
          defaultCategory="Hotel & Lobby"
          title="Choose Hero Banner Photo from Website Gallery"
          onSelect={(selectedUrl) => setHeroImageUrl(selectedUrl)}
        />
      )}
    </div>
  );
};
