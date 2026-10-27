-- Release A: safety foundation (Settings audit, 28 Oct 2026). PREVIEW: applied only when Roneel says "deploy".
-- Nothing here changes an order, a customer, a payment, a price or a setting value.
-- Rollback: supabase/sql/release_a_20261028_rollback.sql

begin;

-- 1. Staff accounts: only the staff-admin service and the checked admin_* functions may change them.
--    The app never writes staff_profiles itself (it only reads the signed-in person's own row), and the
--    staff-admin Edge Function uses the service role, so dropping direct writes changes nothing people can do
--    in the app; it closes the path that skipped the "don't lock out the last admin" guard.
drop policy if exists admin_manage_staff on public.staff_profiles;
create policy staff_users_read on public.staff_profiles for select to authenticated using (public.has_perm('staff.users'));

-- 2. Booking rules that cannot contradict each other (both already true for the one location)
alter table public.locations add constraint locations_ahead_covers_notice
  check (max_days_ahead >= greatest(lead_days_standard, lead_days_custom));
-- A cake size on sale must have a price above $0 (no active size is at $0 today)
alter table public.product_sizes add constraint product_sizes_active_priced
  check (not active or price > 0);

-- 3. The settings table holds two system keys. Staff logins can already read no rows (row security, no policy);
--    remove the leftover table rights they never use.
revoke all on public.app_config from anon, authenticated;

-- 4. "Remove Settings entries" retired (Roneel, 28 Oct 2026): take items off sale or archive them instead.
--    The function stays in place (reversible) but signed-in staff can no longer run it.
revoke execute on function public.admin_remove_setting(text, uuid, text) from authenticated, anon;
revoke execute on function staff_config_api.remove_setting(text, uuid, text) from authenticated, anon;

commit;
