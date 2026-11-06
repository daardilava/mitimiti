import { describe, expect, it } from 'vitest';
import { periodOf, trialDays } from '../offerings';

describe('trialDays', () => {
  it('a free intro period is a trial, in days', () => {
    expect(trialDays({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 7 })).toBe(7);
    expect(trialDays({ price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1 })).toBe(7);
    expect(trialDays({ price: 0, periodUnit: 'week', periodNumberOfUnits: 2 })).toBe(14);
    expect(trialDays({ price: 0, periodUnit: 'MONTH', periodNumberOfUnits: 1 })).toBe(30);
  });

  it('a paid intro price, none, or nonsense is not a trial', () => {
    expect(trialDays({ price: 0.99, periodUnit: 'MONTH', periodNumberOfUnits: 1 })).toBeNull();
    expect(trialDays(null)).toBeNull();
    expect(trialDays(undefined)).toBeNull();
    expect(trialDays({ price: 0, periodUnit: 'FORTNIGHT', periodNumberOfUnits: 1 })).toBeNull();
    expect(trialDays({ price: 0, periodUnit: 'DAY', periodNumberOfUnits: 0 })).toBeNull();
  });
});

describe('periodOf', () => {
  it('only the monthly and annual packages', () => {
    expect(periodOf('MONTHLY')).toBe('monthly');
    expect(periodOf('ANNUAL')).toBe('annual');
    expect(periodOf('LIFETIME')).toBeNull();
    expect(periodOf('CUSTOM')).toBeNull();
  });
});
