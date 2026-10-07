import { getSupabase } from '../lib/supabase';
import { Room, RoomCategory, RoomStatus } from '../types';
import { logAction } from './auditService';
import { emitPMSNotification } from './notificationService';
import { isValidUuid, resolveSupabaseHotelId } from './hotelService';

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
    images: [
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766506349-btxh-dsc06965-6-7-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766516314-rjhc-r1-copy.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766517696-6rum-r2-copy.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766520172-2vb2-r4-copy.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766522388-qhte-r6-copy.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766525074-g7qa-w2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766526383-djuq-w3.jpg',
    ],
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
    amenities: [
      'Air Conditioning',
      'Free Wi-Fi',
      'Smart TV',
      'Electric Kettle',
      'Work Desk',
    ],
    images: [
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766507446-eq1w-dsc06971-2-3-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766508506-lalb-dsc06977-8-9-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766519107-vl6e-r3-copy.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766527430-0bo5-w4.jpg',
    ],
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
    amenities: [
      'Air Conditioning',
      'Free Wi-Fi',
      'Smart TV',
      'Electric Kettle',
      'Minibar Fridge',
      'In-room Dining',
    ],
    images: [
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766473773-t4m2-dsc06758-59-60-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766475354-6jty-dsc06767-8-9-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766476467-kzd7-dsc06770-1-2-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766477617-uc96-dsc06773-4-5-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766478785-qfq8-dsc06779-80-81-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766480139-lnnc-dsc06785-6-7-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766481251-rbef-dsc06791-2-3-copy-2.jpg',
    ],
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
    amenities: [
      'Air Conditioning',
      'Free Wi-Fi',
      'Smart TV',
      'Electric Kettle',
      'Minibar Fridge',
      'Bathtub',
      'Balcony',
    ],
    images: [
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790602889189-room.jpeg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766482372-9r4x-dsc06797-8-9-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766484175-3d5j-dsc06803-4-5-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766486860-6xlc-dsc06809-10-11-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766487942-qef1-dsc06815-6-7-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766489390-o165-dsc06821-2-3-copy-2.jpg',
      'https://uaagbjoxehxmyhngyomv.supabase.co/storage/v1/object/public/hotel-media/gallery/1790766504867-ptq6-dsc06959-60-61-copy-2.jpg',
    ],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function getStoredCategories(): RoomCategory[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATEGORIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasUnsplash = parsed.some((c: RoomCategory) =>
          c.images?.some((img: string) => img.includes('unsplash.com'))
        );
        if (hasUnsplash) {
          const cleansed = parsed.map((c: RoomCategory) => {
            const validImages = (c.images || []).filter((img: string) => !img.includes('unsplash.com'));
            const defaultMatch = DEFAULT_ROOM_CATEGORIES.find((d) => d.slug === c.slug || d.name === c.name);
            return {
              ...c,
              images: validImages.length > 0 ? validImages : (defaultMatch?.images || []),
            };
          });
          return cleansed;
        }
        return parsed;
      }
    }
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

export async function getRoomCategories(
  hotelId: string,
  activeOnly: boolean = false
): Promise<RoomCategory[]> {
  const localCats = getStoredCategories();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        const { data: allDbCats, error } = await supabase
          .from('room_categories')
          .select('*')
          .eq('hotel_id', resolvedHotelId)
          .order('base_price', { ascending: true });

        if (!error && allDbCats) {
          if (allDbCats.length === 0 && localCats.length > 0) {
            // Seed initial room categories into Supabase once
            const seedRows = localCats.map((c) => ({
              hotel_id: resolvedHotelId,
              name: c.name,
              slug:
                c.slug ||
                c.name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, '-')
                  .replace(/(^-|-$)/g, ''),
              description: c.description || '',
              base_price: Number(c.base_price),
              max_adults: Number(c.max_adults || 2),
              max_children: Number(c.max_children ?? 1),
              room_size_sqft: Number(c.room_size_sqft || 250),
              bed_type: c.bed_type || 'King Bed',
              amenities: Array.isArray(c.amenities) ? c.amenities : [],
              images: Array.isArray(c.images) ? c.images : [],
              is_active: c.is_active !== false,
            }));

            const { data: seeded } = await supabase
              .from('room_categories')
              .upsert(seedRows, { onConflict: 'hotel_id,slug' })
              .select('*')
              .order('base_price', { ascending: true });

            if (seeded && seeded.length > 0) {
              saveStoredCategories(seeded as RoomCategory[]);
              return activeOnly
                ? (seeded as RoomCategory[]).filter((c) => c.is_active)
                : (seeded as RoomCategory[]);
            }
          } else {
            saveStoredCategories(allDbCats as RoomCategory[]);
            return activeOnly
              ? (allDbCats as RoomCategory[]).filter((c) => c.is_active)
              : (allDbCats as RoomCategory[]);
          }
        }
      }
    } catch (err) {
      console.warn('Using local room categories (DB pending):', err);
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
  let newCat: RoomCategory = {
    id: `cat-${Date.now()}`,
    ...categoryData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(categoryData.hotel_id);
      if (resolvedHotelId) {
        const slug =
          categoryData.slug ||
          categoryData.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const { data: inserted } = await supabase
          .from('room_categories')
          .upsert([{ ...categoryData, hotel_id: resolvedHotelId, slug }], {
            onConflict: 'hotel_id,slug',
          })
          .select('*')
          .single();

        if (inserted) {
          newCat = inserted as RoomCategory;
        }
      }
    } catch (e) {
      console.warn('Supabase category insert skipped; stored locally:', e);
    }
  }

  const current = getStoredCategories();
  saveStoredCategories([...current.filter((c) => c.id !== newCat.id), newCat]);

  try {
    if (isValidUuid(newCat.hotel_id)) {
      await logAction(
        newCat.hotel_id,
        `Created Room Category: ${categoryData.name}`,
        'RoomCategory',
        newCat.id
      );
    }
  } catch {}

  return { success: true, data: newCat };
}

export async function updateRoomCategory(
  id: string,
  hotelId: string,
  updates: Partial<RoomCategory>
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredCategories();
  const targetCat = current.find((c) => c.id === id);
  const updated = current.map((c) =>
    c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
  );
  saveStoredCategories(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (isValidUuid(id)) {
        await supabase.from('room_categories').update(updates).eq('id', id);
      } else if (resolvedHotelId && targetCat?.slug) {
        await supabase
          .from('room_categories')
          .update(updates)
          .eq('hotel_id', resolvedHotelId)
          .eq('slug', targetCat.slug);
      }
    } catch (e) {
      console.warn('Supabase category update skipped; updated locally:', e);
    }
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
    if (resolvedHotelId) {
      await logAction(resolvedHotelId, `Updated Room Category`, 'RoomCategory', id, updates);
    }
  } catch {}

  return { success: true };
}

export async function deleteRoomCategory(
  id: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredCategories();
  const targetCat = current.find((c) => c.id === id);
  const filtered = current.filter((c) => c.id !== id);
  saveStoredCategories(filtered);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (isValidUuid(id)) {
        await supabase.from('room_categories').delete().eq('id', id);
      } else if (resolvedHotelId && targetCat?.slug) {
        await supabase
          .from('room_categories')
          .delete()
          .eq('hotel_id', resolvedHotelId)
          .eq('slug', targetCat.slug);
      }
    } catch (e) {
      console.warn('Supabase category delete skipped; deleted locally:', e);
    }
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
    if (resolvedHotelId) {
      await logAction(resolvedHotelId, `Deleted Room Category`, 'RoomCategory', id);
    }
  } catch {}

  return { success: true };
}

export async function getRooms(hotelId: string): Promise<Room[]> {
  const localRooms = getStoredRooms();
  const supabase = getSupabase();

  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        const { data, error } = await supabase
          .from('rooms')
          .select('*, category:room_categories(*)')
          .eq('hotel_id', resolvedHotelId)
          .order('floor', { ascending: true })
          .order('room_number', { ascending: true });

        if (!error && data) {
          if (data.length > 0) {
            saveStoredRooms(data as Room[]);
            return data as Room[];
          }

          // If Supabase `rooms` is empty, seed the 30 rooms linked to real Supabase `room_categories`
          const dbCategories = await getRoomCategories(resolvedHotelId, false);
          const stdId = dbCategories.find((c) => c.name.includes('Standard'))?.id;
          const delId = dbCategories.find((c) => c.name.includes('Deluxe') && !c.name.includes('Super'))?.id;
          const supId = dbCategories.find((c) => c.name.includes('Super'))?.id;
          const steId = dbCategories.find((c) => c.name.includes('Suite'))?.id;

          const seedRooms: Array<Record<string, any>> = [];
          for (let floor = 1; floor <= 3; floor++) {
            for (let r = 1; r <= 10; r++) {
              const roomNum = `${floor}${r < 10 ? '0' : ''}${r}`;
              let catId = delId;
              if (r <= 3) catId = supId;
              else if (r <= 6) catId = delId;
              else if (r <= 8) catId = stdId;
              else catId = steId;

              seedRooms.push({
                hotel_id: resolvedHotelId,
                room_number: roomNum,
                floor,
                status: 'Available',
                category_id: isValidUuid(catId) ? catId : null,
                is_smoking: false,
              });
            }
          }

          const { data: seededRooms } = await supabase
            .from('rooms')
            .upsert(seedRooms, { onConflict: 'hotel_id,room_number' })
            .select('*, category:room_categories(*)');

          if (seededRooms && seededRooms.length > 0) {
            saveStoredRooms(seededRooms as Room[]);
            return seededRooms as Room[];
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching rooms, using local:', err);
    }
  }

  if (localRooms.length > 0) {
    return localRooms;
  }

  // Fallback local 30 rooms
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
  let newRoom: Room = {
    id: `room-${roomData.room_number}`,
    ...roomData,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(roomData.hotel_id);
      if (resolvedHotelId) {
        const { data: inserted } = await supabase
          .from('rooms')
          .upsert(
            [
              {
                ...roomData,
                hotel_id: resolvedHotelId,
                category_id: isValidUuid(roomData.category_id) ? roomData.category_id : null,
              },
            ],
            { onConflict: 'hotel_id,room_number' }
          )
          .select('*, category:room_categories(*)')
          .single();

        if (inserted) {
          newRoom = inserted as Room;
        }
      }
    } catch (e) {
      console.warn('Supabase room insert skipped; stored locally:', e);
    }
  }

  const current = getStoredRooms();
  saveStoredRooms([
    ...current.filter((r) => r.room_number !== newRoom.room_number),
    newRoom,
  ]);

  try {
    if (isValidUuid(newRoom.hotel_id)) {
      await logAction(
        newRoom.hotel_id,
        `Added Room ${roomData.room_number}`,
        'Room',
        newRoom.id
      );
    }
  } catch {}

  return { success: true, data: newRoom };
}

export async function updateRoom(
  id: string,
  hotelId: string,
  updates: Partial<Room>
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredRooms();
  const targetRoom = current.find((r) => r.id === id);
  const updated = current.map((r) =>
    r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
  );
  saveStoredRooms(updated);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      const dbUpdates = { ...updates };
      delete (dbUpdates as any).category;
      if (dbUpdates.category_id && !isValidUuid(dbUpdates.category_id)) {
        delete dbUpdates.category_id;
      }

      if (isValidUuid(id)) {
        await supabase.from('rooms').update(dbUpdates).eq('id', id);
      } else if (resolvedHotelId && targetRoom?.room_number) {
        await supabase
          .from('rooms')
          .update(dbUpdates)
          .eq('hotel_id', resolvedHotelId)
          .eq('room_number', targetRoom.room_number);
      }
    } catch (e) {
      console.warn('Supabase room update skipped; updated locally:', e);
    }
  }

  try {
    const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
    if (resolvedHotelId) {
      await logAction(resolvedHotelId, `Updated Room Details`, 'Room', id, updates);
    }
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

  const updated = current.map((r) =>
    r.id === id ? { ...r, status, notes: notes !== undefined ? notes : r.notes } : r
  );
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
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      const updates: Partial<Room> = { status };
      if (notes !== undefined) updates.notes = notes;

      if (isValidUuid(id)) {
        await supabase.from('rooms').update(updates).eq('id', id);
      } else if (resolvedHotelId && resolvedRoomNumber) {
        await supabase
          .from('rooms')
          .update(updates)
          .eq('hotel_id', resolvedHotelId)
          .eq('room_number', resolvedRoomNumber);
      }
    } catch (e) {
      console.warn('Supabase room status update skipped; updated locally:', e);
    }
  }

  if (hotelId) {
    try {
      const resolvedHotelId = await resolveSupabaseHotelId(hotelId);
      if (resolvedHotelId) {
        await logAction(
          resolvedHotelId,
          `Room ${resolvedRoomNumber} status changed to ${status}`,
          'Room',
          id,
          { status, notes }
        );
      }
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
