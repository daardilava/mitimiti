// The live balance and the payments it considers. The number comes from balance_view in SQL (never stored);
// with EXPO_PUBLIC_DEV_BYPASS_AUTH=1 it is computed from the sample month with the same rules (src/lib/splits.ts).
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isoDate } from '@/lib/dates';
import { ME, PARTNER, sampleExpenses, sampleSettlements } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import type { SettleMethod } from '@/lib/settle';
import { netBalance, type SettlementLike } from '@/lib/splits';
import { supabase } from '@/lib/supabase';

export interface Settlement extends SettlementLike {
  id: string;
  method: SettleMethod;
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
  if (DEV_BYPASS_AUTH) {
    return sampleSettlements
      .map((s, i) => ({ ...s, id: `s${i}`, method: s.method ?? 'transfer', paidOn: s.paidOn ?? '2026-10-03' }))
      .sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0));
  }
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

/**
 * Records a payment made outside the app (it never moves money). record_settlement picks the direction from the
 * balance (whoever owes pays the other) and refuses more than what is owed.
 */
export async function recordSettlement(input: { amountMinor: number; method: SettleMethod }): Promise<Settlement> {
  if (DEV_BYPASS_AUTH) {
    const net = netBalance(sampleExpenses, sampleSettlements, ME);
    if (net === 0) throw new Error('nothing_owed');
    if (input.amountMinor <= 0 || input.amountMinor > Math.abs(net)) throw new Error('amount_exceeds_balance');
    const [fromUser, toUser] = net > 0 ? [PARTNER, ME] : [ME, PARTNER];
    const saved = { fromUser, toUser, amountMinor: input.amountMinor, method: input.method, paidOn: isoDate(new Date()) };
    sampleSettlements.push(saved);
    return { ...saved, id: `s${sampleSettlements.length - 1}` };
  }
  const { data, error } = await supabase.rpc('record_settlement', { p_amount_minor: input.amountMinor, p_method: input.method });
  if (error) throw error;
  const r = data as SettlementRow;
  return { id: r.id, fromUser: r.from_user, toUser: r.to_user, amountMinor: Number(r.amount_minor), method: r.method, paidOn: r.paid_on };
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

/** On success the balance and the payment list refetch, so Home and Pago registrado show the new balance. */
export function useRecordSettlement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: recordSettlement,
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: balanceKeys.balance }),
        client.invalidateQueries({ queryKey: balanceKeys.settlements }),
      ]),
  });
}

interface SettlementRow {
  id: string;
  from_user: string;
  to_user: string;
  amount_minor: number | string;
  method: Settlement['method'];
  paid_on: string;
}
