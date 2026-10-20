-- Ajustes › Tu avatar: each person picks a character (fox, cat, …) that both phones show next to their name.
-- members.avatar holds its id, or null for the initial in a circle. The list matches AVATAR_IDS in src/lib/avatars.ts.
-- update_couple_settings gains p_avatar; the old five-argument version is dropped so calls don't become ambiguous.
-- Everything else in the function is unchanged from 20261018020000_default_pct_range.sql.

alter table members add column avatar text
  constraint members_avatar_known check (
    avatar in ('fox', 'cat', 'bear', 'panda', 'owl', 'frog', 'bunny', 'penguin', 'pig', 'tiger', 'dog', 'mouse')
  );

drop function update_couple_settings(text, text, split_mode, smallint, currency_code);

-- p_avatar: an id from the list above, '' to go back to the initial, null to leave it as it is.
create function update_couple_settings(
  p_my_name text default null,
  p_partner_name text default null,
  p_default_split split_mode default null,
  p_my_pct smallint default null,
  p_currency currency_code default null,
  p_avatar text default null
) returns households
language plpgsql security definer set search_path = public as $$
declare
  h households;
  me text := requesting_user_id();
  my_role text;
  partner_joined boolean;
  my_name text := nullif(trim(coalesce(p_my_name, '')), '');
  partner_name text := nullif(trim(coalesce(p_partner_name, '')), '');
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select * into h from households where id = my_household() for update;
  if h.id is null then raise exception 'not_in_household'; end if;
  select role into my_role from members where household_id = h.id and user_id = me;
  partner_joined := (select count(*) from members where household_id = h.id) >= 2;

  if p_my_name is not null then
    if my_name is null then raise exception 'name_required'; end if;
    if length(my_name) > 40 then raise exception 'name_too_long'; end if;
    update members set display_name = my_name where household_id = h.id and user_id = me;
    insert into profiles (id, display_name) values (me, my_name)
      on conflict (id) do update set display_name = excluded.display_name;
  end if;

  -- Once the partner joined, their name is theirs to change in their own app.
  if p_partner_name is not null then
    if partner_joined then raise exception 'partner_joined'; end if;
    if partner_name is null then raise exception 'name_required'; end if;
    if length(partner_name) > 40 then raise exception 'name_too_long'; end if;
    update households set invited_name = partner_name where id = h.id;
  end if;

  if p_default_split is not null then
    if p_default_split not in ('half', 'pct') then raise exception 'invalid_split'; end if;
    update households set default_split = p_default_split where id = h.id;
  end if;

  if p_my_pct is not null then
    -- Same range as a single expense's split (expenses.split_pct): any whole share from 1 to 99 %.
    if p_my_pct not between 1 and 99 then raise exception 'invalid_pct'; end if;
    update households set default_pct = case when my_role = 'owner' then p_my_pct else 100 - p_my_pct end where id = h.id;
  end if;

  -- Only my own avatar: the partner picks theirs in their app.
  if p_avatar is not null then
    if p_avatar <> '' and p_avatar not in ('fox', 'cat', 'bear', 'panda', 'owl', 'frog', 'bunny', 'penguin', 'pig', 'tiger', 'dog', 'mouse') then
      raise exception 'invalid_avatar';
    end if;
    update members set avatar = nullif(p_avatar, '') where household_id = h.id and user_id = me;
  end if;

  -- Amounts are never converted, so the currency is fixed once there is money in it.
  if p_currency is not null and p_currency <> h.currency then
    if exists (select 1 from expenses where household_id = h.id and deleted_at is null)
       or exists (select 1 from settlements where household_id = h.id and deleted_at is null) then
      raise exception 'currency_locked';
    end if;
    update households set currency = p_currency where id = h.id;
  end if;

  -- Keep the couple's name ("Diego y Ana") in step with the two names.
  update households set name = (
    select string_agg(display_name, ' y ' order by role = 'owner' desc, joined_at)
    from members where household_id = h.id
  ) || case when partner_joined then '' else ' y ' || coalesce((select invited_name from households where id = h.id), 'pareja') end
  where id = h.id;

  select * into h from households where id = h.id;
  return h;
end $$;

revoke execute on function update_couple_settings(text, text, split_mode, smallint, currency_code, text) from public, anon;
grant execute on function update_couple_settings(text, text, split_mode, smallint, currency_code, text) to authenticated;
