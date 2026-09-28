-- ====================================================================
-- DYNAMIC WEBSITE CMS SETTINGS IN SUPABASE
-- Ensures all dynamic website sections (Hero Banner, Amenities, Landmarks,
-- Banquet Hall Config, Plus Code, Policies, FAQs, Social Links) are stored
-- in and retrieved directly from Supabase PostgreSQL.
-- ====================================================================

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS plus_code TEXT DEFAULT 'H9FW+8F';

ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS plus_code TEXT DEFAULT 'H9FW+8F',
  ADD COLUMN IF NOT EXISTS hero_config JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS amenities_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landmarks_list JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS banquet_config JSONB DEFAULT '{}'::jsonb;
