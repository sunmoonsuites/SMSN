/**
 * Unique Visitor Counter Service for Sun Moon Suites
 * 
 * Accurately tracks unique visitors across the website.
 * Anti-Refresh Rule:
 * - Checks localStorage and persistent 1-year cookie for unique visitor token.
 * - Repeated page refreshes (F5 / Cmd+R / navigation) NEVER increment the count.
 * - Only brand-new unique visitors increment the counter.
 */

const VISITOR_ID_KEY = 'sms_unique_visitor_id';
const VISITOR_RECORDED_KEY = 'sms_visitor_recorded_at';
const VISITOR_COUNT_CACHE_KEY = 'sms_cached_visitor_count';
const DEFAULT_BASELINE_VISITORS = 3480;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days = 365): void {
  if (typeof document === 'undefined') return;
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = '; expires=' + date.toUTCString();
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; SameSite=Lax; Secure' : '; SameSite=Lax';
  document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/' + secure;
}

/**
 * Gets or creates the unique visitor ID for this device / browser.
 * Returns { visitorId, isNewVisitor }
 */
export function getVisitorIdentity(): { visitorId: string; isNewVisitor: boolean } {
  if (typeof window === 'undefined') {
    return { visitorId: '', isNewVisitor: false };
  }

  // 1. Check localStorage first
  let localId = localStorage.getItem(VISITOR_ID_KEY);
  // 2. Check cookie fallback
  let cookieId = getCookie(VISITOR_ID_KEY);

  if (localId || cookieId) {
    const existingId = localId || cookieId || '';
    // Ensure both storages are synchronized
    if (!localId && existingId) localStorage.setItem(VISITOR_ID_KEY, existingId);
    if (!cookieId && existingId) setCookie(VISITOR_ID_KEY, existingId, 365);
    return { visitorId: existingId, isNewVisitor: false };
  }

  // Brand-new unique visitor: Generate unique token
  const newId = `uv_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  try {
    localStorage.setItem(VISITOR_ID_KEY, newId);
    localStorage.setItem(VISITOR_RECORDED_KEY, new Date().toISOString());
    setCookie(VISITOR_ID_KEY, newId, 365);
  } catch (e) {
    console.warn('[VisitorService] Failed to write storage:', e);
  }

  return { visitorId: newId, isNewVisitor: true };
}

/**
 * Records unique visit if not counted already, or simply fetches current count.
 * Guaranteed to NEVER increment on page refresh!
 */
export async function recordOrFetchUniqueVisitor(): Promise<{ count: number; isNewVisitor: boolean }> {
  const { visitorId, isNewVisitor } = getVisitorIdentity();

  // Try API first
  try {
    const endpoint = isNewVisitor ? '/api/visitors/record' : '/api/visitors/count';
    const options: RequestInit = isNewVisitor
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visitorId }),
        }
      : {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        };

    const res = await fetch(endpoint, options);
    if (res.ok) {
      const data = await res.json();
      if (typeof data.count === 'number' && data.count > 0) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(VISITOR_COUNT_CACHE_KEY, String(data.count));
        }
        return { count: data.count, isNewVisitor };
      }
    }
  } catch (err) {
    console.warn('[VisitorService] API unavailable, using local store fallback:', err);
  }

  // Fallback if API fails or offline: use localStorage cached count
  let currentCached = DEFAULT_BASELINE_VISITORS;
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(VISITOR_COUNT_CACHE_KEY);
    if (raw && !isNaN(Number(raw))) {
      currentCached = Number(raw);
    }
    if (isNewVisitor) {
      currentCached += 1;
      localStorage.setItem(VISITOR_COUNT_CACHE_KEY, String(currentCached));
    }
  }

  return { count: currentCached, isNewVisitor };
}

/**
 * Reads currently cached visitor count for fast initial render
 */
export function getInitialCachedVisitorCount(): number {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(VISITOR_COUNT_CACHE_KEY);
    if (raw && !isNaN(Number(raw))) {
      return Number(raw);
    }
  }
  return DEFAULT_BASELINE_VISITORS;
}
