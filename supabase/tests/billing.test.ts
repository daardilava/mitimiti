// Phase 6 — Billing: the couple's subscription row, who can read or write it, when a couple is Premium, my_plan(),
// and Borrar cuenta (see 20261023143931_household_subscription.sql). The webhook writes with the service role; here
// that is the database owner (db.query), which RLS does not apply to.
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2billDiegoAAAAAAAAAAAAAA';
const ANA = 'user_2billAnaBBBBBBBBBBBBBBBB';
const EVE = 'user_2billEveCCCCCCCCCCCCCCCC';
const LONE = 'user_2billLoneDDDDDDDDDDDDDDD';

let db: PGlite;
let as: As;
let couple: string;

const newCouple = async (owner: string, partner: string) => {
  const [h] = await as<{ id: string; join_code: string }>(owner, `select id, join_code from create_household('Owner', 'Partner', 'COP', 'half', 50::smallint)`);
  await as(partner, `select join_household($1, '')`, [h.join_code]);
  return h.id;
};

/** What the webhook would write, as the service role. */
const setSubscription = (status: string, expiresAt: string | null, extra: { payer?: string; period?: string } = {}) =>
  db.query(
    `insert into subscriptions (household_id, payer_user_id, product_id, store, period_type, status, expires_at, last_event_at)
     values ($1, $2, 'premium_yearly', 'APP_STORE', $3, $4, $5, now())
     on conflict (household_id) do update set payer_user_id = excluded.payer_user_id, period_type = excluded.period_type,
       status = excluded.status, expires_at = excluded.expires_at`,
    [couple, extra.payer ?? DIEGO, extra.period ?? 'NORMAL', status, expiresAt],
  );

const isPremium = async (hid: string) =>
  (await db.query<{ p: boolean }>(`select household_is_premium($1) as p`, [hid])).rows[0].p;

const plan = async (user: string) => (await as<{ p: Record<string, unknown> }>(user, `select my_plan() as p`))[0].p;

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  couple = await newCouple(DIEGO, ANA);
  await as(EVE, `select create_household('Eve', 'Bob', 'EUR', 'half', 50::smallint)`);
}, 60_000);

beforeEach(async () => {
  await db.query(`delete from subscriptions`);
  await db.query(`delete from billing_events`);
});

describe('who reads the subscription', () => {
  it('both members of the couple read it; someone of another couple sees nothing', async () => {
    await setSubscription('active', inDays(30));
    expect(await as(DIEGO, `select status from subscriptions`)).toEqual([{ status: 'active' }]);
    expect(await as(ANA, `select status from subscriptions`)).toEqual([{ status: 'active' }]);
    expect(await as(EVE, `select status from subscriptions`)).toEqual([]);
    expect(await as(LONE, `select status from subscriptions`)).toEqual([]);
  });

  it('signed out reads nothing', async () => {
    await setSubscription('active', inDays(30));
    await expect(as(null, `select * from subscriptions`)).rejects.toThrow(/permission denied/);
  });
});

describe('nobody but the service role writes', () => {
  it('a member cannot insert, update or delete their own couple’s row', async () => {
    await expect(
      as(DIEGO, `insert into subscriptions (household_id, status) values ($1, 'active')`, [couple]),
    ).rejects.toThrow(/permission denied/);
    await setSubscription('expired', inDays(-1));
    await expect(as(DIEGO, `update subscriptions set status = 'active', expires_at = null`)).rejects.toThrow(/permission denied/);
    await expect(as(ANA, `delete from subscriptions`)).rejects.toThrow(/permission denied/);
    expect(await isPremium(couple)).toBe(false);
  });

  it('billing_events is closed to every client, for reading too', async () => {
    await db.query(`insert into billing_events (id, type, app_user_id, payload) values ('evt_1', 'INITIAL_PURCHASE', $1, '{}')`, [DIEGO]);
    for (const user of [DIEGO, ANA, null]) {
      await expect(as(user, `select * from billing_events`)).rejects.toThrow(/permission denied/);
      await expect(
        as(user, `insert into billing_events (id, type, payload) values ('evt_x', 'TEST', '{}')`),
      ).rejects.toThrow(/permission denied/);
    }
    await expect(as(DIEGO, `delete from billing_events`)).rejects.toThrow(/permission denied/);
  });

  it('household_is_premium() is not callable from the app', async () => {
    await expect(as(DIEGO, `select household_is_premium($1)`, [couple])).rejects.toThrow(/permission denied/);
  });
});

describe('household_is_premium', () => {
  it('no row: free', async () => {
    expect(await isPremium(couple)).toBe(false);
  });

  it.each([
    ['active', 30, true],
    ['cancelled', 30, true], // cancelled, still paid until the end of the period
    ['billing_issue', 3, true], // the store's grace period
    ['expired', 30, false],
    ['active', -1, false], // the date passed before the EXPIRATION event arrived
    ['cancelled', -1, false],
    ['billing_issue', -1, false],
  ] as const)('%s, expiring in %s days → %s', async (status, days, expected) => {
    await setSubscription(status, inDays(days));
    expect(await isPremium(couple)).toBe(expected);
  });

  it('lifetime (no expiry) is premium until expired', async () => {
    await setSubscription('active', null);
    expect(await isPremium(couple)).toBe(true);
    await setSubscription('expired', null);
    expect(await isPremium(couple)).toBe(false);
  });
});

describe('my_plan', () => {
  it('the payer: premium, with status, date, period and is_payer', async () => {
    const expires = inDays(7);
    await setSubscription('active', expires, { period: 'TRIAL' });
    const p = await plan(DIEGO);
    expect(p).toMatchObject({ plan: 'premium', status: 'active', period_type: 'TRIAL', is_payer: true });
    expect(new Date(p.expires_at as string).toISOString()).toBe(expires);
  });

  it('the partner: premium too, not the payer', async () => {
    await setSubscription('active', inDays(30));
    expect(await plan(ANA)).toMatchObject({ plan: 'premium', is_payer: false });
  });

  it('a couple without a subscription, and after expiry: free', async () => {
    expect(await plan(DIEGO)).toEqual({ plan: 'free', status: null, expires_at: null, period_type: null, is_payer: false });
    await setSubscription('expired', inDays(-2));
    expect(await plan(ANA)).toMatchObject({ plan: 'free', status: 'expired', is_payer: false });
  });

  it('someone of another couple only sees their own (free) plan', async () => {
    await setSubscription('active', inDays(30));
    expect(await plan(EVE)).toMatchObject({ plan: 'free', status: null, is_payer: false });
  });

  it('a person without a couple: free', async () => {
    expect(await plan(LONE)).toEqual({ plan: 'free', status: null, expires_at: null, period_type: null, is_payer: false });
  });

  it('signed out: an error, like the other RPCs', async () => {
    await expect(as(null, `select my_plan()`)).rejects.toThrow(/permission denied/);
  });
});

describe('delete_account', () => {
  it('removes the couple’s subscription and the caller’s billing events, and nobody else’s', async () => {
    await setSubscription('active', inDays(30));
    await db.query(
      `insert into billing_events (id, type, app_user_id, payload) values
         ('evt_d1', 'INITIAL_PURCHASE', $1, '{}'), ('evt_d2', 'RENEWAL', $1, '{}'), ('evt_e1', 'INITIAL_PURCHASE', $2, '{}')`,
      [DIEGO, EVE],
    );

    await as(DIEGO, `select delete_account()`);

    const left = (sql: string, params: unknown[] = []) => db.query<{ n: number }>(sql, params).then((r) => Number(r.rows[0].n));
    expect(await left(`select count(*)::int as n from subscriptions where household_id = $1`, [couple])).toBe(0);
    expect(await left(`select count(*)::int as n from billing_events where app_user_id = $1`, [DIEGO])).toBe(0);
    expect(await left(`select count(*)::int as n from billing_events where app_user_id = $1`, [EVE])).toBe(1);
    expect(await plan(ANA)).toMatchObject({ plan: 'free' });
  });
});
