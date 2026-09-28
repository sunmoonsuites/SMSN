import React, { useState, useEffect } from 'react';
import { Hotel, BanquetEnquiry, BanquetConfig } from '../../types';
import { getBanquetEnquiries, updateBanquetEnquiryStatus } from '../../services/banquetService';
import { updateHotel, DEFAULT_BANQUET_CONFIG } from '../../services/hotelService';
import { formatDate } from '../../lib/utils';
import {
  PartyPopper,
  Calendar,
  Users,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  Settings,
  MessageCircle,
  Save,
} from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

interface BanquetManagementViewProps {
  hotel: Hotel | null;
}

export const BanquetManagementView: React.FC<BanquetManagementViewProps> = ({ hotel }) => {
  const [activeSubTab, setActiveSubTab] = useState<'enquiries' | 'settings'>('enquiries');
  const [enquiries, setEnquiries] = useState<BanquetEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Banquet Hall settings form state
  const currentBanquet = hotel?.banquet_config || DEFAULT_BANQUET_CONFIG;
  const [title, setTitle] = useState(currentBanquet.title || 'Our Banquet Hall');
  const [subtitle, setSubtitle] = useState(currentBanquet.subtitle || 'Events & Gatherings');
  const [description, setDescription] = useState(
    currentBanquet.description ||
      'Host your special occasions in our elegant banquet hall, designed for comfort and versatility. Perfect for gatherings up to 50 guests.'
  );
  const [capacity, setCapacity] = useState(currentBanquet.capacity || 'Up to 50 Guests');
  const [events, setEvents] = useState(currentBanquet.events || 'Kitty Parties, Birthdays, Conferences');
  const [ambiance, setAmbiance] = useState(currentBanquet.ambiance || 'Elegant & Versatile');
  const [service, setService] = useState(currentBanquet.service || 'Tailored Catering');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadEnquiries();
    }
  }, [hotel?.id]);

  useEffect(() => {
    if (hotel?.banquet_config) {
      setTitle(hotel.banquet_config.title || 'Our Banquet Hall');
      setSubtitle(hotel.banquet_config.subtitle || 'Events & Gatherings');
      setDescription(hotel.banquet_config.description || '');
      setCapacity(hotel.banquet_config.capacity || 'Up to 50 Guests');
      setEvents(hotel.banquet_config.events || 'Kitty Parties, Birthdays, Conferences');
      setAmbiance(hotel.banquet_config.ambiance || 'Elegant & Versatile');
      setService(hotel.banquet_config.service || 'Tailored Catering');
    }
  }, [hotel?.banquet_config]);

  const loadEnquiries = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getBanquetEnquiries(hotel.id);
    setEnquiries(data);
    setIsLoading(false);
  };

  const handleStatusChange = async (id: string, status: BanquetEnquiry['status']) => {
    if (!hotel?.id) return;
    await updateBanquetEnquiryStatus(id, hotel.id, status);
    setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id) return;
    setIsSaving(true);
    const newConfig: BanquetConfig = {
      title,
      subtitle,
      description,
      capacity,
      events,
      ambiance,
      service,
    };
    await updateHotel(hotel.id, { banquet_config: newConfig });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900 flex items-center gap-2">
            <PartyPopper className="w-6 h-6 text-amber-800" />
            Banquet Hall &amp; Events
          </h3>
          <p className="text-xs text-stone-500">
            Manage incoming banquet enquiries, event bookings, and customize website hall details
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-stone-200/80 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSubTab('enquiries')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'enquiries'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Guest Enquiries ({enquiries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('settings')}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'settings'
                ? 'bg-white text-stone-900 shadow-2xs font-bold'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            Website Hall Details
          </button>
        </div>
      </div>

      {activeSubTab === 'enquiries' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-stone-200 bg-stone-50/50 flex items-center justify-between">
            <h4 className="font-serif font-bold text-sm text-stone-900">
              Received Banquet Inquiries
            </h4>
            <span className="text-xs text-stone-500">
              {enquiries.length} Total Enquiries
            </span>
          </div>

          {isLoading ? (
            <div className="p-8">
              <LoadingSpinner message="Loading banquet inquiries..." />
            </div>
          ) : enquiries.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<PartyPopper className="w-8 h-8 text-stone-400" />}
                title="No Banquet Enquiries Yet"
                message="When guests submit a banquet inquiry from the website, it will appear here with instant contact details."
              />
            </div>
          ) : (
            <div className="divide-y divide-stone-200 text-xs">
              {enquiries.map((enquiry) => (
                <div key={enquiry.id} className="p-4 sm:p-5 hover:bg-stone-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-stone-900">{enquiry.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                        {enquiry.event_type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          enquiry.status === 'New'
                            ? 'bg-rose-100 text-rose-800'
                            : enquiry.status === 'Read'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {enquiry.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-stone-500">
                      <span className="flex items-center gap-1 text-stone-700 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-amber-700" />
                        Event Date: {enquiry.event_date ? formatDate(enquiry.event_date) : 'Flexible'}
                      </span>
                      <span className="flex items-center gap-1 text-stone-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-amber-700" />
                        {enquiry.guest_count} Guests
                      </span>
                      <span className="text-stone-400">
                        Received {enquiry.created_at ? formatDate(enquiry.created_at) : 'recently'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 pt-1">
                      <a
                        href={`tel:${enquiry.phone.replace(/\D/g, '')}`}
                        className="flex items-center gap-1 text-stone-800 hover:text-amber-800 font-medium"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-700" />
                        {enquiry.phone}
                      </a>
                      <a
                        href={`https://wa.me/${enquiry.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        WhatsApp
                      </a>
                      {enquiry.email && (
                        <a
                          href={`mailto:${enquiry.email}`}
                          className="flex items-center gap-1 text-stone-600 hover:text-stone-900"
                        >
                          <Mail className="w-3.5 h-3.5 text-stone-500" />
                          {enquiry.email}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(enquiry.id, 'Read')}
                      className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer ${
                        enquiry.status === 'Read'
                          ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold'
                          : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      Mark Read
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(enquiry.id, 'Resolved')}
                      className={`px-3 py-1.5 rounded-lg border text-xs cursor-pointer flex items-center gap-1 ${
                        enquiry.status === 'Resolved'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                          : 'border-stone-300 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
          <div>
            <h4 className="font-serif font-bold text-base text-stone-900">
              Banquet Hall Website Content
            </h4>
            <p className="text-xs text-stone-500">
              Customize the titles, capacity, descriptions, and highlights displayed on the public website Banquet section.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Section Subtitle / Category
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Events & Gatherings"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Main Section Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Our Banquet Hall"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-serif font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Description Text
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Guest Capacity
                </label>
                <input
                  type="text"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Up to 50 Guests"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Suitable Events
                </label>
                <input
                  type="text"
                  value={events}
                  onChange={(e) => setEvents(e.target.value)}
                  placeholder="Kitty Parties, Birthdays, Conferences"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Ambiance Highlight
                </label>
                <input
                  type="text"
                  value={ambiance}
                  onChange={(e) => setAmbiance(e.target.value)}
                  placeholder="Elegant & Versatile"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Catering Service
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="Tailored Catering"
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Banquet website details updated successfully!</span>
              </div>
            )}

            <div className="pt-4 border-t border-stone-200 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-xs flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Banquet Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
