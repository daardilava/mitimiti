// Inicio's shortcut row (docs/DESIGN.md › 05): where each shortcut goes. A Premium one opens the paywall on Free, so a
// tap always leads somewhere; what is Premium stays decided in plans.ts. The receipt photo has no shortcut: it is the
// camera inside quick entry, next to the mic.
import type { Benefit } from './paywall';
import { canUseFeature, type Plan } from './plans';

export type ShortcutId = 'quick' | 'dictate' | 'budgets' | 'export' | 'history';

/** What quick entry starts with when a shortcut opens it (src/app/expense/quick.tsx). */
export type QuickStart = 'receipt' | 'voice';

export type ShortcutRoute =
  | { pathname: '/expense/quick'; params?: { start: QuickStart } }
  | { pathname: '/budgets' | '/export' | '/activity' };

export type ShortcutTarget = { kind: 'route'; route: ShortcutRoute } | { kind: 'paywall'; from: Benefit };

const SHORTCUTS: Record<ShortcutId, { route: ShortcutRoute; premium?: Benefit }> = {
  quick: { route: { pathname: '/expense/quick' } },
  dictate: { route: { pathname: '/expense/quick', params: { start: 'voice' } } },
  budgets: { route: { pathname: '/budgets' } },
  export: { route: { pathname: '/export' }, premium: 'export' },
  history: { route: { pathname: '/activity' } },
};

/** The row, in order. Dictar only where the phone can recognise speech. */
export function shortcutIds(canDictate: boolean): ShortcutId[] {
  return (Object.keys(SHORTCUTS) as ShortcutId[]).filter((id) => id !== 'dictate' || canDictate);
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

/** The `start` route param of quick entry; anything else is ignored. */
export function readQuickStart(raw: unknown): QuickStart | undefined {
  return raw === 'receipt' || raw === 'voice' ? raw : undefined;
}
