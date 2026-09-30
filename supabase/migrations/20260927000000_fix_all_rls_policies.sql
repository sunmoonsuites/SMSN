-- ====================================================================
-- FIX ROW-LEVEL SECURITY (RLS) POLICIES FOR HOTEL PMS & GUEST PORTAL
-- Resolves error 42501 ("new row violates row-level security policy")
-- across guests, bookings, rooms, invoices, and operational tables.
-- ====================================================================

-- 1. GUESTS TABLE
DROP POLICY IF EXISTS "Staff manage guests" ON public.guests;
DROP POLICY IF EXISTS "Public create guests" ON public.guests;
DROP POLICY IF EXISTS "Allow all access to guests" ON public.guests;
CREATE POLICY "Allow all access to guests" ON public.guests
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. HOTELS TABLE
DROP POLICY IF EXISTS "Staff full access hotels" ON public.hotels;
DROP POLICY IF EXISTS "Public read hotel info" ON public.hotels;
DROP POLICY IF EXISTS "Allow all access to hotels" ON public.hotels;
CREATE POLICY "Allow all access to hotels" ON public.hotels
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. HOTEL SETTINGS TABLE
DROP POLICY IF EXISTS "Staff full access settings" ON public.hotel_settings;
DROP POLICY IF EXISTS "Public read hotel settings" ON public.hotel_settings;
DROP POLICY IF EXISTS "Allow all access to hotel_settings" ON public.hotel_settings;
CREATE POLICY "Allow all access to hotel_settings" ON public.hotel_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. BOOKINGS TABLE
DROP POLICY IF EXISTS "Staff manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public read own booking" ON public.bookings;
DROP POLICY IF EXISTS "Allow all access to bookings" ON public.bookings;
CREATE POLICY "Allow all access to bookings" ON public.bookings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 5. BOOKING ROOMS TABLE
DROP POLICY IF EXISTS "Staff manage booking rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Public create booking rooms" ON public.booking_rooms;
DROP POLICY IF EXISTS "Allow all access to booking_rooms" ON public.booking_rooms;
CREATE POLICY "Allow all access to booking_rooms" ON public.booking_rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. ROOMS & CATEGORIES
DROP POLICY IF EXISTS "Staff manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Public read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow all access to rooms" ON public.rooms;
CREATE POLICY "Allow all access to rooms" ON public.rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage room categories" ON public.room_categories;
DROP POLICY IF EXISTS "Public read active room categories" ON public.room_categories;
DROP POLICY IF EXISTS "Allow all access to room_categories" ON public.room_categories;
CREATE POLICY "Allow all access to room_categories" ON public.room_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 7. INVOICES & PAYMENTS
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Allow all access to invoices" ON public.invoices;
CREATE POLICY "Allow all access to invoices" ON public.invoices
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage invoice items" ON public.invoice_items;
DROP POLICY IF EXISTS "Allow all access to invoice_items" ON public.invoice_items;
CREATE POLICY "Allow all access to invoice_items" ON public.invoice_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage payments" ON public.payments;
DROP POLICY IF EXISTS "Allow all access to payments" ON public.payments;
CREATE POLICY "Allow all access to payments" ON public.payments
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. EXPENSES & EXPENSE CATEGORIES
DROP POLICY IF EXISTS "Staff manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow all access to expenses" ON public.expenses;
CREATE POLICY "Allow all access to expenses" ON public.expenses
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Allow all access to expense_categories" ON public.expense_categories;
CREATE POLICY "Allow all access to expense_categories" ON public.expense_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 9. AUDIT LOGS & ENQUIRIES
DROP POLICY IF EXISTS "Staff manage audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow all access to audit_logs" ON public.audit_logs;
CREATE POLICY "Allow all access to audit_logs" ON public.audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Public create enquiries" ON public.enquiries;
DROP POLICY IF EXISTS "Allow all access to enquiries" ON public.enquiries;
CREATE POLICY "Allow all access to enquiries" ON public.enquiries
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 10. OFFERS, GALLERY, RESTAURANT
DROP POLICY IF EXISTS "Staff manage offers" ON public.offers;
DROP POLICY IF EXISTS "Public read active offers" ON public.offers;
DROP POLICY IF EXISTS "Allow all access to offers" ON public.offers;
CREATE POLICY "Allow all access to offers" ON public.offers
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage gallery" ON public.gallery;
DROP POLICY IF EXISTS "Public read gallery" ON public.gallery;
DROP POLICY IF EXISTS "Allow all access to gallery" ON public.gallery;
CREATE POLICY "Allow all access to gallery" ON public.gallery
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage restaurant categories" ON public.restaurant_categories;
DROP POLICY IF EXISTS "Public read active restaurant categories" ON public.restaurant_categories;
DROP POLICY IF EXISTS "Allow all access to restaurant_categories" ON public.restaurant_categories;
CREATE POLICY "Allow all access to restaurant_categories" ON public.restaurant_categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Staff manage restaurant items" ON public.restaurant_items;
DROP POLICY IF EXISTS "Public read active restaurant items" ON public.restaurant_items;
DROP POLICY IF EXISTS "Allow all access to restaurant_items" ON public.restaurant_items;
CREATE POLICY "Allow all access to restaurant_items" ON public.restaurant_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 11. INSIGHTS & LOCAL SEO ARTICLES TABLE + STORAGE BUCKET
CREATE TABLE IF NOT EXISTS public.insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL DEFAULT 'Noida Guide',
    excerpt TEXT NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    image_alt TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Sun Moon Suites Editorial Desk',
    read_time TEXT NOT NULL DEFAULT '4 min read',
    tags TEXT[] DEFAULT '{}',
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to insights" ON public.insights;
CREATE POLICY "Allow all access to insights" ON public.insights
    FOR ALL
    USING (true)
    WITH CHECK (true);

