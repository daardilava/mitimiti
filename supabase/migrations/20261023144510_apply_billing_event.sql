-- Phase 6 — Billing: one RevenueCat webhook event, applied in one transaction. The Edge Function
-- (supabase/functions/revenuecat-webhook) decides what the event means (supabase/functions/_shared/billing.ts) and
-- calls this with the result; it is the only writer of subscriptions and billing_events.
--
-- Returns what happened, for the function's log:
--   duplicate    the event id was already processed (RevenueCat retries reuse it) — nothing changes
--   stored       kept in billing_events only (TEST, no change, other entitlement, no Clerk id, nothing to transfer)
--   no_couple    the buyer has no couple yet; the event waits in billing_events until one exists (linked later,
--                when the app syncs after creating or joining a couple — Phase 6, SDK task)
--   stale        older than the event the couple's row already reflects
--   applied      the couple's row was written
--   transferred  the purchase moved to another account, and the row with it

create function apply_billing_event(
  p_event_id text,
  p_type text,
  p_app_user_id text,
  p_payload jsonb,
  p_kind text,                       -- 'store' | 'upsert' | 'transfer'
  p_clerk_id text default null,      -- buyer (upsert) or destination (transfer)
  p_status text default null,
  p_expires_at timestamptz default null,
  p_product_id text default null,
  p_store text default null,
  p_period_type text default null,
  p_event_at timestamptz default null,
  p_transfer_from text[] default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  h uuid;
  src subscriptions;
begin
  insert into billing_events (id, type, app_user_id, payload)
    values (p_event_id, p_type, coalesce(p_clerk_id, p_app_user_id), p_payload)
    on conflict (id) do nothing;
  if not found then return 'duplicate'; end if;
  if p_kind not in ('upsert', 'transfer') then return 'stored'; end if;

  select household_id into h from members where user_id = p_clerk_id;
  if h is null then return 'no_couple'; end if;

  -- One event at a time per couple: the same lock as record_settlement and delete_account.
  perform 1 from households where id = h for update;

  if p_kind = 'transfer' then
    -- The row of the couple the purchase comes from. If that account has no couple any more (deleted, then the
    -- purchase restored on a new account), there is no row to move and TRANSFER carries no dates to rebuild one:
    -- it is stored, and the app's sync after Restaurar compras links it (Phase 6, SDK task).
    select s.* into src from subscriptions s
      where s.household_id in (select household_id from members where user_id = any(p_transfer_from))
      limit 1
      for update;
    if src.household_id is null then return 'stored'; end if;
    if src.household_id <> h then
      delete from subscriptions where household_id = src.household_id;
    end if;
    insert into subscriptions (household_id, payer_user_id, entitlement, product_id, store, period_type, status,
                               expires_at, last_event_at, updated_at)
      values (h, p_clerk_id, src.entitlement, src.product_id, src.store, src.period_type, src.status, src.expires_at,
              greatest(src.last_event_at, p_event_at), now())
      on conflict (household_id) do update set
        payer_user_id = excluded.payer_user_id, last_event_at = excluded.last_event_at, updated_at = now();
    return 'transferred';
  end if;

  if exists (select 1 from subscriptions where household_id = h and last_event_at > p_event_at) then
    return 'stale';
  end if;

  insert into subscriptions (household_id, payer_user_id, product_id, store, period_type, status, expires_at,
                             last_event_at, updated_at)
    values (h, p_clerk_id, p_product_id, p_store, p_period_type, p_status, p_expires_at, p_event_at, now())
    on conflict (household_id) do update set
      payer_user_id = excluded.payer_user_id,
      product_id = coalesce(excluded.product_id, subscriptions.product_id),
      store = coalesce(excluded.store, subscriptions.store),
      period_type = coalesce(excluded.period_type, subscriptions.period_type),
      status = excluded.status,
      expires_at = excluded.expires_at,
      last_event_at = excluded.last_event_at,
      updated_at = now();
  return 'applied';
end $$;

-- Only the webhook, with the service role. Never the app.
revoke execute on function apply_billing_event(text, text, text, jsonb, text, text, text, timestamptz, text, text, text,
  timestamptz, text[]) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function apply_billing_event(text, text, text, jsonb, text, text, text, timestamptz, text, text, text,
      timestamptz, text[]) to service_role;
  end if;
end $$;
