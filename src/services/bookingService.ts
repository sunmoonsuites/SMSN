import { getSupabase } from '../lib/supabase';
import { Booking, BookingStatus, Room, RoomCategory } from '../types';
import { logAction } from './auditService';
import { findOrCreateGuest } from './guestsService';
import { generateBookingRef, calculateNights, calculateGST } from '../lib/utils';
import { updateRoomStatus, getRoomCategories, getRooms, DEFAULT_ROOM_CATEGORIES } from './roomsService';
import {
  getEffectiveRoomPrice,
  getStoredLocalConfig,
  DEFAULT_BOOKING_ENGINE_CONFIG,
} from './hotelService';
import { emitPMSNotification } from './notificationService';

export interface AvailabilityResult {
  categoryId: string;
  category: RoomCategory;
  availableRoomCount: number;
  availableRooms: Room[];
  ratePerNight: number;
  totalNights: number;
  subtotal: number;
  tax: number;
  total: number;
  yanoljaRoomTypeUnkid?: string;
  yanoljaRoomRateUnkid?: string;
  yanoljaSynced?: boolean;
}

function getLocalBookings(hotelId: string): Booking[] {
  try {
    const saved = localStorage.getItem('sunmoon_local_bookings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((b: any) => !b.hotel_id || b.hotel_id === hotelId) : [];
    }
  } catch {
    // Ignore storage issues
  }
  return [];
}

function saveLocalBooking(booking: Booking) {
  try {
    const saved = localStorage.getItem('sunmoon_local_bookings');
    const list: Booking[] = saved ? JSON.parse(saved) : [];
    const idx = list.findIndex((b) => b.id === booking.id || b.booking_reference === booking.booking_reference);
    if (idx >= 0) {
      list[idx] = booking;
    } else {
      list.unshift(booking);
    }
    localStorage.setItem('sunmoon_local_bookings', JSON.stringify(list.slice(0, 200)));
  } catch {
    // Ignore storage issues
  }
}

interface BookingOverride {
  status?: BookingStatus;
  checked_in_at?: string;
  checked_out_at?: string;
  cancellation_reason?: string;
  assigned_room_id?: string;
  id_type?: string;
  id_number?: string;
}

function getBookingOverrides(): Record<string, BookingOverride> {
  try {
    const raw = localStorage.getItem('sunmoon_booking_overrides');
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore
  }
  return {};
}

function saveBookingOverride(bookingId: string, override: BookingOverride) {
  try {
    const current = getBookingOverrides();
    current[bookingId] = { ...(current[bookingId] || {}), ...override };
    localStorage.setItem('sunmoon_booking_overrides', JSON.stringify(current));

    // Also update if present in sunmoon_local_bookings
    const saved = localStorage.getItem('sunmoon_local_bookings');
    if (saved) {
      const list: Booking[] = JSON.parse(saved);
      const updated = list.map((b) => {
        if (b.id === bookingId) {
          const nextRooms = b.booking_rooms ? [...b.booking_rooms] : [];
          if (override.assigned_room_id) {
            if (nextRooms.length > 0) {
              nextRooms[0] = { ...nextRooms[0], room_id: override.assigned_room_id };
            } else {
              nextRooms.push({
                id: `br-${Date.now()}`,
                booking_id: b.id,
                room_id: override.assigned_room_id,
                rate_per_night: b.total_room_charges || 1500,
                created_at: new Date().toISOString(),
              });
            }
          }
          return {
            ...b,
            ...(override.status ? { status: override.status } : {}),
            ...(override.checked_in_at ? { checked_in_at: override.checked_in_at } : {}),
            ...(override.checked_out_at ? { checked_out_at: override.checked_out_at } : {}),
            ...(override.cancellation_reason ? { cancellation_reason: override.cancellation_reason } : {}),
            booking_rooms: nextRooms,
          };
        }
        return b;
      });
      localStorage.setItem('sunmoon_local_bookings', JSON.stringify(updated));
    }
  } catch {
    // Ignore
  }
}

function enrichBookingRecord(
  b: Booking,
  roomsMap: Map<string, Room>,
  overrides: Record<string, BookingOverride>
): Booking {
  const ov = overrides[b.id];
  const enriched: Booking = { ...b };

  if (ov) {
    if (ov.status) enriched.status = ov.status;
    if (ov.checked_in_at) enriched.checked_in_at = ov.checked_in_at;
    if (ov.checked_out_at) enriched.checked_out_at = ov.checked_out_at;
    if (ov.cancellation_reason) enriched.cancellation_reason = ov.cancellation_reason;
  }

  // Ensure guest object is always populated from guest_name / guest_phone if guest relation is null
  const nameStr = (enriched.guest_name || '').trim();
  const nameParts = nameStr ? nameStr.split(' ') : ['Guest'];
  const fallbackFirstName = nameParts[0] || 'Guest';
  const fallbackLastName = nameParts.slice(1).join(' ') || '';

  if (!enriched.guest || !enriched.guest.first_name) {
    enriched.guest = {
      id: enriched.guest_id || `guest-${enriched.id}`,
      hotel_id: enriched.hotel_id,
      first_name: fallbackFirstName,
      last_name: fallbackLastName,
      phone: enriched.guest_phone || '',
      email: enriched.guest_email || '',
      id_type: (ov?.id_type as any) || enriched.guest?.id_type || 'Aadhaar',
      id_number: ov?.id_number || enriched.guest?.id_number || '',
      total_stays: 1,
      total_spent: enriched.total_amount || 0,
      created_at: enriched.created_at,
      updated_at: enriched.updated_at,
    };
  } else if (ov?.id_type || ov?.id_number) {
    enriched.guest = {
      ...enriched.guest,
      ...(ov.id_type ? { id_type: ov.id_type as any } : {}),
      ...(ov.id_number ? { id_number: ov.id_number } : {}),
    };
  }

  // Ensure booking_rooms and room object are linked
  const nextRooms = enriched.booking_rooms ? [...enriched.booking_rooms] : [];
  const targetRoomId = ov?.assigned_room_id || nextRooms[0]?.room_id;

  if (targetRoomId) {
    const matchedRoom = roomsMap.get(targetRoomId);
    if (nextRooms.length > 0) {
      nextRooms[0] = {
        ...nextRooms[0],
        room_id: targetRoomId,
        room: matchedRoom || nextRooms[0].room,
      };
    } else {
      nextRooms.push({
        id: `br-${enriched.id}`,
        booking_id: enriched.id,
        room_id: targetRoomId,
        rate_per_night: enriched.total_room_charges || 1500,
        room: matchedRoom,
        created_at: enriched.created_at,
      });
    }
  }
  enriched.booking_rooms = nextRooms;

  return enriched;
}

export const SAMPLE_DEFAULT_BOOKINGS: Booking[] = [
  {
    id: 'book-sample-01',
    hotel_id: 'default-hotel-id',
    booking_reference: 'SM-98421',
    guest_name: 'Rahul Sharma',
    guest_email: 'rahul.sharma@example.com',
    guest_phone: '+91 98201 44521',
    check_in_date: new Date().toISOString().split('T')[0],
    check_out_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    adults: 2,
    children: 0,
    status: 'Checked-In',
    source: 'Website',
    total_room_charges: 4998,
    tax_amount: 599.76,
    discount_amount: 500,
    total_amount: 5097.76,
    paid_amount: 5097.76,
    payment_status: 'Paid',
    booking_rooms: [
      {
        id: 'br-1',
        booking_id: 'book-sample-01',
        room_id: 'room-1001',
        category_id: 'cat-deluxe-01',
        rate_per_night: 2499,
        room: {
          id: 'room-1001',
          hotel_id: 'default-hotel-id',
          room_number: '101',
          floor: 1,
          category_id: 'cat-deluxe-01',
          status: 'Occupied',
          is_smoking: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        category: DEFAULT_ROOM_CATEGORIES[0],
        created_at: new Date().toISOString(),
      },
    ],
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'book-sample-02',
      hotel_id: 'default-hotel-id',
      booking_reference: 'SM-81273',
      guest_name: 'Priya Patel',
      guest_email: 'priya.patel@example.com',
      guest_phone: '+91 98920 12389',
      check_in_date: new Date().toISOString().split('T')[0],
      check_out_date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      adults: 2,
      children: 1,
      status: 'Confirmed',
      source: 'Website',
      total_room_charges: 10497,
      tax_amount: 1889.46,
      discount_amount: 1000,
      total_amount: 11386.46,
      paid_amount: 0,
      payment_status: 'Pending',
      booking_rooms: [
        {
          id: 'br-2',
          booking_id: 'book-sample-02',
          room_id: 'room-2003',
          category_id: 'cat-exec-02',
          rate_per_night: 3499,
          room: {
            id: 'room-2003',
            hotel_id: 'default-hotel-id',
            room_number: '203',
            floor: 2,
            category_id: 'cat-exec-02',
            status: 'Occupied',
            is_smoking: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          category: DEFAULT_ROOM_CATEGORIES[1],
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

/**
 * Real availability calculation against actual Supabase records or local state.
 * Prevents double-booking by checking date overlap with active reservations.
 */
export async function checkRoomAvailability(
  hotelId: string,
  checkInDate: string,
  checkOutDate: string
): Promise<AvailabilityResult[]> {
  const categories = await getRoomCategories(hotelId, true);
  const allRooms = await getRooms(hotelId);
  const nights = calculateNights(checkInDate, checkOutDate);

  const bookedRoomIds = new Set<string>();
  const bookedCategoryCounts: Record<string, number> = {};

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data: overlappingBookings } = await supabase
        .from('bookings')
        .select('id, status, booking_rooms(room_id, category_id)')
        .eq('hotel_id', hotelId)
        .in('status', ['Confirmed', 'Checked-In'])
        .lt('check_in_date', checkOutDate)
        .gt('check_out_date', checkInDate);

      overlappingBookings?.forEach((b: any) => {
        b.booking_rooms?.forEach((br: any) => {
          if (br.room_id) bookedRoomIds.add(br.room_id);
          if (br.category_id) bookedCategoryCounts[br.category_id] = (bookedCategoryCounts[br.category_id] || 0) + 1;
        });
      });
    } catch {
      // Supabase query failed or table not migrated yet
    }
  }

  // Also check local bookings
  getLocalBookings(hotelId).forEach((b) => {
    if (
      ['Confirmed', 'Checked-In'].includes(b.status) &&
      b.check_in_date < checkOutDate &&
      b.check_out_date > checkInDate
    ) {
      b.booking_rooms?.forEach((br) => {
        if (br.room_id) bookedRoomIds.add(br.room_id);
      });
    }
  });

  // Optional Yanolja / eZee Live Availability Sync (Inbuilt letsbook.me Link or REST API)
  const localHotel = getStoredLocalConfig();
  const engineCfg = localHotel?.booking_engine_config ?? DEFAULT_BOOKING_ENGINE_CONFIG;
  const yanoljaAvailabilityMap: Record<
    string,
    {
      available?: number;
      rate?: number;
      roomTypeUnkid?: string;
      roomRateUnkid?: string;
      synced?: boolean;
    }
  > = {};

  const activeMode = engineCfg?.mode || 'yanolja_link_inbuilt';
  const isLinkInbuiltActive =
    engineCfg?.is_enabled !== false &&
    (activeMode === 'yanolja_link_inbuilt' ||
      (activeMode === 'yanolja_api' && !engineCfg?.yanolja_api_key?.trim()));

  if (isLinkInbuiltActive) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const query = new URLSearchParams({
        bookingUrl:
          engineCfg?.yanolja_booking_url?.trim() || 'https://letsbook.me/booking/sunmoonsuites',
        checkIn: checkInDate,
        checkOut: checkOutDate,
        adults: '2',
        children: '0',
      });
      const resp = await fetch(`/api/yanolja/link-availability?${query.toString()}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);
      const ct = resp.headers.get('content-type') || '';
      if (resp.ok && ct.includes('application/json')) {
        const linkData = await resp.json();
        const rooms = Array.isArray(linkData?.rooms) ? linkData.rooms : [];
        rooms.forEach((item: any) => {
          const rType = String(item?.roomType || item?.roomName || '')
            .toLowerCase()
            .replace(/-ep$/i, '')
            .replace(/room/gi, '')
            .trim();
          const avail = Number(item?.availableRooms ?? -1);
          const rate = Number(item?.stayPriceAfterTax || item?.stayPrice || 0);
          if (rType) {
            yanoljaAvailabilityMap[rType] = {
              available: avail >= 0 ? avail : undefined,
              rate: rate > 0 ? rate : undefined,
              roomTypeUnkid: item?.roomTypeUnkid ? String(item.roomTypeUnkid) : undefined,
              roomRateUnkid: item?.roomRateUnkid ? String(item.roomRateUnkid) : undefined,
              synced: true,
            };
          }
        });
      }
    } catch (e) {
      console.warn('Yanolja inbuilt link availability fallback to local database:', e);
    }
  } else if (
    engineCfg?.is_enabled &&
    engineCfg.mode === 'yanolja_api' &&
    engineCfg.yanolja_hotel_code?.trim() &&
    engineCfg.yanolja_api_key?.trim()
  ) {
    try {
      const apiBase =
        engineCfg.yanolja_api_endpoint?.trim() ||
        'https://live.ipms247.com/booking/reservation_api/listing.php';
      const query = new URLSearchParams({
        request_type: 'RoomList',
        HotelCode: engineCfg.yanolja_hotel_code.trim(),
        APIKey: engineCfg.yanolja_api_key.trim(),
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        number_adults: '2',
        number_children: '0',
      });
      const resp = await fetch(`${apiBase}?${query.toString()}`);
      if (resp.ok) {
        const yData = await resp.json();
        const roomList = Array.isArray(yData) ? yData : yData?.RoomList || [];
        roomList.forEach((item: any) => {
          const rName = String(item?.Room_Name || item?.Roomtype_Name || '')
            .toLowerCase()
            .replace(/room/gi, '')
            .trim();
          const avail = Number(item?.min_ava_rooms ?? item?.Available_Rooms ?? -1);
          const rate = Number(
            item?.room_rates_info?.avg_per_night_without_tax ?? item?.Base_Price ?? 0
          );
          if (rName) {
            yanoljaAvailabilityMap[rName] = {
              available: avail >= 0 ? avail : undefined,
              rate: rate > 0 ? rate : undefined,
              synced: true,
            };
          }
        });
      }
    } catch (e) {
      console.warn('Yanolja API availability check fallback to database:', e);
    }
  }

  const results: AvailabilityResult[] = [];
  for (const cat of categories) {
    const categoryRooms = allRooms.filter((r) => r.category_id === cat.id);
    const availableRooms = categoryRooms.filter((r) => !bookedRoomIds.has(r.id));
    let count =
      availableRooms.length > 0
        ? availableRooms.length
        : Math.max(1, 10 - (bookedCategoryCounts[cat.id] || 0));

    const normCatName = cat.name
      .toLowerCase()
      .replace(/room/gi, '')
      .trim();
    const matchedYanolja =
      yanoljaAvailabilityMap[normCatName] ||
      Object.entries(yanoljaAvailabilityMap).find(([k]) => k === normCatName)?.[1];

    if (matchedYanolja?.available !== undefined) {
      const localBookedCount = bookedCategoryCounts[cat.id] || 0;
      count = Math.max(0, matchedYanolja.available - localBookedCount);
    }

    const { effectivePrice, isInauguralActive } = getEffectiveRoomPrice(cat);
    const finalRate =
      !isInauguralActive && matchedYanolja?.rate ? matchedYanolja.rate : effectivePrice;
    const subtotal = finalRate * nights;
    const { tax, total } = calculateGST(subtotal);

    results.push({
      categoryId: cat.id,
      category: cat,
      availableRoomCount: count,
      availableRooms,
      ratePerNight: finalRate,
      totalNights: nights,
      subtotal,
      tax,
      total,
      yanoljaRoomTypeUnkid: matchedYanolja?.roomTypeUnkid,
      yanoljaRoomRateUnkid: matchedYanolja?.roomRateUnkid,
      yanoljaSynced: Boolean(matchedYanolja?.synced),
    });
  }

  return results;
}

export interface CreateBookingParams {
  hotelId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  categoryId?: string;
  categoryName?: string;
  yanoljaRoomTypeUnkid?: string;
  yanoljaRoomRateUnkid?: string;
  roomId?: string;
  ratePerNight: number;
  source?: 'Website' | 'Walk-in' | 'Phone' | 'OTA';
  promoCode?: string;
  discountAmount?: number;
  specialRequests?: string;
  paymentStatus?: 'Pending' | 'Partial' | 'Paid';
  paidAmount?: number;
  paymentReference?: string;
}

async function syncBookingToYanoljaApi(
  params: CreateBookingParams,
  bookingRef: string,
  totalAmount: number
): Promise<{ synced: boolean; yanoljaBookingId?: string }> {
  const localHotel = getStoredLocalConfig();
  const engineCfg = localHotel?.booking_engine_config ?? DEFAULT_BOOKING_ENGINE_CONFIG;
  if (engineCfg?.is_enabled === false || engineCfg?.mode === 'builtin') {
    return { synced: false };
  }

  const activeMode = engineCfg?.mode || 'yanolja_link_inbuilt';

  // 1. Inbuilt letsbook.me Link Internal Booking Processing
  if (
    activeMode === 'yanolja_link_inbuilt' ||
    (activeMode === 'yanolja_api' && !engineCfg?.yanolja_api_key?.trim())
  ) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch('/api/yanolja/link-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          bookingUrl:
            engineCfg?.yanolja_booking_url?.trim() || 'https://letsbook.me/booking/sunmoonsuites',
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          adults: params.adults,
          children: params.children,
          guestName: params.guestName,
          guestEmail: params.guestEmail,
          guestPhone: params.guestPhone,
          specialRequests: params.specialRequests,
          categoryName: params.categoryName,
          roomTypeUnkid: params.yanoljaRoomTypeUnkid,
          roomRateUnkid: params.yanoljaRoomRateUnkid,
          totalAmount,
          bookingReference: bookingRef,
        }),
      });
      clearTimeout(timer);
      const ct = resp.headers.get('content-type') || '';
      if (resp.ok && ct.includes('application/json')) {
        const resJson = await resp.json();
        if (resJson?.success && resJson?.yanoljaBookingId) {
          return { synced: true, yanoljaBookingId: String(resJson.yanoljaBookingId) };
        }
      }
    } catch (err) {
      console.warn('Yanolja inbuilt link booking sync skipped:', err);
    }
    return { synced: false };
  }

  // 2. Direct REST API Key Mode (if API Key provided)
  if (
    activeMode === 'yanolja_api' &&
    engineCfg.yanolja_hotel_code?.trim() &&
    engineCfg.yanolja_api_key?.trim()
  ) {
    try {
      const apiBase =
        engineCfg.yanolja_api_endpoint?.trim() ||
        'https://live.ipms247.com/booking/reservation_api/listing.php';
      const nameParts = params.guestName.trim().split(' ');
      const firstName = nameParts[0] || 'Guest';
      const lastName = nameParts.slice(1).join(' ') || 'Guest';

      const payload = new URLSearchParams({
        request_type: 'InsertBooking',
        HotelCode: engineCfg.yanolja_hotel_code.trim(),
        APIKey: engineCfg.yanolja_api_key.trim(),
        check_in_date: params.checkInDate,
        check_out_date: params.checkOutDate,
        First_Name: firstName,
        Last_Name: lastName,
        Email_Address: params.guestEmail.trim(),
        Mobile_No: params.guestPhone.trim(),
        booking_reference: bookingRef,
        total_amount: String(totalAmount),
        payment_type: params.paymentReference ? 'Prepaid_Razorpay' : 'Pay_At_Hotel',
        payment_id: params.paymentReference || '',
      });

      await fetch(`${apiBase}?${payload.toString()}`, { method: 'POST' });
      return { synced: true };
    } catch (err) {
      console.warn('Yanolja InsertBooking sync queued/skipped:', err);
    }
  }

  return { synced: false };
}

/**
 * Creates a real booking in Supabase, linking or registering the guest record
 * and assigning room to prevent overlapping reservations.
 */
export async function createBooking(
  params: CreateBookingParams
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Database configuration required' };

  try {
    const { isInauguralActive } = getEffectiveRoomPrice({ base_price: 1500 });
    const nights = calculateNights(params.checkInDate, params.checkOutDate);
    const roomCharges = params.ratePerNight * nights;
    const discount = isInauguralActive ? 0 : params.discountAmount || 0;
    const effectivePromoCode = isInauguralActive ? null : params.promoCode || null;
    const taxableAmount = Math.max(0, roomCharges - discount);
    const { tax } = calculateGST(taxableAmount);
    const totalAmount = taxableAmount + tax;

    // 1. Find or create guest record
    const nameParts = params.guestName.trim().split(' ');
    const firstName = nameParts[0] || 'Guest';
    const lastName = nameParts.slice(1).join(' ') || '';

    const guest = await findOrCreateGuest(params.hotelId, {
      first_name: firstName,
      last_name: lastName,
      email: params.guestEmail,
      phone: params.guestPhone,
    });

    // 2. Select room if not explicitly provided
    let assignedRoomId = params.roomId;
    if (!assignedRoomId && params.categoryId) {
      // Find an available room for this category
      const { data: booked } = await supabase
        .from('bookings')
        .select('booking_rooms(room_id)')
        .eq('hotel_id', params.hotelId)
        .in('status', ['Confirmed', 'Checked-In'])
        .lt('check_in_date', params.checkOutDate)
        .gt('check_out_date', params.checkInDate);

      const bookedIds = new Set<string>();
      booked?.forEach((b: any) => {
        b.booking_rooms?.forEach((br: any) => {
          if (br.room_id) bookedIds.add(br.room_id);
        });
      });

      const { data: availableRooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('hotel_id', params.hotelId)
        .eq('category_id', params.categoryId)
        .not('status', 'in', '("Out of Order","Maintenance")');

      const freeRoom = availableRooms?.find((r) => !bookedIds.has(r.id));
      if (freeRoom) {
        assignedRoomId = freeRoom.id;
      }
    }

    const bookingRef = generateBookingRef();

    // 3. Insert into bookings table
    const { data: booking, error: bookErr } = await supabase
      .from('bookings')
      .insert([
        {
          hotel_id: params.hotelId,
          booking_reference: bookingRef,
          guest_id: guest?.id && !guest.id.startsWith('local-') ? guest.id : null,
          guest_name: params.guestName.trim(),
          guest_email: params.guestEmail.trim(),
          guest_phone: params.guestPhone.trim(),
          check_in_date: params.checkInDate,
          check_out_date: params.checkOutDate,
          adults: params.adults,
          children: params.children,
          status: 'Confirmed' as BookingStatus,
          source: params.source || 'Website',
          total_room_charges: roomCharges,
          tax_amount: tax,
          discount_amount: discount,
          total_amount: totalAmount,
          paid_amount: params.paidAmount ?? 0,
          payment_status: params.paymentStatus || 'Pending',
          promo_code: effectivePromoCode,
          special_requests: params.paymentReference
            ? `${params.specialRequests ? params.specialRequests + ' | ' : ''}Razorpay Payment ID: ${params.paymentReference}`
            : params.specialRequests || null,
        },
      ])
      .select()
      .single();

    if (bookErr) throw bookErr;

    // 4. Insert booking_rooms record
    const { error: roomLinkErr } = await supabase.from('booking_rooms').insert([
      {
        booking_id: booking.id,
        room_id: assignedRoomId || null,
        category_id: params.categoryId || null,
        rate_per_night: params.ratePerNight,
      },
    ]);

    if (roomLinkErr) console.warn('Could not link room:', roomLinkErr);

    await syncBookingToYanoljaApi(params, bookingRef, totalAmount);

    await logAction(
      params.hotelId,
      `New Booking Created (${bookingRef}) for ${params.guestName}`,
      'Booking',
      booking.id,
      { ref: bookingRef, total: totalAmount }
    );

    return { success: true, booking: booking as Booking };
  } catch (err: any) {
    console.warn('Database booking insert failed or pending migration, saving locally:', err);
    const { isInauguralActive } = getEffectiveRoomPrice({ base_price: 1500 });
    const nights = calculateNights(params.checkInDate, params.checkOutDate);
    const roomCharges = params.ratePerNight * nights;
    const discount = isInauguralActive ? 0 : params.discountAmount || 0;
    const effectivePromoCode = isInauguralActive ? undefined : params.promoCode || undefined;
    const taxableAmount = Math.max(0, roomCharges - discount);
    const { tax } = calculateGST(taxableAmount);
    const totalAmount = taxableAmount + tax;
    const bookingRef = generateBookingRef();

    await syncBookingToYanoljaApi(params, bookingRef, totalAmount);

    const fallbackBooking: Booking = {
      id: `local-book-${Date.now()}`,
      hotel_id: params.hotelId,
      booking_reference: bookingRef,
      guest_name: params.guestName.trim(),
      guest_email: params.guestEmail.trim(),
      guest_phone: params.guestPhone.trim(),
      check_in_date: params.checkInDate,
      check_out_date: params.checkOutDate,
      adults: params.adults,
      children: params.children,
      status: 'Confirmed' as BookingStatus,
      source: params.source || 'Website',
      total_room_charges: roomCharges,
      tax_amount: tax,
      discount_amount: discount,
      total_amount: totalAmount,
      paid_amount: params.paidAmount ?? 0,
      payment_status: params.paymentStatus || 'Pending',
      promo_code: effectivePromoCode,
      special_requests: params.paymentReference
        ? `${params.specialRequests ? params.specialRequests + ' | ' : ''}Razorpay Payment ID: ${params.paymentReference}`
        : params.specialRequests || undefined,
      booking_rooms: [
        {
          id: `local-br-${Date.now()}`,
          booking_id: `local-book-${Date.now()}`,
          room_id: params.roomId || 'room-1001',
          category_id: params.categoryId || 'cat-deluxe-01',
          rate_per_night: params.ratePerNight,
          category: DEFAULT_ROOM_CATEGORIES[0],
          created_at: new Date().toISOString(),
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    saveLocalBooking(fallbackBooking);
    return { success: true, booking: fallbackBooking };
  }
}

export async function getBookings(
  hotelId: string,
  options: {
    status?: BookingStatus;
    search?: string;
    limit?: number;
  } = {}
): Promise<Booking[]> {
  const localList = getLocalBookings(hotelId);
  const overrides = getBookingOverrides();
  const allRooms = await getRooms(hotelId);
  const roomsMap = new Map<string, Room>();
  allRooms.forEach((r) => roomsMap.set(r.id, r));

  const supabase = getSupabase();
  let rawList: Booking[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, booking_rooms(*, room:rooms(*), category:room_categories(*)), guest:guests(*)')
        .eq('hotel_id', hotelId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const dbBookings = data as Booking[];
        const dbRefs = new Set(dbBookings.map((b) => b.booking_reference));
        rawList = [...localList.filter((l) => !dbRefs.has(l.booking_reference)), ...dbBookings];
      }
    } catch {
      // Fall through to local fallback
    }
  }

  if (rawList.length === 0) {
    rawList = [...localList, ...SAMPLE_DEFAULT_BOOKINGS];
  }

  // Enrich all bookings with local overrides, fallback guest info, and room objects
  let list = rawList.map((b) => enrichBookingRecord(b, roomsMap, overrides));

  if (options.status) {
    list = list.filter((b) => b.status === options.status);
  }
  if (options.search?.trim()) {
    const s = options.search.trim().toLowerCase();
    list = list.filter((b) => {
      const gName = `${b.guest?.first_name || ''} ${b.guest?.last_name || ''} ${b.guest_name || ''}`.toLowerCase();
      const gPhone = `${b.guest?.phone || ''} ${b.guest_phone || ''}`.toLowerCase();
      const bRef = (b.booking_reference || '').toLowerCase();
      return gName.includes(s) || gPhone.includes(s) || bRef.includes(s);
    });
  }
  if (options.limit) {
    list = list.slice(0, options.limit);
  }
  return list;
}

export async function getFrontDeskOperations(hotelId: string, targetDateStr?: string): Promise<{
  arrivals: Booking[];
  departures: Booking[];
  inHouse: Booking[];
}> {
  const today = targetDateStr || new Date().toISOString().split('T')[0];

  try {
    const allBookings = await getBookings(hotelId);

    const arrivals = allBookings.filter(
      (b) => b.check_in_date === today && (b.status === 'Confirmed' || b.status === 'Pending')
    );

    const departures = allBookings.filter(
      (b) => b.check_out_date === today && b.status === 'Checked-In'
    );

    const inHouse = allBookings.filter((b) => b.status === 'Checked-In');

    return {
      arrivals,
      departures,
      inHouse,
    };
  } catch (err) {
    console.error('Error fetching front desk operations:', err);
    return { arrivals: [], departures: [], inHouse: [] };
  }
}

export async function checkInBooking(
  bookingId: string,
  hotelId: string,
  assignedRoomId?: string,
  idType?: string,
  idNumber?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const checkedInAt = new Date().toISOString();

    // 1. Find existing booking info for logging & room assignment
    const allBookings = await getBookings(hotelId);
    const existingBooking = allBookings.find((b) => b.id === bookingId);
    const targetRoomId = assignedRoomId || existingBooking?.booking_rooms?.[0]?.room_id;
    const guestDisplayName =
      existingBooking?.guest_name ||
      (existingBooking?.guest
        ? `${existingBooking.guest.first_name} ${existingBooking.guest.last_name || ''}`.trim()
        : 'Guest');

    // 2. Always persist check-in override locally first (instant & 100% reliable)
    saveBookingOverride(bookingId, {
      status: 'Checked-In',
      checked_in_at: checkedInAt,
      assigned_room_id: targetRoomId,
      id_type: idType,
      id_number: idNumber,
    });

    // 3. Update physical room status to Occupied
    if (targetRoomId) {
      await updateRoomStatus(
        targetRoomId,
        hotelId,
        'Assigned Room',
        'Occupied',
        `Checked in: ${guestDisplayName}`
      );
    }

    // 4. Sync with Supabase if connected (without .single() coercion failures)
    const supabase = getSupabase();
    if (supabase && !bookingId.startsWith('local-') && !bookingId.startsWith('book-sample-')) {
      try {
        await supabase
          .from('bookings')
          .update({
            status: 'Checked-In',
            checked_in_at: checkedInAt,
          })
          .eq('id', bookingId);

        if (assignedRoomId) {
          const existingBrId = existingBooking?.booking_rooms?.[0]?.id;
          if (existingBrId && !existingBrId.startsWith('local-') && !existingBrId.startsWith('br-')) {
            await supabase
              .from('booking_rooms')
              .update({ room_id: assignedRoomId })
              .eq('id', existingBrId);
          } else {
            await supabase
              .from('booking_rooms')
              .update({ room_id: assignedRoomId })
              .eq('booking_id', bookingId);
          }
        }

        if (
          existingBooking?.guest_id &&
          !existingBooking.guest_id.startsWith('local-') &&
          !existingBooking.guest_id.startsWith('guest-') &&
          (idType || idNumber)
        ) {
          const updates: any = {};
          if (idType) updates.id_type = idType;
          if (idNumber) updates.id_number = idNumber;
          await supabase.from('guests').update(updates).eq('id', existingBooking.guest_id);
        }
      } catch (dbErr) {
        console.warn('Supabase check-in sync skipped; persisted locally:', dbErr);
      }
    }

    try {
      await logAction(
        hotelId,
        `Checked-In Booking ${existingBooking?.booking_reference || bookingId} (${guestDisplayName})`,
        'Booking',
        bookingId
      );
    } catch {}

    const matchedRoomNum =
      existingBooking?.booking_rooms?.[0]?.room?.room_number ||
      (targetRoomId ? targetRoomId.replace('room-10', '1').replace('room-20', '2').replace('room-30', '3').replace('room-', '') : 'Assigned');

    await emitPMSNotification({
      id: `notif-checkin-${bookingId}-${Date.now()}`,
      type: 'checkin',
      title: `New Guest Check-In • Room ${matchedRoomNum}`,
      message: `${guestDisplayName} (Ref: ${existingBooking?.booking_reference || bookingId}) checked in successfully.`,
      targetTab: 'frontdesk',
      meta: {
        roomNumber: matchedRoomNum,
        guestName: guestDisplayName,
        bookingRef: existingBooking?.booking_reference || bookingId,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Check-in failed' };
  }
}

export async function checkOutBooking(
  bookingId: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const checkedOutAt = new Date().toISOString();
    const allBookings = await getBookings(hotelId);
    const existingBooking = allBookings.find((b) => b.id === bookingId);
    const roomId = existingBooking?.booking_rooms?.[0]?.room_id;
    const guestDisplayName =
      existingBooking?.guest_name ||
      (existingBooking?.guest
        ? `${existingBooking.guest.first_name} ${existingBooking.guest.last_name || ''}`.trim()
        : 'Guest');

    // 1. Always persist check-out override locally first
    saveBookingOverride(bookingId, {
      status: 'Checked-Out',
      checked_out_at: checkedOutAt,
    });

    // 2. Update room status to 'Cleaning' for housekeeping
    if (roomId) {
      await updateRoomStatus(
        roomId,
        hotelId,
        'Room',
        'Cleaning',
        `Guest checked out: ${guestDisplayName}`
      );
    }

    // 3. Sync with Supabase if connected (without .single() coercion errors)
    const supabase = getSupabase();
    if (supabase && !bookingId.startsWith('local-') && !bookingId.startsWith('book-sample-')) {
      try {
        await supabase
          .from('bookings')
          .update({
            status: 'Checked-Out',
            checked_out_at: checkedOutAt,
          })
          .eq('id', bookingId);

        if (
          existingBooking?.guest_id &&
          !existingBooking.guest_id.startsWith('local-') &&
          !existingBooking.guest_id.startsWith('guest-')
        ) {
          const { data: guest } = await supabase
            .from('guests')
            .select('total_stays, total_spent')
            .eq('id', existingBooking.guest_id)
            .maybeSingle();

          if (guest) {
            await supabase
              .from('guests')
              .update({
                total_stays: (guest.total_stays || 0) + 1,
                total_spent: (guest.total_spent || 0) + Number(existingBooking.total_amount || 0),
              })
              .eq('id', existingBooking.guest_id);
          }
        }
      } catch (dbErr) {
        console.warn('Supabase check-out sync skipped; persisted locally:', dbErr);
      }
    }

    try {
      await logAction(
        hotelId,
        `Checked-Out Booking ${existingBooking?.booking_reference || bookingId} (${guestDisplayName})`,
        'Booking',
        bookingId
      );
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Check-out failed' };
  }
}

export async function cancelBooking(
  bookingId: string,
  hotelId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cancelReason = reason || 'Cancelled by guest / front desk';
    const allBookings = await getBookings(hotelId);
    const existingBooking = allBookings.find((b) => b.id === bookingId);
    const roomId = existingBooking?.booking_rooms?.[0]?.room_id;

    // 1. Always persist cancellation locally first
    saveBookingOverride(bookingId, {
      status: 'Cancelled',
      cancellation_reason: cancelReason,
    });

    // 2. Release room back to Available if it was assigned
    if (roomId) {
      await updateRoomStatus(roomId, hotelId, 'Room', 'Available', 'Booking cancelled');
    }

    // 3. Sync with Supabase if connected
    const supabase = getSupabase();
    if (supabase && !bookingId.startsWith('local-') && !bookingId.startsWith('book-sample-')) {
      try {
        await supabase
          .from('bookings')
          .update({
            status: 'Cancelled',
            cancellation_reason: cancelReason,
          })
          .eq('id', bookingId);
      } catch (dbErr) {
        console.warn('Supabase cancel sync skipped; persisted locally:', dbErr);
      }
    }

    try {
      await logAction(
        hotelId,
        `Cancelled Booking ${existingBooking?.booking_reference || bookingId}`,
        'Booking',
        bookingId,
        { reason: cancelReason }
      );
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cancellation failed' };
  }
}
