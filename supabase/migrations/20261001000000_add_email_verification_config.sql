-- ====================================================================
-- GMAIL EMAIL VERIFICATION SETTINGS IN SUPABASE
-- Allows storing Gmail OTP sender email, Google App Password, and toggle
-- directly in public.hotel_settings and public.hotels in Supabase.
-- ====================================================================

ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS email_verification_config JSONB DEFAULT '{
    "is_enabled": true,
    "sender_email": "sunmoonsuites@gmail.com",
    "gmail_app_password": "",
    "sender_name": "Sun Moon Suites"
  }'::jsonb;
