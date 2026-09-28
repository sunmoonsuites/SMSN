import React, { useEffect, useState } from 'react';
import { Hotel, StaffUser, StaffRole } from '../../types';
import {
  getStaffUsers,
  createStaffUser,
  updateStaffUser,
  deleteStaffUser,
} from '../../services/staffService';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  ShieldCheck,
  Plus,
  KeyRound,
  Trash2,
} from 'lucide-react';

interface StaffManagementViewProps {
  hotel: Hotel | null;
  currentUser: StaffUser;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  hotel,
  currentUser,
}) => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Staff Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<StaffRole>('FRONT DESK');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password Modal
  const [passwordModalUser, setPasswordModalUser] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSavedMsg, setPasswordSavedMsg] = useState('');

  useEffect(() => {
    loadStaff();
  }, [hotel?.id]);

  const loadStaff = async () => {
    setIsLoading(true);
    const data = await getStaffUsers(hotel?.id || 'default-hotel-id');
    setStaffList(data);
    setIsLoading(false);
  };

  const handleToggleActive = async (user: StaffUser) => {
    const hotelId = hotel?.id || 'default-hotel-id';
    const res = await updateStaffUser(user.id, hotelId, {
      is_active: !user.is_active,
    });
    if (res.success) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === user.id ? { ...s, is_active: !s.is_active } : s))
      );
    }
  };

  const handleDeleteStaff = async (user: StaffUser) => {
    if (user.id === currentUser.id) return;
    await deleteStaffUser(user.id);
    setStaffList((prev) => prev.filter((s) => s.id !== user.id));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setIsSubmitting(true);

    const res = await createStaffUser({
      hotel_id: hotel?.id || 'default-hotel-id',
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      password: password.trim() || 'staff123',
      role,
      is_active: true,
    });

    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('');
      loadStaff();
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser || !newPassword.trim()) return;
    await updateStaffUser(passwordModalUser.id, hotel?.id || 'default-hotel-id', {
      password: newPassword.trim(),
    });
    setPasswordSavedMsg(`Password updated for ${passwordModalUser.full_name}`);
    setTimeout(() => {
      setPasswordSavedMsg('');
      setPasswordModalUser(null);
      setNewPassword('');
    }, 1200);
  };

  if (isLoading) {
    return <LoadingSpinner message="Fetching staff credentials and RBAC records..." />;
  }

  const roleBadges: Record<StaffRole, string> = {
    'SUPER ADMIN': 'bg-purple-100 text-purple-900 border-purple-300',
    ADMIN: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    'FRONT DESK': 'bg-blue-100 text-blue-900 border-blue-300',
    HOUSEKEEPING: 'bg-amber-100 text-amber-900 border-amber-300',
    ACCOUNTS: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            Staff &amp; Role-Based Access Control (RBAC)
          </h3>
          <p className="text-xs text-stone-500">
            Manage PMS login accounts, passwords, and role permissions across Front Desk, Housekeeping, Accounts, and Management
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Staff Member</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {staffList.length === 0 ? (
          <EmptyState
            title="No Staff Accounts Found"
            message="No staff members currently registered in the database."
            actionLabel="Add Staff Member"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Staff Name</th>
                  <th className="px-6 py-3">Login Email &amp; Mobile</th>
                  <th className="px-6 py-3">Assigned Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {staffList.map((member) => (
                  <tr key={member.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-stone-900 text-sm">{member.full_name}</div>
                      {member.id === currentUser.id && (
                        <span className="text-[10px] text-amber-800 font-semibold">(Current Active Session)</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-stone-800">{member.email}</div>
                      <div className="text-[11px] text-stone-500">{member.phone || 'No phone'}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          roleBadges[member.role] || 'bg-stone-100 text-stone-800'
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          member.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordModalUser(member);
                            setNewPassword('');
                            setPasswordSavedMsg('');
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Change Password</span>
                        </button>
                        {member.id !== currentUser.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(member)}
                              className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded cursor-pointer"
                            >
                              {member.is_active ? 'Suspend' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member)}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                              title="Delete staff account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RBAC Reference Guide */}
      <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-3">
        <h4 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-amber-700" />
          Role Permission Hierarchy Matrix
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">SUPER ADMIN</span>
            <p className="text-stone-600 mt-1">Full property access, website CMS settings, staff creation, audit trail logs.</p>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">FRONT DESK</span>
            <p className="text-stone-600 mt-1">Arrivals/Departures, Check-In ID verification, Walk-In reservations, Folio billing.</p>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">HOUSEKEEPING</span>
            <p className="text-stone-600 mt-1">Room cleanliness board, mark cleaned &amp; inspected, room maintenance flags.</p>
          </div>
          <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
            <span className="font-bold text-stone-900 block">ACCOUNTS</span>
            <p className="text-stone-600 mt-1">GST invoices, payment receipts, hotel operating expenses, P&amp;L reports.</p>
          </div>
        </div>
      </div>

      {/* ADD STAFF MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Hotel Staff Member"
        subtitle="Provision PMS access credentials with RBAC assignment"
        maxWidth="md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Staff Login Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="ramesh@sunmoonsuites.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Login Password *
            </label>
            <input
              type="password"
              required
              minLength={4}
              placeholder="Enter login password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Contact Phone
            </label>
            <input
              type="tel"
              placeholder="+91 96678 13353"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Assigned Operational Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-semibold"
            >
              <option value="FRONT DESK">FRONT DESK</option>
              <option value="HOUSEKEEPING">HOUSEKEEPING</option>
              <option value="ACCOUNTS">ACCOUNTS</option>
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER ADMIN">SUPER ADMIN</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
            >
              {isSubmitting ? 'Creating...' : 'Create Staff Account'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        isOpen={Boolean(passwordModalUser)}
        onClose={() => setPasswordModalUser(null)}
        title="Change Staff Password"
        subtitle={passwordModalUser ? `${passwordModalUser.full_name} (${passwordModalUser.email})` : ''}
        maxWidth="sm"
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {passwordSavedMsg ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg">
              {passwordSavedMsg}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
