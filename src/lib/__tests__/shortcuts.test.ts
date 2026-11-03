import { describe, expect, it } from 'vitest';
import { isLocked, readQuickStart, shortcutIds, shortcutTarget } from '../shortcuts';

describe('shortcutIds', () => {
  it('lists Presupuestos, Exportar and Historial in order (adding an expense lives in the cards above the row)', () => {
    expect(shortcutIds()).toEqual(['budgets', 'export', 'history']);
  });
});

describe('isLocked', () => {
  it('locks Exportar on Free only', () => {
    expect(isLocked('export', 'free')).toBe(true);
    expect(isLocked('export', 'premium')).toBe(false);
  });

  it('never locks Presupuestos or Movimientos', () => {
    for (const id of ['budgets', 'history'] as const) {
      expect(isLocked(id, 'free')).toBe(false);
    }
  });
});

describe('shortcutTarget', () => {
  it('sends Free to the paywall with the benefit it tapped', () => {
    expect(shortcutTarget('export', 'free')).toEqual({ kind: 'paywall', from: 'export' });
  });

  it('opens the screens themselves when the plan allows them', () => {
    expect(shortcutTarget('budgets', 'free')).toEqual({ kind: 'route', route: { pathname: '/budgets' } });
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
