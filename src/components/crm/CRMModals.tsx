import React, { useState, useEffect } from 'react';
import {
  CRMLead,
  LeadStatus,
  LeadScore,
  LeadSource,
  LeadActivity,
  LeadSyncConfig,
  MetaSyncConfig,
  GmailCrmConfig,
  ReplyTemplatesConfig,
  CRMUserPermissions,
  convertGoogleSheetToCsvUrl,
} from '../../services/crmService';
import { getTodayLocalDateStr, getNextDayLocalDateStr } from '../../lib/utils';
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Share2,
  Settings,
  Database,
  Copy,
  Check,
  History,
  Phone,
  MessageCircle,
  Mail,
  UserCheck,
  Sparkles,
  Shield,
} from 'lucide-react';

// ============================================================================
// 1. ADD LEAD MODAL
// ============================================================================
interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lead: Partial<CRMLead>) => Promise<void> | void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>('website');
  const [score, setScore] = useState<LeadScore>('HOT');
  const [budget, setBudget] = useState('');
  const [guests, setGuests] = useState('2 Adults');
  const [city, setCity] = useState('Noida');
  const [bookingDate, setBookingDate] = useState(getTodayLocalDateStr());
  const [bookingTime, setBookingTime] = useState('14:00');
  const [assignedAgentName, setAssignedAgentName] = useState('Priya Verma');
  const [relevancy, setRelevancy] = useState<'Relevent' | 'Non Relevent'>('Relevent');
  const [extraTags, setExtraTags] = useState('VIP');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Guest / Lead Name is required.');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      setError('Please provide at least a Phone Number or Email Address.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const parsedExtra = extraTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const tags = Array.from(new Set([relevancy, ...parsedExtra]));

      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        source,
        score,
        status: 'new',
        budget: budget.trim(),
        guests: guests.trim(),
        city: city.trim(),
        booking_date: bookingDate || null,
        booking_time: bookingTime,
        assigned_agent_name: assignedAgentName,
        tags,
        remarks: remarks.trim(),
      });

      setName('');
      setPhone('');
      setEmail('');
      setBudget('');
      setRemarks('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-[#C8A45D] shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-[#C8A45D]/40">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#C8A45D]">
              Create New Luxury Lead
            </h3>
            <p className="text-xs text-slate-400">
              Add direct walk-in, phone enquiry, corporate event, or VIP stay lead
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Guest Full Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajeshwar Singhania"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone / WhatsApp *</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98110 00000"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@company.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lead Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as LeadSource)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white"
              >
                <option value="website">Website Enquiry</option>
                <option value="direct">Direct Phone / Walk-In</option>
                <option value="meta">Meta (FB / Instagram)</option>
                <option value="google_sheets">Google Sheets</option>
                <option value="manual">Manual Entry</option>
                <option value="referral">Corporate / VIP Referral</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Priority Score</label>
              <select
                value={score}
                onChange={(e) => setScore(e.target.value as LeadScore)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-bold"
              >
                <option value="HOT">🔥 HOT (High Intent)</option>
                <option value="WARM">☀️ WARM (Evaluating)</option>
                <option value="COLD">❄️ COLD (General Enquiry)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Assign Agent</label>
              <select
                value={assignedAgentName}
                onChange={(e) => setAssignedAgentName(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white"
              >
                <option value="Priya Verma">Priya Verma</option>
                <option value="Rohit Sharma">Rohit Sharma</option>
                <option value="Vikramaditya Singh">Vikramaditya Singh</option>
                <option value="Front Desk Team">Front Desk Team</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Budget / Tariff</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. ₹15,000"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Guests &amp; Rooms</label>
              <input
                type="text"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                placeholder="e.g. 4 Adults (2 Rooms)"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Guest City / Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. New Delhi / Sector 62"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Check-In Date</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Time</label>
              <input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Relevancy Tag</label>
              <select
                value={relevancy}
                onChange={(e) => setRelevancy(e.target.value as 'Relevent' | 'Non Relevent')}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-semibold"
              >
                <option value="Relevent">Relevent</option>
                <option value="Non Relevent">Non Relevent</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Custom Tags (comma sep)</label>
              <input
                type="text"
                value={extraTags}
                onChange={(e) => setExtraTags(e.target.value)}
                placeholder="VIP, Banquet, Corporate"
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Enquiry Remarks / Notes</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter special requirements, room category preference, banquet menu details..."
              className="w-full px-3 py-2 border border-stone-300 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-slate-700 font-semibold hover:bg-stone-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold cursor-pointer shadow-md"
            >
              {isSubmitting ? 'Saving Lead...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 2. ACTIVITY TIMELINE SLIDE-OVER DRAWER
// ============================================================================
interface ActivityTimelineDrawerProps {
  lead: CRMLead | null;
  onClose: () => void;
  onAddActivity: (
    leadId: string,
    activity: Omit<LeadActivity, 'id' | 'timestamp'>
  ) => Promise<void> | void;
}

export const ActivityTimelineDrawer: React.FC<ActivityTimelineDrawerProps> = ({
  lead,
  onClose,
  onAddActivity,
}) => {
  const [actType, setActType] = useState<LeadActivity['type']>('call');
  const [outcome, setOutcome] = useState<LeadActivity['outcome']>('positive');
  const [content, setContent] = useState('');
  const [actor, setActor] = useState('Priya Verma');

  if (!lead) return null;

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onAddActivity(lead.id, {
      type: actType,
      outcome,
      content: content.trim(),
      user: actor,
    });
    setContent('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl border-l-2 border-[#C8A45D] flex flex-col">
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-[#C8A45D]/40">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#C8A45D]">{lead.name}</h3>
            <p className="text-xs text-slate-300">
              {lead.phone} &bull; {lead.email || 'No email'} &bull; Score: {lead.score}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Log New Interaction Form */}
        <form
          onSubmit={handleLogSubmit}
          className="p-4 bg-stone-50 border-b border-stone-200 space-y-3 text-xs"
        >
          <div className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            Log Manual Interaction
          </div>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={actType}
              onChange={(e) => setActType(e.target.value as LeadActivity['type'])}
              className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white font-semibold"
            >
              <option value="call">📞 Phone Call</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="email">✉️ Email</option>
              <option value="visit">🏨 Property Visit</option>
              <option value="remark">📝 Note / Remark</option>
            </select>

            <select
              value={outcome}
              onChange={(e) => setOutcome(e.target.value as LeadActivity['outcome'])}
              className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white font-semibold"
            >
              <option value="positive">✅ Positive</option>
              <option value="neutral">➖ Neutral</option>
              <option value="negative">❌ Negative</option>
            </select>

            <input
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="Agent Name"
              className="px-2.5 py-1.5 border border-stone-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe call outcome, quote shared, or visit feedback..."
              className="flex-1 px-3 py-2 border border-stone-300 rounded-xl bg-white focus:outline-none focus:border-[#C8A45D]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-[#C8A45D] font-bold rounded-xl cursor-pointer"
            >
              Add Log
            </button>
          </div>
        </form>

        {/* Chronological Activity Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {(lead.history || []).length === 0 ? (
            <div className="text-center py-12 text-xs text-stone-400">
              No activity recorded for this lead yet.
            </div>
          ) : (
            (lead.history || []).map((item) => (
              <div
                key={item.id}
                className="relative pl-5 border-l-2 border-[#C8A45D]/50 space-y-1 text-xs"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#C8A45D] absolute -left-[6px] top-1" />
                <div className="flex items-center justify-between text-[11px] text-stone-500">
                  <span className="font-bold uppercase text-slate-800">
                    {item.type} &bull; {item.user}
                  </span>
                  <span>
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : ''}
                  </span>
                </div>
                <p className="text-slate-700 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                  {item.content}
                </p>
                {item.outcome && item.outcome !== 'none' && (
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                      item.outcome === 'positive'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.outcome === 'negative'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    Outcome: {item.outcome.toUpperCase()}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FOLLOW-UP SCHEDULER MODAL
// ============================================================================
interface FollowUpModalProps {
  lead: CRMLead | null;
  onClose: () => void;
  onSaveFollowUp: (
    leadId: string,
    date: string,
    time: string,
    remarks: string
  ) => Promise<void> | void;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  lead,
  onClose,
  onSaveFollowUp,
}) => {
  const [date, setDate] = useState(getTodayLocalDateStr());
  const [time, setTime] = useState('16:00');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (lead) {
      setDate(lead.follow_up_date || getTodayLocalDateStr());
      setTime(lead.follow_up_time || '16:00');
      setRemarks(lead.follow_up_remarks || 'Call guest to confirm booking dates & advance');
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveFollowUp(lead.id, date, time, remarks);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border-2 border-[#C8A45D] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#C8A45D]">
              Schedule Follow-Up Reminder
            </h3>
            <p className="text-[11px] text-slate-400">{lead.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Follow-Up Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Reminder Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Follow-Up Agenda / Notes</label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Confirm advance payment or share revised banquet quote"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#C8A45D] text-slate-950 font-bold rounded-xl cursor-pointer"
            >
              Save Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 4. EMAIL COMPOSE & DISPATCH MODAL (GMAIL SMTP / CLOUDFLARE WORKER / MAILTO)
// ============================================================================
interface EmailComposeModalProps {
  lead: CRMLead | null;
  gmailConfig: GmailCrmConfig;
  templates: ReplyTemplatesConfig;
  onClose: () => void;
  onEmailDispatched: (leadId: string, subject: string) => Promise<void> | void;
}

export const EmailComposeModal: React.FC<EmailComposeModalProps> = ({
  lead,
  gmailConfig,
  templates,
  onClose,
  onEmailDispatched,
}) => {
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (lead) {
      setToEmail(lead.email || '');
      setSubject(
        (templates.emailSubject || 'Exclusive Offer — Sun Moon Suites').replace(
          /\{name\}/gi,
          lead.name
        )
      );
      setBody((templates.email || '').replace(/\{name\}/gi, lead.name));
      setStatusMsg(null);
    }
  }, [lead, templates]);

  if (!lead) return null;

  const handleSendDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toEmail.trim()) {
      setStatusMsg({ type: 'err', text: 'Please enter a valid recipient email address.' });
      return;
    }

    setSending(true);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/crm/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: toEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
          gmailConfig,
        }),
      });
      const json = await resp.json();
      if (json.success) {
        await onEmailDispatched(lead.id, subject.trim());
        onClose();
      } else {
        setStatusMsg({
          type: 'err',
          text:
            json.error ||
            'Could not send via SMTP/Worker. Configure Google App Password in Settings or use "Open Mail Client" below.',
        });
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err?.message || 'Network error while dispatching email.',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border-2 border-[#C8A45D] shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#C8A45D]">
              Send Luxury Proposal Email
            </h3>
            <p className="text-[11px] text-slate-400">
              Recipient: {lead.name} ({lead.phone})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSendDirect} className="p-6 space-y-4 text-xs">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl font-semibold ${
                statusMsg.type === 'ok'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {statusMsg.text}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">To Email *</label>
            <input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="guest@example.com"
              className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl font-semibold"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Message Body *</label>
            <textarea
              rows={7}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-xl font-sans"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200">
            <a
              href={`mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
                subject
              )}&body=${encodeURIComponent(body)}`}
              onClick={() => {
                onEmailDispatched(lead.id, subject.trim());
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl border border-stone-300 text-slate-700 font-semibold hover:bg-stone-100"
            >
              Open Default Mail App (mailto)
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-stone-300 rounded-xl font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Sending...' : 'Send via Gmail / Worker'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 5. 1-CLICK CONVERT TO BOOKING MODAL
// ============================================================================
interface ConvertToBookingModalProps {
  lead: CRMLead | null;
  onClose: () => void;
  onConfirmConvert: (params: {
    lead: CRMLead;
    checkIn: string;
    checkOut: string;
    guestsCount: number;
    totalAmount: number;
  }) => Promise<void> | void;
}

export const ConvertToBookingModal: React.FC<ConvertToBookingModalProps> = ({
  lead,
  onClose,
  onConfirmConvert,
}) => {
  const [checkIn, setCheckIn] = useState(getTodayLocalDateStr());
  const [checkOut, setCheckOut] = useState(getNextDayLocalDateStr(getTodayLocalDateStr()));
  const [guestsCount, setGuestsCount] = useState(2);
  const [totalAmount, setTotalAmount] = useState(2999);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lead) {
      const cIn = lead.booking_date || getTodayLocalDateStr();
      setCheckIn(cIn);
      setCheckOut(getNextDayLocalDateStr(cIn));

      const numGuests = parseInt((lead.guests || '2').replace(/\D/g, ''), 10);
      setGuestsCount(!isNaN(numGuests) && numGuests > 0 ? numGuests : 2);

      const numBudget = parseInt((lead.budget || '').replace(/\D/g, ''), 10);
      setTotalAmount(!isNaN(numBudget) && numBudget > 0 ? numBudget : 2999);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onConfirmConvert({
        lead,
        checkIn,
        checkOut,
        guestsCount,
        totalAmount,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border-2 border-[#C8A45D] shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#C8A45D]">
              1-Click Convert Lead to Booking
            </h3>
            <p className="text-[11px] text-slate-400">
              Creates reservation in CRM &amp; Hotel PMS simultaneously
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
            <div className="font-serif font-bold text-sm text-slate-900">{lead.name}</div>
            <div className="text-stone-600">
              {lead.phone} &bull; {lead.email || 'No email provided'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Check-In Date *</label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (e.target.value >= checkOut) {
                    setCheckOut(getNextDayLocalDateStr(e.target.value));
                  }
                }}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Check-Out Date *</label>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Number of Guests</label>
              <input
                type="number"
                min={1}
                value={guestsCount}
                onChange={(e) => setGuestsCount(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Total Tariff Amount (₹)</label>
              <input
                type="number"
                min={0}
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-stone-300 rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer shadow-sm"
            >
              {submitting ? 'Converting...' : 'Confirm & Convert to Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 6. INTEGRATIONS, SETTINGS, RBAC & SUPABASE SQL SCHEMA MODAL
// ============================================================================
interface CRMIntegrationsModalProps {
  activeModal: 'sheets' | 'meta' | 'settings' | 'sql' | null;
  onClose: () => void;
  leadSync: LeadSyncConfig;
  metaSync: MetaSyncConfig;
  gmailConfig: GmailCrmConfig;
  templates: ReplyTemplatesConfig;
  permissions: CRMUserPermissions;
  isSyncing: boolean;
  syncFeedback: string;
  onSaveLeadSync: (cfg: LeadSyncConfig) => Promise<void> | void;
  onTriggerSheetsSync: (urls: string[]) => Promise<void> | void;
  onSaveMetaSync: (cfg: MetaSyncConfig) => Promise<void> | void;
  onTriggerMetaSync: (pageId: string, accessToken: string) => Promise<void> | void;
  onSaveSettings: (
    gCfg: GmailCrmConfig,
    tplCfg: ReplyTemplatesConfig,
    permsCfg: CRMUserPermissions
  ) => Promise<void> | void;
}

const SUPABASE_CRM_SQL_SCRIPT = `-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Leads Table
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text default '',
  phone text default '',
  source text default 'website',
  status text default 'new',
  score text default 'COLD',
  budget text default '',
  guests text default '',
  city text default '',
  booking_date date,
  booking_time text default '',
  remarks text default '',
  tags text[] default array[]::text[],
  meta_lead_id text unique,
  sync_hash text unique,
  follow_up_date date,
  follow_up_time text default '',
  follow_up_remarks text default '',
  assigned_agent uuid,
  assigned_agent_name text default '',
  email_sent boolean default false,
  whatsapp_sent boolean default false,
  history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  status_updated_at timestamptz default now()
);

-- 2. App Settings Table
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. CRM Bookings Table
create table if not exists public.crm_bookings (
  id uuid primary key default uuid_generate_v4(),
  lead_id uuid references public.leads(id) on delete set null,
  name text not null,
  mobile text not null,
  email text default '',
  check_in date not null,
  check_out date not null,
  guests integer default 2,
  status text default 'pending',
  total_amount numeric(10, 2) default 0,
  booked_by text default 'lead_conversion',
  created_at timestamptz default now()
);

alter table public.leads enable row level security;
alter table public.app_settings enable row level security;
alter table public.crm_bookings enable row level security;

create policy "Public full access to leads" on public.leads for all using (true) with check (true);
create policy "Public full access to app_settings" on public.app_settings for all using (true) with check (true);
create policy "Public full access to crm_bookings" on public.crm_bookings for all using (true) with check (true);

alter publication supabase_realtime add table public.leads;`;

export const CRMIntegrationsModal: React.FC<CRMIntegrationsModalProps> = ({
  activeModal,
  onClose,
  leadSync,
  metaSync,
  gmailConfig,
  templates,
  permissions,
  isSyncing,
  syncFeedback,
  onSaveLeadSync,
  onTriggerSheetsSync,
  onSaveMetaSync,
  onTriggerMetaSync,
  onSaveSettings,
}) => {
  const [newSheetUrl, setNewSheetUrl] = useState('');
  const [urls, setUrls] = useState<string[]>(leadSync.csvUrls || []);
  const [autoSync, setAutoSync] = useState<boolean>(leadSync.autoSyncEnabled ?? true);

  const [pageId, setPageId] = useState(metaSync.pageId || '');
  const [accessToken, setAccessToken] = useState(metaSync.accessToken || '');

  const [gUser, setGUser] = useState(gmailConfig.user || '');
  const [gPass, setGPass] = useState(gmailConfig.pass || '');
  const [gWorkerUrl, setGWorkerUrl] = useState(gmailConfig.workerUrl || '');
  const [gWorkerSecret, setGWorkerSecret] = useState(gmailConfig.workerSecret || '');
  const [gSenderName, setGSenderName] = useState(gmailConfig.senderName || 'Sun Moon Suites CRM');

  const [tplSubject, setTplSubject] = useState(templates.emailSubject || '');
  const [tplEmail, setTplEmail] = useState(templates.email || '');
  const [tplWhatsapp, setTplWhatsapp] = useState(templates.whatsapp || '');

  const [perms, setPerms] = useState<CRMUserPermissions>(permissions);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    setUrls(leadSync.csvUrls || []);
    setAutoSync(leadSync.autoSyncEnabled ?? true);
    setPageId(metaSync.pageId || '');
    setAccessToken(metaSync.accessToken || '');
    setGUser(gmailConfig.user || '');
    setGPass(gmailConfig.pass || '');
    setGWorkerUrl(gmailConfig.workerUrl || '');
    setGWorkerSecret(gmailConfig.workerSecret || '');
    setGSenderName(gmailConfig.senderName || 'Sun Moon Suites CRM');
    setTplSubject(templates.emailSubject || '');
    setTplEmail(templates.email || '');
    setTplWhatsapp(templates.whatsapp || '');
    setPerms(permissions);
  }, [leadSync, metaSync, gmailConfig, templates, permissions, activeModal]);

  if (!activeModal) return null;

  const handleAddSheetUrl = async () => {
    if (!newSheetUrl.trim()) return;
    const updated = Array.from(new Set([...urls, newSheetUrl.trim()]));
    setUrls(updated);
    setNewSheetUrl('');
    await onSaveLeadSync({
      ...leadSync,
      csvUrls: updated,
      autoSyncEnabled: autoSync,
    });
  };

  const handleRemoveSheetUrl = async (target: string) => {
    const updated = urls.filter((u) => u !== target);
    setUrls(updated);
    await onSaveLeadSync({
      ...leadSync,
      csvUrls: updated,
      autoSyncEnabled: autoSync,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-[#C8A45D] shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-base text-[#C8A45D]">
              {activeModal === 'sheets' && 'Google Sheets 2-Way Lead Sync Engine'}
              {activeModal === 'meta' && 'Meta (Facebook & Instagram Lead Ads) Graph Sync'}
              {activeModal === 'settings' && 'CRM Communications, Templates & Role Permissions'}
              {activeModal === 'sql' && 'Supabase PostgreSQL Tables & Realtime Setup'}
            </h3>
            <p className="text-[11px] text-slate-400">
              Stored in Supabase public.app_settings with instant local mirror
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          {syncFeedback && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-[#C8A45D] text-slate-900 font-semibold">
              {syncFeedback}
            </div>
          )}

          {/* MODE 1: GOOGLE SHEETS */}
          {activeModal === 'sheets' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 leading-relaxed">
                Paste any public Google Sheet URL (<code>/edit</code> or <code>/pub</code>). The CRM
                automatically converts it to a CSV export stream, parses rows with PapaParse, and
                deduplicates using a composite <code>sync_hash</code> every 5 minutes.
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newSheetUrl}
                  onChange={(e) => setNewSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                  className="flex-1 px-3 py-2 border border-stone-300 rounded-xl"
                />
                <button
                  type="button"
                  onClick={handleAddSheetUrl}
                  className="px-4 py-2 bg-[#0F172A] text-[#C8A45D] font-bold rounded-xl cursor-pointer"
                >
                  + Add Sheet
                </button>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-700">Configured Google Sheets ({urls.length})</div>
                {urls.length === 0 ? (
                  <p className="text-stone-400 italic">No Google Sheets linked yet.</p>
                ) : (
                  urls.map((u) => (
                    <div
                      key={u}
                      className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="truncate flex-1">
                        <div className="font-semibold text-slate-800 truncate">{u}</div>
                        <div className="text-[10px] text-emerald-700 truncate">
                          CSV Stream: {convertGoogleSheetToCsvUrl(u)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSheetUrl(u)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={async (e) => {
                      setAutoSync(e.target.checked);
                      await onSaveLeadSync({
                        ...leadSync,
                        csvUrls: urls,
                        autoSyncEnabled: e.target.checked,
                      });
                    }}
                  />
                  <span>Run Background Auto-Sync Every 5 Minutes</span>
                </label>

                <button
                  type="button"
                  disabled={isSyncing || urls.length === 0}
                  onClick={() => onTriggerSheetsSync(urls)}
                  className="px-5 py-2 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Syncing Sheets...' : 'Sync Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 2: META LEAD ADS */}
          {activeModal === 'meta' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600">
                Connect Facebook &amp; Instagram Lead Ads via Graph API v19.0. Leads are matched by{' '}
                <code>meta_lead_id</code> so duplicate leads are never created.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Facebook Page ID or Lead Form ID
                </label>
                <input
                  type="text"
                  value={pageId}
                  onChange={(e) => setPageId(e.target.value)}
                  placeholder="e.g. 1049283749201"
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Meta Graph API Page Access Token
                </label>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="EAABwzLixnjYBO..."
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => onSaveMetaSync({ pageId, accessToken })}
                  className="px-4 py-2 border border-stone-300 rounded-xl font-bold cursor-pointer"
                >
                  Save Credentials
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={async () => {
                    await onSaveMetaSync({ pageId, accessToken });
                    await onTriggerMetaSync(pageId, accessToken);
                  }}
                  className="px-5 py-2 bg-[#C8A45D] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Fetching Meta Leads...' : 'Fetch Meta Leads Now'}</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: SETTINGS, TEMPLATES & RBAC */}
          {activeModal === 'settings' && (
            <div className="space-y-6">
              {/* Gmail / Worker Config */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-sm text-slate-900 border-b pb-1">
                  1. Automated Email Dispatch (Gmail App Password or Cloudflare Worker)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gmail Address</label>
                    <input
                      type="email"
                      value={gUser}
                      onChange={(e) => setGUser(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Google 16-Char App Password
                    </label>
                    <input
                      type="password"
                      value={gPass}
                      onChange={(e) => setGPass(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Optional Cloudflare Worker URL
                    </label>
                    <input
                      type="url"
                      value={gWorkerUrl}
                      onChange={(e) => setGWorkerUrl(e.target.value)}
                      placeholder="https://email-worker.yourdomain.workers.dev"
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Worker Secret Key</label>
                    <input
                      type="password"
                      value={gWorkerSecret}
                      onChange={(e) => setGWorkerSecret(e.target.value)}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Reply Templates */}
              <div className="space-y-3">
                <h4 className="font-serif font-bold text-sm text-slate-900 border-b pb-1">
                  2. One-Click WhatsApp &amp; Email Templates (supports &#123;name&#125;)
                </h4>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    WhatsApp Quick Reply Template
                  </label>
                  <textarea
                    rows={2}
                    value={tplWhatsapp}
                    onChange={(e) => setTplWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Default Email Subject</label>
                  <input
                    type="text"
                    value={tplSubject}
                    onChange={(e) => setTplSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Default Email Proposal Body
                  </label>
                  <textarea
                    rows={4}
                    value={tplEmail}
                    onChange={(e) => setTplEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Agent RBAC Permissions */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-slate-900 border-b pb-1">
                  3. Agent Role Permissions (RBAC)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {(
                    [
                      ['viewLeads', 'View Leads'],
                      ['addLeads', 'Add New Leads'],
                      ['editLeads', 'Edit Status & Remarks'],
                      ['deleteLeads', 'Delete Leads'],
                      ['leadsSettings', 'Access Sync & Settings'],
                    ] as Array<[keyof CRMUserPermissions, string]>
                  ).map(([k, label]) => (
                    <label
                      key={k}
                      className="flex items-center gap-2 p-2 rounded-lg bg-stone-50 border border-stone-200 cursor-pointer font-semibold"
                    >
                      <input
                        type="checkbox"
                        checked={perms[k]}
                        onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-stone-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onSaveSettings(
                      {
                        user: gUser,
                        pass: gPass,
                        workerUrl: gWorkerUrl,
                        workerSecret: gWorkerSecret,
                        senderName: gSenderName,
                      },
                      {
                        emailSubject: tplSubject,
                        email: tplEmail,
                        whatsapp: tplWhatsapp,
                      },
                      perms
                    );
                    onClose();
                  }}
                  className="px-5 py-2 bg-[#C8A45D] text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  Save All CRM Settings
                </button>
              </div>
            </div>
          )}

          {/* MODE 4: SQL SCHEMA */}
          {activeModal === 'sql' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700">
                Run this SQL script in your Supabase SQL Editor to provision the isolated{' '}
                <code>public.leads</code>, <code>public.app_settings</code>, and{' '}
                <code>public.crm_bookings</code> tables with Realtime enabled.
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 text-amber-200 font-mono text-[11px] overflow-x-auto max-h-80">
                  {SUPABASE_CRM_SQL_SCRIPT}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_CRM_SQL_SCRIPT);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2500);
                  }}
                  className="absolute top-3 right-3 px-3 py-1.5 bg-[#C8A45D] text-slate-950 font-bold rounded-lg flex items-center gap-1 cursor-pointer text-xs"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied SQL!' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
