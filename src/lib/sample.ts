// Sample month from the canvas prototype (COP). Used while DEV_BYPASS_AUTH is on,
// until each screen reads from the API.
import type { AvatarId } from './avatars';
import type { Currency } from './money';
import { FREE_PLAN, type PlanInfo } from './plans';
import type { ExpenseLike, SettlementLike } from './splits';
import type { CategoryId } from '@/ui/tokens';

export const ME = 'diego';
export const PARTNER = 'ana';
export const names: Record<string, string> = { [ME]: 'Diego', [PARTNER]: 'Ana' };
/** Mutable: Ajustes › Tu avatar edits it while DEV_BYPASS_AUTH is on. Ana starts with one, Diego with the initial. */
export const avatars: Record<string, AvatarId | null> = { [ME]: null, [PARTNER]: 'fox' };
export const sampleCurrency: Currency = 'COP';

export interface SampleExpense extends ExpenseLike {
  id: string;
  description: string;
  category: CategoryId;
  spentOn: string;
}

// Mutable: src/api/expenses.ts edits it in place while DEV_BYPASS_AUTH is on.
export const sampleExpenses: SampleExpense[] = [
  { id: 'e1', description: 'Mercado de la semana', category: 'super', amountMinor: 285_000, paidBy: ME, splitMode: 'half', spentOn: '2026-10-13' },
  { id: 'e2', description: 'Cena de aniversario', category: 'comida', amountMinor: 240_000, paidBy: PARTNER, splitMode: 'half', spentOn: '2026-10-12' },
  { id: 'e5', description: 'Taxi al concierto', category: 'transporte', amountMinor: 28_000, paidBy: ME, splitMode: 'half', spentOn: '2026-10-11' },
  { id: 'e6', description: 'Boletas del concierto', category: 'ocio', amountMinor: 360_000, paidBy: PARTNER, splitMode: 'half', spentOn: '2026-10-11' },
  { id: 'e4', description: 'Luz y gas', category: 'servicios', amountMinor: 165_000, paidBy: PARTNER, splitMode: 'half', spentOn: '2026-10-09' },
  { id: 'e9', description: 'Regalo para mamá', category: 'regalos', amountMinor: 120_000, paidBy: ME, splitMode: 'personal', spentOn: '2026-10-07' },
  { id: 'e10', description: 'Mercado', category: 'super', amountMinor: 196_000, paidBy: PARTNER, splitMode: 'half', spentOn: '2026-10-06' },
  { id: 'e8', description: 'Droguería', category: 'otros', amountMinor: 48_000, paidBy: PARTNER, splitMode: 'other', spentOn: '2026-10-05' },
  { id: 'e7', description: 'Internet', category: 'servicios', amountMinor: 99_900, paidBy: ME, splitMode: 'half', spentOn: '2026-10-05' },
  { id: 'e3', description: 'Arriendo de octubre', category: 'casa', amountMinor: 2_400_000, paidBy: ME, splitMode: 'pct', splitPct: 60, spentOn: '2026-10-01' },
];

// Mutable: src/api/balance.ts adds to it while DEV_BYPASS_AUTH is on.
export const sampleSettlements: (SettlementLike & { method?: 'transfer' | 'cash' | 'other'; paidOn?: string })[] = [
  { fromUser: PARTNER, toUser: ME, amountMinor: 300_000, method: 'transfer', paidOn: '2026-10-03' },
];

// Mutable: src/api/household.ts edits it in place while DEV_BYPASS_AUTH is on.
export const sampleHousehold = {
  id: 'dev',
  currency: sampleCurrency,
  defaultSplit: 'half' as 'half' | 'pct',
  defaultPct: 60,
  joinCode: 'AM482X' as string | null,
  joinCodeExpiresAt: '2026-10-22T12:00:00Z' as string | null,
  invitedName: names[PARTNER] as string | null,
  members: [{ userId: ME, displayName: names[ME], role: 'owner' as 'owner' | 'member' }],
};

// Monthly limits from the design (screen 12): they add up to $5.300.000. Mutable while DEV_BYPASS_AUTH is on.
export const sampleBudgets: { category: CategoryId; month: string; limitMinor: number }[] = [
  { category: 'super', month: '2026-10-01', limitMinor: 1_200_000 },
  { category: 'comida', month: '2026-10-01', limitMinor: 600_000 },
  { category: 'casa', month: '2026-10-01', limitMinor: 2_500_000 },
  { category: 'servicios', month: '2026-10-01', limitMinor: 300_000 },
  { category: 'ocio', month: '2026-10-01', limitMinor: 400_000 },
  { category: 'transporte', month: '2026-10-01', limitMinor: 200_000 },
  { category: 'otros', month: '2026-10-01', limitMinor: 100_000 },
];

/**
 * The couple's plan while DEV_BYPASS_AUTH is on, so every screen can be checked on Free and on Premium. Mutable:
 * the fake purchases (src/api/purchases.ts) turn it Premium; setSamplePlan() switches it by hand.
 */
export const samplePlan: PlanInfo = { ...FREE_PLAN };

export function setSamplePlan(plan: PlanInfo['plan']): void {
  Object.assign(
    samplePlan,
    plan === 'premium'
      ? { plan, status: 'active', expiresAt: new Date(Date.now() + 365 * 86_400_000).toISOString(), periodType: 'NORMAL', isPayer: true }
      : FREE_PLAN,
  );
}
