import React, { useState, useEffect } from 'react';
import {
  Hotel,
  HeroConfig,
  AmenityItem,
  LandmarkItem,
  FAQItem,
  SocialLinks,
} from '../../types';
import {
  updateHotel,
  resetHotelToDefaults,
  exportHotelConfigJson,
  importHotelConfigJson,
  DEFAULT_HERO_CONFIG,
  DEFAULT_AMENITIES_LIST,
  DEFAULT_LANDMARKS_LIST,
  DEFAULT_FAQ_ITEMS,
  DEFAULT_SOCIAL_LINKS,
} from '../../services/hotelService';
import { getSupabaseConfig } from '../../lib/supabase';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';
import { getAmenityIcon } from '../website/AmenitiesSection';
import { usePMSTheme } from '../../services/themeService';
import { uploadImageToSupabase } from '../../services/storageService';
import {
  Settings,
  Building,
  Sparkles,
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
  HelpCircle,
  FileText,
  Sun,
  Moon,
  Clock,
} from 'lucide-react';

interface SettingsViewProps {
  hotel: Hotel | null;
  onOpenSupabaseConfig: () => void;
  onHotelUpdated: () => void;
}

type SettingsTab =
  | 'general'
  | 'hero'
  | 'amenities'
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

  // Operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportBox, setShowImportBox] = useState(false);
  const [isUploadingHeroImage, setIsUploadingHeroImage] = useState(false);

  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingHeroImage(true);
    setSaveError('');
    const res = await uploadImageToSupabase(file, 'hero');
    setIsUploadingHeroImage(false);
    if (res.success && res.publicUrl) {
      setHeroImageUrl(res.publicUrl);
    } else {
      setSaveError(res.error || 'Failed to upload image to Supabase Storage.');
    }
    e.target.value = '';
  };

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
                Hero Background Image (Upload to Supabase Storage or Paste URL)
              </label>
              <div className="flex flex-wrap gap-2">
                <input
                  type="url"
                  value={heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder="https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/..."
                  className="flex-1 min-w-[240px] px-3 py-2 border border-stone-300 rounded-lg font-mono text-xs"
                />
                <label className="px-3.5 py-2 bg-stone-900 hover:bg-amber-800 text-white rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingHeroImage ? 'Uploading...' : 'Upload to Supabase'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroFileUpload}
                    disabled={isUploadingHeroImage}
                    className="hidden"
                  />
                </label>
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
                      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80'
                    )
                  }
                  className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 rounded cursor-pointer"
                >
                  Grand Lobby
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeroImageUrl(
                      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80'
                    )
                  }
                  className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 rounded cursor-pointer"
                >
                  Boutique Resort Exterior
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setHeroImageUrl(
                      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1600&q=80'
                    )
                  }
                  className="px-2.5 py-1 bg-stone-100 hover:bg-amber-100 text-stone-700 rounded cursor-pointer"
                >
                  Luxury Suite
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

      {/* TAB 4: LOCATION & LANDMARKS */}
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

      {/* TAB 7: DATABASE & BACKUP */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
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
    </div>
  );
};
