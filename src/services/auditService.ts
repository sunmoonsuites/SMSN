import { getSupabase } from '../lib/supabase';
import { AuditLog } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_AUDIT_KEY = 'pms_local_audit_logs';

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

function getLocalAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAuditLog(entry: AuditLog) {
  try {
    const current = getLocalAuditLogs();
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify([entry, ...current].slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }
}

export async function logAction(
  hotelId: string,
  action: string,
  entity: string,
  entityId?: string,
  details: Record<string, any> = {},
  userId?: string,
  userName?: string
): Promise<void> {
  const localEntry: AuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hotel_id: hotelId || 'default-hotel-id',
    action,
    entity,
    entity_id: entityId,
    details,
    user_id: userId,
    user_name: userName || 'System Staff',
    created_at: new Date().toISOString(),
  };

  saveLocalAuditLog(localEntry);

  const supabase = getSupabase();
  if (!supabase || !isValidUuid(hotelId)) {
    return;
  }

  try {
    await supabase.from('audit_logs').insert({
      hotel_id: hotelId,
      action,
      entity,
      entity_id: entityId || null,
      details,
      user_id: isValidUuid(userId) ? userId : null,
      user_name: userName || 'System Staff',
    });
  } catch {
    // Local audit log already saved
  }
}

export async function getAuditLogs(hotelId: string, limit: number = 50): Promise<AuditLog[]> {
  const localLogs = getLocalAuditLogs();
  const supabase = getSupabase();
  if (!supabase || !isValidUuid(hotelId)) {
    return localLogs.slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return localLogs.slice(0, limit);
    const remoteLogs = (data as AuditLog[]) || [];
    return remoteLogs.length > 0 ? remoteLogs : localLogs.slice(0, limit);
  } catch {
    return localLogs.slice(0, limit);
  }
}
