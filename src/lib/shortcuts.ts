// Inicio's shortcut row (docs/DESIGN.md › 05): where each shortcut goes. A Premium one opens the paywall on Free, so a
// tap always leads somewhere; what is Premium stays decided in plans.ts. Adding an expense has its own place above the
// row (Escanear and Dictar cards, and the + button), so the row holds no entry shortcuts.
import type { Benefit } from './paywall';
import { canUseFeature, type Plan } from './plans';

export type ShortcutId = 'budgets' | 'export' | 'history';

export type ShortcutRoute = { pathname: '/budgets' | '/export' | '/activity' };

export type ShortcutTarget = { kind: 'route'; route: ShortcutRoute } | { kind: 'paywall'; from: Benefit };

const SHORTCUTS: Record<ShortcutId, { route: ShortcutRoute; premium?: Benefit }> = {
  budgets: { route: { pathname: '/budgets' } },
  export: { route: { pathname: '/export' }, premium: 'export' },
  history: { route: { pathname: '/activity' } },
};

/** The row, in order. */
export function shortcutIds(): ShortcutId[] {
  return Object.keys(SHORTCUTS) as ShortcutId[];
}

/** True when the shortcut needs Premium and this plan doesn't have it: it shows the crown and opens the paywall. */
export function isLocked(id: ShortcutId, plan: Plan): boolean {
  const premium = SHORTCUTS[id].premium;
  return premium !== undefined && !canUseFeature(plan, premium);
}

export function shortcutTarget(id: ShortcutId, plan: Plan): ShortcutTarget {
  const { route, premium } = SHORTCUTS[id];
  return premium !== undefined && isLocked(id, plan) ? { kind: 'paywall', from: premium } : { kind: 'route', route };
}
