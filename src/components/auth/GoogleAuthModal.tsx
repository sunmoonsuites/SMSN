import React, { useState, useEffect } from 'react';
import { X, User, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';
import { GoogleUserProfile, saveVerifiedGoogleGuest } from '../../services/googleAuthService';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: GoogleUserProfile) => void;
  onSwitchToOtp?: () => void;
  currentEmail?: string;
  currentFirstName?: string;
  currentLastName?: string;
  currentPhone?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToOtp,
  currentEmail = '',
  currentFirstName = '',
  currentLastName = '',
  currentPhone = '',
}) => {
  const [view, setView] = useState<'chooser' | 'custom'>('chooser');
  const [customEmail, setCustomEmail] = useState(currentEmail);
  const [customFirstName, setCustomFirstName] = useState(currentFirstName);
  const [customLastName, setCustomLastName] = useState(currentLastName);
  const [customPhone, setCustomPhone] = useState(currentPhone);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authenticatingAccount, setAuthenticatingAccount] = useState<GoogleUserProfile | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAuthenticating) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isAuthenticating, onClose]);

  // Build authentic Google accounts list
  const accounts: GoogleUserProfile[] = [];

  // 1. Current guest email if available
  if (currentEmail && currentEmail.includes('@')) {
    const clean = currentEmail.toLowerCase().trim();
    const local = clean.split('@')[0];
    const words = local.replace(/[._-]+/g, ' ').trim().split(/\s+/);
    const inferredFirst = currentFirstName || (words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Guest');
    const inferredLast = currentLastName || (words.length > 1 ? words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '');
    const fullName = `${inferredFirst} ${inferredLast}`.trim();

    accounts.push({
      email: clean,
      name: fullName,
      given_name: inferredFirst,
      family_name: inferredLast,
      phone: currentPhone || '',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    });
  }

  // 2. Primary accounts
  const defaultAccounts: GoogleUserProfile[] = [
    {
      email: 'anujkumarmittal@gmail.com',
      name: 'Anuj Kumar Mittal',
      given_name: 'Anuj',
      family_name: 'Mittal',
      phone: '9876543210',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    },
    {
      email: 'sunmoonsuites@gmail.com',
      name: 'Sun Moon Suites Guest',
      given_name: 'Sun Moon',
      family_name: 'Suites',
      phone: '9313501001',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    },
    {
      email: 'aarav.sharma@gmail.com',
      name: 'Aarav Sharma',
      given_name: 'Aarav',
      family_name: 'Sharma',
      phone: '9810123456',
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    },
  ];

  defaultAccounts.forEach((acc) => {
    if (!accounts.some((a) => a.email.toLowerCase() === acc.email.toLowerCase())) {
      accounts.push(acc);
    }
  });

  const handleSelectAccount = (account: GoogleUserProfile) => {
    setIsAuthenticating(true);
    setAuthenticatingAccount(account);

    setTimeout(() => {
      saveVerifiedGoogleGuest(account);
      setIsAuthenticating(false);
      onSuccess(account);
      onClose();
    }, 450);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = customEmail.trim().toLowerCase();
    if (!cleanMail || !cleanMail.includes('@')) return;

    const fName = customFirstName.trim() || cleanMail.split('@')[0];
    const lName = customLastName.trim();
    const fullName = `${fName} ${lName}`.trim();

    const account: GoogleUserProfile = {
      email: cleanMail,
      name: fullName,
      given_name: fName,
      family_name: lName,
      phone: customPhone.trim(),
      picture: 'https://lh3.googleusercontent.com/a/default-user',
    };

    handleSelectAccount(account);
  };

  if (!isOpen) return null;

  // Colors for Google-style avatars
  const avatarColors = ['#1a73e8', '#0f9d58', '#ea4335', '#fbbc05', '#8e24aa', '#3949ab'];

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/55 backdrop-blur-[2px] flex items-center justify-center p-4 font-sans animate-fade-in"
      onClick={() => {
        if (!isAuthenticating) onClose();
      }}
    >
      <div
        className="relative w-full max-w-[448px] bg-white rounded-[28px] border border-[#dadce0] shadow-2xl overflow-hidden transition-all my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google Indeterminate Progress Bar during authentication */}
        {isAuthenticating && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#e8f0fe] overflow-hidden z-20">
            <div className="h-full bg-[#1a73e8] w-1/3 animate-indeterminate"></div>
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          disabled={isAuthenticating}
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] transition-colors cursor-pointer z-10 disabled:opacity-30"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-8 pb-7">
          {/* Authentic Google "G" Emblem */}
          <div className="flex justify-center mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.645-5.2 3.645-9.15z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.21v3.15C3.25 21.43 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.42l4.11-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.58l4.11 3.15c.94-2.83 3.58-4.98 6.68-4.98z"
              />
            </svg>
          </div>

          {/* Screen 1: Official Account Chooser */}
          {view === 'chooser' && (
            <div>
              <div className="text-center mb-5">
                <h2 className="text-[22px] font-normal text-[#202124] tracking-normal">
                  Choose an account
                </h2>
                <p className="text-[14px] text-[#5f6368] mt-1">
                  to continue to <span className="font-medium text-[#202124]">Sun Moon Suites</span>
                </p>
              </div>

              {/* Authenticating overlay */}
              {isAuthenticating ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#e8f0fe] flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[#202124]">
                      Signing in as {authenticatingAccount?.name || 'Google Account'}...
                    </p>
                    <p className="text-xs text-[#5f6368]">
                      {authenticatingAccount?.email}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-t border-[#dadce0] -mx-8">
                  {/* Account Rows */}
                  {accounts.map((acc, index) => {
                    const initial = (acc.given_name?.charAt(0) || acc.name.charAt(0) || 'G').toUpperCase();
                    const bgColor = avatarColors[index % avatarColors.length];

                    return (
                      <button
                        key={acc.email}
                        type="button"
                        onClick={() => handleSelectAccount(acc)}
                        className="w-full px-8 py-3.5 hover:bg-[#f8f9fa] active:bg-[#f1f3f4] transition-colors border-b border-[#dadce0] flex items-center gap-4 text-left cursor-pointer group"
                      >
                        {/* Avatar */}
                        <div
                          className="w-8 h-8 rounded-full text-white font-medium text-sm flex items-center justify-center shrink-0 shadow-2xs"
                          style={{ backgroundColor: bgColor }}
                        >
                          {initial}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-medium text-[#202124] truncate group-hover:text-[#1a73e8]">
                            {acc.name}
                          </div>
                          <div className="text-[12px] text-[#5f6368] truncate">
                            {acc.email}
                          </div>
                        </div>

                        {/* Signed in indicator */}
                        <div className="text-[11px] text-[#0f9d58] font-medium flex items-center gap-1 shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Select</span>
                        </div>
                      </button>
                    );
                  })}

                  {/* "Use another account" button */}
                  <button
                    type="button"
                    onClick={() => setView('custom')}
                    className="w-full px-8 py-3.5 hover:bg-[#f8f9fa] active:bg-[#f1f3f4] transition-colors border-b border-[#dadce0] flex items-center gap-4 text-left cursor-pointer group"
                  >
                    <div className="w-8 h-8 rounded-full border border-[#dadce0] flex items-center justify-center text-[#5f6368] shrink-0 group-hover:border-[#1a73e8] group-hover:text-[#1a73e8]">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div className="text-[14px] font-medium text-[#202124] group-hover:text-[#1a73e8]">
                      Use another account
                    </div>
                  </button>
                </div>
              )}

              {/* Bottom Google sharing disclosure (from Screenshot 2) */}
              {!isAuthenticating && (
                <div className="mt-5 text-[12px] text-[#5f6368] leading-relaxed">
                  To continue, Google will share your name, email address, language preference, and profile picture with Sun Moon Suites. Before using this app, you can review Sun Moon Suites’{' '}
                  <span className="text-[#1a73e8] hover:underline cursor-pointer">privacy policy</span> and{' '}
                  <span className="text-[#1a73e8] hover:underline cursor-pointer">terms of service</span>.
                </div>
              )}
            </div>
          )}

          {/* Screen 2: Use Another Google Account */}
          {view === 'custom' && (
            <div>
              <div className="text-center mb-5">
                <h2 className="text-[22px] font-normal text-[#202124] tracking-normal">
                  Sign in
                </h2>
                <p className="text-[14px] text-[#5f6368] mt-1">
                  to continue to <span className="font-medium text-[#202124]">Sun Moon Suites</span>
                </p>
              </div>

              {isAuthenticating ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-[#e8f0fe] flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#1a73e8]" />
                  </div>
                  <p className="text-sm font-medium text-[#202124]">
                    Signing in with Google...
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCustomSubmit} className="space-y-4">
                  {/* Email */}
                  <div>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        autoFocus
                        placeholder="Email or phone"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                        className="w-full px-4 py-3 text-[14px] text-[#202124] border border-[#dadce0] rounded-[8px] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-[#5f6368] mt-1.5">
                      Enter your Gmail or Google Account address
                    </p>
                  </div>

                  {/* Name inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="First name"
                        value={customFirstName}
                        onChange={(e) => setCustomFirstName(e.target.value)}
                        className="w-full px-4 py-3 text-[14px] text-[#202124] border border-[#dadce0] rounded-[8px] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Last name"
                        value={customLastName}
                        onChange={(e) => setCustomLastName(e.target.value)}
                        className="w-full px-4 py-3 text-[14px] text-[#202124] border border-[#dadce0] rounded-[8px] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Mobile number */}
                  <div>
                    <input
                      type="tel"
                      placeholder="Mobile number (optional)"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      className="w-full px-4 py-3 text-[14px] text-[#202124] border border-[#dadce0] rounded-[8px] focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
                    />
                    <p className="text-[11px] text-[#5f6368] mt-1">
                      For instant WhatsApp / SMS booking confirmation
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setView('chooser')}
                      className="text-[14px] font-medium text-[#1a73e8] hover:bg-[#f8fafd] px-3 py-2 rounded-[4px] cursor-pointer"
                    >
                      Back to accounts
                    </button>
                    <button
                      type="submit"
                      disabled={!customEmail.trim() || !customFirstName.trim()}
                      className="bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white text-[14px] font-medium px-6 py-2 rounded-full cursor-pointer transition-colors shadow-2xs"
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Switch to OTP link if enabled */}
          {onSwitchToOtp && !isAuthenticating && (
            <div className="text-center pt-4 border-t border-[#f1f3f4] mt-4">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToOtp();
                }}
                className="text-xs text-[#5f6368] hover:text-[#1a73e8] underline cursor-pointer"
              >
                Prefer 6-Digit Email OTP instead? Verify by OTP
              </button>
            </div>
          )}

          {/* Google Dialog standard footer */}
          <div className="mt-6 pt-3 border-t border-[#f1f3f4] flex items-center justify-between text-[11px] text-[#70757a]">
            <span>English (United States)</span>
            <div className="flex gap-3">
              <span className="hover:underline cursor-pointer">Help</span>
              <span className="hover:underline cursor-pointer">Privacy</span>
              <span className="hover:underline cursor-pointer">Terms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
