/**
 * Database and Domain Types for Hotel Management System & Website
 * Target Property: 30 Rooms, Sector 117 Noida
 */

export type UserRole = 'SUPER ADMIN' | 'ADMIN' | 'FRONT DESK' | 'HOUSEKEEPING' | 'ACCOUNTS';

export type RoomStatus = 'Available' | 'Reserved' | 'Occupied' | 'Cleaning' | 'Maintenance' | 'Out of Order';

export type BookingStatus = 'Pending' | 'Confirmed' | 'Checked-In' | 'Checked-Out' | 'Cancelled' | 'No-Show';

export type PaymentStatus = 'Pending' | 'Partial' | 'Paid' | 'Refunded';

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Net Banking' | 'Razorpay' | 'Bank Transfer' | 'Cheque';

export type InvoiceStatus = 'Draft' | 'Unpaid' | 'Partially Paid' | 'Paid' | 'Void';

export type InvoiceItemCategory = 'Room' | 'Restaurant' | 'Laundry' | 'Mini Bar' | 'Service' | 'Other';

export interface AmenityItem {
  id: string;
  title: string;
  desc: string;
  iconName?: string;
  is_active?: boolean;
}

export interface LandmarkItem {
  id: string;
  title: string;
  time: string;
  desc: string;
  iconType?: string;
}

export interface BanquetConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  capacity?: string;
  events?: string;
  ambiance?: string;
  service?: string;
}

export interface HeroConfig {
  badge?: string;
  heading?: string;
  description?: string;
  image_url?: string;
  highlight1?: string;
  highlight2?: string;
  highlight3?: string;
}

export interface Hotel {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  gstin?: string;
  logo_url?: string;
  total_rooms: number;
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;
  plus_code?: string;
  check_in_time: string;
  check_out_time: string;
  currency: string;
  currency_symbol: string;
  created_at: string;
  updated_at: string;
  // Dynamic Website Customization
  hero_config?: HeroConfig;
  amenities_list?: AmenityItem[];
  landmarks_list?: LandmarkItem[];
  banquet_config?: BanquetConfig;
  cancellation_policy?: string;
  terms_and_conditions?: string;
  privacy_policy?: string;
  social_links?: SocialLinks;
  faq_items?: FAQItem[];
}

export interface BookingRules {
  min_stay_nights: number;
  max_stay_nights: number;
  allow_same_day_booking: boolean;
  advance_booking_days: number;
  child_age_free_limit: number;
  gst_rate_below_7500: number;
  gst_rate_above_7500: number;
}

export interface PaymentConfig {
  gateway_provider: 'Razorpay' | 'None';
  accept_cash_on_arrival: boolean;
  accept_upi: boolean;
  accept_card: boolean;
  online_payment_enabled: boolean;
  razorpay_key_id?: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tripadvisor?: string;
  google_business?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
}

export interface HotelSettings {
  id: string;
  hotel_id: string;
  booking_rules: BookingRules;
  cancellation_policy: string;
  terms_and_conditions: string;
  privacy_policy: string;
  payment_config: PaymentConfig;
  seo_title: string;
  meta_description: string;
  social_links: SocialLinks;
  faq_items: FAQItem[];
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  hotel_id?: string;
  full_name: string;
  email: string;
  role: UserRole;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type StaffRole = UserRole;
export type StaffUser = Profile;

export interface HousekeepingTask {
  id: string;
  hotel_id: string;
  room_id: string;
  room?: Room;
  task_type: 'Daily Cleaning' | 'Deep Cleaning' | 'Linen Change' | 'Inspection' | 'Maintenance';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed';
  assigned_to?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RoomCategory {
  id: string;
  hotel_id: string;
  name: string;
  slug: string;
  description?: string;
  base_price: number;
  max_adults: number;
  max_children: number;
  room_size_sqft: number;
  bed_type: string;
  amenities: string[];
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: string;
  hotel_id: string;
  category_id?: string;
  category?: RoomCategory;
  room_number: string;
  floor: 1 | 2 | 3;
  status: RoomStatus;
  is_smoking: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Guest {
  id: string;
  hotel_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;
  id_type?: 'Aadhaar' | 'Passport' | 'Driving License' | 'Voter ID' | 'Other';
  id_number?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  total_stays: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

export interface BookingRoom {
  id: string;
  booking_id: string;
  room_id?: string;
  category_id?: string;
  rate_per_night: number;
  room?: Room;
  category?: RoomCategory;
  created_at: string;
}

export interface Booking {
  id: string;
  hotel_id: string;
  booking_reference: string;
  guest_id?: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  adults: number;
  children: number;
  status: BookingStatus;
  source: 'Website' | 'Walk-in' | 'Phone' | 'OTA';
  total_room_charges: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: PaymentStatus;
  promo_code?: string;
  special_requests?: string;
  checked_in_at?: string;
  checked_out_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  booking_rooms?: BookingRoom[];
  guest?: Guest;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  category: InvoiceItemCategory;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  total: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  hotel_id: string;
  booking_id?: string;
  guest_id?: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: InvoiceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  booking?: Booking;
  guest?: Guest;
}

export interface Payment {
  id: string;
  hotel_id: string;
  booking_id?: string;
  invoice_id?: string;
  amount: number;
  payment_method: PaymentMethod;
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded';
  transaction_reference?: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  notes?: string;
  received_by?: string;
  payment_date: string;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  hotel_id: string;
  name: string;
  created_at: string;
}

export interface Expense {
  id: string;
  hotel_id: string;
  category_id?: string;
  category?: ExpenseCategory;
  date: string;
  vendor?: string;
  description: string;
  amount: number;
  payment_method: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque';
  notes?: string;
  attachment_url?: string;
  recorded_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RestaurantCategory {
  id: string;
  hotel_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface RestaurantItem {
  id: string;
  hotel_id: string;
  category_id?: string;
  category?: RestaurantCategory;
  name: string;
  description?: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  hotel_id: string;
  title: string;
  description?: string;
  promo_code: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_booking_amount: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  image_url?: string;
  terms?: string;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  hotel_id: string;
  category: string;
  image_url: string;
  caption?: string;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
}

export interface BanquetEnquiry {
  id: string;
  hotel_id: string;
  name: string;
  email: string;
  phone: string;
  event_date: string;
  event_type: 'Kitty Party' | 'Birthday' | 'Conference';
  guest_count: number;
  status: 'New' | 'Read' | 'Resolved';
  created_at: string;
}

export interface Enquiry {
  id: string;
  hotel_id: string;
  name: string;
  email: string;
  mobile: string;
  message: string;
  status: 'New' | 'Read' | 'Resolved';
  internal_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  hotel_id: string;
  user_id?: string;
  user_name?: string;
  action: string;
  entity: string;
  entity_id?: string;
  details: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  todayArrivalsCount: number;
  todayDeparturesCount: number;
  currentGuestsCount: number;
  availableRoomsCount: number;
  occupiedRoomsCount: number;
  pendingBookingsCount: number;
  todayRevenue: number;
  outstandingBalance: number;
}
