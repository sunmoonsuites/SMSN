import React, { useEffect, useState } from 'react';
import { Hotel, Payment } from '../../types';
import { getPayments } from '../../services/billingService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { CreditCard, Search, CheckCircle } from 'lucide-react';

interface PaymentsViewProps {
  hotel: Hotel | null;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({ hotel }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (hotel?.id) {
      loadPayments();
    }
  }, [hotel?.id]);

  const loadPayments = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getPayments(hotel.id);
    setPayments(data);
    setIsLoading(false);
  };

  const filtered = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const method = (p.payment_method || '').toLowerCase();
    const ref = (p.transaction_reference || '').toLowerCase();
    return method.includes(q) || ref.includes(q);
  });

  const totalCollected = filtered.reduce((sum, p) => (p.status === 'Completed' ? sum + p.amount : sum), 0);

  if (isLoading) {
    return <LoadingSpinner message="Fetching payment transaction ledgers..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">Payment Transactions</h3>
          <p className="text-xs text-stone-500">
            Real-time ledger of Cash, UPI, Card, and Razorpay settlements
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by method, UTR reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
          />
        </div>
      </div>

      {/* Summary Card */}
      <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Total Settled Collections
          </span>
          <div className="text-3xl font-serif font-bold text-emerald-700 mt-1">
            {formatINR(totalCollected)}
          </div>
          <span className="text-[11px] text-stone-400">{filtered.length} transactions recorded</span>
        </div>
        <CreditCard className="w-10 h-10 text-emerald-600/60" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Payment Records"
            message={
              payments.length === 0
                ? 'No payments have been recorded in the database yet.'
                : 'No payments match your search filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Date &amp; Time</th>
                  <th className="px-6 py-3">Payment Method</th>
                  <th className="px-6 py-3">Reference / UTR</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3.5 text-stone-600">{formatDate(p.created_at)}</td>
                    <td className="px-6 py-3.5 font-semibold text-stone-900">{p.payment_method}</td>
                    <td className="px-6 py-3.5 font-mono text-stone-600">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : p.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-serif font-bold text-stone-900 text-right">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
