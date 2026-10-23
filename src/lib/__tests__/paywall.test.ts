import { describe, expect, it } from 'vitest';
import type { PlanPackage } from '../offerings';
import { AVAILABLE, benefitOrder, BENEFITS, defaultPackage, savingsPercent, sortPlans, trialEnd } from '../paywall';

const monthly: PlanPackage = { id: '$rc_monthly', period: 'monthly', priceString: '2,99 €', price: 2.99, currencyCode: 'EUR', trialDays: null };
const annual: PlanPackage = { id: '$rc_annual', period: 'annual', priceString: '19,99 €', price: 19.99, currencyCode: 'EUR', trialDays: 7 };

describe('savingsPercent', () => {
  it('the decided prices: 19,99 € a year vs 12 × 2,99 € saves 44 %', () => {
    expect(savingsPercent([monthly, annual])).toBe(44);
  });

  it('rounds down, so the saving is never overstated', () => {
    expect(savingsPercent([{ ...monthly, price: 10 }, { ...annual, price: 100.01 }])).toBe(16); // 16.66… → 16
  });

  it('nothing to compare, no saving, or another currency: null', () => {
    expect(savingsPercent([annual])).toBeNull();
    expect(savingsPercent([monthly])).toBeNull();
    expect(savingsPercent([monthly, { ...annual, price: 40 }])).toBeNull();
    expect(savingsPercent([monthly, { ...annual, currencyCode: 'COP' }])).toBeNull();
    expect(savingsPercent([{ ...monthly, price: 0 }, annual])).toBeNull();
  });
});

describe('defaultPackage and sortPlans', () => {
  it('yearly is selected and listed first', () => {
    expect(defaultPackage([monthly, annual])).toBe(annual);
    expect(sortPlans([monthly, annual]).map((p) => p.period)).toEqual(['annual', 'monthly']);
  });

  it('only one plan, or none', () => {
    expect(defaultPackage([monthly])).toBe(monthly);
    expect(defaultPackage([])).toBeNull();
  });
});

describe('benefitOrder', () => {
  it('what opened the paywall comes first', () => {
    expect(benefitOrder('export')).toEqual(['export', 'history', 'budgets', 'recurring']);
    expect(benefitOrder('budgets')[0]).toBe('budgets');
    expect(benefitOrder('history')[0]).toBe('history');
  });

  it('nothing, or something unknown: the default order', () => {
    expect(benefitOrder(undefined)).toEqual([...BENEFITS]);
    expect(benefitOrder('hack')).toEqual([...BENEFITS]);
  });

  it('recurring expenses are not built yet', () => {
    expect(AVAILABLE.has('recurring')).toBe(false);
    expect([...AVAILABLE]).toEqual(['history', 'budgets', 'export']);
  });
});

describe('trialEnd', () => {
  it('7 days from today, across the month', () => {
    expect(trialEnd(7, new Date(2026, 9, 23))).toBe('2026-10-30');
    expect(trialEnd(7, new Date(2026, 9, 28))).toBe('2026-11-04');
  });
});
