// The live balance and the payments it considers. The number comes from balance_view in SQL (never stored);
// with EXPO_PUBLIC_DEV_BYPASS_AUTH=1 it is computed from the sample month with the same rules (src/lib/splits.ts).
import { useQuery } from '@tanstack/react-query';
import { ME, sampleExpenses, sampleSettlements } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { netBalance, type SettlementLike } from '@/lib/splits';
import { supabase } from '@/lib/supabase';

export interface Settlement extends SettlementLike {
  id: string;
  method: 'transfer' | 'cash' | 'other';
  /** YYYY-MM-DD */
  paidOn: string;
}

/** Positive: the partner owes me that amount; negative: I owe it. */
export async function getMyBalance(): Promise<number> {
  if (DEV_BYPASS_AUTH) return netBalance(sampleExpenses, sampleSettlements, ME);
  const { userId } = useSessionStore.getState();
  if (!userId) throw new Error('not_signed_in');
  const { data, error } = await supabase.from('balance_view').select('net_minor').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Number((data as { net_minor: number | string } | null)?.net_minor ?? 0);
}

export async function listSettlements(): Promise<Settlement[]> {
  if (DEV_BYPASS_AUTH) return sampleSettlements.map((s, i) => ({ id: `s${i}`, method: 'transfer', paidOn: '2026-10-03', ...s }));
  const { data, error } = await supabase
    .from('settlements')
    .select('id, from_user, to_user, amount_minor, method, paid_on')
    .is('deleted_at', null)
    .order('paid_on', { ascending: false });
  if (error) throw error;
  return (data as SettlementRow[]).map((r) => ({
    id: r.id,
    fromUser: r.from_user,
    toUser: r.to_user,
    amountMinor: Number(r.amount_minor),
    method: r.method,
    paidOn: r.paid_on,
  }));
}

export const balanceKeys = {
  balance: ['balance'] as const,
  settlements: ['settlements'] as const,
};

export function useMyBalance() {
  return useQuery({ queryKey: balanceKeys.balance, queryFn: getMyBalance });
}

export function useSettlements() {
  return useQuery({ queryKey: balanceKeys.settlements, queryFn: listSettlements });
}

interface SettlementRow {
  id: string;
  from_user: string;
  to_user: string;
  amount_minor: number | string;
  method: Settlement['method'];
  paid_on: string;
}
