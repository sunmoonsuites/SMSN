import React, { useEffect, useState } from 'react';
import { Hotel, Guest } from '../../types';
import { getGuests, updateGuest } from '../../services/guestsService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Search,
  Users,
  Eye,
  Edit2,
  Phone,
  Mail,
  MapPin,
  FileCheck,
} from 'lucide-react';

interface GuestsViewProps {
  hotel: Hotel | null;
}

export const GuestsView: React.FC<GuestsViewProps> = ({ hotel }) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Guest Modal
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Edit Guest Modal
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editIdType, setEditIdType] = useState<Guest['id_type'] | ''>('');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadGuests();
    }
  }, [hotel?.id]);

  const loadGuests = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const data = await getGuests(hotel.id);
    setGuests(data);
    setIsLoading(false);
  };

  const handleStartEdit = (g: Guest) => {
    setEditingGuest(g);
    setEditFirstName(g.first_name);
    setEditLastName(g.last_name || '');
    setEditEmail(g.email || '');
    setEditPhone(g.phone);
    setEditIdType(g.id_type || 'Aadhaar');
    setEditIdNumber(g.id_number || '');
    setEditNotes(g.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !editingGuest) return;
    setIsSaving(true);

    const res = await updateGuest(editingGuest.id, hotel.id, {
      first_name: editFirstName.trim(),
      last_name: editLastName.trim() || undefined,
      email: editEmail.trim() || undefined,
      phone: editPhone.trim(),
      id_type: (editIdType || undefined) as Guest['id_type'],
      id_number: editIdNumber.trim() || undefined,
      notes: editNotes.trim() || undefined,
    });

    setIsSaving(false);

    if (res.success) {
      setEditingGuest(null);
      loadGuests();
    }
  };

  const filtered = guests.filter((g) => {
    const q = searchQuery.toLowerCase();
    const name = `${g.first_name} ${g.last_name || ''}`.toLowerCase();
    const phone = (g.phone || '').toLowerCase();
    const email = (g.email || '').toLowerCase();
    const idNum = (g.id_number || '').toLowerCase();
    return name.includes(q) || phone.includes(q) || email.includes(q) || idNum.includes(q);
  });

  if (isLoading) {
    return <LoadingSpinner message="Fetching guest profiles from database..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">Guest Directory &amp; CRM</h3>
          <p className="text-xs text-stone-500">
            {guests.length} registered guest profiles with stay histories &amp; statutory IDs
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, phone, email, Aadhaar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
          />
        </div>
      </div>

      {/* Guest Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Guests Found"
            message={
              guests.length === 0
                ? 'No guest profiles currently exist in the database. Guests will be automatically registered upon booking or walk-in check-in.'
                : 'No guests matched your search query.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Guest Name</th>
                  <th className="px-6 py-3">Contact</th>
                  <th className="px-6 py-3">ID Document</th>
                  <th className="px-6 py-3">Registered Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map((g) => (
                  <tr key={g.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3.5">
                      <div className="font-bold text-stone-900 text-sm">
                        {g.first_name} {g.last_name}
                      </div>
                      {g.city && (
                        <div className="text-[11px] text-stone-500">
                          {g.city}, {g.country}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="font-medium text-stone-800">{g.phone}</div>
                      <div className="text-[11px] text-stone-500">{g.email || 'No email'}</div>
                    </td>
                    <td className="px-6 py-3.5">
                      {g.id_number ? (
                        <span className="font-mono text-xs bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-200">
                          {g.id_type}: {g.id_number}
                        </span>
                      ) : (
                        <span className="text-stone-400 italic text-[11px]">Not recorded</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-stone-500">{formatDate(g.created_at)}</td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedGuest(g)}
                          title="View Guest Details"
                          className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-md"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(g)}
                          title="Edit Profile"
                          className="p-1.5 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-md"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW GUEST MODAL */}
      {selectedGuest && (
        <Modal
          isOpen={Boolean(selectedGuest)}
          onClose={() => setSelectedGuest(null)}
          title={`Guest Profile: ${selectedGuest.first_name} ${selectedGuest.last_name || ''}`}
          subtitle={`Registered on ${formatDate(selectedGuest.created_at)}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
              <div className="flex items-center gap-2 text-stone-700">
                <Phone className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="font-semibold text-stone-900">{selectedGuest.phone}</span>
              </div>
              {selectedGuest.email && (
                <div className="flex items-center gap-2 text-stone-700">
                  <Mail className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{selectedGuest.email}</span>
                </div>
              )}
              {selectedGuest.id_number && (
                <div className="flex items-center gap-2 text-stone-700">
                  <FileCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="font-mono">
                    {selectedGuest.id_type || 'ID'}: {selectedGuest.id_number}
                  </span>
                </div>
              )}
            </div>

            {selectedGuest.notes && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-amber-900">
                <span className="font-bold block mb-0.5">Staff Notes:</span>
                <p>{selectedGuest.notes}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedGuest(null)}
                className="px-4 py-2 bg-stone-900 text-white rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT GUEST MODAL */}
      {editingGuest && (
        <Modal
          isOpen={Boolean(editingGuest)}
          onClose={() => setEditingGuest(null)}
          title="Edit Guest Profile"
          subtitle="Update contact details or statutory verification ID"
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  ID Proof Document
                </label>
                <select
                  value={editIdType}
                  onChange={(e) => setEditIdType(e.target.value as Guest['id_type'])}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
                >
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Voter ID">Voter ID</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                  ID Document Number
                </label>
                <input
                  type="text"
                  value={editIdNumber}
                  onChange={(e) => setEditIdNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                Internal Staff Notes
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setEditingGuest(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white text-xs font-semibold uppercase tracking-wider rounded-lg"
              >
                {isSaving ? 'Saving...' : 'Update Guest'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
