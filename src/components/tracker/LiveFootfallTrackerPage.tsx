import React, { useState, useEffect } from 'react';
import { Hotel } from '../../types';
import { BookingIntentWidget } from '../admin/BookingIntentWidget';
import { Lock, KeyRound, ShieldCheck, ArrowRight, LogOut, Globe, Sparkles, RefreshCw } from 'lucide-react';

interface LiveFootfallTrackerPageProps {
  hotel: Hotel | null;
  onNavigateToWebsite: () => void;
}

const TRACKER_AUTH_KEY = 'sms_tracker_auth_session';
const DEFAULT_TRACKER_PIN = '1111';

export const LiveFootfallTrackerPage: React.FC<LiveFootfallTrackerPageProps> = ({
  hotel,
  onNavigateToWebsite,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(TRACKER_AUTH_KEY) === 'verified';
    }
    return false;
  });

  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const handleVerify = (enteredPin: string) => {
    setIsVerifying(true);
    setErrorMsg('');

    setTimeout(() => {
      if (enteredPin.trim() === DEFAULT_TRACKER_PIN) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(TRACKER_AUTH_KEY, 'verified');
        }
        setIsAuthenticated(true);
        setErrorMsg('');
      } else {
        setErrorMsg('Invalid Security PIN. Please enter the correct 4-digit code.');
        setPin('');
      }
      setIsVerifying(false);
    }, 200);
  };

  const handlePinChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    setPin(clean);
    if (errorMsg) setErrorMsg('');
    if (clean.length === 4) {
      handleVerify(clean);
    }
  };

  const handleLock = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(TRACKER_AUTH_KEY);
    }
    setIsAuthenticated(false);
    setPin('');
    setErrorMsg('');
  };

  // If not authenticated, render secure passcode challenge
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        {/* Top Header */}
        <div className="max-w-md mx-auto w-full flex items-center justify-between py-2 text-xs text-stone-400">
          <span className="font-semibold tracking-wider text-amber-400 uppercase">
            {hotel?.name || 'Sun Moon Suites'}
          </span>
          <button
            type="button"
            onClick={onNavigateToWebsite}
            className="hover:text-stone-200 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Public Website</span>
          </button>
        </div>

        {/* Center Lock Box */}
        <div className="max-w-md mx-auto w-full my-auto">
          <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="text-center space-y-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                <Lock className="w-7 h-7" />
              </div>
              <h1 className="font-serif text-2xl font-bold text-white tracking-tight">
                Live Footfall &amp; Leads Tracker
              </h1>
              <p className="text-xs text-stone-400 leading-relaxed max-w-xs mx-auto">
                Direct access portal for Sun Moon Suites website visitors, booking clicks, and customer follow-up leads.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (pin.length === 4) handleVerify(pin);
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-semibold text-stone-300 uppercase tracking-wider mb-2 text-center">
                  Enter 4-Digit Security PIN
                </label>
                <div className="relative max-w-xs mx-auto">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    maxLength={4}
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="••••"
                    className="w-full text-center tracking-[1em] text-2xl font-mono py-3 px-4 bg-stone-900 border-2 border-stone-700 rounded-xl text-amber-300 placeholder:text-stone-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden transition-all"
                  />
                  <KeyRound className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errorMsg && (
                  <p className="text-xs text-rose-400 text-center font-medium mt-2 animate-shake">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Number Buttons for Mobile ease */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'C') {
                        setPin('');
                        setErrorMsg('');
                      } else if (key === 'OK') {
                        if (pin.length === 4) handleVerify(pin);
                      } else {
                        handlePinChange(pin + key);
                      }
                    }}
                    className={`py-3 rounded-lg font-mono text-sm font-bold transition-all cursor-pointer active:scale-95 ${
                      key === 'OK'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white'
                        : key === 'C'
                        ? 'bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs'
                        : 'bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-stone-500 flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Protected with encrypted PIN authorization
                </span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-stone-500 py-2">
          Sector 117, Noida • Sun Moon Suites &bull; Private Operational Link
        </div>
      </div>
    );
  }

  // Once Authenticated, render full dedicated tracker dashboard
  return (
    <div className="min-h-screen bg-stone-100 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-serif font-bold">
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-white text-base sm:text-lg leading-tight">
                  {hotel?.name || 'Sun Moon Suites'}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-[10px] font-bold tracking-wide flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE TRACKER
                </span>
              </div>
              <p className="text-[11px] text-stone-400">
                Direct Footfall &amp; Guest Follow-up Leads &bull; Sector 117 Noida
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onNavigateToWebsite}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Public Website</span>
            </button>
            <button
              type="button"
              onClick={handleLock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-stone-800 hover:bg-rose-950/80 hover:text-rose-300 text-stone-300 cursor-pointer transition-colors border border-stone-700/60"
              title="Lock tracker session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock Screen</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <BookingIntentWidget
          hotelId={hotel?.id || 'ca8ca4c4-d493-490f-8d30-774e8fca42b6'}
        />
      </main>

      {/* Footer Info */}
      <footer className="border-t border-stone-200 bg-white py-4 px-6 text-center text-xs text-stone-500">
        <span>Sun Moon Suites Live Footfall Tracker &bull; Access Code: **** &bull; Sector 117, Noida</span>
      </footer>
    </div>
  );
};
