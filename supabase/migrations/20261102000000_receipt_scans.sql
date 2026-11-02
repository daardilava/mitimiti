-- Escanear (docs/PLAN.md › Scan + Dictate): the per-couple daily allowance of receipt reads by the read-receipt Edge
-- Function. Separate from ai_usage (quick entry's allowance) so each feature has its own limit. Nothing about the
-- receipt is stored: not the image, not the lines, not the total. Only the count.

create table receipt_scans (
  household_id uuid not null references households (id) on delete cascade,
  day date not null,
  scans integer not null default 0,
  primary key (household_id, day)
);
alter table receipt_scans enable row level security;
-- No policies and no grants: only claim_receipt_scan() (security definer) reads or writes it. Deleting the couple
-- (Borrar cuenta) removes its rows through the cascade.
revoke all on receipt_scans from anon, authenticated;

-- Called by read-receipt with the caller's token, before each model call. Takes one scan from today's allowance and
-- returns the couple's currency (to say when a receipt is in another one) and whether the couple is Premium (the
-- function decides whether that matters: the Premium gate is off while billing is tested, src/lib/premium.ts).
-- {ok: false, reason}: not_in_household | limit.
create function claim_receipt_scan() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  daily_limit constant integer := 30;
  h uuid := my_household();
  used integer;
begin
  if h is null then return jsonb_build_object('ok', false, 'reason', 'not_in_household'); end if;

  insert into receipt_scans as r (household_id, day, scans) values (h, current_date, 1)
  on conflict (household_id, day) do update set scans = r.scans + 1 where r.scans < daily_limit
  returning scans into used;
  if used is null then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;

  return (
    select jsonb_build_object('ok', true, 'remaining', daily_limit - used, 'currency', hh.currency, 'premium', household_is_premium(h))
    from households hh where hh.id = h
  );
end $$;

revoke execute on function claim_receipt_scan() from public, anon;
grant execute on function claim_receipt_scan() to authenticated;
