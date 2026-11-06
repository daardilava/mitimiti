// expenses.source through upsert_expense, and claim_ai_call(), the Premium-only daily AI allowance
// (20261029000000_quick_entry.sql). Its caller, the parse-expense Edge Function, was removed with Gasto rápido; the
// migration is applied, so the SQL stays and stays tested.
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2quickDiegoAAAAAAAAAAAAA';
const ANA = 'user_2quickAnaBBBBBBBBBBBBBBB';
const EVE = 'user_2quickEveCCCCCCCCCCCCCCC';
const LONE = 'user_2quickLoneDDDDDDDDDDDDDD';

let db: PGlite;
let as: As;
let couple: string;
let solo: string;

const premium = (hid: string) =>
  db.query(
    `insert into subscriptions (household_id, payer_user_id, product_id, store, period_type, status, expires_at, last_event_at)
     values ($1, null, 'premium_yearly', 'APP_STORE', 'NORMAL', 'active', now() + interval '30 days', now())
     on conflict (household_id) do nothing`,
    [hid],
  );

const claim = async (user: string) => (await as<{ r: Record<string, unknown> }>(user, `select claim_ai_call() as r`))[0].r;

const insert = (user: string, source?: string) =>
  as<{ id: string; source: string }>(
    user,
    source === undefined
      ? `select id, source from upsert_expense(null, $1, 45000, 'comida', 'Cena', '2026-10-29', 'half')`
      : `select id, source from upsert_expense(null, $1, 45000, 'comida', 'Cena', '2026-10-29', 'half', null, $2)`,
    source === undefined ? [user] : [user, source],
  );

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select id, join_code from create_household('Diego Andrés', 'Ana', 'COP', 'half', 50::smallint)`);
  await as(ANA, `select join_household($1, 'Ana María')`, [h.join_code]);
  couple = h.id;
  const [s] = await as<{ id: string }>(EVE, `select id from create_household('Eve', 'Bob Smith', 'EUR', 'half', 50::smallint)`);
  solo = s.id;
}, 60_000);

beforeEach(async () => {
  await db.query(`delete from ai_usage`);
  await db.query(`delete from subscriptions`);
});

describe('expenses.source', () => {
  it('is manual when the app does not say', async () => {
    expect((await insert(DIEGO))[0].source).toBe('manual');
  });

  it('records text, voice and receipt', async () => {
    for (const source of ['text', 'voice', 'receipt']) expect((await insert(DIEGO, source))[0].source).toBe(source);
  });

  it('rejects anything else', async () => {
    await expect(insert(DIEGO, 'widget')).rejects.toThrow(/source_check|check constraint/);
  });

  it('keeps the first source when the expense is edited', async () => {
    const [e] = await insert(ANA, 'voice');
    const [edited] = await as<{ source: string; amount_minor: number }>(
      DIEGO,
      `select source, amount_minor from upsert_expense($1, $2, 50000, 'comida', 'Cena', '2026-10-29', 'half', null, 'manual')`,
      [e.id, ANA],
    );
    expect(edited).toEqual({ source: 'voice', amount_minor: 50000 });
  });
});

describe('claim_ai_call', () => {
  it('is closed to a Free couple', async () => {
    expect(await claim(DIEGO)).toEqual({ ok: false, reason: 'not_premium' });
  });

  it('is closed without a couple, and to anonymous callers', async () => {
    expect(await claim(LONE)).toEqual({ ok: false, reason: 'not_in_household' });
    await expect(as(null, `select claim_ai_call()`)).rejects.toThrow(/permission denied/);
  });

  it('gives a Premium couple the currency and both first names, never more', async () => {
    await premium(couple);
    expect(await claim(DIEGO)).toEqual({ ok: true, remaining: 59, currency: 'COP', me: 'Diego', partner: 'Ana' });
    expect(await claim(ANA)).toEqual({ ok: true, remaining: 58, currency: 'COP', me: 'Ana', partner: 'Diego' });
  });

  it("uses the invited name before the partner joins", async () => {
    await premium(solo);
    expect(await claim(EVE)).toMatchObject({ ok: true, me: 'Eve', partner: 'Bob' });
  });

  it('counts per couple and day, and stops at the limit', async () => {
    await premium(couple);
    await db.query(`insert into ai_usage (household_id, day, calls) values ($1, current_date, 59)`, [couple]);
    expect(await claim(ANA)).toMatchObject({ ok: true, remaining: 0 });
    expect(await claim(DIEGO)).toEqual({ ok: false, reason: 'limit' });
    const rows = await db.query<{ calls: number }>(`select calls from ai_usage where household_id = $1`, [couple]);
    expect(rows.rows).toEqual([{ calls: 60 }]);
  });

  it("starts again the next day", async () => {
    await premium(couple);
    await db.query(`insert into ai_usage (household_id, day, calls) values ($1, current_date - 1, 60)`, [couple]);
    expect(await claim(DIEGO)).toMatchObject({ ok: true, remaining: 59 });
  });

  it('is not readable or writable by the app', async () => {
    await premium(couple);
    await claim(DIEGO);
    await expect(as(DIEGO, `select * from ai_usage`)).rejects.toThrow(/permission denied/);
    await expect(as(DIEGO, `insert into ai_usage (household_id, day, calls) values ($1, current_date, 0)`, [couple])).rejects.toThrow(
      /permission denied/,
    );
  });
});
