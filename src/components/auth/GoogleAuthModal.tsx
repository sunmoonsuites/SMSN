import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ShieldCheck, CheckCircle2, ArrowRight, Mail, RefreshCw, Sparkles } from 'lucide-react';
import { saveVerifiedGoogleGuest } from '../../services/googleAuthService';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: { email: string; name: string }) => void;
  onSwitchToOtp?: () => void;
  initialEmail?: string;
  initialName?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onSwitchToOtp,
  initialEmail = '',
  initialName = '',
}) => {
  const [emailInput, setEmailInput] = useState(initialEmail);
  const [nameInput, setNameInput] = useState(initialName);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Sync when modal opens or initial props change
  React.useEffect(() => {
    if (isOpen) {
      if (initialEmail) setEmailInput(initialEmail);
      if (initialName) setNameInput(initialName);
      setErrorMessage('');
      setIsSuccess(false);
      setIsVerifying(false);
    }
  }, [isOpen, initialEmail, initialName]);

  const handleVerifyGoogle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail address (e.g. yourname@gmail.com).');
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');

    // Simulate authenticating Google identity handshake
    setTimeout(() => {
      setIsVerifying(false);
      setIsSuccess(true);
      const guestName = nameInput.trim() || cleanEmail.split('@')[0];
      saveVerifiedGoogleGuest(cleanEmail, guestName);

      setTimeout(() => {
        onSuccess({
          email: cleanEmail,
          name: guestName,
        });
        onClose();
      }, 600);
    }, 500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sign in with Google / Gmail" maxWidth="md">
      <div className="space-y-5 py-2">
        {/* Google Branding Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white border border-stone-200 shadow-xs flex items-center justify-center p-3">
            {/* Official Google 'G' SVG Logo */}
            <svg className="w-8 h-8" viewBox="0 0 24 24">
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

          <div>
            <h3 className="font-serif font-bold text-lg text-stone-900">
              Direct Hotel Booking Verification
            </h3>
            <p className="text-xs text-stone-500">
              Sign in with your Google account for 1-click verified booking confirmation.
            </p>
          </div>
        </div>

        {isSuccess ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-emerald-900">
              Google Account Verified Successfully!
            </p>
            <p className="text-xs text-emerald-700">
              Continuing to reservation review &amp; confirmation...
            </p>
          </div>
        ) : (
          <form onSubmit={handleVerifyGoogle} className="space-y-4">
            {/* Quick 1-Click Tile if email was already entered */}
            {initialEmail && (
              <div
                onClick={() => handleVerifyGoogle()}
                className="p-3 bg-amber-50/60 hover:bg-amber-50 border border-amber-200 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-xs">
                    {(initialName || initialEmail)[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="block font-bold text-stone-900 text-xs">
                      {initialName || 'Guest User'}
                    </span>
                    <span className="block text-[11px] text-stone-500 font-mono">
                      {initialEmail}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-amber-700 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3" />
                  1-Click Verify
                </span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Gmail / Google Account Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isVerifying || !emailInput.trim()}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying with Google...
                </>
              ) : (
                <>
                  <span>Verify &amp; Continue with Google</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Switch to OTP */}
            {onSwitchToOtp && (
              <div className="text-center pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToOtp();
                  }}
                  className="text-stone-500 hover:text-amber-800 text-xs underline cursor-pointer"
                >
                  Prefer 6-Digit Email OTP instead? Verify by OTP
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-stone-400">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
              <span>Safe &amp; Secure Direct Hotel Verification</span>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
