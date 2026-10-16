-- Corner Café cakes: backup Google Sheet, version 2.
-- Five tabs: All Cake Orders (every order, including the ones imported from the old order sheets), Upcoming Production,
-- Payments, Change History, and Backup Health (written by the Sheet's script, with a row-count check and the outage steps).
-- Adds an email to the café's alert addresses when the backup has not copied for 30 minutes, once per problem,
-- and another when it works again.
-- The database stays the only master. The Sheet still pulls a read-only copy every minute; nothing can be written back.
-- Leaves out email addresses, payment card details (none are stored), passwords and access codes.
-- Runs as one block: if any check at the end fails, nothing is changed.
do $backup_v2$
begin
  alter table public.mirror_status add column if not exists alert_open_at timestamptz;
  alter table public.mirror_status add column if not exists alert_sent_at timestamptz;

  -- One row per order, in plain words. Only the database owner can read it: no staff or public access.
  execute $v$
  create or replace view public.mirror_v_orders as
  select o.id, o.reference, o.reference like 'H-%' as imported, o.created_at, o.updated_at, o.order_status, o.production_status, o.payment_status,
    case when o.reference like 'H-%' then case when o.source = 'online' then 'Online order sheet (imported)' else 'Walk-in order sheet (imported)' end
         else case o.source::text when 'online' then 'Website' when 'walk_in' then 'Walk-in' when 'phone' then 'Phone' when 'whatsapp' then 'WhatsApp' when 'social' then 'Social media'
              else initcap(replace(o.source::text, '_', ' ')) end end as source_label,
    coalesce(o.fulfilment_method, 'collection') as method, o.required_date, o.required_time,
    coalesce(nullif(trim(o.contact_name), ''), c.full_name, '') as guest, coalesce(nullif(trim(o.contact_phone), ''), c.phone, '') as phone,
    coalesce(i.variant, i.product_name, '') as cake, i.size_inch, coalesce(i.serves_label, '') as serves, coalesce(i.quantity, 1) as quantity,
    case i.finish when 'custom' then 'Custom design' else 'Standard finish' end as finish,
    coalesce(i.design_description, '') as design, coalesce(i.cake_message, '') as message, coalesce(i.candles, '') as candles, coalesce(i.occasion, '') as occasion,
    case when o.has_dietary then coalesce(nullif(concat_ws('. ', nullif(array_to_string(i.dietary, ', '), ''), nullif(i.dietary_note, '')), ''), 'Yes, see order') else 'None given' end as diet,
    coalesce(i.kitchen_notes, '') as kitchen_notes, coalesce(o.customer_notes, '') as order_notes,
    coalesce(o.delivery_zone, '') as zone, coalesce(o.delivery_address, '') as address, coalesce(o.delivery_contact, '') as receiver, coalesce(o.delivery_fee, 0) as delivery_fee,
    round(coalesce(o.final_total, o.estimate_total, 0), 2) as total, o.deposit_required,
    round(coalesce((select sum(p.amount) from public.payments p where p.order_id = o.id), 0), 2) as paid,
    coalesce(o.revision, 0) as revision, coalesce(o.kitchen_assignee, '') as made_by, coalesce(o.brief_version, 0) as slip_version
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by x.created_at limit 1) i on true
  where o.deleted_at is null and not coalesce(o.is_test, false)
  $v$;
  revoke all on public.mirror_v_orders from public, anon, authenticated;

  execute $fn$
  create or replace function public._mirror_when(t timestamptz) returns text language sql stable set search_path to 'public' as $b$
    select case when t is null then '' else to_char(t at time zone 'Pacific/Fiji', 'YYYY-MM-DD') || ' ' || public._fmt_time((t at time zone 'Pacific/Fiji')::time) end $b$
  $fn$;
  execute $fn$
  create or replace function public._mirror_day(d date) returns text language sql immutable as $b$
    select case when d is null then '' else to_char(d, 'YYYY-MM-DD') || ' (' || to_char(d, 'Dy') || ')' end $b$
  $fn$;
  execute $fn$
  create or replace function public._mirror_pay(s text) returns text language sql immutable as $b$
    select case s when 'unpaid' then 'Not paid' when 'deposit_paid' then 'Deposit paid' when 'paid' then 'Paid in full' when 'refunded' then 'Refunded'
      else coalesce(upper(left(replace(s, '_', ' '), 1)) || substr(replace(s, '_', ' '), 2), '') end $b$
  $fn$;

  -- The full copy the Sheet pulls every minute. Only service code (the sheet-mirror function) can call it.
  execute $fn$
  create or replace function public.mirror_snapshot() returns jsonb
  language plpgsql stable security definer set search_path to 'public' as $b$
  declare v_today date := (now() at time zone 'Pacific/Fiji')::date; t_all jsonb; t_up jsonb; t_pay jsonb; t_hist jsonb;
  begin
    select jsonb_build_array(jsonb_build_array('Order', 'Source', 'Ordered on', 'Status', 'Kitchen stage', 'Collect or deliver', 'Date', 'Time', 'Customer', 'Mobile',
        'Cake', 'Size (inch)', 'Quantity', 'Finish', 'Design', 'Writing on the cake', 'Candles', 'Occasion', 'Allergy or dietary', 'Kitchen instructions', 'Order notes',
        'Delivery area', 'Delivery address', 'Total (FJD)', 'Paid (FJD)', 'Balance (FJD)', 'Payment', 'Changes made', 'Last updated'))
      || coalesce(jsonb_agg(jsonb_build_array(b.reference, b.source_label, public._mirror_when(b.created_at), public._status_label(b.order_status::text),
        case when b.order_status in ('confirmed', 'completed') then public._stage_label(b.production_status::text) else '' end,
        case when b.method = 'delivery' then 'Delivery' else 'Collection' end, public._mirror_day(b.required_date), public._fmt_time(b.required_time), b.guest, b.phone,
        b.cake, coalesce(b.size_inch::text, ''), b.quantity, b.finish, b.design, b.message, b.candles, b.occasion, b.diet, b.kitchen_notes, b.order_notes,
        b.zone, b.address, b.total, b.paid, greatest(b.total - b.paid, 0), public._mirror_pay(b.payment_status::text), b.revision, public._mirror_when(b.updated_at))
        order by b.required_date desc nulls last, b.required_time desc nulls last, b.reference desc), '[]'::jsonb)
    into t_all from public.mirror_v_orders b;

    select jsonb_build_array(jsonb_build_array('Date', 'Time', 'Order', 'Status', 'Kitchen stage', 'Made by', 'Cake', 'Size (inch)', 'Serves', 'Quantity', 'Finish', 'Design',
        'Writing on the cake', 'Candles', 'Allergy or dietary', 'Kitchen instructions', 'Collect or deliver', 'Delivery area', 'Delivery address', 'Who receives it',
        'Customer', 'Mobile', 'Kitchen slip printed'))
      || coalesce(jsonb_agg(jsonb_build_array(public._mirror_day(b.required_date), public._fmt_time(b.required_time), b.reference, public._status_label(b.order_status::text),
        case when b.order_status = 'confirmed' then public._stage_label(b.production_status::text) else 'Not confirmed yet' end, b.made_by,
        b.cake, coalesce(b.size_inch::text, ''), b.serves, b.quantity, b.finish, b.design, b.message, b.candles, b.diet, b.kitchen_notes,
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
          when 'cancelled' then 'Cancelled' when 'declined' then 'Declined' when 'collected' then 'Handed over' when 'deleted' then 'Deleted' when 'fulfilment' then 'Collection or delivery changed'
          when 'candles_changed' then 'Candles changed' when 'rush_approved' then 'Short notice approved' when 'payment_recorded' then 'Payment recorded' else initcap(replace(e.kind, '_', ' ')) end,
        case e.kind
          when 'cancelled' then coalesce(e.detail->>'reason', '')
          when 'declined' then coalesce(e.detail->>'reason', '')
          when 'fulfilment' then concat_ws(', ', initcap(e.detail->>'method'), e.detail->>'zone', case when e.detail ? 'fee' then 'fee FJD ' || (e.detail->>'fee') end)
          when 'candles_changed' then coalesce(e.detail->>'from', 'None') || ' to ' || coalesce(e.detail->>'to', 'None')
          when 'payment_recorded' then concat_ws(', ', case when e.detail ? 'amount' then 'FJD ' || (e.detail->>'amount') end, e.detail->>'kind', e.detail->>'method')
          when 'created' then concat_ws(', ', 'From ' || coalesce(e.detail->>'source', ''), case when e.detail ? 'estimate' then 'estimate FJD ' || (e.detail->>'estimate') end)
          when 'quoted' then case when e.detail ? 'price' then 'FJD ' || (e.detail->>'price') else '' end
          else '' end,
        coalesce(e.actor_label, ''), '', ''
      from public.order_events e join public.orders o on o.id = e.order_id
      where not coalesce(o.is_test, false) and o.reference not like 'H-%'
        and e.kind in ('created', 'confirmed', 'awaiting_deposit', 'quoted', 'cancelled', 'declined', 'collected', 'deleted', 'fulfilment', 'candles_changed', 'rush_approved', 'payment_recorded')
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
  end $b$
  $fn$;
  revoke all on function public.mirror_snapshot() from public, anon, authenticated;

  -- Every 5 minutes: email the café's alert addresses when the Sheet has not copied for 30 minutes (once per problem), and when it works again
  execute $fn$
  create or replace function public.mirror_watch() returns text
  language plpgsql security definer set search_path to 'public' as $b$
  declare m public.mirror_status; v_to text[]; v_bad boolean;
  begin
    select * into m from public.mirror_status where id = 1;
    if m.last_ack_at is null then return 'not set up'; end if;
    v_bad := now() - m.last_ack_at > interval '30 minutes';
    select public._split_emails(alert_email) into v_to from public.locations where code = 'corner-cafe';
    if v_to is null or cardinality(v_to) = 0 then return 'no alert address'; end if;
    if v_bad and m.alert_open_at is null then
      insert into public.email_outbox (kind, to_email, cc, dedupe_key) values ('ops_backup_alert', v_to[1], coalesce(v_to[2:], '{}'), 'backup-alert-' || extract(epoch from now())::bigint);
      update public.mirror_status set alert_open_at = now(), alert_sent_at = now() where id = 1;
      return 'alert sent';
    elsif not v_bad and m.alert_open_at is not null then
      insert into public.email_outbox (kind, to_email, cc, dedupe_key) values ('ops_backup_ok', v_to[1], coalesce(v_to[2:], '{}'), 'backup-ok-' || extract(epoch from now())::bigint);
      update public.mirror_status set alert_open_at = null where id = 1;
      return 'recovered';
    end if;
    return case when v_bad then 'still failing, already told' else 'working' end;
  end $b$
  $fn$;
  revoke all on function public.mirror_watch() from public, anon, authenticated;

  perform cron.unschedule(jobid) from cron.job where jobname = 'cakes-backup-watch';
  perform cron.schedule('cakes-backup-watch', '*/5 * * * *', 'select public.mirror_watch()');

  -- Checks
  if (select jsonb_array_length(public.mirror_snapshot()->'order')) <> 4 then raise exception 'Backup copy does not have its four order tabs'; end if;
  if (select (public.mirror_snapshot()->'counts'->>'All Cake Orders')::int) < (select count(*) from public.orders where deleted_at is null and not coalesce(is_test, false)) then
    raise exception 'Backup copy is missing orders';
  end if;
  if has_function_privilege('anon', 'public.mirror_snapshot()', 'execute') or has_function_privilege('authenticated', 'public.mirror_snapshot()', 'execute') then
    raise exception 'Backup copy would be readable by staff or the public';
  end if;
  if has_table_privilege('anon', 'public.mirror_v_orders', 'select') or has_table_privilege('authenticated', 'public.mirror_v_orders', 'select') then
    raise exception 'Order view would be readable by staff or the public';
  end if;
  if not exists (select 1 from cron.job where jobname = 'cakes-backup-watch') then raise exception 'Backup watch is not scheduled'; end if;
  raise notice 'Backup Sheet version 2 installed.';
end $backup_v2$;

select 'Backup Sheet version 2 installed' as result,
  (select public.mirror_snapshot()->'counts') as rows_per_tab;
