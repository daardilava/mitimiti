// Gate "Balance is right" (docs/PLAN.md, Phase 3): the app's split math (src/lib/splits.ts, src/lib/summary.ts) and
// the database's (write_shares(), balance_view, monthly_summary) must agree to the unit, for every split mode.
// A seeded generator runs a few hundred expenses through the real RPCs — odd amounts, 1-unit amounts, huge amounts,
// every percentage 1–99, edits, deletes, payments, and a partner who joins late — and compares after each step.
import { beforeAll, describe, expect, it } from 'vitest';
import { netBalance, splitShares, type SplitMode } from '../../src/lib/splits';
import { monthSummary } from '../../src/lib/summary';
import type { CategoryId } from '../../src/ui/tokens';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2parityDiegoAAAAAAAAAAAAA';
const ANA = 'user_2parityAnaBBBBBBBBBBBBBBB';
const CATEGORIES: CategoryId[] = ['super', 'comida', 'casa', 'servicios', 'transporte', 'ocio', 'viajes', 'regalos', 'otros'];
const MODES: SplitMode[] = ['half', 'pct', 'other', 'personal'];

/** mulberry32: a tiny seeded PRNG, so a failure always reproduces with the same data. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = rng(20261018);
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T,>(items: T[]) => items[int(0, items.length - 1)];

/** Amounts that stress rounding: 1–5 units, odd, round pesos, cents, and up to a trillion. */
function amount(): number {
  switch (int(0, 4)) {
    case 0:
      return int(1, 5);
    case 1:
      return int(0, 999_999) * 2 + 1;
    case 2:
      return int(1, 3_000) * 1_000;
    case 3:
      return int(1, 99_999);
    default:
      return int(100_000_000_000, 1_000_000_000_000);
  }
}

interface ModelExpense {
  id: string;
  paidBy: string;
  amountMinor: number;
  category: CategoryId;
  spentOn: string;
  splitMode: SplitMode;
  splitPct: number | null;
}

function randomExpense(payers: string[]): Omit<ModelExpense, 'id'> {
  const splitMode = pick(MODES);
  return {
    paidBy: pick(payers),
    amountMinor: amount(),
    category: pick(CATEGORIES),
    spentOn: `2026-${pick(['08', '09', '10'])}-${String(int(1, 28)).padStart(2, '0')}`,
    splitMode,
    splitPct: splitMode === 'pct' ? int(1, 99) : null,
  };
}

let as: As;
/** The app's view of the couple: what src/lib computes from. */
const model = new Map<string, ModelExpense>();
const payments: { fromUser: string; toUser: string; amountMinor: number }[] = [];
let partnerJoined = false;

async function save(by: string, e: Omit<ModelExpense, 'id'> & { id?: string }): Promise<string> {
  const [row] = await as<{ id: string }>(by, `select (upsert_expense($1, $2, $3, $4, $5, $6, $7, $8)).id`, [
    e.id ?? null,
    e.paidBy,
    e.amountMinor,
    e.category,
    'parity',
    e.spentOn,
    e.splitMode,
    e.splitPct,
  ]);
  model.set(row.id, { ...e, id: row.id });
  return row.id;
}

/** expense_shares for one expense must equal splitShares (only the payer's row before the partner joins). */
async function expectSharesMatch(id: string) {
  const e = model.get(id)!;
  const rows = await as<{ user_id: string; share_minor: string }>(DIEGO, `select user_id, share_minor::text from expense_shares where expense_id = $1`, [id]);
  const db = Object.fromEntries(rows.map((r) => [r.user_id, Number(r.share_minor)]));
  const { payer, partner } = splitShares(e);
  const other = e.paidBy === DIEGO ? ANA : DIEGO;
  const expected = partnerJoined ? { [e.paidBy]: payer, [other]: partner } : { [e.paidBy]: payer };
  expect(db, `${e.splitMode} ${e.splitPct ?? ''} of ${e.amountMinor} paid by ${e.paidBy === DIEGO ? 'Diego' : 'Ana'}`).toEqual(expected);
}

/** balance_view must equal netBalance for both people, and the two must cancel out. */
async function expectBalanceMatches() {
  const rows = await as<{ user_id: string; net_minor: string }>(DIEGO, `select user_id, net_minor::text from balance_view`);
  const db = Object.fromEntries(rows.map((r) => [r.user_id, Number(r.net_minor)]));
  const expenses = [...model.values()];
  expect(db[DIEGO]).toBe(netBalance(expenses, payments, DIEGO));
  if (partnerJoined) {
    expect(db[ANA]).toBe(netBalance(expenses, payments, ANA));
    expect(db[DIEGO] + db[ANA]).toBe(0);
  }
}

beforeAll(async () => {
  ({ as } = await createTestDb());
}, 60_000);

describe('app and database agree on every split (gate: Balance is right)', () => {
  let joinCode: string;

  it('before the partner joins: only the payer has a share, and the balance already counts what the partner owes', async () => {
    const [h] = await as<{ join_code: string }>(DIEGO, `select join_code from create_household('Diego', 'Ana', 'COP', 'half', 50::smallint)`);
    joinCode = h.join_code;
    for (let i = 0; i < 30; i++) await expectSharesMatch(await save(DIEGO, randomExpense([DIEGO])));
    await expectBalanceMatches();
  });

  it("joining backfills the partner's share of every earlier expense", async () => {
    const [{ r }] = await as<{ r: { ok: boolean } }>(ANA, `select join_household($1, '') as r`, [joinCode]);
    expect(r.ok).toBe(true);
    partnerJoined = true;
    for (const id of model.keys()) await expectSharesMatch(id);
    await expectBalanceMatches();
  });

  it('250 new expenses in every mode, logged by either of them', async () => {
    for (let i = 0; i < 250; i++) {
      const id = await save(pick([DIEGO, ANA]), randomExpense([DIEGO, ANA]));
      await expectSharesMatch(id);
    }
    await expectBalanceMatches();
  });

  it('every percentage from 1 to 99, on an odd amount, both payers', async () => {
    for (let pct = 1; pct <= 99; pct++) {
      for (const paidBy of [DIEGO, ANA]) {
        const id = await save(paidBy, { paidBy, amountMinor: 1_000_003, category: 'casa', spentOn: '2026-10-15', splitMode: 'pct', splitPct: pct });
        await expectSharesMatch(id);
      }
    }
    await expectBalanceMatches();
  });

  it('the odd unit always stays with the payer', async () => {
    const id = await save(ANA, { paidBy: ANA, amountMinor: 1_001, category: 'super', spentOn: '2026-10-16', splitMode: 'half', splitPct: null });
    const rows = await as<{ user_id: string; share_minor: string }>(ANA, `select user_id, share_minor::text from expense_shares where expense_id = $1`, [id]);
    expect(Object.fromEntries(rows.map((r) => [r.user_id, r.share_minor]))).toEqual({ [ANA]: '501', [DIEGO]: '500' });
  });

  it('editing any field (amount, payer, mode, percentage) recomputes the shares', async () => {
    const ids = [...model.keys()];
    for (let i = 0; i < 80; i++) {
      const id = pick(ids);
      const changed = { ...randomExpense([DIEGO, ANA]), id };
      await save(pick([DIEGO, ANA]), changed);
      await expectSharesMatch(id);
    }
    await expectBalanceMatches();
  });

  it('deleted expenses leave the balance', async () => {
    const ids = [...model.keys()];
    for (let i = 0; i < 30; i++) {
      const id = ids.splice(int(0, ids.length - 1), 1)[0];
      await as(pick([DIEGO, ANA]), `select delete_expense($1)`, [id]);
      model.delete(id);
    }
    await expectBalanceMatches();
  });

  it('payments: partial and full, recorded by either; never more than what is owed', async () => {
    for (let i = 0; i < 20; i++) {
      const net = netBalance([...model.values()], payments, DIEGO);
      if (net === 0) break;
      const owed = Math.abs(net);
      const by = pick([DIEGO, ANA]);
      await expect(as(by, `select record_settlement($1, 'transfer')`, [owed + 1])).rejects.toThrow(/amount_exceeds_balance/);
      const paid = i === 19 ? owed : int(1, owed);
      await as(by, `select record_settlement($1, 'cash')`, [paid]);
      payments.push(net > 0 ? { fromUser: ANA, toUser: DIEGO, amountMinor: paid } : { fromUser: DIEGO, toUser: ANA, amountMinor: paid });
      await expectBalanceMatches();
    }
  });

  it('settling everything leaves both at zero', async () => {
    const net = netBalance([...model.values()], payments, DIEGO);
    if (net !== 0) {
      await as(DIEGO, `select record_settlement($1, 'transfer')`, [Math.abs(net)]);
      payments.push(net > 0 ? { fromUser: ANA, toUser: DIEGO, amountMinor: net } : { fromUser: DIEGO, toUser: ANA, amountMinor: -net });
    }
    await expectBalanceMatches();
    expect(netBalance([...model.values()], payments, DIEGO)).toBe(0);
  });

  it('Resumen (src/lib/summary.ts) matches the monthly_summary view for every month', async () => {
    const rows = await as<{ month: string; category: CategoryId; shared_minor: string; personal_minor: string; shared_count: string }>(
      DIEGO,
      `select to_char(month, 'YYYY-MM') as month, category, shared_minor::text, personal_minor::text, shared_count::text from monthly_summary`,
    );
    for (const month of ['2026-08', '2026-09', '2026-10']) {
      const app = monthSummary([...model.values()], month, DIEGO);
      const db = rows.filter((r) => r.month === month);
      const dbShared = Object.fromEntries(db.filter((r) => Number(r.shared_minor) > 0).map((r) => [r.category, Number(r.shared_minor)]));
      expect(Object.fromEntries(app.byCategory.map((c) => [c.category, c.totalMinor])), month).toEqual(dbShared);
      expect(app.sharedCount).toBe(db.reduce((s, r) => s + Number(r.shared_count), 0));
      expect(app.personal.totalMinor).toBe(db.reduce((s, r) => s + Number(r.personal_minor), 0));
      expect(app.share.mineMinor + app.share.theirsMinor).toBe(app.sharedTotalMinor);
    }
  });

  it('the database refuses a percentage outside 1–99, like the app', async () => {
    for (const pct of [0, 100]) {
      await expect(save(DIEGO, { paidBy: DIEGO, amountMinor: 1_000, category: 'otros', spentOn: '2026-10-17', splitMode: 'pct', splitPct: pct })).rejects.toThrow();
      expect(() => splitShares({ paidBy: DIEGO, amountMinor: 1_000, splitMode: 'pct', splitPct: pct })).toThrow();
    }
  });
});
