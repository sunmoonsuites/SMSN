import { getSupabase } from '../lib/supabase';
import { InsightArticle, InsightCategory } from '../types';
import { logAction } from './auditService';
import { isValidUuid, resolveSupabaseHotelId } from './hotelService';

const LOCAL_STORAGE_INSIGHTS_KEY = 'pms_custom_insights_v1';

export const DEFAULT_INSIGHT_ARTICLES: InsightArticle[] = [
  {
    id: 'insight-1',
    hotel_id: 'default-hotel-id',
    title: 'Complete Family & Attendant Stay Guide When Visiting Medanta Hospital Noida',
    slug: 'visiting-medanta-hospital-noida-family-stay-guide',
    category: 'Travel Tips',
    excerpt:
      'Helpful travel tips for patient attendants and outstation families visiting Medanta Hospital Noida, including transport, elevator-accessible rooms, and peaceful accommodation in Sector 117.',
    content: `When traveling to Noida for medical consultations, diagnostic check-ups, or inpatient care at Medanta Hospital Noida, finding a clean, quiet, and dependable hotel nearby helps families focus on their loved ones without daily commuting stress.

## 1. Choosing a Peaceful Location Close to the Hospital Corridor
Central Noida's residential-commercial sectors—especially Sector 117—offer a calm environment away from heavy highway noise while remaining a short 5 to 10 minute drive from Medanta Hospital Noida. Staying at GT-20, Sector 117 allows family members to travel quickly between the hospital and their room at any hour of the day or night.

## 2. Essential Amenities for Patient Attendants & Senior Citizens
Before booking a hotel room near Medanta Hospital Noida, check for practical conveniences that matter during multi-day medical visits:
- Passenger Elevator (Lift) Access: Step-free lift connectivity across all floors makes movement easy for elderly family members.
- 24x7 Front Desk Reception: Hospital schedules can be unpredictable; round-the-clock staff support ensures smooth late-night check-ins or stay extensions.
- 100% Power Backup & Climate Control: Uninterrupted air conditioning, hot water, and high-speed Wi-Fi help attendants rest and stay connected with family and doctors.
- On-Site Parking: Families driving from Uttar Pradesh, Delhi NCR, Haryana, or Uttarakhand benefit from safe, CCTV-monitored parking right outside the hotel.

## 3. Pharmacies, Dining & Metro Transit Nearby
From Sun Moon Suites in Sector 117 Noida, Sector 76 Aqua Line Metro Station and Spectrum Metro Mall (Sector 75) are just 5 minutes away, giving families easy access to pharmacies, ATMs, daily essentials, and hygienic dining options.`,
    cover_image:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
    image_alt:
      'Peaceful guest lounge and reception at Sun Moon Suites hotel in Sector 117 Noida near Medanta Hospital',
    author: 'Sun Moon Suites Editorial Desk',
    read_time: '4 min read',
    tags: ['Medanta Hospital Noida', 'Sector 117 Noida', 'Family Stay Noida', 'Travel Tips'],
    is_published: true,
    is_featured: true,
    published_at: '2026-09-25T10:00:00.000Z',
    created_at: '2026-09-25T10:00:00.000Z',
    updated_at: '2026-09-25T10:00:00.000Z',
  },
  {
    id: 'insight-2',
    hotel_id: 'default-hotel-id',
    title: 'Planning Wedding Guest Accommodation Near Tivoli Lotus Court in Sector 117 Noida',
    slug: 'wedding-guest-accommodation-tivoli-lotus-court-sector-117-noida',
    category: 'Local Events',
    excerpt:
      'Hosting a wedding or celebration at Tivoli Lotus Court Banquet in Noida? Learn how to coordinate comfortable group hotel bookings and 30-room stays in Sector 117.',
    content: `Noida's wedding and festive season brings families together from across India. If you are hosting a ring ceremony, wedding reception, or family milestone at Tivoli Lotus Court in Sector 117 Noida, arranging nearby accommodation for outstation relatives is one of the most important parts of event planning.

## 1. Keep Your Entire Wedding Group Under One Roof
Coordinating cabs between distant hotels and the banquet venue often leads to delays during key wedding rituals. Sun Moon Suites is located at GT-20, Sector 117 Noida—just a 2 to 3 minute drive from Tivoli Lotus Court—allowing guests to move effortlessly between their rooms and the celebration venue.

## 2. How to Allocate 30 Rooms Across 3 Elevator-Connected Floors
With 30 air-conditioned rooms spread across three floors—including Deluxe Rooms, Super Deluxe Rooms, Executive Suites, and multi-guest Family Suites—hosts can reserve dedicated floor blocks so close relatives stay together. Every room offers:
- Spacious mirrors, wardrobe storage, and well-lit interiors for wedding dressing and makeup.
- Full diesel generator power backup so styling appliances, lighting, and AC never face interruptions.
- 24x7 reception desk to welcome guests returning from late-night wedding ceremonies.

## 3. Direct Group Booking Advantages
Booking room blocks directly with Sun Moon Suites in Sector 117 Noida saves third-party OTA commissions, simplifies guest check-in coordination, and provides complimentary on-site parking for family vehicles.`,
    cover_image:
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1000&q=80',
    image_alt:
      'Banquet and wedding event setup at Sun Moon Suites hotel in Sector 117 Noida near Tivoli Lotus Court',
    author: 'Sun Moon Suites Events Team',
    read_time: '3 min read',
    tags: ['Tivoli Lotus Court Noida', 'Wedding Guest Rooms Noida', 'Group Booking Noida', 'Sector 117 Noida'],
    is_published: true,
    is_featured: true,
    published_at: '2026-09-27T09:30:00.000Z',
    created_at: '2026-09-27T09:30:00.000Z',
    updated_at: '2026-09-27T09:30:00.000Z',
  },
  {
    id: 'insight-3',
    hotel_id: 'default-hotel-id',
    title: 'Noida Metro Guide for Business Travelers: Navigating Sector 76 Aqua Line & Sector 51 Blue Line',
    slug: 'noida-metro-sector-76-aqua-blue-line-business-traveler-guide',
    category: 'Noida Guide',
    excerpt:
      'A practical transit guide for corporate travelers staying in Sector 117 Noida, covering Sector 76 Aqua Line Metro, Sector 51 Blue Line interchange, and Spectrum Metro Mall.',
    content: `Whether you are attending trade exhibitions, corporate meetings in Noida's IT corridors, or visiting commercial offices at Spectrum Metro Mall, staying near the central Noida metro interchange saves hours of road traffic.

## 1. Dual Metro Connectivity from Sector 117 Noida
Guests staying at Sun Moon Suites (GT-20, Sector 117, Noida) enjoy quick 5-minute access to two major metro corridors:
- Sector 76 Metro Station (Aqua Line): Connects directly southward toward Noida Sector 137, Sector 142 corporate hubs, Knowledge Park, and India Expo Centre & Mart in Greater Noida.
- Sector 51 / Sector 52 Metro Interchange (Blue Line): Connects directly toward Noida Sector 62, Sector 18 Atta Market, Connaught Place, and New Delhi Railway Station.

## 2. Dining & Shopping at Spectrum Metro Mall (Sector 75)
Located just 5 minutes from Sun Moon Suites, Spectrum Metro Mall in Sector 75 is one of Central Noida's largest commercial high-streets, offering cafés, multi-cuisine restaurants, banking services, and retail stores.

## 3. Work-Ready Boutique Rooms at Sun Moon Suites
After a busy workday in Noida, corporate guests return to quiet, air-conditioned rooms equipped with free high-speed fiber Wi-Fi, ergonomic work desks, tea/coffee makers, and GST-compliant tax invoicing for seamless company reimbursement.`,
    cover_image:
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80',
    image_alt:
      'Executive hotel room with work desk at Sun Moon Suites in Sector 117 Noida near Sector 76 Metro',
    author: 'Sun Moon Suites Editorial Desk',
    read_time: '4 min read',
    tags: ['Sector 76 Metro Station', 'Spectrum Metro Mall Noida', 'Business Hotel Noida', 'Hotel News'],
    is_published: true,
    is_featured: true,
    published_at: '2026-09-29T08:00:00.000Z',
    created_at: '2026-09-29T08:00:00.000Z',
    updated_at: '2026-09-29T08:00:00.000Z',
  },
];

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getLocalInsights(): InsightArticle[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INSIGHTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_INSIGHT_ARTICLES;
}

function saveLocalInsights(items: InsightArticle[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_INSIGHTS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }
}

/**
 * Syncs the insights list into public.hotel_settings.social_links.insights_articles
 * so that even if public.insights table hasn't been created via SQL yet,
 * articles are 100% persisted in Supabase Cloud across all devices.
 */
async function syncInsightsToHotelSettingsBackup(
  resolvedHotelId: string,
  articles: InsightArticle[]
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !resolvedHotelId) return false;

  try {
    const { data: existing } = await supabase
      .from('hotel_settings')
      .select('id, social_links')
      .eq('hotel_id', resolvedHotelId)
      .maybeSingle();

    const currentSocial =
      existing?.social_links && typeof existing.social_links === 'object'
        ? existing.social_links
        : {};

    const updatedSocial = {
      ...currentSocial,
      insights_articles: articles,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from('hotel_settings')
        .update({ social_links: updatedSocial, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return !error;
    } else {
      const { error } = await supabase.from('hotel_settings').insert([
        {
          hotel_id: resolvedHotelId,
          social_links: updatedSocial,
        },
      ]);
      return !error;
    }
  } catch {
    return false;
  }
}

async function readInsightsFromHotelSettingsBackup(
  resolvedHotelId: string
): Promise<InsightArticle[] | null> {
  const supabase = getSupabase();
  if (!supabase || !resolvedHotelId) return null;

  try {
    const { data } = await supabase
      .from('hotel_settings')
      .select('social_links')
      .eq('hotel_id', resolvedHotelId)
      .maybeSingle();

    const backup = (data?.social_links as any)?.insights_articles;
    if (Array.isArray(backup) && backup.length > 0) {
      return backup as InsightArticle[];
    }
  } catch {
    // ignore
  }
  return null;
}

export async function getInsightArticles(
  hotelId: string = 'default-hotel-id',
  onlyPublished: boolean = false
): Promise<InsightArticle[]> {
  const localItems = getLocalInsights();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        // 1. Try dedicated public.insights table first
        const { data, error } = await supabase
          .from('insights')
          .select('*')
          .eq('hotel_id', resolvedHotelId)
          .order('published_at', { ascending: false });

        if (!error && data) {
          if (data.length === 0 && localItems.length > 0) {
            const seedRows = localItems.map((item) => ({
              hotel_id: resolvedHotelId,
              title: item.title,
              slug: item.slug,
              category: item.category,
              excerpt: item.excerpt,
              content: item.content,
              cover_image: item.cover_image,
              image_alt: item.image_alt,
              author: item.author,
              read_time: item.read_time,
              tags: item.tags || [],
              is_published: item.is_published,
              is_featured: item.is_featured,
              published_at: item.published_at || new Date().toISOString(),
            }));
            const { data: seeded } = await supabase.from('insights').insert(seedRows).select('*');
            if (seeded && seeded.length > 0) {
              saveLocalInsights(seeded as InsightArticle[]);
              const list = seeded as InsightArticle[];
              return onlyPublished ? list.filter((a) => a.is_published) : list;
            }
          } else if (data.length > 0) {
            saveLocalInsights(data as InsightArticle[]);
            const list = data as InsightArticle[];
            return onlyPublished ? list.filter((a) => a.is_published) : list;
          }
        }

        // 2. Fallback to Supabase hotel_settings JSONB mirror if public.insights table isn't created yet
        const backupList = await readInsightsFromHotelSettingsBackup(resolvedHotelId);
        if (backupList && backupList.length > 0) {
          saveLocalInsights(backupList);
          return onlyPublished ? backupList.filter((a) => a.is_published) : backupList;
        } else {
          // Seed initial articles into hotel_settings backup so cloud state is initialized
          await syncInsightsToHotelSettingsBackup(resolvedHotelId, localItems);
        }
      }
    } catch (err) {
      console.warn('Using local insights fallback:', err);
    }
  }

  return onlyPublished ? localItems.filter((a) => a.is_published) : localItems;
}

export async function getInsightBySlug(
  slug: string,
  hotelId: string = 'default-hotel-id'
): Promise<InsightArticle | null> {
  const all = await getInsightArticles(hotelId, false);
  const cleanSlug = slug.trim().toLowerCase();
  return all.find((item) => item.slug.toLowerCase() === cleanSlug) || null;
}

export async function saveInsightArticle(
  articleData: Partial<InsightArticle> & {
    hotel_id: string;
    title: string;
    category: InsightCategory;
    excerpt: string;
    content: string;
    cover_image: string;
  }
): Promise<{ success: boolean; data?: InsightArticle; syncedToSupabase: boolean; error?: string }> {
  const now = new Date().toISOString();
  const slug = articleData.slug?.trim() ? slugifyTitle(articleData.slug) : slugifyTitle(articleData.title);
  const imageAlt =
    articleData.image_alt?.trim() ||
    `${articleData.title} — Sun Moon Suites hotel in Sector 117 Noida`;

  const currentList = await getInsightArticles(articleData.hotel_id, false);
  const isEditing = Boolean(articleData.id);

  let savedItem: InsightArticle = {
    id: articleData.id || `insight-${Date.now()}`,
    hotel_id: articleData.hotel_id,
    title: articleData.title.trim(),
    slug,
    category: articleData.category || 'Noida Guide',
    excerpt: articleData.excerpt.trim(),
    content: articleData.content.trim(),
    cover_image: articleData.cover_image.trim(),
    image_alt: imageAlt,
    author: articleData.author?.trim() || 'Sun Moon Suites Editorial Desk',
    read_time: articleData.read_time?.trim() || '4 min read',
    tags:
      articleData.tags && articleData.tags.length > 0
        ? articleData.tags
        : ['Sector 117 Noida', 'Sun Moon Suites Noida'],
    is_published: articleData.is_published !== false,
    is_featured: Boolean(articleData.is_featured),
    published_at: articleData.published_at || now,
    created_at: articleData.created_at || now,
    updated_at: now,
  };

  let syncedToSupabase = false;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(articleData.hotel_id);
      if (resolvedHotelId) {
        savedItem.hotel_id = resolvedHotelId;
        const dbPayload = {
          hotel_id: resolvedHotelId,
          title: savedItem.title,
          slug: savedItem.slug,
          category: savedItem.category,
          excerpt: savedItem.excerpt,
          content: savedItem.content,
          cover_image: savedItem.cover_image,
          image_alt: savedItem.image_alt,
          author: savedItem.author,
          read_time: savedItem.read_time,
          tags: savedItem.tags,
          is_published: savedItem.is_published,
          is_featured: savedItem.is_featured,
          published_at: savedItem.published_at,
          updated_at: now,
        };

        if (isEditing && isValidUuid(savedItem.id)) {
          const { data: updated, error } = await supabase
            .from('insights')
            .update(dbPayload)
            .eq('id', savedItem.id)
            .select('*')
            .single();
          if (!error && updated) {
            savedItem = updated as InsightArticle;
            syncedToSupabase = true;
          }
        } else {
          const { data: inserted, error } = await supabase
            .from('insights')
            .insert([dbPayload])
            .select('*')
            .single();
          if (!error && inserted) {
            savedItem = inserted as InsightArticle;
            syncedToSupabase = true;
          }
        }

        const updatedList = isEditing
          ? currentList.map((item) => (item.id === articleData.id ? savedItem : item))
          : [savedItem, ...currentList.filter((item) => item.slug !== savedItem.slug)];

        saveLocalInsights(updatedList);
        const backupSynced = await syncInsightsToHotelSettingsBackup(resolvedHotelId, updatedList);
        if (backupSynced) {
          syncedToSupabase = true;
        }

        try {
          await logAction(
            resolvedHotelId,
            `${isEditing ? 'Updated' : 'Published'} Insight Article: ${savedItem.title}`,
            'Insights',
            savedItem.id
          );
        } catch {}

        return { success: true, data: savedItem, syncedToSupabase };
      }
    } catch (e) {
      console.warn('Supabase insights save fallback:', e);
    }
  }

  const updatedList = isEditing
    ? currentList.map((item) => (item.id === articleData.id ? savedItem : item))
    : [savedItem, ...currentList.filter((item) => item.slug !== savedItem.slug)];

  saveLocalInsights(updatedList);
  return { success: true, data: savedItem, syncedToSupabase };
}

export async function deleteInsightArticle(
  id: string,
  hotelId: string
): Promise<{ success: boolean }> {
  const currentList = await getInsightArticles(hotelId, false);
  const target = currentList.find((item) => item.id === id);
  const filtered = currentList.filter((item) => item.id !== id);
  saveLocalInsights(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (isValidUuid(id)) {
        await supabase.from('insights').delete().eq('id', id);
      } else if (resolvedHotelId && target?.slug) {
        await supabase
          .from('insights')
          .delete()
          .eq('hotel_id', resolvedHotelId)
          .eq('slug', target.slug);
      }
      if (resolvedHotelId) {
        await syncInsightsToHotelSettingsBackup(resolvedHotelId, filtered);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  return { success: true };
}

/**
 * Compresses an uploaded image file to WebP and uploads to Supabase Storage ('insights' bucket),
 * with automatic fallback to optimized WebP data URL if bucket isn't provisioned yet.
 */
export async function uploadInsightCoverImage(file: File): Promise<string> {
  const compressedBlobAndDataUrl = await new Promise<{ blob: Blob | null; dataUrl: string }>(
    (resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 1100;
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ blob: null, dataUrl: event.target?.result as string });
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/webp', 0.82);
          canvas.toBlob(
            (blob) => {
              resolve({ blob, dataUrl });
            },
            'image/webp',
            0.82
          );
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  );

  const supabase = getSupabase();
  if (supabase && compressedBlobAndDataUrl.blob) {
    try {
      const filePath = `articles/insight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('insights')
        .upload(filePath, compressedBlobAndDataUrl.blob, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage.from('insights').getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch {
      // Fallback to compressed WebP data URL
    }
  }

  return compressedBlobAndDataUrl.dataUrl;
}
