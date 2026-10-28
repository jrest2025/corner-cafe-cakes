-- Fix (28 Oct 2026, 8:50 PM): customer profiles showed "Your login cannot see this customer" for every login.
-- Cause: release_a_20261028 revoked app_config from authenticated (it holds secret keys); the customer_summary view
-- (security_invoker) read four plain number settings from app_config, so every read of the view was refused.
-- Fix: a read-only helper returns only those four settings; the view reads through it. app_config stays locked.
-- Rollback: supabase/sql/fix_customer_summary_config_20261028_rollback.sql (restores the previous view text).
create or replace function public._cfg_public(p_key text)
 returns text language sql stable security definer set search_path to 'public' as $f$
  select value from public.app_config
  where key = p_key and p_key in ('retarget_lead_days', 'retarget_window_days', 'high_value_spend', 'inactive_days')
$f$;
revoke all on function public._cfg_public(text) from public, anon;
grant execute on function public._cfg_public(text) to authenticated;

do $m$
declare d text; n text; k text;
begin
  d := pg_get_viewdef('public.customer_summary'::regclass);
  n := d;
  foreach k in array array['retarget_lead_days', 'retarget_window_days', 'inactive_days'] loop
    n := replace(n, format($x$( SELECT (app_config.value)::integer AS value
                   FROM app_config
                  WHERE (app_config.key = '%s'::text))$x$, k), format($y$(public._cfg_public('%s'))::integer$y$, k));
    n := replace(n, format($x$( SELECT (app_config.value)::integer AS value
           FROM app_config
          WHERE (app_config.key = '%s'::text))$x$, k), format($y$(public._cfg_public('%s'))::integer$y$, k));
  end loop;
  n := replace(n, $x$( SELECT (app_config.value)::numeric AS value
           FROM app_config
          WHERE (app_config.key = 'high_value_spend'::text))$x$, $y$(public._cfg_public('high_value_spend'))::numeric$y$);
  if n = d or position('app_config' in n) > 0 then raise exception 'customer_summary: app_config reads not all replaced'; end if;
  execute 'create or replace view public.customer_summary with (security_invoker = true) as ' || n;
end $m$;
