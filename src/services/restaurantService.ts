import { getSupabase } from '../lib/supabase';
import { RestaurantCategory, RestaurantItem } from '../types';
import { logAction } from './auditService';

export const DEFAULT_RESTAURANT_CATEGORIES: RestaurantCategory[] = [
  { id: 'rcat-1', hotel_id: 'default-hotel-id', name: 'Breakfast', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 'rcat-2', hotel_id: 'default-hotel-id', name: 'Starters & Quick Bites', sort_order: 2, is_active: true, created_at: new Date().toISOString() },
  { id: 'rcat-3', hotel_id: 'default-hotel-id', name: 'Main Course', sort_order: 3, is_active: true, created_at: new Date().toISOString() },
  { id: 'rcat-4', hotel_id: 'default-hotel-id', name: 'Breads & Rice', sort_order: 4, is_active: true, created_at: new Date().toISOString() },
  { id: 'rcat-5', hotel_id: 'default-hotel-id', name: 'Beverages & Desserts', sort_order: 5, is_active: true, created_at: new Date().toISOString() },
];

export const DEFAULT_RESTAURANT_ITEMS: RestaurantItem[] = [
  {
    id: 'ritem-1',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-1',
    category: DEFAULT_RESTAURANT_CATEGORIES[0],
    name: 'Masala Omelette with Toasted Bread',
    description: 'Farm-fresh eggs cooked with chopped onions, tomatoes, and green chilies, served with buttered toast.',
    price: 180,
    is_veg: false,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ritem-2',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-1',
    category: DEFAULT_RESTAURANT_CATEGORIES[0],
    name: 'Aloo Paratha with Curd & Pickle',
    description: 'Crispy whole wheat bread stuffed with spiced mashed potatoes, served with fresh churned curd and butter.',
    price: 160,
    is_veg: true,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ritem-3',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-2',
    category: DEFAULT_RESTAURANT_CATEGORIES[1],
    name: 'Tandoori Paneer Tikka',
    description: 'Cubes of cottage cheese marinated in hung curd, Kashmiri chilies, and ground spices, roasted in clay tandoor.',
    price: 290,
    is_veg: true,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ritem-4',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-3',
    category: DEFAULT_RESTAURANT_CATEGORIES[2],
    name: 'Dal Makhani Sun Moon Special',
    description: 'Slow-simmered black lentils and kidney beans cooked overnight with butter, fresh cream, and aromatic spices.',
    price: 260,
    is_veg: true,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ritem-5',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-3',
    category: DEFAULT_RESTAURANT_CATEGORIES[2],
    name: 'Paneer Butter Masala',
    description: 'Fresh cottage cheese cooked in a rich tomato and cashew nut gravy with aromatic kasuri methi.',
    price: 310,
    is_veg: true,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ritem-6',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-4',
    category: DEFAULT_RESTAURANT_CATEGORIES[3],
    name: 'Butter Naan & Garlic Naan Basket',
    description: 'Freshly baked tandoori leavened flatbreads brushed with clarified butter and roasted garlic.',
    price: 90,
    is_veg: true,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ritem-7',
    hotel_id: 'default-hotel-id',
    category_id: 'rcat-5',
    category: DEFAULT_RESTAURANT_CATEGORIES[4],
    name: 'Special Masala Chai & Cookies',
    description: 'Brewed with crushed ginger, cardamom, cinnamon, and full cream milk.',
    price: 60,
    is_veg: true,
    is_available: true,
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getRestaurantCategories(hotelId: string, activeOnly: boolean = false): Promise<RestaurantCategory[]> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_RESTAURANT_CATEGORIES;

  try {
    let query = supabase.from('restaurant_categories').select('*').eq('hotel_id', hotelId).order('sort_order', { ascending: true });
    if (activeOnly) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) return data as RestaurantCategory[];
    return DEFAULT_RESTAURANT_CATEGORIES;
  } catch (err) {
    console.warn('Using default restaurant categories (DB pending or empty):', err);
    return DEFAULT_RESTAURANT_CATEGORIES;
  }
}

export async function createRestaurantCategory(
  hotelId: string,
  name: string,
  sortOrder: number = 0
): Promise<{ success: boolean; data?: RestaurantCategory; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database configuration required' };

  try {
    const { data, error } = await supabase
      .from('restaurant_categories')
      .insert([{ hotel_id: hotelId, name: name.trim(), sort_order: sortOrder }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data: data as RestaurantCategory };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getRestaurantItems(hotelId: string, availableOnly: boolean = false): Promise<RestaurantItem[]> {
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_RESTAURANT_ITEMS;

  try {
    let query = supabase
      .from('restaurant_items')
      .select('*, category:restaurant_categories(*)')
      .eq('hotel_id', hotelId)
      .order('name', { ascending: true });

    if (availableOnly) query = query.eq('is_available', true);
    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) return data as RestaurantItem[];
    return DEFAULT_RESTAURANT_ITEMS;
  } catch (err) {
    console.warn('Using default restaurant items (DB pending or empty):', err);
    return DEFAULT_RESTAURANT_ITEMS;
  }
}

export async function createRestaurantItem(
  itemData: Omit<RestaurantItem, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: RestaurantItem; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database configuration required' };

  try {
    const { data, error } = await supabase
      .from('restaurant_items')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;
    await logAction(itemData.hotel_id, `Added Menu Item: ${itemData.name}`, 'Restaurant', data.id);
    return { success: true, data: data as RestaurantItem };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateRestaurantItem(
  id: string,
  hotelId: string,
  updates: Partial<RestaurantItem>
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database configuration required' };

  try {
    const { error } = await supabase.from('restaurant_items').update(updates).eq('id', id);
    if (error) throw error;
    await logAction(hotelId, `Updated Menu Item`, 'Restaurant', id, updates);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteRestaurantItem(id: string, hotelId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database configuration required' };

  try {
    const { error } = await supabase.from('restaurant_items').delete().eq('id', id);
    if (error) throw error;
    await logAction(hotelId, `Deleted Menu Item`, 'Restaurant', id);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
