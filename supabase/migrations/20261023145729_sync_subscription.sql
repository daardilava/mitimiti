-- Phase 6 — Billing: billing-sync (supabase/functions/billing-sync). The app asks for a sync after creating or joining
-- a couple, after a purchase and after Restaurar compras; the function reads the person's current state from
-- RevenueCat's REST API (supabase/functions/_shared/billing.ts › stateFromSubscriber) and writes it here.
-- It closes what webhook events alone can't: someone who bought before having a couple (their events wait in
-- billing_events), and a TRANSFER from an account with no couple any more (the event carries no dates).
--
-- Returns: no_couple · unchanged · synced. Only the caller's own state is ever written: a partner without Premium
-- of their own never expires the payer's row.

create function sync_subscription(
  p_clerk_id text,
  p_kind text,                      -- 'none' (never had Premium) | 'state'
  p_status text default null,
  p_expires_at timestamptz default null,
  p_product_id text default null,
  p_store text default null,
  p_period_type text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
  s subscriptions;
begin
  select household_id into h from members where user_id = p_clerk_id;
  if h is null then return 'no_couple'; end if;

  -- The same lock as apply_billing_event, record_settlement and delete_account.
  perform 1 from households where id = h for update;
  select * into s from subscriptions where household_id = h;

  if p_kind <> 'state' then return 'unchanged'; end if;

  if p_status = 'expired' then
    -- An expiry only ends the row this person pays for; it never creates one, nor touches the partner's.
    if s.household_id is null or s.payer_user_id is distinct from p_clerk_id then return 'unchanged'; end if;
  end if;

  insert into subscriptions (household_id, payer_user_id, product_id, store, period_type, status, expires_at,
                             last_event_at, updated_at)
    values (h, p_clerk_id, p_product_id, p_store, p_period_type, p_status, p_expires_at, now(), now())
    on conflict (household_id) do update set
      payer_user_id = excluded.payer_user_id,
      product_id = coalesce(excluded.product_id, subscriptions.product_id),
      store = coalesce(excluded.store, subscriptions.store),
      period_type = coalesce(excluded.period_type, subscriptions.period_type),
      status = excluded.status,
      expires_at = excluded.expires_at,
      -- What RevenueCat says now is newer than any event still in flight.
      last_event_at = greatest(subscriptions.last_event_at, now()),
      updated_at = now();
  return 'synced';
end $$;

-- Only billing-sync, with the service role. Never the app.
revoke execute on function sync_subscription(text, text, text, timestamptz, text, text, text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function sync_subscription(text, text, text, timestamptz, text, text, text) to service_role;
  end if;
end $$;
