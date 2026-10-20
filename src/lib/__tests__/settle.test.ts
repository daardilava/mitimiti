import { describe, expect, it } from 'vitest';
import { halfOf, paidSentence, paymentProblem, settleDirection, settleErrorMessage, settleLead } from '../settle';

const diego = { id: 'diego', name: 'Diego' };
const ana = { id: 'ana', name: 'Ana' };

describe('settle up (UI design, screens 09 and 10)', () => {
  it('whoever owes pays the other', () => {
    expect(settleDirection(337_950, diego, ana)).toEqual({ from: ana, to: diego, owedMinor: 337_950 });
    expect(settleDirection(-120_000, diego, ana)).toEqual({ from: diego, to: ana, owedMinor: 120_000 });
    expect(settleDirection(0, diego, ana)).toBeNull();
  });

  it('reads like the design', () => {
    expect(settleLead(ana, diego, 337_950, 'COP')).toBe('Ana le paga a Diego. Pendiente: $337.950');
    expect(halfOf(337_950)).toBe(168_975);
    expect(paidSentence('Ana', 'Diego', 300_000, 'transfer', 'COP')).toBe('Ana le pagó $300.000 a Diego por transferencia.');
    expect(paidSentence('Diego', 'Ana', 5_050, 'cash', 'EUR')).toBe('Diego le pagó 50,50 € a Ana en efectivo.');
  });

  it('half of an odd amount rounds down, so two halves never overpay', () => {
    expect(halfOf(5)).toBe(2);
    expect(halfOf(5) * 2).toBeLessThanOrEqual(5);
  });

  it('never more than what is owed (plan: "never more than what is owed")', () => {
    expect(paymentProblem(0, 337_950)).toBe('empty');
    expect(paymentProblem(337_951, 337_950)).toBe('too_much');
    expect(paymentProblem(337_950, 337_950)).toBeNull();
    expect(paymentProblem(1, 337_950)).toBeNull();
  });

  it("explains record_settlement's refusals in Spanish", () => {
    expect(settleErrorMessage(new Error('amount_exceeds_balance'))).toMatch(/mayor que lo pendiente/);
    expect(settleErrorMessage({ message: 'nothing_owed' })).toMatch(/a mano/);
    expect(settleErrorMessage({ message: 'no_partner' })).toMatch(/aún no se ha unido/);
    expect(settleErrorMessage(new TypeError('Network request failed'))).toMatch(/conexión/);
  });
});
