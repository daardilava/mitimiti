-- Phase 6 — Billing, QA fixes (docs/PLAN.md). A couple has one subscriptions row, but both members can end up paying:
-- both bought at the same moment while Free, or one bought before joining. Until now, either person's events
-- overwrote the row, so one person's EXPIRATION made the couple Free while the other's subscription was still running.
-- Rule, for the webhook and billing-sync alike: another member's subscription only replaces a live row when it lasts
-- longer, and their expiry never ends it. (If the row's payer does expire first, the couple is Free until the other
-- person's next event or sync; the app syncs when the store says Premium and Supabase says Free, src/api/plan.ts.)
--
-- TRANSFER fixes: the row that moves is the one the old account pays for (it used to be any row of the old account's
-- couple, which could be the partner's subscription), and it arrives with its status and dates (an existing row at the
-- destination used to keep its own, e.g. an old expired one).

-- Whether a subscription of p_clerk_id may replace the couple's row s (s.household_id is null: there is no row).
create function billing_replaces(s subscriptions, p_clerk_id text, p_status text, p_expires_at timestamptz)
returns boolean
language sql stable set search_path = public as $$
  select s.household_id is null
    or s.payer_user_id is not distinct from p_clerk_id
    or s.status = 'expired' or (s.expires_at is not null and s.expires_at <= now())
    or (p_status <> 'expired' and s.expires_at is not null and (p_expires_at is null or p_expires_at > s.expires_at));
$$;

revoke execute on function billing_replaces(subscriptions, text, text, timestamptz) from public, anon, authenticated;

-- Returns, besides what it did before (see 20261023144510_apply_billing_event.sql):
--   other_payer  the couple's row is another member's live subscription, which this event doesn't replace
create or replace function apply_billing_event(
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
  cur subscriptions;
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
    -- The row the old account pays for. None (the account was deleted, then the purchase restored on a new one):
    -- TRANSFER carries no dates to rebuild it, so it is stored, and the app's sync after Restaurar compras links it.
    select * into src from subscriptions where payer_user_id = any(p_transfer_from) limit 1 for update;
    if src.household_id is null then return 'stored'; end if;
    if src.household_id <> h then
      delete from subscriptions where household_id = src.household_id;
      select * into cur from subscriptions where household_id = h for update;
      if not billing_replaces(cur, p_clerk_id, src.status, src.expires_at) then return 'other_payer'; end if;
    end if;
    insert into subscriptions (household_id, payer_user_id, entitlement, product_id, store, period_type, status,
                               expires_at, last_event_at, updated_at)
      values (h, p_clerk_id, src.entitlement, src.product_id, src.store, src.period_type, src.status, src.expires_at,
              greatest(src.last_event_at, p_event_at), now())
      on conflict (household_id) do update set
        payer_user_id = excluded.payer_user_id,
        entitlement = excluded.entitlement,
        product_id = excluded.product_id,
        store = excluded.store,
        period_type = excluded.period_type,
        status = excluded.status,
        expires_at = excluded.expires_at,
        last_event_at = greatest(subscriptions.last_event_at, excluded.last_event_at),
        updated_at = now();
    return 'transferred';
  end if;

  select * into cur from subscriptions where household_id = h;
  if cur.last_event_at > p_event_at then return 'stale'; end if;
  if not billing_replaces(cur, p_clerk_id, p_status, p_expires_at) then return 'other_payer'; end if;

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

create or replace function sync_subscription(
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
  -- The partner's live subscription stays unless this one lasts longer.
  if not billing_replaces(s, p_clerk_id, p_status, p_expires_at) then return 'unchanged'; end if;

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
