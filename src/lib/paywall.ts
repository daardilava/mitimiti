// The paywall's decisions, kept out of the screen so they can be tested (src/app/paywall.tsx).
// Store rules (checked 2026-10-23, docs/PLAN.md › Phase 6): the amount that will be billed is the most prominent price
// (Apple); an annual plan is never shown as a monthly price (Google); a trial says how long it lasts and what is
// charged after (both).
import { addDays, isoDate } from './dates';
import type { PlanPackage } from './offerings';
import type { Feature } from './plans';

/** The benefits the paywall lists, in its default order. `recurring` isn't built yet: it shows as Pronto. */
export const BENEFITS = ['history', 'budgets', 'export', 'recurring'] as const satisfies readonly Feature[];
export type Benefit = (typeof BENEFITS)[number];

/** Built today; the others are labelled Pronto. */
export const AVAILABLE: ReadonlySet<Benefit> = new Set(['history', 'budgets', 'export']);

/** What opened the paywall comes first (Presupuestos → budgets, Exportar → export, an older month → history). */
export function benefitOrder(from: string | undefined): Benefit[] {
  const first = BENEFITS.find((b) => b === from);
  return first ? [first, ...BENEFITS.filter((b) => b !== first)] : [...BENEFITS];
}

/** Yearly first, when the store offers it. */
export function defaultPackage(plans: readonly PlanPackage[]): PlanPackage | null {
  return plans.find((p) => p.period === 'annual') ?? plans[0] ?? null;
}

/** The plans in display order: yearly, then monthly. */
export function sortPlans(plans: readonly PlanPackage[]): PlanPackage[] {
  return [...plans].sort((a, b) => (a.period === b.period ? 0 : a.period === 'annual' ? -1 : 1));
}

/**
 * How much less a year costs on the yearly plan than 12 months of the monthly one, rounded down (never overstated).
 * Null when it isn't a saving or the two can't be compared (another currency).
 */
export function savingsPercent(plans: readonly PlanPackage[]): number | null {
  const monthly = plans.find((p) => p.period === 'monthly');
  const annual = plans.find((p) => p.period === 'annual');
  if (!monthly || !annual || monthly.currencyCode !== annual.currencyCode || monthly.price <= 0) return null;
  const pct = Math.floor((1 - annual.price / (monthly.price * 12)) * 100);
  return pct > 0 ? pct : null;
}

/** The day a free trial started today turns paid: the first charge, unless cancelled before. */
export function trialEnd(trialDays: number, today: Date): string {
  return addDays(isoDate(today), trialDays);
}
