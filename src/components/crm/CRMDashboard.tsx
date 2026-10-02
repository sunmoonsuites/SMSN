import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Hotel, StaffUser } from '../../types';
import {
  CRMLead,
  LeadStatus,
  LeadScore,
  LeadActivity,
  LeadSyncConfig,
  MetaSyncConfig,
  GmailCrmConfig,
  ReplyTemplatesConfig,
  CRMUserPermissions,
  DEFAULT_LEAD_SYNC_CONFIG,
  DEFAULT_META_SYNC_CONFIG,
  DEFAULT_GMAIL_CRM_CONFIG,
  DEFAULT_REPLY_TEMPLATES,
  DEFAULT_AGENT_PERMISSIONS,
  fetchCRMLeads,
  subscribeToLeadsRealtime,
  createCRMLead,
  updateCRMLead,
  bulkUpdateCRMLeads,
  bulkDeleteCRMLeads,
  getCRMAppSettings,
  saveCRMAppSetting,
  syncGoogleSheetsLeads,
  syncMetaGraphLeads,
  convertLeadToBooking,
  exportLeadsToCsvFile,
} from '../../services/crmService';
import {
  AddLeadModal,
  ActivityTimelineDrawer,
  FollowUpModal,
  EmailComposeModal,
  CRMIntegrationsModal,
  ConvertToBookingModal,
} from './CRMModals';
import { formatDate, getTodayLocalDateStr } from '../../lib/utils';
import {
  LayoutGrid,
  Table as TableIcon,
  Plus,
  Search,
  Download,
  RefreshCw,
  Phone,
  MessageCircle,
  Mail,
  Calendar,
  Clock,
  Flame,
  CheckCircle2,
  Trash2,
  Settings,
  FileSpreadsheet,
  Share2,
  Database,
  History,
  UserCheck,
  BellRing,
  Building2,
  ExternalLink,
  Tag,
  X,
} from 'lucide-react';

interface CRMDashboardProps {
  hotel: Hotel | null;
  currentUser: StaffUser | null;
  onNavigateToPMS: () => void;
  onNavigateToWebsite: () => void;
}

const PIPELINE_COLUMNS: Array<{ id: LeadStatus; label: string; accent: string }> = [
  { id: 'new', label: 'New Enquiries', accent: 'border-sky-500' },
  { id: 'contacted', label: 'Contacted', accent: 'border-amber-500' },
  { id: 'followup', label: 'Follow-Up', accent: 'border-purple-500' },
  { id: 'converted', label: 'Converted', accent: 'border-emerald-500' },
  { id: 'lost', label: 'Lost / Closed', accent: 'border-slate-400' },
];

const AGENTS_LIST = ['Priya Verma', 'Rohit Sharma', 'Vikramaditya Singh', 'Front Desk Team'];

export const CRMDashboard: React.FC<CRMDashboardProps> = ({
  hotel,
  currentUser,
  onNavigateToPMS,
  onNavigateToWebsite,
}) => {
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseReady, setSupabaseReady] = useState(true);

  // Views & Filters
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | LeadStatus>('all');
  const [scoreFilter, setScoreFilter] = useState<'ALL' | LeadScore>('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Role Mode (ADMIN vs AGENT RBAC preview)
  const [activeRoleMode, setActiveRoleMode] = useState<'ADMIN' | 'AGENT'>(
    currentUser?.role === 'FRONT DESK' ? 'AGENT' : 'ADMIN'
  );

  // Settings & Sync Configs
  const [leadSync, setLeadSync] = useState<LeadSyncConfig>(DEFAULT_LEAD_SYNC_CONFIG);
  const [metaSync, setMetaSync] = useState<MetaSyncConfig>(DEFAULT_META_SYNC_CONFIG);
  const [gmailConfig, setGmailConfig] = useState<GmailCrmConfig>(DEFAULT_GMAIL_CRM_CONFIG);
  const [templates, setTemplates] = useState<ReplyTemplatesConfig>(DEFAULT_REPLY_TEMPLATES);
  const [agentPerms, setAgentPerms] = useState<CRMUserPermissions>(DEFAULT_AGENT_PERMISSIONS);

  // Modals & Drawers
  const [showAddModal, setShowAddModal] = useState(false);
  const [timelineLead, setTimelineLead] = useState<CRMLead | null>(null);
  const [followUpLead, setFollowUpLead] = useState<CRMLead | null>(null);
  const [emailLead, setEmailLead] = useState<CRMLead | null>(null);
  const [convertLead, setConvertLead] = useState<CRMLead | null>(null);
  const [integrationModal, setIntegrationModal] = useState<'sheets' | 'meta' | 'settings' | 'sql' | null>(null);

  // Sync & Toast Feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dueAlertLead, setDueAlertLead] = useState<CRMLead | null>(null);

  // Bulk Selection & Custom Tag Input
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customTagInputs, setCustomTagInputs] = useState<Record<string, string>>({});

  const syncLockRef = useRef(false);
  const alertedFollowUpsRef = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Effective RBAC Permissions
  const canView = activeRoleMode === 'ADMIN' || agentPerms.viewLeads;
  const canAdd = activeRoleMode === 'ADMIN' || agentPerms.addLeads;
  const canEdit = activeRoleMode === 'ADMIN' || agentPerms.editLeads;
  const canDelete = activeRoleMode === 'ADMIN' || agentPerms.deleteLeads;
  const canManageSettings = activeRoleMode === 'ADMIN' || agentPerms.leadsSettings;

  // 500ms Debounced Search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(rawSearch.trim().toLowerCase());
    }, 500);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Initial Load + Realtime Subscription
  const loadAllData = async () => {
    const [leadsRes, settingsRes] = await Promise.all([fetchCRMLeads(), getCRMAppSettings()]);
    setLeads(leadsRes.leads);
    setSupabaseReady(leadsRes.supabaseTableReady);
    setLeadSync(settingsRes.lead_sync);
    setMetaSync(settingsRes.meta_sync);

    // Inherit hotel's Gmail App Password if CRM gmail pass is not set separately
    const fallbackPass =
      settingsRes.gmail_config.pass ||
      hotel?.email_verification_config?.gmail_app_password ||
      '';
    const fallbackUser =
      settingsRes.gmail_config.user ||
      hotel?.email_verification_config?.sender_email ||
      'sunmoonsuites@gmail.com';

    setGmailConfig({
      ...settingsRes.gmail_config,
      user: fallbackUser,
      pass: fallbackPass,
    });
    setTemplates(settingsRes.reply_templates);
    setAgentPerms(settingsRes.crm_permissions);
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllData();
    const unsubscribe = subscribeToLeadsRealtime(() => {
      fetchCRMLeads().then((r) => setLeads(r.leads));
    });
    return () => unsubscribe();
  }, []);

  // Keep timelineLead fresh when leads list updates
  useEffect(() => {
    if (timelineLead) {
      const updated = leads.find((l) => l.id === timelineLead.id);
      if (updated) setTimelineLead(updated);
    }
  }, [leads]);

  // 5-Minute Background Google Sheets Auto-Sync Engine
  useEffect(() => {
    if (!leadSync.autoSyncEnabled || !leadSync.csvUrls || leadSync.csvUrls.length === 0) return;

    const interval = setInterval(async () => {
      if (syncLockRef.current) return;
      syncLockRef.current = true;
      try {
        const res = await syncGoogleSheetsLeads(leadSync.csvUrls, leads);
        if (res.importedCount > 0) {
          const refreshed = await fetchCRMLeads();
          setLeads(refreshed.leads);
          showToast(`Auto-Synced ${res.importedCount} new lead(s) from Google Sheets!`);
        }
      } finally {
        syncLockRef.current = false;
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [leadSync, leads]);

  // 60-Second Real-Time Follow-Up Audio Chime & Toast Reminder Engine
  useEffect(() => {
    const checkDueFollowUps = () => {
      const now = new Date();
      const todayStr = getTodayLocalDateStr();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      for (const lead of leads) {
        if (lead.status === 'converted' || lead.status === 'lost') continue;
        if (!lead.follow_up_date || !lead.follow_up_time) continue;

        const key = `${lead.id}-${lead.follow_up_date}-${lead.follow_up_time}`;
        if (
          lead.follow_up_date === todayStr &&
          lead.follow_up_time <= currentHHMM &&
          !alertedFollowUpsRef.current.has(key)
        ) {
          alertedFollowUpsRef.current.add(key);
          setDueAlertLead(lead);
          try {
            const audio = new Audio(
              'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'
            );
            audio.volume = 0.7;
            audio.play().catch(() => {});
          } catch {
            // ignore audio autoplay restriction
          }
          break;
        }
      }
    };

    checkDueFollowUps();
    const timer = setInterval(checkDueFollowUps, 60000);
    return () => clearInterval(timer);
  }, [leads]);

  // All distinct tags across leads
  const allAvailableTags = useMemo(() => {
    const set = new Set<string>(['Relevent', 'Non Relevent', 'VIP', 'Corporate', 'Banquet']);
    leads.forEach((l) => (l.tags || []).forEach((t) => set.add(t)));
    return Array.from(set);
  }, [leads]);

  // Filtered Leads
  const todayStr = getTodayLocalDateStr();

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (activeStatusTab !== 'all' && lead.status !== activeStatusTab) return false;
      if (scoreFilter !== 'ALL' && lead.score !== scoreFilter) return false;
      if (selectedTagFilter !== 'all' && !(lead.tags || []).includes(selectedTagFilter)) {
        return false;
      }
      if (dateFilter && lead.booking_date !== dateFilter) return false;

      if (followUpFilter !== 'all') {
        if (!lead.follow_up_date) return false;
        if (followUpFilter === 'overdue' && lead.follow_up_date >= todayStr) return false;
        if (followUpFilter === 'today' && lead.follow_up_date !== todayStr) return false;
        if (followUpFilter === 'upcoming' && lead.follow_up_date <= todayStr) return false;
      }

      if (debouncedSearch) {
        const hay = `${lead.name} ${lead.phone} ${lead.email} ${lead.city} ${lead.remarks} ${(
          lead.tags || []
        ).join(' ')}`.toLowerCase();
        if (!hay.includes(debouncedSearch)) return false;
      }

      return true;
    });
  }, [
    leads,
    activeStatusTab,
    scoreFilter,
    selectedTagFilter,
    dateFilter,
    followUpFilter,
    debouncedSearch,
    todayStr,
  ]);

  // Status Counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: leads.length,
      new: 0,
      contacted: 0,
      followup: 0,
      converted: 0,
      lost: 0,
    };
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  // Handlers
  const handleCreateLead = async (input: Partial<CRMLead>) => {
    const res = await createCRMLead(input, currentUser?.full_name || 'Admin');
    if (res.success) {
      const refreshed = await fetchCRMLeads();
      setLeads(refreshed.leads);
      showToast(`Added new lead: ${input.name}`);
    }
  };

  const handleQuickUpdate = async (
    leadId: string,
    updates: Partial<CRMLead>,
    activity?: Omit<LeadActivity, 'id' | 'timestamp'>
  ) => {
    if (!canEdit) {
      showToast('Permission restricted: Edit Leads is disabled for Agent role.');
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, ...updates } : l)));
    await updateCRMLead(leadId, updates, activity);
    const refreshed = await fetchCRMLeads();
    setLeads(refreshed.leads);
  };

  const handleWhatsAppReply = async (lead: CRMLead) => {
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = (templates.whatsapp || '')
      .replace(/\{name\}/gi, lead.name)
      .replace(/\{hotel\}/gi, hotel?.name || 'Sun Moon Suites');

    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
    const linkEl = document.createElement('a');
    linkEl.href = waUrl;
    linkEl.target = '_blank';
    linkEl.rel = 'noopener noreferrer';
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);

    await handleQuickUpdate(
      lead.id,
      { whatsapp_sent: true },
      {
        type: 'whatsapp',
        content: `Sent WhatsApp quick reply to ${lead.phone}`,
        user: currentUser?.full_name || 'Admin',
        outcome: 'positive',
      }
    );
  };

  const handleToggleRelevancy = async (lead: CRMLead, targetTag: 'Relevent' | 'Non Relevent') => {
    const otherTag = targetTag === 'Relevent' ? 'Non Relevent' : 'Relevent';
    const filtered = (lead.tags || []).filter((t) => t !== otherTag && t !== targetTag);
    const nextTags = [targetTag, ...filtered];
    await handleQuickUpdate(lead.id, { tags: nextTags });
  };

  const handleAddCustomTag = async (lead: CRMLead) => {
    const val = (customTagInputs[lead.id] || '').trim();
    if (!val) return;
    if (!(lead.tags || []).includes(val)) {
      await handleQuickUpdate(lead.id, { tags: [...(lead.tags || []), val] });
    }
    setCustomTagInputs((prev) => ({ ...prev, [lead.id]: '' }));
  };

  const handleRemoveTag = async (lead: CRMLead, tagToRemove: string) => {
    await handleQuickUpdate(lead.id, {
      tags: (lead.tags || []).filter((t) => t !== tagToRemove),
    });
  };

  // Score Badge Helper
  const renderScoreBadge = (score: LeadScore) => {
    if (score === 'HOT') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-orange-700">
          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-600" />
          HOT
        </span>
      );
    }
    if (score === 'WARM') {
      return <span className="text-[11px] font-bold text-amber-700">☀️ WARM</span>;
    }
    return <span className="text-[11px] font-semibold text-slate-500">❄️ COLD</span>;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* TOP LUXURY HEADER */}
      <header className="bg-[#0F172A] text-white border-b-2 border-[#C8A45D] sticky top-0 z-30 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45D]/15 border border-[#C8A45D] flex items-center justify-center text-[#C8A45D] font-serif font-bold text-lg">
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-[#C8A45D]">
                  {hotel?.name || 'Sun Moon Suites'} — Luxury CRM &amp; Leads
                </h1>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-Time Pipeline &bull; Google Sheets 2-Way Sync &bull; Meta Ads &bull; 1-Click Booking Conversion
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Role Mode Switcher */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setActiveRoleMode('ADMIN')}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                  activeRoleMode === 'ADMIN'
                    ? 'bg-[#C8A45D] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setActiveRoleMode('AGENT')}
                className={`px-2.5 py-1 rounded-md font-bold cursor-pointer transition-colors ${
                  activeRoleMode === 'AGENT'
                    ? 'bg-[#C8A45D] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Agent
              </button>
            </div>

            {canManageSettings && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSyncFeedback('');
                    setIntegrationModal('sheets');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sheets Sync</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSyncFeedback('');
                    setIntegrationModal('meta');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Meta Ads</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntegrationModal('settings')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#C8A45D]" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntegrationModal('sql')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
                  title="Supabase SQL Schema"
                >
                  <Database className="w-3.5 h-3.5 text-[#C8A45D]" />
                  <span>SQL Setup</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => exportLeadsToCsvFile(filteredLeads)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#C8A45D]" />
              <span>Export CSV</span>
            </button>

            {canAdd && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Lead</span>
              </button>
            )}

            <div className="h-5 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

            <button
              type="button"
              onClick={onNavigateToPMS}
              className="px-3 py-2 bg-amber-900/50 hover:bg-amber-800/70 text-amber-200 border border-amber-700/60 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Hotel PMS</span>
            </button>

            <button
              type="button"
              onClick={onNavigateToWebsite}
              className="px-2.5 py-2 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Open Public Website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* TOAST & FOLLOW-UP DUE AUDIO ALERT BANNER */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#0F172A] text-[#C8A45D] border-2 border-[#C8A45D] px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {dueAlertLead && (
        <div className="bg-amber-500 text-slate-950 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3 text-xs font-bold">
            <BellRing className="w-5 h-5 animate-bounce" />
            <span>
              FOLLOW-UP REMINDER DUE NOW: {dueAlertLead.name} ({dueAlertLead.phone}) —{' '}
              {dueAlertLead.follow_up_remarks || 'Scheduled Follow-Up'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <a
              href={`tel:${dueAlertLead.phone}`}
              className="px-3 py-1 bg-slate-950 text-[#C8A45D] rounded-lg font-bold"
            >
              Call Now
            </a>
            <button
              type="button"
              onClick={() => setDueAlertLead(null)}
              className="px-3 py-1 bg-white/80 rounded-lg font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5 flex-1 space-y-5">
        {/* PIPELINE STATUS TABS + VIEW SWITCHER */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ['all', 'All Leads'],
                ['new', 'New'],
                ['contacted', 'Contacted'],
                ['followup', 'Follow-Up'],
                ['converted', 'Converted'],
                ['lost', 'Lost'],
              ] as Array<['all' | LeadStatus, string]>
            ).map(([tabKey, label]) => {
              const active = activeStatusTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveStatusTab(tabKey)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    active
                      ? 'bg-[#0F172A] text-[#C8A45D] shadow-xs'
                      : 'text-slate-600 hover:bg-stone-100'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[11px] ${
                      active ? 'text-white font-extrabold' : 'text-slate-400'
                    }`}
                  >
                    ({statusCounts[tabKey] || 0})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dual View Toggle: Kanban vs Table */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'kanban'
                  ? 'bg-[#0F172A] text-[#C8A45D] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === 'table'
                  ? 'bg-[#0F172A] text-[#C8A45D] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>
        </div>

        {/* SEARCH, SCORE, FOLLOW-UP URGENCY & TAG FILTERS */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
            {/* 500ms Debounced Search */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="Search name, phone, email, city, remarks..."
                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#C8A45D]"
              />
            </div>

            {/* Score Filter */}
            <div className="md:col-span-2">
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value as 'ALL' | LeadScore)}
                className="w-full px-3 py-2 border border-stone-300 rounded-xl bg-white font-semibold"
              >
                <option value="ALL">All Scores (HOT/WARM/COLD)</option>
                <option value="HOT">🔥 HOT Leads Only</option>
                <option value="WARM">☀️ WARM Leads Only</option>
                <option value="COLD">❄️ COLD Leads Only</option>
              </select>
            </div>

            {/* Follow-up Urgency Filter Tabs */}
            <div className="md:col-span-4 flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              {(
                [
                  ['all', 'All Follow-Ups'],
                  ['overdue', 'Overdue'],
                  ['today', 'Due Today'],
                  ['upcoming', 'Upcoming'],
                ] as const
              ).map(([fKey, fLabel]) => (
                <button
                  key={fKey}
                  type="button"
                  onClick={() => setFollowUpFilter(fKey)}
                  className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[11px] cursor-pointer transition-colors ${
                    followUpFilter === fKey
                      ? 'bg-[#0F172A] text-[#C8A45D]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {fLabel}
                </button>
              ))}
            </div>

            {/* Expected Date Filter */}
            <div className="md:col-span-2 flex items-center gap-1">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-stone-300 rounded-xl text-xs"
                title="Filter by Expected Check-in Date"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Relevancy & Custom Tag Filter Bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-100 text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Filter by Tag:
            </span>
            <button
              type="button"
              onClick={() => setSelectedTagFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                selectedTagFilter === 'all'
                  ? 'bg-[#C8A45D] text-slate-950'
                  : 'bg-stone-100 text-slate-600 hover:bg-stone-200'
              }`}
            >
              All Tags
            </button>
            {allAvailableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTagFilter(tag === selectedTagFilter ? 'all' : tag)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                  selectedTagFilter === tag
                    ? 'bg-[#0F172A] text-[#C8A45D]'
                    : tag === 'Relevent'
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : tag === 'Non Relevent'
                    ? 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                    : 'bg-stone-100 text-slate-700 hover:bg-stone-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* BULK BATCH ACTIONS BAR */}
        {selectedIds.length > 0 && (
          <div className="bg-[#0F172A] text-white p-3.5 rounded-2xl border-2 border-[#C8A45D] flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg">
            <div className="font-bold text-[#C8A45D]">
              {selectedIds.length} Lead(s) Selected for Batch Action
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                defaultValue=""
                onChange={async (e) => {
                  if (!e.target.value) return;
                  await bulkUpdateCRMLeads(
                    selectedIds,
                    { status: e.target.value as LeadStatus },
                    currentUser?.full_name || 'Admin'
                  );
                  const refreshed = await fetchCRMLeads();
                  setLeads(refreshed.leads);
                  setSelectedIds([]);
                  showToast('Bulk status updated!');
                }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-semibold"
              >
                <option value="">Bulk Change Status...</option>
                <option value="new">Mark as New</option>
                <option value="contacted">Mark as Contacted</option>
                <option value="followup">Mark as Follow-Up</option>
                <option value="converted">Mark as Converted</option>
                <option value="lost">Mark as Lost</option>
              </select>

              <select
                defaultValue=""
                onChange={async (e) => {
                  if (!e.target.value) return;
                  await bulkUpdateCRMLeads(
                    selectedIds,
                    { assigned_agent_name: e.target.value },
                    currentUser?.full_name || 'Admin'
                  );
                  const refreshed = await fetchCRMLeads();
                  setLeads(refreshed.leads);
                  setSelectedIds([]);
                  showToast(`Assigned ${selectedIds.length} leads to ${e.target.value}`);
                }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-white font-semibold"
              >
                <option value="">Bulk Assign Agent...</option>
                {AGENTS_LIST.map((ag) => (
                  <option key={ag} value={ag}>
                    {ag}
                  </option>
                ))}
              </select>

              {canDelete && (
                <button
                  type="button"
                  onClick={async () => {
                    await bulkDeleteCRMLeads(selectedIds);
                    const refreshed = await fetchCRMLeads();
                    setLeads(refreshed.leads);
                    setSelectedIds([]);
                    showToast('Selected leads deleted.');
                  }}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-3 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* VIEW 1: KANBAN PIPELINE BOARD */}
        {!canView ? (
          <div className="p-12 bg-white rounded-2xl border border-stone-200 text-center text-sm text-slate-600">
            Access Restricted: Viewing leads is disabled for your current role.
          </div>
        ) : viewMode === 'kanban' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
            {PIPELINE_COLUMNS.map((col) => {
              const colLeads = filteredLeads.filter((l) => l.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`bg-stone-100/90 rounded-2xl border-t-4 ${col.accent} border border-stone-200/80 p-3 space-y-3`}
                >
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-serif font-bold text-sm text-slate-900">{col.label}</h3>
                    <span className="text-xs font-bold text-slate-500">{colLeads.length}</span>
                  </div>

                  <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-0.5">
                    {colLeads.length === 0 ? (
                      <div className="p-6 text-center text-xs text-stone-400 border border-dashed border-stone-300 rounded-xl">
                        No leads in {col.label}
                      </div>
                    ) : (
                      colLeads.map((lead) => {
                        const isSelected = selectedIds.includes(lead.id);
                        const isOverdue =
                          lead.follow_up_date &&
                          lead.follow_up_date < todayStr &&
                          lead.status !== 'converted';

                        return (
                          <div
                            key={lead.id}
                            className={`bg-white rounded-xl p-3.5 border transition-all shadow-2xs space-y-2.5 text-xs ${
                              isSelected
                                ? 'border-[#C8A45D] ring-2 ring-[#C8A45D]/30'
                                : 'border-stone-200 hover:border-stone-300'
                            }`}
                          >
                            {/* Top Row: Checkbox + Name + Score */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedIds([...selectedIds, lead.id]);
                                    } else {
                                      setSelectedIds(selectedIds.filter((id) => id !== lead.id));
                                    }
                                  }}
                                  className="mt-1 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <h4 className="font-serif font-bold text-sm text-slate-900 truncate">
                                    {lead.name}
                                  </h4>
                                  <p className="text-[11px] text-stone-500 truncate">
                                    {lead.phone} &middot; {lead.city || lead.source}
                                  </p>
                                </div>
                              </div>

                              <select
                                value={lead.score}
                                onChange={(e) =>
                                  handleQuickUpdate(lead.id, { score: e.target.value as LeadScore })
                                }
                                className="text-[10px] font-extrabold bg-stone-50 border border-stone-200 rounded px-1.5 py-0.5 cursor-pointer"
                              >
                                <option value="HOT">🔥 HOT</option>
                                <option value="WARM">☀️ WARM</option>
                                <option value="COLD">❄️ COLD</option>
                              </select>
                            </div>

                            {/* Budget, Guests & Expected Date */}
                            <div className="text-[11px] text-slate-600 space-y-0.5">
                              {(lead.budget || lead.guests) && (
                                <p className="font-medium text-slate-800">
                                  {lead.budget || 'Tariff TBD'} &middot; {lead.guests || '2 Guests'}
                                </p>
                              )}
                              {lead.booking_date && (
                                <p className="text-stone-500">
                                  Expected: {formatDate(lead.booking_date)}{' '}
                                  {lead.booking_time ? `at ${lead.booking_time}` : ''}
                                </p>
                              )}
                            </div>

                            {/* Inline Quick Remarks */}
                            <input
                              type="text"
                              defaultValue={lead.remarks}
                              placeholder="Add quick remark..."
                              onBlur={(e) => {
                                if (e.target.value.trim() !== lead.remarks) {
                                  handleQuickUpdate(
                                    lead.id,
                                    { remarks: e.target.value.trim() },
                                    {
                                      type: 'remark',
                                      content: `Updated remark: ${e.target.value.trim()}`,
                                      user: currentUser?.full_name || 'Admin',
                                      outcome: 'neutral',
                                    }
                                  );
                                }
                              }}
                              className="w-full px-2.5 py-1.5 text-[11px] bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:border-[#C8A45D]"
                            />

                            {/* Relevancy One-Click Toggle + Tags */}
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleRelevancy(lead, 'Relevent')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                    (lead.tags || []).includes('Relevent')
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-stone-100 text-stone-600'
                                  }`}
                                >
                                  Relevent
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleRelevancy(lead, 'Non Relevent')}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                    (lead.tags || []).includes('Non Relevent')
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-stone-100 text-stone-600'
                                  }`}
                                >
                                  Non Relevent
                                </button>

                                {(lead.tags || [])
                                  .filter((t) => t !== 'Relevent' && t !== 'Non Relevent')
                                  .map((t) => (
                                    <span
                                      key={t}
                                      className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-stone-100 px-1.5 py-0.5 rounded"
                                    >
                                      {t}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTag(lead, t)}
                                        className="hover:text-rose-600 cursor-pointer"
                                      >
                                        &times;
                                      </button>
                                    </span>
                                  ))}
                              </div>

                              <div className="flex gap-1">
                                <input
                                  type="text"
                                  value={customTagInputs[lead.id] || ''}
                                  onChange={(e) =>
                                    setCustomTagInputs({
                                      ...customTagInputs,
                                      [lead.id]: e.target.value,
                                    })
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddCustomTag(lead);
                                    }
                                  }}
                                  placeholder="+ Add custom tag..."
                                  className="flex-1 px-2 py-0.5 text-[10px] border border-stone-200 rounded"
                                />
                              </div>
                            </div>

                            {/* Follow-up & Agent Row */}
                            <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-100">
                              <button
                                type="button"
                                onClick={() => setFollowUpLead(lead)}
                                className={`flex items-center gap-1 font-semibold cursor-pointer ${
                                  isOverdue
                                    ? 'text-rose-600 font-bold'
                                    : lead.follow_up_date === todayStr
                                    ? 'text-amber-700 font-bold'
                                    : 'text-slate-600'
                                }`}
                              >
                                <Clock className="w-3 h-3" />
                                {lead.follow_up_date
                                  ? `${formatDate(lead.follow_up_date)} ${lead.follow_up_time || ''}`
                                  : 'Set Follow-up'}
                              </button>

                              <select
                                value={lead.status}
                                onChange={(e) =>
                                  handleQuickUpdate(
                                    lead.id,
                                    { status: e.target.value as LeadStatus },
                                    {
                                      type: 'status',
                                      content: `Status changed to ${e.target.value.toUpperCase()}`,
                                      user: currentUser?.full_name || 'Admin',
                                      outcome: 'neutral',
                                    }
                                  )
                                }
                                className="bg-stone-100 text-slate-800 font-bold rounded px-1.5 py-0.5 cursor-pointer"
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="followup">Follow-Up</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                              </select>
                            </div>

                            {/* Quick Action Suite Bar */}
                            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1">
                                <a
                                  href={`tel:${lead.phone}`}
                                  onClick={() =>
                                    handleQuickUpdate(
                                      lead.id,
                                      {},
                                      {
                                        type: 'call',
                                        content: `Initiated phone call to ${lead.phone}`,
                                        user: currentUser?.full_name || 'Admin',
                                        outcome: 'neutral',
                                      }
                                    )
                                  }
                                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-slate-900 hover:text-[#C8A45D] text-slate-700 transition-colors"
                                  title="Click to Call"
                                >
                                  <Phone className="w-3.5 h-3.5" />
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleWhatsAppReply(lead)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    lead.whatsapp_sent
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-stone-100 hover:bg-emerald-600 hover:text-white text-slate-700'
                                  }`}
                                  title="1-Click WhatsApp Reply"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setEmailLead(lead)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    lead.email_sent
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-stone-100 hover:bg-slate-900 hover:text-[#C8A45D] text-slate-700'
                                  }`}
                                  title="Send Email via Gmail / Worker"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setTimelineLead(lead)}
                                  className="p-1.5 rounded-lg bg-stone-100 hover:bg-slate-900 hover:text-[#C8A45D] text-slate-700 cursor-pointer"
                                  title="Activity Timeline Drawer"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {lead.status !== 'converted' && (
                                <button
                                  type="button"
                                  onClick={() => setConvertLead(lead)}
                                  className="px-2.5 py-1 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-lg text-[10px] cursor-pointer"
                                >
                                  Convert &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* VIEW 2: ELEGANT RESPONSIVE DATA TABLE WITH INLINE EDITING */
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0F172A] text-[#C8A45D] uppercase text-[11px] tracking-wider">
                    <th className="py-3.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={
                          filteredLeads.length > 0 &&
                          selectedIds.length === filteredLeads.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredLeads.map((l) => l.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3">Lead / Contact</th>
                    <th className="py-3.5 px-3">Status &amp; Score</th>
                    <th className="py-3.5 px-3">Budget &amp; Guests (Inline Edit)</th>
                    <th className="py-3.5 px-3">Expected Date</th>
                    <th className="py-3.5 px-3">Follow-Up</th>
                    <th className="py-3.5 px-3">Remarks (Inline Edit)</th>
                    <th className="py-3.5 px-3 text-right">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredLeads.map((lead) => {
                    const isSelected = selectedIds.includes(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className={`hover:bg-stone-50/80 transition-colors ${
                          isSelected ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds([...selectedIds, lead.id]);
                              } else {
                                setSelectedIds(selectedIds.filter((id) => id !== lead.id));
                              }
                            }}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-serif font-bold text-sm text-slate-900">
                            {lead.name}
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {lead.phone} &middot; {lead.email || 'No email'} &middot;{' '}
                            <span className="uppercase">{lead.source}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <select
                              value={lead.status}
                              onChange={(e) =>
                                handleQuickUpdate(lead.id, {
                                  status: e.target.value as LeadStatus,
                                })
                              }
                              className="px-2 py-1 border border-stone-300 rounded-lg bg-white font-bold text-xs cursor-pointer"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="followup">Follow-Up</option>
                              <option value="converted">Converted</option>
                              <option value="lost">Lost</option>
                            </select>
                            {renderScoreBadge(lead.score)}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              defaultValue={lead.budget}
                              placeholder="Budget"
                              onBlur={(e) => {
                                if (e.target.value !== lead.budget) {
                                  handleQuickUpdate(lead.id, { budget: e.target.value });
                                }
                              }}
                              className="w-24 px-2 py-1 border border-stone-200 rounded bg-stone-50 focus:bg-white"
                            />
                            <input
                              type="text"
                              defaultValue={lead.guests}
                              placeholder="Guests"
                              onBlur={(e) => {
                                if (e.target.value !== lead.guests) {
                                  handleQuickUpdate(lead.id, { guests: e.target.value });
                                }
                              }}
                              className="w-28 px-2 py-1 border border-stone-200 rounded bg-stone-50 focus:bg-white"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {lead.booking_date ? formatDate(lead.booking_date) : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <button
                            type="button"
                            onClick={() => setFollowUpLead(lead)}
                            className="text-left text-[11px] text-amber-800 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {lead.follow_up_date
                              ? `${formatDate(lead.follow_up_date)} ${lead.follow_up_time || ''}`
                              : 'Schedule'}
                          </button>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            defaultValue={lead.remarks}
                            placeholder="Inline notes..."
                            onBlur={(e) => {
                              if (e.target.value !== lead.remarks) {
                                handleQuickUpdate(lead.id, { remarks: e.target.value });
                              }
                            }}
                            className="w-full min-w-[180px] px-2.5 py-1 border border-stone-200 rounded bg-stone-50 focus:bg-white"
                          />
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-1.5 bg-stone-100 hover:bg-slate-900 hover:text-[#C8A45D] rounded-lg"
                              title="Call"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleWhatsAppReply(lead)}
                              className="p-1.5 bg-stone-100 hover:bg-emerald-600 hover:text-white rounded-lg cursor-pointer"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEmailLead(lead)}
                              className="p-1.5 bg-stone-100 hover:bg-slate-900 hover:text-[#C8A45D] rounded-lg cursor-pointer"
                              title="Email"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTimelineLead(lead)}
                              className="p-1.5 bg-stone-100 hover:bg-slate-900 hover:text-[#C8A45D] rounded-lg cursor-pointer"
                              title="Timeline"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                            {lead.status !== 'converted' && (
                              <button
                                type="button"
                                onClick={() => setConvertLead(lead)}
                                className="px-2.5 py-1 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-lg text-[11px] cursor-pointer"
                              >
                                Convert
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODALS & DRAWERS */}
      <AddLeadModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleCreateLead}
      />

      <ActivityTimelineDrawer
        lead={timelineLead}
        onClose={() => setTimelineLead(null)}
        onAddActivity={async (leadId, act) => {
          await handleQuickUpdate(leadId, {}, act);
          showToast('Interaction logged to timeline.');
        }}
      />

      <FollowUpModal
        lead={followUpLead}
        onClose={() => setFollowUpLead(null)}
        onSaveFollowUp={async (leadId, fDate, fTime, fRemarks) => {
          await handleQuickUpdate(
            leadId,
            {
              follow_up_date: fDate,
              follow_up_time: fTime,
              follow_up_remarks: fRemarks,
              status: 'followup',
            },
            {
              type: 'followup',
              content: `Scheduled follow-up for ${formatDate(fDate)} at ${fTime}: ${fRemarks}`,
              user: currentUser?.full_name || 'Admin',
              outcome: 'neutral',
            }
          );
          showToast(`Follow-up reminder set for ${formatDate(fDate)} at ${fTime}`);
        }}
      />

      <EmailComposeModal
        lead={emailLead}
        gmailConfig={gmailConfig}
        templates={templates}
        onClose={() => setEmailLead(null)}
        onEmailDispatched={async (leadId, subj) => {
          await handleQuickUpdate(
            leadId,
            { email_sent: true },
            {
              type: 'email',
              content: `Dispatched email: "${subj}"`,
              user: currentUser?.full_name || 'Admin',
              outcome: 'positive',
            }
          );
          showToast('Email sent and logged!');
        }}
      />

      <ConvertToBookingModal
        lead={convertLead}
        onClose={() => setConvertLead(null)}
        onConfirmConvert={async (params) => {
          const res = await convertLeadToBooking({
            ...params,
            hotelId: hotel?.id || 'ca8ca4c4-d493-490f-8d30-774e8fca42b6',
            actorName: currentUser?.full_name || 'Admin',
          });
          if (res.success) {
            const refreshed = await fetchCRMLeads();
            setLeads(refreshed.leads);
            showToast(`Converted to Booking (Ref: ${res.bookingReference})!`);
          } else {
            showToast(res.error || 'Conversion failed');
          }
        }}
      />

      <CRMIntegrationsModal
        activeModal={integrationModal}
        onClose={() => setIntegrationModal(null)}
        leadSync={leadSync}
        metaSync={metaSync}
        gmailConfig={gmailConfig}
        templates={templates}
        permissions={agentPerms}
        isSyncing={isSyncing}
        syncFeedback={syncFeedback}
        onSaveLeadSync={async (cfg) => {
          setLeadSync(cfg);
          await saveCRMAppSetting('lead_sync', cfg);
        }}
        onTriggerSheetsSync={async (urls) => {
          setIsSyncing(true);
          setSyncFeedback('');
          const res = await syncGoogleSheetsLeads(urls, leads);
          setIsSyncing(false);
          const refreshed = await fetchCRMLeads();
          setLeads(refreshed.leads);
          setSyncFeedback(
            `Sync Complete: ${res.importedCount} new lead(s) imported, ${res.skippedCount} duplicate(s) skipped.${
              res.errors.length > 0 ? ` Warnings: ${res.errors.join('; ')}` : ''
            }`
          );
        }}
        onSaveMetaSync={async (cfg) => {
          setMetaSync(cfg);
          await saveCRMAppSetting('meta_sync', cfg);
        }}
        onTriggerMetaSync={async (pId, token) => {
          setIsSyncing(true);
          setSyncFeedback('');
          const res = await syncMetaGraphLeads(pId, token, leads);
          setIsSyncing(false);
          if (res.error) {
            setSyncFeedback(`Error: ${res.error}`);
          } else {
            const refreshed = await fetchCRMLeads();
            setLeads(refreshed.leads);
            setSyncFeedback(
              `Meta Sync Complete: ${res.importedCount} lead(s) imported, ${res.skippedCount} duplicate(s) skipped.`
            );
          }
        }}
        onSaveSettings={async (gCfg, tplCfg, permsCfg) => {
          setGmailConfig(gCfg);
          setTemplates(tplCfg);
          setAgentPerms(permsCfg);
          await Promise.all([
            saveCRMAppSetting('gmail_config', gCfg),
            saveCRMAppSetting('reply_templates', tplCfg),
            saveCRMAppSetting('crm_permissions', permsCfg),
          ]);
          showToast('CRM Settings & Templates saved to Supabase!');
        }}
      />
    </div>
  );
};
