import { getSupabase } from '../lib/supabase';

export type PMSNotificationType = 'checkin' | 'enquiry' | 'maintenance';

export type PMSNotificationTargetTab =
  | 'frontdesk'
  | 'enquiries'
  | 'housekeeping'
  | 'reservations';

export interface PMSNotification {
  id: string;
  type: PMSNotificationType;
  title: string;
  message: string;
  targetTab: PMSNotificationTargetTab;
  read: boolean;
  created_at: string;
  meta?: {
    roomNumber?: string;
    guestName?: string;
    bookingRef?: string;
    priority?: string;
    contact?: string;
  };
}

const LOCAL_NOTIF_KEY = 'sunmoon_pms_notifications_v1';
const SOUND_ENABLED_KEY = 'sunmoon_pms_notif_sound';
const BROADCAST_CHANNEL_NAME = 'pms_realtime_notifications';

const SEED_NOTIFICATIONS: PMSNotification[] = [
  {
    id: 'seed-notif-checkin-1',
    type: 'checkin',
    title: 'Guest Checked In • Room 101',
    message: 'Rahul Sharma (Ref: SM-98421) checked into Deluxe Room 101 (2 Adults).',
    targetTab: 'frontdesk',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    meta: { roomNumber: '101', guestName: 'Rahul Sharma', bookingRef: 'SM-98421' },
  },
  {
    id: 'seed-notif-enquiry-1',
    type: 'enquiry',
    title: 'Incoming Website Enquiry',
    message:
      'Vikram Malhotra (+91 98112 34091): "Looking for 4 Executive Rooms for corporate stay this Friday."',
    targetTab: 'enquiries',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString(),
    meta: { guestName: 'Vikram Malhotra', contact: '+91 98112 34091' },
  },
  {
    id: 'seed-notif-maint-1',
    type: 'maintenance',
    title: 'Urgent Maintenance Request • Room 204',
    message: 'AC cooling unit pressure drop reported in Room 204 prior to VIP arrival.',
    targetTab: 'housekeeping',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    meta: { roomNumber: '204', priority: 'Urgent' },
  },
];

type NotificationListener = (
  notifications: PMSNotification[],
  latestToast?: PMSNotification
) => void;

const listeners = new Set<NotificationListener>();
const processedToastIds = new Set<string>(SEED_NOTIFICATIONS.map((n) => n.id));

let notificationsCache: PMSNotification[] = loadFromStorage();
let broadcastChannel: BroadcastChannel | null = null;
let sseSource: EventSource | null = null;
let supabaseChannelInitialised = false;

function loadFromStorage(): PMSNotification[] {
  try {
    const raw = localStorage.getItem(LOCAL_NOTIF_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed.forEach((n: PMSNotification) => processedToastIds.add(n.id));
        return parsed;
      }
    }
  } catch {
    // Ignore storage error
  }
  return [...SEED_NOTIFICATIONS];
}

function saveToStorage(list: PMSNotification[]) {
  try {
    localStorage.setItem(LOCAL_NOTIF_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // Ignore storage error
  }
}

function notifyListeners(latestToast?: PMSNotification) {
  const snapshot = [...notificationsCache];
  listeners.forEach((fn) => {
    try {
      fn(snapshot, latestToast);
    } catch {
      // Ignore listener errors
    }
  });
}

export function isNotificationSoundEnabled(): boolean {
  try {
    const val = localStorage.getItem(SOUND_ENABLED_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore
  }
}

export function playNotificationChime(type: PMSNotificationType): void {
  if (!isNotificationSoundEnabled()) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'maintenance') {
      // Urgent double-tone alert
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.32);
    } else if (type === 'checkin') {
      // Warm hospitality chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else {
      // Crisp enquiry chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(783.99, now + 0.1); // G5
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      osc.start(now);
      osc.stop(now + 0.26);
    }
  } catch {
    // Ignore audio context restrictions if user hasn't interacted yet
  }
}

/**
 * Idempotent insertion of an incoming or locally created notification.
 * Guards against duplicate broadcasts across SSE, BroadcastChannel, and optimistic updates.
 */
function upsertIncomingNotification(notif: PMSNotification, triggerToast: boolean): void {
  if (!notif || !notif.id) return;

  const existingIdx = notificationsCache.findIndex((n) => n.id === notif.id);
  if (existingIdx !== -1) {
    // Already exists; update read status if changed
    if (notificationsCache[existingIdx].read !== notif.read) {
      notificationsCache[existingIdx] = { ...notificationsCache[existingIdx], ...notif };
      saveToStorage(notificationsCache);
      notifyListeners();
    }
    return;
  }

  notificationsCache = [notif, ...notificationsCache].slice(0, 100);
  saveToStorage(notificationsCache);

  const shouldShowToast = triggerToast && !processedToastIds.has(notif.id);
  processedToastIds.add(notif.id);

  if (shouldShowToast) {
    playNotificationChime(notif.type);
    notifyListeners(notif);
  } else {
    notifyListeners();
  }
}

/**
 * Emit a real-time notification across:
 * 1. Local optimistic state (instant toast alert in active PMS tab)
 * 2. Express Server `/api/notifications` (broadcasts via SSE to all connected clients/devices)
 * 3. Browser BroadcastChannel (syncs other open tabs immediately)
 */
export async function emitPMSNotification(params: {
  id?: string;
  type: PMSNotificationType;
  title: string;
  message: string;
  targetTab?: PMSNotificationTargetTab;
  meta?: PMSNotification['meta'];
}): Promise<PMSNotification> {
  const newNotif: PMSNotification = {
    id: params.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: params.type,
    title: params.title,
    message: params.message,
    targetTab:
      params.targetTab ||
      (params.type === 'checkin'
        ? 'frontdesk'
        : params.type === 'enquiry'
        ? 'enquiries'
        : 'housekeeping'),
    read: false,
    created_at: new Date().toISOString(),
    meta: params.meta || {},
  };

  // 1. Optimistic local insert + toast trigger
  upsertIncomingNotification(newNotif, true);

  // 2. Cross-tab BroadcastChannel
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'notification:created', payload: newNotif });
    }
  } catch {
    // Ignore
  }

  // 3. Server-authoritative broadcast via REST -> SSE
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newNotif),
    });
  } catch {
    // Server might be unreachable in offline mode; local + BroadcastChannel already handled it
  }

  return newNotif;
}

export function getPMSNotifications(): PMSNotification[] {
  return [...notificationsCache];
}

export async function markNotificationRead(id: string): Promise<void> {
  notificationsCache = notificationsCache.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveToStorage(notificationsCache);
  notifyListeners();

  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'notification:read', payload: { id } });
    }
    await fetch(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
  } catch {
    // Handled locally
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  notificationsCache = notificationsCache.map((n) => ({ ...n, read: true }));
  saveToStorage(notificationsCache);
  notifyListeners();

  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'notifications:read-all' });
    }
    await fetch('/api/notifications/read-all', { method: 'POST' });
  } catch {
    // Handled locally
  }
}

export async function clearAllNotifications(): Promise<void> {
  notificationsCache = [];
  saveToStorage(notificationsCache);
  notifyListeners();

  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'notifications:cleared' });
    }
    await fetch('/api/notifications', { method: 'DELETE' });
  } catch {
    // Handled locally
  }
}

function initRealtimeTransports(): void {
  if (typeof window === 'undefined') return;

  // 1. BroadcastChannel for multi-tab sync
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;
        if (data.type === 'notification:created' && data.payload) {
          upsertIncomingNotification(data.payload as PMSNotification, true);
        } else if (data.type === 'notification:read' && data.payload?.id) {
          notificationsCache = notificationsCache.map((n) =>
            n.id === data.payload.id ? { ...n, read: true } : n
          );
          saveToStorage(notificationsCache);
          notifyListeners();
        } else if (data.type === 'notifications:read-all') {
          notificationsCache = notificationsCache.map((n) => ({ ...n, read: true }));
          saveToStorage(notificationsCache);
          notifyListeners();
        } else if (data.type === 'notifications:cleared') {
          notificationsCache = [];
          saveToStorage(notificationsCache);
          notifyListeners();
        }
      };
    } catch {
      // Ignore BroadcastChannel error
    }
  }

  // 2. Server-Sent Events (SSE) stream from Express backend
  if (!sseSource && 'EventSource' in window) {
    try {
      sseSource = new EventSource('/api/notifications/stream');

      sseSource.addEventListener('notifications:init', (e: MessageEvent) => {
        try {
          const serverList = JSON.parse(e.data) as PMSNotification[];
          if (Array.isArray(serverList) && serverList.length > 0) {
            const existingIds = new Set(notificationsCache.map((n) => n.id));
            let changed = false;
            serverList.forEach((item) => {
              processedToastIds.add(item.id);
              if (!existingIds.has(item.id)) {
                notificationsCache.push(item);
                changed = true;
              }
            });
            if (changed) {
              notificationsCache.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              saveToStorage(notificationsCache);
              notifyListeners();
            }
          }
        } catch {
          // Ignore parse errors
        }
      });

      sseSource.addEventListener('notification:created', (e: MessageEvent) => {
        try {
          const created = JSON.parse(e.data) as PMSNotification;
          upsertIncomingNotification(created, true);
        } catch {
          // Ignore
        }
      });

      sseSource.addEventListener('notification:updated', (e: MessageEvent) => {
        try {
          const updated = JSON.parse(e.data) as PMSNotification;
          notificationsCache = notificationsCache.map((n) => (n.id === updated.id ? updated : n));
          saveToStorage(notificationsCache);
          notifyListeners();
        } catch {
          // Ignore
        }
      });

      sseSource.addEventListener('notifications:read-all', () => {
        notificationsCache = notificationsCache.map((n) => ({ ...n, read: true }));
        saveToStorage(notificationsCache);
        notifyListeners();
      });

      sseSource.addEventListener('notifications:cleared', () => {
        notificationsCache = [];
        saveToStorage(notificationsCache);
        notifyListeners();
      });
    } catch {
      // Ignore SSE errors
    }
  }

  // 3. Supabase Realtime Postgres Changes subscription (if Supabase is connected)
  if (!supabaseChannelInitialised) {
    const supabase = getSupabase();
    if (supabase) {
      supabaseChannelInitialised = true;
      try {
        supabase
          .channel('pms-live-operations-feed')
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bookings' },
            (payload: any) => {
              const newRow = payload.new;
              const oldRow = payload.old;
              if (newRow && newRow.status === 'Checked-In' && oldRow?.status !== 'Checked-In') {
                upsertIncomingNotification(
                  {
                    id: `sb-checkin-${newRow.id}-${newRow.checked_in_at || Date.now()}`,
                    type: 'checkin',
                    title: `Guest Checked In • ${newRow.booking_reference || 'Walk-In'}`,
                    message: `${newRow.guest_name || 'Guest'} checked in (${newRow.adults || 1} Adults).`,
                    targetTab: 'frontdesk',
                    read: false,
                    created_at: new Date().toISOString(),
                    meta: {
                      guestName: newRow.guest_name,
                      bookingRef: newRow.booking_reference,
                    },
                  },
                  true
                );
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'enquiries' },
            (payload: any) => {
              const row = payload.new;
              if (row) {
                upsertIncomingNotification(
                  {
                    id: `sb-enq-${row.id}`,
                    type: 'enquiry',
                    title: `Incoming Website Enquiry • ${row.name || 'Guest'}`,
                    message: `${row.name} (${row.mobile || row.email || 'Website'}): "${(row.message || '').slice(0, 90)}"`,
                    targetTab: 'enquiries',
                    read: false,
                    created_at: row.created_at || new Date().toISOString(),
                    meta: {
                      guestName: row.name,
                      contact: row.mobile || row.email,
                    },
                  },
                  true
                );
              }
            }
          )
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'housekeeping_tasks' },
            (payload: any) => {
              const row = payload.new;
              if (
                row &&
                (row.task_type === 'Maintenance' ||
                  row.priority === 'Urgent' ||
                  row.priority === 'High')
              ) {
                upsertIncomingNotification(
                  {
                    id: `sb-maint-${row.id}`,
                    type: 'maintenance',
                    title: `Urgent Maintenance Request`,
                    message: `${row.notes || 'Maintenance attention required'} (Priority: ${row.priority || 'Urgent'})`,
                    targetTab: 'housekeeping',
                    read: false,
                    created_at: row.created_at || new Date().toISOString(),
                    meta: {
                      priority: row.priority || 'Urgent',
                    },
                  },
                  true
                );
              }
            }
          )
          .subscribe();
      } catch {
        // Ignore if realtime is not enabled on Supabase tables
      }
    }
  }
}

export function subscribeToPMSNotifications(listener: NotificationListener): () => void {
  initRealtimeTransports();
  listeners.add(listener);
  // Immediately invoke with current state (no toast)
  listener([...notificationsCache]);

  return () => {
    listeners.delete(listener);
  };
}
