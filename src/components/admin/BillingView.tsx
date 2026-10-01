import React, { useEffect, useState } from 'react';
import { Hotel, Invoice, PaymentMethod } from '../../types';
import {
  getInvoices,
  createInvoice,
  recordPayment,
} from '../../services/billingService';
import { getBookings } from '../../services/bookingService';
import { formatINR, formatDate, getCleanHotelPhone } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  FileText,
  Plus,
  Printer,
  CreditCard,
  Search,
  Eye,
  Trash2,
} from 'lucide-react';

interface BillingViewProps {
  hotel: Hotel | null;
}

function numberToIndianWords(amount: number): string {
  const num = Math.round(amount);
  if (num === 0) return 'Zero Rupees Only';

  const ones = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return `${tens[Math.floor(n / 10)]}${n % 10 !== 0 ? ' ' + ones[n % 10] : ''}`;
  };

  const convertThreeDigits = (n: number): string => {
    if (n < 100) return convertTwoDigits(n);
    return `${ones[Math.floor(n / 100)]} Hundred${
      n % 100 !== 0 ? ' and ' + convertTwoDigits(n % 100) : ''
    }`;
  };

  let remaining = num;
  const parts: string[] = [];

  if (remaining >= 10000000) {
    const crores = Math.floor(remaining / 10000000);
    parts.push(`${convertThreeDigits(crores)} Crore`);
    remaining %= 10000000;
  }
  if (remaining >= 100000) {
    const lakhs = Math.floor(remaining / 100000);
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    remaining %= 100000;
  }
  if (remaining >= 1000) {
    const thousands = Math.floor(remaining / 1000);
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
    remaining %= 1000;
  }
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  return `Rupees ${parts.join(' ')} Only`;
}

export const BillingView: React.FC<BillingViewProps> = ({ hotel }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // View / Print Invoice Modal
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  // New Invoice Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableBookings, setAvailableBookings] = useState<any[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<string>('');
  const [guestName, setGuestName] = useState('');
  const [guestGstin, setGuestGstin] = useState('');
  const [lineItems, setLineItems] = useState<
    { description: string; quantity: number; unit_price: number; tax_rate: number }[]
  >([
    { description: 'Room Tariff', quantity: 1, unit_price: 2500, tax_rate: 12 },
  ]);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  // Record Payment Modal
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('UPI');
  const [payRef, setPayRef] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadInvoices();
    }
  }, [hotel?.id]);

  const loadInvoices = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [invData, bkData] = await Promise.all([
      getInvoices(hotel.id),
      getBookings(hotel.id),
    ]);
    setInvoices(invData);
    setAvailableBookings(bkData);
    setIsLoading(false);
  };

  const getInvoiceGuestName = (inv: Invoice): string => {
    if (inv.guest) {
      return `${inv.guest.first_name} ${inv.guest.last_name || ''}`.trim();
    }
    if (inv.booking?.guest_name) {
      return inv.booking.guest_name;
    }
    return 'Walk-In Guest';
  };

  // Generates a standalone, clean A4 printable PDF receipt and triggers browser print / Save as PDF
  const handlePrintReceipt = (inv: Invoice) => {
    const hotelName = hotel?.name || 'Sun Moon Suites';
    const hotelAddress = `${hotel?.address || 'GT-20, Sector 117'}, ${hotel?.city || 'Noida'}, ${
      hotel?.state || 'Uttar Pradesh'
    } ${hotel?.pincode || '201316'}`;
    const hotelPhone = getCleanHotelPhone(hotel?.phone);
    const hotelEmail = hotel?.email || 'sunmoonsuites@gmail.com';
    const hotelGstin = hotel?.gstin || '09AAACH7409R1ZZ';
    const billedGuest = getInvoiceGuestName(inv);
    const billedGstin = inv.guest?.gstin || '';
    const cgstAmount = Math.round((inv.tax_amount || 0) / 2);
    const sgstAmount = (inv.tax_amount || 0) - cgstAmount;
    const paidAmount = Number(inv.paid_amount ?? inv.total_amount - inv.balance_due);
    const amountWords = numberToIndianWords(inv.total_amount);

    const itemsRowsHtml = (inv.items || [])
      .map((item, idx) => {
        const taxable = item.quantity * item.unit_price;
        const halfRate = (item.tax_rate || 0) / 2;
        return `
          <tr>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; font-weight: 600;">${item.description}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: center; font-family: monospace;">996311</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: right;">${formatINR(item.unit_price)}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: right;">${formatINR(taxable)}</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: right;">${halfRate}% + ${halfRate}%</td>
            <td style="padding: 10px 8px; border-bottom: 1px solid #e7e5e4; text-align: right; font-weight: 700;">${formatINR(item.total)}</td>
          </tr>
        `;
      })
      .join('');

    const statusBadgeColor =
      inv.status === 'Paid'
        ? '#065f46; background: #d1fae5; border: 1px solid #6ee7b7;'
        : inv.status === 'Partially Paid'
        ? '#92400e; background: #fef3c7; border: 1px solid #fcd34d;'
        : '#9f1239; background: #ffe4e6; border: 1px solid #fda4af;';

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt_${inv.invoice_number}_${hotelName.replace(/\s+/g, '_')}</title>
          <style>
            @page { size: A4 portrait; margin: 14mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #1c1917;
              margin: 0;
              padding: 0;
              font-size: 12px;
              line-height: 1.5;
              background: #fff;
            }
            .receipt-container {
              max-width: 780px;
              margin: 0 auto;
              border: 1px solid #d6d3d1;
              border-radius: 8px;
              padding: 28px;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #1c1917;
              padding-bottom: 16px;
              margin-bottom: 20px;
            }
            .hotel-title {
              font-family: Georgia, serif;
              font-size: 24px;
              font-weight: 700;
              color: #1c1917;
              margin: 0 0 4px 0;
            }
            .invoice-badge {
              font-size: 14px;
              font-weight: 800;
              letter-spacing: 1px;
              color: #92400e;
              text-transform: uppercase;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              margin-bottom: 20px;
              background: #fafaf9;
              border: 1px solid #e7e5e4;
              border-radius: 6px;
              padding: 14px 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th {
              background: #f5f5f4;
              color: #44403c;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 9px 8px;
              border-top: 1px solid #d6d3d1;
              border-bottom: 1px solid #d6d3d1;
            }
            .summary-section {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              margin-top: 12px;
            }
            .totals-box {
              width: 300px;
              border: 1px solid #e7e5e4;
              border-radius: 6px;
              padding: 12px 16px;
              background: #fafaf9;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
            }
            .totals-row.grand {
              border-top: 2px solid #1c1917;
              margin-top: 6px;
              padding-top: 8px;
              font-size: 15px;
              font-weight: 800;
            }
            .footer-sign {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 36px;
              padding-top: 16px;
              border-top: 1px dashed #d6d3d1;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <div>
                <h1 class="hotel-title">${hotelName}</h1>
                <div>${hotelAddress}</div>
                <div>Phone: ${hotelPhone} &bull; Email: ${hotelEmail}</div>
                <div style="margin-top: 4px; font-family: monospace; font-weight: 700; font-size: 12px;">
                  GSTIN: ${hotelGstin}
                </div>
              </div>
              <div style="text-align: right;">
                <div class="invoice-badge">TAX INVOICE &amp; RECEIPT</div>
                <div style="font-family: monospace; font-size: 15px; font-weight: 700; margin-top: 4px;">
                  ${inv.invoice_number}
                </div>
                <div style="color: #57534e; margin-top: 2px;">Issue Date: ${formatDate(inv.issue_date)}</div>
                <div style="margin-top: 6px;">
                  <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${statusBadgeColor}">
                    ${inv.status}
                  </span>
                </div>
              </div>
            </div>

            <div class="meta-grid">
              <div>
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #78716c;">Billed To (Guest / Corporate):</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 2px;">${billedGuest}</div>
                ${
                  billedGstin
                    ? `<div style="font-family: monospace; margin-top: 2px;">Customer GSTIN: <strong>${billedGstin}</strong></div>`
                    : ''
                }
                ${
                  inv.booking?.booking_reference
                    ? `<div style="color: #57534e; margin-top: 2px;">Booking Ref: ${inv.booking.booking_reference}</div>`
                    : ''
                }
              </div>
              <div style="text-align: right;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #78716c;">Place of Supply:</div>
                <div style="font-weight: 600; margin-top: 2px;">09 - Uttar Pradesh</div>
                <div style="color: #57534e; margin-top: 2px;">Hospitality &amp; Accommodation Services</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="text-align: center; width: 36px;">#</th>
                  <th style="text-align: left;">Description of Services</th>
                  <th style="text-align: center;">SAC</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Tariff / Rate</th>
                  <th style="text-align: right;">Taxable</th>
                  <th style="text-align: right;">CGST + SGST</th>
                  <th style="text-align: right;">Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRowsHtml}
              </tbody>
            </table>

            <div class="summary-section">
              <div style="flex: 1;">
                <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #78716c;">Amount in Words:</div>
                <div style="font-weight: 700; font-style: italic; margin-top: 2px; color: #292524;">
                  ${amountWords}
                </div>
                ${
                  inv.notes
                    ? `<div style="margin-top: 12px; font-size: 11px; color: #57534e;"><strong>Remarks:</strong> ${inv.notes}</div>`
                    : ''
                }
              </div>

              <div class="totals-box">
                <div class="totals-row">
                  <span style="color: #57534e;">Taxable Subtotal:</span>
                  <span style="font-weight: 600;">${formatINR(inv.subtotal)}</span>
                </div>
                <div class="totals-row">
                  <span style="color: #57534e;">CGST:</span>
                  <span>${formatINR(cgstAmount)}</span>
                </div>
                <div class="totals-row">
                  <span style="color: #57534e;">SGST:</span>
                  <span>${formatINR(sgstAmount)}</span>
                </div>
                ${
                  inv.discount_amount > 0
                    ? `<div class="totals-row" style="color: #047857;">
                        <span>Discount:</span>
                        <span>-${formatINR(inv.discount_amount)}</span>
                      </div>`
                    : ''
                }
                <div class="totals-row grand">
                  <span>Grand Total:</span>
                  <span>${formatINR(inv.total_amount)}</span>
                </div>
                <div class="totals-row" style="margin-top: 6px; color: #047857; font-weight: 600;">
                  <span>Amount Paid:</span>
                  <span>${formatINR(paidAmount)}</span>
                </div>
                <div class="totals-row" style="color: #be123c; font-weight: 700;">
                  <span>Balance Due:</span>
                  <span>${formatINR(inv.balance_due)}</span>
                </div>
              </div>
            </div>

            <div class="footer-sign">
              <div style="font-size: 11px; color: #57534e;">
                <div>1. Goods &amp; Services Tax compliant invoice.</div>
                <div>2. Check-out time is ${hotel?.check_out_time || '11:00'}. Disputes subject to गौतम बुद्ध नगर (Noida) jurisdiction.</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 700; font-size: 12px;">For ${hotelName}</div>
                <div style="margin-top: 32px; font-size: 11px; color: #78716c; border-top: 1px solid #a8a29e; padding-top: 4px;">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const existingFrame = document.getElementById('pms-receipt-print-frame');
      if (existingFrame) {
        existingFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'pms-receipt-print-frame';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (frameDoc && iframe.contentWindow) {
        frameDoc.open();
        frameDoc.write(receiptHtml);
        frameDoc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        }, 150);
        return;
      }
    } catch {
      // Fallback to modal + window.print()
    }

    setViewInvoice(inv);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: 'Restaurant Dining / Room Service', quantity: 1, unit_price: 500, tax_rate: 5 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || lineItems.length === 0) return;
    setIsCreatingInvoice(true);

    const invoiceItems = lineItems.map((item) => {
      return {
        description: item.description,
        category: 'Room' as const,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
      };
    });

    const res = await createInvoice({
      hotelId: hotel.id,
      bookingId: selectedBookingId || undefined,
      guestName: guestName.trim() || 'Guest',
      guestGstin: guestGstin.trim() || undefined,
      items: invoiceItems,
      notes: `Thank you for choosing ${hotel?.name || 'Sun Moon Suites'}.`,
    });

    setIsCreatingInvoice(false);

    if (res.success) {
      setShowCreateModal(false);
      setLineItems([{ description: 'Room Tariff', quantity: 1, unit_price: 2500, tax_rate: 12 }]);
      setGuestName('');
      setGuestGstin('');
      loadInvoices();
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !paymentInvoice || payAmount <= 0) return;
    setIsRecordingPayment(true);

    const res = await recordPayment({
      hotelId: hotel.id,
      invoiceId: paymentInvoice.id,
      bookingId: paymentInvoice.booking_id,
      amount: payAmount,
      paymentMethod: payMethod,
      transactionReference: payRef.trim() || undefined,
    });

    setIsRecordingPayment(false);

    if (res.success) {
      setPaymentInvoice(null);
      loadInvoices();
    }
  };

  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const num = (inv.invoice_number || '').toLowerCase();
    const guest = getInvoiceGuestName(inv).toLowerCase();
    return num.includes(q) || guest.includes(q);
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading GST billing records from database..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-800" />
            <span>GST Billing &amp; Printable Receipts</span>
          </h3>
          <p className="text-xs text-stone-500">
            Total {invoices.length} invoices &bull; Hotel GSTIN: {hotel?.gstin || '09AAACH7409R1ZZ'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New GST Invoice</span>
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search by invoice number or guest name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
        />
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            message={
              invoices.length === 0
                ? 'No invoices have been generated yet. Create a GST invoice to view or print a receipt.'
                : 'No invoices match your search query.'
            }
            actionLabel={invoices.length === 0 ? 'Create First Invoice' : undefined}
            onAction={invoices.length === 0 ? () => setShowCreateModal(true) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Issue Date</th>
                  <th className="px-5 py-3">Guest Name</th>
                  <th className="px-5 py-3">Taxable Amount</th>
                  <th className="px-5 py-3">GST Tax</th>
                  <th className="px-5 py-3">Total Amount</th>
                  <th className="px-5 py-3">Balance Due</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/50">
                    <td className="px-5 py-3.5 font-mono font-bold text-stone-900">
                      {inv.invoice_number}
                    </td>
                    <td className="px-5 py-3.5 text-stone-600">{formatDate(inv.issue_date)}</td>
                    <td className="px-5 py-3.5 font-medium text-stone-800">
                      {getInvoiceGuestName(inv)}
                    </td>
                    <td className="px-5 py-3.5">{formatINR(inv.subtotal)}</td>
                    <td className="px-5 py-3.5 text-stone-600">{formatINR(inv.tax_amount)}</td>
                    <td className="px-5 py-3.5 font-serif font-bold text-stone-900">
                      {formatINR(inv.total_amount)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-rose-700">
                      {formatINR(inv.balance_due)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'Partially Paid'
                            ? 'bg-amber-100 text-amber-800'
                            : inv.status === 'Unpaid'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-stone-200 text-stone-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewInvoice(inv)}
                          title="Preview Tax Invoice"
                          className="px-2.5 py-1 text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded font-medium text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintReceipt(inv)}
                          title="Generate & Print PDF Receipt"
                          className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-white font-semibold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Print Receipt</span>
                        </button>

                        {inv.balance_due > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentInvoice(inv);
                              setPayAmount(inv.balance_due);
                            }}
                            title="Record Payment"
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Pay</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW / PRINT GST INVOICE MODAL */}
      {viewInvoice && (
        <Modal
          isOpen={Boolean(viewInvoice)}
          onClose={() => setViewInvoice(null)}
          title={`Tax Invoice & Receipt: ${viewInvoice.invoice_number}`}
          subtitle="Printable A4 GST Invoice & Payment Receipt"
          maxWidth="2xl"
        >
          <div className="space-y-6 text-xs text-stone-800 p-2" id="printable-invoice">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b-2 border-stone-900 pb-4">
              <div>
                <h3 className="font-serif font-bold text-xl text-stone-900">
                  {hotel?.name || 'Sun Moon Suites'}
                </h3>
                <p className="text-stone-600 mt-0.5">
                  {hotel?.address || 'GT-20, Sector 117'}, {hotel?.city || 'Noida'},{' '}
                  {hotel?.state || 'Uttar Pradesh'} {hotel?.pincode || '201316'}
                </p>
                <p className="text-stone-600">
                  Phone: {getCleanHotelPhone(hotel?.phone)} &bull; Email:{' '}
                  {hotel?.email || 'sunmoonsuites@gmail.com'}
                </p>
                <p className="font-mono font-bold text-stone-900 mt-1">
                  GSTIN: {hotel?.gstin || '09AAACH7409R1ZZ'}
                </p>
              </div>

              <div className="text-right">
                <span className="font-bold uppercase tracking-wider text-amber-800 text-sm block">
                  TAX INVOICE &amp; RECEIPT
                </span>
                <span className="font-mono font-bold text-stone-900 text-sm block mt-1">
                  {viewInvoice.invoice_number}
                </span>
                <span className="text-stone-500 block">
                  Date: {formatDate(viewInvoice.issue_date)}
                </span>
                <span className="text-stone-500 block">State Code: 09 (Uttar Pradesh)</span>
              </div>
            </div>

            {/* Bill To */}
            <div className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold uppercase text-[10px] text-stone-500 block">
                  Billed To:
                </span>
                <p className="font-bold text-stone-900 text-sm">
                  {getInvoiceGuestName(viewInvoice)}
                </p>
                {viewInvoice.guest?.gstin && (
                  <p className="font-mono text-stone-700">
                    Customer GSTIN: {viewInvoice.guest.gstin}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-bold uppercase text-[10px] text-stone-500 block">
                  Payment Status:
                </span>
                <span
                  className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    viewInvoice.status === 'Paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : viewInvoice.status === 'Partially Paid'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {viewInvoice.status}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-y border-stone-300 bg-stone-100 text-stone-700 uppercase font-semibold text-[10px]">
                  <th className="py-2 px-2">Description</th>
                  <th className="py-2 px-2 text-center">SAC</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Unit Price</th>
                  <th className="py-2 px-2 text-right">Taxable</th>
                  <th className="py-2 px-2 text-right">GST Rate</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {viewInvoice.items?.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2.5 px-2 font-medium">{item.description}</td>
                    <td className="py-2.5 px-2 text-center font-mono text-[11px] text-stone-500">
                      996311
                    </td>
                    <td className="py-2.5 px-2 text-center">{item.quantity}</td>
                    <td className="py-2.5 px-2 text-right">{formatINR(item.unit_price)}</td>
                    <td className="py-2.5 px-2 text-right">
                      {formatINR(item.quantity * item.unit_price)}
                    </td>
                    <td className="py-2.5 px-2 text-right">{item.tax_rate}%</td>
                    <td className="py-2.5 px-2 text-right font-semibold">
                      {formatINR(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Amount in Words + Totals */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-stone-300 pt-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-stone-500 block">
                  Amount in Words:
                </span>
                <p className="font-semibold italic text-stone-800">
                  {numberToIndianWords(viewInvoice.total_amount)}
                </p>
                {viewInvoice.notes && (
                  <p className="text-[11px] text-stone-500 pt-1">{viewInvoice.notes}</p>
                )}
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-right">
                <div className="flex justify-between">
                  <span className="text-stone-600">Subtotal (Taxable):</span>
                  <span className="font-medium">{formatINR(viewInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">CGST + SGST:</span>
                  <span className="font-medium">{formatINR(viewInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-stone-900 pt-1.5 border-t border-stone-300">
                  <span>Grand Total:</span>
                  <span className="font-serif">{formatINR(viewInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-emerald-700">
                  <span>Amount Paid:</span>
                  <span>
                    {formatINR(
                      viewInvoice.paid_amount ??
                        viewInvoice.total_amount - viewInvoice.balance_due
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold text-rose-700">
                  <span>Balance Due:</span>
                  <span>{formatINR(viewInvoice.balance_due)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-stone-200 no-print">
              <button
                type="button"
                onClick={() => handlePrintReceipt(viewInvoice)}
                className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-lg flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Receipt / Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* CREATE INVOICE MODAL */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New GST Invoice"
        subtitle="Add room charges, restaurant food, or ancillary services"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Guest / Corporate Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Malhotra"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Guest GSTIN (Optional B2B)
              </label>
              <input
                type="text"
                placeholder="e.g. 07AAAAA0000A1Z5"
                value={guestGstin}
                onChange={(e) => setGuestGstin(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono uppercase"
              />
            </div>
          </div>

          {availableBookings.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Link to Existing Reservation (Optional)
              </label>
              <select
                value={selectedBookingId}
                onChange={(e) => {
                  const bkId = e.target.value;
                  setSelectedBookingId(bkId);
                  const found = availableBookings.find((b) => b.id === bkId);
                  if (found && found.guest_name && !guestName) {
                    setGuestName(found.guest_name);
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg bg-white"
              >
                <option value="">-- Walk-In / Standalone Invoice --</option>
                {availableBookings.map((bk) => (
                  <option key={bk.id} value={bk.id}>
                    {bk.booking_number} — {bk.guest_name || 'Guest'} ({formatDate(bk.check_in_date)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-700">
                Invoice Line Items
              </label>
              <button
                type="button"
                onClick={handleAddLineItem}
                className="text-xs text-amber-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Add Line Item
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-stone-50 rounded-lg border border-stone-200">
                <input
                  type="text"
                  required
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].description = e.target.value;
                    setLineItems(copy);
                  }}
                  className="flex-3 px-2 py-1 text-xs border border-stone-300 rounded bg-white"
                />
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].quantity = Number(e.target.value);
                    setLineItems(copy);
                  }}
                  className="w-14 px-2 py-1 text-xs border border-stone-300 rounded bg-white text-center"
                />
                <input
                  type="number"
                  min={0}
                  value={item.unit_price}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].unit_price = Number(e.target.value);
                    setLineItems(copy);
                  }}
                  className="w-24 px-2 py-1 text-xs border border-stone-300 rounded bg-white text-right"
                />
                <select
                  value={item.tax_rate}
                  onChange={(e) => {
                    const copy = [...lineItems];
                    copy[idx].tax_rate = Number(e.target.value);
                    setLineItems(copy);
                  }}
                  className="w-20 px-2 py-1 text-xs border border-stone-300 rounded bg-white"
                >
                  <option value={0}>0%</option>
                  <option value={5}>5%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveLineItem(idx)}
                    className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingInvoice}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {isCreatingInvoice ? 'Generating...' : 'Generate Invoice'}
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD PAYMENT MODAL */}
      {paymentInvoice && (
        <Modal
          isOpen={Boolean(paymentInvoice)}
          onClose={() => setPaymentInvoice(null)}
          title={`Record Payment for ${paymentInvoice.invoice_number}`}
          subtitle={`Balance Due: ${formatINR(paymentInvoice.balance_due)}`}
          maxWidth="md"
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Payment Amount (INR) *
              </label>
              <input
                type="number"
                required
                min={1}
                max={paymentInvoice.balance_due}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg font-serif font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Payment Method *
              </label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                <option value="Cash">Cash at Desk</option>
                <option value="Card">Debit / Credit Card (POS Terminal)</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Razorpay">Razorpay Online</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Transaction / Reference ID
              </label>
              <input
                type="text"
                placeholder="UPI UTR number / Card auth code"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setPaymentInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRecordingPayment}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                {isRecordingPayment ? 'Recording...' : `Record Payment (${formatINR(payAmount)})`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
