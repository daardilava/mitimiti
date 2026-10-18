import { describe, expect, it } from 'vitest';
import { balanceBasis, balanceHeadline, expenseEffectLabel, monthSpend, sharedCount } from '../balance';
import { monthName, monthOf, monthTitle } from '../dates';
import { ME, PARTNER, sampleExpenses, sampleSettlements } from '../sample';
import { netBalance } from '../splits';

describe('balance wording', () => {
  it('says who owes whom without blame', () => {
    expect(balanceHeadline(337_950, 'Ana')).toBe('Ana te debe');
    expect(balanceHeadline(-120_000, 'Ana')).toBe('Le debes a Ana');
    expect(balanceHeadline(0, 'Ana')).toBe('Están a mano');
  });

  it('counts what the balance considers, singular and plural', () => {
    expect(balanceBasis(9, 1)).toBe('Considera 9 gastos compartidos y 1 pago registrado');
    expect(balanceBasis(1, 2)).toBe('Considera 1 gasto compartido y 2 pagos registrados');
    expect(balanceBasis(3, 0)).toBe('Considera 3 gastos compartidos');
    expect(balanceBasis(0, 0)).toBe('Aún no hay gastos compartidos.');
  });

  it('labels each expense by how it moves my balance', () => {
    const market = { paidBy: ME, amountMinor: 285_000, splitMode: 'half' as const };
    expect(expenseEffectLabel(market, ME, 'COP')).toEqual({ text: 'Te deben $142.500', tone: 'positive' });
    expect(expenseEffectLabel({ ...market, paidBy: PARTNER, amountMinor: 240_000 }, ME, 'COP')).toEqual({ text: 'Debes $120.000', tone: 'negative' });
    expect(expenseEffectLabel({ ...market, splitMode: 'personal' }, ME, 'COP')).toEqual({ text: 'Personal', tone: 'neutral' });
    expect(expenseEffectLabel({ ...market, paidBy: PARTNER, splitMode: 'other', amountMinor: 48_000 }, ME, 'COP').text).toBe('Debes $48.000');
  });
});

describe('the sample month matches the UI design (screens 05 and 11)', () => {
  const october = monthSpend(sampleExpenses, '2026-10', ME);

  it('spent together in October, by who paid', () => {
    expect(october).toEqual({ totalMinor: 3_821_900, byMeMinor: 2_812_900, byPartnerMinor: 1_009_000, sharedCount: 9 });
  });

  it('balance: Ana te debe $337.950, considering 9 shared expenses and 1 payment', () => {
    expect(netBalance(sampleExpenses, sampleSettlements, ME)).toBe(337_950);
    expect(balanceBasis(sharedCount(sampleExpenses), sampleSettlements.length)).toBe('Considera 9 gastos compartidos y 1 pago registrado');
  });

  it('leaves other months out', () => {
    expect(monthSpend(sampleExpenses, '2026-09', ME).totalMinor).toBe(0);
  });
});

describe('month labels', () => {
  it('formats the header and sentences', () => {
    const d = new Date(2026, 9, 18);
    expect(monthTitle(d)).toBe('Octubre 2026');
    expect(monthName(d)).toBe('octubre');
    expect(monthOf('2026-10-13')).toBe('2026-10');
  });
});
