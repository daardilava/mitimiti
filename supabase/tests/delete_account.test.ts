// Borrar cuenta: delete_account() erases the couple's space for both members and the caller's own rows, and nothing
// of any other couple (see 20261020000000_delete_account.sql).
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2deleteDiegoAAAAAAAAAAAA';
const ANA = 'user_2deleteAnaBBBBBBBBBBBBBB';
const EVE = 'user_2deleteEveCCCCCCCCCCCCCC';
const BOB = 'user_2deleteBobDDDDDDDDDDDDDD';

let db: PGlite;
let as: As;
let couple: string;
let other: string;

/** Rows of a table for a couple, read as the database owner (past RLS). */
const count = async (table: string, where: string, params: unknown[]) =>
  Number((await db.query<{ n: number }>(`select count(*)::int as n from ${table} where ${where}`, params)).rows[0].n);

const newCouple = async (owner: string, partner: string) => {
  const [h] = await as<{ id: string; join_code: string }>(owner, `select id, join_code from create_household('Owner', 'Partner', 'COP', 'half', 50::smallint)`);
  await as(partner, `select join_household($1, '')`, [h.join_code]);
  await as(owner, `select upsert_expense(null, $1, 100000, 'super', 'Mercado', '2026-10-13', 'half')`, [owner]);
  await as(partner, `select record_settlement(50000, 'transfer')`);
  await db.query(`insert into budgets (household_id, category, month, limit_minor) values ($1, 'super', '2026-10-01', 500000)`, [h.id]);
  await db.query(`insert into push_tokens (user_id, token, platform) values ($1, 'tok-' || $1, 'ios')`, [owner]);
  return h.id;
};

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  couple = await newCouple(DIEGO, ANA);
  other = await newCouple(EVE, BOB);
}, 60_000);

describe('delete_account', () => {
  it('needs a signed-in person', async () => {
    await expect(as(null, `select delete_account()`)).rejects.toThrow(/permission denied/);
  });

  it('erases the whole couple space, for both members, audit trail included', async () => {
    expect(await count('audit_log', 'household_id = $1', [couple])).toBeGreaterThan(0);

    await as(DIEGO, `select delete_account()`);

    expect(await count('households', 'id = $1', [couple])).toBe(0);
    for (const table of ['members', 'expenses', 'settlements', 'budgets', 'audit_log']) {
      expect(await count(table, 'household_id = $1', [couple]), table).toBe(0);
    }
    expect(await count('expense_shares', 'user_id = any($1)', [[DIEGO, ANA]])).toBe(0);
  });

  it('removes the caller’s own rows and keeps the partner’s account', async () => {
    expect(await count('profiles', 'id = $1', [DIEGO])).toBe(0);
    expect(await count('push_tokens', 'user_id = $1', [DIEGO])).toBe(0);
    expect(await count('profiles', 'id = $1', [ANA])).toBe(1);
  });

  it('leaves the partner without a couple, free to start a new one', async () => {
    expect(await as(ANA, `select * from households`)).toEqual([]);
    const [{ h }] = await as<{ h: string | null }>(ANA, `select my_household() as h`);
    expect(h).toBeNull();
    const [fresh] = await as<{ id: string }>(ANA, `select id from create_household('Ana', 'Carlos', 'COP', 'half', 50::smallint)`);
    expect(fresh.id).toBeTruthy();
  });

  it('touches nothing of another couple', async () => {
    expect(await count('households', 'id = $1', [other])).toBe(1);
    for (const table of ['members', 'expenses', 'settlements', 'budgets']) {
      expect(await count(table, 'household_id = $1', [other]), table).toBeGreaterThan(0);
    }
    expect(await count('push_tokens', 'user_id = $1', [EVE])).toBe(1);
  });

  it('can be called again (a retry after the login step failed) and does nothing', async () => {
    await as(DIEGO, `select delete_account()`);
    expect(await count('households', 'id = $1', [other])).toBe(1);
  });
});
