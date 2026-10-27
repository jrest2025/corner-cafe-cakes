-- Release D (Settings audit, 28 Oct 2026): payment methods and lead-time bands as settings. PREVIEW until "deploy".
-- Stored in app_config (values are JSON text). get_order_setup also returns them (additive). Two save functions check
-- the Settings permission, validate, and record the change in the settings history.
-- Nothing here changes an order, a payment or a customer. Past payments keep their method.
-- Rollback: supabase/sql/release_d_20261028_rollback.sql

insert into public.app_config (key, value) values
  ('payment_methods', '[{"code":"cash","label":"Cash","active":true},{"code":"eftpos","label":"EFTPOS","active":true},{"code":"mpaisa","label":"M-PAiSA","active":true},{"code":"bank_transfer","label":"Bank transfer","active":true},{"code":"other","label":"Other","active":false}]'),
  ('lead_bands', '[{"min":0,"max":3},{"min":4,"max":7},{"min":8,"max":14},{"min":15,"max":30},{"min":31,"max":null}]')
on conflict (key) do nothing;

do $m$
declare d text; n text;
begin
  d := pg_get_functiondef('public.get_order_setup(text)'::regprocedure);
  n := replace(d, $a$    'ok', true,
    'occasions',$a$, $b$    'ok', true,
    'payment_methods', coalesce((select value::jsonb from public.app_config where key = 'payment_methods'), '[]'),
    'lead_bands', coalesce((select value::jsonb from public.app_config where key = 'lead_bands'), '[]'),
    'occasions',$b$);
  if n = d then raise exception 'get_order_setup anchor not found'; end if;
  execute n;
end $m$;

create or replace function public.settings_payment_methods_save(p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_old jsonb; v_new jsonb := '[]'; x jsonb; v_codes text[] := '{}'; v_label text;
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change payment methods.'); end if;
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) = 0 then return public._err('invalid', 'Nothing to save.'); end if;
  for x in select * from jsonb_array_elements(p) loop
    if coalesce(x->>'code', '') not in (select unnest(enum_range(null::public.payment_method))::text) then
      return public._err('invalid', 'Unknown payment method.');
    end if;
    if (x->>'code') = any(v_codes) then return public._err('invalid', 'Each payment method once only.'); end if;
    v_codes := v_codes || (x->>'code');
    v_label := btrim(regexp_replace(coalesce(x->>'label', ''), '\s+', ' ', 'g'));
    if length(v_label) < 2 or length(v_label) > 30 then return public._err('label', 'Each name needs 2 to 30 characters.'); end if;
    v_new := v_new || jsonb_build_array(jsonb_build_object('code', x->>'code', 'label', v_label, 'active', coalesce((x->>'active')::boolean, false)));
  end loop;
  if not exists (select 1 from jsonb_array_elements(v_new) y where (y->>'active')::boolean) then
    return public._err('active', 'Keep at least one payment method on.');
  end if;
  select value::jsonb into v_old from public.app_config where key = 'payment_methods';
  -- methods missing from the list stay available to history but switched off
  for x in select to_jsonb(e::text) from unnest(enum_range(null::public.payment_method)) e loop
    if not ((x #>> '{}') = any(v_codes)) then
      v_new := v_new || jsonb_build_array(jsonb_build_object('code', x #>> '{}', 'label', coalesce((select y->>'label' from jsonb_array_elements(v_old) y where y->>'code' = x #>> '{}'), initcap(replace(x #>> '{}', '_', ' '))), 'active', false));
    end if;
  end loop;
  update public.app_config set value = v_new::text where key = 'payment_methods';
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), 'app_config', 'payment_methods', 'update', jsonb_build_object('methods', v_old), jsonb_build_object('methods', v_new));
  return jsonb_build_object('ok', true, 'payment_methods', v_new);
end $function$;

create or replace function public.settings_lead_bands_save(p jsonb)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_old jsonb; v_new jsonb := '[]'; i int; v_n int; v_min int := 0; v_max int;
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change the lead-time groups.'); end if;
  -- p = the upper day of every group but the last, for example [3, 7, 14, 30]: groups 0-3, 4-7, 8-14, 15-30, 31+
  if jsonb_typeof(p) <> 'array' then return public._err('invalid', 'Nothing to save.'); end if;
  v_n := jsonb_array_length(p);
  if v_n < 1 or v_n > 6 then return public._err('count', 'Use 2 to 7 groups.'); end if;
  for i in 0 .. v_n - 1 loop
    if coalesce(p->>i, '') !~ '^\d{1,3}$' then return public._err('invalid', 'Use whole days.'); end if;
    v_max := (p->>i)::int;
    if v_max < v_min then return public._err('order', 'Each group must end after the one before.'); end if;
    v_new := v_new || jsonb_build_array(jsonb_build_object('min', v_min, 'max', v_max));
    v_min := v_max + 1;
  end loop;
  v_new := v_new || jsonb_build_array(jsonb_build_object('min', v_min, 'max', null));
  select value::jsonb into v_old from public.app_config where key = 'lead_bands';
  update public.app_config set value = v_new::text where key = 'lead_bands';
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), 'app_config', 'lead_bands', 'update', jsonb_build_object('groups', v_old), jsonb_build_object('groups', v_new));
  return jsonb_build_object('ok', true, 'lead_bands', v_new);
end $function$;

revoke all on function public.settings_payment_methods_save(jsonb) from public, anon;
revoke all on function public.settings_lead_bands_save(jsonb) from public, anon;
grant execute on function public.settings_payment_methods_save(jsonb) to authenticated;
grant execute on function public.settings_lead_bands_save(jsonb) to authenticated;
