import React, { useState, useEffect } from 'react';
import { Hotel, StaffUser } from '../../types';
import {
  signInStaff,
  requestStaffPasswordReset,
  completeStaffPasswordReset,
} from '../../services/staffService';
import { getSupabase } from '../../lib/supabase';
import {
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  ArrowLeft,
  Send,
  RefreshCw,
  Building2,
  ExternalLink,
  Users,
  Shield,
} from 'lucide-react';

export interface CRMLoginScreenProps {
  hotel: Hotel | null;
  onAuthenticated: (user: StaffUser) => void;
  onReturnToWebsite: () => void;
  onNavigateToPMS: () => void;
}

type AuthScreenMode = 'login' | 'forgot' | 'recovery';

export const CRMLoginScreen: React.FC<CRMLoginScreenProps> = ({
  hotel,
  onAuthenticated,
  onReturnToWebsite,
  onNavigateToPMS,
}) => {
  const [mode, setMode] = useState<AuthScreenMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [sentViaSupabase, setSentViaSupabase] = useState(false);

  const hotelId = hotel?.id || 'default-hotel-id';

  // Listen for Supabase PASSWORD_RECOVERY event or URL recovery parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hashStr = window.location.hash || '';
      const urlEmail = searchParams.get('email');
      if (urlEmail) {
        setEmail(urlEmail);
      }
      if (
        searchParams.get('reset_password') === 'true' ||
        hashStr.includes('type=recovery') ||
        hashStr.includes('access_token=')
      ) {
        setMode('recovery');
        setSuccessMessage(
          'Password recovery link verified. Please enter your new password below.'
        );
      }
    }

    const supabase = getSupabase();
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (session?.user?.email) {
          setEmail(session.user.email);
        }
        setMode('recovery');
        setErrorMessage('');
        setSuccessMessage(
          'Supabase recovery session active. Set your new CRM password below.'
        );
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const switchMode = (nextMode: AuthScreenMode) => {
    setMode(nextMode);
    setErrorMessage('');
    if (nextMode !== 'login') {
      setSuccessMessage('');
    }
    if (nextMode === 'forgot') {
      setResetEmailSent(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await signInStaff(email.trim(), password, hotelId);
      if (res.success && res.user) {
        onAuthenticated(res.user);
      } else {
        setErrorMessage(
          res.error || 'Invalid email or password. Please verify your CRM credentials.'
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Authentication failed. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your registered staff email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await requestStaffPasswordReset(email.trim(), hotelId);
      if (res.success) {
        setResetEmailSent(true);
        setSentViaSupabase(res.sentViaSupabase);
        setSuccessMessage(
          res.message || `Password reset instructions sent to ${email.trim()}.`
        );
      } else {
        setErrorMessage(res.error || 'Unable to process password reset request.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await completeStaffPasswordReset(email.trim(), newPassword.trim(), hotelId);
      if (res.success) {
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMode('login');
        setSuccessMessage(
          res.message || 'Password updated! You can now sign in with your new password.'
        );
        if (typeof window !== 'undefined' && window.location.search.includes('reset_password')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else {
        setErrorMessage(res.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#0F172A] via-[#0B1120] to-[#020617] text-slate-100 selection:bg-[#C8A45D]/30 selection:text-amber-200">
      {/* Top Brand Bar */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#C8A45D]/15 border border-[#C8A45D] flex items-center justify-center text-[#C8A45D] font-serif font-bold text-base shadow-sm">
            SM
          </div>
          <div>
            <span className="font-serif font-bold text-sm tracking-wide text-[#C8A45D] block">
              {hotel?.name || 'Sun Moon Suites'}
            </span>
            <span className="text-[10px] text-slate-400 block -mt-0.5">
              Luxury CRM &amp; Leads Management
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={onNavigateToPMS}
            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-200 border border-amber-600/40 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Hotel PMS</span>
          </button>
          <button
            type="button"
            onClick={onReturnToWebsite}
            className="px-3 py-1.5 rounded-lg text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Website</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-md w-full bg-[#0F172A] rounded-2xl shadow-2xl border-2 border-[#C8A45D] overflow-hidden">
          {/* Card Top Title */}
          <div className="bg-[#0B1120] px-8 py-6 text-center border-b border-[#C8A45D]/30">
            <div className="w-12 h-12 mx-auto bg-[#C8A45D]/20 border border-[#C8A45D] text-[#C8A45D] rounded-xl flex items-center justify-center font-serif font-bold text-xl mb-3 shadow-md">
              <Users className="w-6 h-6 text-[#C8A45D]" />
            </div>
            <h1 className="font-serif font-bold text-xl sm:text-2xl text-[#C8A45D] tracking-wide">
              {mode === 'login' && 'Luxury CRM Portal Login'}
              {mode === 'forgot' && 'Reset Staff CRM Password'}
              {mode === 'recovery' && 'Set New CRM Password'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login' && 'Authorized Sales &amp; Reservations Desk Access Only'}
              {mode === 'forgot' && 'Request a secure password reset link via Supabase Auth'}
              {mode === 'recovery' && 'Enter and confirm your new CRM access password'}
            </p>
          </div>

          {/* Form Content */}
          <div className="p-8 space-y-5 text-xs">
            {errorMessage && (
              <div className="p-3.5 bg-rose-950/80 border border-rose-500/60 text-rose-200 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 rounded-xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* MODE 1: LOGIN */}
            {mode === 'login' && (
              <>
                <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
                  <div>
                    <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-[11px]">
                      Staff / Agent Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. sunmoonsuites@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[#C8A45D] focus:ring-1 focus:ring-[#C8A45D]"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold uppercase tracking-wider text-slate-300 text-[11px]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs font-semibold text-[#C8A45D] hover:underline cursor-pointer transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[#C8A45D] focus:ring-1 focus:ring-[#C8A45D] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer p-0.5"
                        tabIndex={-1}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-[#C8A45D] hover:bg-[#b59049] disabled:opacity-50 text-slate-950 font-bold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>{isLoading ? 'Signing In...' : 'Login to Leads CRM'}</span>
                    </button>
                  </div>
                </form>

                {/* Quick Autofill Helper for Testing */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#C8A45D]" />
                      Default Admin Credentials
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        fillQuickCredentials('sunmoonsuites@gmail.com', 'admin123')
                      }
                      className="text-[#C8A45D] hover:underline font-bold cursor-pointer"
                    >
                      Auto-Fill
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    User: sunmoonsuites@gmail.com &bull; Pass: admin123
                  </div>
                </div>
              </>
            )}

            {/* MODE 2: FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <div className="space-y-4">
                {!resetEmailSent ? (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Enter your registered staff email address below. We will send a secure password reset link via{' '}
                      <span className="font-bold text-[#C8A45D]">Supabase Auth</span>.
                    </p>

                    <div>
                      <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-[11px]">
                        Staff Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. sunmoonsuites@gmail.com"
                          className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[#C8A45D]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isLoading ? 'Sending Link...' : 'Send Password Reset Link'}</span>
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-300 space-y-2">
                      <p className="font-bold text-white">Next Steps for Recovery:</p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-400">
                        <li>
                          Check the email sent to{' '}
                          <span className="font-mono text-[#C8A45D]">{email}</span>.
                        </li>
                        <li>Click the reset link inside the email to reset your credentials.</li>
                      </ol>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => switchMode('recovery')}
                        className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                      >
                        Set Password Now
                      </button>
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={handleForgotSubmit}
                        className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-xl cursor-pointer"
                      >
                        Resend
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 text-center">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs text-[#C8A45D] hover:underline font-semibold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to CRM Login</span>
                  </button>
                </div>
              </div>
            )}

            {/* MODE 3: RECOVERY */}
            {mode === 'recovery' && (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-[11px]">
                    New Password (Min 6 Characters)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-slate-300 mb-1.5 text-[11px]">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 text-white rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isLoading ? 'Updating...' : 'Save New Password &amp; Login'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-500 border-t border-slate-900">
        &copy; {new Date().getFullYear()} {hotel?.name || 'Sun Moon Suites'} &bull; Luxury CRM &amp; Hotel Operations System
      </footer>
    </div>
  );
};
export default CRMLoginScreen;
