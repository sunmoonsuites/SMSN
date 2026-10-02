-- ====================================================================
-- LUXURY CRM & LEADS DASHBOARD SCHEMA FOR SUPABASE POSTGRESQL
-- Isolated tables for Lead Management, Sync Settings, and CRM Bookings
-- Zero impact on existing PMS tables.
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  source TEXT DEFAULT 'website', -- 'website', 'google_sheets', 'meta', 'direct', 'manual', 'referral', 'walk_in', 'phone_call'
  status TEXT DEFAULT 'new', -- 'new', 'contacted', 'followup', 'converted', 'lost', 'hot'
  score TEXT DEFAULT 'COLD', -- 'HOT', 'WARM', 'COLD'
  budget TEXT DEFAULT '',
  guests TEXT DEFAULT '',
  city TEXT DEFAULT '',
  booking_date DATE,
  booking_time TEXT DEFAULT '',
  remarks TEXT DEFAULT '',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g. ['Relevent', 'Non Relevent', 'VIP']
  meta_lead_id TEXT UNIQUE, -- Deduplication for Meta/Facebook/Instagram Lead Ads
  sync_hash TEXT UNIQUE, -- Deduplication for Google Sheets 2-way sync
  follow_up_date DATE,
  follow_up_time TEXT DEFAULT '',
  follow_up_remarks TEXT DEFAULT '',
  assigned_agent UUID,
  assigned_agent_name TEXT DEFAULT '',
  email_sent BOOLEAN DEFAULT false,
  whatsapp_sent BOOLEAN DEFAULT false,
  history JSONB DEFAULT '[]'::JSONB, -- Chronological array of activity log objects
  created_at TIMESTAMPTZ DEFAULT now(),
  status_updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexing for fast search, filtering, and deduplication
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_sync_hash ON public.leads(sync_hash);
CREATE INDEX IF NOT EXISTS idx_leads_meta_lead_id ON public.leads(meta_lead_id);

-- 2. App Settings Table (Key-Value configuration storage for CRM)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY, -- 'lead_sync', 'meta_sync', 'gmail_config', 'reply_templates', 'crm_permissions'
  value JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CRM Bookings Table (For 1-Click Convert to Booking without conflicting with PMS bookings)
CREATE TABLE IF NOT EXISTS public.crm_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  email TEXT DEFAULT '',
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER DEFAULT 2,
  occasion TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  total_amount NUMERIC(10, 2) DEFAULT 0,
  booked_by TEXT DEFAULT 'lead_conversion',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS) with open access policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public full access to leads" ON public.leads;
CREATE POLICY "Public full access to leads"
  ON public.leads FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to app_settings" ON public.app_settings;
CREATE POLICY "Public full access to app_settings"
  ON public.app_settings FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access to crm_bookings" ON public.crm_bookings;
CREATE POLICY "Public full access to crm_bookings"
  ON public.crm_bookings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add public.leads to supabase_realtime publication safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
