import { describe, expect, it } from 'vitest';
import { isLocked, readQuickStart, shortcutIds, shortcutTarget } from '../shortcuts';

describe('shortcutIds', () => {
  it('lists the six shortcuts in order when the phone can dictate', () => {
    expect(shortcutIds(true)).toEqual(['quick', 'scan', 'dictate', 'budgets', 'export', 'history']);
  });

  it('leaves Dictar out when speech recognition is unavailable', () => {
    expect(shortcutIds(false)).toEqual(['quick', 'scan', 'budgets', 'export', 'history']);
  });
});

describe('isLocked', () => {
  it('locks the Premium shortcuts on Free only', () => {
    for (const id of ['scan', 'budgets', 'export'] as const) {
      expect(isLocked(id, 'free')).toBe(true);
      expect(isLocked(id, 'premium')).toBe(false);
    }
  });

  it('never locks typing, dictation or Movimientos', () => {
    for (const id of ['quick', 'dictate', 'history'] as const) {
      expect(isLocked(id, 'free')).toBe(false);
    }
  });
});

describe('shortcutTarget', () => {
  it('opens quick entry, starting with the receipt or the microphone', () => {
    expect(shortcutTarget('quick', 'free')).toEqual({ kind: 'route', route: { pathname: '/expense/quick' } });
    expect(shortcutTarget('dictate', 'free')).toEqual({ kind: 'route', route: { pathname: '/expense/quick', params: { start: 'voice' } } });
    expect(shortcutTarget('scan', 'premium')).toEqual({ kind: 'route', route: { pathname: '/expense/quick', params: { start: 'receipt' } } });
  });

  it('sends Free to the paywall with the benefit it tapped', () => {
    expect(shortcutTarget('scan', 'free')).toEqual({ kind: 'paywall', from: 'aiEntry' });
    expect(shortcutTarget('budgets', 'free')).toEqual({ kind: 'paywall', from: 'budgets' });
    expect(shortcutTarget('export', 'free')).toEqual({ kind: 'paywall', from: 'export' });
  });

  it('opens the screens themselves on Premium', () => {
    expect(shortcutTarget('budgets', 'premium')).toEqual({ kind: 'route', route: { pathname: '/budgets' } });
    expect(shortcutTarget('export', 'premium')).toEqual({ kind: 'route', route: { pathname: '/export' } });
    expect(shortcutTarget('history', 'free')).toEqual({ kind: 'route', route: { pathname: '/activity' } });
  });
});

describe('readQuickStart', () => {
  it('accepts receipt and voice, and ignores anything else', () => {
    expect(readQuickStart('receipt')).toBe('receipt');
    expect(readQuickStart('voice')).toBe('voice');
    expect(readQuickStart('camera')).toBeUndefined();
    expect(readQuickStart(undefined)).toBeUndefined();
    expect(readQuickStart(['voice'])).toBeUndefined();
  });
});
