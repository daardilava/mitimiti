// Movimientos (§6): a day, week, month or picked range of expenses and payments, filtered, searched and grouped by day,
// plus the per-day spending its chart draws. Pure, so Vitest covers it.
import type { CategoryId } from '../ui/tokens';
import { es, type Messages } from '../i18n/es';
import { addDays, dateLabels, daysBetween, isoDate, monthOf, shiftMonth, weekStart, type DateLabels } from './dates';
import type { ExpenseLike, SettlementLike } from './splits';

export interface ActivityExpense extends ExpenseLike {
  id: string;
  description: string;
  category: CategoryId;
  /** YYYY-MM-DD */
  spentOn: string;
}

export interface ActivityPayment extends SettlementLike {
  id: string;
  method: 'transfer' | 'cash' | 'other';
  /** YYYY-MM-DD */
  paidOn: string;
}

export type ActivityItem<E extends ActivityExpense = ActivityExpense, P extends ActivityPayment = ActivityPayment> =
  | { kind: 'expense'; date: string; expense: E }
  | { kind: 'payment'; date: string; payment: P };

/** Todo · Pagó (me) · Pagó (partner) · Pagos entre ustedes */
export type ActivityFilter = 'all' | 'mine' | 'theirs' | 'payments';

/** Spanish method names; screens use m.activity.methods. */
export const METHOD_LABEL: Record<ActivityPayment['method'], string> = es.activity.methods;

export type Period = 'day' | 'week' | 'month';

/** First and last day (YYYY-MM-DD, inclusive) of the day, week (Mon–Sun) or month that holds `anchor`. */
export function periodRange(period: Period, anchor: string): { start: string; end: string } {
  if (period === 'day') return { start: anchor, end: anchor };
  if (period === 'week') {
    const start = weekStart(anchor);
    return { start, end: addDays(start, 6) };
  }
  const start = `${monthOf(anchor)}-01`;
  return { start, end: addDays(`${shiftMonth(monthOf(anchor), 1)}-01`, -1) };
}

/** The anchor one period before (-1) or after (+1). */
export function shiftPeriod(period: Period, anchor: string, delta: number): string {
  if (period === 'day') return addDays(anchor, delta);
  if (period === 'week') return addDays(weekStart(anchor), 7 * delta);
  return `${shiftMonth(monthOf(anchor), delta)}-01`;
}

/** "Hoy, 18 oct" · "13 – 19 oct" · "Octubre 2026" */
export function periodLabel(period: Period, anchor: string, today = new Date(), d: DateLabels = dateLabels(es.dates)): string {
  if (period === 'day') return d.longDate(anchor, today);
  if (period === 'week') return d.weekLabel(weekStart(anchor));
  return d.monthLabel(monthOf(anchor));
}

/** A from–to range picked in the calendar (Rango): YYYY-MM-DD, both days included. */
export interface DateRange {
  start: string;
  end: string;
}

/** A range being picked: the first tap sets `start`, the second `end`. */
export interface RangeDraft {
  start: string | null;
  end: string | null;
}

/**
 * One tap in the Rango calendar. The first picks the start; the second the end (an earlier day becomes the start, so
 * the order of the taps doesn't matter); a tap after both are set starts a new range.
 */
export function pickRangeDay(draft: RangeDraft, day: string): RangeDraft {
  if (!draft.start || draft.end) return { start: day, end: null };
  return day < draft.start ? { start: day, end: draft.start } : { start: draft.start, end: day };
}

/** The draft as a range to show; a lone start is that one day. Null until a day is picked. */
export function draftRange(draft: RangeDraft): DateRange | null {
  return draft.start ? { start: draft.start, end: draft.end ?? draft.start } : null;
}

/** How many days the range covers, both ends included. */
export function rangeLength(range: DateRange): number {
  return daysBetween(range.start, range.end) + 1;
}

/**
 * The range of the same length right before (-1) or after (+1): the arrows of Rango. Moving forward never passes
 * `today` (YYYY-MM-DD): the last step ends on it instead.
 */
export function shiftRange(range: DateRange, delta: number, today?: string): DateRange {
  const length = rangeLength(range);
  const end = addDays(range.end, length * delta);
  if (today && delta > 0 && end > today) return { start: addDays(today, -(length - 1)), end: today };
  return { start: addDays(range.start, length * delta), end };
}

/** Rango starts on the last 7 days, today included. */
export function lastDays(n: number, today = new Date()): DateRange {
  const end = isoDate(today);
  return { start: addDays(end, -(n - 1)), end };
}

/** Whether the period holding `anchor` already includes today, so there is nothing after it to show. */
export function isCurrentOrLater(period: Period, anchor: string, today = new Date()): boolean {
  return periodRange(period, anchor).end >= isoDate(today);
}

export interface ActivityView<E extends ActivityExpense, P extends ActivityPayment> {
  /** Everything in the period, before filters: "11 movimientos · $3.941.900 en gastos". */
  count: number;
  expensesTotalMinor: number;
  /** Newest day first; within a day, the order the lists came in (newest first). */
  days: { date: string; items: ActivityItem<E, P>[] }[];
}

/** Lowercase without accents, so "super" finds "Súper" and "cafe" finds "Café". */
export function fold(text: string): string {
  // NFD splits "ú" into "u" + a combining accent (U+0300–U+036F), which the regex then drops.
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** The expenses and payments between `start` and `end` (inclusive), filtered, searched and grouped by day. */
export function activityView<E extends ActivityExpense, P extends ActivityPayment>(
  expenses: E[],
  payments: P[],
  opts: { start: string; end: string; me: string; filter?: ActivityFilter; query?: string; names?: Record<string, string>; m?: Messages },
): ActivityView<E, P> {
  const { start, end, me, filter = 'all', names = {}, m = es } = opts;
  const query = fold(opts.query ?? '');
  const inRange = (date: string) => date >= start && date <= end;
  const periodExpenses = expenses.filter((e) => inRange(e.spentOn));
  const periodPayments = payments.filter((p) => inRange(p.paidOn));

  const showExpense = (e: E) => {
    if (filter === 'payments') return false;
    if (filter === 'mine' && e.paidBy !== me) return false;
    if (filter === 'theirs' && e.paidBy === me) return false;
    return !query || fold(e.description).includes(query) || fold(m.categories[e.category]).includes(query);
  };
  // "Pagó Diego" / "Pagó Ana" are about who paid an expense; payments between them only show under Todo and Pagos.
  const showPayment = (p: P) => {
    if (filter === 'mine' || filter === 'theirs') return false;
    return !query || fold(`${paymentTitle(p, names, m)} ${m.activity.methods[p.method]} ${m.activity.paymentKeyword}`).includes(query);
  };

  const items: ActivityItem<E, P>[] = [
    ...periodExpenses.filter(showExpense).map((expense) => ({ kind: 'expense' as const, date: expense.spentOn, expense })),
    ...periodPayments.filter(showPayment).map((payment) => ({ kind: 'payment' as const, date: payment.paidOn, payment })),
  ];
  // Stable sort keeps each list's own newest-first order within a day.
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const days: ActivityView<E, P>['days'] = [];
  for (const item of items) {
    const last = days[days.length - 1];
    if (last?.date === item.date) last.items.push(item);
    else days.push({ date: item.date, items: [item] });
  }

  return {
    count: periodExpenses.length + periodPayments.length,
    expensesTotalMinor: periodExpenses.reduce((sum, e) => sum + e.amountMinor, 0),
    days,
  };
}

/** "Ana le pagó a Diego" */
export function paymentTitle(p: SettlementLike, names: Record<string, string>, m: Messages = es): string {
  return m.activity.paid(names[p.fromUser] ?? m.people.yourPartner, names[p.toUser] ?? m.people.yourPartnerInSentence);
}

/** "11 movimientos" · "1 movimiento" */
export function countLabel(count: number, m: Messages = es): string {
  return m.activity.count(count);
}

export interface DaySpend {
  date: string;
  mineMinor: number;
  theirsMinor: number;
}

/** Shared (not personal) spending of each day from `start` to `end`, by who paid. Days without spending are zeros. */
export function dailySpend(expenses: ActivityExpense[], start: string, end: string, me: string): DaySpend[] {
  const days: DaySpend[] = [];
  const index = new Map<string, DaySpend>();
  for (let date = start; date <= end; date = addDays(date, 1)) {
    const day = { date, mineMinor: 0, theirsMinor: 0 };
    days.push(day);
    index.set(date, day);
  }
  for (const e of expenses) {
    const day = e.splitMode === 'personal' ? undefined : index.get(e.spentOn);
    if (!day) continue;
    if (e.paidBy === me) day.mineMinor += e.amountMinor;
    else day.theirsMinor += e.amountMinor;
  }
  return days;
}

/** Up to ~4 round axis ticks from 0 that cover `max`: 0 · 100.000 · 200.000 · 300.000. */
export function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const rough = max / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const ticks = [0];
  while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}
