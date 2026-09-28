import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'sunmoon_supabase_url';
const STORAGE_KEY_KEY = 'sunmoon_supabase_anon_key';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'user' | 'none';
}

/**
 * Get active Supabase configuration from environment or secure user storage
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  // If valid env variables exist (not placeholder)
  if (envUrl && envKey && !envUrl.includes('your-project.supabase.co')) {
    return {
      url: envUrl,
      anonKey: envKey,
      source: 'env',
    };
  }

  // Check stored credentials
  if (typeof window !== 'undefined') {
    const storedUrl = (localStorage.getItem(STORAGE_KEY_URL) || '').trim();
    const storedKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();
    if (storedUrl && storedKey) {
      return {
        url: storedUrl,
        anonKey: storedKey,
        source: 'user',
      };
    }
  }

  return {
    url: '',
    anonKey: '',
    source: 'none',
  };
}

let cachedClient: SupabaseClient | null = null;
let lastClientUrl = '';
let lastClientKey = '';

/**
 * Resilient fetch wrapper for Supabase:
 * Uses a 4-second timeout for direct browser requests and automatically falls back
 * to the server-side proxy (/api/supabase-proxy) if an ISP (e.g. Jio/Airtel in India)
 * blocks or throttles *.supabase.co domains.
 */
function createResilientSupabaseFetch(supabaseBaseUrl: string): typeof fetch {
  const cleanBase = supabaseBaseUrl.replace(/\/+$/, '');
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const response = await fetch(input, {
        ...init,
        signal: init?.signal || controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (directError) {
      clearTimeout(timeoutId);
      // Fallback to same-origin server-side proxy if target is Supabase
      if (typeof window !== 'undefined' && rawUrl.startsWith(cleanBase)) {
        const subPath = rawUrl.slice(cleanBase.length);
        const proxyHeaders = new Headers(init?.headers || {});
        proxyHeaders.set('x-supabase-target-base', cleanBase);
        return fetch(`/api/supabase-proxy${subPath}`, {
          ...init,
          headers: proxyHeaders,
        });
      }
      throw directError;
    }
  };
}

/**
 * Returns the Supabase client instance, or null if credentials are not yet configured.
 */
export function getSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.url || !config.anonKey) {
    return null;
  }

  if (cachedClient && lastClientUrl === config.url && lastClientKey === config.anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: createResilientSupabaseFetch(config.url),
      },
    });
    lastClientUrl = config.url;
    lastClientKey = config.anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tests connection to Supabase and verifies if tables are migrated
 */
export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; schemaReady?: boolean }> {
  const url = (customUrl || getSupabaseConfig().url).trim();
  const key = (customKey || getSupabaseConfig().anonKey).trim();

  if (!url || !key) {
    return {
      success: false,
      message: 'Supabase URL and Publishable/Anon Key are required.',
    };
  }

  try {
    const testClient = createClient(url, key);
    // Test querying the hotels table
    const { data, error } = await testClient.from('hotels').select('id, name').limit(1);

    if (error) {
      // Check if table does not exist
      if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          schemaReady: false,
          message: 'Connected to Supabase! The database schema has not been applied yet. Run the SQL migration script in your Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Supabase returned error: ${error.message} (Code: ${error.code || 'unknown'})`,
      };
    }

    return {
      success: true,
      schemaReady: true,
      message: `Successfully connected to Supabase! Found hotel: ${data?.[0]?.name || 'Initialized'}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Connection failed: ${err?.message || 'Network error or invalid Supabase URL'}`,
    };
  }
}

/**
 * Save user-provided credentials to localStorage and update client
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    cachedClient = null;
    window.dispatchEvent(new Event('supabase_config_updated'));
  }
}

/**
 * Clear stored credentials
 */
export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
    cachedClient = null;
    window.dispatchEvent(new Event('supabase_config_updated'));
  }
}
