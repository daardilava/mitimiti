// What each plan allows: the single place that says it (Phase 6 — Billing, docs/PLAN.md). Screens ask
// canOpenMonth() and canUseFeature(); no plan checks scattered elsewhere. Free never changes the balance: these rules
// only decide which screens and periods open, never which expenses count.
import { isoDate, monthOf, shiftMonth } from './dates';

export type Plan = 'free' | 'premium';

/** Premium features. `recurring` and `receiptPhoto` don't exist yet; the paywall lists them as Pronto. */
export type Feature = 'history' | 'budgets' | 'export' | 'recurring' | 'receiptPhoto';

/** Free opens the current month and the 2 before it in Movimientos and Resumen. */
export const FREE_HISTORY_MONTHS = 3;

/** The plan as my_plan() reports it. */
export interface PlanInfo {
  plan: Plan;
  status: 'active' | 'cancelled' | 'billing_issue' | 'expired' | null;
  expiresAt: string | null;
  periodType: 'TRIAL' | 'INTRO' | 'NORMAL' | null;
  isPayer: boolean;
}

export const FREE_PLAN: PlanInfo = { plan: 'free', status: null, expiresAt: null, periodType: null, isPayer: false };

export function canUseFeature(plan: Plan, feature: Feature): boolean {
  void feature; // every feature in the list is Premium today; keep the parameter so callers say what they need
  return plan === 'premium';
}

/** The oldest "YYYY-MM" month Free opens: two before today's. */
export function oldestFreeMonth(today: Date): string {
  return shiftMonth(monthOf(isoDate(today)), -(FREE_HISTORY_MONTHS - 1));
}

/** `month` is "YYYY-MM" or any date in it ("YYYY-MM-DD"). Months after today's are never locked by the plan. */
export function canOpenMonth(plan: Plan, month: string, today: Date): boolean {
  return plan === 'premium' || monthOf(month) >= oldestFreeMonth(today);
}

/** A row from my_plan(), into the app's shape. Anything unexpected reads as Free. */
export function planFromRpc(raw: unknown): PlanInfo {
  if (!raw || typeof raw !== 'object') return FREE_PLAN;
  const r = raw as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null => (allowed.includes(v as T) ? (v as T) : null);
  return {
    plan: r.plan === 'premium' ? 'premium' : 'free',
    status: pick(r.status, ['active', 'cancelled', 'billing_issue', 'expired'] as const),
    expiresAt: typeof r.expires_at === 'string' ? r.expires_at : null,
    periodType: pick(r.period_type, ['TRIAL', 'INTRO', 'NORMAL'] as const),
    isPayer: r.is_payer === true,
  };
}
