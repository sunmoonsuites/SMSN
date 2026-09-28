import React, { useEffect, useState } from 'react';
import { Hotel, Enquiry } from '../../types';
import { getEnquiries, updateEnquiryStatus } from '../../services/enquiriesService';
import { formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Inbox,
  Search,
  Eye,
  CheckCircle,
  Phone,
  Mail,
} from 'lucide-react';

interface EnquiriesViewProps {
  hotel: Hotel | null;
}

export const EnquiriesView: React.FC<EnquiriesViewProps> = ({ hotel }) => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  useEffect(() => {
    if (hotel?.id) {
      loadEnquiries();
    }
  }, [hotel?.id]);

  const loadEnquiries = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getEnquiries(hotel.id);
    setEnquiries(data);
    setIsLoading(false);
  };

  const handleUpdateStatus = async (id: string, status: Enquiry['status']) => {
    if (!hotel?.id) return;
    const res = await updateEnquiryStatus(id, hotel.id, status);
    if (res.success) {
      setEnquiries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status } : e))
      );
      if (selectedEnquiry?.id === id) {
        setSelectedEnquiry((prev) => (prev ? { ...prev, status } : null));
      }
    }
  };

  const filtered = enquiries.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    return true;
  });

  if (isLoading) {
    return <LoadingSpinner message="Fetching enquiries inbox from database..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Guest Enquiries Inbox
          </h3>
          <p className="text-xs text-stone-500">
            Messages from website visitors for room bookings, banquets, and events
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'New', 'Read', 'Resolved'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Enquiries Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Enquiries"
            message={
              enquiries.length === 0
                ? 'No guest messages have been received yet in the database.'
                : 'No enquiries match your active filter.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Received Date</th>
                  <th className="px-6 py-3">Name &amp; Contact</th>
                  <th className="px-6 py-3">Message</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3.5 text-stone-500">{formatDate(e.created_at)}</td>
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-stone-900">{e.name}</div>
                      <div className="text-[11px] text-stone-500">{e.mobile}</div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-stone-800 line-clamp-1 max-w-xs">
                      {e.message}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          e.status === 'New'
                            ? 'bg-amber-100 text-amber-800'
                            : e.status === 'Read'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedEnquiry(e)}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded text-xs"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW ENQUIRY MODAL */}
      {selectedEnquiry && (
        <Modal
          isOpen={Boolean(selectedEnquiry)}
          onClose={() => setSelectedEnquiry(null)}
          title={`Enquiry from ${selectedEnquiry.name}`}
          subtitle={`Received on ${formatDate(selectedEnquiry.created_at)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-700" />
                <span className="font-semibold text-stone-900">{selectedEnquiry.mobile}</span>
              </div>
              {selectedEnquiry.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-700" />
                  <span>{selectedEnquiry.email}</span>
                </div>
              )}
            </div>

            <div className="p-4 bg-white rounded-xl border border-stone-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase text-stone-500 block">
                Guest Message
              </span>
              <p className="text-stone-800 leading-relaxed whitespace-pre-wrap">
                {selectedEnquiry.message}
              </p>
            </div>

            {/* Quick Status Changers */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="font-bold text-stone-700 uppercase text-[10px]">
                Update Status:
              </span>
              <div className="flex gap-1.5">
                {(['New', 'Read', 'Resolved'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateStatus(selectedEnquiry.id, st)}
                    className={`px-2 py-1 text-[11px] font-semibold rounded cursor-pointer ${
                      selectedEnquiry.status === st
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
