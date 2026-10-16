-- Backup Google Sheet: a "Cake requirements" column (eggless, gluten-free, dairy-free, vegan, other) right after "Allergy or dietary",
-- Prepared and applied 17 Oct 2026 at publish (approved by Roneel). First Sheet copy after it: 11:34 AM Fiji, no error.
-- The Sheet's script (google-sheet/CakeBackup.gs) sizes every tab from the data, rebuilds the filter and finds money columns by header,
-- so it needs no change: the next one-minute copy shows the new column. Only mirror_snapshot() changes, plus one new helper.
-- The old v1 backup (sheet_backup_rows_data, never linked) is left as it is.

-- Cake requirements of an order's first cake, in plain words (the same item the backup already reads for the other cake columns)
create or replace function public._mirror_reqs(p_order uuid)
returns text language sql stable set search_path to 'public' as $$
  select coalesce((
    select array_to_string(array(
      select case r when 'eggless' then 'Eggless (vegetarian)' when 'gluten_free' then 'Gluten-free' when 'dairy_free' then 'Dairy-free'
                    when 'vegan' then 'Vegan (no egg, no dairy)' when 'other' then coalesce(nullif(trim(x.requirements_note), ''), 'Other') else r end
      from unnest(x.requirements) with ordinality u(r, k) order by k), ', ')
    from public.order_items x where x.order_id = p_order order by x.created_at limit 1), '');
$$;
-- Runs with the caller's rights: called directly by the website or app it sees only what row security allows; mirror_snapshot (owner rights) sees all.

CREATE OR REPLACE FUNCTION public.mirror_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  declare v_today date := (now() at time zone 'Pacific/Fiji')::date; t_all jsonb; t_up jsonb; t_pay jsonb; t_hist jsonb;
  begin
    select jsonb_build_array(jsonb_build_array('Order', 'Source', 'Ordered on', 'Status', 'Kitchen stage', 'Collect or deliver', 'Date', 'Time', 'Customer', 'Mobile',
        'Cake', 'Size (inch)', 'Serves or size agreed', 'Quantity', 'Finish', 'Design', 'Writing on the cake', 'Candles', 'Occasion', 'Allergy or dietary', 'Cake requirements', 'Kitchen instructions', 'Order notes',
        'Delivery area', 'Delivery address', 'Who receives it', 'Delivery fee (FJD)', 'Total (FJD)', 'Paid (FJD)', 'Balance (FJD)', 'Payment', 'Changes made', 'Last updated'))
      || coalesce(jsonb_agg(jsonb_build_array(b.reference, b.source_label, public._mirror_when(b.created_at), public._status_label(b.order_status::text),
        case when b.order_status in ('confirmed', 'completed') then public._stage_label(b.production_status::text) else '' end,
        case when b.method = 'delivery' then 'Delivery' else 'Collection' end, public._mirror_day(b.required_date), public._fmt_time(b.required_time), b.guest, b.phone,
        b.cake, coalesce(b.size_inch::text, ''), b.serves, b.quantity, b.finish, b.design, b.message, b.candles, b.occasion, b.diet, public._mirror_reqs(b.id), b.kitchen_notes, b.order_notes,
        b.zone, b.address, b.receiver, case when b.method = 'delivery' then b.delivery_fee end, b.total, b.paid,
        case when b.order_status in ('cancelled', 'declined') then 0 else greatest(b.total - b.paid, 0) end,
        public._mirror_pay(b.payment_status::text), b.revision, public._mirror_when(b.updated_at))
        order by b.required_date desc nulls last, b.required_time desc nulls last, b.reference desc), '[]'::jsonb)
    into t_all from public.mirror_v_orders b;

    select jsonb_build_array(jsonb_build_array('Date', 'Time', 'Order', 'Status', 'Kitchen stage', 'Made by', 'Cake', 'Size (inch)', 'Serves', 'Quantity', 'Finish', 'Design',
        'Writing on the cake', 'Candles', 'Allergy or dietary', 'Cake requirements', 'Kitchen instructions', 'Collect or deliver', 'Delivery area', 'Delivery address', 'Who receives it',
        'Customer', 'Mobile', 'Kitchen slip printed'))
      || coalesce(jsonb_agg(jsonb_build_array(public._mirror_day(b.required_date), public._fmt_time(b.required_time), b.reference, public._status_label(b.order_status::text),
        case when b.order_status = 'confirmed' then public._stage_label(b.production_status::text) else 'Not confirmed yet' end, b.made_by,
        b.cake, coalesce(b.size_inch::text, ''), b.serves, b.quantity, b.finish, b.design, b.message, b.candles, b.diet, public._mirror_reqs(b.id), b.kitchen_notes,
        case when b.method = 'delivery' then 'Delivery' else 'Collection' end, b.zone, b.address, b.receiver, b.guest, b.phone,
        case when b.slip_version > 0 then 'Yes, version ' || b.slip_version else 'No' end)
        order by b.required_date, b.required_time, b.reference), '[]'::jsonb)
    into t_up from public.mirror_v_orders b
    where b.required_date >= v_today and b.order_status not in ('completed', 'cancelled', 'declined');

    select jsonb_build_array(jsonb_build_array('Order', 'Customer', 'Date', 'Status', 'Payment', 'Total (FJD)', 'Deposit required (FJD)', 'Paid (FJD)', 'Balance (FJD)',
        'Delivery fee (FJD)', 'Payments recorded'))
      || coalesce(jsonb_agg(jsonb_build_array(b.reference, b.guest, public._mirror_day(b.required_date), public._status_label(b.order_status::text), public._mirror_pay(b.payment_status::text),
        b.total, coalesce(b.deposit_required::text, ''), b.paid, case when b.order_status in ('cancelled', 'declined') then 0 else greatest(b.total - b.paid, 0) end, b.delivery_fee,
        coalesce((select string_agg(public._mirror_when(p.recorded_at) || ': FJD ' || to_char(p.amount, 'FM999990.00') || ' ' || replace(p.kind::text, '_', ' ') || ', ' || replace(p.method::text, '_', ' ')
          || coalesce(' (' || nullif(p.reference, '') || ')', ''), '; ' order by p.recorded_at) from public.payments p where p.order_id = b.id), ''))
        order by b.required_date desc nulls last, b.reference desc), '[]'::jsonb)
    into t_pay from public.mirror_v_orders b
    where not b.imported or b.paid > 0;

    with h as (
      select a.amended_at as at, a.reference, 'Changed (revision ' || a.revision || ')' as what,
        coalesce((select string_agg((e->>'label') || ': ' || coalesce(e->>'from', '') || ' to ' || coalesce(e->>'to', ''), '; ') from jsonb_array_elements(a.changes) e), '') as detail,
        coalesce(a.staff_label, '') as who, case a.requested_by when 'guest' then 'Customer' when 'staff' then 'Our team' else 'Someone else' end as asked, coalesce(a.reason, '') as reason
      from public.order_amendments a join public.orders o on o.id = a.order_id
      where o.deleted_at is null and not coalesce(o.is_test, false)
      union all
      select e.at, o.reference,
        case e.kind when 'created' then 'Order created' when 'confirmed' then 'Confirmed' when 'awaiting_deposit' then 'Confirmed, waiting for deposit' when 'quoted' then 'Price set'
          when 'quote_sent' then 'Price sent to customer' when 'brief_printed' then 'Kitchen slip printed' when 'stage' then 'Kitchen progress'
          when 'cancelled' then 'Cancelled' when 'declined' then 'Declined' when 'collected' then 'Handed over' when 'deleted' then 'Deleted' when 'fulfilment' then 'Collection or delivery changed'
          when 'candles_changed' then 'Candles changed' when 'rush_approved' then 'Short notice approved' when 'payment_recorded' then 'Payment recorded' else initcap(replace(e.kind, '_', ' ')) end,
        case e.kind
          when 'cancelled' then coalesce(e.detail->>'note', e.detail->>'reason', '')
          when 'declined' then coalesce(e.detail->>'note', e.detail->>'reason', '')
          when 'deleted' then coalesce(e.detail->>'reason', e.detail->>'note', '')
          when 'fulfilment' then concat_ws(', ', initcap(e.detail->>'method'), e.detail->>'zone', case when e.detail ? 'fee' then 'fee FJD ' || (e.detail->>'fee') end)
          when 'candles_changed' then coalesce(e.detail->>'from', 'None') || ' to ' || coalesce(e.detail->>'to', 'None')
          when 'payment_recorded' then concat_ws(', ', case when e.detail ? 'amount' then 'FJD ' || (e.detail->>'amount') end, e.detail->>'kind', e.detail->>'method')
          when 'created' then concat_ws(', ', 'From ' || coalesce(e.detail->>'source', ''), case when e.detail ? 'estimate' then 'estimate FJD ' || (e.detail->>'estimate') end)
          when 'quoted' then case when e.detail ? 'price' then 'FJD ' || (e.detail->>'price') else '' end
          when 'quote_sent' then case when e.detail ? 'total' then 'FJD ' || (e.detail->>'total') else '' end
          when 'brief_printed' then case when e.detail ? 'version' then 'Version ' || (e.detail->>'version') else '' end
          when 'stage' then concat_ws(' to ', public._stage_label(e.detail->>'from'), public._stage_label(e.detail->>'to'))
          when 'collected' then coalesce('To ' || nullif(e.detail->>'to', ''), '')
          else '' end,
        coalesce(e.actor_label, ''), '',
        case when e.kind in ('cancelled', 'declined', 'deleted') then coalesce(e.detail->>'note', e.detail->>'reason', '') else '' end
      from public.order_events e join public.orders o on o.id = e.order_id
      where not coalesce(o.is_test, false) and o.reference not like 'H-%'
        and e.kind in ('created', 'confirmed', 'awaiting_deposit', 'quoted', 'quote_sent', 'brief_printed', 'stage', 'cancelled', 'declined', 'collected', 'deleted',
                       'fulfilment', 'candles_changed', 'rush_approved', 'payment_recorded')
    )
    select jsonb_build_array(jsonb_build_array('When', 'Order', 'What happened', 'Details', 'By', 'Asked by', 'Reason'))
      || coalesce((select jsonb_agg(jsonb_build_array(public._mirror_when(x.at), x.reference, x.what, x.detail, x.who, x.asked, x.reason) order by x.at desc)
                   from (select * from h order by at desc limit 3000) x), '[]'::jsonb)
    into t_hist;

    return jsonb_build_object(
      'generated_at', now(),
      'generated_label', to_char(now() at time zone 'Pacific/Fiji', 'Dy DD Mon YYYY') || ', ' || public._fmt_time((now() at time zone 'Pacific/Fiji')::time),
      'order', jsonb_build_array('All Cake Orders', 'Upcoming Production', 'Payments', 'Change History'),
      'tabs', jsonb_build_object('All Cake Orders', t_all, 'Upcoming Production', t_up, 'Payments', t_pay, 'Change History', t_hist),
      'counts', jsonb_build_object('All Cake Orders', jsonb_array_length(t_all) - 1, 'Upcoming Production', jsonb_array_length(t_up) - 1,
                                   'Payments', jsonb_array_length(t_pay) - 1, 'Change History', jsonb_array_length(t_hist) - 1),
      'procedure', jsonb_build_array(
        jsonb_build_array('If the staff app is down', 'Open this Sheet from Google Drive. Upcoming Production lists every cake still to make, by date and time, with the writing, allergies and kitchen instructions. Check Last successful copy above: anything changed after that time is not in this Sheet.'),
        jsonb_build_array('Payments', 'The Payments tab shows each order''s total, deposit, what has been paid and what is still owed, with every recorded payment.'),
        jsonb_build_array('New orders while it is down', 'Write each new order or change in the Downtime orders tab: one line each. Do not type in the other tabs: they are rewritten every minute.'),
        jsonb_build_array('When the app is back', 'Enter each line from Downtime orders into the staff app (New order, or Change order for a change). Then type the order number in the Entered as column. A manager checks that every line has an order number.'),
        jsonb_build_array('Who can see this Sheet', 'Managers only. It holds customer mobile numbers and allergies. Never share it with a public link.'))
    );
  end $function$;
