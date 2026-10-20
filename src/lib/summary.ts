// Resumen (§6, screen 11): a month of expenses by category, who paid, what each one's share was, and the personal
// total. Shares come from splitShares, the same rule as write_shares() in SQL. Pure, so Vitest covers it.
import type { CategoryId } from '../ui/tokens';
import { es, type Messages } from '../i18n/es';
import { monthOf } from './dates';
import { splitShares, type ExpenseLike } from './splits';

export interface SummaryExpense extends ExpenseLike {
  category: CategoryId;
  /** YYYY-MM-DD */
  spentOn: string;
}

export interface MonthSummary {
  sharedTotalMinor: number;
  sharedCount: number;
  /** Shared expenses by category, largest first; categories with nothing are left out. */
  byCategory: { category: CategoryId; totalMinor: number; pct: number }[];
  paid: { mineMinor: number; theirsMinor: number; minePct: number; theirsPct: number };
  /** What belonged to each one (expense_shares), whoever paid. */
  share: { mineMinor: number; theirsMinor: number; minePct: number; theirsPct: number };
  personal: { totalMinor: number; count: number; mineMinor: number; theirsMinor: number };
}

/** Whole-number percentages of `total`; a part that is not zero never shows as 0 %. */
export function percent(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.max(1, Math.round((part / total) * 100));
}

export function monthSummary(expenses: SummaryExpense[], month: string, me: string): MonthSummary {
  const out: MonthSummary = {
    sharedTotalMinor: 0,
    sharedCount: 0,
    byCategory: [],
    paid: { mineMinor: 0, theirsMinor: 0, minePct: 0, theirsPct: 0 },
    share: { mineMinor: 0, theirsMinor: 0, minePct: 0, theirsPct: 0 },
    personal: { totalMinor: 0, count: 0, mineMinor: 0, theirsMinor: 0 },
  };
  const categories = new Map<CategoryId, number>();

  for (const e of expenses) {
    if (monthOf(e.spentOn) !== month) continue;
    const mine = e.paidBy === me;
    if (e.splitMode === 'personal') {
      out.personal.totalMinor += e.amountMinor;
      out.personal.count += 1;
      if (mine) out.personal.mineMinor += e.amountMinor;
      else out.personal.theirsMinor += e.amountMinor;
      continue;
    }
    out.sharedTotalMinor += e.amountMinor;
    out.sharedCount += 1;
    categories.set(e.category, (categories.get(e.category) ?? 0) + e.amountMinor);
    if (mine) out.paid.mineMinor += e.amountMinor;
    else out.paid.theirsMinor += e.amountMinor;
    const { payer, partner } = splitShares(e);
    out.share.mineMinor += mine ? payer : partner;
    out.share.theirsMinor += mine ? partner : payer;
  }

  const total = out.sharedTotalMinor;
  out.byCategory = [...categories]
    .map(([category, totalMinor]) => ({ category, totalMinor, pct: percent(totalMinor, total) }))
    .sort((a, b) => b.totalMinor - a.totalMinor);
  out.paid.minePct = percent(out.paid.mineMinor, total);
  out.paid.theirsPct = total > 0 ? 100 - out.paid.minePct : 0;
  out.share.minePct = percent(out.share.mineMinor, total);
  out.share.theirsPct = total > 0 ? 100 - out.share.minePct : 0;
  return out;
}

/** "9 gastos compartidos" · "1 gasto compartido" */
export function sharedCountLabel(count: number, m: Messages = es): string {
  return m.summary.sharedCount(count);
}
