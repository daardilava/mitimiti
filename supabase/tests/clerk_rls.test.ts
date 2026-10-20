// Row Level Security and the couple RPCs with Clerk users, on the real migrations (see ./db.ts).
// Each query runs as someone holding a Clerk session token (sub = 'user_…', role = 'authenticated').
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

let db: PGlite;
let as: As;

const DIEGO = 'user_2diegoAAAAAAAAAAAAAAAAAAA';
const ANA = 'user_2anaBBBBBBBBBBBBBBBBBBBBB';
const MALLORY = 'user_2malloryCCCCCCCCCCCCCCCC';

let householdId: string;
let joinCode: string;

beforeAll(async () => {
  ({ db, as } = await createTestDb());
}, 60_000);

describe('couple account with Clerk users', () => {
  it('rejects creating a couple without a signed-in user', async () => {
    await expect(as(null, `select create_household('Diego', 'Ana')`)).rejects.toThrow(/permission denied|not_authenticated/);
  });

  it('creates the couple for the Clerk user in the token', async () => {
    const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select * from create_household('Diego', 'Ana', 'COP', 'half', 50::smallint)`);
    householdId = h.id;
    joinCode = h.join_code;
    expect(joinCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const members = await as<{ user_id: string; role: string }>(DIEGO, `select user_id, role from members`);
    expect(members).toEqual([{ user_id: DIEGO, role: 'owner' }]);
  });

  it('lets the owner log an expense before the partner joins', async () => {
    await as(DIEGO, `select upsert_expense(null, $1, 100000, 'super', 'Mercado', '2026-10-13', 'half')`, [DIEGO]);
    const shares = await as(DIEGO, `select user_id, share_minor from expense_shares`);
    expect(shares).toEqual([{ user_id: DIEGO, share_minor: 50000 }]);
  });

  it('joins the partner with the code and backfills their share', async () => {
    const [{ r }] = await as<{ r: { ok: boolean; household_id: string } }>(ANA, `select join_household($1, '') as r`, [joinCode.toLowerCase()]);
    expect(r).toEqual({ ok: true, household_id: householdId });

    const balance = await as<{ user_id: string; net_minor: string }>(ANA, `select user_id, net_minor::text from balance_view order by net_minor desc`);
    expect(balance).toEqual([
      { user_id: DIEGO, net_minor: '50000' },
      { user_id: ANA, net_minor: '-50000' },
    ]);
  });

  it('shows nothing of the couple to a third Clerk user', async () => {
    for (const table of ['households', 'members', 'expenses', 'expense_shares', 'balance_view', 'audit_log']) {
      expect(await as(MALLORY, `select * from ${table}`), table).toEqual([]);
    }
    const [{ r }] = await as<{ r: { ok: boolean; error: string } }>(MALLORY, `select join_household($1, '') as r`, [joinCode]);
    expect(r).toEqual({ ok: false, error: 'invalid_code' }); // the code is cleared once the partner joins
  });

  it('does not let a third user write into the couple', async () => {
    await as(MALLORY, `select create_household('Mallory', 'X')`);
    await expect(as(MALLORY, `select upsert_expense(null, $1, 5000, 'otros', 'x', null, 'half')`, [DIEGO])).rejects.toThrow(/payer_not_member/);
    await expect(as(MALLORY, `insert into expenses (household_id, paid_by, amount_minor, category, split_mode, created_by) values ($1, $2, 1, 'otros', 'half', $2)`, [householdId, MALLORY])).rejects.toThrow(/row-level security/);
    expect(await as(DIEGO, `select count(*)::int as n from expenses`)).toEqual([{ n: 1 }]);
  });

  it('refuses a payment larger than what is owed', async () => {
    await expect(as(ANA, `select record_settlement(50001, 'transfer')`)).rejects.toThrow(/amount_exceeds_balance/);
  });

  it('records a settle-up from whoever owes and audits it with the Clerk id', async () => {
    await as(ANA, `select record_settlement(50000, 'transfer')`);
    const [t] = await as<{ from_user: string; to_user: string }>(DIEGO, `select from_user, to_user from settlements`);
    expect(t).toEqual({ from_user: ANA, to_user: DIEGO });
    const balance = await as<{ net_minor: string }>(DIEGO, `select net_minor::text from balance_view`);
    expect(balance.map((b) => b.net_minor)).toEqual(['0', '0']);
    const actors = await as<{ actor: string }>(DIEGO, `select distinct actor from audit_log order by actor`);
    expect(actors.map((a) => a.actor).sort()).toEqual([ANA, DIEGO].sort());
  });

  it('refuses a payment when they are even', async () => {
    await expect(as(DIEGO, `select record_settlement(1, 'cash')`)).rejects.toThrow(/nothing_owed/);
  });

  it('lets the person who is owed record the payment too, still from the one who owes', async () => {
    await as(DIEGO, `select upsert_expense(null, $1, 20000, 'comida', 'Almuerzo', '2026-10-14', 'half')`, [DIEGO]);
    const [t] = await as<{ from_user: string; to_user: string; amount_minor: string; method: string }>(
      DIEGO,
      `select from_user, to_user, amount_minor::text, method from record_settlement(4000, 'cash')`,
    );
    expect(t).toEqual({ from_user: ANA, to_user: DIEGO, amount_minor: '4000', method: 'cash' });
    const [mine] = await as<{ net_minor: string }>(DIEGO, `select net_minor::text from balance_view where user_id = $1`, [DIEGO]);
    expect(mine.net_minor).toBe('6000'); // 10.000 owed for the lunch, 4.000 paid
  });

  it('publishes expenses and settlements to Realtime, so the partner sees changes live', async () => {
    const rows = (await db.query<{ tablename: string }>(`select tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1`)).rows;
    expect(rows.map((r) => r.tablename)).toEqual(expect.arrayContaining(['expenses', 'settlements']));
  });

  it('rate-limits join attempts per Clerk user', async () => {
    const someone = 'user_2guessDDDDDDDDDDDDDDDDDDDD';
    for (let i = 0; i < 5; i++) await as(someone, `select join_household('ZZZZZZ', '')`);
    const [{ r }] = await as<{ r: { error: string } }>(someone, `select join_household('ZZZZZZ', '') as r`);
    expect(r.error).toBe('too_many_attempts');
  });
});
