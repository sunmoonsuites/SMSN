import React, { useEffect, useState } from 'react';
import { Hotel, Expense, ExpenseCategory } from '../../types';
import {
  getExpenses,
  createExpense,
  getExpenseCategories,
  createExpenseCategory,
  deleteExpense,
} from '../../services/expensesService';
import { formatINR, formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { Modal } from '../common/Modal';
import {
  Receipt,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';

interface ExpensesViewProps {
  hotel: Hotel | null;
  currentUser?: any;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ hotel }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add Expense Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>('');
  const [newCatName, setNewCatName] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Cheque'>('UPI');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (hotel?.id) {
      loadData();
    }
  }, [hotel?.id]);

  const loadData = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);
    const [expData, catData] = await Promise.all([
      getExpenses(hotel.id),
      getExpenseCategories(hotel.id),
    ]);
    setExpenses(expData);
    setCategories(catData);
    if (catData.length > 0 && !categoryId) {
      setCategoryId(catData[0].id);
    }
    setIsLoading(false);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id || !description.trim() || amount <= 0) return;
    setIsSubmitting(true);

    let activeCatId = categoryId;
    if (newCatName.trim()) {
      const catRes = await createExpenseCategory(hotel.id, newCatName.trim());
      if (catRes.success && catRes.data) {
        activeCatId = catRes.data.id;
      }
    }

    const res = await createExpense({
      hotel_id: hotel.id,
      description: description.trim(),
      amount,
      category_id: activeCatId || undefined,
      date,
      payment_method: paymentMethod,
      vendor: vendor.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setShowAddModal(false);
      setDescription('');
      setAmount(0);
      setVendor('');
      setNotes('');
      setNewCatName('');
      loadData();
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!hotel?.id) return;
    const res = await deleteExpense(id, hotel.id);
    if (res.success) {
      setExpenses((prev) => prev.filter((exp) => exp.id !== id));
    }
  };

  const filtered = expenses.filter((exp) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const desc = exp.description.toLowerCase();
      const ven = (exp.vendor || '').toLowerCase();
      return desc.includes(q) || ven.includes(q);
    }
    return true;
  });

  const totalExpenseAmount = filtered.reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return <LoadingSpinner message="Fetching hotel operating expenses..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">Hotel Operating Expenses</h3>
          <p className="text-xs text-stone-500">
            Track daily electricity, laundry, staff, and food procurement expenses
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Expense</span>
        </button>
      </div>

      {/* Summary Stat Card */}
      <div className="p-5 bg-white rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Total Logged Expenses
          </span>
          <div className="text-3xl font-serif font-bold text-stone-900 mt-1">
            {formatINR(totalExpenseAmount)}
          </div>
          <span className="text-[11px] text-stone-500">
            {filtered.length} expense entries recorded
          </span>
        </div>
        <Receipt className="w-10 h-10 text-amber-700/60" />
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Search by expense description, vendor..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700 font-medium"
        />
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Expenses Logged"
            message={
              expenses.length === 0
                ? 'No operating expenses currently recorded in the database.'
                : 'No expenses match the search filter.'
            }
            actionLabel={expenses.length === 0 ? 'Log First Expense' : undefined}
            onAction={expenses.length === 0 ? () => setShowAddModal(true) : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Expense Item</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Paid To / Vendor</th>
                  <th className="px-6 py-3">Payment Method</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3.5 text-stone-600">{formatDate(exp.date)}</td>
                    <td className="px-6 py-3.5 font-semibold text-stone-900">{exp.description}</td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 bg-stone-100 rounded text-[10px] text-stone-700 font-medium">
                        {exp.category?.name || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-stone-600">{exp.vendor || '—'}</td>
                    <td className="px-6 py-3.5 text-stone-600">{exp.payment_method || 'Cash'}</td>
                    <td className="px-6 py-3.5 font-serif font-bold text-stone-900 text-right">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD EXPENSE MODAL */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Record Operating Expense"
        subtitle="Log operational expenditures with payment mode &amp; vendor details"
        maxWidth="md"
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
              Expense Description *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Diesel for 100% DG Set Backup, Laundry Detergent, Kitchen Veggies"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Amount (INR ₹) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="2500"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg font-bold text-stone-900"
              />
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Expense Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              >
                <option value="">Select or Create Below</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
                Payment Mode
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg"
              >
                <option value="UPI">UPI / QR</option>
                <option value="Cash">Cash</option>
                <option value="Card">Credit / Debit Card</option>
                <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
              Paid To / Vendor Name
            </label>
            <input
              type="text"
              placeholder="e.g. Noida Power Co., CleanLinen Services Pvt Ltd"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-bold uppercase tracking-wider text-stone-700 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="Bill number, invoice attachment reference, or supervisor notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
