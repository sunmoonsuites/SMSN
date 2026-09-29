import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Hotel, StaffUser } from './types';
import { getInitialHotelFast } from './lib/utils';

// Website Components
import { Navbar } from './components/website/Navbar';
import { HeroSection } from './components/website/HeroSection';
import { MobileStickyBar } from './components/website/MobileStickyBar';
import { FloatingWhatsAppButton } from './components/website/FloatingWhatsAppButton';
const FeaturedRooms = lazy(() => import('./components/website/FeaturedRooms').then((m) => ({ default: m.FeaturedRooms })));
const AmenitiesSection = lazy(() => import('./components/website/AmenitiesSection').then((m) => ({ default: m.AmenitiesSection })));
const BanquetSection = lazy(() => import('./components/website/BanquetSection').then((m) => ({ default: m.BanquetSection })));
const OffersSection = lazy(() => import('./components/website/OffersSection').then((m) => ({ default: m.OffersSection })));
const GallerySection = lazy(() => import('./components/website/GallerySection').then((m) => ({ default: m.GallerySection })));
const LocationSection = lazy(() => import('./components/website/LocationSection').then((m) => ({ default: m.LocationSection })));
const ContactSection = lazy(() => import('./components/website/ContactSection').then((m) => ({ default: m.ContactSection })));
const Footer = lazy(() => import('./components/website/Footer').then((m) => ({ default: m.Footer })));
const BookingFlowModal = lazy(() => import('./components/website/BookingFlowModal').then((m) => ({ default: m.BookingFlowModal })));
const PolicyModal = lazy(() => import('./components/website/PolicyModal').then((m) => ({ default: m.PolicyModal })));
const SeoLandingPage = lazy(() => import('./components/website/SeoLandingPage').then((m) => ({ default: m.SeoLandingPage })));
import { applyRouteSeoToDocument, DEDICATED_LANDING_PAGES } from './lib/seoConfig';

// Admin Components (Lazy-loaded so public website mobile bundle is ultra-fast)
import type { AdminTab } from './components/admin/AdminLayout';
const AdminLayout = lazy(() => import('./components/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const DashboardView = lazy(() => import('./components/admin/DashboardView').then((m) => ({ default: m.DashboardView })));
const FrontDeskView = lazy(() => import('./components/admin/FrontDeskView').then((m) => ({ default: m.FrontDeskView })));
const ReservationsView = lazy(() => import('./components/admin/ReservationsView').then((m) => ({ default: m.ReservationsView })));
const CalendarView = lazy(() => import('./components/admin/CalendarView').then((m) => ({ default: m.CalendarView })));
const RoomsManagementView = lazy(() => import('./components/admin/RoomsManagementView').then((m) => ({ default: m.RoomsManagementView })));
const HousekeepingView = lazy(() => import('./components/admin/HousekeepingView').then((m) => ({ default: m.HousekeepingView })));
const GuestsView = lazy(() => import('./components/admin/GuestsView').then((m) => ({ default: m.GuestsView })));
const BillingView = lazy(() => import('./components/admin/BillingView').then((m) => ({ default: m.BillingView })));
const PaymentsView = lazy(() => import('./components/admin/PaymentsView').then((m) => ({ default: m.PaymentsView })));
const ExpensesView = lazy(() => import('./components/admin/ExpensesView').then((m) => ({ default: m.ExpensesView })));
const BanquetManagementView = lazy(() => import('./components/admin/BanquetManagementView').then((m) => ({ default: m.BanquetManagementView })));
const OffersManagementView = lazy(() => import('./components/admin/OffersManagementView').then((m) => ({ default: m.OffersManagementView })));
const GalleryManagementView = lazy(() => import('./components/admin/GalleryManagementView').then((m) => ({ default: m.GalleryManagementView })));
const EnquiriesView = lazy(() => import('./components/admin/EnquiriesView').then((m) => ({ default: m.EnquiriesView })));
const ReportsView = lazy(() => import('./components/admin/ReportsView').then((m) => ({ default: m.ReportsView })));
const StaffManagementView = lazy(() => import('./components/admin/StaffManagementView').then((m) => ({ default: m.StaffManagementView })));
const AuditTrailView = lazy(() => import('./components/admin/AuditTrailView').then((m) => ({ default: m.AuditTrailView })));
const SettingsView = lazy(() => import('./components/admin/SettingsView').then((m) => ({ default: m.SettingsView })));

// Common Modals
const SupabaseConfigModal = lazy(() => import('./components/common/SupabaseConfigModal').then((m) => ({ default: m.SupabaseConfigModal })));
const AuthModal = lazy(() => import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })));
const PMSLoginScreen = lazy(() => import('./components/auth/AuthModal').then((m) => ({ default: m.PMSLoginScreen })));
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { applyPMSThemeToDocument, getPMSTheme } from './services/themeService';

export function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hotel, setHotel] = useState<Hotel | null>(() => getInitialHotelFast());
  const [isLoadingHotel, setIsLoadingHotel] = useState(false);

  // Authentication State — never auto-login; require explicit staff login
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);

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
    // Clear any legacy auto-login token from localStorage
    localStorage.removeItem('pms_staff_user');
    const timer = setTimeout(() => {
      loadHotelData();
    }, 1200);

    const handleDataUpdated = () => {
      loadHotelData();
    };

    window.addEventListener('hotel_data_updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('hotel_data_updated', handleDataUpdated);
      window.removeEventListener('storage', handleDataUpdated);
    };
  }, []);

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
      (hash.includes('type=recovery') || search.includes('reset_password=true')) &&
      !location.pathname.toLowerCase().startsWith('/pms') &&
      !location.pathname.toLowerCase().startsWith('/admin')
    ) {
      navigate(`/PMS${window.location.search}${window.location.hash}`, { replace: true });
    }

    const isPMSRoute =
      location.pathname.toLowerCase().startsWith('/pms') ||
      location.pathname.toLowerCase().startsWith('/admin');
    applyPMSThemeToDocument(getPMSTheme(), isPMSRoute);
    if (!isPMSRoute) {
      applyRouteSeoToDocument(location.pathname);
      const sectionRoutes: Record<string, string> = {
        '/rooms': 'rooms',
        '/amenities': 'amenities',
        '/offers': 'offers',
        '/gallery': 'gallery',
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
  };

  const handleLogout = async () => {
    const { signOut } = await import('./services/staffService');
    await signOut();
    setCurrentUser(null);
    navigate('/PMS');
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

  const handleSearchAvailability = (search: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
  }) => {
    setBookingInitialSearch(search);
    setShowBookingModal(true);
  };

  const handleSelectCategoryForBooking = (categoryId: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    setBookingInitialSearch({
      checkIn: tomorrow.toISOString().split('T')[0],
      checkOut: dayAfter.toISOString().split('T')[0],
      adults: 2,
      children: 0,
      selectedCategoryId: categoryId,
    });
    setShowBookingModal(true);
  };

  const handleSelectOfferCode = (code: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    setBookingInitialSearch({
      checkIn: tomorrow.toISOString().split('T')[0],
      checkOut: dayAfter.toISOString().split('T')[0],
      adults: 2,
      children: 0,
    });
    setShowBookingModal(true);
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
    <Suspense fallback={null}>
      <PMSLoginScreen
        hotel={hotel}
        onAuthenticated={handleAuthenticated}
        onReturnToWebsite={() => navigate('/')}
      />
    </Suspense>
  );

  const publicWebsiteContent = (
    <>
      <Navbar
        hotel={hotel}
        onOpenBooking={() => {
          setBookingInitialSearch(undefined);
          setShowBookingModal(true);
        }}
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
        onOpenBooking={() => {
          setBookingInitialSearch(undefined);
          setShowBookingModal(true);
        }}
      />
    </>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      <Routes>
        {/* PUBLIC HOTEL GUEST WEBSITE */}
        <Route path="/" element={publicWebsiteContent} />

        {/* DEDICATED LOCAL SEO LANDING PAGES */}
        {Object.values(DEDICATED_LANDING_PAGES).map((pageConfig) => (
          <Route
            key={pageConfig.path}
            path={pageConfig.path}
            element={
              <>
                <Navbar
                  hotel={hotel}
                  onOpenBooking={() => {
                    setBookingInitialSearch(undefined);
                    setShowBookingModal(true);
                  }}
                  onNavigateSection={handleNavigateSection}
                />
                <main className="flex-1">
                  <Suspense fallback={null}>
                    <SeoLandingPage
                      config={pageConfig}
                      hotel={hotel}
                      onOpenBooking={() => {
                        setBookingInitialSearch(undefined);
                        setShowBookingModal(true);
                      }}
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
                  onOpenBooking={() => {
                    setBookingInitialSearch(undefined);
                    setShowBookingModal(true);
                  }}
                />
              </>
            }
          />
        ))}

        {/* DEDICATED STAFF PMS PORTAL ROUTES (/PMS, /pms, /admin) */}
        <Route path="/pms/*" element={pmsPortalElement} />
        <Route path="/admin/*" element={pmsPortalElement} />

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
        !location.pathname.toLowerCase().startsWith('/admin') && (
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
