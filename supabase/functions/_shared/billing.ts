// What a RevenueCat webhook event means for a couple's Premium. Pure: no Deno or Node APIs, so the Edge Function
// (supabase/functions/revenuecat-webhook) and Vitest (supabase/tests/billing_webhook.test.ts) share it.
// Event types and fields: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields (2026-10-23).
// The database applies the result atomically: apply_billing_event() in
// supabase/migrations/20261023144510_apply_billing_event.sql.
import { z } from 'zod';

/** The RevenueCat entitlement that is MitiMiti Premium. */
export const PREMIUM = 'premium';

const ms = z.number().int().nonnegative();

/** The fields we use; everything else is kept as is in billing_events.payload. "Sometimes" fields are optional. */
export const eventSchema = z.looseObject({
  id: z.string().min(1),
  type: z.string().min(1),
  event_timestamp_ms: ms,
  app_user_id: z.string().nullish(),
  original_app_user_id: z.string().nullish(),
  aliases: z.array(z.string()).nullish(),
  transferred_from: z.array(z.string()).nullish(),
  transferred_to: z.array(z.string()).nullish(),
  entitlement_ids: z.array(z.string()).nullish(),
  /** Deprecated by RevenueCat in favour of entitlement_ids; still read when it's the only one. */
  entitlement_id: z.string().nullish(),
  product_id: z.string().nullish(),
  period_type: z.string().nullish(),
  store: z.string().nullish(),
  environment: z.string().nullish(),
  /** Null for lifetime products. */
  expiration_at_ms: ms.nullish(),
  /** BILLING_ISSUE only: Premium holds until the store's grace period ends. */
  grace_period_expiration_at_ms: ms.nullish(),
});

export const bodySchema = z.looseObject({ api_version: z.string().nullish(), event: eventSchema });

export type BillingEvent = z.infer<typeof eventSchema>;
export type SubscriptionStatus = 'active' | 'cancelled' | 'billing_issue' | 'expired';
export type PeriodType = 'TRIAL' | 'INTRO' | 'NORMAL';

const STATUS: Record<string, SubscriptionStatus> = {
  INITIAL_PURCHASE: 'active',
  RENEWAL: 'active',
  UNCANCELLATION: 'active',
  PRODUCT_CHANGE: 'active',
  NON_RENEWING_PURCHASE: 'active',
  SUBSCRIPTION_EXTENDED: 'active',
  REFUND_REVERSED: 'active',
  // A grant of at most 24 h while a store can't validate purchases; its expiration_at_ms ends it.
  TEMPORARY_ENTITLEMENT_GRANT: 'active',
  // Also refunds: expiration_at_ms then says when access ends, so it is always stored as sent.
  CANCELLATION: 'cancelled',
  BILLING_ISSUE: 'billing_issue',
  EXPIRATION: 'expired',
};

/** Known events that don't change Premium: kept in billing_events, nothing else. */
const NO_CHANGE = new Set([
  'SUBSCRIPTION_PAUSED', // Android: pauses at the end of the period; the EXPIRATION that follows ends Premium
  'PRICE_INCREASE_CONSENT_REQUIRED',
  'PRICE_INCREASE_CONSENT_APPROVED',
  'INVOICE_ISSUANCE',
  'VIRTUAL_CURRENCY_TRANSACTION',
  'EXPERIMENT_ENROLLMENT',
  'PURCHASE_REDEEMED',
  'SUBSCRIBER_ALIAS',
]);

export type BillingAction =
  | { kind: 'store'; reason: 'test' | 'no_change' | 'unknown_type' | 'other_entitlement' | 'no_clerk_id' }
  | {
      kind: 'upsert';
      clerkId: string;
      status: SubscriptionStatus;
      expiresAt: string | null;
      productId: string | null;
      store: string | null;
      periodType: PeriodType | null;
      eventAt: string;
    }
  | { kind: 'transfer'; clerkId: string; from: string[]; eventAt: string };

const isClerkId = (id: string | null | undefined): id is string => typeof id === 'string' && id.startsWith('user_');

const iso = (msSinceEpoch: number) => new Date(msSinceEpoch).toISOString();

/**
 * The Clerk id behind an event: the app logs in to RevenueCat with it (app_user_id = user_…). Anonymous RevenueCat
 * ids ($RCAnonymousID:…) never decide an entitlement, so they are skipped.
 */
export function clerkIdOf(e: BillingEvent): string | null {
  const candidates = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? []), ...(e.transferred_to ?? [])];
  return candidates.find(isClerkId) ?? null;
}

/** The database only knows TRIAL, INTRO and NORMAL; RevenueCat's PROMOTIONAL and PREPAID are paid time too. */
export function periodTypeOf(p: string | null | undefined): PeriodType | null {
  if (!p) return null;
  return p === 'TRIAL' || p === 'INTRO' ? p : 'NORMAL';
}

/** An event older than the one the couple's row already reflects arrived late (retries, out of order): ignore it. */
export function isStale(eventTimestampMs: number, lastEventAt: string | null): boolean {
  return lastEventAt !== null && eventTimestampMs < Date.parse(lastEventAt);
}

function entitlementsOf(e: BillingEvent): string[] | null {
  if (e.entitlement_ids) return e.entitlement_ids;
  return e.entitlement_id ? [e.entitlement_id] : null;
}

/** What to do with one event. Every event is stored in billing_events first, whatever this says. */
export function decide(e: BillingEvent): BillingAction {
  if (e.type === 'TEST') return { kind: 'store', reason: 'test' };
  const eventAt = iso(e.event_timestamp_ms);

  // TRANSFER has no product or expiry: the couple's row moves with the purchase, from the old account's couple to
  // the new account's.
  if (e.type === 'TRANSFER') {
    const to = (e.transferred_to ?? []).find(isClerkId);
    if (!to) return { kind: 'store', reason: 'no_clerk_id' };
    return { kind: 'transfer', clerkId: to, from: (e.transferred_from ?? []).filter(isClerkId), eventAt };
  }

  const status = STATUS[e.type];
  if (!status) return { kind: 'store', reason: NO_CHANGE.has(e.type) ? 'no_change' : 'unknown_type' };
  if (!entitlementsOf(e)?.includes(PREMIUM)) return { kind: 'store', reason: 'other_entitlement' };

  const clerkId = clerkIdOf(e);
  if (!clerkId) return { kind: 'store', reason: 'no_clerk_id' };

  const until = status === 'billing_issue' ? (e.grace_period_expiration_at_ms ?? e.expiration_at_ms) : e.expiration_at_ms;
  return {
    kind: 'upsert',
    clerkId,
    status,
    expiresAt: until == null ? null : iso(until),
    productId: e.product_id ?? null,
    store: e.store ?? null,
    periodType: periodTypeOf(e.period_type),
    eventAt,
  };
}

/** Constant-time comparison of the Authorization header with the configured secret. */
export function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || header === null) return false;
  const a = new TextEncoder().encode(header);
  const b = new TextEncoder().encode(secret);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}
