import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Hotel, StaffUser } from '../../types';
import {
  signInStaff,
  requestStaffPasswordReset,
  completeStaffPasswordReset,
} from '../../services/staffService';
import { getSupabase } from '../../lib/supabase';
import {
  ShieldCheck,
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
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  onAuthenticated: (user: StaffUser) => void;
}

interface PMSLoginScreenProps {
  hotel: Hotel | null;
  onAuthenticated: (user: StaffUser) => void;
  onReturnToWebsite: () => void;
}

type AuthScreenMode = 'login' | 'forgot' | 'recovery';

export const PMSLoginScreen: React.FC<PMSLoginScreenProps> = ({
  hotel,
  onAuthenticated,
  onReturnToWebsite,
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
          'Supabase recovery session active. Set your new staff password below.'
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
          res.error || 'Invalid email or password. Please check your credentials.'
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
          res.message ||
            `Password reset instructions have been sent to ${email.trim()}.`
        );
      } else {
        setErrorMessage(
          res.error || 'Could not send password reset email. Please verify your email.'
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to request password reset. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please confirm your staff email address.');
      return;
    }
    if (newPassword.trim().length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation password do not match.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await completeStaffPasswordReset(
        email.trim(),
        newPassword,
        hotelId
      );
      if (res.success) {
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setMode('login');
        setSuccessMessage(
          res.message ||
            'Password updated! You can now sign in with your new password.'
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-stone-900 px-8 py-7 text-center border-b border-stone-800">
          <div className="w-12 h-12 mx-auto bg-amber-500/20 border border-amber-400/30 text-amber-400 rounded-xl flex items-center justify-center font-serif font-bold text-xl mb-3">
            SMS
          </div>
          <h1 className="font-serif font-bold text-2xl text-white">
            {mode === 'login' && 'Staff PMS Portal Login'}
            {mode === 'forgot' && 'Forgot Staff Password'}
            {mode === 'recovery' && 'Set New Staff Password'}
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            {mode === 'login' &&
              `${hotel?.name || 'Sun Moon Suites'} • ${hotel?.city || 'Noida'}`}
            {mode === 'forgot' &&
              'Request a secure password reset link via Supabase Auth'}
            {mode === 'recovery' &&
              'Enter and confirm your new PMS account password'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {mode === 'login' && (
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Staff Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      autoComplete="off"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter staff email address"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-semibold text-amber-800 hover:text-amber-950 hover:underline cursor-pointer transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
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
                    className="w-full py-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>{isLoading ? 'Signing In...' : 'Login to PMS Portal'}</span>
                  </button>
                </div>
              </form>

              {/* Default Login Info Box */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1">
                <div className="font-bold text-stone-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  <span>Authorized Staff Access Only</span>
                </div>
                <p className="text-stone-500">
                  Default Super Admin:{' '}
                  <span className="font-mono font-semibold text-stone-800">
                    sunmoonsuites@gmail.com
                  </span>{' '}
                  (or{' '}
                  <span className="font-mono font-semibold text-stone-800">
                    admin@sunmoonsuites.in
                  </span>
                  ) &bull; Password:{' '}
                  <span className="font-mono font-semibold text-stone-800">
                    admin123
                  </span>
                </p>
              </div>
            </>
          )}

          {/* MODE 2: FORGOT PASSWORD (REQUEST SUPABASE AUTH RESET LINK) */}
          {mode === 'forgot' && (
            <div className="space-y-5">
              {!resetEmailSent ? (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Enter your registered staff email address below. We will send a password reset link via{' '}
                    <span className="font-semibold text-stone-800">Supabase Auth</span> to recover your access.
                  </p>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                      Registered Staff Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. sunmoonsuites@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isLoading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                    </span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 space-y-2">
                    <p className="font-bold text-stone-900">
                      Next Steps for Password Recovery:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-stone-600">
                      <li>
                        Open the email sent to{' '}
                        <span className="font-mono font-semibold text-stone-900">
                          {email}
                        </span>
                        {sentViaSupabase ? ' via Supabase Auth.' : '.'}
                      </li>
                      <li>
                        Click the <strong>Reset Password</strong> link inside the email to return to this portal.
                      </li>
                      <li>
                        Or click below if you already have a recovery session open on this device.
                      </li>
                    </ol>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      type="button"
                      onClick={() => switchMode('recovery')}
                      className="flex-1 py-2.5 px-3 bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Set New Password Now</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleForgotSubmit}
                      className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Email</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-stone-200 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-950 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Staff Login</span>
                </button>
              </div>
            </div>
          )}

          {/* MODE 3: PASSWORD RECOVERY (SET NEW PASSWORD) */}
          {mode === 'recovery' && (
            <form onSubmit={handleRecoverySubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Staff Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your staff email"
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-10 pr-10 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isLoading ? 'Updating Password...' : 'Save New Password'}</span>
              </button>

              <div className="pt-2 border-t border-stone-200 text-center">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel &amp; Return to Login</span>
                </button>
              </div>
            </form>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onReturnToWebsite}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 font-medium cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Public Hotel Website</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  hotelId,
  onAuthenticated,
}) => {
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await signInStaff(email.trim(), password, hotelId);
      if (res.success && res.user) {
        onAuthenticated(res.user);
        onClose();
      } else {
        setErrorMessage(
          res.error || 'Invalid email or password. Please check your credentials.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter your staff email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await requestStaffPasswordReset(email.trim(), hotelId);
      if (res.success) {
        setSuccessMessage(
          res.message || `Password reset link sent to ${email.trim()}.`
        );
      } else {
        setErrorMessage(res.error || 'Failed to send password reset email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error requesting password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Hotel Staff PMS Portal Login' : 'Reset Staff Password'}
      subtitle={
        mode === 'login'
          ? 'Authorized personnel only'
          : 'Request a reset link via Supabase Auth'
      }
      maxWidth="md"
    >
      <div className="space-y-5">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter staff email"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMessage('');
                    setSuccessMessage('');
                  }}
                  className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isLoading ? 'Verifying Credentials...' : 'Sign In to PMS'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs text-stone-600">
              Enter your staff email address to receive a password reset link via Supabase Auth.
            </p>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter staff email"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider text-xs rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

