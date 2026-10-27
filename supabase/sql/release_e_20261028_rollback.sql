-- Rollback for release_e_20261028.sql: back to password-only checks. Authenticator factors stay on the account
-- (harmless; remove them in Supabase Authentication if wanted).
create or replace function public._perm_of(p_user uuid, p_key text)
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((
    select coalesce(o.allow, exists (select 1 from public.level_permissions lp where lp.level_id = s.level_id and lp.perm_key = p_key))
    from public.staff_profiles s
    left join public.staff_permission_overrides o on o.user_id = s.user_id and o.perm_key = p_key
    where s.user_id = p_user and s.active and s.removed_at is null), false)
$function$;

create or replace function public.has_role(variadic roles staff_role[])
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select coalesce((
    select case when s.level_id is null then s.role = 'admin' or s.role = any(roles)
                else exists (select 1 from public.access_levels l where l.id = s.level_id and ('admin' = any(l.grants) or l.grants && roles)) end
    from public.staff_profiles s where s.user_id = auth.uid() and s.active and s.removed_at is null), false)
$function$;

create or replace function public.is_staff()
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.staff_profiles where user_id = auth.uid() and active)
$function$;

drop function if exists public.two_step_status();
drop function if exists public._two_step_ok();
drop function if exists public._is_admin_level(uuid);
