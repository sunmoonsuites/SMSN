import { getSupabase } from '../lib/supabase';
import { Profile, UserRole } from '../types';
import { logAction } from './auditService';

export interface AuthState {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let profilesTableRecursiveError = false;

function isValidUuid(val?: string | null): boolean {
  return Boolean(val && UUID_REGEX.test(val));
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase || profilesTableRecursiveError) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      if (error.code === '54001' || error.message?.includes('stack depth')) {
        profilesTableRecursiveError = true;
      }
      return null;
    }
    return profile as Profile;
  } catch {
    return null;
  }
}

export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Database connection is not configured. Connect your Supabase project in Settings.',
    };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from authentication');

    if (profilesTableRecursiveError) {
      const fallbackProfile: Profile = {
        id: data.user.id,
        hotel_id: 'default-hotel-id',
        full_name: data.user.user_metadata?.full_name || email.split('@')[0],
        email: data.user.email || email.trim(),
        role: (data.user.user_metadata?.role as UserRole) || 'SUPER ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return { success: true, profile: fallbackProfile };
    }

    // Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileErr) {
      if (profileErr.code === '54001' || profileErr.message?.includes('stack depth')) {
        profilesTableRecursiveError = true;
        const fallbackProfile: Profile = {
          id: data.user.id,
          hotel_id: 'default-hotel-id',
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          email: data.user.email || email.trim(),
          role: (data.user.user_metadata?.role as UserRole) || 'SUPER ADMIN',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return { success: true, profile: fallbackProfile };
      }
      throw profileErr;
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'This account has been deactivated. Please contact your hotel Super Admin.',
      };
    }

    if (profile.hotel_id) {
      await logAction(
        profile.hotel_id,
        'Staff Login',
        'Profile',
        profile.id,
        { email: profile.email, role: profile.role },
        profile.id,
        profile.full_name
      );
    }

    return { success: true, profile: profile as Profile };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Login failed. Please check your credentials.',
    };
  }
}

export async function signUpInitialAdmin(
  email: string,
  password: string,
  fullName: string,
  hotelId: string
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      error: 'Supabase configuration is required to create an admin user.',
    };
  }

  try {
    // Sign up via Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role: 'SUPER ADMIN',
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('Failed to register user.');

    const newProfile: Profile = {
      id: data.user.id,
      hotel_id: hotelId,
      full_name: fullName.trim(),
      email: email.trim(),
      role: 'SUPER ADMIN',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (!profilesTableRecursiveError && isValidUuid(hotelId)) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert([newProfile])
        .select()
        .single();

      if (profileError) {
        if (profileError.code === '54001' || profileError.message?.includes('stack depth')) {
          profilesTableRecursiveError = true;
        }
      } else if (profile) {
        return { success: true, profile: profile as Profile };
      }
    }

    return { success: true, profile: newProfile };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create Super Admin.' };
  }
}

export async function createStaffUser(
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  phone: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || profilesTableRecursiveError || !isValidUuid(hotelId)) {
    return { success: false, error: 'Saved to local staff store' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    const { error: profileErr } = await supabase.from('profiles').upsert([
      {
        id: data.user.id,
        hotel_id: hotelId,
        full_name: fullName,
        email: email.trim(),
        role,
        phone,
        is_active: true,
      },
    ]);

    if (profileErr) {
      if (profileErr.code === '54001' || profileErr.message?.includes('stack depth')) {
        profilesTableRecursiveError = true;
      }
      throw profileErr;
    }

    await logAction(hotelId, `Created Staff: ${fullName} (${role})`, 'Profile', data.user.id, {
      role,
      email,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
  }
}

export async function getStaffList(hotelId: string): Promise<Profile[]> {
  const supabase = getSupabase();
  if (!supabase || profilesTableRecursiveError || !isValidUuid(hotelId)) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, hotel_id, full_name, email, role, phone, is_active, created_at, updated_at')
      .eq('hotel_id', hotelId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '54001' || error.message?.includes('stack depth')) {
        profilesTableRecursiveError = true;
      }
      return [];
    }
    return (data as Profile[]) || [];
  } catch {
    return [];
  }
}

export async function updateStaffStatus(
  profileId: string,
  isActive: boolean,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || profilesTableRecursiveError || !isValidUuid(profileId)) {
    return { success: false, error: 'Updated locally' };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);
    if (error) {
      if (error.code === '54001' || error.message?.includes('stack depth')) {
        profilesTableRecursiveError = true;
      }
      throw error;
    }
    await logAction(
      hotelId,
      `Updated Staff Status to ${isActive ? 'Active' : 'Inactive'}`,
      'Profile',
      profileId
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function signInStaff(
  email: string,
  password: string,
  _hotelId?: string
): Promise<{ success: boolean; user?: Profile; error?: string }> {
  const res = await signIn(email, password);
  return {
    success: res.success,
    user: res.profile,
    error: res.error,
  };
}

export async function createFirstSuperAdmin(
  hotelId: string,
  email: string,
  password: string,
  fullName: string,
  _phone?: string
): Promise<{ success: boolean; user?: Profile; error?: string }> {
  const res = await signUpInitialAdmin(email, password, fullName, hotelId);
  return {
    success: res.success,
    user: res.profile,
    error: res.error,
  };
}

/**
 * Sends a password reset link to the staff member's email via Supabase Auth.
 */
export async function requestPasswordResetEmail(
  email: string,
  redirectTo?: string
): Promise<{ success: boolean; sentViaSupabase: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, sentViaSupabase: false, error: 'Please enter a valid staff email address.' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return {
      success: false,
      sentViaSupabase: false,
      error: 'Supabase connection is not configured.',
    };
  }

  try {
    const defaultRedirect =
      typeof window !== 'undefined'
        ? `${window.location.origin}/PMS?reset_password=true`
        : undefined;

    let { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectTo || defaultRedirect,
    });

    // If the specific redirectTo URL is not in the Supabase Redirect allowlist, retry with Site URL origin
    if (error && typeof window !== 'undefined') {
      const retryRes = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      error = retryRes.error;
    }

    if (error) {
      return {
        success: false,
        sentViaSupabase: false,
        error: error.message || 'Failed to send password reset email via Supabase Auth.',
      };
    }

    return {
      success: true,
      sentViaSupabase: true,
    };
  } catch (err: any) {
    return {
      success: false,
      sentViaSupabase: false,
      error: err?.message || 'Network error while requesting password reset email.',
    };
  }
}

/**
 * Updates the authenticated user's password in Supabase Auth (used after clicking email recovery link).
 */
export async function updateAuthUserPassword(
  newPassword: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase connection is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message || 'Failed to update password in Supabase Auth.' };
    }

    return {
      success: true,
      email: data.user?.email,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error updating password.',
    };
  }
}

