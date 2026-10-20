import { describe, expect, it } from 'vitest';
import { monthSummary, percent, sharedCountLabel } from '../summary';
import { ME, sampleExpenses, sampleSettlements } from '../sample';
import { netBalance } from '../splits';

describe('Resumen for the sample month (UI design, screen 11)', () => {
  const s = monthSummary(sampleExpenses, '2026-10', ME);

  it('shared total and count', () => {
    expect(s.sharedTotalMinor).toBe(3_821_900);
    expect(sharedCountLabel(s.sharedCount)).toBe('9 gastos compartidos');
  });

  it('by category, largest first, with the design percentages', () => {
    expect(s.byCategory.map((c) => [c.category, c.pct, c.totalMinor])).toEqual([
      ['casa', 63, 2_400_000],
      ['super', 13, 481_000],
      ['ocio', 9, 360_000],
      ['servicios', 7, 264_900],
      ['comida', 6, 240_000],
      ['otros', 1, 48_000],
      ['transporte', 1, 28_000],
    ]);
  });

  it('who paid: Diego 74 % · Ana 26 %', () => {
    expect(s.paid).toEqual({ mineMinor: 2_812_900, theirsMinor: 1_009_000, minePct: 74, theirsPct: 26 });
  });

  it("each one's share, by the split of every expense (rent is 60/40, the pharmacy all Diego's)", () => {
    expect(s.share.mineMinor).toBe(2_174_950);
    expect(s.share.theirsMinor).toBe(1_646_950);
    expect(s.share.mineMinor + s.share.theirsMinor).toBe(s.sharedTotalMinor);
    // Paid − share is this month's effect on the balance; with the 300.000 payment it is Home's $337.950.
    expect(s.paid.mineMinor - s.share.mineMinor - sampleSettlements[0].amountMinor).toBe(netBalance(sampleExpenses, sampleSettlements, ME));
  });

  it('personal expenses stay apart', () => {
    expect(s.personal).toEqual({ totalMinor: 120_000, count: 1, mineMinor: 120_000, theirsMinor: 0 });
  });

  it('an empty month is all zeros', () => {
    const empty = monthSummary(sampleExpenses, '2026-09', ME);
    expect(empty.sharedTotalMinor).toBe(0);
    expect(empty.byCategory).toEqual([]);
    expect(empty.paid).toEqual({ mineMinor: 0, theirsMinor: 0, minePct: 0, theirsPct: 0 });
  });

  it('a small part never rounds down to 0 %', () => {
    expect(percent(1, 1_000)).toBe(1);
    expect(percent(0, 1_000)).toBe(0);
    expect(percent(5, 0)).toBe(0);
  });
});
