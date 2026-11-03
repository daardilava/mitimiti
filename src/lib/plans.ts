// What each plan allows: the single place that says it (Phase 6 — Billing, docs/PLAN.md). Screens ask canUseFeature();
// no plan checks scattered elsewhere. Free never changes the balance: these rules only decide which screens open, never
// which expenses count. Every month (Movimientos, Resumen) and Presupuestos are free.
import { isoDate } from './dates';

export type Plan = 'free' | 'premium';

/**
 * Premium features. `aiEntry`: entering expenses with AI (the paywall's benefit for Escanear and Dictar); typing
 * stays free. `scan` / `dictate`: the Escanear and Dictar screens (whether that gate is on yet is
 * src/lib/premium.ts). `recurring` and `receiptPhoto` (a picture kept on an expense) don't exist yet; the paywall lists
 * them as Pronto.
 */
export type Feature = 'export' | 'aiEntry' | 'scan' | 'dictate' | 'recurring' | 'receiptPhoto';

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

/** What Ajustes › Tu plan says about the date: when it renews, ends, or the trial turns paid. */
export type PlanLine =
  | { kind: 'free' }
  | { kind: 'lifetime' }
  | { kind: 'renews' | 'ends' | 'trialEnds'; date: string };

export function planLine(info: PlanInfo): PlanLine {
  if (info.plan !== 'premium') return { kind: 'free' };
  if (!info.expiresAt) return { kind: 'lifetime' };
  const date = isoDate(new Date(info.expiresAt));
  // Cancelled, or the store couldn't charge: Premium lasts until this date (the end of the period, or the grace period).
  if (info.status === 'cancelled' || info.status === 'billing_issue') return { kind: 'ends', date };
  return { kind: info.periodType === 'TRIAL' ? 'trialEnds' : 'renews', date };
}

/**
 * Borrar cuenta, while the couple is Premium: the payer is told the store subscription is not cancelled with the
 * account (Apple: billing continues through the store; ask to cancel first); the partner, that the payer keeps it.
 */
export function deletionNotice(info: PlanInfo): 'payer' | 'partner' | null {
  if (info.plan !== 'premium') return null;
  return info.isPayer ? 'payer' : 'partner';
}
