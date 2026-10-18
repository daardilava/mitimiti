// What Home (and later Activity) says about the balance and each expense. Pure, so Vitest covers the wording.
// The balance number itself comes from balance_view in SQL; splits.ts mirrors that math.
import { formatMoney, type Currency } from './money';
import { monthOf } from './dates';
import { expenseEffect, type ExpenseLike } from './splits';

/** "Ana te debe" · "Le debes a Ana" · "Están a mano". Positive net: the partner owes me. */
export function balanceHeadline(netMinor: number, partnerName: string): string {
  if (netMinor > 0) return `${partnerName} te debe`;
  if (netMinor < 0) return `Le debes a ${partnerName}`;
  return 'Están a mano';
}

/** "Considera 9 gastos compartidos y 1 pago registrados" — what the balance is made of. */
export function balanceBasis(sharedExpenses: number, payments: number): string {
  if (sharedExpenses === 0 && payments === 0) return 'Aún no hay gastos compartidos.';
  const e = `${sharedExpenses} ${sharedExpenses === 1 ? 'gasto compartido' : 'gastos compartidos'}`;
  if (payments === 0) return `Considera ${e}`;
  return `Considera ${e} y ${payments} ${payments === 1 ? 'pago registrado' : 'pagos registrados'}`;
}

export type Tone = 'positive' | 'negative' | 'neutral';

/** The line under an expense's amount: how it moves my balance. "Te deben $142.500" · "Debes $120.000" · "Personal". */
export function expenseEffectLabel(e: ExpenseLike, me: string, currency: Currency): { text: string; tone: Tone } {
  if (e.splitMode === 'personal') return { text: 'Personal', tone: 'neutral' };
  const effect = expenseEffect(e, me);
  if (effect > 0) return { text: `Te deben ${formatMoney(effect, currency)}`, tone: 'positive' };
  if (effect < 0) return { text: `Debes ${formatMoney(effect, currency)}`, tone: 'negative' };
  return { text: 'Sin efecto', tone: 'neutral' };
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
