-- Executive dashboard: read-only data feed for the staff app.
-- Test orders are flagged and left out. Only admins and the marketing role can read it.

alter table public.orders add column if not exists is_test boolean not null default false;
update public.orders set is_test = true where reference in ('CC-1001', 'CC-1007');

create or replace function public.dashboard_data()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare out jsonb;
begin
  if not public.has_role('marketing') then
    return jsonb_build_object('ok', false, 'message', 'Your login does not have access to the dashboard.');
  end if;
  select jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'last_change', greatest((select max(updated_at) from public.orders), (select max(recorded_at) from public.payments)),
    'tests_excluded', (select count(*) from public.orders where is_test),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('n', name, 'on', status = 'active') order by sort), '[]') from public.products),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object(
        'i', o.id, 'r', o.reference, 'src', o.source, 'st', o.order_status, 'ps', o.payment_status, 'fm', o.fulfilment_method,
        'od', (o.created_at at time zone 'Pacific/Fiji')::date,
        'odok', not (o.reference like 'H-%' and (o.created_at at time zone 'Pacific/Fiji')::date > o.required_date),
        'pd', o.required_date, 'pt', to_char(o.required_time, 'HH24:MI'),
        'est', o.estimate_total, 'fin', o.final_total, 'fee', o.delivery_fee,
        'imp', o.reference like 'H-%', 'rev', coalesce(o.revision, 0), 'rush', o.rush_override,
        'c', o.customer_id, 'cn', c.full_name,
        'cx', coalesce(o.decline_reason, (select e.detail->>'note' from public.order_events e where e.order_id = o.id and e.kind in ('cancelled', 'declined') order by e.at desc limit 1)),
        'ca', (coalesce(o.cancelled_at, o.updated_at) at time zone 'Pacific/Fiji')::date,
        'ho', o.handed_over_at, 'ra', o.ready_at,
        'it', (select coalesce(jsonb_agg(jsonb_build_array(i.product_name, i.variant, i.size_inch, i.quantity, i.unit_price) order by i.created_at), '[]') from public.order_items i where i.order_id = o.id),
        'pay', (select jsonb_agg(jsonb_build_array(p.kind, p.amount, (p.recorded_at at time zone 'Pacific/Fiji')::date)) from public.payments p where p.order_id = o.id)
      ) order by o.required_date), '[]')
      from public.orders o left join public.customers c on c.id = o.customer_id
      where not o.is_test)
  ) into out;
  return out;
end $$;
revoke all on function public.dashboard_data() from public, anon;
grant execute on function public.dashboard_data() to authenticated;
