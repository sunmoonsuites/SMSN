import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  Smartphone,
  Laptop,
  Tablet,
  RefreshCw,
  Phone,
  MessageCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { BookingIntentSummary, BookingIntentLog } from '../../types';
import { getBookingIntentSummary } from '../../services/bookingIntentService';
import { getSupabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';

interface BookingIntentWidgetProps {
  hotelId?: string;
  onNavigateTab?: (tab: string) => void;
}

export const BookingIntentWidget: React.FC<BookingIntentWidgetProps> = ({
  hotelId,
  onNavigateTab,
}) => {
  const [summary, setSummary] = useState<BookingIntentSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'all' | 'leads' | 'converted'>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getBookingIntentSummary(hotelId);
      setSummary(res);
    } catch (e) {
      console.warn('[BookingIntentWidget] Load error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 20 seconds
    const interval = setInterval(loadData, 20000);

    // Listen for realtime intent inserts/updates in Supabase
    let channel: any;
    try {
      const supabase = getSupabase();
      if (supabase) {
        channel = supabase
          .channel('pms_realtime_booking_intents')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'booking_intent_logs' },
            () => {
              loadData();
            }
          )
          .subscribe();
      }
    } catch (e) {
      console.debug('[BookingIntentWidget] Realtime setup error:', e);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          const supabase = getSupabase();
          if (supabase) supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [hotelId]);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'hero_check_availability':
        return { label: 'Hero "Check Availability"', bg: 'bg-amber-100 text-amber-900 border-amber-200' };
      case 'navbar_book_now':
        return { label: 'Navbar "Book Now"', bg: 'bg-stone-100 text-stone-800 border-stone-200' };
      case 'mobile_sticky_bar':
        return { label: 'Mobile Sticky Bar', bg: 'bg-indigo-100 text-indigo-900 border-indigo-200' };
      case 'room_card':
        return { label: 'Room Card "Book"', bg: 'bg-blue-100 text-blue-900 border-blue-200' };
      case 'seo_landing_page':
        return { label: 'SEO Landing Page', bg: 'bg-teal-100 text-teal-900 border-teal-200' };
      case 'offer_code':
        return { label: 'Promo / Offer Code', bg: 'bg-purple-100 text-purple-900 border-purple-200' };
      case 'floating_whatsapp':
        return { label: 'Floating WhatsApp', bg: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'mobile_whatsapp_button':
        return { label: 'Mobile WhatsApp', bg: 'bg-emerald-100 text-emerald-900 border-emerald-200' };
      case 'mobile_call_button':
        return { label: 'Mobile Phone Call', bg: 'bg-stone-100 text-stone-800 border-stone-200' };
      default:
        return { label: source || 'Website CTA', bg: 'bg-stone-100 text-stone-700 border-stone-200' };
    }
  };

  const formatRelativeTime = (isoStr: string) => {
    try {
      const diffMs = Date.now() - new Date(isoStr).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return formatDate(isoStr);
    } catch {
      return 'Recently';
    }
  };

  const filteredIntents = (summary?.recentIntents || []).filter((item) => {
    if (filterMode === 'leads') {
      return Boolean(item.guest_phone || item.guest_name);
    }
    if (filterMode === 'converted') {
      return Boolean(item.converted_to_booking);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
      {/* Header Bar */}
      <div className="p-5 sm:p-6 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-50 via-white to-amber-50/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h4 className="font-serif font-bold text-stone-900 text-base sm:text-lg flex items-center gap-1.5">
              <span>Website Booking Intent &amp; Footfall Analytics</span>
              <span className="text-[10px] font-sans font-semibold tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                LIVE
              </span>
            </h4>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Real-time feed of guests who clicked &ldquo;Check Availability&rdquo; or &ldquo;Book Now&rdquo; on Sun Moon Suites.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh intent analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-700' : 'text-stone-500'}`} />
            <span>{isLoading ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Top 4 Funnel Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 sm:p-6 border-b border-stone-200 bg-stone-50/50">
        {/* Total Intent Clicks Today */}
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <span>Availability Checks</span>
            <Search className="w-3.5 h-3.5 text-amber-700" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {summary?.todayIntentCount ?? 0}
          </div>
          <p className="text-[10px] text-stone-400">Total &ldquo;Book Now&rdquo; clicks today</p>
        </div>

        {/* Confirmed Bookings */}
        <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            <span>Converted Bookings</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-950">
            {summary?.todayConvertedCount ?? 0}
          </div>
          <p className="text-[10px] text-emerald-600 font-medium">Completed reservations</p>
        </div>

        {/* Dropped / In Progress */}
        <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            <span>Lookers / Dropped</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-950">
            {summary?.todayDroppedCount ?? 0}
          </div>
          <p className="text-[10px] text-amber-700">Checked dates &amp; left</p>
        </div>

        {/* Conversion Rate */}
        <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            <span>Intent Conversion</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-stone-900">
            {summary?.conversionRate ?? 0}%
          </div>
          <p className="text-[10px] text-stone-400">Visitor-to-booking ratio</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-6 py-3 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              filterMode === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All Clicks ({summary?.recentIntents?.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('leads')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterMode === 'leads'
                ? 'bg-amber-800 text-white'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>With Guest Phone (Follow-Up Leads)</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('converted')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              filterMode === 'converted'
                ? 'bg-emerald-800 text-white'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            Confirmed Only
          </button>
        </div>

        <span className="text-[11px] text-stone-400 hidden sm:inline">
          Showing latest {filteredIntents.length} interactions
        </span>
      </div>

      {/* Activity Table */}
      {filteredIntents.length === 0 ? (
        <div className="p-8 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-stone-700">No booking intent events in this view</p>
          <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
            When guests browse Sun Moon Suites and click &ldquo;Check Availability&rdquo;, their searches and contact details appear here in real time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Guest / Visitor</th>
                <th className="px-5 py-3">Searched Dates</th>
                <th className="px-5 py-3">Clicked CTA Button</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {filteredIntents.map((item) => {
                const badge = getSourceBadge(item.button_source);
                const hasContact = Boolean(item.guest_phone);
                const cleanPhone = (item.guest_phone || '').replace(/\D/g, '');

                return (
                  <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Time & Device */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-stone-900">
                        {formatRelativeTime(item.created_at)}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-0.5">
                        {item.device_type === 'mobile' ? (
                          <Smartphone className="w-3 h-3 text-stone-400" />
                        ) : item.device_type === 'tablet' ? (
                          <Tablet className="w-3 h-3 text-stone-400" />
                        ) : (
                          <Laptop className="w-3 h-3 text-stone-400" />
                        )}
                        <span className="capitalize">{item.device_type || 'Device'}</span>
                      </div>
                    </td>

                    {/* Guest / Visitor */}
                    <td className="px-5 py-3.5">
                      {item.guest_name || item.guest_phone ? (
                        <div>
                          <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                            <span>{item.guest_name || 'Website Inquirer'}</span>
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                              Lead
                            </span>
                          </div>
                          {item.guest_phone && (
                            <div className="text-[11px] text-stone-600 font-mono mt-0.5">
                              {item.guest_phone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="text-stone-700 font-medium flex items-center gap-1.5">
                            <Users className="w-3 h-3 text-stone-400" />
                            <span>Anonymous Visitor</span>
                          </div>
                          <div className="text-[10px] text-stone-400 font-mono mt-0.5 truncate max-w-[120px]">
                            {item.visitor_id.slice(-8)}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Searched Dates */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {item.check_in && item.check_out ? (
                        <div>
                          <div className="font-medium text-stone-800">
                            {formatDate(item.check_in)} &rarr; {formatDate(item.check_out)}
                          </div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {item.guests_count || 2} Guests
                            {item.room_type_name && ` &bull; ${item.room_type_name}`}
                          </div>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">General Availability Check</span>
                      )}
                    </td>

                    {/* CTA Source */}
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {item.converted_to_booking ? (
                        <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Booked {item.booking_reference ? `(${item.booking_reference})` : ''}</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50/80 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Looker (Dropped)</span>
                        </div>
                      )}
                    </td>

                    {/* Quick Action */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {hasContact && !item.converted_to_booking ? (
                        <div className="inline-flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}?text=${encodeURIComponent(
                              `Hello from Sun Moon Suites, Sector 117 Noida! We noticed you checked room availability on our website for ${item.check_in || 'upcoming dates'}. Would you like assistance with special direct tariff discounts?`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Send WhatsApp recovery message"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="p-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors inline-flex items-center"
                            title="Call guest"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        </div>
                      ) : item.converted_to_booking && onNavigateTab ? (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('reservations')}
                          className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1"
                        >
                          <span>View Booking</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-stone-400">Anonymous Search</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
