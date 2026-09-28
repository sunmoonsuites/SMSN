import {
  getStaffList,
  createStaffUser as createStaffAuth,
  updateStaffStatus as updateStatusAuth,
  signIn,
  signUpInitialAdmin,
  signOut as supabaseSignOut,
  requestPasswordResetEmail,
  updateAuthUserPassword,
} from './authService';
import { StaffUser, StaffRole } from '../types';
import { logAction } from './auditService';

const LOCAL_STORAGE_STAFF_KEY = 'pms_custom_staff_users';

export interface StoredStaffAccount extends StaffUser {
  password?: string;
}

export const DEFAULT_STAFF_ACCOUNTS: StoredStaffAccount[] = [
  {
    id: 'staff-super-admin-1',
    hotel_id: 'default-hotel-id',
    email: 'sunmoonsuites@gmail.com',
    full_name: 'Hotel Owner (Super Admin)',
    phone: '+91 96678 13353',
    role: 'SUPER ADMIN',
    is_active: true,
    password: 'admin123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff-super-admin-2',
    hotel_id: 'default-hotel-id',
    email: 'admin@sunmoonsuites.in',
    full_name: 'General Manager (Super Admin)',
    phone: '+91 96678 13353',
    role: 'SUPER ADMIN',
    is_active: true,
    password: 'admin123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'staff-frontdesk-1',
    hotel_id: 'default-hotel-id',
    email: 'reception@sunmoonsuites.in',
    full_name: 'Front Desk Reception',
    phone: '+91 96678 13353',
    role: 'FRONT DESK',
    is_active: true,
    password: 'staff123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function getStoredStaff(): StoredStaffAccount[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_STAFF_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(DEFAULT_STAFF_ACCOUNTS));
      return DEFAULT_STAFF_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STAFF_ACCOUNTS;
  } catch {
    return DEFAULT_STAFF_ACCOUNTS;
  }
}

function saveStoredStaff(list: StoredStaffAccount[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_STAFF_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Failed to save staff accounts locally:', err);
  }
}

export async function getStaffUsers(hotelId: string): Promise<StaffUser[]> {
  const localStaff = getStoredStaff();
  const remoteStaff = await getStaffList(hotelId);

  if (remoteStaff && remoteStaff.length > 0) {
    // Merge remote staff with local passwords if any
    const merged: StoredStaffAccount[] = [...remoteStaff];
    for (const localItem of localStaff) {
      if (!merged.some((r) => r.email.toLowerCase() === localItem.email.toLowerCase())) {
        merged.push(localItem);
      }
    }
    return merged;
  }

  return localStaff;
}

export interface CreateStaffParams {
  hotel_id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: StaffRole;
  is_active?: boolean;
  password?: string;
}

export async function createStaffUser(
  arg1: string | CreateStaffParams,
  arg2?: string,
  arg3?: string,
  arg4?: StaffRole,
  arg5?: string,
  arg6?: string
): Promise<{ success: boolean; error?: string }> {
  const params: CreateStaffParams =
    typeof arg1 === 'object'
      ? arg1
      : {
          email: arg1,
          password: arg2 || 'staff123',
          full_name: arg3 || '',
          role: arg4 || 'FRONT DESK',
          phone: arg5 || '',
          hotel_id: arg6 || 'default-hotel-id',
          is_active: true,
        };

  const current = getStoredStaff();
  const exists = current.some((u) => u.email.toLowerCase() === params.email.trim().toLowerCase());
  if (exists) {
    return { success: false, error: 'A staff account with this email already exists.' };
  }

  const newStaff: StoredStaffAccount = {
    id: `staff-${Date.now()}`,
    hotel_id: params.hotel_id || 'default-hotel-id',
    email: params.email.trim().toLowerCase(),
    full_name: params.full_name.trim(),
    phone: params.phone?.trim() || '',
    role: params.role,
    is_active: params.is_active ?? true,
    password: params.password || 'staff123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveStoredStaff([newStaff, ...current]);

  // Also attempt Supabase creation if connected
  try {
    await createStaffAuth(
      newStaff.email,
      newStaff.password || 'staff123',
      newStaff.full_name,
      newStaff.role,
      newStaff.phone || '',
      newStaff.hotel_id || 'default-hotel-id'
    );
  } catch {
    // Local storage already succeeded
  }

  return { success: true };
}

export async function updateStaffUser(
  profileId: string,
  hotelId: string,
  data: { is_active?: boolean; full_name?: string; role?: StaffRole; password?: string }
): Promise<{ success: boolean; error?: string }> {
  const current = getStoredStaff();
  const updated = current.map((s) =>
    s.id === profileId
      ? {
          ...s,
          ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
          ...(data.full_name !== undefined ? { full_name: data.full_name } : {}),
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.password ? { password: data.password } : {}),
          updated_at: new Date().toISOString(),
        }
      : s
  );
  saveStoredStaff(updated);

  if (data.is_active !== undefined) {
    try {
      await updateStatusAuth(profileId, data.is_active, hotelId);
    } catch {
      // Handled locally
    }
  }
  return { success: true };
}

export async function deleteStaffUser(profileId: string): Promise<{ success: boolean }> {
  const current = getStoredStaff();
  saveStoredStaff(current.filter((s) => s.id !== profileId));
  return { success: true };
}

export async function updateStaffStatus(
  profileId: string,
  isActive: boolean,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  return updateStaffUser(profileId, hotelId, { is_active: isActive });
}

export async function signInStaff(
  email: string,
  password: string,
  _hotelId?: string
): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return { success: false, error: 'Please enter both email address and password.' };
  }

  // 1. Check local / dual-storage staff accounts first
  const localStaff = getStoredStaff();
  const matchedLocal = localStaff.find((u) => u.email.toLowerCase() === cleanEmail);

  if (matchedLocal) {
    if (!matchedLocal.is_active) {
      return {
        success: false,
        error: 'This staff account is suspended. Please contact the Super Admin.',
      };
    }
    const expectedPassword = matchedLocal.password || 'admin123';
    if (cleanPassword === expectedPassword) {
      const { password: _pw, ...staffUser } = matchedLocal;
      return { success: true, user: staffUser };
    } else {
      return {
        success: false,
        error: 'Invalid password. Please enter the correct password.',
      };
    }
  }

  // 2. Try Supabase Auth if not found in local list
  const res = await signIn(cleanEmail, cleanPassword);
  if (res.success && res.profile) {
    return {
      success: true,
      user: res.profile,
    };
  }

  return {
    success: false,
    error: 'Invalid email or password. Please check your login credentials.',
  };
}

export async function createFirstSuperAdmin(
  hotelId: string,
  email: string,
  password: string,
  fullName: string,
  phone?: string
): Promise<{ success: boolean; user?: StaffUser; error?: string }> {
  const createRes = await createStaffUser({
    hotel_id: hotelId,
    email,
    password,
    full_name: fullName,
    phone,
    role: 'SUPER ADMIN',
    is_active: true,
  });

  if (createRes.success) {
    const loginRes = await signInStaff(email, password, hotelId);
    return loginRes;
  }

  const res = await signUpInitialAdmin(email, password, fullName, hotelId);
  return {
    success: res.success,
    user: res.profile,
    error: res.error,
  };
}

export async function signOut(): Promise<void> {
  localStorage.removeItem('pms_staff_user');
  sessionStorage.removeItem('pms_staff_user');
  await supabaseSignOut();
}

/**
 * Initiates a password reset flow for a staff member via Supabase Auth (`resetPasswordForEmail`).
 * Also verifies whether the email belongs to a registered staff account.
 */
export async function requestStaffPasswordReset(
  email: string,
  hotelId: string = 'default-hotel-id'
): Promise<{
  success: boolean;
  sentViaSupabase: boolean;
  staffName?: string;
  message?: string;
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      sentViaSupabase: false,
      error: 'Please enter a valid staff email address.',
    };
  }

  const localStaff = getStoredStaff();
  const matchedLocal = localStaff.find((u) => u.email.toLowerCase() === cleanEmail);

  if (matchedLocal && !matchedLocal.is_active) {
    return {
      success: false,
      sentViaSupabase: false,
      error: 'This staff account is currently deactivated. Please contact your Super Admin.',
    };
  }

  // Trigger Supabase Auth password reset email
  const redirectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/PMS?reset_password=true&email=${encodeURIComponent(cleanEmail)}`
      : undefined;

  const supaRes = await requestPasswordResetEmail(cleanEmail, redirectUrl);

  try {
    await logAction(
      hotelId,
      `Password Reset Requested for ${cleanEmail}`,
      'StaffAuth',
      matchedLocal?.id || cleanEmail,
      { email: cleanEmail, supabaseDispatched: supaRes.sentViaSupabase }
    );
  } catch {
    // Non-blocking audit log
  }

  if (supaRes.success) {
    return {
      success: true,
      sentViaSupabase: true,
      staffName: matchedLocal?.full_name,
      message: `Password reset link has been sent to ${cleanEmail} via Supabase Auth. Please check your inbox (and spam folder).`,
    };
  }

  // If Supabase rate-limited or user only exists in local/hybrid store, still allow recovery if matchedLocal exists
  if (matchedLocal) {
    return {
      success: true,
      sentViaSupabase: false,
      staffName: matchedLocal.full_name,
      message: supaRes.error
        ? `Staff account verified (${matchedLocal.full_name}). Note from Supabase Auth: ${supaRes.error}`
        : `Staff account verified for ${cleanEmail}.`,
    };
  }

  return {
    success: false,
    sentViaSupabase: false,
    error:
      supaRes.error ||
      'No active staff account found with this email address, or Supabase Auth could not dispatch the reset email.',
  };
}

/**
 * Completes password recovery by updating the password in Supabase Auth and syncing local staff storage.
 */
export async function completeStaffPasswordReset(
  email: string,
  newPassword: string,
  hotelId: string = 'default-hotel-id'
): Promise<{ success: boolean; message?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedPassword = newPassword.trim();

  if (trimmedPassword.length < 6) {
    return {
      success: false,
      error: 'New password must be at least 6 characters long.',
    };
  }

  // 1. Attempt to update authenticated recovery user in Supabase Auth
  const supaUpdate = await updateAuthUserPassword(trimmedPassword);
  const targetEmail = (supaUpdate.email || cleanEmail).toLowerCase();

  // 2. Sync password in dual-storage staff list if account exists locally
  const current = getStoredStaff();
  let matchedStaff: StoredStaffAccount | undefined;
  const updated = current.map((s) => {
    if (s.email.toLowerCase() === targetEmail) {
      matchedStaff = s;
      return {
        ...s,
        password: trimmedPassword,
        updated_at: new Date().toISOString(),
      };
    }
    return s;
  });

  if (matchedStaff) {
    saveStoredStaff(updated);
  }

  if (!supaUpdate.success && !matchedStaff) {
    return {
      success: false,
      error:
        supaUpdate.error ||
        'Could not update password. Please use a valid recovery link or verify your staff email address.',
    };
  }

  try {
    await logAction(
      hotelId,
      `Staff Password Reset Completed (${targetEmail})`,
      'StaffAuth',
      matchedStaff?.id || targetEmail,
      { email: targetEmail }
    );
  } catch {
    // Ignore audit error
  }

  return {
    success: true,
    message: 'Your password has been updated. You can now sign in with your new password.',
  };
}

export { signUpInitialAdmin };
