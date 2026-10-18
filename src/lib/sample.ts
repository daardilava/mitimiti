// Sample month from the canvas prototype (COP). Used while DEV_BYPASS_AUTH is on,
// until each screen reads from the API.
import type { Currency } from './money';
import type { ExpenseLike, SettlementLike } from './splits';
import type { CategoryId } from '@/ui/tokens';

export const ME = 'diego';
export const PARTNER = 'ana';
export const names: Record<string, string> = { [ME]: 'Diego', [PARTNER]: 'Ana' };
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

export const sampleSettlements: SettlementLike[] = [{ fromUser: PARTNER, toUser: ME, amountMinor: 300_000 }];

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
