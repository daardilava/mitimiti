// Split and balance rules. Mirrors write_shares() and balance_view in
// supabase/migrations/20261015000000_init.sql — change both together.

export type SplitMode = 'half' | 'pct' | 'other' | 'personal';

export interface ExpenseLike {
  paidBy: string;
  amountMinor: number;
  splitMode: SplitMode;
  /** Payer's percentage, only for 'pct'. */
  splitPct?: number | null;
}

export interface SettlementLike {
  fromUser: string;
  toUser: string;
  amountMinor: number;
}

/** Shares of one expense. The payer absorbs any odd unit left by rounding. */
export function splitShares(e: ExpenseLike): { payer: number; partner: number } {
  let partner: number;
  switch (e.splitMode) {
    case 'half':
      partner = Math.floor(e.amountMinor / 2);
      break;
    case 'pct': {
      if (e.splitPct == null || e.splitPct < 1 || e.splitPct > 99) throw new Error('splitPct must be 1–99 for pct');
      partner = Math.floor((e.amountMinor * (100 - e.splitPct)) / 100);
      break;
    }
    case 'other':
      partner = e.amountMinor;
      break;
    case 'personal':
      partner = 0;
      break;
  }
  return { payer: e.amountMinor - partner, partner };
}

/** How much one expense moves `me`'s balance. Positive: the partner owes me more. */
export function expenseEffect(e: ExpenseLike, me: string): number {
  const { partner } = splitShares(e);
  return e.paidBy === me ? partner : -partner;
}

/** Net balance for `me`. Positive: the partner owes me that amount; negative: I owe it. */
export function netBalance(expenses: ExpenseLike[], settlements: SettlementLike[], me: string): number {
  let net = 0;
  for (const e of expenses) net += expenseEffect(e, me);
  for (const s of settlements) {
    if (s.fromUser === me) net += s.amountMinor;
    else if (s.toUser === me) net -= s.amountMinor;
  }
  return net;
}
