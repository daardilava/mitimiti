// The app → "check my Premium now". Reads the signed-in person's state from RevenueCat's REST API and writes their
// couple's row (sync_subscription). Phase 6 — Billing, docs/PLAN.md. Deploy: README.md › "Deploy the billing webhook".
//
// Who is asking comes from their Clerk session token, checked by Supabase itself: the function calls
// requesting_user_id() with the caller's token, so PostgREST verifies it (third-party auth: Clerk). The app never says
// who it is, and only ever syncs itself. JWT verification at the gateway is off (config.toml) because the gateway
// doesn't know Clerk's tokens; this check replaces it.
import { createClient } from '@supabase/supabase-js';
import { stateFromSubscriber, subscriberSchema } from '../_shared/billing.ts';

const URL = Deno.env.get('SUPABASE_URL')!;
const keys = (name: string) => JSON.parse(Deno.env.get(name) ?? '{}') as Record<string, string>;
const PUBLISHABLE = keys('SUPABASE_PUBLISHABLE_KEYS').default ?? Deno.env.get('SUPABASE_ANON_KEY')!;
const SECRET = keys('SUPABASE_SECRET_KEYS').default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } });

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return reply(405, { error: 'method_not_allowed' });
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return reply(401, { error: 'unauthorized' });

  const asCaller = createClient(URL, PUBLISHABLE, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: me, error: whoError } = await asCaller.rpc('requesting_user_id');
  if (whoError || typeof me !== 'string' || !me.startsWith('user_')) return reply(401, { error: 'unauthorized' });

  const rc = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(me)}`, {
    headers: { Authorization: `Bearer ${Deno.env.get('REVENUECAT_SECRET_API_KEY')}` },
  });
  if (!rc.ok) {
    console.error('RevenueCat answered', rc.status, 'for', me);
    return reply(502, { error: 'revenuecat' });
  }
  const parsed = subscriberSchema.safeParse(await rc.json());
  if (!parsed.success) return reply(502, { error: 'revenuecat_shape' });

  const s = stateFromSubscriber(parsed.data, new Date());
  const { data, error } = await admin.rpc('sync_subscription', {
    p_clerk_id: me,
    p_kind: s.kind,
    p_status: s.kind === 'state' ? s.status : null,
    p_expires_at: s.kind === 'state' ? s.expiresAt : null,
    p_product_id: s.kind === 'state' ? s.productId : null,
    p_store: s.kind === 'state' ? s.store : null,
    p_period_type: s.kind === 'state' ? s.periodType : null,
  });
  if (error) {
    console.error('sync_subscription failed', me, error.message);
    return reply(500, { error: 'database' });
  }
  return reply(200, { ok: true, result: data });
});
