// Phase 6 — Billing: billing-sync. RevenueCat's customer record → the couple's state (stateFromSubscriber), and
// sync_subscription() on PGlite: buyers who had no couple, restores on a new account, and never touching the
// partner's Premium.
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { stateFromSubscriber, subscriberSchema, type Subscriber, type SyncState } from '../functions/_shared/billing';
import { createTestDb, type As } from './db';

const NOW = new Date('2026-10-23T12:00:00Z');
const later = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();

const subscriber = (premium: Record<string, unknown> | null, subscription: Record<string, unknown> = {}): Subscriber =>
  subscriberSchema.parse({
    request_date: NOW.toISOString(),
    subscriber: {
      original_app_user_id: 'user_x',
      entitlements: premium ? { premium: { product_identifier: 'premium_yearly', purchase_date: NOW.toISOString(), ...premium } } : {},
      subscriptions: {
        premium_yearly: { period_type: 'trial', store: 'app_store', unsubscribe_detected_at: null, billing_issues_detected_at: null, ...subscription },
      },
    },
  });

describe('stateFromSubscriber', () => {
  it('never had Premium: none', () => {
    expect(stateFromSubscriber(subscriber(null), NOW)).toEqual({ kind: 'none' });
  });

  it('an active trial, in the webhook’s spelling (APP_STORE, TRIAL)', () => {
    expect(stateFromSubscriber(subscriber({ expires_date: later(7) }), NOW)).toEqual({
      kind: 'state',
      status: 'active',
      expiresAt: later(7),
      productId: 'premium_yearly',
      store: 'APP_STORE',
      periodType: 'TRIAL',
    });
  });

  it('cancelled but still paid: cancelled until the date', () => {
    expect(stateFromSubscriber(subscriber({ expires_date: later(20) }, { unsubscribe_detected_at: NOW.toISOString(), period_type: 'normal' }), NOW)).toMatchObject({
      status: 'cancelled',
      periodType: 'NORMAL',
    });
  });

  it('a billing issue keeps Premium until the grace period ends', () => {
    const s = stateFromSubscriber(subscriber({ expires_date: later(-1), grace_period_expires_date: later(10) }, { billing_issues_detected_at: NOW.toISOString() }), NOW);
    expect(s).toMatchObject({ status: 'billing_issue', expiresAt: later(10) });
  });

  it('past the date: expired', () => {
    expect(stateFromSubscriber(subscriber({ expires_date: later(-1) }), NOW)).toMatchObject({ status: 'expired', expiresAt: later(-1) });
  });

  it('lifetime (no date): active, no expiry', () => {
    expect(stateFromSubscriber(subscriber({ expires_date: null }), NOW)).toMatchObject({ status: 'active', expiresAt: null });
  });

  it('Play Store and promotional time read as the webhook would', () => {
    expect(stateFromSubscriber(subscriber({ expires_date: later(30) }, { store: 'play_store', period_type: 'promotional' }), NOW)).toMatchObject({
      store: 'PLAY_STORE',
      periodType: 'NORMAL',
    });
  });

  it('the schema rejects a body without the subscriber’s entitlements', () => {
    expect(subscriberSchema.safeParse({ subscriber: {} }).success).toBe(false);
    expect(subscriberSchema.safeParse({ error: 'nope' }).success).toBe(false);
  });
});

// ── sync_subscription ──────────────────────────────────────────────────────────────────────────────────────────

const DIEGO = 'user_2syncDiegoAAAAAAAAAAAAAA';
const ANA = 'user_2syncAnaBBBBBBBBBBBBBBBB';
const LATE = 'user_2syncLateCCCCCCCCCCCCCCC';
let db: PGlite;
let as: As;
let couple: string;

async function sync(user: string, s: SyncState): Promise<string> {
  const st = s.kind === 'state' ? s : null;
  const { rows } = await db.query<{ r: string }>(`select sync_subscription($1, $2, $3, $4, $5, $6, $7) as r`, [
    user, s.kind, st?.status ?? null, st?.expiresAt ?? null, st?.productId ?? null, st?.store ?? null, st?.periodType ?? null,
  ]);
  return rows[0].r;
}
const active = (days: number): SyncState => ({ kind: 'state', status: 'active', expiresAt: new Date(Date.now() + days * 86_400_000).toISOString(), productId: 'premium_yearly', store: 'APP_STORE', periodType: 'NORMAL' });
const expired: SyncState = { kind: 'state', status: 'expired', expiresAt: new Date(Date.now() - 86_400_000).toISOString(), productId: 'premium_yearly', store: 'APP_STORE', periodType: 'NORMAL' };
const plan = async (user: string) => (await as<{ p: { plan: string; is_payer: boolean } }>(user, `select my_plan() as p`))[0].p;

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select id, join_code from create_household('Diego', 'Ana', 'COP', 'half', 50::smallint)`);
  await as(ANA, `select join_household($1, '')`, [h.join_code]);
  couple = h.id;
}, 60_000);

beforeEach(async () => {
  await db.query(`delete from subscriptions`);
});

describe('sync_subscription', () => {
  it('the function can learn who is calling: requesting_user_id() answers with the caller’s token', async () => {
    expect(await as<{ id: string }>(DIEGO, `select requesting_user_id() as id`)).toEqual([{ id: DIEGO }]);
    expect(await as<{ id: string | null }>(null, `select requesting_user_id() as id`)).toEqual([{ id: null }]);
  });

  it('a purchase made before having a couple shows up once they have one', async () => {
    expect(await sync(LATE, active(30))).toBe('no_couple');
    const [h] = await as<{ id: string }>(LATE, `select id from create_household('Late', 'Partner', 'COP', 'half', 50::smallint)`);
    expect(await sync(LATE, active(30))).toBe('synced');
    expect(await plan(LATE)).toMatchObject({ plan: 'premium', is_payer: true });
    await db.query(`delete from households where id = $1`, [h.id]);
  });

  it('the partner who doesn’t pay deletes their account: the row goes with the couple, and comes back in the payer’s next one', async () => {
    const payer = 'user_2syncPayerDDDDDDDDDDDDDD';
    const leaver = 'user_2syncLeaverEEEEEEEEEEEEE';
    const [h] = await as<{ id: string; join_code: string }>(payer, `select id, join_code from create_household('P', 'L', 'COP', 'half', 50::smallint)`);
    await as(leaver, `select join_household($1, '')`, [h.join_code]);
    expect(await sync(payer, active(30))).toBe('synced');
    await as(leaver, `select delete_account()`);
    expect((await db.query(`select * from subscriptions where household_id = $1`, [h.id])).rows).toHaveLength(0);
    expect(await sync(payer, active(30))).toBe('no_couple');
    const [h2] = await as<{ id: string }>(payer, `select id from create_household('P', 'Nueva', 'COP', 'half', 50::smallint)`);
    expect(await sync(payer, active(30))).toBe('synced');
    expect(await plan(payer)).toMatchObject({ plan: 'premium', is_payer: true });
    await db.query(`delete from households where id = $1`, [h2.id]);
  });

  it('a restore on a new account (no row to move) creates the couple’s row', async () => {
    expect(await sync(ANA, active(30))).toBe('synced');
    expect(await plan(DIEGO)).toMatchObject({ plan: 'premium', is_payer: false });
    expect(await plan(ANA)).toMatchObject({ plan: 'premium', is_payer: true });
  });

  it('a partner with no Premium of their own never ends the payer’s', async () => {
    await sync(DIEGO, active(30));
    expect(await sync(ANA, { kind: 'none' })).toBe('unchanged');
    expect(await sync(ANA, expired)).toBe('unchanged');
    expect(await plan(ANA)).toMatchObject({ plan: 'premium' });
  });

  it('both pay: the partner’s own subscription replaces the payer’s only when it lasts longer', async () => {
    await sync(DIEGO, active(30));
    expect(await sync(ANA, active(10))).toBe('unchanged');
    expect(await plan(DIEGO)).toMatchObject({ plan: 'premium', is_payer: true });
    expect(await sync(ANA, active(365))).toBe('synced');
    expect(await plan(ANA)).toMatchObject({ plan: 'premium', is_payer: true });
  });

  it('the payer’s own expiry ends it; an expiry never creates a row', async () => {
    expect(await sync(DIEGO, expired)).toBe('unchanged');
    expect((await db.query(`select * from subscriptions`)).rows).toHaveLength(0);
    await sync(DIEGO, active(30));
    expect(await sync(DIEGO, expired)).toBe('synced');
    expect(await plan(ANA)).toMatchObject({ plan: 'free' });
  });

  it('a later webhook event older than the sync is stale', async () => {
    await sync(DIEGO, active(30));
    const { rows } = await db.query<{ r: string }>(
      `select apply_billing_event('evt_old', 'EXPIRATION', $1, '{}', 'upsert', $1, 'expired', now() - interval '1 day', null, null, null, now() - interval '1 minute', null) as r`,
      [DIEGO],
    );
    expect(rows[0].r).toBe('stale');
    expect(await plan(ANA)).toMatchObject({ plan: 'premium' });
  });

  it('no client can call it', async () => {
    await expect(as(DIEGO, `select sync_subscription($1, 'state', 'active', null, null, null, null)`, [DIEGO])).rejects.toThrow(/permission denied/);
    expect((await db.query(`select * from subscriptions`)).rows).toHaveLength(0);
  });
});
