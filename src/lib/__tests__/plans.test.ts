import { describe, expect, it } from 'vitest';
import { periodRange, shiftPeriod } from '../activity';
import { canOpenMonth, canUseFeature, FREE_HISTORY_MONTHS, FREE_PLAN, oldestFreeMonth, planFromRpc, type Feature } from '../plans';

const oct19 = new Date(2026, 9, 19);
const jan5 = new Date(2027, 0, 5);

describe('canOpenMonth', () => {
  it('Free opens the current month and the 2 before it', () => {
    expect(FREE_HISTORY_MONTHS).toBe(3);
    expect(canOpenMonth('free', '2026-10', oct19)).toBe(true);
    expect(canOpenMonth('free', '2026-09', oct19)).toBe(true);
    expect(canOpenMonth('free', '2026-08', oct19)).toBe(true);
    expect(canOpenMonth('free', '2026-07', oct19)).toBe(false);
    expect(canOpenMonth('free', '2025-10', oct19)).toBe(false);
  });

  it('takes a date as well as a month', () => {
    expect(canOpenMonth('free', '2026-08-01', oct19)).toBe(true);
    expect(canOpenMonth('free', '2026-07-31', oct19)).toBe(false);
  });

  it('counts across the new year', () => {
    expect(oldestFreeMonth(jan5)).toBe('2026-11');
    expect(canOpenMonth('free', '2027-01', jan5)).toBe(true);
    expect(canOpenMonth('free', '2026-12', jan5)).toBe(true);
    expect(canOpenMonth('free', '2026-11', jan5)).toBe(true);
    expect(canOpenMonth('free', '2026-10', jan5)).toBe(false);
  });

  it('the first day of the month already counts as that month', () => {
    expect(oldestFreeMonth(new Date(2026, 9, 1))).toBe('2026-08');
    expect(oldestFreeMonth(new Date(2026, 9, 31, 23, 59))).toBe('2026-08');
  });

  it('a period counts by its last day: a week reaching into the open months opens', () => {
    // Mon 27 Jul – Sun 2 Aug 2026: mostly July, but its end is in August, which Free opens on 19 Oct.
    expect(canOpenMonth('free', periodRange('week', '2026-07-30').end, oct19)).toBe(true);
    expect(canOpenMonth('free', periodRange('week', '2026-07-23').end, oct19)).toBe(false);
    expect(canOpenMonth('free', periodRange('day', '2026-07-31').end, oct19)).toBe(false);
    expect(canOpenMonth('free', periodRange('month', '2026-08-15').end, oct19)).toBe(true);
  });

  it('stepping back from today: Free stops exactly one period past the limit', () => {
    let anchor = '2026-10-19';
    let steps = 0;
    while (canOpenMonth('free', periodRange('month', anchor).end, oct19)) {
      anchor = shiftPeriod('month', anchor, -1);
      steps++;
    }
    expect(steps).toBe(3); // Oct, Sep, Aug open; the step to July is the first locked one
    expect(anchor).toBe('2026-07-01');
  });

  it('Premium opens everything', () => {
    expect(canOpenMonth('premium', '2019-01', oct19)).toBe(true);
  });
});

describe('canUseFeature', () => {
  it.each<Feature>(['history', 'budgets', 'export', 'recurring', 'receiptPhoto'])('%s is Premium only', (f) => {
    expect(canUseFeature('free', f)).toBe(false);
    expect(canUseFeature('premium', f)).toBe(true);
  });
});

describe('planFromRpc', () => {
  it('reads my_plan()', () => {
    expect(planFromRpc({ plan: 'premium', status: 'cancelled', expires_at: '2026-11-19T10:00:00+00:00', period_type: 'TRIAL', is_payer: true })).toEqual({
      plan: 'premium',
      status: 'cancelled',
      expiresAt: '2026-11-19T10:00:00+00:00',
      periodType: 'TRIAL',
      isPayer: true,
    });
  });

  it('anything unexpected reads as Free', () => {
    expect(planFromRpc(null)).toEqual(FREE_PLAN);
    expect(planFromRpc('premium')).toEqual(FREE_PLAN);
    expect(planFromRpc({ plan: 'gold', status: 'weird', period_type: 'PROMO', is_payer: 'yes' })).toEqual(FREE_PLAN);
  });
});
