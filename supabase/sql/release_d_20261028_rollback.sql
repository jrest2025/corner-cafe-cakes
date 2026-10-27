-- Rollback for release_d_20261028.sql (the two settings rows are kept; nothing reads them after this).
drop function if exists public.settings_payment_methods_save(jsonb);
drop function if exists public.settings_lead_bands_save(jsonb);
do $m$
declare d text; n text;
begin
  d := pg_get_functiondef('public.get_order_setup(text)'::regprocedure);
  n := replace(d, $a$
    'payment_methods', coalesce((select value::jsonb from public.app_config where key = 'payment_methods'), '[]'),
    'lead_bands', coalesce((select value::jsonb from public.app_config where key = 'lead_bands'), '[]'),$a$, '');
  if n = d then raise exception 'block not found'; end if;
  execute n;
end $m$;
