import { getSupabase } from '../lib/supabase';
import { Invoice, InvoiceItem, Payment, PaymentMethod } from '../types';
import { logAction } from './auditService';
import { generateInvoiceNumber } from '../lib/utils';

const LOCAL_INVOICES_KEY = 'pms_custom_invoices';
const LOCAL_PAYMENTS_KEY = 'pms_custom_payments';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getLocalInvoices(): Invoice[] {
  try {
    const raw = localStorage.getItem(LOCAL_INVOICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalInvoices(list: Invoice[]) {
  try {
    localStorage.setItem(LOCAL_INVOICES_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

function getLocalPayments(): Payment[] {
  try {
    const raw = localStorage.getItem(LOCAL_PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalPayments(list: Payment[]) {
  try {
    localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(list));
  } catch {
    // Ignore
  }
}

export async function getInvoices(hotelId: string): Promise<Invoice[]> {
  const localList = getLocalInvoices();
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(hotelId)) return localList;

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*), booking:bookings(*), guest:guests(*)')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });

    if (error) return localList;
    const remoteList = (data as Invoice[]) || [];
    return remoteList.length > 0 ? remoteList : localList;
  } catch {
    return localList;
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const localMatch = getLocalInvoices().find((inv) => inv.id === id) || null;
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(id)) return localMatch;

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, items:invoice_items(*), booking:bookings(*), guest:guests(*)')
      .eq('id', id)
      .single();

    if (error) return localMatch;
    return (data as Invoice) || localMatch;
  } catch {
    return localMatch;
  }
}

export interface CreateInvoiceParams {
  hotelId: string;
  bookingId?: string;
  guestId?: string;
  guestName?: string;
  guestGstin?: string;
  guestPhone?: string;
  items: Array<{
    description: string;
    category: InvoiceItem['category'];
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
  discountAmount?: number;
  notes?: string;
}

export async function createInvoice(
  params: CreateInvoiceParams
): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
  const invoiceNumber = generateInvoiceNumber();

  let subtotal = 0;
  let taxTotal = 0;

  const computedItems: InvoiceItem[] = params.items.map((item, idx) => {
    const lineSubtotal = item.quantity * item.unit_price;
    const lineTax = (lineSubtotal * item.tax_rate) / 100;
    subtotal += lineSubtotal;
    taxTotal += lineTax;
    return {
      id: `item-${Date.now()}-${idx}`,
      invoice_id: '',
      description: item.description,
      category: item.category,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate,
      total: Math.round(lineSubtotal + lineTax),
      created_at: new Date().toISOString(),
    };
  });

  const discount = params.discountAmount || 0;
  const grandTotal = Math.max(0, Math.round(subtotal + taxTotal - discount));

  const nowIso = new Date().toISOString();
  const todayStr = nowIso.split('T')[0];

  const localInvoice: Invoice = {
    id: `inv-${Date.now()}`,
    hotel_id: params.hotelId || 'default-hotel-id',
    booking_id: params.bookingId,
    guest_id: params.guestId,
    invoice_number: invoiceNumber,
    issue_date: todayStr,
    due_date: todayStr,
    subtotal: Math.round(subtotal),
    tax_amount: Math.round(taxTotal),
    discount_amount: discount,
    total_amount: grandTotal,
    paid_amount: 0,
    balance_due: grandTotal,
    status: 'Unpaid',
    notes: params.notes,
    items: computedItems,
    guest: params.guestName
      ? {
          id: params.guestId || `guest-${Date.now()}`,
          hotel_id: params.hotelId || 'default-hotel-id',
          first_name: params.guestName.trim(),
          last_name: '',
          phone: params.guestPhone || '',
          gstin: params.guestGstin?.trim() || undefined,
          total_stays: 1,
          total_spent: grandTotal,
          created_at: nowIso,
          updated_at: nowIso,
        }
      : undefined,
    created_at: nowIso,
    updated_at: nowIso,
  };

  saveLocalInvoices([localInvoice, ...getLocalInvoices()]);

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(params.hotelId)) {
    try {
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert([
          {
            hotel_id: params.hotelId,
            booking_id: UUID_REGEX.test(params.bookingId || '') ? params.bookingId : null,
            guest_id: UUID_REGEX.test(params.guestId || '') ? params.guestId : null,
            invoice_number: invoiceNumber,
            subtotal: Math.round(subtotal),
            tax_amount: Math.round(taxTotal),
            discount_amount: discount,
            total_amount: grandTotal,
            paid_amount: 0,
            balance_due: grandTotal,
            status: 'Unpaid',
            notes: params.notes || null,
          },
        ])
        .select()
        .single();

      if (!invErr && invoice) {
        const itemsToInsert = computedItems.map((item) => ({
          invoice_id: invoice.id,
          description: item.description,
          category: item.category,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          total: item.total,
        }));
        await supabase.from('invoice_items').insert(itemsToInsert);
        await logAction(params.hotelId, `Generated Invoice ${invoiceNumber}`, 'Invoice', invoice.id, {
          total: grandTotal,
        });
        return { success: true, invoice: { ...(invoice as Invoice), items: computedItems } };
      }
    } catch {
      // Handled locally
    }
  }

  return { success: true, invoice: localInvoice };
}

export async function recordPayment(params: {
  hotelId: string;
  bookingId?: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  receivedById?: string;
}): Promise<{ success: boolean; payment?: Payment; error?: string }> {
  const localPayment: Payment = {
    id: `pay-${Date.now()}`,
    hotel_id: params.hotelId || 'default-hotel-id',
    booking_id: params.bookingId,
    invoice_id: params.invoiceId,
    amount: params.amount,
    payment_method: params.paymentMethod,
    status: 'Completed',
    transaction_reference: params.transactionReference,
    notes: params.notes,
    received_by: params.receivedById,
    payment_date: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  saveLocalPayments([localPayment, ...getLocalPayments()]);

  if (params.invoiceId) {
    const updatedInvoices = getLocalInvoices().map((inv) => {
      if (inv.id === params.invoiceId) {
        const newPaid = Number(inv.paid_amount || 0) + Number(params.amount);
        const newBalance = Math.max(0, Number(inv.total_amount) - newPaid);
        return {
          ...inv,
          paid_amount: newPaid,
          balance_due: newBalance,
          status: (newBalance === 0 ? 'Paid' : 'Partially Paid') as Invoice['status'],
        };
      }
      return inv;
    });
    saveLocalInvoices(updatedInvoices);
  }

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(params.hotelId)) {
    try {
      const { data: payment, error: pErr } = await supabase
        .from('payments')
        .insert([
          {
            hotel_id: params.hotelId,
            booking_id: UUID_REGEX.test(params.bookingId || '') ? params.bookingId : null,
            invoice_id: UUID_REGEX.test(params.invoiceId || '') ? params.invoiceId : null,
            amount: params.amount,
            payment_method: params.paymentMethod,
            status: 'Completed',
            transaction_reference: params.transactionReference || null,
            notes: params.notes || null,
            received_by: UUID_REGEX.test(params.receivedById || '') ? params.receivedById : null,
          },
        ])
        .select()
        .single();

      if (!pErr && payment) {
        return { success: true, payment: payment as Payment };
      }
    } catch {
      // Handled locally
    }
  }

  return { success: true, payment: localPayment };
}

export async function getPayments(hotelId: string): Promise<Payment[]> {
  const localList = getLocalPayments();
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(hotelId)) return localList;

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });

    if (error) return localList;
    const remoteList = (data as Payment[]) || [];
    return remoteList.length > 0 ? remoteList : localList;
  } catch {
    return localList;
  }
}
