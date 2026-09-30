-- ====================================================================
-- SUN MOON SUITES NOIDA: INSIGHTS & LOCAL SEO ARTICLES TABLE + STORAGE
-- Creates public.insights table and insights storage bucket with RLS
-- ====================================================================

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

CREATE INDEX IF NOT EXISTS idx_insights_hotel_id ON public.insights(hotel_id);
CREATE INDEX IF NOT EXISTS idx_insights_slug ON public.insights(slug);
CREATE INDEX IF NOT EXISTS idx_insights_published_at ON public.insights(published_at DESC);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to insights" ON public.insights;
CREATE POLICY "Allow all access to insights" ON public.insights
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional Supabase Storage Bucket for Insights Cover Images
INSERT INTO storage.buckets (id, name, public)
VALUES ('insights', 'insights', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Insights Bucket" ON storage.objects;
CREATE POLICY "Public Access Insights Bucket" ON storage.objects
    FOR ALL
    USING (bucket_id = 'insights')
    WITH CHECK (bucket_id = 'insights');
