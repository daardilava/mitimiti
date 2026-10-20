// Presupuestos (screen 12): monthly limits per category against shared spending. Pure, so Vitest covers it.
// A limit set in a month stays for the months after it until it is changed (one budgets row per change).
import { categories, type CategoryId } from '../ui/tokens';
import { es, type Messages } from '../i18n/es';
import { formatMoney, type Currency } from './money';
import { monthOf } from './dates';
import type { ExpenseLike } from './splits';

export interface BudgetRow {
  category: CategoryId;
  /** First day of the month the limit starts in: YYYY-MM-01. */
  month: string;
  limitMinor: number;
}

/** − / + move a limit by this much: $50.000 in COP (as the design says), 10 € / US$10 otherwise. */
export const BUDGET_STEP: Record<Currency, number> = { COP: 50_000, EUR: 1_000, USD: 1_000 };

/** Warning from 80 % of the limit (plan: "warning at 80%"). */
export const WARNING_AT = 0.8;

/** The limit in force for each category in `month` ("YYYY-MM"): the latest row at or before it. 0 = none. */
export function effectiveLimits(rows: BudgetRow[], month: string): Map<CategoryId, number> {
  const latest = new Map<CategoryId, BudgetRow>();
  for (const r of rows) {
    if (monthOf(r.month) > month) continue;
    const seen = latest.get(r.category);
    if (!seen || r.month > seen.month) latest.set(r.category, r);
  }
  return new Map([...latest].map(([c, r]) => [c, r.limitMinor]));
}

export type BudgetTone = 'ok' | 'warning' | 'over' | 'none';

/** "Quedan $719.000" · "Ojo: quedan $100.000" · "Llegaron al límite" · "Se pasaron por $20.000" · "Sin límite". */
export function budgetStatus(spentMinor: number, limitMinor: number, currency: Currency, m: Messages = es): { tone: BudgetTone; text: string; ratio: number } {
  const fmt = (n: number) => formatMoney(n, currency);
  if (limitMinor <= 0) return { tone: 'none', text: m.budgets.none, ratio: 0 };
  const ratio = spentMinor / limitMinor;
  if (spentMinor > limitMinor) return { tone: 'over', text: m.budgets.over(fmt(spentMinor - limitMinor)), ratio };
  if (spentMinor === limitMinor) return { tone: 'warning', text: m.budgets.atLimit, ratio };
  if (ratio >= WARNING_AT) return { tone: 'warning', text: m.budgets.warning(fmt(limitMinor - spentMinor)), ratio };
  return { tone: 'ok', text: m.budgets.ok(fmt(limitMinor - spentMinor)), ratio };
}

export interface MonthBudget {
  totalLimitMinor: number;
  /** All shared spending of the month, like the design's "$3.821.900 de $5.300.000". */
  spentMinor: number;
  /** Rounded percentage of the total limit used; 0 without limits. */
  pct: number;
  status: ReturnType<typeof budgetStatus>;
  /** Every category in the app's order, with or without a limit. */
  categories: { category: CategoryId; limitMinor: number; spentMinor: number; status: ReturnType<typeof budgetStatus> }[];
}

export function monthBudget(expenses: (ExpenseLike & { category: CategoryId; spentOn: string })[], rows: BudgetRow[], month: string, currency: Currency, m: Messages = es): MonthBudget {
  const limits = effectiveLimits(rows, month);
  const spent = new Map<CategoryId, number>();
  for (const e of expenses) {
    if (e.splitMode === 'personal' || monthOf(e.spentOn) !== month) continue;
    spent.set(e.category, (spent.get(e.category) ?? 0) + e.amountMinor);
  }
  const rowsOut = (Object.keys(categories) as CategoryId[]).map((category) => {
    const limitMinor = limits.get(category) ?? 0;
    const spentMinor = spent.get(category) ?? 0;
    return { category, limitMinor, spentMinor, status: budgetStatus(spentMinor, limitMinor, currency, m) };
  });
  const totalLimitMinor = rowsOut.reduce((s, c) => s + c.limitMinor, 0);
  const spentMinor = [...spent.values()].reduce((s, n) => s + n, 0);
  return {
    totalLimitMinor,
    spentMinor,
    pct: totalLimitMinor > 0 ? Math.round((spentMinor / totalLimitMinor) * 100) : 0,
    status: budgetStatus(spentMinor, totalLimitMinor, currency, m),
    categories: rowsOut,
  };
}

/** The month card's line: "Les quedan $1.478.100 este mes" · "Ojo: les quedan $X este mes" · "Se pasaron por $X este mes". */
export function monthBudgetLine(spentMinor: number, limitMinor: number, currency: Currency, m: Messages = es): string {
  const fmt = (n: number) => formatMoney(n, currency);
  const { tone } = budgetStatus(spentMinor, limitMinor, currency, m);
  if (tone === 'none') return m.budgets.monthNone;
  if (tone === 'over') return m.budgets.monthOver(fmt(spentMinor - limitMinor));
  if (spentMinor === limitMinor) return m.budgets.monthAtLimit;
  return tone === 'warning' ? m.budgets.monthWarning(fmt(limitMinor - spentMinor)) : m.budgets.monthOk(fmt(limitMinor - spentMinor));
}

/** Days after today left in its month: 14 Oct → 17. */
export function daysLeftInMonth(today: Date): number {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return last - today.getDate();
}

/** "Quedan 17 días" · "Queda 1 día" · "Último día del mes" */
export function daysLeftLabel(days: number, m: Messages = es): string {
  if (days <= 0) return m.budgets.lastDay;
  return m.budgets.daysLeft(days);
}

/** The next limit after pressing − or +, never below zero. */
export function stepLimit(limitMinor: number, direction: 1 | -1, currency: Currency): number {
  return Math.max(0, limitMinor + direction * BUDGET_STEP[currency]);
}
