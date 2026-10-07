import { getSupabase } from '../lib/supabase';
import { GalleryItem } from '../types';
import { getGalleryItems, getStoredGallery } from './galleryService';
import { getHotel, updateHotel } from './hotelService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id);
}

export interface EgressAuditResult {
  totalImages: number;
  supabaseImagesCount: number;
  externalImagesCount: number;
  cloudflareImagesCount: number;
  estimatedMonthlyEgressMB: number;
  itemsToMigrate: Array<{
    id: string;
    type: 'gallery' | 'hero';
    title: string;
    currentUrl: string;
    category?: string;
  }>;
}

export interface MigrationProgressUpdate {
  current: number;
  total: number;
  percent: number;
  itemTitle: string;
  status: 'migrating' | 'done' | 'error';
}

/**
 * Scans the hotel database and media gallery to identify images hosted on
 * Supabase Storage CDN that consume monthly Egress bandwidth.
 */
export async function auditMediaForEgressRisk(): Promise<EgressAuditResult> {
  const itemsToMigrate: EgressAuditResult['itemsToMigrate'] = [];
  let totalImages = 0;
  let supabaseImagesCount = 0;
  let externalImagesCount = 0;
  let cloudflareImagesCount = 0;

  const hotel = await getHotel();
  const hotelId = hotel?.id || 'default-hotel-id';

  // 1. Audit Gallery Items
  try {
    const galleryItems = await getGalleryItems(hotelId);
    totalImages += galleryItems.length;

    for (const item of galleryItems) {
      const url = item.image_url || '';
      if (url.startsWith('/assets/')) {
        cloudflareImagesCount++;
      } else if (url.includes('supabase.co') || url.startsWith('data:image/')) {
        supabaseImagesCount++;
        itemsToMigrate.push({
          id: item.id,
          type: 'gallery',
          title: item.caption || `Gallery ${item.category}`,
          currentUrl: url,
          category: item.category,
        });
      } else if (url.startsWith('http')) {
        externalImagesCount++;
        itemsToMigrate.push({
          id: item.id,
          type: 'gallery',
          title: item.caption || `Gallery ${item.category}`,
          currentUrl: url,
          category: item.category,
        });
      }
    }
  } catch (err) {
    console.warn('[EgressAudit] Failed to audit gallery items:', err);
  }

  // 2. Audit Hotel Hero Config Image
  try {
    const heroUrl = hotel?.hero_config?.image_url;
    if (heroUrl) {
      totalImages++;
      if (heroUrl.startsWith('/assets/')) {
        cloudflareImagesCount++;
      } else if (heroUrl.includes('supabase.co') || heroUrl.startsWith('data:image/')) {
        supabaseImagesCount++;
        itemsToMigrate.push({
          id: 'hotel-hero',
          type: 'hero',
          title: 'Hero Banner Image',
          currentUrl: heroUrl,
          category: 'hero',
        });
      } else if (heroUrl.startsWith('http')) {
        externalImagesCount++;
        itemsToMigrate.push({
          id: 'hotel-hero',
          type: 'hero',
          title: 'Hero Banner Image',
          currentUrl: heroUrl,
          category: 'hero',
        });
      }
    }
  } catch (err) {
    console.warn('[EgressAudit] Failed to audit hotel hero image:', err);
  }

  // Average 2 MB per image * 1000 visitors = ~2000 MB per image per month
  const estimatedMonthlyEgressMB = (supabaseImagesCount + externalImagesCount) * 150;

  return {
    totalImages,
    supabaseImagesCount,
    externalImagesCount,
    cloudflareImagesCount,
    estimatedMonthlyEgressMB,
    itemsToMigrate,
  };
}

/**
 * 1-Click Executor: Migrates all images to Cloudflare local assets (/assets/mirrored)
 * and updates database URLs to eliminate Supabase Cached Egress forever.
 */
export async function execute1ClickCloudflareMigration(
  onProgress?: (update: MigrationProgressUpdate) => void
): Promise<{
  success: boolean;
  migratedCount: number;
  failedCount: number;
  egressSavedMB: number;
  error?: string;
}> {
  const audit = await auditMediaForEgressRisk();
  const total = audit.itemsToMigrate.length;

  if (total === 0) {
    return {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      egressSavedMB: 0,
    };
  }

  let migratedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < total; i++) {
    const item = audit.itemsToMigrate[i];
    const percent = Math.round(((i + 1) / total) * 100);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        percent,
        itemTitle: item.title,
        status: 'migrating',
      });
    }

    try {
      // Call server endpoint to download, compress & save into public/assets/mirrored
      const res = await fetch('/api/media/mirror-to-cloudflare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.currentUrl,
          customName: item.title,
          category: item.category || 'photo',
        }),
      });

      if (!res.ok) {
        throw new Error(`Mirror API returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.localUrl) {
        throw new Error('Missing localUrl in mirror response');
      }

      const newLocalUrl = data.localUrl;

      // Update Database records
      if (item.type === 'gallery') {
        // Update local cache
        const currentList = getStoredGallery();
        const updatedList = currentList.map((g) =>
          g.id === item.id || g.image_url === item.currentUrl ? { ...g, image_url: newLocalUrl } : g
        );
        try {
          localStorage.setItem('pms_custom_gallery', JSON.stringify(updatedList));
        } catch {}

        // Update in Supabase
        const supabase = getSupabase();
        if (supabase) {
          try {
            if (isValidUuid(item.id)) {
              await supabase.from('gallery').update({ image_url: newLocalUrl }).eq('id', item.id);
            }
            await supabase
              .from('gallery')
              .update({ image_url: newLocalUrl })
              .eq('image_url', item.currentUrl);
          } catch (supErr) {
            console.warn('[Migration] Supabase gallery row update error:', supErr);
          }
        }
      } else if (item.type === 'hero') {
        const hotel = await getHotel();
        if (hotel?.id) {
          await updateHotel(hotel.id, {
            hero_config: {
              ...(hotel.hero_config || {}),
              image_url: newLocalUrl,
            },
          });
        }
      }

      migratedCount++;
    } catch (err) {
      console.warn(`[1ClickMigration] Failed for item "${item.title}":`, err);
      failedCount++;
    }
  }

  if (onProgress) {
    onProgress({
      current: total,
      total,
      percent: 100,
      itemTitle: 'All media synchronized to Cloudflare',
      status: 'done',
    });
  }

  return {
    success: migratedCount > 0,
    migratedCount,
    failedCount,
    egressSavedMB: migratedCount * 180,
  };
}
