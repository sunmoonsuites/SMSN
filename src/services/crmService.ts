import Papa from 'papaparse';
import { getSupabase } from '../lib/supabase';
import { createBooking } from './bookingService';
import { getTodayLocalDateStr, getNextDayLocalDateStr } from '../lib/utils';

export type LeadStatus = 'new' | 'contacted' | 'followup' | 'converted' | 'lost' | 'hot';
export type LeadScore = 'HOT' | 'WARM' | 'COLD';
export type LeadSource =
  | 'website'
  | 'google_sheets'
  | 'meta'
  | 'direct'
  | 'manual'
  | 'referral'
  | 'walk_in'
  | 'phone_call';

export interface LeadActivity {
  id: string;
  type:
    | 'status'
    | 'remark'
    | 'assignment'
    | 'followup'
    | 'automated'
    | 'call'
    | 'whatsapp'
    | 'email'
    | 'visit';
  content: string;
  user: string;
  outcome: 'positive' | 'neutral' | 'negative' | 'none';
  timestamp: string;
}

export interface CRMLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: LeadSource | string;
  status: LeadStatus;
  score: LeadScore;
  budget: string;
  guests: string;
  city: string;
  booking_date: string | null;
  booking_time: string;
  remarks: string;
  tags: string[];
  meta_lead_id?: string | null;
  sync_hash?: string | null;
  follow_up_date?: string | null;
  follow_up_time?: string;
  follow_up_remarks?: string;
  assigned_agent?: string | null;
  assigned_agent_name?: string;
  email_sent: boolean;
  whatsapp_sent: boolean;
  history: LeadActivity[];
  created_at: string;
  status_updated_at: string;
}

export interface LeadSyncConfig {
  csvUrls: string[];
  processedHashes: string[];
  lastSyncedAt?: string;
  autoSyncEnabled: boolean;
}

export interface MetaSyncConfig {
  pageId: string;
  accessToken: string;
  lastSyncedAt?: string;
}

export interface GmailCrmConfig {
  user: string;
  pass: string;
  workerUrl: string;
  workerSecret: string;
  senderName: string;
}

export interface ReplyTemplatesConfig {
  emailSubject: string;
  email: string;
  whatsapp: string;
}

export interface CRMUserPermissions {
  viewLeads: boolean;
  addLeads: boolean;
  editLeads: boolean;
  deleteLeads: boolean;
  leadsSettings: boolean;
}

const LOCAL_LEADS_KEY = 'sms_luxury_crm_leads_v1';
const LOCAL_SETTINGS_KEY = 'sms_luxury_crm_settings_v1';

export const DEFAULT_LEAD_SYNC_CONFIG: LeadSyncConfig = {
  csvUrls: [],
  processedHashes: [],
  autoSyncEnabled: true,
};

export const DEFAULT_META_SYNC_CONFIG: MetaSyncConfig = {
  pageId: '',
  accessToken: '',
};

export const DEFAULT_GMAIL_CRM_CONFIG: GmailCrmConfig = {
  user: 'sunmoonsuites@gmail.com',
  pass: '',
  workerUrl: '',
  workerSecret: '',
  senderName: 'Sun Moon Suites CRM',
};

export const DEFAULT_REPLY_TEMPLATES: ReplyTemplatesConfig = {
  emailSubject: 'Exclusive Stay & Event Quotation — Sun Moon Suites, Sector 117 Noida',
  email:
    'Dear {name},\n\nThank you for reaching out to Sun Moon Suites, Sector 117 Noida.\n\nWe would be delighted to host you. Our reservations desk has prepared a customized tariff plan for your upcoming dates. Please let us know a convenient time for a quick call, or reply directly to this email with any special preferences.\n\nWarm Regards,\nReservations & Guest Relations\nSun Moon Suites, Sector 117 Noida\nPhone: +91 8586868442',
  whatsapp:
    'Hello {name}, greetings from *Sun Moon Suites (Sector 117, Noida)*! Thank you for your enquiry regarding your upcoming stay/event. How may our reservations desk assist you today?',
};

export const DEFAULT_AGENT_PERMISSIONS: CRMUserPermissions = {
  viewLeads: true,
  addLeads: true,
  editLeads: true,
  deleteLeads: false,
  leadsSettings: false,
};

// Pure production CRM: Zero mock leads by default.
// Leads arrive strictly via Google Sheets Sync, Meta Lead Ads, Direct Website Intake, or Manual Entry.
const SEED_LEADS: CRMLead[] = [];

function getLocalLeads(): CRMLead[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Cleanse any legacy mock leads from previous sessions
        const cleaned = parsed.filter(
          (l) =>
            !String(l.id || '').startsWith('c01a8b10-') &&
            l.name !== 'Aarav Singhania' &&
            l.name !== 'Dr. Meera Kapoor' &&
            l.name !== 'Siddharth Malhotra' &&
            l.name !== 'Karanveer Arora'
        );
        if (cleaned.length !== parsed.length) {
          saveLocalLeads(cleaned);
        }
        return cleaned;
      }
    }
  } catch {
    // ignore
  }
  return [];
}

function saveLocalLeads(leads: CRMLead[]): void {
  try {
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(leads));
  } catch {
    // ignore
  }
}

function normalizeLeadRow(row: any): CRMLead {
  return {
    id: String(row.id || crypto.randomUUID()),
    name: String(row.name || 'Unnamed Lead'),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    source: row.source || 'website',
    status: (row.status || 'new') as LeadStatus,
    score: (row.score || 'COLD') as LeadScore,
    budget: String(row.budget || ''),
    guests: String(row.guests || ''),
    city: String(row.city || ''),
    booking_date: row.booking_date || row.bookingDate || null,
    booking_time: String(row.booking_time || row.bookingTime || ''),
    remarks: String(row.remarks || ''),
    tags: Array.isArray(row.tags) ? row.tags : [],
    meta_lead_id: row.meta_lead_id || row.metaLeadId || null,
    sync_hash: row.sync_hash || row.syncHash || null,
    follow_up_date: row.follow_up_date || row.followUpDate || null,
    follow_up_time: String(row.follow_up_time || row.followUpTime || ''),
    follow_up_remarks: String(row.follow_up_remarks || row.followUpRemarks || ''),
    assigned_agent: row.assigned_agent || row.assignedAgent || null,
    assigned_agent_name: String(row.assigned_agent_name || row.assignedAgentName || ''),
    email_sent: Boolean(row.email_sent ?? row.emailSent),
    whatsapp_sent: Boolean(row.whatsapp_sent ?? row.whatsappSent),
    history: Array.isArray(row.history) ? row.history : [],
    created_at: row.created_at || row.createdAt || new Date().toISOString(),
    status_updated_at: row.status_updated_at || row.statusUpdatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all leads from Supabase `public.leads` (with zero mock data)
 */
export async function fetchCRMLeads(): Promise<{
  leads: CRMLead[];
  supabaseTableReady: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { leads: getLocalLeads(), supabaseTableReady: false };
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // If table `public.leads` does not exist yet in Supabase, fallback gracefully to local mirror
      console.warn('Supabase leads query warning (using local mirror):', error.message);
      return { leads: getLocalLeads(), supabaseTableReady: false };
    }

    if (!data || data.length === 0) {
      saveLocalLeads([]);
      return { leads: [], supabaseTableReady: true };
    }

    // Purge legacy mock leads if they were previously inserted into Supabase
    const mockIds = data
      .filter(
        (r: any) =>
          String(r.id || '').startsWith('c01a8b10-') ||
          r.name === 'Aarav Singhania' ||
          r.name === 'Dr. Meera Kapoor' ||
          r.name === 'Siddharth Malhotra' ||
          r.name === 'Karanveer Arora'
      )
      .map((r: any) => r.id);

    if (mockIds.length > 0) {
      try {
        await supabase.from('leads').delete().in('id', mockIds);
      } catch {
        // ignore
      }
    }

    const realData = data.filter((r: any) => !mockIds.includes(r.id));
    const normalized = realData.map(normalizeLeadRow);
    saveLocalLeads(normalized);
    return { leads: normalized, supabaseTableReady: true };
  } catch (err) {
    console.warn('Error fetching CRM leads:', err);
    return { leads: getLocalLeads(), supabaseTableReady: false };
  }
}

/**
 * Subscribe to real-time changes on `public.leads`
 */
export function subscribeToLeadsRealtime(onUpdate: () => void): () => void {
  const supabase = getSupabase();
  if (!supabase) return () => {};

  const channel = supabase
    .channel('leads-crm')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'leads' },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Create a new lead in Supabase & local mirror
 */
export async function createCRMLead(
  leadInput: Partial<CRMLead>,
  actorName = 'Admin'
): Promise<{ success: boolean; lead?: CRMLead; error?: string }> {
  const nowIso = new Date().toISOString();
  const initialActivity: LeadActivity = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: 'automated',
    content: `Lead created manually (${leadInput.source || 'manual'}).`,
    user: actorName,
    outcome: 'neutral',
    timestamp: nowIso,
  };

  const newLead: CRMLead = {
    id: crypto.randomUUID(),
    name: (leadInput.name || '').trim(),
    email: (leadInput.email || '').trim(),
    phone: (leadInput.phone || '').trim(),
    source: leadInput.source || 'manual',
    status: (leadInput.status || 'new') as LeadStatus,
    score: (leadInput.score || 'WARM') as LeadScore,
    budget: (leadInput.budget || '').trim(),
    guests: (leadInput.guests || '').trim(),
    city: (leadInput.city || '').trim(),
    booking_date: leadInput.booking_date || null,
    booking_time: (leadInput.booking_time || '').trim(),
    remarks: (leadInput.remarks || '').trim(),
    tags: Array.isArray(leadInput.tags) ? leadInput.tags : ['Relevent'],
    meta_lead_id: leadInput.meta_lead_id || null,
    sync_hash:
      leadInput.sync_hash ||
      buildLeadSyncHash(
        leadInput.email || '',
        leadInput.phone || '',
        leadInput.name || '',
        leadInput.booking_date || ''
      ),
    follow_up_date: leadInput.follow_up_date || null,
    follow_up_time: leadInput.follow_up_time || '',
    follow_up_remarks: leadInput.follow_up_remarks || '',
    assigned_agent: leadInput.assigned_agent || null,
    assigned_agent_name: leadInput.assigned_agent_name || actorName,
    email_sent: Boolean(leadInput.email_sent),
    whatsapp_sent: Boolean(leadInput.whatsapp_sent),
    history:
      Array.isArray(leadInput.history) && leadInput.history.length > 0
        ? leadInput.history
        : [initialActivity],
    created_at: nowIso,
    status_updated_at: nowIso,
  };

  // Update local storage immediately
  const existing = getLocalLeads();
  saveLocalLeads([newLead, ...existing]);

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([newLead])
        .select('*')
        .single();
      if (!error && data) {
        return { success: true, lead: normalizeLeadRow(data) };
      }
    } catch {
      // Fallback already saved locally
    }
  }

  return { success: true, lead: newLead };
}

/**
 * Update an existing lead and optionally append an ActivityLog entry
 */
export async function updateCRMLead(
  leadId: string,
  updates: Partial<CRMLead>,
  activityEntry?: Omit<LeadActivity, 'id' | 'timestamp'>
): Promise<{ success: boolean; lead?: CRMLead }> {
  const existingList = getLocalLeads();
  const target = existingList.find((l) => l.id === leadId);
  const nowIso = new Date().toISOString();

  const updatedHistory: LeadActivity[] = target ? [...(target.history || [])] : [];
  if (activityEntry) {
    updatedHistory.unshift({
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: nowIso,
      ...activityEntry,
    });
  }

  const finalUpdates: Partial<CRMLead> = {
    ...updates,
    ...(activityEntry ? { history: updatedHistory } : {}),
    ...(updates.status ? { status_updated_at: nowIso } : {}),
  };

  const updatedList = existingList.map((item) =>
    item.id === leadId ? { ...item, ...finalUpdates } : item
  );
  saveLocalLeads(updatedList);
  const updatedLead = updatedList.find((l) => l.id === leadId);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').update(finalUpdates).eq('id', leadId);
    } catch {
      // local mirror already updated
    }
  }

  return { success: true, lead: updatedLead };
}

/**
 * Bulk update or delete multiple leads
 */
export async function bulkUpdateCRMLeads(
  leadIds: string[],
  updates: Partial<CRMLead>,
  actorName = 'Admin'
): Promise<boolean> {
  if (leadIds.length === 0) return true;
  const idSet = new Set(leadIds);
  const nowIso = new Date().toISOString();

  const list = getLocalLeads().map((l) => {
    if (!idSet.has(l.id)) return l;
    const logEntry: LeadActivity = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: updates.status ? 'status' : 'assignment',
      content: updates.status
        ? `Bulk updated status to ${updates.status.toUpperCase()}`
        : `Bulk assigned to ${updates.assigned_agent_name}`,
      user: actorName,
      outcome: 'neutral',
      timestamp: nowIso,
    };
    return {
      ...l,
      ...updates,
      status_updated_at: nowIso,
      history: [logEntry, ...(l.history || [])],
    };
  });
  saveLocalLeads(list);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('leads')
        .update({ ...updates, status_updated_at: nowIso })
        .in('id', leadIds);
    } catch {
      // ignore
    }
  }
  return true;
}

export async function bulkDeleteCRMLeads(leadIds: string[]): Promise<boolean> {
  if (leadIds.length === 0) return true;
  const idSet = new Set(leadIds);
  const remaining = getLocalLeads().filter((l) => !idSet.has(l.id));
  saveLocalLeads(remaining);

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('leads').delete().in('id', leadIds);
    } catch {
      // ignore
    }
  }
  return true;
}

/**
 * App Settings Persistence (`public.app_settings` + localStorage mirror)
 */
export async function getCRMAppSettings(): Promise<{
  lead_sync: LeadSyncConfig;
  meta_sync: MetaSyncConfig;
  gmail_config: GmailCrmConfig;
  reply_templates: ReplyTemplatesConfig;
  crm_permissions: CRMUserPermissions;
}> {
  let localObj: Record<string, any> = {};
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) localObj = JSON.parse(raw);
  } catch {
    // ignore
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('app_settings').select('*');
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row.key && row.value) {
            localObj[row.key] = row.value;
          }
        }
        localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(localObj));
      }
    } catch {
      // ignore
    }
  }

  return {
    lead_sync: { ...DEFAULT_LEAD_SYNC_CONFIG, ...(localObj.lead_sync || {}) },
    meta_sync: { ...DEFAULT_META_SYNC_CONFIG, ...(localObj.meta_sync || {}) },
    gmail_config: { ...DEFAULT_GMAIL_CRM_CONFIG, ...(localObj.gmail_config || {}) },
    reply_templates: { ...DEFAULT_REPLY_TEMPLATES, ...(localObj.reply_templates || {}) },
    crm_permissions: { ...DEFAULT_AGENT_PERMISSIONS, ...(localObj.crm_permissions || {}) },
  };
}

export async function saveCRMAppSetting(key: string, value: any): Promise<boolean> {
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    const localObj = raw ? JSON.parse(raw) : {};
    localObj[key] = value;
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(localObj));
  } catch {
    // ignore
  }

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('app_settings').upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );
    } catch {
      // ignore
    }
  }
  return true;
}

/**
 * Helper to generate composite sync_hash for Google Sheets deduplication
 */
export function buildLeadSyncHash(
  email: string,
  phone: string,
  name: string,
  bookingDate: string
): string {
  const e = (email || '').toLowerCase().trim();
  const p = (phone || '').replace(/\D/g, '').slice(-10);
  const n = (name || '').toLowerCase().trim().replace(/\s+/g, '_');
  const d = (bookingDate || '').trim();
  return `${e}-${p}-${n}-${d}`;
}

/**
 * Converts standard Google Sheets URLs (/edit, /pubhtml, /pub) into valid CSV export URLs
 */
export function convertGoogleSheetToCsvUrl(rawUrl: string): string {
  const url = rawUrl.trim();
  if (!url) return '';

  // Already a direct CSV export link
  if (url.includes('output=csv') || url.includes('format=csv')) {
    return url;
  }

  // Extract gid if present
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/i);
  const gid = gidMatch ? gidMatch[1] : '0';

  // Case 1: Published Google Sheet (/spreadsheets/d/e/2PACX-.../pubhtml or /pub)
  const pubMatch = url.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/e/${pubMatch[1]}/pub?gid=${gid}&single=true&output=csv`;
  }

  // Case 2: Standard Google Sheet (/spreadsheets/d/<ID>/edit...)
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gid}`;
  }

  return url;
}

/**
 * Syncs leads from multiple Google Sheets CSV URLs with PapaParse and deduplication
 */
export async function syncGoogleSheetsLeads(
  csvUrls: string[],
  existingLeads: CRMLead[]
): Promise<{ importedCount: number; skippedCount: number; errors: string[] }> {
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const existingHashes = new Set<string>();
  const existingPhones = new Set<string>();
  existingLeads.forEach((l) => {
    if (l.sync_hash) existingHashes.add(l.sync_hash);
    const cleanP = (l.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanP.length >= 10) {
      existingPhones.add(`${cleanP}-${l.booking_date || ''}`);
    }
  });

  const newLeadsBatch: CRMLead[] = [];

  for (const rawUrl of csvUrls) {
    if (!rawUrl.trim()) continue;
    const exportUrl = convertGoogleSheetToCsvUrl(rawUrl);

    try {
      const resp = await fetch('/api/crm/fetch-sheet-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: exportUrl }),
      });
      const json = await resp.json();
      if (!json.success || !json.csvText) {
        errors.push(json.error || `Failed to fetch ${rawUrl}`);
        continue;
      }

      const parsed = Papa.parse<Record<string, any>>(json.csvText, {
        header: true,
        skipEmptyLines: true,
      });

      for (const row of parsed.data) {
        // Flexible column lookup
        const getVal = (keys: string[]): string => {
          for (const k of Object.keys(row)) {
            const normK = k.toLowerCase().trim();
            if (keys.some((target) => normK.includes(target))) {
              return String(row[k] || '').trim();
            }
          }
          return '';
        };

        const name = getVal(['name', 'guest', 'client', 'customer', 'full_name']);
        const phone = getVal(['phone', 'mobile', 'contact', 'whatsapp', 'number']);
        const email = getVal(['email', 'mail']);
        const budget = getVal(['budget', 'price', 'tariff', 'amount']);
        const guests = getVal(['guest', 'pax', 'people', 'adults', 'person']);
        const city = getVal(['city', 'location', 'place', 'address']);
        const rawDate = getVal(['date', 'check_in', 'checkin', 'booking_date', 'event_date']);
        const remarks = getVal(['remark', 'note', 'requirement', 'message', 'comment']);

        if (!name && !phone && !email) continue;

        let validDate: string | null = null;
        if (rawDate) {
          const parsedDate = new Date(rawDate);
          if (!isNaN(parsedDate.getTime())) {
            validDate = parsedDate.toISOString().split('T')[0];
          }
        }

        const syncHash = buildLeadSyncHash(email, phone, name || 'Sheet Lead', validDate || '');
        const cleanP = phone.replace(/\D/g, '').slice(-10);
        const compositePhoneKey = `${cleanP}-${validDate || ''}`;

        if (
          existingHashes.has(syncHash) ||
          (cleanP.length >= 10 && existingPhones.has(compositePhoneKey))
        ) {
          skippedCount++;
          continue;
        }

        existingHashes.add(syncHash);
        if (cleanP.length >= 10) existingPhones.add(compositePhoneKey);

        const nowIso = new Date().toISOString();
        const leadObj: CRMLead = {
          id: crypto.randomUUID(),
          name: name || 'Google Sheet Lead',
          email,
          phone,
          source: 'google_sheets',
          status: 'new',
          score: 'WARM',
          budget,
          guests,
          city,
          booking_date: validDate,
          booking_time: '',
          remarks: remarks || 'Imported via Google Sheets 2-Way Sync',
          tags: ['Relevent', 'Google Sheets'],
          meta_lead_id: null,
          sync_hash: syncHash,
          follow_up_date: null,
          follow_up_time: '',
          follow_up_remarks: '',
          assigned_agent: null,
          assigned_agent_name: 'Unassigned',
          email_sent: false,
          whatsapp_sent: false,
          history: [
            {
              id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              type: 'automated',
              content: 'Imported automatically via Google Sheets CSV Sync.',
              user: 'Google Sheets Sync',
              outcome: 'none',
              timestamp: nowIso,
            },
          ],
          created_at: nowIso,
          status_updated_at: nowIso,
        };

        newLeadsBatch.push(leadObj);
        importedCount++;
      }
    } catch (err: any) {
      errors.push(err?.message || `Error syncing ${rawUrl}`);
    }
  }

  if (newLeadsBatch.length > 0) {
    const updatedLocal = [...newLeadsBatch, ...getLocalLeads()];
    saveLocalLeads(updatedLocal);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from('leads')
          .upsert(newLeadsBatch, { onConflict: 'sync_hash', ignoreDuplicates: true });
      } catch {
        // local already updated
      }
    }
  }

  return { importedCount, skippedCount, errors };
}

/**
 * Syncs leads from Meta (Facebook & Instagram Lead Ads) Graph API v19.0
 */
export async function syncMetaGraphLeads(
  pageId: string,
  accessToken: string,
  existingLeads: CRMLead[]
): Promise<{ importedCount: number; skippedCount: number; error?: string }> {
  const cleanPageId = pageId.trim();
  const cleanToken = accessToken.trim();
  if (!cleanPageId || !cleanToken) {
    return {
      importedCount: 0,
      skippedCount: 0,
      error: 'Please enter both Meta Page ID / Form ID and Graph API Access Token.',
    };
  }

  try {
    const graphUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(
      cleanPageId
    )}/leads?access_token=${encodeURIComponent(cleanToken)}&fields=created_time,id,field_data`;

    const resp = await fetch(graphUrl);
    const json = await resp.json();

    if (json.error) {
      return {
        importedCount: 0,
        skippedCount: 0,
        error: json.error.message || 'Meta Graph API returned an error.',
      };
    }

    const rawList: any[] = Array.isArray(json.data) ? json.data : [];
    const existingMetaIds = new Set(existingLeads.map((l) => l.meta_lead_id).filter(Boolean));

    let importedCount = 0;
    let skippedCount = 0;
    const newBatch: CRMLead[] = [];

    for (const item of rawList) {
      const metaId = String(item.id || '');
      if (!metaId || existingMetaIds.has(metaId)) {
        skippedCount++;
        continue;
      }

      const fieldData: Array<{ name: string; values: string[] }> = Array.isArray(item.field_data)
        ? item.field_data
        : [];
      const getField = (keys: string[]): string => {
        for (const f of fieldData) {
          const fname = (f.name || '').toLowerCase();
          if (keys.some((k) => fname.includes(k))) {
            return Array.isArray(f.values) && f.values[0] ? String(f.values[0]).trim() : '';
          }
        }
        return '';
      };

      const name = getField(['full_name', 'name', 'first_name']) || 'Meta Ad Lead';
      const phone = getField(['phone', 'mobile', 'contact']);
      const email = getField(['email']);
      const guests = getField(['guest', 'pax', 'people']);
      const city = getField(['city', 'location']);
      const rawDate = getField(['date', 'event', 'check_in']);

      let validDate: string | null = null;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) validDate = d.toISOString().split('T')[0];
      }

      const nowIso = item.created_time
        ? new Date(item.created_time).toISOString()
        : new Date().toISOString();

      const leadObj: CRMLead = {
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        source: 'meta',
        status: 'new',
        score: 'HOT',
        budget: '',
        guests,
        city,
        booking_date: validDate,
        booking_time: '',
        remarks: `Synced from Facebook/Instagram Lead Ad (ID: ${metaId})`,
        tags: ['Relevent', 'Meta Ads'],
        meta_lead_id: metaId,
        sync_hash: buildLeadSyncHash(email, phone, name, validDate || ''),
        follow_up_date: getTodayLocalDateStr(),
        follow_up_time: '12:00',
        follow_up_remarks: 'Call new Meta Lead Ad enquiry.',
        assigned_agent: null,
        assigned_agent_name: 'Unassigned',
        email_sent: false,
        whatsapp_sent: false,
        history: [
          {
            id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: 'automated',
            content: `Lead captured from Facebook/Instagram Lead Ads (${metaId}).`,
            user: 'Meta Lead Sync',
            outcome: 'none',
            timestamp: nowIso,
          },
        ],
        created_at: nowIso,
        status_updated_at: nowIso,
      };

      existingMetaIds.add(metaId);
      newBatch.push(leadObj);
      importedCount++;
    }

    if (newBatch.length > 0) {
      saveLocalLeads([...newBatch, ...getLocalLeads()]);
      const supabase = getSupabase();
      if (supabase) {
        try {
          await supabase
            .from('leads')
            .upsert(newBatch, { onConflict: 'meta_lead_id', ignoreDuplicates: true });
        } catch {
          // ignore
        }
      }
    }

    return { importedCount, skippedCount };
  } catch (err: any) {
    return {
      importedCount: 0,
      skippedCount: 0,
      error: err?.message || 'Failed to connect to Meta Graph API.',
    };
  }
}

/**
 * 1-Click Convert Lead to Booking:
 * 1) Inserts into `public.crm_bookings`
 * 2) Also creates a real reservation in PMS `public.bookings` so Front Desk & Reservations see it
 * 3) Marks lead status = 'converted' and logs activity
 */
export async function convertLeadToBooking(params: {
  lead: CRMLead;
  hotelId: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalAmount: number;
  actorName?: string;
}): Promise<{ success: boolean; bookingReference?: string; error?: string }> {
  const { lead, hotelId, checkIn, checkOut, guestsCount, totalAmount, actorName = 'Admin' } = params;

  try {
    const supabase = getSupabase();
    if (supabase) {
      // 1. Insert into CRM's dedicated `public.crm_bookings` table
      try {
        await supabase.from('crm_bookings').insert([
          {
            lead_id: lead.id,
            name: lead.name,
            mobile: lead.phone || '0000000000',
            email: lead.email || '',
            check_in: checkIn,
            check_out: checkOut,
            guests: guestsCount,
            status: 'pending',
            total_amount: totalAmount,
            booked_by: actorName,
          },
        ]);
      } catch {
        // Ignore if crm_bookings table not created yet
      }
    }

    // 2. Also create in Hotel PMS bookings so Front Desk / Reservations tab has it immediately
    const pmsBookingRes = await createBooking({
      hotelId,
      guestName: lead.name,
      guestEmail: lead.email || 'guest@sunmoonsuites.com',
      guestPhone: lead.phone || '+91 9000000000',
      checkInDate: checkIn,
      checkOutDate: checkOut,
      adults: Math.max(1, guestsCount),
      children: 0,
      ratePerNight: totalAmount > 0 ? totalAmount : 999,
      source: 'Phone',
      specialRequests: `Converted from Luxury CRM Lead (${lead.source}). ${lead.remarks || ''}`.trim(),
      paymentStatus: 'Pending',
      paidAmount: 0,
    });

    const bookingRef = pmsBookingRes.booking?.booking_reference || `CRM-${Date.now().toString().slice(-5)}`;

    // 3. Mark lead as converted
    await updateCRMLead(
      lead.id,
      { status: 'converted' },
      {
        type: 'status',
        content: `Converted to Booking (Ref: ${bookingRef}) for ${checkIn} to ${checkOut} (₹${totalAmount}).`,
        user: actorName,
        outcome: 'positive',
      }
    );

    return { success: true, bookingReference: bookingRef };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to convert lead to booking.',
    };
  }
}

/**
 * Exports filtered leads to a downloadable CSV file using PapaParse.unparse
 */
export function exportLeadsToCsvFile(leads: CRMLead[]): void {
  const rows = leads.map((l) => ({
    Date: l.created_at ? new Date(l.created_at).toLocaleDateString('en-IN') : '',
    Name: l.name,
    Email: l.email,
    Phone: l.phone,
    Score: l.score,
    Budget: l.budget,
    Guests: l.guests,
    City: l.city,
    'Expected Date': l.booking_date || '',
    'Expected Time': l.booking_time || '',
    Source: l.source,
    Tags: (l.tags || []).join(', '),
    'Follow-Up Date': l.follow_up_date || '',
    'Follow-Up Time': l.follow_up_time || '',
    'Assigned Agent': l.assigned_agent_name || '',
    Remarks: l.remarks,
    Status: l.status.toUpperCase(),
  }));

  const csvContent = Papa.unparse(rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `SunMoonSuites_CRM_Leads_${new Date().toISOString().split('T')[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
