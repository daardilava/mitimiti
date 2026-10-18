-- §1 Couple account: the person who creates the couple is its owner, and the default
-- proportional split is stored as the owner's share.

comment on column households.default_pct is
  'Owner''s share (%) when default_split = pct; the partner takes the rest.';

alter table members add constraint members_role check (role in ('owner', 'member'));

-- Couples created before this migration: the first member is the owner.
update members m set role = 'owner'
where m.joined_at = (select min(joined_at) from members where household_id = m.household_id);

create or replace function create_household(
  p_my_name text,
  p_partner_name text,
  p_currency currency_code default 'COP',
  p_default_split split_mode default 'half',
  p_default_pct smallint default 60
) returns households
language plpgsql security definer set search_path = public as $$
declare
  h households;
  me text := requesting_user_id();
  my_name text := trim(coalesce(p_my_name, ''));
  partner_name text := trim(coalesce(p_partner_name, ''));
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from members where user_id = me) then raise exception 'already_in_household'; end if;
  if my_name = '' or partner_name = '' then raise exception 'name_required'; end if;
  if length(my_name) > 40 or length(partner_name) > 40 then raise exception 'name_too_long'; end if;
  if p_default_split not in ('half', 'pct') then raise exception 'invalid_split'; end if;
  if p_default_pct not between 30 and 70 then raise exception 'invalid_pct'; end if;

  insert into households (name, invited_name, currency, default_split, default_pct, join_code, join_code_expires_at)
  values (my_name || ' y ' || partner_name, partner_name, p_currency, p_default_split, p_default_pct,
          new_join_code(), now() + interval '7 days')
  returning * into h;

  insert into members (household_id, user_id, display_name, role) values (h.id, me, my_name, 'owner');
  insert into profiles (id, display_name) values (me, my_name)
    on conflict (id) do update set display_name = excluded.display_name;
  return h;
end $$;
