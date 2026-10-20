// Expense reads and writes. With EXPO_PUBLIC_DEV_BYPASS_AUTH=1 they work on the in-memory sample
// month from src/lib/sample.ts; otherwise they go to Supabase (tables for reads, RPCs for writes).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toAvatarId, type AvatarId } from '@/lib/avatars';
import { myDefaultPct, type MemberRole } from '@/lib/coupleSettings';
import type { Currency } from '@/lib/money';
import { balanceKeys } from './balance';
import { avatars, ME, names, PARTNER, sampleExpenses, sampleHousehold } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import type { SplitMode } from '@/lib/splits';
import { supabase } from '@/lib/supabase';
import type { CategoryId } from '@/ui/tokens';

export interface Expense {
  id: string;
  paidBy: string;
  amountMinor: number;
  category: CategoryId;
  description: string;
  /** YYYY-MM-DD */
  spentOn: string;
  splitMode: SplitMode;
  /** Payer's percentage, only for 'pct'. */
  splitPct?: number | null;
}

/** What the form sends. No id creates a new expense. */
export type ExpenseInput = Omit<Expense, 'id'> & { id?: string };

export interface Person {
  id: string;
  name: string;
  /** The character picked in Ajustes; null shows the initial. */
  avatar: AvatarId | null;
}

export interface Couple {
  me: Person;
  /** Before the partner joins: id '' and the name the owner typed in Setup. */
  partner: Person;
  partnerJoined: boolean;
  currency: Currency;
  myRole: MemberRole;
  /** How new expenses are split unless changed (Ajustes › División predeterminada). */
  defaultSplit: 'half' | 'pct';
  /** My share (%) when the default is proportional. */
  myDefaultPct: number;
}

// ─── Plain functions ──────────────────────────────────────────────────────

export async function getCouple(): Promise<Couple> {
  if (DEV_BYPASS_AUTH) {
    const h = sampleHousehold;
    return {
      me: { id: ME, name: names[ME], avatar: avatars[ME] },
      partner: { id: PARTNER, name: names[PARTNER], avatar: avatars[PARTNER] },
      partnerJoined: true,
      currency: h.currency,
      myRole: 'owner',
      defaultSplit: h.defaultSplit,
      myDefaultPct: h.defaultPct,
    };
  }
  const { householdId, userId: myId } = useSessionStore.getState();
  if (!householdId || !myId) throw new Error('not_in_household');
  const [household, members] = await Promise.all([
    supabase.from('households').select('currency, invited_name, default_split, default_pct').eq('id', householdId).single(),
    listMembers(householdId),
  ]);
  if (household.error) throw household.error;
  if (members.error) throw members.error;
  const rows = members.data as { user_id: string; display_name: string; role: MemberRole; avatar: string | null }[];
  const mine = rows.find((m) => m.user_id === myId);
  const theirs = rows.find((m) => m.user_id !== myId);
  const h = household.data as { currency: Currency; invited_name: string | null; default_split: 'half' | 'pct'; default_pct: number };
  const myRole = mine?.role ?? 'owner';
  return {
    me: { id: myId, name: mine?.display_name || 'Tú', avatar: toAvatarId(mine?.avatar) },
    partner: { id: theirs?.user_id ?? '', name: theirs?.display_name || h.invited_name || 'Tu pareja', avatar: toAvatarId(theirs?.avatar) },
    partnerJoined: !!theirs,
    currency: h.currency,
    myRole,
    defaultSplit: h.default_split,
    myDefaultPct: myDefaultPct(myRole, h.default_pct),
  };
}

/**
 * The couple's members with their avatars. Until 20261019000000_member_avatar.sql is applied, members has no avatar
 * column (Postgres 42703); then everyone shows their initial instead of the screen failing to load.
 */
async function listMembers(householdId: string) {
  const withAvatar = await supabase.from('members').select('user_id, display_name, role, avatar').eq('household_id', householdId);
  if (withAvatar.error?.code !== '42703') return withAvatar;
  return supabase.from('members').select('user_id, display_name, role').eq('household_id', householdId);
}

export async function listExpenses(): Promise<Expense[]> {
  if (DEV_BYPASS_AUTH) return [...sampleExpenses].sort(byRecent);
  const { data, error } = await supabase
    .from('expenses')
    .select(COLUMNS)
    .is('deleted_at', null)
    .order('spent_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as ExpenseRow[]).map(fromRow);
}

/** Null when the expense doesn't exist or was deleted. */
export async function getExpense(id: string): Promise<Expense | null> {
  if (DEV_BYPASS_AUTH) {
    const found = sampleExpenses.find((e) => e.id === id);
    return found ? { ...found } : null;
  }
  const { data, error } = await supabase.from('expenses').select(COLUMNS).eq('id', id).is('deleted_at', null).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data as unknown as ExpenseRow) : null;
}

/** Creates or updates through upsert_expense; shares are recomputed server-side. */
export async function upsertExpense(input: ExpenseInput): Promise<Expense> {
  const splitPct = input.splitMode === 'pct' ? (input.splitPct ?? null) : null;
  const description = input.description.trim();
  if (DEV_BYPASS_AUTH) {
    const saved: Expense = { ...input, id: input.id ?? `e${Date.now()}`, description, splitPct };
    const i = sampleExpenses.findIndex((e) => e.id === saved.id);
    if (i >= 0) sampleExpenses[i] = saved;
    else sampleExpenses.unshift(saved);
    return { ...saved };
  }
  const { data, error } = await supabase.rpc('upsert_expense', {
    p_id: input.id ?? null,
    p_paid_by: input.paidBy,
    p_amount_minor: input.amountMinor,
    p_category: input.category,
    p_description: description,
    p_spent_on: input.spentOn,
    p_split_mode: input.splitMode,
    p_split_pct: splitPct,
  });
  if (error) throw error;
  return fromRow(data as unknown as ExpenseRow);
}

/** Soft-deletes through delete_expense. */
export async function deleteExpense(id: string): Promise<void> {
  if (DEV_BYPASS_AUTH) {
    const i = sampleExpenses.findIndex((e) => e.id === id);
    if (i < 0) throw new Error('expense_not_found');
    sampleExpenses.splice(i, 1);
    return;
  }
  const { error } = await supabase.rpc('delete_expense', { p_id: id });
  if (error) throw error;
}

// ─── React Query hooks ────────────────────────────────────────────────────

export const expenseKeys = {
  all: ['expenses'] as const,
  one: (id: string) => ['expenses', id] as const,
};

export const coupleKey = ['couple'] as const;

export function useCouple() {
  // Names change rarely; realtime and app focus refresh it (e.g. when the partner joins).
  return useQuery({ queryKey: coupleKey, queryFn: getCouple, staleTime: 5 * 60_000 });
}

export function useExpenses() {
  return useQuery({ queryKey: expenseKeys.all, queryFn: listExpenses });
}

export function useExpense(id: string | undefined) {
  return useQuery({ queryKey: expenseKeys.one(id ?? ''), queryFn: () => getExpense(id!), enabled: !!id });
}

export function useUpsertExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: upsertExpense,
    onSuccess: (saved) => {
      client.setQueryData(expenseKeys.one(saved.id), saved);
      client.invalidateQueries({ queryKey: balanceKeys.balance });
      return client.invalidateQueries({ queryKey: expenseKeys.all });
    },
  });
}

export function useDeleteExpense() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: (_void, id) => {
      // Drop the cache entry without refetching, so the detail screen doesn't flash "not found" while it closes.
      client.removeQueries({ queryKey: expenseKeys.one(id), exact: true });
      client.invalidateQueries({ queryKey: balanceKeys.balance });
      return client.invalidateQueries({ queryKey: expenseKeys.all, exact: true });
    },
  });
}

// ─── Mapping ──────────────────────────────────────────────────────────────

const COLUMNS = 'id, paid_by, amount_minor, category, description, spent_on, split_mode, split_pct';

interface ExpenseRow {
  id: string;
  paid_by: string;
  amount_minor: number;
  category: CategoryId;
  description: string;
  spent_on: string;
  split_mode: SplitMode;
  split_pct: number | null;
}

function fromRow(r: ExpenseRow): Expense {
  return {
    id: r.id,
    paidBy: r.paid_by,
    amountMinor: Number(r.amount_minor),
    category: r.category,
    description: r.description,
    spentOn: r.spent_on,
    splitMode: r.split_mode,
    splitPct: r.split_pct,
  };
}

function byRecent(a: Expense, b: Expense): number {
  return a.spentOn < b.spentOn ? 1 : a.spentOn > b.spentOn ? -1 : 0;
}
