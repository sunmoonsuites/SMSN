import React, { useState } from 'react';
import {
  CRMAgent,
  CRMAgentRole,
  CRMUserPermissions,
  ROLE_PRESET_PERMISSIONS,
  saveCRMAgent,
  deleteCRMAgent,
  toggleAgentStatus,
} from '../../services/crmService';
import { StaffUser } from '../../types';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserPlus,
  Sliders,
  Check,
} from 'lucide-react';

export interface CRMAgentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: CRMAgent[];
  currentUser?: StaffUser | null;
  onRefreshAgents: () => Promise<void> | void;
  onAgentSaved: (toastMessage: string) => void;
}

type ModalTab = 'roster' | 'create' | 'edit' | 'matrix';

export const CRMAgentsModal: React.FC<CRMAgentsModalProps> = ({
  isOpen,
  onClose,
  agents,
  currentUser,
  onRefreshAgents,
  onAgentSaved,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('roster');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('Senior Sales Specialist');
  const [password, setPassword] = useState('agent123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<CRMAgentRole>('AGENT');
  const [permissions, setPermissions] = useState<CRMUserPermissions>(
    ROLE_PRESET_PERMISSIONS.AGENT
  );

  // Edit Form State
  const [editingAgent, setEditingAgent] = useState<CRMAgent | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState<CRMAgentRole>('AGENT');
  const [editPermissions, setEditPermissions] = useState<CRMUserPermissions>(
    ROLE_PRESET_PERMISSIONS.AGENT
  );

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: CRMAgentRole) => {
    setRole(newRole);
    setPermissions(ROLE_PRESET_PERMISSIONS[newRole]);
  };

  const handleEditRoleChange = (newRole: CRMAgentRole) => {
    setEditRole(newRole);
    setEditPermissions(ROLE_PRESET_PERMISSIONS[newRole]);
  };

  const handleStartEdit = (agent: CRMAgent) => {
    setEditingAgent(agent);
    setEditFullName(agent.full_name);
    setEditPhone(agent.phone || '');
    setEditDesignation(agent.designation || '');
    setEditPassword(agent.password || '');
    setEditRole(agent.role);
    setEditPermissions(agent.permissions || ROLE_PRESET_PERMISSIONS[agent.role]);
    setErrorMessage('');
    setActiveTab('edit');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMessage('Full name and email address are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await saveCRMAgent({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        designation: designation.trim() || 'Sales Specialist',
        role,
        permissions,
        password: password.trim() || 'agent123',
        is_active: true,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create agent.');
        setIsSubmitting(false);
        return;
      }

      await onRefreshAgents();
      onAgentSaved(`Agent "${fullName.trim()}" created successfully with login credentials!`);

      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setPassword('agent123');
      setDesignation('Senior Sales Specialist');
      setRole('AGENT');
      setPermissions(ROLE_PRESET_PERMISSIONS.AGENT);
      setActiveTab('roster');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error saving agent record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    if (!editFullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await saveCRMAgent({
        id: editingAgent.id,
        full_name: editFullName.trim(),
        email: editingAgent.email,
        phone: editPhone.trim() || undefined,
        designation: editDesignation.trim(),
        role: editRole,
        permissions: editPermissions,
        password: editPassword.trim() || editingAgent.password || 'agent123',
        is_active: editingAgent.is_active,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to update agent.');
        setIsSubmitting(false);
        return;
      }

      await onRefreshAgents();
      onAgentSaved(`Agent "${editFullName.trim()}" updated successfully!`);
      setEditingAgent(null);
      setActiveTab('roster');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error updating agent record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (agent: CRMAgent) => {
    setIsSubmitting(true);
    const res = await deleteCRMAgent(agent.id);
    setIsSubmitting(false);
    setConfirmDeleteId(null);

    if (res.success) {
      await onRefreshAgents();
      onAgentSaved(`Agent "${agent.full_name}" has been deleted.`);
    } else {
      setErrorMessage(res.error || 'Failed to delete agent.');
    }
  };

  const handleToggleActive = async (agent: CRMAgent) => {
    const nextStatus = !agent.is_active;
    await toggleAgentStatus(agent.id, nextStatus);
    await onRefreshAgents();
    onAgentSaved(
      `Agent ${agent.full_name} is now ${nextStatus ? 'ACTIVE' : 'SUSPENDED'}.`
    );
  };

  const filteredAgents = agents.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      (a.designation && a.designation.toLowerCase().includes(q)) ||
      a.role.toLowerCase().includes(q)
    );
  });

  const activeCount = agents.filter((a) => a.is_active).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border-2 border-[#C8A45D] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="bg-[#0F172A] text-white px-6 py-4 flex items-center justify-between border-b border-[#C8A45D]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C8A45D]/20 border border-[#C8A45D] flex items-center justify-center text-[#C8A45D]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-[#C8A45D]">
                  CRM Sales Agents &amp; Roles Management
                </h3>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 font-semibold">
                  {activeCount} Active / {agents.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Create &amp; edit sales agents, assign pipeline leads, and define custom role permissions
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center border-b border-stone-200 bg-stone-50 px-6 pt-2 gap-2 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('roster');
              setEditingAgent(null);
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'roster'
                ? 'border-[#C8A45D] text-slate-950 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Agents Roster ({agents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setEditingAgent(null);
              setErrorMessage('');
            }}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'create'
                ? 'border-[#C8A45D] text-slate-950 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>+ Add New Agent</span>
          </button>

          {editingAgent && (
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'edit'
                  ? 'border-[#C8A45D] text-slate-950 font-extrabold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Edit: {editingAgent.full_name}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'matrix'
                ? 'border-[#C8A45D] text-slate-950 font-extrabold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#C8A45D]" />
            <span>Role Definitions &amp; RBAC</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: AGENTS ROSTER */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              {/* Search & Top Action */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agent by name, email, phone, designation..."
                    className="w-full pl-3 pr-3 py-2 border border-stone-300 rounded-xl text-xs focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create');
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New Agent</span>
                </button>
              </div>

              {/* Agents Grid List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredAgents.length === 0 ? (
                  <div className="col-span-2 py-10 text-center text-stone-400 bg-stone-50 rounded-xl border border-stone-200">
                    <Users className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                    <p className="font-semibold text-slate-700">No agents match your search</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Try clearing your search query or click &ldquo;+ Add New Agent&rdquo; above.
                    </p>
                  </div>
                ) : (
                  filteredAgents.map((ag) => {
                    const isOwner = ag.email === 'sunmoonsuites@gmail.com';
                    const isSelf = currentUser?.email.toLowerCase() === ag.email.toLowerCase();
                    const initials = ag.full_name
                      .split(' ')
                      .map((w) => w[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div
                        key={ag.id}
                        className={`p-4 rounded-xl border transition-all ${
                          ag.is_active
                            ? 'bg-white border-stone-200 hover:border-[#C8A45D] shadow-xs'
                            : 'bg-stone-50/70 border-stone-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-[#C8A45D] border border-[#C8A45D] font-bold text-sm flex items-center justify-center shrink-0">
                              {initials || 'AG'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-slate-900 text-sm">{ag.full_name}</h4>
                                {isSelf && (
                                  <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-stone-500 font-medium">
                                {ag.designation || 'Sales Agent'}
                              </p>
                            </div>
                          </div>

                          {/* Role Badge */}
                          <div className="shrink-0">
                            {ag.role === 'ADMIN' && (
                              <span className="inline-flex items-center gap-1 bg-[#0F172A] text-[#C8A45D] text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#C8A45D]/40">
                                <ShieldCheck className="w-3 h-3" />
                                ADMIN
                              </span>
                            )}
                            {ag.role === 'MANAGER' && (
                              <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-indigo-200">
                                <Shield className="w-3 h-3" />
                                MANAGER
                              </span>
                            )}
                            {ag.role === 'AGENT' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-200">
                                <UserCheck className="w-3 h-3" />
                                AGENT
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Contact info */}
                        <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-1 text-slate-600 text-[11px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3 h-3 text-stone-400 shrink-0" />
                            <a
                              href={`mailto:${ag.email}`}
                              className="hover:text-slate-900 hover:underline truncate"
                            >
                              {ag.email}
                            </a>
                          </div>
                          {ag.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3 text-stone-400 shrink-0" />
                              <a href={`tel:${ag.phone}`} className="hover:text-slate-900">
                                {ag.phone}
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Permissions Summary Badges */}
                        <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="text-stone-400 font-semibold mr-1">Perms:</span>
                          {ag.permissions?.viewLeads && (
                            <span className="bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-medium">
                              View
                            </span>
                          )}
                          {ag.permissions?.addLeads && (
                            <span className="bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-medium">
                              Add
                            </span>
                          )}
                          {ag.permissions?.editLeads && (
                            <span className="bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded font-medium">
                              Edit
                            </span>
                          )}
                          {ag.permissions?.deleteLeads && (
                            <span className="bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-medium">
                              Delete
                            </span>
                          )}
                          {ag.permissions?.leadsSettings && (
                            <span className="bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded font-medium">
                              Settings
                            </span>
                          )}
                        </div>

                        {/* Actions Suite */}
                        <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(ag)}
                            disabled={isOwner}
                            className={`flex items-center gap-1.5 font-bold text-[11px] cursor-pointer transition-colors ${
                              ag.is_active
                                ? 'text-emerald-700 hover:text-emerald-900'
                                : 'text-stone-400 hover:text-stone-700'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                ag.is_active ? 'bg-emerald-500' : 'bg-stone-300'
                              }`}
                            />
                            <span>{ag.is_active ? 'Active' : 'Suspended'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(ag)}
                              className="px-2.5 py-1 bg-stone-100 hover:bg-[#0F172A] hover:text-[#C8A45D] text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>

                            {!isOwner && (
                              <>
                                {confirmDeleteId === ag.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                    <span className="text-[10px] text-rose-700 font-bold">
                                      Confirm?
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDelete(ag)}
                                      disabled={isSubmitting}
                                      className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-1.5 py-0.5 bg-stone-200 text-stone-700 rounded text-[10px] cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(ag.id)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                                    title="Delete Agent"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW AGENT */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-[#C8A45D] text-slate-800 leading-relaxed text-[11px]">
                💡 <strong>Immediate Login Active:</strong> Any agent created here will be able to
                log into the CRM at <code>/CRM</code> or <code>/leads</code> immediately using their
                Work Email and Password.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Agent Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Vikram Malhotra"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Work Email (Used for CRM Login) *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="agent@sunmoonsuites.in"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98110 00000"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Senior Reservations Executive"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
              </div>

              {/* Login Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Portal Login Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters (e.g. agent123)"
                    className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl font-mono focus:outline-none focus:border-[#C8A45D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  The agent will use this password to sign into the Luxury CRM portal.
                </p>
              </div>

              {/* Role Presets */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="block font-bold text-slate-700">
                  Select Role &amp; Permission Preset
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('AGENT')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'AGENT'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">Sales Agent</span>
                      {role === 'AGENT' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-stone-500">
                      View leads, add enquiries, update status, and manage follow-ups.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('MANAGER')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'MANAGER'
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">Manager</span>
                      {role === 'MANAGER' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Full sales access plus Sheets &amp; Meta sync configuration.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('ADMIN')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      role === 'ADMIN'
                        ? 'border-[#C8A45D] bg-amber-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">CRM Admin</span>
                      {role === 'ADMIN' && <Check className="w-4 h-4 text-[#C8A45D]" />}
                    </div>
                    <p className="text-[10px] text-stone-500">
                      Unrestricted access: delete leads, configure integrations, manage team.
                    </p>
                  </button>
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Customized Permissions (RBAC)</label>
                  <span className="text-[10px] text-stone-400">
                    Check or uncheck individual privileges
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['viewLeads', 'View Leads & Pipeline'],
                      ['addLeads', 'Add New Leads'],
                      ['editLeads', 'Edit Status & Remarks'],
                      ['deleteLeads', 'Delete Leads from Pipeline'],
                      ['leadsSettings', 'Manage Sync & Settings'],
                    ] as Array<[keyof CRMUserPermissions, string]>
                  ).map(([k, label]) => (
                    <label
                      key={k}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 font-semibold cursor-pointer hover:bg-stone-100"
                    >
                      <input
                        type="checkbox"
                        checked={permissions[k]}
                        onChange={(e) =>
                          setPermissions({ ...permissions, [k]: e.target.checked })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('roster')}
                  className="px-4 py-2 border border-stone-300 rounded-xl font-bold text-slate-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating Agent...' : 'Create Agent & Activate Access'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: EDIT AGENT */}
          {activeTab === 'edit' && editingAgent && (
            <form onSubmit={handleEditSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-3 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-between text-[11px]">
                <span>
                  Editing Agent Record for: <strong>{editingAgent.full_name}</strong> (
                  {editingAgent.email})
                </span>
                <span className="font-mono text-[10px] text-stone-400">ID: {editingAgent.id}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Agent Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Work Email (Permanent Login Key)
                  </label>
                  <input
                    type="email"
                    disabled
                    value={editingAgent.email}
                    className="w-full px-3 py-2 border border-stone-200 rounded-xl bg-stone-100 text-stone-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98110 00000"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Designation / Title
                  </label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    placeholder="e.g. Senior Reservations Executive"
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-[#C8A45D]"
                  />
                </div>
              </div>

              {/* Reset Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reset Portal Password (Optional)
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    minLength={6}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave unchanged or enter new password"
                    className="w-full pl-3 pr-10 py-2 border border-stone-300 rounded-xl font-mono focus:outline-none focus:border-[#C8A45D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                  >
                    {showEditPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="block font-bold text-slate-700">Role Preset</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleEditRoleChange('AGENT')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      editRole === 'AGENT'
                        ? 'border-emerald-500 bg-emerald-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">Sales Agent</span>
                      {editRole === 'AGENT' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <p className="text-[10px] text-stone-500">Pipeline intake and management.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditRoleChange('MANAGER')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      editRole === 'MANAGER'
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">Manager</span>
                      {editRole === 'MANAGER' && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-stone-500">Sales + Sync &amp; Integrations.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEditRoleChange('ADMIN')}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      editRole === 'ADMIN'
                        ? 'border-[#C8A45D] bg-amber-50/50 shadow-xs'
                        : 'border-stone-200 bg-white hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">CRM Admin</span>
                      {editRole === 'ADMIN' && <Check className="w-4 h-4 text-[#C8A45D]" />}
                    </div>
                    <p className="text-[10px] text-stone-500">Full privileges + Delete leads.</p>
                  </button>
                </div>
              </div>

              {/* Granular Permissions */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <label className="block font-bold text-slate-700">Customized Permissions</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      ['viewLeads', 'View Leads & Pipeline'],
                      ['addLeads', 'Add New Leads'],
                      ['editLeads', 'Edit Status & Remarks'],
                      ['deleteLeads', 'Delete Leads from Pipeline'],
                      ['leadsSettings', 'Manage Sync & Settings'],
                    ] as Array<[keyof CRMUserPermissions, string]>
                  ).map(([k, label]) => (
                    <label
                      key={k}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200 font-semibold cursor-pointer hover:bg-stone-100"
                    >
                      <input
                        type="checkbox"
                        checked={editPermissions[k]}
                        onChange={(e) =>
                          setEditPermissions({ ...editPermissions, [k]: e.target.checked })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgent(null);
                    setActiveTab('roster');
                  }}
                  className="px-4 py-2 border border-stone-300 rounded-xl font-bold text-slate-700 hover:bg-stone-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving Changes...' : 'Save Agent Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ROLE MATRIX & DEFINITIONS */}
          {activeTab === 'matrix' && (
            <div className="space-y-5 max-w-3xl mx-auto">
              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-[#C8A45D]/40 space-y-2">
                <h4 className="font-serif font-bold text-sm text-[#C8A45D]">
                  Role-Based Access Control (RBAC) Architecture
                </h4>
                <p className="text-xs leading-relaxed text-slate-300">
                  Sun Moon Suites Luxury CRM enforces granular access permissions so that sales
                  agents only see and modify what they are authorized to handle. Admins have complete
                  control over data integrity, deletion rights, and third-party integrations (Google
                  Sheets &amp; Meta Ads).
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-stone-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-stone-100 text-slate-700 font-bold border-b border-stone-200">
                      <th className="py-3 px-4">Feature / Privilege</th>
                      <th className="py-3 px-3 text-center">Sales Agent</th>
                      <th className="py-3 px-3 text-center">Manager</th>
                      <th className="py-3 px-3 text-center">CRM Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        View Pipeline &amp; Data Table
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Add Direct &amp; Manual Leads
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Edit Lead Status, Remarks &amp; Follow-Ups
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Convert Lead to Hotel PMS Booking
                      </td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Configure Google Sheets 2-Way Sync
                      </td>
                      <td className="py-3 px-3 text-center text-stone-400">✗ No</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Configure Meta Ads Graph API
                      </td>
                      <td className="py-3 px-3 text-center text-stone-400">✗ No</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Delete Leads from Pipeline
                      </td>
                      <td className="py-3 px-3 text-center text-stone-400">✗ No</td>
                      <td className="py-3 px-3 text-center text-stone-400">✗ No</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        Create, Edit &amp; Delete Sales Agents
                      </td>
                      <td className="py-3 px-3 text-center text-stone-400">✗ No</td>
                      <td className="py-3 px-3 text-center text-stone-400">✗ No</td>
                      <td className="py-3 px-3 text-center text-emerald-600 font-bold">✓ Yes</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('create');
                    setErrorMessage('');
                  }}
                  className="px-5 py-2.5 bg-[#C8A45D] hover:bg-[#b59049] text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Create Agent Now</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
