import { getSupabase } from '../lib/supabase';
import { Room, RoomCategory, RoomStatus } from '../types';
import { logAction } from './auditService';
import { emitPMSNotification } from './notificationService';

const LOCAL_STORAGE_CATEGORIES_KEY = 'pms_custom_room_categories';
const LOCAL_STORAGE_ROOMS_KEY = 'pms_custom_rooms';

export const DEFAULT_ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: 'cat-std-01',
    hotel_id: 'default-hotel-id',
    name: 'Standard Room',
    slug: 'standard-room',
    description: 'Comfortable room with essential amenities, queen bed, and fast Wi-Fi.',
    base_price: 1500,
    max_adults: 2,
    max_children: 1,
    room_size_sqft: 200,
    bed_type: 'Queen Bed',
    amenities: ['Air Conditioning', 'Free Wi-Fi', 'Smart TV', 'Daily Housekeeping'],
    images: ['https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cat-deluxe-02',
    hotel_id: 'default-hotel-id',
    name: 'Deluxe Room',
    slug: 'deluxe-room',
    description: 'Spacious room with premium amenities, work desk, and city views.',
    base_price: 2500,
    max_adults: 2,
    max_children: 1,
    room_size_sqft: 280,
    bed_type: 'King Bed',
    amenities: ['Air Conditioning', 'Free Wi-Fi', 'Smart TV', 'Electric Kettle', 'Work Desk'],
    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cat-super-deluxe-03',
    hotel_id: 'default-hotel-id',
    name: 'Super Deluxe Room',
    slug: 'super-deluxe-room',
    description: 'Upgraded room with enhanced features, mini-bar, and plush sitting area.',
    base_price: 3000,
    max_adults: 3,
    max_children: 1,
    room_size_sqft: 320,
    bed_type: 'King Bed',
    amenities: ['Air Conditioning', 'Free Wi-Fi', 'Smart TV', 'Electric Kettle', 'Minibar Fridge', 'In-room Dining'],
    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'cat-suite-04',
    hotel_id: 'default-hotel-id',
    name: 'Suite Room',
    slug: 'suite-room',
    description: 'Luxurious suite with separate living area, bathtub, and supreme comfort.',
    base_price: 3500,
    max_adults: 3,
    max_children: 2,
    room_size_sqft: 450,
    bed_type: 'Super King Bed',
    amenities: ['Air Conditioning', 'Free Wi-Fi', 'Smart TV', 'Electric Kettle', 'Minibar Fridge', 'Bathtub', 'Balcony'],
    images: ['https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getStoredCategories(): RoomCategory[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return DEFAULT_ROOM_CATEGORIES;
}

function saveStoredCategories(categories: RoomCategory[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.warn(e);
  }
}

function getStoredRooms(): Room[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ROOMS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn(e);
  }
  return [];
}

function saveStoredRooms(rooms: Room[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ROOMS_KEY, JSON.stringify(rooms));
  } catch (e) {
    console.warn(e);
  }
}

export async function getRoomCategories(hotelId: string, activeOnly: boolean = false): Promise<RoomCategory[]> {
  const localCats = getStoredCategories();
  const supabase = getSupabase();

  if (supabase) {
    try {
      let query = supabase.from('room_categories').select('*').eq('hotel_id', hotelId).order('base_price', { ascending: true });
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as RoomCategory[];
      }
    } catch (err) {
      console.warn('Using local room categories (DB pending or empty):', err);
    }
  }

  if (activeOnly) {
    return localCats.filter((c) => c.is_active);
  }
  return localCats;
}

export async function createRoomCategory(
  categoryData: Omit<RoomCategory, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: RoomCategory; error?: string }> {
  const newCat: RoomCategory = {
    id: `cat-${Date.now()}`,
    ...categoryData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = getStoredCategories();
  saveStoredCategories([...current, newCat]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('room_categories').insert([categoryData]);
    } catch (e) {
      console.warn('Supabase category insert skipped; stored locally:', e);
    }
  }

  try {
    await logAction(categoryData.hotel_id, `Created Room Category: ${categoryData.name}`, 'RoomCategory', newCat.id);
  } catch {}

  return { success: true, data: newCat };
}

export async function updateRoomCategory(
  id: string,
  hotelId: string,
  updates: Partial<RoomCategory>
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredCategories();
  const updated = current.map((c) => (c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c));
  saveStoredCategories(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('room_categories').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase category update skipped; updated locally:', e);
    }
  }

  try {
    await logAction(hotelId, `Updated Room Category`, 'RoomCategory', id, updates);
  } catch {}

  return { success: true };
}

export async function deleteRoomCategory(id: string, hotelId: string): Promise<{ success: boolean; error?: string }> {
  const current = getStoredCategories();
  const filtered = current.filter((c) => c.id !== id);
  saveStoredCategories(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('room_categories').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase category delete skipped; deleted locally:', e);
    }
  }

  try {
    await logAction(hotelId, `Deleted Room Category`, 'RoomCategory', id);
  } catch {}

  return { success: true };
}

export async function getRooms(hotelId: string): Promise<Room[]> {
  const localRooms = getStoredRooms();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, category:room_categories(*)')
        .eq('hotel_id', hotelId)
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as Room[];
      }
    } catch (err) {
      console.warn('Error fetching rooms, using local:', err);
    }
  }

  if (localRooms.length > 0) {
    return localRooms;
  }

  // If no rooms yet, generate 30 default rooms so staff and front desk are fully usable
  const defaultRooms: Room[] = [];
  const categories = getStoredCategories();
  const stdId = categories.find((c) => c.name.includes('Standard'))?.id;
  const delId = categories.find((c) => c.name.includes('Deluxe'))?.id;
  const supId = categories.find((c) => c.name.includes('Super'))?.id;
  const steId = categories.find((c) => c.name.includes('Suite'))?.id;

  for (let floor = 1; floor <= 3; floor++) {
    for (let r = 1; r <= 10; r++) {
      const roomNum = `${floor}${r < 10 ? '0' : ''}${r}`;
      let catId = delId;
      if (r <= 3) catId = supId;
      else if (r <= 6) catId = delId;
      else if (r <= 8) catId = stdId;
      else catId = steId;

      defaultRooms.push({
        id: `room-${roomNum}`,
        hotel_id: hotelId,
        room_number: roomNum,
        floor: floor as 1 | 2 | 3,
        status: 'Available',
        category_id: catId,
        is_smoking: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  saveStoredRooms(defaultRooms);
  return defaultRooms;
}

export async function createRoom(
  roomData: Omit<Room, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Room; error?: string }> {
  const newRoom: Room = {
    id: `room-${roomData.room_number}`,
    ...roomData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = getStoredRooms();
  saveStoredRooms([...current, newRoom]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('rooms').insert([roomData]);
    } catch (e) {
      console.warn('Supabase room insert skipped; stored locally:', e);
    }
  }

  try {
    await logAction(roomData.hotel_id, `Added Room ${roomData.room_number}`, 'Room', newRoom.id);
  } catch {}

  return { success: true, data: newRoom };
}

export async function updateRoom(
  id: string,
  hotelId: string,
  updates: Partial<Room>
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredRooms();
  const updated = current.map((r) => (r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r));
  saveStoredRooms(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('rooms').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase room update skipped; updated locally:', e);
    }
  }

  try {
    await logAction(hotelId, `Updated Room Details`, 'Room', id, updates);
  } catch {}

  return { success: true };
}

export async function updateRoomStatus(
  id: string,
  arg2: string | RoomStatus,
  arg3?: string,
  arg4?: RoomStatus,
  arg5?: string
): Promise<{ success: boolean; error?: string }> {
  let hotelId = '';
  let roomNumber = 'Room';
  let status: RoomStatus = 'Available';
  let notes: string | undefined = undefined;

  if (typeof arg4 === 'string') {
    hotelId = arg2 as string;
    roomNumber = arg3 || 'Room';
    status = arg4;
    notes = arg5;
  } else {
    status = arg2 as RoomStatus;
    hotelId = arg3 || '';
    notes = arg5 || undefined;
  }

  const current = getStoredRooms();
  const targetRoomObj = current.find((r) => r.id === id);
  const resolvedRoomNumber =
    roomNumber && roomNumber !== 'Room' && roomNumber !== 'Assigned Room'
      ? roomNumber
      : targetRoomObj?.room_number || id.replace('room-', '');

  const updated = current.map((r) => (r.id === id ? { ...r, status, notes: notes !== undefined ? notes : r.notes } : r));
  saveStoredRooms(updated);

  if (status === 'Maintenance' || status === 'Out of Order') {
    await emitPMSNotification({
      id: `notif-room-maint-${id}-${Date.now()}`,
      type: 'maintenance',
      title: `Urgent Maintenance Alert • Room ${resolvedRoomNumber}`,
      message: notes
        ? `Room ${resolvedRoomNumber} flagged as ${status}: ${notes}`
        : `Room ${resolvedRoomNumber} marked as ${status} and requires immediate engineering attention.`,
      targetTab: 'housekeeping',
      meta: {
        roomNumber: resolvedRoomNumber,
        priority: status === 'Out of Order' ? 'Critical' : 'Urgent',
      },
    });
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const updates: Partial<Room> = { status };
      if (notes !== undefined) updates.notes = notes;
      await supabase.from('rooms').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase room status update skipped; updated locally:', e);
    }
  }

  if (hotelId) {
    try {
      await logAction(hotelId, `Room ${roomNumber} status changed to ${status}`, 'Room', id, { status, notes });
    } catch {}
  }

  return { success: true };
}

export const initialize30Rooms = initializeThirtyRoomsSetup;

export async function initializeThirtyRoomsSetup(
  hotelId: string
): Promise<{ success: boolean; createdCount?: number; error?: string }> {
  const rooms = await getRooms(hotelId);
  return { success: true, createdCount: rooms.length };
}
