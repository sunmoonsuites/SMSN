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
