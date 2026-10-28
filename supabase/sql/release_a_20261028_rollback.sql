-- Rollback for release_a_20261028.sql: puts every right and policy back exactly as before.
begin;
drop policy if exists staff_users_read on public.staff_profiles;
create policy admin_manage_staff on public.staff_profiles for all using (public.has_perm('staff.users')) with check (public.has_perm('staff.users'));
alter table public.locations drop constraint if exists locations_ahead_covers_notice;
alter table public.product_sizes drop constraint if exists product_sizes_active_priced;
grant select, references, trigger, truncate on public.app_config to authenticated;
grant execute on function public.admin_remove_setting(text, uuid, text) to authenticated;
grant execute on function staff_config_api.remove_setting(text, uuid, text) to authenticated;
commit;
