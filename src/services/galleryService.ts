import { getSupabase } from '../lib/supabase';
import { GalleryItem } from '../types';
import { logAction } from './auditService';

const LOCAL_STORAGE_GALLERY_KEY = 'pms_custom_gallery';

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    hotel_id: 'default-hotel-id',
    category: 'Rooms',
    image_url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    caption: 'Executive Deluxe Suite with King Bed',
    sort_order: 1,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-2',
    hotel_id: 'default-hotel-id',
    category: 'Hotel & Lobby',
    image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    caption: 'Grand Reception & Guest Lounge',
    sort_order: 2,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-3',
    hotel_id: 'default-hotel-id',
    category: 'Banquet Hall',
    image_url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
    caption: 'Ground Floor Banquet Hall for Events',
    sort_order: 3,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-4',
    hotel_id: 'default-hotel-id',
    category: 'Dining',
    image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    caption: 'Multi-Cuisine In-House Restaurant',
    sort_order: 4,
    is_featured: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-5',
    hotel_id: 'default-hotel-id',
    category: 'Rooms',
    image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    caption: 'Spacious Super Deluxe Room',
    sort_order: 5,
    is_featured: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gal-6',
    hotel_id: 'default-hotel-id',
    category: 'Hotel & Lobby',
    image_url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
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
      const { data, error } = await supabase
        .from('gallery')
        .select('*')
        .eq('hotel_id', hotelId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data as GalleryItem[];
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
  const newItem: GalleryItem = {
    id: `gal-${Date.now()}`,
    ...itemData,
    created_at: new Date().toISOString(),
  };

  const current = getStoredGallery();
  saveStoredGallery([newItem, ...current]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('gallery').insert([itemData]);
    } catch (e) {
      console.warn('Supabase gallery insert skipped; stored locally:', e);
    }
  }

  try {
    await logAction(itemData.hotel_id, `Added Image to Gallery (${itemData.category})`, 'Gallery', newItem.id);
  } catch {}

  return { success: true, data: newItem };
}

export async function deleteGalleryItem(id: string, hotelId: string): Promise<{ success: boolean; error?: string }> {
  const current = getStoredGallery();
  const filtered = current.filter((item) => item.id !== id);
  saveStoredGallery(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('gallery').delete().eq('id', id);
    } catch (e) {
      console.warn(e);
    }
  }

  try {
    await logAction(hotelId, `Deleted Gallery Image`, 'Gallery', id);
  } catch {}

  return { success: true };
}
