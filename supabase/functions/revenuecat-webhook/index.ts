// RevenueCat → Supabase: writes the couple's Premium (subscriptions) from each webhook event. Phase 6 — Billing,
// docs/PLAN.md. Deploy and configure: README.md › "Deploy the billing webhook".
//
// RevenueCat treats only a 200 as delivered and retries anything else (5 times over ~80 minutes), so: 401 without the
// shared secret, 400 for a body that isn't an event, 500 when the database fails (worth a retry), and 200 for
// everything else — including duplicates, TEST, and buyers who have no couple yet (their event waits in
// billing_events; the app links it after creating or joining a couple).
import { createClient } from '@supabase/supabase-js';
import { authorized, bodySchema, decide, headerShape } from '../_shared/billing.ts';

const SECRET_KEYS = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
const db = createClient(Deno.env.get('SUPABASE_URL')!, SECRET_KEYS.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const auth = req.headers.get('Authorization');
  if (!authorized(auth, Deno.env.get('REVENUECAT_WEBHOOK_AUTH'))) {
    return reply(401, { error: 'unauthorized', received: headerShape(auth) });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return reply(400, { error: 'invalid_json' });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return reply(400, { error: 'invalid_event' });

  const event = parsed.data.event;
  const action = decide(event);
  const { data, error } = await db.rpc('apply_billing_event', {
    p_event_id: event.id,
    p_type: event.type,
    p_app_user_id: event.app_user_id ?? null,
    p_payload: raw,
    p_kind: action.kind,
    p_clerk_id: action.kind === 'store' ? null : action.clerkId,
    p_status: action.kind === 'upsert' ? action.status : null,
    p_expires_at: action.kind === 'upsert' ? action.expiresAt : null,
    p_product_id: action.kind === 'upsert' ? action.productId : null,
    p_store: action.kind === 'upsert' ? action.store : null,
    p_period_type: action.kind === 'upsert' ? action.periodType : null,
    p_event_at: action.kind === 'store' ? null : action.eventAt,
    p_transfer_from: action.kind === 'transfer' ? action.from : null,
  });
  if (error) {
    console.error('apply_billing_event failed', event.id, event.type, error.message);
    return reply(500, { error: 'database' });
  }

  console.log('billing event', event.id, event.type, action.kind === 'store' ? action.reason : action.kind, data);
  return reply(200, { ok: true, result: data });
});
