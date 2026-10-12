-- Applied after crm_phase1.sql.

-- Interim: the published staff app still saves profile edits directly. Keep that working until the new app
-- (which uses staff_update_customer) is published, then run the lock-down at the bottom.
alter policy edit_customers on public.customers
  using (public.has_role('manager','front_of_house'))
  with check (public.has_role('manager','front_of_house'));

-- Any change to a profile moves its version on, whichever path made it, so a screen open elsewhere is warned.
create or replace function public.bump_customer_version() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.version = old.version and to_jsonb(new) - 'updated_at' - 'version' is distinct from to_jsonb(old) - 'updated_at' - 'version' then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
create or replace trigger t_customers_version before update on public.customers
  for each row execute function public.bump_customer_version();
revoke all on function public.bump_customer_version() from public, anon, authenticated;

-- AFTER the new staff app is published (not yet run):
-- alter policy edit_customers on public.customers using (false) with check (false);
