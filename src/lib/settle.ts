// Saldar cuentas (§4): who pays whom, how much is allowed, and how the confirmation reads. Pure, so Vitest covers it.
// record_settlement in SQL decides the same direction from balance_view and refuses more than what is owed.
import { es, type Messages } from '../i18n/es';
import { formatMoney, type Currency } from './money';

export type SettleMethod = 'transfer' | 'cash' | 'other';

export interface SettlePerson {
  id: string;
  name: string;
}

/** Who owes whom, from my net balance (positive: the partner owes me). Null when they are even. */
export function settleDirection<P extends SettlePerson>(netMinor: number, me: P, partner: P): { from: P; to: P; owedMinor: number } | null {
  if (netMinor === 0) return null;
  return netMinor > 0 ? { from: partner, to: me, owedMinor: netMinor } : { from: me, to: partner, owedMinor: -netMinor };
}

/** "La mitad": an odd unit stays with the full amount, so two halves never pay more than what is owed. */
export function halfOf(owedMinor: number): number {
  return Math.floor(owedMinor / 2);
}

export type PaymentProblem = 'empty' | 'too_much' | null;

export function paymentProblem(amountMinor: number, owedMinor: number): PaymentProblem {
  if (amountMinor <= 0) return 'empty';
  if (amountMinor > owedMinor) return 'too_much';
  return null;
}

/** "Ana le paga a Diego. Pendiente: $337.950" */
export function settleLead(from: SettlePerson, to: SettlePerson, owedMinor: number, currency: Currency, m: Messages = es): string {
  return m.settle.lead(from.name, to.name, formatMoney(owedMinor, currency));
}

/** "Ana le pagó $300.000 a Diego por transferencia." */
export function paidSentence(fromName: string, toName: string, amountMinor: number, method: SettleMethod, currency: Currency, m: Messages = es): string {
  return m.settle.paidSentence(fromName, formatMoney(amountMinor, currency), toName, m.settle.methodInSentence[method]);
}

/** Spanish message for what record_settlement can refuse. */
export function settleErrorMessage(error: unknown, m: Messages = es): string {
  const message = (error as { message?: string } | null)?.message ?? '';
  if (message.includes('amount_exceeds_balance')) return m.settle.errors.tooMuch;
  if (message.includes('nothing_owed')) return m.settle.errors.nothingOwed;
  if (message.includes('no_partner')) return m.settle.errors.noPartner;
  return m.settle.errors.generic;
}
