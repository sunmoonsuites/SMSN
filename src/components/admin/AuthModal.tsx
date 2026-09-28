import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { StaffUser, StaffRole } from '../../types';
import { signInStaff, createFirstSuperAdmin } from '../../services/authService';
import { Lock, Mail, ShieldAlert, KeyRound, UserCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  hotelId: string;
  onAuthSuccess: (user: StaffUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  hotelId,
  onAuthSuccess,
}) => {
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await signInStaff(email.trim(), password.trim(), hotelId);
    setIsLoading(false);

    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setError(res.error || 'Invalid credentials or database not configured.');
    }
  };

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const res = await createFirstSuperAdmin(hotelId, email.trim(), password.trim(), fullName.trim(), phone.trim());
    setIsLoading(false);

    if (res.success && res.user) {
      onAuthSuccess(res.user);
      onClose();
    } else {
      setError(res.error || 'Failed to initialize Super Admin account.');
    }
  };

  // Quick switch for local demo / testing without lockouts
  const handleQuickDemoRole = (role: StaffRole, name: string) => {
    const demoUser: StaffUser = {
      id: `demo-${role.toLowerCase().replace(/\s+/g, '-')}`,
      hotel_id: hotelId,
      full_name: `${name} (${role})`,
      email: `${role.toLowerCase().replace(/\s+/g, '')}@sunmoonsuites.com`,
      role: role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onAuthSuccess(demoUser);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isFirstSetup ? 'Setup First Super Admin' : 'Staff PMS Login'}
      subtitle="Sun Moon Suites &bull; 30-Room Property Management System"
      maxWidth="md"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {!isFirstSetup ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@sunmoonsuites.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>{isLoading ? 'Authenticating...' : 'Sign In to PMS'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreateSuperAdmin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="General Manager"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+91 93135 01001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                required
                placeholder="gm@sunmoonsuites.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Set Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Creating Super Admin...' : 'Create Super Admin'}</span>
            </button>
          </form>
        )}

        <div className="pt-2 flex justify-between items-center text-xs text-stone-500 border-t border-stone-100">
          <button
            type="button"
            onClick={() => {
              setIsFirstSetup(!isFirstSetup);
              setError('');
            }}
            className="hover:text-stone-900 underline font-medium"
          >
            {isFirstSetup ? 'Return to Standard Sign-In' : 'First-time setup? Create Super Admin'}
          </button>
        </div>

        {/* Quick Demo Access Roles */}
        <div className="border-t border-stone-200 pt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-2">
            Quick Role Switcher (Instant Testing)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickDemoRole('SUPER ADMIN', 'Vikram Singh')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded text-left truncate"
            >
              👑 Super Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoRole('FRONT DESK', 'Priya Sharma')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded text-left truncate"
            >
              🛎️ Front Desk
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoRole('HOUSEKEEPING', 'Ramesh Kumar')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded text-left truncate"
            >
              🧹 Housekeeping
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoRole('ACCOUNTS', 'Sunita Verma')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded text-left truncate"
            >
              💰 Accounts
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoRole('ADMIN', 'Amit Mehra')}
              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium rounded text-left truncate"
            >
              👔 Manager
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
