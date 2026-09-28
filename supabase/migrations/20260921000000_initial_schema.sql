-- ====================================================================
-- HOTEL MANAGEMENT SYSTEM & GUEST PORTAL - COMPLETE DATABASE SCHEMA
-- Target Property: 30-Room Modern Hotel, Sector 117, Noida, UP, India
-- Single Source of Truth: Supabase PostgreSQL
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HOTELS (Multi-property capable, initialized for Sector 117 Noida)
CREATE TABLE IF NOT EXISTS public.hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Sun Moon Suites',
    tagline TEXT DEFAULT 'Boutique Luxury & Modern Comfort in Noida',
    description TEXT DEFAULT 'Experience hospitality at its finest in Sector 117, Noida. Featuring 30 thoughtfully appointed rooms, on-site multi-cuisine restaurant, 24/7 reception, and personalized guest services.',
    address TEXT NOT NULL DEFAULT 'Plot No. 12, Sector 117',
    city TEXT NOT NULL DEFAULT 'Noida',
    state TEXT NOT NULL DEFAULT 'Uttar Pradesh',
    country TEXT NOT NULL DEFAULT 'India',
    pincode TEXT NOT NULL DEFAULT '201301',
    phone TEXT DEFAULT '+91 93135 01001',
    email TEXT DEFAULT 'sunmoonsuites@gmail.com',
    whatsapp TEXT DEFAULT '+919313501001',
    gstin TEXT DEFAULT '09AAACH7409R1ZZ',
    logo_url TEXT,
    total_rooms INTEGER NOT NULL DEFAULT 30 CHECK (total_rooms > 0),
    latitude NUMERIC(10, 7) DEFAULT 28.5724000,
    longitude NUMERIC(10, 7) DEFAULT 77.3892000,
    google_maps_url TEXT DEFAULT 'https://maps.google.com/?q=Sector+117+Noida+Uttar+Pradesh',
    check_in_time TEXT NOT NULL DEFAULT '14:00',
    check_out_time TEXT NOT NULL DEFAULT '11:00',
    currency TEXT NOT NULL DEFAULT 'INR',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. HOTEL SETTINGS (Configurable business policies & website SEO)
CREATE TABLE IF NOT EXISTS public.hotel_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    booking_rules JSONB NOT NULL DEFAULT '{
        "min_stay_nights": 1,
        "max_stay_nights": 30,
        "allow_same_day_booking": true,
        "advance_booking_days": 180,
        "child_age_free_limit": 5,
        "gst_rate_below_7500": 12.0,
        "gst_rate_above_7500": 18.0
    }'::jsonb,
    cancellation_policy TEXT DEFAULT 'Free cancellation up to 48 hours before check-in (14:00 hotel local time). Cancellations made within 48 hours are subject to a 1-night retention charge.',
    terms_and_conditions TEXT DEFAULT 'All Indian citizens must present a valid government-issued photo ID (Aadhaar, Passport, Voter ID, Driving License) at check-in. PAN Card is not accepted as ID proof. Foreign nationals must present a valid passport and Indian visa.',
    privacy_policy TEXT DEFAULT 'We value your privacy. Your contact and identity information is collected strictly for mandatory government guest registration and reservation management. We never sell your personal data.',
    payment_config JSONB NOT NULL DEFAULT '{
        "gateway_provider": "Razorpay",
        "accept_cash_on_arrival": true,
        "accept_upi": true,
        "accept_card": true,
        "online_payment_enabled": false
    }'::jsonb,
    seo_title TEXT DEFAULT 'Hotel in Sector 117 Noida | Luxury Rooms & Suites',
    meta_description TEXT DEFAULT 'Book your stay at our boutique hotel in Sector 117 Noida. 30 premium rooms, free high-speed Wi-Fi, restaurant, 24-hr room service, close to Noida Expressway and Metro.',
    social_links JSONB NOT NULL DEFAULT '{
        "instagram": "",
        "facebook": "",
        "tripadvisor": "",
        "google_business": ""
    }'::jsonb,
    faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hotel_settings_hotel UNIQUE (hotel_id)
);

-- 4. PROFILES & ROLES (Super Admin, Admin, Front Desk, Housekeeping, Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('SUPER ADMIN', 'ADMIN', 'FRONT DESK', 'HOUSEKEEPING', 'ACCOUNTS')),
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ROOM CATEGORIES (Types of rooms, pricing, occupancy)
CREATE TABLE IF NOT EXISTS public.room_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    max_adults INTEGER NOT NULL DEFAULT 2 CHECK (max_adults > 0),
    max_children INTEGER NOT NULL DEFAULT 1 CHECK (max_children >= 0),
    room_size_sqft INTEGER DEFAULT 250,
    bed_type TEXT NOT NULL DEFAULT 'King Bed',
    amenities TEXT[] NOT NULL DEFAULT '{}',
    images TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_room_category_slug UNIQUE (hotel_id, slug)
);

-- 6. ROOMS (Exact 30 rooms across 3 floors: 10 per floor)
-- Ground Floor: Reception, Restaurant, Common Areas
-- 1st Floor: 101 to 110
-- 2nd Floor: 201 to 210
-- 3rd Floor: 301 to 310
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.room_categories(id) ON DELETE SET NULL,
    room_number TEXT NOT NULL,
    floor INTEGER NOT NULL CHECK (floor IN (1, 2, 3)),
    status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Reserved', 'Occupied', 'Cleaning', 'Maintenance', 'Out of Order')),
    is_smoking BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hotel_room_number UNIQUE (hotel_id, room_number)
);

-- 7. GUESTS (Registered guest directory & stay tracking)
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    id_type TEXT CHECK (id_type IN ('Aadhaar', 'Passport', 'Driving License', 'Voter ID', 'Other')),
    id_number TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    notes TEXT,
    total_stays INTEGER NOT NULL DEFAULT 0 CHECK (total_stays >= 0),
    total_spent NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. BOOKINGS (Reservation core entity)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    booking_reference TEXT NOT NULL UNIQUE,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT NOT NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults INTEGER NOT NULL DEFAULT 1 CHECK (adults > 0),
    children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
    status TEXT NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Pending', 'Confirmed', 'Checked-In', 'Checked-Out', 'Cancelled', 'No-Show')),
    source TEXT NOT NULL DEFAULT 'Website' CHECK (source IN ('Website', 'Walk-in', 'Phone', 'OTA')),
    total_room_charges NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (total_room_charges >= 0),
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Refunded')),
    promo_code TEXT,
    special_requests TEXT,
    checked_in_at TIMESTAMPTZ,
    checked_out_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_booking_dates CHECK (check_out_date >= check_in_date)
);

-- 9. BOOKING ROOMS (Rooms assigned or reserved under a booking)
CREATE TABLE IF NOT EXISTS public.booking_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.room_categories(id) ON DELETE SET NULL,
    rate_per_night NUMERIC(10, 2) NOT NULL CHECK (rate_per_night >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. INVOICES (Billing, taxes, GST calculations)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (balance_due >= 0),
    status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (status IN ('Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Void')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. INVOICE ITEMS (Line items for Room, Food, Laundry, Services)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Room' CHECK (category IN ('Room', 'Restaurant', 'Laundry', 'Mini Bar', 'Service', 'Other')),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00 CHECK (tax_rate >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. PAYMENTS (Transactions: Cash, UPI, Card, Net Banking, Razorpay)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Net Banking', 'Razorpay', 'Bank Transfer')),
    status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    transaction_reference TEXT,
    gateway_order_id TEXT,
    gateway_payment_id TEXT,
    notes TEXT,
    received_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hotel_expense_category UNIQUE (hotel_id, name)
);

-- 14. EXPENSES (Property operational costs)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    vendor TEXT,
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Bank Transfer', 'Cheque')),
    notes TEXT,
    attachment_url TEXT,
    recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. RESTAURANT CATEGORIES (Ground floor dining)
CREATE TABLE IF NOT EXISTS public.restaurant_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. RESTAURANT ITEMS
CREATE TABLE IF NOT EXISTS public.restaurant_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.restaurant_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_veg BOOLEAN NOT NULL DEFAULT true,
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. OFFERS (Promotional discounts & promo codes)
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    promo_code TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    min_booking_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    terms TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_hotel_promo_code UNIQUE (hotel_id, promo_code),
    CONSTRAINT chk_offer_dates CHECK (end_date >= start_date)
);

-- 18. GALLERY (Hotel photos: rooms, dining, lobby, exterior)
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'Hotel',
    image_url TEXT NOT NULL,
    caption TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. ENQUIRIES (Guest contact messages from website)
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Read', 'Resolved')),
    internal_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 20. AUDIT LOGS (Immutable tracking of all PMS operations)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 21. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_hotel_status ON public.rooms(hotel_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_category ON public.rooms(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_dates ON public.bookings(hotel_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_booking ON public.booking_rooms(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_rooms_room ON public.booking_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_guests_hotel_phone ON public.guests(hotel_id, phone);
CREATE INDEX IF NOT EXISTS idx_invoices_hotel_booking ON public.invoices(hotel_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_hotel_booking ON public.payments(hotel_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_hotel_date ON public.expenses(hotel_id, date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hotel_time ON public.audit_logs(hotel_id, created_at DESC);

-- ====================================================================
-- 22. STORED FUNCTIONS (Availability & Business Logic)
-- ====================================================================

-- Check room availability for a date range
CREATE OR REPLACE FUNCTION public.check_room_availability(
    p_hotel_id UUID,
    p_category_id UUID,
    p_check_in DATE,
    p_check_out DATE
)
RETURNS TABLE (
    room_id UUID,
    room_number TEXT,
    floor INTEGER,
    status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT r.id, r.room_number, r.floor, r.status
    FROM public.rooms r
    WHERE r.hotel_id = p_hotel_id
      AND (p_category_id IS NULL OR r.category_id = p_category_id)
      AND r.status NOT IN ('Out of Order', 'Maintenance')
      AND r.id NOT IN (
          SELECT br.room_id
          FROM public.booking_rooms br
          JOIN public.bookings b ON b.id = br.booking_id
          WHERE b.hotel_id = p_hotel_id
            AND b.status IN ('Confirmed', 'Checked-In')
            AND br.room_id IS NOT NULL
            -- Dates overlap condition:
            AND (b.check_in_date < p_check_out AND b.check_out_date > p_check_in)
      )
    ORDER BY r.floor, r.room_number;
END;
$$;

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_set_updated_at ON public.%I', tbl);
        EXECUTE format('CREATE TRIGGER trigger_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', tbl);
    END LOOP;
END;
$$;

-- ====================================================================
-- 23. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check staff role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT LANGUAGE sql STABLE AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- HOTEL PMS & OPERATIONS ACCESS POLICIES
-- Complete access for all hotel operations via Supabase API
CREATE POLICY "Allow all access to hotels" ON public.hotels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to hotel_settings" ON public.hotel_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to room_categories" ON public.room_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to rooms" ON public.rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to guests" ON public.guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to booking_rooms" ON public.booking_rooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to expense_categories" ON public.expense_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to restaurant_categories" ON public.restaurant_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to restaurant_items" ON public.restaurant_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to offers" ON public.offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to gallery" ON public.gallery FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to enquiries" ON public.enquiries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 24. SYSTEM INITIALIZATION FUNCTION (Ensures 1 Hotel record exists)
-- Note: NO DEMO DATA (rooms, bookings, guests, expenses are NOT inserted)
-- Only the base hotel structure record so foreign keys can be referenced!
-- ====================================================================
CREATE OR REPLACE FUNCTION public.initialize_hotel_system()
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
    v_hotel_id UUID;
BEGIN
    SELECT id INTO v_hotel_id FROM public.hotels LIMIT 1;
    IF v_hotel_id IS NULL THEN
        INSERT INTO public.hotels (
            name, tagline, description, address, city, state, country, pincode,
            phone, email, whatsapp, gstin, total_rooms
        ) VALUES (
            'Sun Moon Suites',
            'Boutique Luxury & Modern Comfort in Sector 117, Noida',
            'A 30-room boutique hotel in Sector 117, Noida, featuring modern amenities, on-site dining, and exceptional hospitality.',
            'Plot No. 12, Sector 117',
            'Noida',
            'Uttar Pradesh',
            'India',
            '201301',
            '+91 93135 01001',
            'sunmoonsuites@gmail.com',
            '+919313501001',
            '09AAACH7409R1ZZ',
            30
        ) RETURNING id INTO v_hotel_id;

        INSERT INTO public.hotel_settings (hotel_id) VALUES (v_hotel_id);
    END IF;
    RETURN v_hotel_id;
END;
$$;

SELECT public.initialize_hotel_system();
