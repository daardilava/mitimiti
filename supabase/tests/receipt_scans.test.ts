// Escanear: claim_receipt_scan(), the per-couple daily allowance the read-receipt Edge Function takes from before each
// model call (20261102000000_receipt_scans.sql).
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2scanDiegoAAAAAAAAAAAAAA';
const ANA = 'user_2scanAnaBBBBBBBBBBBBBBBB';
const EVE = 'user_2scanEveCCCCCCCCCCCCCCCC';
const LONE = 'user_2scanLoneDDDDDDDDDDDDDDD';

let db: PGlite;
let as: As;
let couple: string;
let other: string;

const claim = async (user: string) => (await as<{ r: Record<string, unknown> }>(user, `select claim_receipt_scan() as r`))[0].r;

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select id, join_code from create_household('Diego', 'Ana', 'EUR', 'half', 50::smallint)`);
  await as(ANA, `select join_household($1, 'Ana')`, [h.join_code]);
  couple = h.id;
  const [o] = await as<{ id: string }>(EVE, `select id from create_household('Eve', 'Bob', 'COP', 'half', 50::smallint)`);
  other = o.id;
}, 60_000);

beforeEach(async () => {
  await db.query(`delete from receipt_scans`);
  await db.query(`delete from subscriptions`);
});

describe('claim_receipt_scan', () => {
  it('gives a member the couple currency, the Premium flag and what is left today', async () => {
    expect(await claim(DIEGO)).toEqual({ ok: true, remaining: 29, currency: 'EUR', premium: false });
    expect(await claim(ANA)).toEqual({ ok: true, remaining: 28, currency: 'EUR', premium: false });
  });

  it('says when the couple is Premium', async () => {
    await db.query(
      `insert into subscriptions (household_id, payer_user_id, product_id, store, period_type, status, expires_at, last_event_at)
       values ($1, null, 'premium_yearly', 'APP_STORE', 'NORMAL', 'active', now() + interval '30 days', now())`,
      [couple],
    );
    expect(await claim(DIEGO)).toMatchObject({ ok: true, premium: true });
  });

  it('is closed without a couple, and to anonymous callers', async () => {
    expect(await claim(LONE)).toEqual({ ok: false, reason: 'not_in_household' });
    await expect(as(null, `select claim_receipt_scan()`)).rejects.toThrow(/permission denied/);
  });

  it('stops at 30 scans per couple and day, counting both members', async () => {
    await db.query(`insert into receipt_scans (household_id, day, scans) values ($1, current_date, 29)`, [couple]);
    expect(await claim(ANA)).toMatchObject({ ok: true, remaining: 0 });
    expect(await claim(DIEGO)).toEqual({ ok: false, reason: 'limit' });
    const rows = await db.query<{ scans: number }>(`select scans from receipt_scans where household_id = $1`, [couple]);
    expect(rows.rows).toEqual([{ scans: 30 }]);
  });

  it("doesn't touch another couple's allowance", async () => {
    await db.query(`insert into receipt_scans (household_id, day, scans) values ($1, current_date, 30)`, [couple]);
    expect(await claim(EVE)).toMatchObject({ ok: true, remaining: 29, currency: 'COP' });
    const rows = await db.query<{ scans: number }>(`select scans from receipt_scans where household_id = $1`, [other]);
    expect(rows.rows).toEqual([{ scans: 1 }]);
  });

  it('starts again the next day', async () => {
    await db.query(`insert into receipt_scans (household_id, day, scans) values ($1, current_date - 1, 30)`, [couple]);
    expect(await claim(DIEGO)).toMatchObject({ ok: true, remaining: 29 });
  });

  it('is independent from the quick-entry AI allowance', async () => {
    await claim(DIEGO);
    const ai = await db.query(`select * from ai_usage where household_id = $1`, [couple]);
    expect(ai.rows).toEqual([]);
  });

  it('is not readable or writable by the app (RLS, no grants)', async () => {
    await claim(DIEGO);
    await expect(as(DIEGO, `select * from receipt_scans`)).rejects.toThrow(/permission denied/);
    await expect(as(DIEGO, `insert into receipt_scans (household_id, day, scans) values ($1, current_date + 1, 0)`, [couple])).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(DIEGO, `update receipt_scans set scans = 0`)).rejects.toThrow(/permission denied/);
  });

  it('goes with the couple when the account is deleted', async () => {
    await claim(EVE);
    await db.query(`delete from households where id = $1`, [other]);
    const rows = await db.query(`select * from receipt_scans where household_id = $1`, [other]);
    expect(rows.rows).toEqual([]);
  });
});
