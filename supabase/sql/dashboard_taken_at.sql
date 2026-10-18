-- Analytics: measure "order date" from when the customer actually ordered (taken_at, set by
-- Order Taken Date), falling back to when it was entered (created_at). 18 October 2026.
-- Only the two 'od' / 'odok' lines change; everything else is the live definition as read today.
-- CREATE OR REPLACE keeps the existing grants. To undo: run the same file with taken_at removed.
CREATE OR REPLACE FUNCTION public.dashboard_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare out jsonb;
begin
  if not public.has_perm('mgmt.analytics') then
    return jsonb_build_object('ok', false, 'message', 'Your login does not have access to the dashboard.');
  end if;
  select jsonb_build_object(
    'ok', true,
    'generated_at', now(),
    'last_change', greatest((select max(updated_at) from public.orders), (select max(recorded_at) from public.payments)),
    'tests_excluded', (select count(*) from public.orders where is_test and deleted_at is null),
    'products', (select coalesce(jsonb_agg(jsonb_build_object('n', name, 'on', status = 'active') order by sort), '[]') from public.products),
    'orders', (select coalesce(jsonb_agg(jsonb_build_object(
        'i', o.id, 'r', o.reference, 'src', o.source, 'st', o.order_status, 'ps', o.payment_status, 'fm', o.fulfilment_method,
        'od', (coalesce(o.taken_at, o.created_at) at time zone 'Pacific/Fiji')::date,
        'odok', not (o.reference like 'H-%' and (coalesce(o.taken_at, o.created_at) at time zone 'Pacific/Fiji')::date > o.required_date),
        'pd', o.required_date, 'pt', to_char(o.required_time, 'HH24:MI'),
        'est', o.estimate_total, 'fin', o.final_total, 'fee', o.delivery_fee,
        'imp', o.reference like 'H-%', 'rev', coalesce(o.revision, 0), 'rush', o.rush_override,
        'c', o.customer_id, 'cn', o.contact_name,
        'cx', coalesce(o.decline_reason, (select e.detail->>'note' from public.order_events e where e.order_id = o.id and e.kind in ('cancelled', 'declined') order by e.at desc limit 1)),
        'ca', (coalesce(o.cancelled_at, o.updated_at) at time zone 'Pacific/Fiji')::date,
        'ho', o.handed_over_at, 'ra', o.ready_at,
        'it', (select coalesce(jsonb_agg(jsonb_build_array(i.product_name, i.variant, i.size_inch, i.quantity, i.unit_price) order by i.created_at), '[]') from public.order_items i where i.order_id = o.id),
        'pay', (select jsonb_agg(jsonb_build_array(p.kind, p.amount, (p.recorded_at at time zone 'Pacific/Fiji')::date)) from public.payments p where p.order_id = o.id)
      ) order by o.required_date), '[]')
      from public.orders o left join public.customers c on c.id = o.customer_id
      where not o.is_test and o.deleted_at is null)
  ) into out;
  return out;
end $function$;
