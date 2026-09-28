import { getSupabase } from '../lib/supabase';
import { Expense, ExpenseCategory } from '../types';
import { logAction } from './auditService';

const LOCAL_EXPENSE_CAT_KEY = 'pms_custom_expense_categories';
const LOCAL_EXPENSES_KEY = 'pms_custom_expenses';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'ecat-1', hotel_id: 'default-hotel-id', name: 'Electricity & Diesel (DG)', created_at: new Date().toISOString() },
  { id: 'ecat-2', hotel_id: 'default-hotel-id', name: 'Housekeeping & Laundry Supplies', created_at: new Date().toISOString() },
  { id: 'ecat-3', hotel_id: 'default-hotel-id', name: 'Kitchen & F&B Raw Materials', created_at: new Date().toISOString() },
  { id: 'ecat-4', hotel_id: 'default-hotel-id', name: 'Staff Salaries & Welfare', created_at: new Date().toISOString() },
  { id: 'ecat-5', hotel_id: 'default-hotel-id', name: 'Repairs & Plumbing/AC Maintenance', created_at: new Date().toISOString() },
];

function getLocalCategories(): ExpenseCategory[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXPENSE_CAT_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_EXPENSE_CAT_KEY, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
      return DEFAULT_EXPENSE_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_EXPENSE_CATEGORIES;
  } catch {
    return DEFAULT_EXPENSE_CATEGORIES;
  }
}

function getLocalExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalExpenses(list: Expense[]) {
  try {
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(list));
  } catch {
    // Ignore storage issues
  }
}

export async function getExpenseCategories(hotelId: string): Promise<ExpenseCategory[]> {
  const localCats = getLocalCategories();
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(hotelId)) return localCats;

  try {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('name', { ascending: true });

    if (error) return localCats;
    const remoteCats = (data as ExpenseCategory[]) || [];
    return remoteCats.length > 0 ? remoteCats : localCats;
  } catch {
    return localCats;
  }
}

export async function createExpenseCategory(
  hotelId: string,
  name: string
): Promise<{ success: boolean; data?: ExpenseCategory; error?: string }> {
  const newCat: ExpenseCategory = {
    id: `ecat-${Date.now()}`,
    hotel_id: hotelId || 'default-hotel-id',
    name: name.trim(),
    created_at: new Date().toISOString(),
  };

  const current = getLocalCategories();
  try {
    localStorage.setItem(LOCAL_EXPENSE_CAT_KEY, JSON.stringify([...current, newCat]));
  } catch {
    // Ignore
  }

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(hotelId)) {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ hotel_id: hotelId, name: name.trim() }])
        .select()
        .single();

      if (!error && data) {
        return { success: true, data: data as ExpenseCategory };
      }
    } catch {
      // Handled locally
    }
  }

  return { success: true, data: newCat };
}

export async function getExpenses(hotelId: string): Promise<Expense[]> {
  const localList = getLocalExpenses();
  const supabase = getSupabase();
  if (!supabase || !UUID_REGEX.test(hotelId)) return localList;

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*, category:expense_categories(*)')
      .eq('hotel_id', hotelId)
      .order('date', { ascending: false });

    if (error) return localList;
    const remoteList = (data as Expense[]) || [];
    return remoteList.length > 0 ? remoteList : localList;
  } catch {
    return localList;
  }
}

export async function createExpense(
  expenseData: Omit<Expense, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; data?: Expense; error?: string }> {
  const cats = getLocalCategories();
  const matchedCat = cats.find((c) => c.id === expenseData.category_id);

  const newExpense: Expense = {
    ...expenseData,
    id: `exp-${Date.now()}`,
    category: matchedCat,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const current = getLocalExpenses();
  saveLocalExpenses([newExpense, ...current]);

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(expenseData.hotel_id)) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expenseData])
        .select()
        .single();

      if (!error && data) {
        await logAction(
          expenseData.hotel_id,
          `Added Expense: ₹${expenseData.amount} (${expenseData.description})`,
          'Expense',
          data.id
        );
        return { success: true, data: data as Expense };
      }
    } catch {
      // Handled locally
    }
  }

  return { success: true, data: newExpense };
}

export async function deleteExpense(
  id: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  const current = getLocalExpenses();
  saveLocalExpenses(current.filter((e) => e.id !== id));

  const supabase = getSupabase();
  if (supabase && UUID_REGEX.test(id)) {
    try {
      await supabase.from('expenses').delete().eq('id', id);
      await logAction(hotelId, `Deleted Expense`, 'Expense', id);
    } catch {
      // Handled locally
    }
  }

  return { success: true };
}
