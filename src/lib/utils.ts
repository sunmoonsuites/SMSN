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
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
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

export const DEFAULT_HOTEL_PHONE = '+91 93135 01001';
export const DEFAULT_HOTEL_WHATSAPP = '919313501001';

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
