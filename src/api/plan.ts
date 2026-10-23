// The couple's plan (Free / Premium), as Supabase says: my_plan(), written only by the server (Phase 6 — Billing).
// It refreshes when the couple's subscriptions row changes (Realtime, src/api/live.ts: the partner's phone unlocks
// within seconds), when the RevenueCat SDK learns something new, and when the app comes back to the foreground.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { waitUntil } from '@/lib/activation';
import type { PlanPackage } from '@/lib/offerings';
import { FREE_PLAN, planFromRpc, type Plan, type PlanInfo } from '@/lib/plans';
import { samplePlan } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import { identify, onCustomerInfo, purchase, restore } from './purchases';

export const planKey = ['plan'] as const;

export async function fetchPlan(): Promise<PlanInfo> {
  if (DEV_BYPASS_AUTH) return { ...samplePlan };
  const { data, error } = await supabase.rpc('my_plan');
  if (error) throw error;
  return planFromRpc(data);
}

/**
 * The couple's plan. `info` is Free until it has loaded. `gate` is what screens pass to src/lib/plans.ts: Premium
 * while loading, so a paying couple never sees a lock flash (it's a screen limit, not a secret: the data is theirs).
 */
export function usePlan() {
  const hasHousehold = useSessionStore((s) => s.householdId !== null) || DEV_BYPASS_AUTH;
  const query = useQuery({ queryKey: planKey, queryFn: fetchPlan, enabled: hasHousehold });
  const gate: Plan = query.isLoading ? 'premium' : (query.data?.plan ?? 'free');
  return { ...query, info: query.data ?? FREE_PLAN, isPremium: query.data?.plan === 'premium', gate };
}

/**
 * Ask the server to read this person's state from RevenueCat and write their couple's row (billing-sync). Covers what
 * webhook events alone can't: a purchase made before having a couple, and a restore on a new account. Never throws:
 * the webhook still delivers, and the next sync retries.
 */
export async function syncPlan(): Promise<void> {
  if (DEV_BYPASS_AUTH) return;
  const { error } = await supabase.functions.invoke('billing-sync', { method: 'POST' });
  if (error) console.warn('[plan] billing-sync failed', error.message);
}

const isPremiumNow = async () => (await fetchPlan()).plan === 'premium';

/** Mount once, inside QueryClientProvider: RevenueCat follows the session, and its news refreshes the plan. */
export function usePlanSync() {
  const client = useQueryClient();
  const userId = useSessionStore((s) => s.userId);

  useEffect(() => {
    void identify(userId);
  }, [userId]);

  useEffect(() => onCustomerInfo(() => void client.invalidateQueries({ queryKey: planKey })), [client]);
}

/**
 * Buy a plan. `cancelled` when the person closed the store's sheet (not an error). After the store confirms, the
 * server syncs and the app checks my_plan() for up to ~20 s (onActivating: "Activando Premium…"); `pending` if it is
 * still not Premium by then (the webhook will finish it; the screen says so).
 */
export function usePurchasePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ plan, onActivating }: { plan: PlanPackage; onActivating?: () => void }) => {
      if ((await purchase(plan)) === 'cancelled') return 'cancelled' as const;
      onActivating?.();
      await syncPlan();
      return (await waitUntil(isPremiumNow)) ? ('active' as const) : ('pending' as const);
    },
    onSettled: () => client.invalidateQueries({ queryKey: planKey }),
  });
}

/** Restaurar compras: the store's purchases back on this account, then the server's answer. */
export function useRestorePurchases() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await restore();
      await syncPlan();
      return fetchPlan();
    },
    onSettled: () => client.invalidateQueries({ queryKey: planKey }),
  });
}
