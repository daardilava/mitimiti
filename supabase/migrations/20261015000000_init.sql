-- a medias: initial schema
-- Money is stored as integers in each currency's minor unit (COP: pesos, EUR/USD: cents).
-- The balance is never stored; balance_view derives it from expenses, shares and settlements.

create type currency_code as enum ('COP', 'EUR', 'USD');
create type expense_category as enum ('super', 'comida', 'casa', 'servicios', 'transporte', 'ocio', 'viajes', 'regalos', 'otros');
create type split_mode as enum ('half', 'pct', 'other', 'personal');
create type settle_method as enum ('transfer', 'cash', 'other');

-- ─── Tables ────────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  invited_name text,
  currency currency_code not null default 'COP',
  default_split split_mode not null default 'half' check (default_split in ('half', 'pct')),
  default_pct smallint not null default 60 check (default_pct between 1 and 99),
  join_code text unique,
  join_code_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table members (
  household_id uuid not null references households on delete cascade,
  user_id uuid not null unique references auth.users on delete cascade,
  display_name text not null,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  paid_by uuid not null references auth.users,
  amount_minor bigint not null check (amount_minor > 0),
  category expense_category not null,
  description text not null default '',
  spent_on date not null default current_date,
  split_mode split_mode not null,
  -- Payer's percentage when split_mode = 'pct'; null otherwise.
  split_pct smallint check (split_pct between 1 and 99),
  created_by uuid not null references auth.users,
  updated_by uuid references auth.users,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((split_mode = 'pct') = (split_pct is not null))
);
create index expenses_household_spent_on on expenses (household_id, spent_on desc) where deleted_at is null;

create table expense_shares (
  expense_id uuid not null references expenses on delete cascade,
  user_id uuid not null references auth.users,
  share_minor bigint not null check (share_minor >= 0),
  primary key (expense_id, user_id)
);

create table settlements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  from_user uuid not null references auth.users,
  to_user uuid not null references auth.users,
  amount_minor bigint not null check (amount_minor > 0),
  method settle_method not null,
  paid_on date not null default current_date,
  created_by uuid not null references auth.users,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (from_user <> to_user)
);
create index settlements_household_paid_on on settlements (household_id, paid_on desc) where deleted_at is null;

create table budgets (
  household_id uuid not null references households on delete cascade,
  category expense_category not null,
  month date not null check (extract(day from month) = 1),
  limit_minor bigint not null check (limit_minor >= 0),
  primary key (household_id, category, month)
);

create table push_tokens (
  user_id uuid not null references auth.users on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

create table audit_log (
  id bigint generated always as identity primary key,
  household_id uuid not null,
  actor uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

-- Failed and successful join attempts, for rate limiting.
create table join_attempts (
  user_id uuid not null,
  at timestamptz not null default now()
);
create index join_attempts_user_at on join_attempts (user_id, at desc);

-- ─── Helpers ───────────────────────────────────────────────────────────────

create function my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from members where user_id = auth.uid();
$$;

create function is_member(h uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = h and user_id = auth.uid());
$$;

-- A couple has exactly two people.
create function enforce_two_members() returns trigger
language plpgsql as $$
begin
  if (select count(*) from members where household_id = new.household_id) >= 2 then
    raise exception 'household_full';
  end if;
  return new;
end $$;
create trigger members_max_two before insert on members
  for each row execute function enforce_two_members();

create function new_join_code() returns text
language plpgsql as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O, 1/I
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from households where join_code = code);
  end loop;
  return code;
end $$;

-- Recomputes the shares of one expense for the members that exist now.
-- Mirrors src/lib/splits.ts: the payer absorbs any odd unit left by rounding.
create function write_shares(p_expense uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  e expenses;
  partner uuid;
  partner_share bigint;
begin
  select * into e from expenses where id = p_expense;
  select user_id into partner from members
    where household_id = e.household_id and user_id <> e.paid_by;

  partner_share := case e.split_mode
    when 'half' then e.amount_minor / 2
    when 'pct' then e.amount_minor * (100 - e.split_pct) / 100
    when 'other' then e.amount_minor
    else 0
  end;

  delete from expense_shares where expense_id = e.id;
  insert into expense_shares (expense_id, user_id, share_minor)
    values (e.id, e.paid_by, e.amount_minor - partner_share);
  -- Before the partner joins only the payer's share exists; join_household backfills the rest.
  if partner is not null then
    insert into expense_shares (expense_id, user_id, share_minor)
      values (e.id, partner, partner_share);
  end if;
end $$;

create function audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (household_id, actor, action, entity, entity_id, before, after)
  values (
    new.household_id, auth.uid(), lower(tg_op), tg_table_name, new.id,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new)
  );
  return new;
end $$;
create trigger expenses_audit after insert or update on expenses
  for each row execute function audit_row();
create trigger settlements_audit after insert or update on settlements
  for each row execute function audit_row();

-- ─── Views ─────────────────────────────────────────────────────────────────

-- net_minor > 0: the partner owes this member that amount.
create view balance_view with (security_invoker = true) as
select
  m.household_id,
  m.user_id,
  coalesce((select sum(e.amount_minor) from expenses e
            where e.household_id = m.household_id and e.paid_by = m.user_id and e.deleted_at is null), 0)
  - coalesce((select sum(s.share_minor) from expense_shares s join expenses e on e.id = s.expense_id
              where e.household_id = m.household_id and s.user_id = m.user_id and e.deleted_at is null), 0)
  + coalesce((select sum(t.amount_minor) from settlements t
              where t.household_id = m.household_id and t.from_user = m.user_id and t.deleted_at is null), 0)
  - coalesce((select sum(t.amount_minor) from settlements t
              where t.household_id = m.household_id and t.to_user = m.user_id and t.deleted_at is null), 0)
  as net_minor
from members m;

create view monthly_summary with (security_invoker = true) as
select
  e.household_id,
  date_trunc('month', e.spent_on)::date as month,
  e.category,
  coalesce(sum(e.amount_minor) filter (where e.split_mode <> 'personal'), 0) as shared_minor,
  coalesce(sum(e.amount_minor) filter (where e.split_mode = 'personal'), 0) as personal_minor,
  count(*) filter (where e.split_mode <> 'personal') as shared_count
from expenses e
where e.deleted_at is null
group by 1, 2, 3;

-- ─── RPCs ──────────────────────────────────────────────────────────────────

create function create_household(
  p_my_name text,
  p_partner_name text,
  p_currency currency_code default 'COP',
  p_default_split split_mode default 'half',
  p_default_pct smallint default 60
) returns households
language plpgsql security definer set search_path = public as $$
declare
  h households;
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from members where user_id = me) then raise exception 'already_in_household'; end if;
  if coalesce(trim(p_my_name), '') = '' then raise exception 'name_required'; end if;

  insert into households (name, invited_name, currency, default_split, default_pct, join_code, join_code_expires_at)
  values (trim(p_my_name) || ' y ' || coalesce(nullif(trim(p_partner_name), ''), 'pareja'),
          nullif(trim(p_partner_name), ''), p_currency, p_default_split, p_default_pct,
          new_join_code(), now() + interval '7 days')
  returning * into h;

  insert into members (household_id, user_id, display_name) values (h.id, me, trim(p_my_name));
  insert into profiles (id, display_name) values (me, trim(p_my_name))
    on conflict (id) do update set display_name = excluded.display_name;
  return h;
end $$;

-- Returns {ok, error?, household_id?}. Invalid codes return instead of raising,
-- so the attempt row is kept and the rate limit works.
create function join_household(p_code text, p_display_name text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  h households;
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from members where user_id = me) then
    return jsonb_build_object('ok', false, 'error', 'already_in_household');
  end if;
  if (select count(*) from join_attempts where user_id = me and at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'too_many_attempts');
  end if;
  insert into join_attempts (user_id) values (me);

  select * into h from households where join_code = upper(trim(p_code)) for update;
  if h.id is null then return jsonb_build_object('ok', false, 'error', 'invalid_code'); end if;
  if h.join_code_expires_at < now() then return jsonb_build_object('ok', false, 'error', 'expired_code'); end if;
  if (select count(*) from members where household_id = h.id) >= 2 then
    return jsonb_build_object('ok', false, 'error', 'household_full');
  end if;

  insert into members (household_id, user_id, display_name)
    values (h.id, me, coalesce(nullif(trim(p_display_name), ''), h.invited_name, ''));
  insert into profiles (id, display_name) values (me, coalesce(nullif(trim(p_display_name), ''), h.invited_name, ''))
    on conflict (id) do update set display_name = excluded.display_name;
  update households set join_code = null, join_code_expires_at = null where id = h.id;
  perform write_shares(e.id) from expenses e where e.household_id = h.id;

  return jsonb_build_object('ok', true, 'household_id', h.id);
end $$;

create function regenerate_join_code() returns text
language plpgsql security definer set search_path = public as $$
declare
  h uuid := my_household();
  code text := new_join_code();
begin
  if h is null then raise exception 'not_in_household'; end if;
  if (select count(*) from members where household_id = h) >= 2 then raise exception 'household_full'; end if;
  update households set join_code = code, join_code_expires_at = now() + interval '7 days' where id = h;
  return code;
end $$;

create function upsert_expense(
  p_id uuid,
  p_paid_by uuid,
  p_amount_minor bigint,
  p_category expense_category,
  p_description text,
  p_spent_on date,
  p_split_mode split_mode,
  p_split_pct smallint default null
) returns expenses
language plpgsql security definer set search_path = public as $$
declare
  h uuid := my_household();
  e expenses;
  pct smallint := case when p_split_mode = 'pct' then p_split_pct end;
begin
  if h is null then raise exception 'not_in_household'; end if;
  if not exists (select 1 from members where household_id = h and user_id = p_paid_by) then
    raise exception 'payer_not_member';
  end if;
  if p_split_mode = 'pct' and pct is null then raise exception 'pct_required'; end if;

  if p_id is null then
    insert into expenses (household_id, paid_by, amount_minor, category, description, spent_on, split_mode, split_pct, created_by)
    values (h, p_paid_by, p_amount_minor, p_category, coalesce(trim(p_description), ''),
            coalesce(p_spent_on, current_date), p_split_mode, pct, auth.uid())
    returning * into e;
  else
    update expenses set
      paid_by = p_paid_by, amount_minor = p_amount_minor, category = p_category,
      description = coalesce(trim(p_description), ''), spent_on = coalesce(p_spent_on, spent_on),
      split_mode = p_split_mode, split_pct = pct, updated_by = auth.uid(), updated_at = now()
    where id = p_id and household_id = h and deleted_at is null
    returning * into e;
    if e.id is null then raise exception 'expense_not_found'; end if;
  end if;

  perform write_shares(e.id);
  return e;
end $$;

create function delete_expense(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update expenses set deleted_at = now(), updated_by = auth.uid(), updated_at = now()
  where id = p_id and household_id = my_household() and deleted_at is null;
  if not found then raise exception 'expense_not_found'; end if;
end $$;

-- Direction comes from the balance: whoever owes pays the other.
create function record_settlement(
  p_amount_minor bigint,
  p_method settle_method,
  p_paid_on date default null
) returns settlements
language plpgsql security definer set search_path = public as $$
declare
  h uuid := my_household();
  me uuid := auth.uid();
  partner uuid;
  my_net bigint;
  t settlements;
begin
  if h is null then raise exception 'not_in_household'; end if;
  select user_id into partner from members where household_id = h and user_id <> me;
  if partner is null then raise exception 'no_partner'; end if;
  select net_minor into my_net from balance_view where household_id = h and user_id = me;
  if my_net = 0 then raise exception 'nothing_owed'; end if;
  if p_amount_minor <= 0 or p_amount_minor > abs(my_net) then raise exception 'amount_exceeds_balance'; end if;

  insert into settlements (household_id, from_user, to_user, amount_minor, method, paid_on, created_by)
  values (h,
          case when my_net > 0 then partner else me end,
          case when my_net > 0 then me else partner end,
          p_amount_minor, p_method, coalesce(p_paid_on, current_date), me)
  returning * into t;
  return t;
end $$;

-- ─── Privileges ────────────────────────────────────────────────────────────
-- Security-definer functions are executable by PUBLIC by default; lock them down.

revoke execute on function my_household(), is_member(uuid), enforce_two_members(), new_join_code(),
  write_shares(uuid), audit_row() from public, anon, authenticated;
grant execute on function my_household(), is_member(uuid) to authenticated;

revoke execute on function
  create_household(text, text, currency_code, split_mode, smallint),
  join_household(text, text),
  regenerate_join_code(),
  upsert_expense(uuid, uuid, bigint, expense_category, text, date, split_mode, smallint),
  delete_expense(uuid),
  record_settlement(bigint, settle_method, date)
from public, anon;
grant execute on function
  create_household(text, text, currency_code, split_mode, smallint),
  join_household(text, text),
  regenerate_join_code(),
  upsert_expense(uuid, uuid, bigint, expense_category, text, date, split_mode, smallint),
  delete_expense(uuid),
  record_settlement(bigint, settle_method, date)
to authenticated;

-- ─── Row Level Security ────────────────────────────────────────────────────
-- Money tables are read-only from the client; all writes go through the RPCs above.

alter table profiles enable row level security;
alter table households enable row level security;
alter table members enable row level security;
alter table expenses enable row level security;
alter table expense_shares enable row level security;
alter table settlements enable row level security;
alter table budgets enable row level security;
alter table push_tokens enable row level security;
alter table audit_log enable row level security;
alter table join_attempts enable row level security;

create policy "own profile" on profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members read household" on households for select to authenticated using (is_member(id));
create policy "members update household" on households for update to authenticated
  using (is_member(id)) with check (is_member(id));

create policy "members read members" on members for select to authenticated using (is_member(household_id));
create policy "update own member row" on members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read expenses" on expenses for select to authenticated using (is_member(household_id));
create policy "members read shares" on expense_shares for select to authenticated
  using (exists (select 1 from expenses e where e.id = expense_id and is_member(e.household_id)));
create policy "members read settlements" on settlements for select to authenticated using (is_member(household_id));

create policy "members read budgets" on budgets for select to authenticated using (is_member(household_id));
create policy "members insert budgets" on budgets for insert to authenticated with check (is_member(household_id));
create policy "members update budgets" on budgets for update to authenticated
  using (is_member(household_id)) with check (is_member(household_id));

create policy "own push tokens" on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "members read audit" on audit_log for select to authenticated using (is_member(household_id));
-- join_attempts: no policies; only security-definer functions touch it.

-- ─── Realtime ──────────────────────────────────────────────────────────────

alter publication supabase_realtime add table expenses, settlements, budgets;
