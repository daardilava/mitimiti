-- §4 Settle up: never more than what is owed, even when both phones record a payment at the same moment.
-- Before, two calls could both read the old balance from balance_view, both pass the check and together overpay.
-- Locking the couple's households row makes their payments run one after the other; the second one then
-- reads the balance the first left and is refused if it is too much.

create or replace function record_settlement(
  p_amount_minor bigint,
  p_method settle_method,
  p_paid_on date default null
) returns settlements
language plpgsql security definer set search_path = public as $$
declare
  h uuid := my_household();
  me text := requesting_user_id();
  partner text;
  my_net bigint;
  t settlements;
begin
  if h is null then raise exception 'not_in_household'; end if;
  perform 1 from households where id = h for update;

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
