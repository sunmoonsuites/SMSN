import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Hotel, StaffUser } from './types';
import { getHotel, getInitialHotelSync } from './services/hotelService';

// Website Components
import { Navbar } from './components/website/Navbar';
import { HeroSection } from './components/website/HeroSection';
import { FeaturedRooms } from './components/website/FeaturedRooms';
import { AmenitiesSection } from './components/website/AmenitiesSection';
import { BanquetSection } from './components/website/BanquetSection';
import { OffersSection } from './components/website/OffersSection';
import { GallerySection } from './components/website/GallerySection';
import { LocationSection } from './components/website/LocationSection';
import { ContactSection } from './components/website/ContactSection';
import { Footer } from './components/website/Footer';
import { MobileStickyBar } from './components/website/MobileStickyBar';
import { BookingFlowModal } from './components/website/BookingFlowModal';
import { PolicyModal } from './components/website/PolicyModal';
import { FloatingWhatsAppButton } from './components/website/FloatingWhatsAppButton';

// Admin Components
import { AdminLayout, AdminTab } from './components/admin/AdminLayout';
import { DashboardView } from './components/admin/DashboardView';
import { FrontDeskView } from './components/admin/FrontDeskView';
import { ReservationsView } from './components/admin/ReservationsView';
import { CalendarView } from './components/admin/CalendarView';
import { RoomsManagementView } from './components/admin/RoomsManagementView';
import { HousekeepingView } from './components/admin/HousekeepingView';
import { GuestsView } from './components/admin/GuestsView';
import { BillingView } from './components/admin/BillingView';
import { PaymentsView } from './components/admin/PaymentsView';
import { ExpensesView } from './components/admin/ExpensesView';
import { BanquetManagementView } from './components/admin/BanquetManagementView';
import { OffersManagementView } from './components/admin/OffersManagementView';
import { GalleryManagementView } from './components/admin/GalleryManagementView';
import { EnquiriesView } from './components/admin/EnquiriesView';
import { ReportsView } from './components/admin/ReportsView';
import { StaffManagementView } from './components/admin/StaffManagementView';
import { AuditTrailView } from './components/admin/AuditTrailView';
import { SettingsView } from './components/admin/SettingsView';

// Common Modals
import { SupabaseConfigModal } from './components/common/SupabaseConfigModal';
import { AuthModal, PMSLoginScreen } from './components/auth/AuthModal';
import { signOut } from './services/staffService';
import { getSupabase } from './lib/supabase';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { applyPMSThemeToDocument, getPMSTheme } from './services/themeService';

export function MainApp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hotel, setHotel] = useState<Hotel | null>(() => getInitialHotelSync());
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
    loadHotelData();

    const handleDataUpdated = () => {
      loadHotelData();
    };

    window.addEventListener('hotel_data_updated', handleDataUpdated);
    window.addEventListener('storage', handleDataUpdated);

    return () => {
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
  }, [location.hash, location.search, location.pathname, navigate]);

  useEffect(() => {
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

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const loadHotelData = async () => {
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
  ) : (
    <PMSLoginScreen
      hotel={hotel}
      onAuthenticated={handleAuthenticated}
      onReturnToWebsite={() => navigate('/')}
    />
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      <Routes>
        {/* PUBLIC HOTEL GUEST WEBSITE */}
        <Route
          path="/"
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
                <HeroSection hotel={hotel} onSearchAvailability={handleSearchAvailability} />
                <FeaturedRooms hotel={hotel} onSelectCategoryForBooking={handleSelectCategoryForBooking} />
                <AmenitiesSection hotel={hotel} />
                <BanquetSection hotel={hotel} />
                <OffersSection hotel={hotel} onSelectOfferCode={handleSelectOfferCode} />
                <GallerySection hotel={hotel} />
                <LocationSection hotel={hotel} />
                <ContactSection hotel={hotel} />
              </main>

              <Footer
                hotel={hotel}
                onOpenPolicy={(policy) => setActivePolicy(policy)}
                onNavigateSection={handleNavigateSection}
              />

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

        {/* DEDICATED STAFF PMS PORTAL ROUTES (/PMS, /pms, /admin) */}
        <Route path="/pms/*" element={pmsPortalElement} />
        <Route path="/admin/*" element={pmsPortalElement} />

        {/* FALLBACK ROUTE: Render Public Website for any other path */}
        <Route
          path="*"
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
                <HeroSection hotel={hotel} onSearchAvailability={handleSearchAvailability} />
                <FeaturedRooms hotel={hotel} onSelectCategoryForBooking={handleSelectCategoryForBooking} />
                <AmenitiesSection hotel={hotel} />
                <BanquetSection hotel={hotel} />
                <OffersSection hotel={hotel} onSelectOfferCode={handleSelectOfferCode} />
                <GallerySection hotel={hotel} />
                <LocationSection hotel={hotel} />
                <ContactSection hotel={hotel} />
              </main>

              <Footer
                hotel={hotel}
                onOpenPolicy={(policy) => setActivePolicy(policy)}
                onNavigateSection={handleNavigateSection}
              />

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
      </Routes>

      {/* Booking Flow Modal */}
      <BookingFlowModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        hotel={hotel}
        initialSearch={bookingInitialSearch}
        onBookingSuccess={() => {
          // Booking confirmed
        }}
      />

      {/* Staff Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        hotelId={hotel?.id || 'default-hotel-id'}
        onAuthenticated={(user) => {
          handleAuthenticated(user);
          navigate('/PMS');
        }}
      />

      {/* Floating WhatsApp Button (Public Website Only) */}
      {location.pathname === '/' && <FloatingWhatsAppButton hotel={hotel} />}

      {/* Supabase Database Connection Modal */}
      <SupabaseConfigModal
        isOpen={showSupabaseModal}
        onClose={() => setShowSupabaseModal(false)}
        onConnected={() => {
          loadHotelData();
        }}
      />

      {/* Policy & Terms Modal */}
      {activePolicy && (
        <PolicyModal
          isOpen={Boolean(activePolicy)}
          onClose={() => setActivePolicy(null)}
          type={activePolicy}
          hotel={hotel}
        />
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
