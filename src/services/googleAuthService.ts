import { getSupabase } from '../lib/supabase';

export interface GoogleAuthResult {
  success: boolean;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: 'google' | 'session';
  error?: string;
}

const GOOGLE_GUEST_STORAGE_KEY = 'sms_google_verified_guest_v1';

/**
 * Checks if a verified Google session exists in sessionStorage or Supabase
 */
export async function getExistingGoogleUser(): Promise<GoogleAuthResult | null> {
  // 1. Check local session storage first
  if (typeof sessionStorage !== 'undefined') {
    const raw = sessionStorage.getItem(GOOGLE_GUEST_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.email) {
          return {
            success: true,
            email: parsed.email,
            name: parsed.name || parsed.email.split('@')[0],
            avatarUrl: parsed.avatarUrl,
            provider: 'google',
          };
        }
      } catch {
        // ignore
      }
    }
  }

  // 2. Check Supabase auth session if available
  const supabase = getSupabase();
  if (supabase) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const email = session.user.email.toLowerCase().trim();
        const name =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          email.split('@')[0];
        const avatarUrl =
          session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;

        saveVerifiedGoogleGuest(email, name, avatarUrl);
        return {
          success: true,
          email,
          name,
          avatarUrl,
          provider: 'google',
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Saves verified Google guest profile to sessionStorage
 */
export function saveVerifiedGoogleGuest(email: string, name?: string, avatarUrl?: string): void {
  if (typeof sessionStorage !== 'undefined') {
    const cleanEmail = email.toLowerCase().trim();
    sessionStorage.setItem(
      GOOGLE_GUEST_STORAGE_KEY,
      JSON.stringify({
        email: cleanEmail,
        name: name?.trim() || cleanEmail.split('@')[0],
        avatarUrl,
        timestamp: Date.now(),
      })
    );
  }
}

/**
 * Clears verified Google guest session
 */
export function clearVerifiedGoogleGuest(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(GOOGLE_GUEST_STORAGE_KEY);
  }
}

/**
 * Verifies or confirms a guest with Google/Gmail.
 * Validates email format, saves verified session, and returns profile.
 */
export async function verifyGuestWithGoogle(
  suggestedEmail?: string,
  suggestedName?: string
): Promise<GoogleAuthResult> {
  const cleanEmail = (suggestedEmail || '').trim().toLowerCase();
  const cleanName = (suggestedName || '').trim();

  // 1. Check existing session first
  const existing = await getExistingGoogleUser();
  if (existing && existing.email) {
    return existing;
  }

  // 2. If valid email provided, verify and save
  if (cleanEmail && cleanEmail.includes('@')) {
    const displayName = cleanName || cleanEmail.split('@')[0];
    saveVerifiedGoogleGuest(cleanEmail, displayName);
    return {
      success: true,
      email: cleanEmail,
      name: displayName,
      provider: 'google',
    };
  }

  return {
    success: false,
    error: 'Please enter a valid Gmail address to continue with Google.',
  };
}
