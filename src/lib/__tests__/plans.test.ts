import { describe, expect, it } from 'vitest';
import { canUseFeature, deletionNotice, FREE_PLAN, planFromRpc, planLine, type Feature, type PlanInfo } from '../plans';

describe('canUseFeature', () => {
  // Every month (Movimientos, Resumen) and Presupuestos are free, so they are not features here at all.
  it.each<Feature>(['export', 'aiEntry', 'recurring', 'receiptPhoto'])('%s is Premium only', (f) => {
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

const premium = (over: Partial<PlanInfo>): PlanInfo => ({ plan: 'premium', status: 'active', expiresAt: '2026-11-19T15:00:00.000Z', periodType: 'NORMAL', isPayer: true, ...over });

describe('planLine', () => {
  it('Free says nothing about dates', () => {
    expect(planLine(FREE_PLAN)).toEqual({ kind: 'free' });
  });

  it('active renews; a trial says when it turns paid', () => {
    expect(planLine(premium({}))).toEqual({ kind: 'renews', date: '2026-11-19' });
    expect(planLine(premium({ periodType: 'TRIAL' }))).toEqual({ kind: 'trialEnds', date: '2026-11-19' });
  });

  it('cancelled, or a billing issue: ends on that date', () => {
    expect(planLine(premium({ status: 'cancelled' }))).toEqual({ kind: 'ends', date: '2026-11-19' });
    expect(planLine(premium({ status: 'billing_issue', periodType: 'TRIAL' }))).toEqual({ kind: 'ends', date: '2026-11-19' });
  });

  it('no date: lifetime', () => {
    expect(planLine(premium({ expiresAt: null }))).toEqual({ kind: 'lifetime' });
  });
});

describe('deletionNotice', () => {
  it('the payer is told the store subscription goes on; the partner, that the payer keeps it', () => {
    expect(deletionNotice(premium({ isPayer: true }))).toBe('payer');
    expect(deletionNotice(premium({ isPayer: false }))).toBe('partner');
  });

  it('Free, or expired: nothing to say', () => {
    expect(deletionNotice(FREE_PLAN)).toBeNull();
    expect(deletionNotice({ ...FREE_PLAN, status: 'expired', isPayer: true })).toBeNull();
  });
});
