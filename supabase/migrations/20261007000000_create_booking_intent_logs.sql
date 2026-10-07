-- ====================================================================
-- WEBSITE BOOKING INTENT & FOOTFALL TRACKING SCHEMA
-- Tracks visitors who click 'Check Availability' or 'Book Now'
-- Allows hotel PMS to view real-time booking intent & recover lost leads
-- Isolated table: Zero impact on existing PMS tables or bookings.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.booking_intent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id UUID REFERENCES public.hotels(id) ON DELETE CASCADE,
    visitor_id TEXT NOT NULL,
    button_source TEXT NOT NULL, -- 'hero_check_availability' | 'navbar_book_now' | 'mobile_sticky_bar' | 'room_card' | 'seo_landing_page' | 'offer_code'
    check_in DATE,
    check_out DATE,
    guests_count INTEGER DEFAULT 2,
    room_type_name TEXT,
    guest_name TEXT,
    guest_phone TEXT,
    guest_email TEXT,
    device_type TEXT DEFAULT 'mobile', -- 'mobile' | 'desktop' | 'tablet'
    converted_to_booking BOOLEAN DEFAULT FALSE,
    booking_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup indexes
CREATE INDEX IF NOT EXISTS idx_booking_intent_hotel_created ON public.booking_intent_logs(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_intent_visitor ON public.booking_intent_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_booking_intent_converted ON public.booking_intent_logs(converted_to_booking);

-- Enable Row Level Security (RLS)
ALTER TABLE public.booking_intent_logs ENABLE ROW LEVEL SECURITY;

-- Allow public anonymous visitors and authenticated users to record intent
DROP POLICY IF EXISTS "Public insert booking intent logs" ON public.booking_intent_logs;
CREATE POLICY "Public insert booking intent logs" 
ON public.booking_intent_logs 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Allow reading logs for PMS Dashboard and website analytics
DROP POLICY IF EXISTS "Allow read booking intent logs" ON public.booking_intent_logs;
CREATE POLICY "Allow read booking intent logs" 
ON public.booking_intent_logs 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Allow updating logs (e.g. marking converted_to_booking = true or attaching guest details)
DROP POLICY IF EXISTS "Allow update booking intent logs" ON public.booking_intent_logs;
CREATE POLICY "Allow update booking intent logs" 
ON public.booking_intent_logs 
FOR UPDATE 
TO anon, authenticated
USING (true)
WITH CHECK (true);
