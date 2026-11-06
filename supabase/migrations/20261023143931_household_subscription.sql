-- Phase 6 — Billing (docs/PLAN.md): one Premium subscription per couple, bought in the App Store or Google Play
-- through RevenueCat. Supabase is the source of truth: the RevenueCat webhook (Edge Function, service role) writes
-- these tables; the app only reads, through my_plan() and the members' select policy.
-- Free-plan limits are NOT enforced here: balance_view and monthly_summary are security_invoker, so hiding rows
-- through RLS would change the balance. The app limits screens instead (src/lib/plans.ts).

create table subscriptions (
  household_id uuid primary key references households (id) on delete cascade,
  -- Who bought it: their Clerk id (RevenueCat app_user_id). Null if the store event didn't say.
  payer_user_id text,
  entitlement text not null default 'premium',
  product_id text,
  store text,
  period_type text check (period_type in ('TRIAL', 'INTRO', 'NORMAL')),
  status text not null check (status in ('active', 'cancelled', 'billing_issue', 'expired')),
  -- Null = lifetime (no expiry).
  expires_at timestamptz,
  -- The store event this row reflects; older events arriving late are ignored by the webhook.
  last_event_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Every RevenueCat event, by its id: makes the webhook idempotent, and keeps events for someone who has no couple
-- yet, so the subscription can be linked once they create or join one.
create table billing_events (
  id text primary key,
  type text not null,
  app_user_id text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);
create index billing_events_app_user_id on billing_events (app_user_id);

alter table subscriptions enable row level security;
alter table billing_events enable row level security;

-- Both members read their couple's row; nobody else does. No insert/update/delete policy: only the service role
-- writes. The client grants are removed too, so a missing policy is not the only thing standing in the way.
create policy "members read subscription" on subscriptions for select to authenticated using (is_member(household_id));
revoke insert, update, delete, truncate on subscriptions from authenticated;
revoke all on subscriptions from anon;
revoke all on billing_events from anon, authenticated;

-- Premium while the row is not expired and its date hasn't passed. Cancelled and billing_issue stay Premium until
-- expires_at: the store keeps access until the end of the paid period, or through its grace period.
create function household_is_premium(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from subscriptions
    where household_id = hid and status <> 'expired' and (expires_at is null or expires_at > now())
  );
$$;

-- Not for clients: it would answer for any couple's id. The app asks my_plan(); the webhook uses the service role.
revoke execute on function household_is_premium(uuid) from public, anon, authenticated;

-- The signed-in person's plan, for usePlan(). Without a couple: free.
create function my_plan() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  me text := requesting_user_id();
  h uuid := my_household();
  s subscriptions;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if h is not null then select * into s from subscriptions where household_id = h; end if;
  return jsonb_build_object(
    'plan', case when h is not null and household_is_premium(h) then 'premium' else 'free' end,
    'status', s.status,
    'expires_at', s.expires_at,
    'period_type', s.period_type,
    'is_payer', coalesce(s.payer_user_id = me, false)
  );
end $$;

revoke execute on function my_plan() from public, anon;
grant execute on function my_plan() to authenticated;

-- The partner's phone unlocks within seconds of a purchase.
alter publication supabase_realtime add table subscriptions;

-- Borrar cuenta, now also erasing the caller's billing events. The couple's subscription row goes with the couple
-- (on delete cascade). Deleting the account does not cancel the store subscription; the app says so (Ajustes).
create or replace function delete_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me text := requesting_user_id();
  h uuid := my_household();
begin
  if me is null then raise exception 'not_authenticated'; end if;

  if h is not null then
    -- Wait for a payment or an edit in flight on the same couple (record_settlement locks this row too).
    perform 1 from households where id = h for update;
    delete from audit_log where household_id = h;
    delete from households where id = h;
  end if;

  delete from profiles where id = me;
  delete from push_tokens where user_id = me;
  delete from join_attempts where user_id = me;
  delete from billing_events where app_user_id = me;
end $$;
