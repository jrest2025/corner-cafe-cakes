-- Release E (Settings audit, 28 Oct 2026): two-step sign-in for Admin logins. PREVIEW until "deploy".
-- An Admin who has turned on two-step sign-in (a verified authenticator-app factor) gets no permissions and no staff
-- access until the session is upgraded with a code (aal2). Everyone else is unchanged. An Admin without a factor is
-- unchanged on the server; the app makes them set it up at sign-in.
-- Lock-out safety: nothing is enforced until a factor is verified; a second phone can be added in Settings; the
-- Supabase project owner can remove a factor (Authentication, Users, the user, Multi-factor) to return to password only.
-- Nothing here changes an order, a payment, a customer or a setting value.
-- Rollback: supabase/sql/release_e_20261028_rollback.sql

create or replace function public._is_admin_level(p_user uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $f$
  select coalesce((
    select case when s.level_id is null then s.role = 'admin'
                else exists (select 1 from public.access_levels l where l.id = s.level_id and 'admin' = any(l.grants)) end
    from public.staff_profiles s where s.user_id = p_user and s.active and s.removed_at is null), false)
$f$;

-- false only for an Admin with a verified authenticator whose session has not entered a code yet
create or replace function public._two_step_ok()
 returns boolean language sql stable security definer set search_path to 'public' as $f$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
      or not public._is_admin_level(auth.uid())
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$f$;

create or replace function public._perm_of(p_user uuid, p_key text)
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select (p_user is distinct from auth.uid() or public._two_step_ok()) and coalesce((
    select coalesce(o.allow, exists (select 1 from public.level_permissions lp where lp.level_id = s.level_id and lp.perm_key = p_key))
    from public.staff_profiles s
    left join public.staff_permission_overrides o on o.user_id = s.user_id and o.perm_key = p_key
    where s.user_id = p_user and s.active and s.removed_at is null), false)
$function$;

create or replace function public.has_role(variadic roles staff_role[])
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select public._two_step_ok() and coalesce((
    select case when s.level_id is null then s.role = 'admin' or s.role = any(roles)
                else exists (select 1 from public.access_levels l where l.id = s.level_id and ('admin' = any(l.grants) or l.grants && roles)) end
    from public.staff_profiles s where s.user_id = auth.uid() and s.active and s.removed_at is null), false)
$function$;

create or replace function public.is_staff()
 returns boolean language sql stable security definer set search_path to 'public' as $function$
  select public._two_step_ok() and exists (select 1 from public.staff_profiles where user_id = auth.uid() and active)
$function$;

-- what the app needs to know at sign-in
create or replace function public.two_step_status()
 returns jsonb language sql stable security definer set search_path to 'public' as $f$
  select jsonb_build_object('ok', true,
    'required', public._is_admin_level(auth.uid()),
    'enrolled', exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified'),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'))
$f$;

revoke all on function public._is_admin_level(uuid) from public, anon, authenticated;
revoke all on function public.two_step_status() from public, anon;
grant execute on function public.two_step_status() to authenticated;
