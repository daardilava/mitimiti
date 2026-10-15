import { describe, expect, it } from 'vitest';
import { expenseEffect, netBalance, splitShares, type ExpenseLike } from '../splits';

const DIEGO = 'diego';
const ANA = 'ana';

describe('splitShares', () => {
  it('splits half and half, payer absorbs the odd unit', () => {
    expect(splitShares({ paidBy: DIEGO, amountMinor: 285_000, splitMode: 'half' })).toEqual({ payer: 142_500, partner: 142_500 });
    expect(splitShares({ paidBy: DIEGO, amountMinor: 1_001, splitMode: 'half' })).toEqual({ payer: 501, partner: 500 });
  });

  it('splits by the payer percentage', () => {
    expect(splitShares({ paidBy: DIEGO, amountMinor: 2_400_000, splitMode: 'pct', splitPct: 60 })).toEqual({ payer: 1_440_000, partner: 960_000 });
  });

  it('gives everything to the partner for "other"', () => {
    expect(splitShares({ paidBy: ANA, amountMinor: 48_000, splitMode: 'other' })).toEqual({ payer: 0, partner: 48_000 });
  });

  it('keeps personal expenses with the payer', () => {
    expect(splitShares({ paidBy: DIEGO, amountMinor: 120_000, splitMode: 'personal' })).toEqual({ payer: 120_000, partner: 0 });
  });

  it('rejects pct without a valid percentage', () => {
    expect(() => splitShares({ paidBy: DIEGO, amountMinor: 100, splitMode: 'pct' })).toThrow();
  });

  it('shares always add up to the amount', () => {
    const modes: ExpenseLike[] = [];
    for (let amount = 1; amount < 400; amount += 7) {
      modes.push({ paidBy: DIEGO, amountMinor: amount, splitMode: 'half' });
      for (const pct of [1, 33, 50, 67, 99]) modes.push({ paidBy: DIEGO, amountMinor: amount, splitMode: 'pct', splitPct: pct });
    }
    for (const e of modes) {
      const s = splitShares(e);
      expect(s.payer + s.partner).toBe(e.amountMinor);
      expect(s.partner).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('netBalance', () => {
  // The prototype's sample month (COP): Ana owes Diego $337.950.
  const expenses: ExpenseLike[] = [
    { paidBy: DIEGO, amountMinor: 285_000, splitMode: 'half' },
    { paidBy: ANA, amountMinor: 240_000, splitMode: 'half' },
    { paidBy: DIEGO, amountMinor: 28_000, splitMode: 'half' },
    { paidBy: ANA, amountMinor: 360_000, splitMode: 'half' },
    { paidBy: ANA, amountMinor: 165_000, splitMode: 'half' },
    { paidBy: DIEGO, amountMinor: 120_000, splitMode: 'personal' },
    { paidBy: ANA, amountMinor: 196_000, splitMode: 'half' },
    { paidBy: ANA, amountMinor: 48_000, splitMode: 'other' },
    { paidBy: DIEGO, amountMinor: 99_900, splitMode: 'half' },
    { paidBy: DIEGO, amountMinor: 2_400_000, splitMode: 'pct', splitPct: 60 },
  ];
  const settlements = [{ fromUser: ANA, toUser: DIEGO, amountMinor: 300_000 }];

  it('matches the prototype balance', () => {
    expect(netBalance(expenses, settlements, DIEGO)).toBe(337_950);
  });

  it('is symmetric between the two people', () => {
    expect(netBalance(expenses, settlements, ANA)).toBe(-337_950);
  });

  it('reports the effect of one expense from each side', () => {
    expect(expenseEffect(expenses[0], DIEGO)).toBe(142_500);
    expect(expenseEffect(expenses[0], ANA)).toBe(-142_500);
  });
});
