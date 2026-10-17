-- Rollback for analytics_uploads_v1: restores dashboard_register as it was on 17 Oct 2026 and removes the upload tables.
create or replace function public.dashboard_register()
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
    begin
      if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.reports')) then
        return jsonb_build_object('ok', false, 'message', 'Your login does not have access to the dashboard.');
      end if;
      if coalesce((select at from public.reg_meta where k = 'last_rebuild'), 'epoch') < now() - interval '2 minutes' then
        perform public.register_rebuild('refresh');
      end if;
      return jsonb_build_object(
        'ok', true,
        'generated_at', now(),
        'sync', public._register_sync(),
        'master_url', (select v from public.reg_meta where k = 'master_sheet_url'),
        'left_out', (select jsonb_object_agg(review, n) from (select review, count(*) n from public.register where review <> 'ok' group by review) x),
        'tests_excluded', (select count(*) from public.register where 'test_order' = any (flags)),
        'products', (select coalesce(jsonb_agg(jsonb_build_object('n', name, 'on', status = 'active') order by sort), '[]') from public.products),
        'occasions', (select coalesce(jsonb_agg(jsonb_build_object('c', code, 'l', label) order by sort), '[]') from public.occasions where active),
        'orders', (select coalesce(jsonb_agg(jsonb_build_object(
            'k', g.rec_key, 'i', g.order_id, 'r', g.reference, 'src', g.channel, 'sys', g.source, 'st', g.status, 'cp', g.completion,
            'od', g.order_date, 'odb', g.order_date_basis,
            'odok', g.order_date is not null and g.order_date_basis <> 'Sheet entry time' and (g.fulfil_date is null or g.order_date <= g.fulfil_date),
            'pd', g.fulfil_date, 'pt', g.fulfil_time, 'fm', g.method,
            'c', g.phone_key, 'cn', g.customer,
            'it', jsonb_build_array(jsonb_build_array(coalesce(g.cake_group, 'Cake'), g.cake, g.size_inch, coalesce(g.qty, 1),
                   case when coalesce(g.qty, 1) > 0 then coalesce(g.confirmed_value, g.list_value) / coalesce(g.qty, 1) end)),
            'lv', g.list_value, 'cv', g.confirmed_value, 'paid', g.paid, 'ref', g.refunded, 'bal', g.balance,
            'wn', g.warnings, 'pay', g.extra->'pay', 'ho', g.extra->'ho', 'ra', g.extra->'ra', 'rev', coalesce((g.extra->>'rev')::int, 0),
            'cx', coalesce(g.extra->>'cx', g.status_note), 'ca', g.extra->'ca',
            'oc', coalesce(oi.occasion_code, 'not_specified'), 'ocd', oi.occasion_detail, 'cmp', o.campaign
          ) order by g.fulfil_date), '[]')
          from public.register g
          left join public.orders o on o.id = g.order_id
          left join lateral (select x.occasion_code, x.occasion_detail from public.order_items x where x.order_id = g.order_id order by x.created_at limit 1) oi on true
          where g.review = 'ok' and g.fulfil_date is not null)
      );
    end $function$;
-- drop function if exists public.analytics_import_cleaning(jsonb), public.analytics_imports(), public.analytics_import_undo(uuid), public._reg_fix(text);
-- drop table if exists public.reg_corrections, public.import_batches;
