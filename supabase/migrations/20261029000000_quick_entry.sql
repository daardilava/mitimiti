-- Quick entry (docs/QUICK_ENTRY.md): where each expense came from, and the per-couple daily allowance of AI calls
-- (the parse-expense Edge Function). The AI only proposes a draft; saving still goes through upsert_expense.

-- ─── Source ───────────────────────────────────────────────────────────────
-- How the expense was first logged, to measure how much quick entry is used. Never changes on edit.

alter table expenses add column source text not null default 'manual'
  check (source in ('manual', 'text', 'voice', 'receipt'));

-- Same as before plus p_source (last, with a default, so callers that don't send it keep working).
drop function upsert_expense(uuid, text, bigint, expense_category, text, date, split_mode, smallint);

create function upsert_expense(
  p_id uuid,
  p_paid_by text,
  p_amount_minor bigint,
  p_category expense_category,
  p_description text,
  p_spent_on date,
  p_split_mode split_mode,
  p_split_pct smallint default null,
  p_source text default 'manual'
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
    insert into expenses (household_id, paid_by, amount_minor, category, description, spent_on, split_mode, split_pct, created_by, source)
    values (h, p_paid_by, p_amount_minor, p_category, coalesce(trim(p_description), ''),
            coalesce(p_spent_on, current_date), p_split_mode, pct, requesting_user_id(), coalesce(p_source, 'manual'))
    returning * into e;
  else
    update expenses set
      paid_by = p_paid_by, amount_minor = p_amount_minor, category = p_category,
      description = coalesce(trim(p_description), ''), spent_on = coalesce(p_spent_on, spent_on),
      split_mode = p_split_mode, split_pct = pct, updated_by = requesting_user_id(), updated_at = now()
    where id = p_id and household_id = h and deleted_at is null
    returning * into e;
    if e.id is null then raise exception 'expense_not_found'; end if;
  end if;

  perform write_shares(e.id);
  return e;
end $$;

revoke execute on function upsert_expense(uuid, text, bigint, expense_category, text, date, split_mode, smallint, text)
  from public, anon;
grant execute on function upsert_expense(uuid, text, bigint, expense_category, text, date, split_mode, smallint, text)
  to authenticated;

-- ─── AI allowance ─────────────────────────────────────────────────────────
-- AI entry is Premium, with a daily limit per couple (each call costs money). One row per couple and day; only
-- claim_ai_call() writes it. Deleting the couple (Borrar cuenta) removes its rows through the cascade.

create table ai_usage (
  household_id uuid not null references households (id) on delete cascade,
  day date not null,
  calls integer not null default 0,
  primary key (household_id, day)
);
alter table ai_usage enable row level security;
revoke all on ai_usage from anon, authenticated;

-- Called by parse-expense with the caller's token, before each model call. Takes one call from today's allowance and
-- returns what the model needs: the couple's currency and both first names (nothing else; never the balance).
-- {ok: false, reason}: not_in_household | not_premium | limit.
create function claim_ai_call() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  daily_limit constant integer := 60;
  h uuid := my_household();
  me text := requesting_user_id();
  used integer;
  result jsonb;
begin
  if h is null then return jsonb_build_object('ok', false, 'reason', 'not_in_household'); end if;
  if not household_is_premium(h) then return jsonb_build_object('ok', false, 'reason', 'not_premium'); end if;

  insert into ai_usage as u (household_id, day, calls) values (h, current_date, 1)
  on conflict (household_id, day) do update set calls = u.calls + 1 where u.calls < daily_limit
  returning calls into used;
  if used is null then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;

  select jsonb_build_object(
    'ok', true,
    'remaining', daily_limit - used,
    'currency', hh.currency,
    'me', (select split_part(trim(display_name), ' ', 1) from members where household_id = h and user_id = me),
    'partner', coalesce(
      (select split_part(trim(display_name), ' ', 1) from members where household_id = h and user_id <> me),
      split_part(trim(coalesce(hh.invited_name, '')), ' ', 1)
    )
  ) into result
  from households hh where hh.id = h;
  return result;
end $$;

revoke execute on function claim_ai_call() from public, anon;
grant execute on function claim_ai_call() to authenticated;
