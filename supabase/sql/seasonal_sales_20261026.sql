-- Analytics: Seasonal sales (treats on orders), 26 October 2026. Read only.
-- Roneel: "this has to be in the analytics as well because Bhavin and executives will want to know how much was sold".
-- A sale counts on its pickup day (the same rule as cakes). Cancelled, declined, deleted and test orders are left out.
-- "Collected" = order completed; "Booked" = still to be collected.
create or replace function public.crm_seasonal_sales()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date;
begin
  if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.reports')) then return public._err('forbidden', 'Your login cannot see Analytics.'); end if;
  return (
    with t as (
      select x.name, x.quantity q, x.unit_price * x.quantity v, o.id oid, o.required_date d, o.source::text src,
        o.order_status = 'completed' as collected
      from public.order_extras x join public.orders o on o.id = x.order_id
      where o.deleted_at is null and not coalesce(o.is_test, false) and o.order_status not in ('declined', 'cancelled')
    ), first_day as (select min(d) f from t)
    select jsonb_build_object('ok', true, 'today', v_today,
      'summary', jsonb_build_object(
        'items', coalesce((select sum(q) from t), 0),
        'value', coalesce((select sum(v) from t), 0),
        'collected_value', coalesce((select sum(v) from t where collected), 0),
        'booked_value', coalesce((select sum(v) from t where not collected), 0),
        'orders', (select count(distinct oid) from t),
        'cake_orders', (select count(*) from public.orders o where o.deleted_at is null and not coalesce(o.is_test, false)
          and o.order_status not in ('declined', 'cancelled') and o.required_date >= coalesce((select f from first_day), v_today))),
      'items', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', qq, 'value', vv) order by vv desc, name)
        from (select name, sum(q) qq, sum(v) vv from t group by name) s), '[]'),
      'weeks', coalesce((select jsonb_agg(jsonb_build_object('week', wk, 'collected', c, 'booked', b) order by wk)
        from (select date_trunc('week', d)::date wk, sum(v) filter (where collected) c, sum(v) filter (where not collected) b from t group by 1) w), '[]'),
      'sources', coalesce((select jsonb_object_agg(src, vv) from (select case when src = 'online' then 'website' else 'counter' end src, sum(v) vv from t group by 1) s), '{}'))
  );
end $$;
grant execute on function public.crm_seasonal_sales() to authenticated;
