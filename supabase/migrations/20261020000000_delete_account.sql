-- Ajustes › Cuenta › Borrar cuenta (Política de privacidad §8): erases the signed-in person's data and the whole couple
-- space, for both members: households cascades to members, expenses (and their shares), settlements and budgets.
-- This is the one exception to soft deletes: the right to erasure (Ley 1581 de 2012, GDPR art. 17) needs the rows
-- gone, audit trail included. The audit triggers only fire on insert and update, so the cascade writes no new rows.
-- The partner's own Clerk account and profile stay; they land back in onboarding and can start a new couple.
-- The app deletes the Clerk account right after this succeeds. Calling it again does nothing, so a retry is safe.

create function delete_account() returns void
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
end $$;

revoke execute on function delete_account() from public, anon;
grant execute on function delete_account() to authenticated;
