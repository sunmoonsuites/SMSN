import { getSupabase } from '../lib/supabase';

export interface GoogleUserProfile {
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  phone?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  user?: GoogleUserProfile;
  error?: string;
}

const GOOGLE_GUEST_STORAGE_KEY = 'sms_google_verified_guest_v1';

/**
 * Safely decodes a Google JWT (id_token) payload
 */
export function decodeGoogleJwt(token: string): Partial<GoogleUserProfile> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      email: parsed.email?.toLowerCase()?.trim(),
      name: parsed.name?.trim(),
      given_name: parsed.given_name?.trim(),
      family_name: parsed.family_name?.trim(),
      picture: parsed.picture,
    };
  } catch (e) {
    console.warn('Failed to decode Google JWT:', e);
    return null;
  }
}

/**
 * Checks if a verified Google session exists in sessionStorage or Supabase
 */
export async function getExistingGoogleUser(): Promise<GoogleUserProfile | null> {
  // 1. Check local session storage first
  if (typeof sessionStorage !== 'undefined') {
    const raw = sessionStorage.getItem(GOOGLE_GUEST_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.email) {
          return {
            email: parsed.email,
            name: parsed.name || parsed.email.split('@')[0],
            given_name: parsed.given_name || (parsed.name ? parsed.name.split(' ')[0] : parsed.email.split('@')[0]),
            family_name: parsed.family_name || (parsed.name && parsed.name.split(' ').length > 1 ? parsed.name.split(' ').slice(1).join(' ') : ''),
            picture: parsed.picture,
            phone: parsed.phone || '',
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
        const fullName =
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          email.split('@')[0];
        const givenName = session.user.user_metadata?.given_name || fullName.split(' ')[0];
        const familyName =
          session.user.user_metadata?.family_name ||
          (fullName.split(' ').length > 1 ? fullName.split(' ').slice(1).join(' ') : '');
        const picture =
          session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
        const phone = session.user.phone || session.user.user_metadata?.phone || '';

        const user: GoogleUserProfile = {
          email,
          name: fullName,
          given_name: givenName,
          family_name: familyName,
          picture,
          phone,
        };

        saveVerifiedGoogleGuest(user);
        return user;
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
export function saveVerifiedGoogleGuest(user: GoogleUserProfile): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(
      GOOGLE_GUEST_STORAGE_KEY,
      JSON.stringify({
        ...user,
        email: user.email.toLowerCase().trim(),
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
 * Triggers authentic Google Identity / OAuth Sign-in flow.
 * 1. If Google Identity Services (GIS) has client_id, initiates official Google token/credential flow.
 * 2. If Supabase has Google provider, triggers Supabase OAuth.
 * 3. Returns user profile: email, given_name, family_name, name, picture.
 */
export async function triggerGoogleSignIn(googleClientId?: string): Promise<GoogleAuthResult> {
  const effectiveClientId =
    (googleClientId || '').trim() ||
    (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

  // Try Google Identity Services (GIS) if available and client ID is provided
  if (typeof window !== 'undefined' && (window as any).google?.accounts && effectiveClientId) {
    try {
      const google = (window as any).google;
      return await new Promise<GoogleAuthResult>((resolve) => {
        try {
          const client = google.accounts.oauth2.initTokenClient({
            client_id: effectiveClientId,
            scope: 'openid email profile',
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.access_token) {
                try {
                  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: {
                      Authorization: `Bearer ${tokenResponse.access_token}`,
                    },
                  });
                  if (res.ok) {
                    const data = await res.json();
                    const user: GoogleUserProfile = {
                      email: data.email.toLowerCase().trim(),
                      name: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
                      given_name: data.given_name || (data.name ? data.name.split(' ')[0] : ''),
                      family_name: data.family_name || '',
                      picture: data.picture,
                      phone: '',
                    };
                    saveVerifiedGoogleGuest(user);
                    resolve({ success: true, user });
                    return;
                  }
                } catch (e: any) {
                  console.warn('Google userinfo fetch failed:', e);
                }
              }
              resolve({
                success: false,
                error: tokenResponse?.error || 'Google authentication was cancelled or failed.',
              });
            },
          });
          client.requestAccessToken();
        } catch (initErr: any) {
          console.warn('GIS TokenClient init error:', initErr);
          resolve({ success: false, error: initErr.message });
        }
      });
    } catch (gisErr: any) {
      console.warn('GIS invocation error:', gisErr);
    }
  }

  // Fallback to Supabase Google OAuth if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.href : undefined,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (!error && data?.url) {
        // Redirecting or opening OAuth
        if (typeof window !== 'undefined') {
          window.location.href = data.url;
          return { success: true };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    success: false,
    error: 'GOOGLE_CONFIG_NEEDED',
  };
}
