/**
 * Utility functions for Hotel Management System & Website
 */

export function formatINR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const trimmed = String(dateStr).trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return trimmed;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return trimmed;
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return formatDate(dateStr);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const timePart = d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dd}-${mm}-${yyyy}, ${timePart}`;
  } catch {
    return formatDate(dateStr);
  }
}

export function getTodayLocalDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getNextDayLocalDateStr(baseDateStr?: string): string {
  let d: Date;
  if (baseDateStr && /^\d{4}-\d{2}-\d{2}$/.test(baseDateStr)) {
    const [y, m, day] = baseDateStr.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date();
  }
  d.setDate(d.getDate() + 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

export function generateBookingRef(): string {
  const datePart = new Date().toISOString().slice(2, 7).replace('-', '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `BK-${datePart}-${randomPart}`;
}

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${randomPart}`;
}

export function calculateGST(amount: number): { rate: number; tax: number; total: number } {
  // Indian Hotel GST rules:
  // Room tariff <= ₹7,500/night -> 12% GST
  // Room tariff > ₹7,500/night -> 18% GST
  const rate = amount > 7500 ? 18 : 12;
  const tax = Math.round((amount * rate) / 100);
  return {
    rate,
    tax,
    total: amount + tax,
  };
}

export const DEFAULT_HOTEL_PHONE = '+91 8586868442';
export const DEFAULT_HOTEL_WHATSAPP = '918586868442';

/**
 * Returns a guaranteed clean, validated phone number, replacing any legacy demo number
 */
export function getCleanHotelPhone(rawPhone?: string | null): string {
  if (!rawPhone || rawPhone.includes('98765')) {
    return DEFAULT_HOTEL_PHONE;
  }
  return rawPhone;
}

/**
 * Returns a guaranteed clean, validated WhatsApp number in international format (e.g., 919313501001),
 * replacing any legacy demo number
 */
export function getCleanHotelWhatsApp(rawWhatsApp?: string | null): string {
  if (!rawWhatsApp || rawWhatsApp.includes('98765')) {
    return DEFAULT_HOTEL_WHATSAPP;
  }
  const digits = rawWhatsApp.replace(/\D/g, '');
  if (!digits || digits.includes('98765') || digits.length < 10) {
    return DEFAULT_HOTEL_WHATSAPP;
  }
  return digits.length === 10 ? `91${digits}` : digits;
}

export function getInitialHotelFast(): any {
  let localConfig: Record<string, any> = {};
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('sunmoon_hotel_cms_config_v1') : null;
    if (raw) localConfig = JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    id: localConfig.id || 'ca8ca4c4-d493-490f-8d30-774e8fca42b6',
    name: localConfig.name || 'Sun Moon Suites',
    tagline: localConfig.tagline || 'Modern Hospitality & Comfort in Noida',
    description:
      localConfig.description ||
      'Experience attentive hospitality at our 30-room hotel in Sector 117, Noida. Featuring well-appointed rooms across three floors, dedicated dining, and premier connectivity to the Noida Expressway.',
    address: localConfig.address || 'GT-20, Sector 117, Noida, Uttar Pradesh 201316',
    city: localConfig.city || 'Noida',
    state: localConfig.state || 'Uttar Pradesh',
    country: localConfig.country || 'India',
    pincode: localConfig.pincode || '201316',
    phone: getCleanHotelPhone(localConfig.phone),
    email: localConfig.email || 'sunmoonsuites@gmail.com',
    whatsapp: getCleanHotelWhatsApp(localConfig.whatsapp),
    gstin: localConfig.gstin || '09AAACH7409R1ZZ',
    total_rooms: localConfig.total_rooms || 30,
    latitude: localConfig.latitude ?? 28.5724,
    longitude: localConfig.longitude ?? 77.3892,
    google_maps_url:
      localConfig.google_maps_url ||
      'https://www.google.com/maps/search/?api=1&query=Sun+Moon+Suites+GT-20+Sector+117+Noida+Uttar+Pradesh+201316',
    plus_code: localConfig.plus_code || 'H9FW+8F',
    check_in_time: localConfig.check_in_time || '14:00',
    check_out_time: localConfig.check_out_time || '11:00',
    currency: 'INR',
    currency_symbol: '₹',
    ...localConfig,
  };
}

