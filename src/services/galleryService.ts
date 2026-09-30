import { getSupabase } from '../lib/supabase';
import { GalleryItem } from '../types';
import { logAction } from './auditService';
import { isValidUuid, resolveSupabaseHotelId } from './hotelService';

const LOCAL_STORAGE_GALLERY_KEY = 'pms_custom_gallery';

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    hotel_id: 'default-hotel-id',
    category: 'Rooms',
    image_url:
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    caption: 'Executive Deluxe Suite with King Bed',
    sort_order: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-2',
    hotel_id: 'default-hotel-id',
    category: 'Hotel & Lobby',
    image_url:
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    caption: 'Grand Reception & Guest Lounge',
    sort_order: 2,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-3',
    hotel_id: 'default-hotel-id',
    category: 'Banquet Hall',
    image_url:
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    caption: 'Ground Floor Banquet Hall for Events',
    sort_order: 3,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-4',
    hotel_id: 'default-hotel-id',
    category: 'Dining',
    image_url:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    caption: 'Multi-Cuisine In-House Restaurant',
    sort_order: 4,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-5',
    hotel_id: 'default-hotel-id',
    category: 'Rooms',
    image_url:
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    caption: 'Spacious Super Deluxe Room',
    sort_order: 5,
    is_featured: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-6',
    hotel_id: 'default-hotel-id',
    category: 'Hotel & Lobby',
    image_url:
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    caption: 'Hotel Exterior & Secure Parking',
    sort_order: 6,
    is_featured: false,
    created_at: new Date().toISOString(),
  },
];

function getStoredGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_GALLERY_ITEMS;
}

function saveStoredGallery(items: GalleryItem[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_GALLERY_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn(e);
  }
}

export async function getGalleryItems(hotelId: string): Promise<GalleryItem[]> {
  const localItems = getStoredGallery();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .eq('hotel_id', resolvedHotelId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        if (!error && data) {
          if (data.length === 0 && localItems.length > 0) {
            // Seed initial gallery photos into Supabase once
            const seedRows = localItems.map((item, idx) => ({
              hotel_id: resolvedHotelId,
              category: item.category || 'Hotel',
              image_url: item.image_url,
              caption: item.caption || '',
              sort_order: item.sort_order ?? idx + 1,
              is_featured: Boolean(item.is_featured),
            }));
            const { data: seeded } = await supabase.from('gallery').insert(seedRows).select('*');
            if (seeded && seeded.length > 0) {
              saveStoredGallery(seeded as GalleryItem[]);
              return seeded as GalleryItem[];
            }
          } else {
            saveStoredGallery(data as GalleryItem[]);
            return data as GalleryItem[];
          }
        }
      }
    } catch (err) {
      console.warn('Using local gallery items:', err);
    }
  }

  return localItems;
}

export async function addGalleryItem(
  itemData: Omit<GalleryItem, 'id' | 'created_at'>
): Promise<{ success: boolean; data?: GalleryItem; error?: string }> {
  let newItem: GalleryItem = {
    id: `gal-${Date.now()}`,
    ...itemData,
    created_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(itemData.hotel_id);
      if (resolvedHotelId) {
        const { data: inserted } = await supabase
          .from('gallery')
          .insert([{ ...itemData, hotel_id: resolvedHotelId }])
          .select('*')
          .single();

        if (inserted) {
          newItem = inserted as GalleryItem;
        }
      }
    } catch (e) {
      console.warn('Supabase gallery insert skipped; stored locally:', e);
    }
  }

  const current = getStoredGallery();
  saveStoredGallery([newItem, ...current]);

  try {
    if (isValidUuid(newItem.hotel_id)) {
      await logAction(
        newItem.hotel_id,
        `Added Image to Gallery (${itemData.category})`,
        'Gallery',
        newItem.id
      );
    }
  } catch {}

  return { success: true, data: newItem };
}

export async function addMultipleGalleryItems(
  itemsData: Omit<GalleryItem, 'id' | 'created_at'>[]
): Promise<{ success: boolean; data?: GalleryItem[]; error?: string }> {
  if (!itemsData || itemsData.length === 0) {
    return { success: true, data: [] };
  }

  const now = Date.now();
  let newItems: GalleryItem[] = itemsData.map((item, idx) => ({
    id: `gal-${now}-${idx}`,
    ...item,
    created_at: new Date().toISOString(),
  }));

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(itemsData[0].hotel_id);
      if (resolvedHotelId) {
        const payload = itemsData.map((item) => ({
          ...item,
          hotel_id: resolvedHotelId,
        }));

        const { data: inserted, error } = await supabase
          .from('gallery')
          .insert(payload)
          .select('*');

        if (!error && inserted && inserted.length > 0) {
          newItems = inserted as GalleryItem[];
        }
      }
    } catch (e) {
      console.warn('Supabase batch gallery insert skipped; stored locally:', e);
    }
  }

  const current = getStoredGallery();
  saveStoredGallery([...newItems, ...current]);

  try {
    if (newItems[0] && isValidUuid(newItems[0].hotel_id)) {
      await logAction(
        newItems[0].hotel_id,
        `Batch Added ${newItems.length} Images to Gallery`,
        'Gallery',
        newItems[0].id
      );
    }
  } catch {}

  return { success: true, data: newItems };
}

export async function deleteGalleryItem(
  id: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredGallery();
  const targetItem = current.find((item) => item.id === id);
  const filtered = current.filter((item) => item.id !== id);
  saveStoredGallery(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (isValidUuid(id)) {
        await supabase.from('gallery').delete().eq('id', id);
      } else if (resolvedHotelId && targetItem?.image_url) {
        await supabase
          .from('gallery')
          .delete()
          .eq('hotel_id', resolvedHotelId)
          .eq('image_url', targetItem.image_url);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
    if (resolvedHotelId) {
      await logAction(resolvedHotelId, `Deleted Gallery Image`, 'Gallery', id);
    }
  } catch {}

  return { success: true };
}

const CATEGORY_SEO_TEMPLATES: Record<string, string[]> = {
  Rooms: [
    'Deluxe AC Room with King Bed at {hotel} in Sector 117 Noida',
    'Super Deluxe Room Interior & Work Desk at {hotel} Sector 117 Noida',
    'Executive Suite Bedroom & Modern Decor at {hotel} Noida',
    'Spacious Family Room Stay near Medanta Hospital at {hotel} Sector 117 Noida',
    'Boutique Hotel Room with LED TV & Wi-Fi at {hotel} Sector 117 Noida',
    'Comfortable Guest Room Interior near Sector 76 Metro at {hotel} Noida',
    'Premium Air-Conditioned Room for Wedding Guests at {hotel} Sector 117 Noida',
    'Clean & Hygienic Attached Bathroom at {hotel} Hotel in Sector 117 Noida',
    'Twin & Double Bed Guest Accommodation at {hotel} Sector 117 Noida',
    'Cozy Boutique Suite near Tivoli Lotus Court at {hotel} Noida',
  ],
  'Banquet Hall': [
    'Ground Floor AC Banquet Hall for Weddings & Events at {hotel} Sector 117 Noida',
    'Celebration & Ring Ceremony Venue Setup at {hotel} in Sector 117 Noida',
    'Corporate Conference & Party Hall near Sector 76 Metro at {hotel} Noida',
    'Intimate Wedding & Reception Hall at {hotel} Boutique Hotel Noida',
    'Decorated Event & Gathering Space at {hotel} in Sector 117 Noida',
  ],
  'Hotel & Lobby': [
    '24x7 Reception Desk & Grand Guest Lobby at {hotel} in Sector 117 Noida',
    'Elevator-Connected Guest Lounge & Waiting Area at {hotel} Sector 117 Noida',
    'Welcoming Boutique Hotel Entrance & Concierge Desk at {hotel} Noida',
    'Spacious Ground Floor Lobby near Medanta Hospital at {hotel} Sector 117 Noida',
    'Modern Corridor & Passenger Lift Access at {hotel} Hotel in Noida',
  ],
  Dining: [
    'In-House Multi-Cuisine Dining & Breakfast Area at {hotel} Sector 117 Noida',
    'Freshly Prepared Hygienic Meals & Room Service at {hotel} in Sector 117 Noida',
    'Comfortable Family Dining Space at {hotel} Boutique Hotel Noida',
    'Buffet & Catering Setup for Guests at {hotel} in Sector 117 Noida',
  ],
  'Exterior & Facade': [
    '{hotel} Boutique Hotel Exterior & On-Site Parking in Sector 117 Noida',
    'Front Facade of {hotel} at GT-20 Sector 117 Noida near Tivoli Lotus Court',
    'Evening Illuminated View & Secure Parking at {hotel} Hotel in Sector 117 Noida',
    'Accessible Main Entrance & Guest Parking at {hotel} Sector 117 Noida',
  ],
};

function isRawOrNonSeoCaption(caption: string): boolean {
  const trimmed = (caption || '').trim();
  if (!trimmed) return true;
  if (/^(img|dsc|pxl|whatsapp|screenshot|image|photo|pic|untitl|file|scan|camera)[_\-\s0-9]/i.test(trimmed)) {
    return true;
  }
  if (/^[0-9a-f]{8,}/i.test(trimmed) || /\.(jpg|jpeg|png|webp|heic|avif)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

export function generateSmartSeoGalleryCaption(
  category: string,
  currentCaption: string,
  categoryIndex: number,
  hotelName: string = 'Sun Moon Suites'
): string {
  const cleanHotel = hotelName.trim() || 'Sun Moon Suites';
  const cleanCurrent = (currentCaption || '')
    .replace(/\.(jpg|jpeg|png|webp|heic|avif)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const templates = CATEGORY_SEO_TEMPLATES[category] || CATEGORY_SEO_TEMPLATES['Rooms'];
  const template = templates[categoryIndex % templates.length].replace(/\{hotel\}/g, cleanHotel);

  // If the current caption is a raw filename or very generic ("Rooms Photo"), use the rich template directly
  if (
    isRawOrNonSeoCaption(currentCaption) ||
    cleanCurrent.length < 10 ||
    cleanCurrent.toLowerCase() === `${category.toLowerCase()} photo` ||
    cleanCurrent.toLowerCase() === category.toLowerCase()
  ) {
    if (categoryIndex >= templates.length) {
      return `${template} (View ${categoryIndex + 1})`;
    }
    return template;
  }

  // If the user already wrote a custom descriptive phrase (e.g., "Executive Deluxe Suite with King Bed")
  // enhance it with location & brand SEO if not already present
  const lower = cleanCurrent.toLowerCase();
  const hasHotel = lower.includes('sun moon');
  const hasSector = lower.includes('sector 117') || lower.includes('noida');

  if (hasHotel && hasSector) {
    return cleanCurrent;
  }
  if (!hasHotel && !hasSector) {
    const suffixes = [
      `at ${cleanHotel} in Sector 117 Noida`,
      `– ${cleanHotel} Boutique Hotel Sector 117 Noida`,
      `at ${cleanHotel} Noida near Medanta Hospital`,
      `at ${cleanHotel} Sector 117 Noida near Sector 76 Metro`,
    ];
    return `${cleanCurrent} ${suffixes[categoryIndex % suffixes.length]}`;
  }
  if (!hasSector) {
    return `${cleanCurrent} in Sector 117 Noida`;
  }
  return `${cleanCurrent} at ${cleanHotel}`;
}

export async function updateGalleryItemCaption(
  id: string,
  hotelId: string,
  caption: string,
  category?: string
): Promise<{ success: boolean }> {
  const cleanCaption = caption.trim();
  const current = getStoredGallery();
  const targetItem = current.find((item) => item.id === id);

  const updatedList = current.map((item) =>
    item.id === id
      ? {
          ...item,
          caption: cleanCaption,
          ...(category ? { category } : {}),
        }
      : item
  );
  saveStoredGallery(updatedList);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      const updatePayload: Record<string, unknown> = { caption: cleanCaption };
      if (category) updatePayload.category = category;

      if (isValidUuid(id)) {
        await supabase.from('gallery').update(updatePayload).eq('id', id);
      } else if (resolvedHotelId && targetItem?.image_url) {
        await supabase
          .from('gallery')
          .update(updatePayload)
          .eq('hotel_id', resolvedHotelId)
          .eq('image_url', targetItem.image_url);
      }
    } catch (e) {
      console.warn('Supabase gallery caption update skipped:', e);
    }
  }

  return { success: true };
}

export async function aiOptimizeAllGalleryCaptions(
  hotelId: string,
  hotelName: string = 'Sun Moon Suites',
  address: string = 'GT-20, Sector 117',
  city: string = 'Noida'
): Promise<{
  success: boolean;
  updatedCount: number;
  items: GalleryItem[];
  usedGemini: boolean;
}> {
  const current = await getGalleryItems(hotelId);
  if (!current || current.length === 0) {
    return { success: true, updatedCount: 0, items: [], usedGemini: false };
  }

  let aiMap = new Map<string, string>();
  let usedGemini = false;

  // 1. Try Server-Side Gemini AI Optimizer first
  try {
    const response = await fetch('/api/gallery/ai-seo-optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelName,
        address,
        city,
        items: current.map((item, idx) => ({
          id: item.id,
          category: item.category || 'Rooms',
          currentCaption: item.caption || '',
          index: idx + 1,
        })),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data?.optimized) && data.optimized.length > 0) {
        usedGemini = true;
        for (const entry of data.optimized) {
          if (entry?.id && typeof entry?.seoCaption === 'string' && entry.seoCaption.trim()) {
            aiMap.set(entry.id, entry.seoCaption.trim());
          }
        }
      }
    }
  } catch {
    // Fallback to built-in Local SEO engine if server route is unreachable (e.g. static hosting)
  }

  // 2. Build final SEO captions for every photo (using Gemini result or smart category-aware SEO generator)
  const categoryCounters: Record<string, number> = {};
  const optimizedItems: GalleryItem[] = current.map((item) => {
    const cat = item.category || 'Rooms';
    const catIdx = categoryCounters[cat] || 0;
    categoryCounters[cat] = catIdx + 1;

    const fromGemini = aiMap.get(item.id);
    const finalCaption =
      fromGemini || generateSmartSeoGalleryCaption(cat, item.caption || '', catIdx, hotelName);

    return {
      ...item,
      caption: finalCaption,
    };
  });

  // 3. Save locally immediately
  saveStoredGallery(optimizedItems);

  // 4. Persist all updated captions to Supabase public.gallery table
  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      await Promise.all(
        optimizedItems.map(async (item) => {
          if (isValidUuid(item.id)) {
            await supabase
              .from('gallery')
              .update({ caption: item.caption })
              .eq('id', item.id);
          } else if (resolvedHotelId && item.image_url) {
            await supabase
              .from('gallery')
              .update({ caption: item.caption })
              .eq('hotel_id', resolvedHotelId)
              .eq('image_url', item.image_url);
          }
        })
      );

      if (resolvedHotelId) {
        await logAction(
          resolvedHotelId,
          `AI Optimized SEO Captions for ${optimizedItems.length} Gallery Photos`,
          'Gallery',
          resolvedHotelId
        );
      }
    } catch (e) {
      console.warn('Supabase batch gallery caption sync error:', e);
    }
  }

  return {
    success: true,
    updatedCount: optimizedItems.length,
    items: optimizedItems,
    usedGemini,
  };
}

