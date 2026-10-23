// Phase 6 — Billing: the RevenueCat webhook. The pure part (supabase/functions/_shared/billing.ts) for every event
// type, and apply_billing_event() on PGlite: idempotency, order, buyers without a couple, transfers.
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { authorized, bodySchema, clerkIdOf, decide, isStale, periodTypeOf, type BillingEvent } from '../functions/_shared/billing';
import { createTestDb, type As } from './db';

const DIEGO = 'user_2hookDiegoAAAAAAAAAAAAAA';
const ANA = 'user_2hookAnaBBBBBBBBBBBBBBBB';
const EVE = 'user_2hookEveCCCCCCCCCCCCCCCC';
const NEWBIE = 'user_2hookNewDDDDDDDDDDDDDDD';
const T0 = Date.UTC(2026, 9, 23, 12);
const DAY = 86_400_000;

const event = (over: Partial<BillingEvent>): BillingEvent => ({
  id: `evt_${Math.random().toString(36).slice(2)}`,
  type: 'INITIAL_PURCHASE',
  event_timestamp_ms: T0,
  app_user_id: DIEGO,
  original_app_user_id: DIEGO,
  aliases: [DIEGO],
  entitlement_ids: ['premium'],
  product_id: 'premium_yearly',
  period_type: 'TRIAL',
  store: 'APP_STORE',
  environment: 'SANDBOX',
  expiration_at_ms: T0 + 7 * DAY,
  ...over,
});

describe('decide: what each event means', () => {
  it.each(['INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'REFUND_REVERSED', 'TEMPORARY_ENTITLEMENT_GRANT'])(
    '%s → active',
    (type) => {
      expect(decide(event({ type }))).toMatchObject({ kind: 'upsert', status: 'active', clerkId: DIEGO });
    },
  );

  it('CANCELLATION → cancelled, keeping the end of the paid period (or the refund time)', () => {
    expect(decide(event({ type: 'CANCELLATION', expiration_at_ms: T0 + 30 * DAY }))).toMatchObject({
      kind: 'upsert',
      status: 'cancelled',
      expiresAt: new Date(T0 + 30 * DAY).toISOString(),
    });
  });

  it('BILLING_ISSUE → billing_issue, Premium until the grace period ends', () => {
    expect(decide(event({ type: 'BILLING_ISSUE', expiration_at_ms: T0, grace_period_expiration_at_ms: T0 + 16 * DAY }))).toMatchObject({
      status: 'billing_issue',
      expiresAt: new Date(T0 + 16 * DAY).toISOString(),
    });
    expect(decide(event({ type: 'BILLING_ISSUE', expiration_at_ms: T0, grace_period_expiration_at_ms: null }))).toMatchObject({
      expiresAt: new Date(T0).toISOString(),
    });
  });

  it('EXPIRATION → expired', () => {
    expect(decide(event({ type: 'EXPIRATION' }))).toMatchObject({ kind: 'upsert', status: 'expired' });
  });

  it('TEST and known events that change nothing are only stored', () => {
    expect(decide(event({ type: 'TEST' }))).toEqual({ kind: 'store', reason: 'test' });
    for (const type of ['SUBSCRIPTION_PAUSED', 'PRICE_INCREASE_CONSENT_REQUIRED', 'INVOICE_ISSUANCE', 'SUBSCRIBER_ALIAS']) {
      expect(decide(event({ type }))).toEqual({ kind: 'store', reason: 'no_change' });
    }
  });

  it('an unknown type is stored, not an error (RevenueCat adds types)', () => {
    expect(decide(event({ type: 'SOMETHING_NEW' }))).toEqual({ kind: 'store', reason: 'unknown_type' });
  });

  it('another entitlement, or none, is ignored; the deprecated entitlement_id still counts', () => {
    expect(decide(event({ entitlement_ids: ['pro'] }))).toEqual({ kind: 'store', reason: 'other_entitlement' });
    expect(decide(event({ entitlement_ids: null }))).toEqual({ kind: 'store', reason: 'other_entitlement' });
    expect(decide(event({ entitlement_ids: null, entitlement_id: 'premium' }))).toMatchObject({ kind: 'upsert' });
  });

  it('anonymous RevenueCat ids never decide: no Clerk id, only stored', () => {
    const anon = '$RCAnonymousID:abc';
    expect(decide(event({ app_user_id: anon, original_app_user_id: anon, aliases: [anon] }))).toEqual({ kind: 'store', reason: 'no_clerk_id' });
  });

  it('lifetime: no expiry', () => {
    expect(decide(event({ type: 'NON_RENEWING_PURCHASE', expiration_at_ms: null }))).toMatchObject({ status: 'active', expiresAt: null });
  });

  it('TRANSFER moves the purchase to the destination Clerk id', () => {
    const t = event({ type: 'TRANSFER', app_user_id: null, original_app_user_id: null, aliases: null, entitlement_ids: null, transferred_from: [DIEGO, '$RCAnonymousID:x'], transferred_to: ['$RCAnonymousID:y', NEWBIE] });
    expect(decide(t)).toEqual({ kind: 'transfer', clerkId: NEWBIE, from: [DIEGO], eventAt: new Date(T0).toISOString() });
    expect(decide({ ...t, transferred_to: ['$RCAnonymousID:y'] })).toEqual({ kind: 'store', reason: 'no_clerk_id' });
  });
});

describe('helpers', () => {
  it('clerkIdOf takes the first user_… of app_user_id, original_app_user_id, aliases, transferred_to', () => {
    expect(clerkIdOf(event({ app_user_id: '$RCAnonymousID:a', original_app_user_id: '$RCAnonymousID:b', aliases: ['$RCAnonymousID:c', ANA] }))).toBe(ANA);
    expect(clerkIdOf(event({ app_user_id: null, original_app_user_id: null, aliases: null, transferred_to: [EVE] }))).toBe(EVE);
  });

  it('periodTypeOf: TRIAL and INTRO as sent, other paid time is NORMAL', () => {
    expect(periodTypeOf('TRIAL')).toBe('TRIAL');
    expect(periodTypeOf('INTRO')).toBe('INTRO');
    expect(periodTypeOf('NORMAL')).toBe('NORMAL');
    expect(periodTypeOf('PROMOTIONAL')).toBe('NORMAL');
    expect(periodTypeOf('PREPAID')).toBe('NORMAL');
    expect(periodTypeOf(null)).toBeNull();
  });

  it('isStale: only strictly older than the row', () => {
    const last = new Date(T0).toISOString();
    expect(isStale(T0 - 1, last)).toBe(true);
    expect(isStale(T0, last)).toBe(false);
    expect(isStale(T0 + 1, last)).toBe(false);
    expect(isStale(T0, null)).toBe(false);
  });

  it('authorized: exact match only, and never without a configured secret', () => {
    expect(authorized('Bearer s3cret', 'Bearer s3cret')).toBe(true);
    expect(authorized('Bearer s3cre', 'Bearer s3cret')).toBe(false);
    expect(authorized('Bearer s3cretX', 'Bearer s3cret')).toBe(false);
    expect(authorized(null, 'Bearer s3cret')).toBe(false);
    expect(authorized('', '')).toBe(false);
    expect(authorized('anything', undefined)).toBe(false);
  });

  it('bodySchema accepts a RevenueCat body and keeps unknown fields; rejects what isn’t an event', () => {
    const body = { api_version: '1.0', event: { ...event({}), country_code: 'CO', price: 19.99 } };
    const parsed = bodySchema.parse(body);
    expect(parsed.event.id).toBe(body.event.id);
    expect((parsed.event as Record<string, unknown>).country_code).toBe('CO');
    expect(bodySchema.safeParse({ event: { type: 'RENEWAL' } }).success).toBe(false);
    expect(bodySchema.safeParse({ hello: 'world' }).success).toBe(false);
  });
});

// ── apply_billing_event, as the webhook calls it ───────────────────────────────────────────────────────────────

let db: PGlite;
let as: As;
let couple: string;
let eveCouple: string;

/** Exactly what revenuecat-webhook/index.ts sends, run as the service role (the owner here). */
async function apply(e: BillingEvent): Promise<string> {
  const a = decide(e);
  const up = a.kind === 'upsert' ? a : null;
  const { rows } = await db.query<{ r: string }>(
    `select apply_billing_event($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) as r`,
    [e.id, e.type, e.app_user_id ?? null, JSON.stringify({ event: e }), a.kind, a.kind === 'store' ? null : a.clerkId,
      up?.status ?? null, up?.expiresAt ?? null, up?.productId ?? null, up?.store ?? null, up?.periodType ?? null,
      a.kind === 'store' ? null : a.eventAt, a.kind === 'transfer' ? a.from : null],
  );
  return rows[0].r;
}

const row = async (hid: string) =>
  (await db.query<{ status: string; payer_user_id: string; expires_at: Date | null; period_type: string }>(`select * from subscriptions where household_id = $1`, [hid])).rows[0];
const plan = async (user: string) => (await as<{ p: { plan: string } }>(user, `select my_plan() as p`))[0].p.plan;

beforeAll(async () => {
  ({ db, as } = await createTestDb());
  const [h] = await as<{ id: string; join_code: string }>(DIEGO, `select id, join_code from create_household('Diego', 'Ana', 'COP', 'half', 50::smallint)`);
  await as(ANA, `select join_household($1, '')`, [h.join_code]);
  couple = h.id;
  const [e] = await as<{ id: string }>(EVE, `select id from create_household('Eve', 'Bob', 'EUR', 'half', 50::smallint)`);
  eveCouple = e.id;
}, 60_000);

beforeEach(async () => {
  await db.query(`delete from subscriptions`);
  await db.query(`delete from billing_events`);
});

describe('apply_billing_event', () => {
  it('a purchase turns both members Premium, far in the future so the test does not age', async () => {
    expect(await apply(event({ expiration_at_ms: Date.now() + 7 * DAY }))).toBe('applied');
    expect(await row(couple)).toMatchObject({ status: 'active', payer_user_id: DIEGO, period_type: 'TRIAL' });
    expect(await plan(DIEGO)).toBe('premium');
    expect(await plan(ANA)).toBe('premium');
  });

  it('the same event twice is processed once (RevenueCat retries reuse the id)', async () => {
    const e = event({ expiration_at_ms: Date.now() + DAY });
    expect(await apply(e)).toBe('applied');
    expect(await apply({ ...e, type: 'EXPIRATION' })).toBe('duplicate');
    expect((await row(couple)).status).toBe('active');
  });

  it('out of order: an older event arriving late does not undo a newer one', async () => {
    expect(await apply(event({ type: 'RENEWAL', event_timestamp_ms: T0 + DAY, expiration_at_ms: Date.now() + 30 * DAY }))).toBe('applied');
    expect(await apply(event({ type: 'EXPIRATION', event_timestamp_ms: T0 }))).toBe('stale');
    expect(await plan(ANA)).toBe('premium');
  });

  it('cancel keeps Premium until expiry; expiry ends it, and the balance views are untouched', async () => {
    await apply(event({ event_timestamp_ms: T0, expiration_at_ms: Date.now() + 5 * DAY }));
    expect(await apply(event({ type: 'CANCELLATION', event_timestamp_ms: T0 + 1, expiration_at_ms: Date.now() + 5 * DAY }))).toBe('applied');
    expect(await plan(DIEGO)).toBe('premium');
    expect(await apply(event({ type: 'EXPIRATION', event_timestamp_ms: T0 + 2, expiration_at_ms: Date.now() - 1 }))).toBe('applied');
    expect(await plan(DIEGO)).toBe('free');
  });

  it('a buyer without a couple: the event waits in billing_events, nothing else changes', async () => {
    expect(await apply(event({ app_user_id: NEWBIE, original_app_user_id: NEWBIE, aliases: [NEWBIE] }))).toBe('no_couple');
    expect((await db.query(`select * from billing_events where app_user_id = $1`, [NEWBIE])).rows).toHaveLength(1);
    expect((await db.query(`select * from subscriptions`)).rows).toHaveLength(0);
  });

  it('TEST, other entitlements and anonymous ids are stored only', async () => {
    expect(await apply(event({ type: 'TEST' }))).toBe('stored');
    expect(await apply(event({ entitlement_ids: ['pro'] }))).toBe('stored');
    expect(await apply(event({ app_user_id: '$RCAnonymousID:a', original_app_user_id: null, aliases: null }))).toBe('stored');
    expect((await db.query(`select * from subscriptions`)).rows).toHaveLength(0);
    expect((await db.query(`select * from billing_events`)).rows).toHaveLength(3);
  });

  it('TRANSFER moves the couple’s row to the destination’s couple, dates kept', async () => {
    const until = Date.now() + 20 * DAY;
    await apply(event({ expiration_at_ms: until }));
    const t = event({ type: 'TRANSFER', event_timestamp_ms: T0 + DAY, app_user_id: null, original_app_user_id: null, aliases: null, entitlement_ids: null, transferred_from: [DIEGO], transferred_to: [EVE] });
    expect(await apply(t)).toBe('transferred');
    expect(await row(couple)).toBeUndefined();
    expect(await row(eveCouple)).toMatchObject({ status: 'active', payer_user_id: EVE });
    expect((await row(eveCouple)).expires_at?.getTime()).toBe(until);
    expect(await plan(ANA)).toBe('free');
    expect(await plan(EVE)).toBe('premium');
  });

  it('TRANSFER from someone with no row (e.g. an account deleted, then restored on a new one) is stored only', async () => {
    const t = event({ type: 'TRANSFER', app_user_id: null, entitlement_ids: null, transferred_from: ['user_2goneEEEEEEEEEEEEEEEEE'], transferred_to: [DIEGO] });
    expect(await apply(t)).toBe('stored');
    expect(await row(couple)).toBeUndefined();
  });

  it('no client can call it', async () => {
    for (const user of [DIEGO, null]) {
      await expect(
        as(user, `select apply_billing_event('evt_x', 'INITIAL_PURCHASE', $1, '{}', 'upsert', $1, 'active', null, null, null, null, now(), null)`, [DIEGO]),
      ).rejects.toThrow(/permission denied/);
    }
    expect((await db.query(`select * from subscriptions`)).rows).toHaveLength(0);
  });
});
