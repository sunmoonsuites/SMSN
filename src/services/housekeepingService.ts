import { getSupabase } from '../lib/supabase';
import { Room, HousekeepingTask } from '../types';
import { updateRoomStatus, getRooms } from './roomsService';
import { logAction } from './auditService';
import { emitPMSNotification } from './notificationService';

export interface HousekeepingSummary {
  toClean: Room[];
  cleanAndAvailable: Room[];
  occupied: Room[];
  maintenance: Room[];
  outOfOrder: Room[];
  totalRooms: number;
}

const LOCAL_HK_TASKS_KEY = 'pms_custom_hk_tasks';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getLocalTasks(): HousekeepingTask[] {
  try {
    const raw = localStorage.getItem(LOCAL_HK_TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalTasks(list: HousekeepingTask[]) {
  try {
    localStorage.setItem(LOCAL_HK_TASKS_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export async function getHousekeepingSummary(hotelId: string): Promise<HousekeepingSummary> {
  try {
    const all = await getRooms(hotelId);
    return {
      toClean: all.filter((r) => r.status === 'Cleaning'),
      cleanAndAvailable: all.filter((r) => r.status === 'Available'),
      occupied: all.filter((r) => r.status === 'Occupied'),
      maintenance: all.filter((r) => r.status === 'Maintenance'),
      outOfOrder: all.filter((r) => r.status === 'Out of Order'),
      totalRooms: all.length,
    };
  } catch {
    return {
      toClean: [],
      cleanAndAvailable: [],
      occupied: [],
      maintenance: [],
      outOfOrder: [],
      totalRooms: 0,
    };
  }
}

export async function markRoomClean(
  roomId: string,
  hotelId: string,
  roomNumber?: string
): Promise<{ success: boolean; error?: string }> {
  return updateRoomStatus(
    roomId,
    hotelId,
    roomNumber || 'Room',
    'Available',
    'Cleaned and inspected by Housekeeping'
  );
}

export async function markRoomCleaning(
  roomId: string,
  hotelId: string,
  roomNumber?: string
): Promise<{ success: boolean; error?: string }> {
  return updateRoomStatus(
    roomId,
    hotelId,
    roomNumber || 'Room',
    'Cleaning',
    'Room marked for housekeeping'
  );
}

export async function markRoomMaintenance(
  roomId: string,
  hotelId: string,
  roomNumber?: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  return updateRoomStatus(
    roomId,
    hotelId,
    roomNumber || 'Room',
    'Maintenance',
    notes || 'Maintenance required'
  );
}

export async function getHousekeepingTasks(hotelId: string): Promise<HousekeepingTask[]> {
  const localList = getLocalTasks();
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(hotelId)) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('housekeeping_tasks')
      .select('*, room:rooms(*)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });

    if (error) return localList;
    const remoteList = (data as HousekeepingTask[]) || [];
    return remoteList.length > 0 ? remoteList : localList;
  } catch {
    return localList;
  }
}

export async function createHousekeepingTask(params: {
  hotel_id: string;
  room_id: string;
  assigned_to?: string;
  task_type: HousekeepingTask['task_type'];
  priority: HousekeepingTask['priority'];
  status?: HousekeepingTask['status'];
  notes?: string;
}): Promise<{ success: boolean; data?: HousekeepingTask; error?: string }> {
  const rooms = await getRooms(params.hotel_id);
  const matchedRoom = rooms.find((r) => r.id === params.room_id);
  const now = new Date().toISOString();

  const newTask: HousekeepingTask = {
    id: `hk-${Date.now()}`,
    hotel_id: params.hotel_id,
    room_id: params.room_id,
    room: matchedRoom,
    assigned_to: params.assigned_to || 'Housekeeping Staff',
    task_type: params.task_type,
    status: params.status || 'Pending',
    priority: params.priority,
    notes: params.notes,
    created_at: now,
    updated_at: now,
  };

  saveLocalTasks([newTask, ...getLocalTasks()]);

  if (
    params.task_type === 'Maintenance' ||
    params.priority === 'Urgent' ||
    params.priority === 'High'
  ) {
    const roomLabel = matchedRoom?.room_number ? `Room ${matchedRoom.room_number}` : 'Property Room';
    await emitPMSNotification({
      id: `notif-maint-${newTask.id}`,
      type: 'maintenance',
      title: `Urgent Maintenance Request • ${roomLabel}`,
      message: `${params.notes || `${params.task_type} required in ${roomLabel}`} (Assigned: ${newTask.assigned_to}, Priority: ${params.priority})`,
      targetTab: 'housekeeping',
      meta: {
        roomNumber: matchedRoom?.room_number || params.room_id,
        priority: params.priority,
      },
    });
  }

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(params.hotel_id) && UUID_REGEX.test(params.room_id)) {
    try {
      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .insert([
          {
            hotel_id: params.hotel_id,
            room_id: params.room_id,
            assigned_to: params.assigned_to || 'Housekeeping Staff',
            task_type: params.task_type,
            status: params.status || 'Pending',
            priority: params.priority,
            notes: params.notes || null,
          },
        ])
        .select('*, room:rooms(*)')
        .single();

      if (!error && data) {
        await logAction(params.hotel_id, `Created Housekeeping Task (${params.task_type})`, 'Housekeeping', data.id);
        return { success: true, data: data as HousekeepingTask };
      }
    } catch {
      // Handled locally
    }
  }

  return { success: true, data: newTask };
}

export async function updateHousekeepingTask(
  taskId: string,
  hotelId: string,
  status: HousekeepingTask['status'],
  roomId?: string
): Promise<{ success: boolean; error?: string }> {
  const updated = getLocalTasks().map((t) =>
    t.id === taskId
      ? {
          ...t,
          status,
          updated_at: new Date().toISOString(),
        }
      : t
  );
  saveLocalTasks(updated);

  if (status === 'Completed' && roomId && hotelId) {
    await markRoomClean(roomId, hotelId);
  }

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(taskId)) {
    try {
      await supabase
        .from('housekeeping_tasks')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);
    } catch {
      // Handled locally
    }
  }

  return { success: true };
}

export const updateHousekeepingTaskStatus = updateHousekeepingTask;

export interface HousekeepingSupplyItem {
  id: string;
  hotel_id: string;
  name: string;
  category: 'Linen' | 'Toiletries' | 'Cleaning Supplies' | 'Guest Amenities';
  current_stock: number;
  reorder_threshold: number;
  unit: string;
  updated_at: string;
}

const LOCAL_HK_SUPPLIES_KEY = 'pms_custom_hk_supplies';

const DEFAULT_HK_SUPPLIES: HousekeepingSupplyItem[] = [
  {
    id: 'sup-1',
    hotel_id: 'default-hotel-id',
    name: 'Fresh Bath Towels (Cotton)',
    category: 'Linen',
    current_stock: 85,
    reorder_threshold: 40,
    unit: 'pcs',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-2',
    hotel_id: 'default-hotel-id',
    name: 'King Size Bed Sheet Sets',
    category: 'Linen',
    current_stock: 48,
    reorder_threshold: 30,
    unit: 'sets',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-3',
    hotel_id: 'default-hotel-id',
    name: 'Dental & Shaving Amenity Kits',
    category: 'Toiletries',
    current_stock: 14,
    reorder_threshold: 25,
    unit: 'kits',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-4',
    hotel_id: 'default-hotel-id',
    name: 'Shampoo & Body Wash Dispensers',
    category: 'Toiletries',
    current_stock: 18,
    reorder_threshold: 30,
    unit: 'bottles',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-5',
    hotel_id: 'default-hotel-id',
    name: 'Surface Sanitizer & Disinfectant',
    category: 'Cleaning Supplies',
    current_stock: 12,
    reorder_threshold: 10,
    unit: 'liters',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'sup-6',
    hotel_id: 'default-hotel-id',
    name: 'Complimentary Water Bottles (500ml)',
    category: 'Guest Amenities',
    current_stock: 36,
    reorder_threshold: 50,
    unit: 'bottles',
    updated_at: new Date().toISOString(),
  },
];

function getLocalSupplies(): HousekeepingSupplyItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_HK_SUPPLIES_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_HK_SUPPLIES_KEY, JSON.stringify(DEFAULT_HK_SUPPLIES));
      return DEFAULT_HK_SUPPLIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HK_SUPPLIES;
  } catch {
    return DEFAULT_HK_SUPPLIES;
  }
}

function saveLocalSupplies(list: HousekeepingSupplyItem[]) {
  try {
    localStorage.setItem(LOCAL_HK_SUPPLIES_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export async function getHousekeepingSupplies(_hotelId: string): Promise<HousekeepingSupplyItem[]> {
  return getLocalSupplies();
}

export async function updateHousekeepingSupply(
  id: string,
  updates: Partial<Pick<HousekeepingSupplyItem, 'current_stock' | 'reorder_threshold' | 'name' | 'category' | 'unit'>>
): Promise<{ success: boolean }> {
  const current = getLocalSupplies();
  const updated = current.map((item) =>
    item.id === id
      ? {
          ...item,
          ...updates,
          current_stock:
            updates.current_stock !== undefined
              ? Math.max(0, Number(updates.current_stock))
              : item.current_stock,
          reorder_threshold:
            updates.reorder_threshold !== undefined
              ? Math.max(0, Number(updates.reorder_threshold))
              : item.reorder_threshold,
          updated_at: new Date().toISOString(),
        }
      : item
  );
  saveLocalSupplies(updated);
  return { success: true };
}

export async function createHousekeepingSupply(params: {
  hotel_id: string;
  name: string;
  category: HousekeepingSupplyItem['category'];
  current_stock: number;
  reorder_threshold: number;
  unit: string;
}): Promise<{ success: boolean; data: HousekeepingSupplyItem }> {
  const newItem: HousekeepingSupplyItem = {
    id: `sup-${Date.now()}`,
    hotel_id: params.hotel_id || 'default-hotel-id',
    name: params.name.trim(),
    category: params.category,
    current_stock: Math.max(0, Number(params.current_stock)),
    reorder_threshold: Math.max(0, Number(params.reorder_threshold)),
    unit: params.unit.trim() || 'pcs',
    updated_at: new Date().toISOString(),
  };

  saveLocalSupplies([newItem, ...getLocalSupplies()]);
  return { success: true, data: newItem };
}

export async function deleteHousekeepingSupply(id: string): Promise<{ success: boolean }> {
  const current = getLocalSupplies();
  saveLocalSupplies(current.filter((i) => i.id !== id));
  return { success: true };
}

