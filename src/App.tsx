import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Hotel, StaffUser, BookingIntentButtonSource } from './types';
import { getInitialHotelFast, getTodayLocalDateStr, getNextDayLocalDateStr } from './lib/utils';
import { recordBookingIntent } from './services/bookingIntentService';
import {
  buildYanoljaBookingUrl,
  DEFAULT_BOOKING_ENGINE_CONFIG,
} from './services/hotelService';

// Website Components (Imported directly to prevent dynamic chunk fetch errors and layout shift)
import { Navbar } from './components/website/Navbar';
import { HeroSection } from './components/website/HeroSection';
import { MobileStickyBar } from './components/website/MobileStickyBar';
import { FloatingWhatsAppButton } from './components/website/FloatingWhatsAppButton';
import { FeaturedRooms } from './components/website/FeaturedRooms';
import { AmenitiesSection } from './components/website/AmenitiesSection';
import { BanquetSection } from './components/website/BanquetSection';
import { OffersSection } from './components/website/OffersSection';
import { GallerySection } from './components/website/GallerySection';
import { InsightsSection } from './components/website/InsightsSection';
import { InsightArticlePage } from './components/website/InsightArticlePage';
import { LocationSection } from './components/website/LocationSection';
import { ContactSection } from './components/website/ContactSection';
import { Footer } from './components/website/Footer';
import { BookingFlowModal } from './components/website/BookingFlowModal';
import { PolicyModal } from './components/website/PolicyModal';
import { SeoLandingPage } from './components/website/SeoLandingPage';
import { applyRouteSeoToDocument, DEDICATED_LANDING_PAGES } from './lib/seoConfig';

// Resilient dynamic import helper with automatic retry for Admin PMS modules
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await factory();
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    throw lastError;
  });
}

// Admin Components (Lazy-loaded so public website mobile bundle is ultra-fast)
import type { AdminTab } from './components/admin/AdminLayout';
const AdminLayout = lazyWithRetry(() => import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const DashboardView = lazyWithRetry(() => import('./components/admin/DashboardView').then((m) => ({ default: m.DashboardView })));
const FrontDeskView = lazyWithRetry(() => import('./components/admin/FrontDeskView').then((m) => ({ default: m.FrontDeskView })));
const ReservationsView = lazyWithRetry(() => import('./components/admin/ReservationsView').then((m) => ({ default: m.ReservationsView })));
const CalendarView = lazyWithRetry(() => import('./components/admin/CalendarView').then((m) => ({ default: m.CalendarView })));
const RoomsManagementView = lazyWithRetry(() => import('./components/admin/RoomsManagementView').then((m) => ({ default: m.RoomsManagementView })));
const HousekeepingView = lazyWithRetry(() => import('./components/admin/HousekeepingView').then((m) => ({ default: m.HousekeepingView })));
const GuestsView = lazyWithRetry(() => import('./components/admin/GuestsView').then((m) => ({ default: m.GuestsView })));
const BillingView = lazyWithRetry(() => import('./components/admin/BillingView').then((m) => ({ default: m.BillingView })));
const PaymentsView = lazyWithRetry(() => import('./components/admin/PaymentsView').then((m) => ({ default: m.PaymentsView })));
const ExpensesView = lazyWithRetry(() => import('./components/admin/ExpensesView').then((m) => ({ default: m.ExpensesView })));
const BanquetManagementView = lazyWithRetry(() => import('./components/admin/BanquetManagementView').then((m) => ({ default: m.BanquetManagementView })));
const OffersManagementView = lazyWithRetry(() => import('./components/admin/OffersManagementView').then((m) => ({ default: m.OffersManagementView })));
const GalleryManagementView = lazyWithRetry(() => import('./components/admin/GalleryManagementView').then((m) => ({ default: m.GalleryManagementView })));
const InsightsManagementView = lazyWithRetry(() => import('./components/admin/InsightsManagementView').then((m) => ({ default: m.InsightsManagementView })));
const EnquiriesView = lazyWithRetry(() => import('./components/admin/EnquiriesView').then((m) => ({ default: m.EnquiriesView })));
const ReportsView = lazyWithRetry(() => import('./components/admin/ReportsView').then((m) => ({ default: m.ReportsView })));
const StaffManagementView = lazyWithRetry(() => import('./components/admin/StaffManagementView').then((m) => ({ default: m.StaffManagementView })));
const AuditTrailView = lazyWithRetry(() => import('./components/admin/AuditTrailView').then((m) => ({ default: m.AuditTrailView })));
const SettingsView = lazyWithRetry(() => import('./components/admin/SettingsView').then((m) => ({ default: m.SettingsView })));
const CRMDashboard = lazyWithRetry(() => import('./components/crm/CRMDashboard').then((m) => ({ default: m.CRMDashboard })));
const CRMLoginScreen = lazyWithRetry(() => import('./components/crm/CRMLoginScreen').then((m) => ({ default: m.CRMLoginScreen })));

// Common Modals
const SupabaseConfigModal = lazyWithRetry(() => import('./components/common/SupabaseConfigModal').then((m) => ({ default: m.SupabaseConfigModal })));
const AuthModal = lazyWithRetry(() => import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })));
const PMSLoginScreen = lazyWithRetry(() => import('./components/auth/AuthModal').then((m) => ({ default: m.PMSLoginScreen })));
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { applyPMSThemeToDocument, getPMSTheme } from './services/themeService';

export function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hotel, setHotel] = useState<Hotel | null>(() => getInitialHotelFast());
  const [isLoadingHotel, setIsLoadingHotel] = useState(false);

  // Authentication State — initialized from saved session if valid
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    try {
      const raw =
        localStorage.getItem('pms_staff_user') || sessionStorage.getItem('pms_staff_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.id && parsed.email) return parsed;
      }
    } catch {}
    return null;
  });

  // Admin Tab State
  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');

  // Modal Visibility States
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingInitialSearch, setBookingInitialSearch] = useState<{
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    selectedCategoryId?: string;
  } | undefined>(undefined);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [activePolicy, setActivePolicy] = useState<'cancellation' | 'terms' | 'privacy' | 'faq' | null>(null);

  useEffect(() => {
    loadHotelData();

    const handleDataUpdated = () => {
      loadHotelData();
    };

    const handleOpenAdminPortal = () => {
      navigate('/PMS');
    };

    window.addEventListener('hotel_data_updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);
    window.addEventListener('open_admin_portal', handleOpenAdminPortal);

    return () => {
      window.removeEventListener('hotel_data_updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
      window.removeEventListener('open_admin_portal', handleOpenAdminPortal);
    };
  }, [navigate]);

  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    if (
      hash === '#pms' ||
      hash === '#/pms' ||
      hash === '#admin' ||
      hash === '#/admin' ||
      search.includes('pms=1') ||
      search.includes('pms=true')
    ) {
      navigate('/PMS', { replace: true });
    } else if (
      hash === '#crm' ||
      hash === '#/crm' ||
      search.includes('crm=1') ||
      search.includes('crm=true')
    ) {
      navigate('/CRM', { replace: true });
    } else if (
      (hash.includes('type=recovery') || search.includes('reset_password=true')) &&
      !location.pathname.toLowerCase().startsWith('/pms') &&
      !location.pathname.toLowerCase().startsWith('/admin') &&
      !location.pathname.toLowerCase().startsWith('/crm') &&
      !location.pathname.toLowerCase().startsWith('/leads')
    ) {
      navigate(`/PMS${window.location.search}${window.location.hash}`, { replace: true });
    }

    const isPMSRoute =
      location.pathname.toLowerCase().startsWith('/pms') ||
      location.pathname.toLowerCase().startsWith('/admin');
    const isCRMRoute =
      location.pathname.toLowerCase().startsWith('/crm') ||
      location.pathname.toLowerCase().startsWith('/leads');
    applyPMSThemeToDocument(getPMSTheme(), isPMSRoute);
    if (!isPMSRoute && !isCRMRoute) {
      applyRouteSeoToDocument(location.pathname);
      const sectionRoutes: Record<string, string> = {
        '/rooms': 'rooms',
        '/amenities': 'amenities',
        '/offers': 'offers',
        '/gallery': 'gallery',
        '/insights': 'insights',
        '/location': 'location',
        '/contact': 'contact',
      };
      const targetSection = sectionRoutes[location.pathname.toLowerCase()];
      if (targetSection) {
        setTimeout(() => {
          const el = document.getElementById(targetSection);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 250);
      }
    }
  }, [location.hash, location.search, location.pathname, navigate]);

  useEffect(() => {
    let cleanupFn: (() => void) | undefined;
    const timer = setTimeout(async () => {
      const { getSupabase } = await import('./lib/supabase');
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          const emailParam = session?.user?.email
            ? `&email=${encodeURIComponent(session.user.email)}`
            : '';
          navigate(`/PMS?reset_password=true${emailParam}`, { replace: true });
        }
      });

      const settingsChannel = supabase
        .channel('public-website-settings-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hotels' },
          () => {
            loadHotelData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hotel_settings' },
          () => {
            loadHotelData();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'insights' },
          () => {
            loadHotelData();
          }
        )
        .subscribe();

      cleanupFn = () => {
        authListener.subscription.unsubscribe();
        supabase.removeChannel(settingsChannel);
      };
    }, 2500);

    return () => {
      clearTimeout(timer);
      if (cleanupFn) cleanupFn();
    };
  }, [navigate]);

  const loadHotelData = async () => {
    const { getHotel } = await import('./services/hotelService');
    const data = await getHotel();
    if (data) {
      setHotel(data);
    }
    setIsLoadingHotel(false);
  };

  const handleAuthenticated = (user: StaffUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('pms_staff_user', JSON.stringify(user));
    } catch {}
  };

  const handleLogout = async () => {
    const { signOut } = await import('./services/staffService');
    await signOut();
    setCurrentUser(null);
    try {
      localStorage.removeItem('pms_staff_user');
      sessionStorage.removeItem('pms_staff_user');
    } catch {}
    if (
      location.pathname.toLowerCase().startsWith('/crm') ||
      location.pathname.toLowerCase().startsWith('/leads')
    ) {
      navigate('/CRM');
    } else {
      navigate('/PMS');
    }
  };

  const handleNavigateSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openPublicBookingOrRedirect = (
    searchParams?: {
      checkIn: string;
      checkOut: string;
      adults: number;
      children: number;
      selectedCategoryId?: string;
    },
    source: BookingIntentButtonSource = 'navbar_book_now'
  ) => {
    // Record booking intent asynchronously in the background
    recordBookingIntent({
      hotelId: hotel?.id,
      buttonSource: source,
      checkIn: searchParams?.checkIn,
      checkOut: searchParams?.checkOut,
      guestsCount: (searchParams?.adults || 2) + (searchParams?.children || 0),
    }).catch(() => {});

    const engineCfg = hotel?.booking_engine_config ?? DEFAULT_BOOKING_ENGINE_CONFIG;
    if (engineCfg?.is_enabled && engineCfg.mode === 'yanolja_redirect') {
      const targetUrl = buildYanoljaBookingUrl(engineCfg.yanolja_booking_url, searchParams);
      window.location.href = targetUrl;
      return;
    }
    setBookingInitialSearch(searchParams);
    setShowBookingModal(true);
  };

  const handleSearchAvailability = (search: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) => {
    openPublicBookingOrRedirect(search, 'hero_check_availability');
  };

  const handleSelectCategoryForBooking = (categoryId: string) => {
    const today = getTodayLocalDateStr();
    const tomorrow = getNextDayLocalDateStr(today);

    openPublicBookingOrRedirect(
      {
        checkIn: today,
        checkOut: tomorrow,
        adults: 2,
        children: 0,
        selectedCategoryId: categoryId,
      },
      'room_card'
    );
  };

  const handleSelectOfferCode = (code: string) => {
    const today = getTodayLocalDateStr();
    const tomorrow = getNextDayLocalDateStr(today);

    openPublicBookingOrRedirect(
      {
        checkIn: today,
        checkOut: tomorrow,
        adults: 2,
        children: 0,
      },
      'offer_code'
    );
  };

  if (isLoadingHotel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <LoadingSpinner message="Initializing Hotel Property &amp; PMS Services..." />
      </div>
    );
  }

  const pmsPortalElement = currentUser ? (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <LoadingSpinner message="Loading PMS Module..." />
        </div>
      }
    >
      <AdminLayout
        currentUser={currentUser}
        hotel={hotel}
        activeTab={adminTab}
        onSelectTab={(tab) => setAdminTab(tab)}
        onOpenNewBooking={() => {
          setBookingInitialSearch(undefined);
          setShowBookingModal(true);
        }}
        onLogout={handleLogout}
        onViewWebsite={() => navigate('/')}
        onOpenSupabaseConfig={() => setShowSupabaseModal(true)}
      >
        {adminTab === 'dashboard' && (
          <DashboardView
            hotel={hotel}
            onNavigateTab={(tab) => setAdminTab(tab)}
            onOpenNewBooking={() => {
              setBookingInitialSearch(undefined);
              setShowBookingModal(true);
            }}
          />
        )}

        {adminTab === 'frontdesk' && (
          <FrontDeskView
            hotel={hotel}
            onOpenNewBooking={() => {
              setBookingInitialSearch(undefined);
              setShowBookingModal(true);
            }}
          />
        )}

        {adminTab === 'reservations' && (
          <ReservationsView
            hotel={hotel}
            onOpenNewBooking={() => {
              setBookingInitialSearch(undefined);
              setShowBookingModal(true);
            }}
          />
        )}

        {adminTab === 'calendar' && <CalendarView hotel={hotel} />}

        {adminTab === 'rooms' && <RoomsManagementView hotel={hotel} />}

        {adminTab === 'housekeeping' && <HousekeepingView hotel={hotel} />}

        {adminTab === 'guests' && <GuestsView hotel={hotel} />}

        {adminTab === 'billing' && <BillingView hotel={hotel} />}

        {adminTab === 'payments' && <PaymentsView hotel={hotel} />}

        {adminTab === 'expenses' && <ExpensesView hotel={hotel} />}

        {adminTab === 'banquet' && <BanquetManagementView hotel={hotel} />}

        {adminTab === 'offers' && <OffersManagementView hotel={hotel} />}

        {adminTab === 'gallery' && <GalleryManagementView hotel={hotel} />}

        {adminTab === 'insights' && <InsightsManagementView hotel={hotel} />}

        {adminTab === 'enquiries' && <EnquiriesView hotel={hotel} />}

        {adminTab === 'reports' && <ReportsView hotel={hotel} />}

        {adminTab === 'staff' && (
          <StaffManagementView hotel={hotel} currentUser={currentUser} />
        )}

        {adminTab === 'audit' && <AuditTrailView hotel={hotel} />}

        {adminTab === 'settings' && (
          <SettingsView
            hotel={hotel}
            onOpenSupabaseConfig={() => setShowSupabaseModal(true)}
            onHotelUpdated={loadHotelData}
          />
        )}
      </AdminLayout>
    </Suspense>
  ) : (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-900 text-amber-400">
          <LoadingSpinner message="Opening Staff PMS Portal..." />
        </div>
      }
    >
      <PMSLoginScreen
        hotel={hotel}
        onAuthenticated={handleAuthenticated}
        onReturnToWebsite={() => navigate('/')}
      />
    </Suspense>
  );

  const crmPortalElement = currentUser ? (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <LoadingSpinner message="Loading Luxury CRM & Leads..." />
        </div>
      }
    >
      <CRMDashboard
        hotel={hotel}
        currentUser={currentUser}
        onNavigateToPMS={() => navigate('/PMS')}
        onNavigateToWebsite={() => navigate('/')}
        onLogout={handleLogout}
      />
    </Suspense>
  ) : (
    <Suspense fallback={null}>
      <CRMLoginScreen
        hotel={hotel}
        onAuthenticated={handleAuthenticated}
        onReturnToWebsite={() => navigate('/')}
        onNavigateToPMS={() => navigate('/PMS')}
      />
    </Suspense>
  );

  const publicWebsiteContent = (
    <>
      <Navbar
        hotel={hotel}
        onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'navbar_book_now')}
        onNavigateSection={handleNavigateSection}
      />

      <main className="flex-1">
        <HeroSection hotel={hotel} onSearchAvailability={handleSearchAvailability} />
        <Suspense fallback={null}>
          <FeaturedRooms hotel={hotel} onSelectCategoryForBooking={handleSelectCategoryForBooking} />
          <AmenitiesSection hotel={hotel} />
          <BanquetSection hotel={hotel} />
          <OffersSection hotel={hotel} onSelectOfferCode={handleSelectOfferCode} />
          <GallerySection hotel={hotel} />
          <InsightsSection hotel={hotel} />
          <LocationSection hotel={hotel} />
          <ContactSection hotel={hotel} />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer
          hotel={hotel}
          onOpenPolicy={(policy) => setActivePolicy(policy)}
          onNavigateSection={handleNavigateSection}
        />
      </Suspense>

      <MobileStickyBar
        hotel={hotel}
        onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'mobile_sticky_bar')}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      <Routes>
        {/* PUBLIC HOTEL GUEST WEBSITE */}
        <Route path="/" element={publicWebsiteContent} />

        {/* DEDICATED LOCAL SEO LANDING PAGES */}
        <Route
          path="/insights/:slug"
          element={
            <>
              <Navbar
                hotel={hotel}
                onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'navbar_book_now')}
                onNavigateSection={handleNavigateSection}
              />
              <main className="flex-1">
                <Suspense fallback={null}>
                  <InsightArticlePage
                    hotel={hotel}
                    onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'seo_landing_page')}
                  />
                </Suspense>
              </main>
              <Suspense fallback={null}>
                <Footer
                  hotel={hotel}
                  onOpenPolicy={(policy) => setActivePolicy(policy)}
                  onNavigateSection={handleNavigateSection}
                />
              </Suspense>
              <MobileStickyBar
                hotel={hotel}
                onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'mobile_sticky_bar')}
              />
            </>
          }
        />
        {Object.values(DEDICATED_LANDING_PAGES).map((pageConfig) => (
          <Route
            key={pageConfig.path}
            path={pageConfig.path}
            element={
              <>
                <Navbar
                  hotel={hotel}
                  onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'navbar_book_now')}
                  onNavigateSection={handleNavigateSection}
                />
                <main className="flex-1">
                  <Suspense fallback={null}>
                    <SeoLandingPage
                      config={pageConfig}
                      hotel={hotel}
                      onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'seo_landing_page')}
                      onSelectCategoryForBooking={handleSelectCategoryForBooking}
                      onNavigateSection={handleNavigateSection}
                    />
                  </Suspense>
                </main>
                <Suspense fallback={null}>
                  <Footer
                    hotel={hotel}
                    onOpenPolicy={(policy) => setActivePolicy(policy)}
                    onNavigateSection={handleNavigateSection}
                  />
                </Suspense>
                <MobileStickyBar
                  hotel={hotel}
                  onOpenBooking={() => openPublicBookingOrRedirect(undefined, 'mobile_sticky_bar')}
                />
              </>
            }
          />
        ))}

        {/* DEDICATED STAFF PMS PORTAL ROUTES (/PMS, /pms, /admin, /ADMIN) */}
        <Route path="/pms/*" element={pmsPortalElement} />
        <Route path="/PMS/*" element={pmsPortalElement} />
        <Route path="/admin/*" element={pmsPortalElement} />
        <Route path="/ADMIN/*" element={pmsPortalElement} />

        {/* DEDICATED LUXURY CRM & LEADS PORTAL ROUTES (/CRM, /crm, /leads) */}
        <Route path="/crm/*" element={crmPortalElement} />
        <Route path="/CRM/*" element={crmPortalElement} />
        <Route path="/leads/*" element={crmPortalElement} />
        <Route path="/LEADS/*" element={crmPortalElement} />

        {/* FALLBACK ROUTE: Render Public Website for any other path */}
        <Route path="*" element={publicWebsiteContent} />
      </Routes>

      {/* Booking Flow Modal */}
      {showBookingModal && (
        <Suspense fallback={null}>
          <BookingFlowModal
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            hotel={hotel}
            initialSearch={bookingInitialSearch}
            onBookingSuccess={() => {
              // Booking confirmed
            }}
          />
        </Suspense>
      )}

      {/* Staff Authentication Modal */}
      {showAuthModal && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            hotelId={hotel?.id || 'default-hotel-id'}
            onAuthenticated={(user) => {
              handleAuthenticated(user);
              navigate('/PMS');
            }}
          />
        </Suspense>
      )}

      {/* Floating WhatsApp Button (Public Website Only) */}
      {!location.pathname.toLowerCase().startsWith('/pms') &&
        !location.pathname.toLowerCase().startsWith('/admin') &&
        !location.pathname.toLowerCase().startsWith('/crm') &&
        !location.pathname.toLowerCase().startsWith('/leads') && (
          <FloatingWhatsAppButton hotel={hotel} />
        )}

      {/* Supabase Database Connection Modal */}
      {showSupabaseModal && (
        <Suspense fallback={null}>
          <SupabaseConfigModal
            isOpen={showSupabaseModal}
            onClose={() => setShowSupabaseModal(false)}
            onConnected={() => {
              loadHotelData();
            }}
          />
        </Suspense>
      )}

      {/* Policy & Terms Modal */}
      {activePolicy && (
        <Suspense fallback={null}>
          <PolicyModal
            isOpen={Boolean(activePolicy)}
            onClose={() => setActivePolicy(null)}
            type={activePolicy}
            hotel={hotel}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
