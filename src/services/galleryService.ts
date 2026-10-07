import { getSupabase } from '../lib/supabase';
import { GalleryItem, RoomCategory } from '../types';
import { logAction } from './auditService';
import { isValidUuid, resolveSupabaseHotelId } from './hotelService';

const LOCAL_STORAGE_GALLERY_KEY = 'pms_custom_gallery';

export const ROOM_GALLERY_CATEGORIES = [
  'Standard Room',
  'Deluxe Room',
  'Super Deluxe Room',
  'Suite Room',
] as const;

export const ALL_GALLERY_CATEGORIES = [
  'Standard Room',
  'Deluxe Room',
  'Super Deluxe Room',
  'Suite Room',
  'Rooms',
  'Banquet Hall',
  'Hotel & Lobby',
  'Dining',
  'Exterior & Facade',
] as const;

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    hotel_id: 'default-hotel-id',
    category: 'Standard Room',
    image_url: '/assets/mirrored/rooms-standard-room-muxpex8w.webp',
    caption: 'Standard AC Room with Queen Bed at Sun Moon Suites in Sector 117 Noida',
    sort_order: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-2',
    hotel_id: 'default-hotel-id',
    category: 'Deluxe Room',
    image_url: '/assets/mirrored/rooms-deluxe-room-muxpexhe.webp',
    caption: 'Deluxe Room with King Bed & Work Desk at Sun Moon Suites Sector 117 Noida',
    sort_order: 2,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-3',
    hotel_id: 'default-hotel-id',
    category: 'Super Deluxe Room',
    image_url: '/assets/mirrored/rooms-super-deluxe-room-muxpexke.webp',
    caption: 'Super Deluxe Room Interior & Seating Area at Sun Moon Suites Sector 117 Noida',
    sort_order: 3,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-4',
    hotel_id: 'default-hotel-id',
    category: 'Suite Room',
    image_url: '/assets/mirrored/rooms-suite-room-muxpexmf.webp',
    caption: 'Spacious Suite Room with Living Area at Sun Moon Suites in Sector 117 Noida',
    sort_order: 4,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-5',
    hotel_id: 'default-hotel-id',
    category: 'Banquet Hall',
    image_url: '/assets/mirrored/banquet-banquet-hall-muxpexo9.webp',
    caption: 'Ground Floor Banquet Hall for Events at Sun Moon Suites Sector 117 Noida',
    sort_order: 5,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-6',
    hotel_id: 'default-hotel-id',
    category: 'Hotel & Lobby',
    image_url: '/assets/mirrored/lobby-hotel-lobby-muxpexqc.webp',
    caption: 'Sun Moon Suites Hotel Exterior & Secure Parking in Sector 117 Noida',
    sort_order: 6,
    is_featured: false,
    created_at: new Date().toISOString(),
  },
];

export function getStoredGallery(): GalleryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_GALLERY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
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
  saveStoredGallery([...current, newItem]);

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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hotel_data_updated'));
  }

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
  saveStoredGallery([...current, ...newItems]);

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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hotel_data_updated'));
  }

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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hotel_data_updated'));
  }

  return { success: true };
}

const CATEGORY_SEO_TEMPLATES: Record<string, string[]> = {
  'Standard Room': [
    'Standard AC Room with Queen Bed — Cozy & Well-Equipped Guest Room at {hotel} Sector 117 Noida',
    'Standard Room Interior & Wi-Fi — Comfortable Stay near Sector 76 Metro at {hotel} Noida',
    'Standard Room Guest Bedroom — Clean Air-Conditioned Room at {hotel} in Sector 117 Noida',
    'Standard Room Accommodation — Affordable Boutique Stay near Medanta Hospital at {hotel} Noida',
    'Standard Room with Smart LED TV — Modern Amenities at {hotel} Sector 117 Noida',
  ],
  'Deluxe Room': [
    'Deluxe AC Room with King Bed — Spacious Bedroom & Modern Decor at {hotel} Sector 117 Noida',
    'Deluxe Room Interior & Work Desk — Business & Family Stay at {hotel} Sector 117 Noida',
    'Deluxe Room with Tufted Headboard — Comfortable Stay near Medanta Hospital at {hotel} Noida',
    'Deluxe Guest Room & Curtains — Premium Bedding & High-Speed Wi-Fi at {hotel} Sector 117 Noida',
    'Boutique Deluxe Room — Elegant Guest Accommodation at {hotel} Sector 117 Noida',
  ],
  'Super Deluxe Room': [
    'Super Deluxe Room & Seating Area — King Bed & Luxury Interiors at {hotel} Sector 117 Noida',
    'Super Deluxe Room Interior — Premium Stay near Tivoli Lotus Court at {hotel} Noida',
    'Spacious Super Deluxe Room — Ideal for Families & Corporate Guests at {hotel} Sector 117 Noida',
    'Super Deluxe Bedroom & Wardrobe — Elegant Decor & LED TV at {hotel} Sector 117 Noida',
    'Super Deluxe AC Guest Room — Near Sector 76 Metro Station at {hotel} Sector 117 Noida',
  ],
  'Suite Room': [
    'Luxury Suite Room & Lounge — Super King Bed & Living Space at {hotel} Sector 117 Noida',
    'Executive & Family Suite Room — Spacious Multi-Guest Stay at {hotel} in Sector 117 Noida',
    'Premium Suite Room Interior — Ideal for Wedding Guests near Tivoli Lotus Court at {hotel} Noida',
    'Suite Room Master Bedroom — Plush Seating & Modern Furnishings at {hotel} Sector 117 Noida',
    'Boutique Suite Accommodation — Luxury Stay at {hotel} Hotel Sector 117 Noida',
  ],
  Rooms: [
    'Deluxe AC Room with King Bed — Comfortable Guest Bedroom at {hotel} in Sector 117 Noida',
    'Super Deluxe Room Interior — King Bed & Work Desk at {hotel} Sector 117 Noida',
    'Suite Room Master Bedroom — Modern Decor & Plush Bedding at {hotel} Sector 117 Noida',
    'Standard AC Room Stay — Cozy Guest Room near Medanta Hospital at {hotel} Sector 117 Noida',
    'Boutique Hotel Bedroom — LED TV, Wi-Fi & Air Conditioning at {hotel} Sector 117 Noida',
    'Comfortable Guest Room Interior — Near Sector 76 Metro at {hotel} Sector 117 Noida',
    'Premium Air-Conditioned Guest Room — Ideal for Wedding Guests at {hotel} Sector 117 Noida',
    'Twin & Double Bed Guest Room — Spacious Stay at {hotel} Hotel in Sector 117 Noida',
  ],
  'Banquet Hall': [
    'Ground Floor AC Banquet Hall — Wedding & Event Venue at {hotel} Sector 117 Noida',
    'Celebration & Ring Ceremony Hall — Decorated Event Space at {hotel} in Sector 117 Noida',
    'Corporate Conference & Party Hall — Near Sector 76 Metro at {hotel} Sector 117 Noida',
    'Intimate Wedding & Reception Venue — Ground Floor Hall at {hotel} Boutique Hotel Noida',
    'Indoor Event & Gathering Space — Custom Catering & Decor at {hotel} Sector 117 Noida',
  ],
  'Hotel & Lobby': [
    '24x7 Reception Desk & Front Lobby — Welcoming Guest Check-In at {hotel} Sector 117 Noida',
    'Lobby Guest Waiting Sofa Lounge — Comfortable Seating Area at {hotel} Sector 117 Noida',
    'Hotel Entrance & Concierge Desk — Ground Floor Reception at {hotel} in Sector 117 Noida',
    'Reception Lobby & Staircase Interior — Modern Boutique Design at {hotel} Sector 117 Noida',
    'Guest Floor Corridor & Elevator Access — Clean Well-Lit Hallway at {hotel} Sector 117 Noida',
  ],
  Dining: [
    'In-House Multi-Cuisine Dining — Freshly Prepared Meals at {hotel} Sector 117 Noida',
    'Hygienic Dining & Breakfast Area — Room Service & Catering at {hotel} in Sector 117 Noida',
    'Comfortable Family Dining Space — Delicious Hospitality at {hotel} Boutique Hotel Noida',
    'Buffet & Event Catering Setup — Fresh Food Service at {hotel} Sector 117 Noida',
  ],
  'Exterior & Facade': [
    'Hotel Front Facade & Exterior — {hotel} Building at GT-20 Sector 117 Noida',
    'Main Entrance & On-Site Parking — {hotel} Boutique Hotel in Sector 117 Noida',
    'Exterior Building View & Gate — {hotel} near Tivoli Lotus Court Sector 117 Noida',
    'Accessible Entrance Ramp & Facade — {hotel} Hotel in Sector 117 Noida',
  ],
};

function isRawOrNonSeoCaption(caption: string): boolean {
  const trimmed = (caption || '').trim();
  if (!trimmed) return true;
  if (/^(img|dsc|pxl|whatsapp|screenshot|image|photo|pic|untitl|file|scan|camera|r\d|w\d)[_\-\s0-9]/i.test(trimmed)) {
    return true;
  }
  if (/^[0-9a-f]{8,}/i.test(trimmed) || /\.(jpg|jpeg|png|webp|heic|avif)$/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Inspects the filename/URL when offline or before Vision completes so obvious
 * washroom (`w1.jpg`), gate (`main-gate`), reception (`reception`), or room (`r1.jpg`)
 * filenames never get mismatched categories or captions.
 */
export function inferCategoryAndHintFromUrl(
  imageUrl: string,
  fallbackCategory: string = 'Rooms'
): { category: string; specificTemplate?: string } {
  const filePart = ((imageUrl || '').split('/').pop() || '').toLowerCase();

  if (/(main[-_]?gate|facade|exterior|building|front[-_]?view|parking)/i.test(filePart)) {
    return {
      category: 'Exterior & Facade',
      specificTemplate:
        'Hotel Front Facade & Main Entrance — {hotel} Building in Sector 117 Noida',
    };
  }
  if (/(reception|lobby|lounge|corridor|hallway|passage|stairs|lift|elevator)/i.test(filePart)) {
    return {
      category: 'Hotel & Lobby',
      specificTemplate:
        '24x7 Reception Desk & Guest Lobby — Welcoming Interior at {hotel} Sector 117 Noida',
    };
  }
  if (/(banquet|event|party|wedding|conference)/i.test(filePart)) {
    return {
      category: 'Banquet Hall',
      specificTemplate:
        'Ground Floor AC Banquet & Event Hall — Celebration Venue at {hotel} Sector 117 Noida',
    };
  }
  if (/(dining|restaurant|food|breakfast|kitchen|buffet)/i.test(filePart)) {
    return {
      category: 'Dining',
      specificTemplate:
        'In-House Dining & Breakfast Area — Fresh Hygienic Meals at {hotel} Sector 117 Noida',
    };
  }
  if (/(?:^|[-_])w\d+(?:[-_.]|$)|washroom|bathroom|toilet|bath/i.test(filePart)) {
    const cat =
      fallbackCategory && fallbackCategory !== 'Rooms' ? fallbackCategory : 'Deluxe Room';
    return {
      category: cat,
      specificTemplate:
        'Attached Modern Bathroom & Washroom — Clean Hygienic Fittings at {hotel} Sector 117 Noida',
    };
  }
  return { category: fallbackCategory || 'Rooms' };
}

export function generateSmartSeoGalleryCaption(
  category: string,
  currentCaption: string,
  categoryIndex: number,
  hotelName: string = 'Sun Moon Suites',
  imageUrl: string = ''
): string {
  const cleanHotel = hotelName.trim() || 'Sun Moon Suites';
  const inferred = inferCategoryAndHintFromUrl(imageUrl || currentCaption, category);
  const effectiveCategory = inferred.category || category || 'Rooms';

  if (inferred.specificTemplate) {
    const base = inferred.specificTemplate.replace(/\{hotel\}/g, cleanHotel);
    return categoryIndex > 0 ? `${base} (View ${categoryIndex + 1})` : base;
  }

  const cleanCurrent = (currentCaption || '')
    .replace(/\.(jpg|jpeg|png|webp|heic|avif)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  const templates =
    CATEGORY_SEO_TEMPLATES[effectiveCategory] || CATEGORY_SEO_TEMPLATES['Rooms'];
  const template = templates[categoryIndex % templates.length].replace(/\{hotel\}/g, cleanHotel);

  if (
    isRawOrNonSeoCaption(currentCaption) ||
    cleanCurrent.length < 10 ||
    cleanCurrent.toLowerCase() === `${effectiveCategory.toLowerCase()} photo` ||
    cleanCurrent.toLowerCase() === effectiveCategory.toLowerCase()
  ) {
    if (categoryIndex >= templates.length) {
      return `${template} (View ${categoryIndex + 1})`;
    }
    return template;
  }

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

export function normalizeRoomCategoryName(name?: string | null): string {
  const raw = (name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (
    raw === 'suites room' ||
    raw === 'suite rooms' ||
    raw === 'suites rooms' ||
    raw === 'suite' ||
    raw === 'suites'
  ) {
    return 'suite room';
  }
  if (raw === 'super deluxe rooms' || raw === 'super deluxe') {
    return 'super deluxe room';
  }
  if (raw === 'deluxe rooms' || raw === 'deluxe') {
    return 'deluxe room';
  }
  if (raw === 'standard rooms' || raw === 'standard') {
    return 'standard room';
  }
  return raw;
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
    item.id === id || (targetItem?.image_url && item.image_url === targetItem.image_url)
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
      }
      if (targetItem?.image_url) {
        // Also keep any duplicate rows for the same image_url in sync
        await supabase
          .from('gallery')
          .update(updatePayload)
          .eq('image_url', targetItem.image_url);
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

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hotel_data_updated'));
  }

  return { success: true };
}

export async function reorderGalleryItemsInCategory(
  hotelId: string,
  targetId: string,
  action: 'first' | 'prev' | 'next'
): Promise<{ success: boolean; items: GalleryItem[] }> {
  const current = await getGalleryItems(hotelId);
  const target = current.find((i) => i.id === targetId);
  if (!target) {
    return { success: false, items: current };
  }

  const catNorm = normalizeRoomCategoryName(target.category);
  const sameCatIndices: number[] = [];
  current.forEach((item, idx) => {
    if (normalizeRoomCategoryName(item.category) === catNorm) {
      sameCatIndices.push(idx);
    }
  });

  const posInCat = sameCatIndices.findIndex((globalIdx) => current[globalIdx].id === targetId);
  if (posInCat === -1) {
    return { success: false, items: current };
  }

  const catItems = sameCatIndices.map((idx) => current[idx]);
  if (action === 'first' && posInCat > 0) {
    const [moved] = catItems.splice(posInCat, 1);
    catItems.unshift(moved);
  } else if (action === 'prev' && posInCat > 0) {
    const temp = catItems[posInCat - 1];
    catItems[posInCat - 1] = catItems[posInCat];
    catItems[posInCat] = temp;
  } else if (action === 'next' && posInCat < catItems.length - 1) {
    const temp = catItems[posInCat + 1];
    catItems[posInCat + 1] = catItems[posInCat];
    catItems[posInCat] = temp;
  } else {
    return { success: true, items: current };
  }

  // Reassign updated positions back into full gallery array and normalize sort_order
  const nextAll = [...current];
  sameCatIndices.forEach((globalIdx, i) => {
    nextAll[globalIdx] = catItems[i];
  });

  const reindexed = nextAll.map((item, idx) => ({
    ...item,
    sort_order: idx + 1,
  }));

  saveStoredGallery(reindexed);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await Promise.all(
        sameCatIndices.map(async (globalIdx) => {
          const updatedItem = reindexed[globalIdx];
          if (isValidUuid(updatedItem.id)) {
            await supabase
              .from('gallery')
              .update({ sort_order: updatedItem.sort_order })
              .eq('id', updatedItem.id);
          }
        })
      );
    } catch (e) {
      console.warn('Supabase gallery reorder error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hotel_data_updated'));
  }

  return { success: true, items: reindexed };
}

export async function aiOptimizeAllGalleryCaptions(
  hotelId: string,
  hotelName: string = 'Sun Moon Suites',
  address: string = 'GT-20, Sector 117',
  city: string = 'Noida',
  onProgress?: (completed: number, total: number) => void
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

  const aiMap = new Map<string, { category: string; seoCaption: string }>();
  let usedGemini = false;

  // 1. Send photos in batches of 4 to Server-Side Gemini Vision Optimizer (/api/gallery/ai-seo-optimize)
  const BATCH_SIZE = 4;
  const total = current.length;
  if (onProgress) onProgress(0, total);

  for (let i = 0; i < current.length; i += BATCH_SIZE) {
    const slice = current.slice(i, i + BATCH_SIZE);
    try {
      const response = await fetch('/api/gallery/ai-seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelName,
          address,
          city,
          items: slice.map((item, idx) => ({
            id: item.id,
            image_url: item.image_url,
            category: item.category || 'Rooms',
            currentCaption: item.caption || '',
            index: i + idx + 1,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data?.optimized) && data.optimized.length > 0) {
          usedGemini = true;
          for (const entry of data.optimized) {
            if (entry?.id && typeof entry?.seoCaption === 'string' && entry.seoCaption.trim()) {
              aiMap.set(entry.id, {
                category: (entry.category || '').trim(),
                seoCaption: entry.seoCaption.trim(),
              });
            }
          }
        }
      }
    } catch {
      // Continue to next batch / fallback if offline
    }
    if (onProgress) {
      onProgress(Math.min(i + slice.length, total), total);
    }
  }

  // 2. Build final SEO Caption for every photo while strictly preserving user-sorted categories
  const categoryCounters: Record<string, number> = {};
  const optimizedItems: GalleryItem[] = current.map((item) => {
    const fromGemini = aiMap.get(item.id);
    const existingCat = (item.category || '').trim();
    const hasSpecificUserCategory = existingCat !== '' && existingCat !== 'Rooms';
    const inferred = inferCategoryAndHintFromUrl(item.image_url, existingCat || 'Rooms');
    const finalCategory = hasSpecificUserCategory
      ? existingCat
      : fromGemini?.category || inferred.category || existingCat || 'Rooms';

    const catIdx = categoryCounters[finalCategory] || 0;
    categoryCounters[finalCategory] = catIdx + 1;

    const finalCaption =
      fromGemini?.seoCaption ||
      generateSmartSeoGalleryCaption(
        finalCategory,
        '',
        catIdx,
        hotelName,
        item.image_url
      );

    return {
      ...item,
      category: finalCategory,
      caption: finalCaption,
    };
  });

  // 3. Save locally immediately
  saveStoredGallery(optimizedItems);

  // 4. Persist updated captions to Supabase public.gallery table
  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      await Promise.all(
        optimizedItems.map(async (item) => {
          const updatePayload = {
            caption: item.caption,
            category: item.category,
          };
          if (isValidUuid(item.id)) {
            await supabase.from('gallery').update(updatePayload).eq('id', item.id);
          }
        })
      );

      if (resolvedHotelId) {
        await logAction(
          resolvedHotelId,
          `AI Vision Optimized SEO Captions for ${optimizedItems.length} Gallery Photos`,
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

/**
 * Returns all photos belonging ONLY to a specific Room Category:
 * Strictly prioritizes the user's sorted Gallery photos (`galleryItems` whose
 * normalized `category` matches `cat.name`, ordered by `sort_order` ascending).
 * Never mixes in stale `cat.images` that were moved to a different category in Gallery
 * or default Unsplash placeholders when Gallery photos exist for this room category.
 */
export function getPhotosForRoomCategory(
  cat: RoomCategory,
  galleryItems: GalleryItem[],
  hotelName: string = 'Sun Moon Suites'
): { url: string; caption: string }[] {
  const seenUrls = new Set<string>();
  const result: { url: string; caption: string }[] = [];

  const normCatName = normalizeRoomCategoryName(cat.name);

  // 1. Primary Source of Truth: Photos sorted into this Room Category in the Website Gallery
  const matchingGallery = galleryItems
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(
      ({ item }) =>
        Boolean(item.image_url) &&
        normalizeRoomCategoryName(item.category) === normCatName
    )
    .sort((a, b) => {
      const sortA = a.item.sort_order ?? 9999;
      const sortB = b.item.sort_order ?? 9999;
      if (sortA !== sortB) return sortA - sortB;
      return a.originalIndex - b.originalIndex;
    });

  if (matchingGallery.length > 0) {
    matchingGallery.forEach(({ item }, idx) => {
      const cleanUrl = (item.image_url || '').trim();
      if (cleanUrl && !seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        result.push({
          url: cleanUrl,
          caption:
            item.caption ||
            generateSmartSeoGalleryCaption(cat.name, '', idx, hotelName, cleanUrl),
        });
      }
    });
    return result;
  }

  // 2. Fallback ONLY if no photos exist in Gallery for this Room Category:
  // Use `cat.images`, excluding any photo that belongs to a DIFFERENT category in Gallery
  const galleryCategoryByUrl = new Map<string, string>();
  const galleryCaptionMap = new Map<string, string>();
  for (const g of galleryItems) {
    if (g.image_url) {
      galleryCategoryByUrl.set(g.image_url.trim(), normalizeRoomCategoryName(g.category));
      if (g.caption) {
        galleryCaptionMap.set(g.image_url.trim(), g.caption);
      }
    }
  }

  if (Array.isArray(cat.images)) {
    cat.images.forEach((url, idx) => {
      const cleanUrl = (url || '').trim();
      if (!cleanUrl || seenUrls.has(cleanUrl)) return;
      const existingGalCat = galleryCategoryByUrl.get(cleanUrl);
      // Do not show a photo if the user sorted it into a different category in Gallery
      if (existingGalCat && existingGalCat !== normCatName) return;

      seenUrls.add(cleanUrl);
      result.push({
        url: cleanUrl,
        caption:
          galleryCaptionMap.get(cleanUrl) ||
          generateSmartSeoGalleryCaption(cat.name, '', idx, hotelName, cleanUrl),
      });
    });
  }

  return result;
}


