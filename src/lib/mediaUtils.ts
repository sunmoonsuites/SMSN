/**
 * Zero-Egress Media Utilities
 * Routes all hotel image assets through local Cloudflare Pages /assets/ directory
 * completely eliminating Supabase Storage bandwidth consumption.
 */

export function resolveZeroEgressImageUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already local Cloudflare asset
  if (trimmed.startsWith('/assets/')) return trimmed;

  // Intercept Supabase Storage URLs and map them to local zero-egress Cloudflare assets
  if (trimmed.includes('supabase.co/storage/v1/object/public/hotel-media/')) {
    const filename = trimmed.split('/').pop()?.split('?')[0];
    if (filename) {
      return `/assets/mirrored/${filename}`;
    }
  }

  return trimmed;
}

/**
 * Normalizes an array of image URLs to zero-egress local assets
 */
export function resolveZeroEgressImageUrls(urls?: (string | null | undefined)[]): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.map(resolveZeroEgressImageUrl).filter(Boolean);
}
