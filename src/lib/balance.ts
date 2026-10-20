// What Home (and later Activity) says about the balance and each expense. Pure, so Vitest covers the wording.
// The balance number itself comes from balance_view in SQL; splits.ts mirrors that math.
import { es, type Messages } from '../i18n/es';
import { formatMoney, type Currency } from './money';
import { monthOf } from './dates';
import { expenseEffect, type ExpenseLike } from './splits';

/** "Ana te debe" · "Le debes a Ana" · "Están a mano". Positive net: the partner owes me. */
export function balanceHeadline(netMinor: number, partnerName: string, m: Messages = es): string {
  if (netMinor > 0) return m.balance.owesYou(partnerName);
  if (netMinor < 0) return m.balance.youOwe(partnerName);
  return m.balance.even;
}

/** "Considera 9 gastos compartidos y 1 pago registrados" — what the balance is made of. */
export function balanceBasis(sharedExpenses: number, payments: number, m: Messages = es): string {
  if (sharedExpenses === 0 && payments === 0) return m.balance.noShared;
  return m.balance.basis(sharedExpenses, payments);
}

export type Tone = 'positive' | 'negative' | 'neutral';

/** The line under an expense's amount: how it moves my balance. "Te deben $142.500" · "Debes $120.000" · "Personal". */
export function expenseEffectLabel(e: ExpenseLike, me: string, currency: Currency, m: Messages = es): { text: string; tone: Tone } {
  if (e.splitMode === 'personal') return { text: m.balance.personal, tone: 'neutral' };
  const effect = expenseEffect(e, me);
  if (effect > 0) return { text: m.balance.owedToYou(formatMoney(effect, currency)), tone: 'positive' };
  if (effect < 0) return { text: m.balance.youOweAmount(formatMoney(effect, currency)), tone: 'negative' };
  return { text: m.balance.noEffect, tone: 'neutral' };
}

export interface MonthSpend {
  totalMinor: number;
  byMeMinor: number;
  byPartnerMinor: number;
  sharedCount: number;
}

/** "Gastado juntos en octubre": shared (not personal) expenses of a month, by who paid. `month` is "YYYY-MM". */
export function monthSpend(expenses: (ExpenseLike & { spentOn: string })[], month: string, me: string): MonthSpend {
  const out: MonthSpend = { totalMinor: 0, byMeMinor: 0, byPartnerMinor: 0, sharedCount: 0 };
  for (const e of expenses) {
    if (e.splitMode === 'personal' || monthOf(e.spentOn) !== month) continue;
    out.totalMinor += e.amountMinor;
    out.sharedCount += 1;
    if (e.paidBy === me) out.byMeMinor += e.amountMinor;
    else out.byPartnerMinor += e.amountMinor;
  }
  return out;
}

/** Shared expenses ever logged, for balanceBasis. */
export function sharedCount(expenses: ExpenseLike[]): number {
  return expenses.filter((e) => e.splitMode !== 'personal').length;
}
