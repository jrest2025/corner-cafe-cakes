-- Corner Cafe Cakes: schema-only recovery snapshot of Supabase project ilbrfwxblhidtlsjgxlh (public schema).
-- Snapshot taken 2026-10-12. No row data, no customer data, no app_config values.
-- Source: pg_get_functiondef for every function in schema public (prokind = f), ordered by name. 42 functions.

-- function: _create_order
CREATE OR REPLACE FUNCTION public._create_order(p jsonb, p_source order_source, p_actor uuid, p_label text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  loc public.locations; prod public.products; sz public.product_sizes; ex public.orders;
  v_staff boolean := p_source <> 'online';
  v_variant text; v_finish text; v_date date; v_time time; v_today date; v_now time;
  v_lead int; v_qty int; v_total numeric; v_cust uuid; v_order uuid; v_ref text;
  v_status public.order_status; v_diet text[]; v_bad text; v_rush boolean := false; v_rush_reason text;
  v_name text; v_phone text; v_key text; v_email text; v_cust_email text; v_opt boolean; v_count int;
  v_path text; v_mins int; v_deposit numeric; v_pay jsonb; v_res jsonb; v_msg text; v_dietary_answer text; v_del jsonb;
begin
  if nullif(p->>'idempotency_key', '') is not null then
    select * into ex from public.orders where idempotency_key = (p->>'idempotency_key')::uuid;
    if found then
      return jsonb_build_object('ok', true, 'duplicate', true, 'order_id', ex.id, 'reference', ex.reference,
                                'status', ex.order_status, 'estimate', ex.estimate_total);
    end if;
  end if;

  select * into loc from public.locations where code = coalesce(nullif(p->>'location', ''), 'corner-cafe') and active;
  if not found then return public._err('location', 'This location is not taking cake orders.'); end if;
  if not v_staff and not loc.accepts_online then
    return public._err('online_closed', 'Online cake orders are paused right now. Please call us on ' || coalesce(loc.phone, 'the cafe') || '.');
  end if;

  -- Cake
  select * into prod from public.products where code = p->>'product_code' and status = 'active';
  if not found then return public._err('product', 'Choose a cake.', 'product'); end if;
  v_variant := nullif(trim(coalesce(p->>'variant', '')), '');
  if exists (select 1 from public.product_variants where product_id = prod.id and active) then
    if v_variant is null or not exists (select 1 from public.product_variants where product_id = prod.id and active and name = v_variant) then
      return public._err('variant', 'Choose one: ' || (select string_agg(name, ', ' order by sort, name) from public.product_variants where product_id = prod.id and active) || '.', 'variant');
    end if;
  else v_variant := null;
  end if;
  select * into sz from public.product_sizes where product_id = prod.id and size_inch = (p->>'size_inch')::int and active;
  if not found then return public._err('size', 'Choose a size.', 'size'); end if;
  v_qty := case when v_staff then greatest(1, least(50, coalesce((p->>'quantity')::int, 1))) else 1 end;

  -- Finish and details
  v_finish := coalesce(nullif(p->>'finish', ''), 'standard');
  if v_finish not in ('standard','custom') then return public._err('finish', 'Choose Standard finish or Custom design.', 'finish'); end if;
  if v_finish = 'custom' and not prod.supports_custom then return public._err('finish', prod.name || ' is not available as a custom design. Choose Standard finish.', 'finish'); end if;
  if v_finish = 'custom' and length(trim(coalesce(p->>'design', ''))) < 3 then return public._err('design', 'Describe the design so our team can quote it.', 'design'); end if;
  v_msg := nullif(trim(coalesce(p->>'message', '')), '');
  if v_msg is not null and not prod.supports_message then return public._err('message', prod.name || ' does not take a written message.', 'message'); end if;
  if length(coalesce(v_msg, '')) > 40 then return public._err('message', 'Keep the cake message to 40 characters.', 'message'); end if;
  v_dietary_answer := p->>'has_dietary';
  if v_dietary_answer is null or v_dietary_answer not in ('yes','no') then return public._err('diet', 'Please answer the dietary question.', 'diet'); end if;
  select coalesce(array_agg(distinct x), '{}') into v_diet from jsonb_array_elements_text(coalesce(p->'dietary', '[]')) x;
  select x into v_bad from unnest(v_diet) x where x not in ('Vegetarian (eggless)','Gluten-free','Nut allergy','Other') limit 1;
  if v_bad is not null then return public._err('diet', 'Unknown dietary option.', 'diet'); end if;
  if v_dietary_answer = 'yes' and cardinality(v_diet) = 0 and length(trim(coalesce(p->>'dietary_note', ''))) = 0 then
    return public._err('diet', 'Tell us which dietary need or allergy applies.', 'diet');
  end if;
  if v_dietary_answer = 'no' then v_diet := '{}'; end if;

  -- Date and time, in the location's own time zone
  v_date := (p->>'date')::date;
  v_time := (p->>'time')::time;
  if v_date is null then return public._err('date', 'Choose a collection date.', 'date'); end if;
  if v_time is null then return public._err('time', 'Choose a collection time.', 'time'); end if;
  v_today := (now() at time zone loc.timezone)::date;
  v_now := (now() at time zone loc.timezone)::time;
  v_lead := case when v_finish = 'custom' then loc.lead_days_custom else coalesce(prod.lead_days, loc.lead_days_standard) end;
  if v_date < v_today or (v_date = v_today and v_time <= v_now) then return public._err('date', 'That time has already passed.', 'date'); end if;
  if v_date < v_today + v_lead then
    if v_staff and length(trim(coalesce(p->'rush'->>'reason', ''))) >= 3 then
      v_rush := true; v_rush_reason := trim(p->'rush'->>'reason');
    else
      return public._err('date', format('This cake needs %s days'' notice. The earliest date is %s.', v_lead, to_char(v_today + v_lead, 'FMDay FMDD FMMonth')),
                         'date', jsonb_build_object('min_date', v_today + v_lead, 'rush_allowed', v_staff));
    end if;
  end if;
  if v_date > v_today + loc.max_days_ahead then return public._err('date', format('We take cake orders up to %s days ahead.', loc.max_days_ahead), 'date'); end if;
  if exists (select 1 from public.closed_dates where location_id = loc.id and closed_on = v_date) then
    return public._err('date', 'We are closed for cake collections on that day. Please choose another date.', 'date');
  end if;
  if v_time < loc.collection_open or v_time > loc.collection_close then
    return public._err('time', format('Collection is between %s and %s.', lower(to_char(loc.collection_open, 'FMHH12:MI AM')), lower(to_char(loc.collection_close, 'FMHH12:MI AM'))), 'time');
  end if;
  v_mins := extract(hour from v_time)::int * 60 + extract(minute from v_time)::int;
  if v_mins % loc.slot_minutes <> 0 then return public._err('time', 'Choose one of the listed collection times.', 'time'); end if;

  -- Daily capacity (only when a limit is set). The location row lock stops two orders taking the last place at once.
  if loc.daily_capacity is not null then
    perform 1 from public.locations where id = loc.id for update;
    select count(*) into v_count from public.orders
      where location_id = loc.id and required_date = v_date and order_status not in ('declined','cancelled','completed');
    if v_count >= loc.daily_capacity and not (v_staff and v_rush) then
      return public._err('full', 'That day is fully booked for cakes. Please choose another date.', 'date');
    end if;
  end if;

  -- Customer: match on mobile number
  if v_staff and nullif(p->>'customer_id', '') is not null then
    select id, email into v_cust, v_cust_email from public.customers where id = (p->>'customer_id')::uuid;
    if not found then return public._err('customer', 'That customer record was not found.', 'customer'); end if;
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if v_email is not null and v_cust_email is null and v_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      update public.customers set email = v_email where id = v_cust; v_cust_email := v_email;
    end if;
  else
    v_name := trim(coalesce(p->'customer'->>'name', ''));
    v_phone := trim(coalesce(p->'customer'->>'phone', ''));
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if length(v_name) < 2 then return public._err('name', 'Enter a name for the order.', 'name'); end if;
    if length(v_name) > 120 then return public._err('name', 'That name is too long.', 'name'); end if;
    v_key := public._phone_key(v_phone);
    if v_key !~ '^[0-9]{7,15}$' then return public._err('phone', 'Enter a mobile number, for example 912 3456.', 'phone'); end if;
    if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
    if not v_staff then
      select count(*) into v_count from public.orders o join public.customers c on c.id = o.customer_id
        where c.phone_key = v_key and o.created_at > now() - interval '1 hour';
      if v_count >= 5 then return public._err('rate', 'We have already received several orders from this number. Please call us on ' || coalesce(loc.phone, 'the cafe') || '.'); end if;
      select count(*) into v_count from public.orders where source = 'online' and created_at > now() - interval '10 minutes';
      if v_count >= 60 then return public._err('busy', 'We are receiving a lot of orders right now. Please try again in a few minutes.'); end if;
    end if;
    insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source)
    values (v_name, v_phone, v_key, v_email,
            case when coalesce((p->'customer'->>'whatsapp')::boolean, true) then 'whatsapp' else 'phone' end, p_source)
    on conflict (phone_key) do update
      set email = coalesce(public.customers.email, excluded.email),
          full_name = case when v_staff then excluded.full_name else public.customers.full_name end
    returning id, email into v_cust, v_cust_email;
  end if;

  -- Create the order
  v_total := sz.price * v_qty;
  if v_staff and coalesce(p->'delivery'->>'method', 'collection') = 'delivery' then
    v_del := public._delivery_check(loc.id, 'delivery', p->'delivery'->>'zone', p->'delivery'->>'address',
                                    nullif(p->'delivery'->>'fee', '')::numeric, p->'delivery'->>'contact');
    if not (v_del->>'ok')::boolean then return v_del; end if;
    v_total := v_total + (v_del->>'fee')::numeric;
  end if;
  v_status := case when v_finish = 'custom' then 'awaiting_quote' else 'awaiting_review' end;
  v_ref := 'CC-' || nextval('public.order_ref_seq');
  v_opt := coalesce((p->'customer'->>'opt_in')::boolean, false);

  insert into public.orders (reference, location_id, customer_id, source, order_type, order_status, required_date, required_time,
    estimate_total, has_dietary, customer_notes, rush_override, rush_reason, marketing_opt_in, idempotency_key, created_by, fulfilment_method, delivery_zone, delivery_address, delivery_fee, delivery_contact)
  values (v_ref, loc.id, v_cust, p_source, v_finish::public.order_type, v_status, v_date, v_time,
    v_total, v_dietary_answer = 'yes', nullif(trim(coalesce(p->>'notes', '')), ''), v_rush, v_rush_reason, v_opt,
    nullif(p->>'idempotency_key', '')::uuid, p_actor, coalesce(v_del->>'method', 'collection'), v_del->>'zone', v_del->>'address', coalesce((v_del->>'fee')::numeric, 0), v_del->>'contact')
  returning id into v_order;

  insert into public.order_items (order_id, product_id, product_name, variant, size_inch, serves_label, unit_price, quantity, finish,
    design_description, cake_message, occasion, dietary, dietary_note)
  values (v_order, prod.id, prod.name, v_variant, sz.size_inch, sz.serves_label, sz.price, v_qty, v_finish,
    nullif(trim(coalesce(p->>'design', '')), ''), v_msg, nullif(trim(coalesce(p->>'occasion', '')), ''), v_diet,
    case when v_dietary_answer = 'yes' then nullif(trim(coalesce(p->>'dietary_note', '')), '') end);

  perform public._log(v_order, p_actor, p_label, 'created',
    jsonb_build_object('source', p_source, 'status', v_status, 'estimate', v_total) ||
    case when v_rush then jsonb_build_object('rush_reason', v_rush_reason) else '{}'::jsonb end);

  for v_path in select jsonb_array_elements_text(coalesce(p->'attachments', '[]')) limit 5 loop
    if v_path like 'incoming/%'
       and exists (select 1 from storage.objects where bucket_id = 'cake-references' and name = v_path)
       and not exists (select 1 from public.order_attachments where storage_path = v_path) then
      insert into public.order_attachments (order_id, storage_path, file_name) values (v_order, v_path, regexp_replace(v_path, '^.*/', ''));
    end if;
  end loop;

  if v_opt then
    insert into public.customer_consents (customer_id, granted, source, recorded_by)
    values (v_cust, true, case when v_staff then 'Staff entered order (' || p_source || ')' else 'Online cake order form' end, p_actor);
  end if;

  -- Staff can confirm a standard cake at the counter, with or without a deposit
  if v_staff and coalesce((p->>'confirm_now')::boolean, false) and v_finish = 'standard' then
    v_deposit := nullif(round(coalesce((p->>'deposit_required')::numeric, 0), 2), 0);
    if v_deposit is not null and (v_deposit < 0 or v_deposit > v_total) then
      raise exception 'The deposit must be between zero and the cake price.' using errcode = 'P0001';
    end if;
    update public.orders set order_status = case when v_deposit is null then 'confirmed' else 'awaiting_deposit' end::public.order_status,
      final_total = v_total, deposit_required = v_deposit, confirmed_at = now(), confirmed_by = p_actor
    where id = v_order;
    perform public._log(v_order, p_actor, p_label, case when v_deposit is null then 'confirmed' else 'awaiting_deposit' end,
      jsonb_build_object('final_total', v_total, 'deposit_required', v_deposit, 'at_counter', true));
  end if;

  if v_staff and coalesce((p->'payment'->>'amount')::numeric, 0) > 0 then
    v_res := public._record_payment(v_order, coalesce(p->'payment'->>'kind', 'deposit')::public.payment_kind,
      coalesce(p->'payment'->>'method', 'cash')::public.payment_method, (p->'payment'->>'amount')::numeric,
      p->'payment'->>'reference', null, p_actor, p_label, null);
    if not (v_res->>'ok')::boolean then raise exception '%', v_res->>'message' using errcode = 'P0001'; end if;
  end if;

  -- Notifications
  if p_source = 'online' then perform public._queue_email(v_order, 'staff_new_order', loc.alert_email); end if;
  select order_status into v_status from public.orders where id = v_order;
  perform public._queue_email(v_order,
    case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
    v_cust_email);

  return jsonb_build_object('ok', true, 'order_id', v_order, 'reference', v_ref, 'status', v_status, 'estimate', v_total,
                            'customer_id', v_cust, 'lead_days', v_lead);
exception
  when sqlstate 'P0001' then
    return public._err('rejected', sqlerrm);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end $function$;

-- function: _delivery_check
CREATE OR REPLACE FUNCTION public._delivery_check(p_loc uuid, p_method text, p_zone text, p_address text, p_fee numeric, p_contact text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare z public.delivery_zones; v_fee numeric;
begin
  if coalesce(p_method, 'collection') = 'collection' then
    return jsonb_build_object('ok', true, 'method', 'collection', 'fee', 0);
  end if;
  if p_method <> 'delivery' then return public._err('method', 'Choose collection or delivery.', 'method'); end if;
  select * into z from public.delivery_zones where location_id = p_loc and name = p_zone and active;
  if not found then return public._err('zone', 'Choose a delivery area.', 'zone'); end if;
  if length(trim(coalesce(p_address, ''))) < 5 then return public._err('address', 'Enter the delivery address.', 'address'); end if;
  v_fee := round(coalesce(z.fee, p_fee), 2);
  if v_fee is null or v_fee < 0 then return public._err('fee', 'Enter the delivery fee for this area.', 'fee'); end if;
  return jsonb_build_object('ok', true, 'method', 'delivery', 'zone', z.name, 'address', trim(p_address), 'fee', v_fee,
                            'contact', nullif(trim(coalesce(p_contact, '')), ''));
end $function$;

-- function: _err
CREATE OR REPLACE FUNCTION public._err(p_code text, p_message text, p_field text DEFAULT NULL::text, p_extra jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('ok', false, 'error', p_code, 'message', p_message, 'field', p_field) || p_extra
$function$;

-- function: _fmt_time
CREATE OR REPLACE FUNCTION public._fmt_time(t time without time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select ltrim(to_char(t, 'FMHH12:MI'), '0') || case when t < '12:00' then 'am' else 'pm' end $function$;

-- function: _kitchen_snapshot
CREATE OR REPLACE FUNCTION public._kitchen_snapshot(p_order uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'reference', o.reference, 'date', o.required_date, 'time', to_char(o.required_time, 'HH24:MI'),
    'method', o.fulfilment_method, 'area', o.delivery_zone,
    'customer', split_part(trim(c.full_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(c.full_name), ' ', 2), ''), 1) || '.', ''),
    'cake', i.product_name, 'variant', i.variant, 'size', i.size_inch, 'quantity', i.quantity, 'serves', i.serves_label,
    'finish', i.finish, 'design', i.design_description, 'message', i.cake_message, 'occasion', i.occasion,
    'has_dietary', o.has_dietary, 'dietary', to_jsonb(coalesce(i.dietary, '{}')), 'dietary_note', i.dietary_note,
    'kitchen_notes', i.kitchen_notes, 'order_notes', o.customer_notes, 'rush', o.rush_override,
    'photos', (select coalesce(jsonb_agg(a.storage_path order by a.created_at), '[]') from public.order_attachments a where a.order_id = o.id))
  from public.orders o
  join public.customers c on c.id = o.customer_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by x.created_at limit 1) i on true
  where o.id = p_order
$function$;

-- function: _log
CREATE OR REPLACE FUNCTION public._log(p_order uuid, p_actor uuid, p_label text, p_kind text, p_detail jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.order_events (order_id, actor_id, actor_label, kind, detail) values (p_order, p_actor, p_label, p_kind, p_detail)
$function$;

-- function: _next_occasion
CREATE OR REPLACE FUNCTION public._next_occasion(p_occ text, p_date date, p_today date)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  with y(yr) as (values (extract(year from p_today)::int), (extract(year from p_today)::int + 1)),
  c as (
    select case
      when p_occ in ('Birthday','Anniversary','Wedding') then
        make_date(yr, extract(month from p_date)::int, least(extract(day from p_date)::int,
          extract(day from (make_date(yr, extract(month from p_date)::int, 1) + interval '1 month - 1 day'))::int))
      when p_occ = 'Mother''s Day' then
        make_date(yr,5,1) + ((7 - extract(dow from make_date(yr,5,1))::int) % 7) + 7
      when p_occ = 'Father''s Day' then
        make_date(yr,9,1) + ((7 - extract(dow from make_date(yr,9,1))::int) % 7)
      when p_occ = 'Christmas' then make_date(yr,12,25)
    end d from y)
  select min(d) from c where d >= p_today
$function$;

-- function: _phone_key
CREATE OR REPLACE FUNCTION public._phone_key(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  select case when d ~ '^[0-9]{7}$' then '679' || d
              when d ~ '^0[0-9]{7}$' then '679' || substr(d, 2)
              else d end
  from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g') as d) s
$function$;

-- function: _queue_email
CREATE OR REPLACE FUNCTION public._queue_email(p_order uuid, p_kind text, p_to text, p_repeatable boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_to is null or p_to = '' then return; end if;
  -- Guest emails can be switched off (manual replies). Staff alerts always send.
  if p_kind like 'guest\_%' and coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return; end if;
  insert into public.email_outbox (order_id, kind, to_email, dedupe_key)
  values (p_order, p_kind, p_to,
          case when p_repeatable then null else p_order::text || ':' || p_kind || ':' || lower(p_to) end)
  on conflict (dedupe_key) do nothing;
end $function$;

-- function: _record_payment
CREATE OR REPLACE FUNCTION public._record_payment(p_order uuid, p_kind payment_kind, p_method payment_method, p_amount numeric, p_reference text, p_note text, p_actor uuid, p_label text, p_idem uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; v_paid numeric; v_basis numeric; v_new public.payment_status; v_cust_email text; v_refunds int;
begin
  if p_idem is not null and exists (select 1 from public.payments where idempotency_key = p_idem) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status in ('declined') then return public._err('status', 'This order was declined, so no payment can be recorded.'); end if;
  if p_amount is null or p_amount = 0 then return public._err('amount', 'Enter an amount.', 'amount'); end if;
  if p_kind = 'refund' and p_amount > 0 then p_amount := -p_amount; end if;
  if p_kind <> 'refund' and p_kind <> 'adjustment' and p_amount < 0 then return public._err('amount', 'Payments must be more than zero.', 'amount'); end if;

  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;
  if p_kind = 'refund' and v_paid + p_amount < 0 then return public._err('amount', 'A refund cannot be more than what has been paid.', 'amount'); end if;

  insert into public.payments (order_id, kind, method, amount, reference, note, recorded_by, idempotency_key)
  values (o.id, p_kind, p_method, round(p_amount, 2), nullif(trim(p_reference), ''), nullif(trim(p_note), ''), p_actor, p_idem);

  v_paid := v_paid + round(p_amount, 2);
  v_basis := coalesce(o.final_total, o.estimate_total);
  select count(*) into v_refunds from public.payments where order_id = o.id and kind = 'refund';
  v_new := case when v_paid <= 0 then (case when v_refunds > 0 then 'refunded' else 'unpaid' end)::public.payment_status
                when v_paid >= v_basis then 'paid' else 'deposit_paid' end;
  update public.orders set payment_status = v_new, version = version + 1 where id = o.id;
  perform public._log(o.id, p_actor, p_label, 'payment_recorded',
    jsonb_build_object('kind', p_kind, 'method', p_method, 'amount', round(p_amount, 2), 'paid_total', v_paid));

  -- Deposit received: move the order to confirmed
  if o.order_status = 'awaiting_deposit' and v_paid >= coalesce(o.deposit_required, 0) then
    update public.orders set order_status = 'confirmed', version = version + 1 where id = o.id;
    perform public._log(o.id, p_actor, p_label, 'confirmed', jsonb_build_object('reason', 'deposit received'));
    select email into v_cust_email from public.customers where id = o.customer_id;
    perform public._queue_email(o.id, 'guest_confirmed', v_cust_email);
  end if;
  return jsonb_build_object('ok', true, 'paid_total', v_paid, 'payment_status', v_new, 'balance', greatest(v_basis - v_paid, 0));
end $function$;

-- function: admin_list_users
CREATE OR REPLACE FUNCTION public.admin_list_users()
 RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, full_name text, role staff_role, active boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if not public.has_role('admin') then return; end if;
  return query
    select u.id, u.email::text, u.created_at, u.last_sign_in_at, s.full_name, s.role, s.active
    from auth.users u left join public.staff_profiles s on s.user_id = u.id
    order by s.active desc nulls last, u.created_at;
end $function$;

-- function: admin_set_staff
CREATE OR REPLACE FUNCTION public.admin_set_staff(p_user uuid, p_name text, p_role text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can manage the team.'); end if;
  if not exists (select 1 from auth.users where id = p_user) then return public._err('user', 'That login was not found.'); end if;
  if length(trim(coalesce(p_name, ''))) < 2 then return public._err('name', 'Enter the staff member''s name.', 'name'); end if;
  if p_user = auth.uid() and (p_role <> 'admin' or not p_active) then
    return public._err('self', 'You cannot remove your own admin access.');
  end if;
  insert into public.staff_profiles (user_id, full_name, role, location_id, active)
  values (p_user, trim(p_name), p_role::public.staff_role, (select id from public.locations where code = 'corner-cafe'), p_active)
  on conflict (user_id) do update set full_name = excluded.full_name, role = excluded.role, active = excluded.active;
  return jsonb_build_object('ok', true);
exception when invalid_text_representation then return public._err('role', 'Unknown role.');
end $function$;

-- function: block_payment_change
CREATE OR REPLACE FUNCTION public.block_payment_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin raise exception 'Payments cannot be changed or deleted. Record a refund or adjustment instead.'; end $function$;

-- function: bootstrap_admin
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if lower(new.email) = 'roneel@jacksfiji.com' and new.email_confirmed_at is not null then
    insert into public.staff_profiles (user_id, full_name, role, location_id)
    values (new.id, 'Roneel', 'admin', (select id from public.locations where code = 'corner-cafe'))
    on conflict (user_id) do nothing;
  end if;
  return new;
end $function$;

-- function: calendar_counts
CREATE OR REPLACE FUNCTION public.calendar_counts(p_from date, p_to date)
 RETURNS TABLE(day date, orders integer, cakes integer, deliveries integer, attention integer, done integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.required_date,
         count(*)::int,
         coalesce(sum((select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = o.id)), 0)::int,
         count(*) filter (where o.fulfilment_method = 'delivery')::int,
         count(*) filter (where o.order_status in ('awaiting_review','awaiting_quote','awaiting_deposit'))::int,
         count(*) filter (where o.order_status = 'completed')::int
  from public.orders o
  where public.is_staff()
    and o.required_date between p_from and least(p_to, p_from + 400)
    and o.order_status not in ('declined','cancelled')
  group by o.required_date
  order by o.required_date
$function$;

-- function: claim_outbox
CREATE OR REPLACE FUNCTION public.claim_outbox(p_limit integer DEFAULT 20)
 RETURNS SETOF email_outbox
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.email_outbox e set status = 'sending', attempts = e.attempts + 1
  where e.id in (
    select id from public.email_outbox
    where status = 'pending'
       or (status = 'failed' and attempts < 5)
       or (status = 'sending' and created_at < now() - interval '10 minutes' and attempts < 5)
    order by created_at limit p_limit for update skip locked)
  returning e.*
$function$;

-- function: email_payload
CREATE OR REPLACE FUNCTION public.email_payload(p_order uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'order', to_jsonb(o) - 'manage_token' - 'idempotency_key',
    'item', to_jsonb(i),
    'customer', jsonb_build_object('full_name', c.full_name, 'phone', c.phone, 'email', c.email, 'preferred_contact', c.preferred_contact,
                                   'past_orders', (select count(*) from public.orders x where x.customer_id = c.id and x.id <> o.id and x.order_status not in ('declined','cancelled'))),
    'location', jsonb_build_object('name', l.name, 'address', l.address, 'phone', l.phone, 'email', l.email, 'order_page_url', l.order_page_url),
    'paid_total', (select coalesce(sum(amount), 0) from public.payments where order_id = o.id),
    'attachments', (select count(*) from public.order_attachments where order_id = o.id),
    'config', (select jsonb_object_agg(key, value) from public.app_config where key in ('test_mode','test_email','from_email','reply_to','staff_app_url','guest_emails'))
  )
  from public.orders o
  join public.customers c on c.id = o.customer_id
  join public.locations l on l.id = o.location_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by created_at limit 1) i on true
  where o.id = p_order
$function$;

-- function: get_order_setup
CREATE OR REPLACE FUNCTION public.get_order_setup(p_location text DEFAULT 'corner-cafe'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare loc public.locations; v_today date;
begin
  select * into loc from public.locations where code = p_location and active;
  if not found then return public._err('location', 'This location is not taking cake orders.'); end if;
  v_today := (now() at time zone loc.timezone)::date;
  return jsonb_build_object(
    'ok', true, 'delivery_zones', coalesce((select jsonb_agg(jsonb_build_object('name', z.name, 'fee', z.fee) order by z.sort, z.name) from public.delivery_zones z where z.location_id = loc.id and z.active), '[]'), 'guest_emails', coalesce((select value from public.app_config where key = 'guest_emails'), 'false') = 'true',
    'location', jsonb_build_object('code', loc.code, 'name', loc.name, 'address', loc.address, 'phone', loc.phone,
      'accepts_online', loc.accepts_online, 'today', v_today,
      'collection_open', to_char(loc.collection_open, 'HH24:MI'), 'collection_close', to_char(loc.collection_close, 'HH24:MI'),
      'slot_minutes', loc.slot_minutes, 'lead_days_standard', loc.lead_days_standard, 'lead_days_custom', loc.lead_days_custom,
      'max_days_ahead', loc.max_days_ahead),
    'closed_dates', coalesce((select jsonb_agg(closed_on order by closed_on) from public.closed_dates
                               where location_id = loc.id and closed_on between v_today and v_today + loc.max_days_ahead), '[]'),
    'full_dates', case when loc.daily_capacity is null then '[]'::jsonb else coalesce((
        select jsonb_agg(d order by d) from (
          select required_date as d from public.orders
          where location_id = loc.id and required_date >= v_today
            and order_status not in ('declined','cancelled','completed')
          group by required_date having count(*) >= loc.daily_capacity) f), '[]') end,
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', p.code, 'name', p.name, 'category', p.category, 'description', p.description,
        'choice_label', p.choice_label, 'swatch', p.swatch, 'image_url', p.image_url, 'dietary_info', p.dietary_info,
        'supports_custom', p.supports_custom, 'supports_message', p.supports_message,
        'lead_days', coalesce(p.lead_days, loc.lead_days_standard),
        'variants', coalesce((select jsonb_agg(v.name order by v.sort, v.name) from public.product_variants v where v.product_id = p.id and v.active), '[]'),
        'sizes', coalesce((select jsonb_agg(jsonb_build_object('inch', s.size_inch, 'price', s.price, 'serves', s.serves_label) order by s.size_inch)
                           from public.product_sizes s where s.product_id = p.id and s.active), '[]')
      ) order by p.sort, p.name)
      from public.products p where p.status = 'active'
        and exists (select 1 from public.product_sizes s where s.product_id = p.id and s.active)), '[]')
  );
end $function$;

-- function: has_role
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC roles staff_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select role = 'admin' or role = any(roles)
                   from public.staff_profiles where user_id = auth.uid() and active), false)
$function$;

-- function: import_sheet_match
CREATE OR REPLACE FUNCTION public.import_sheet_match(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_key text := p->>'import_key'; v_existing uuid;
begin
  if exists (select 1 from public.sheet_order_imports where import_key = v_key) then return null; end if;
  select o.id into v_existing from public.orders o join public.customers c on c.id = o.customer_id
   where c.phone_key = p->'customer'->>'phone_key' and o.required_date = (p->>'date')::date
     and not exists (select 1 from public.sheet_order_imports s where s.order_id = o.id)
   order by o.created_at limit 1;
  if v_existing is null then return null; end if;
  insert into public.sheet_order_imports (import_key, order_id, sheet, sheet_row) values (v_key, v_existing, p->>'sheet', (p->>'row')::int);
  -- Mark it as already worked on so later syncs keep it as it is
  perform public._log(v_existing, null, 'Google Sheet import', 'sheet_linked', jsonb_build_object('sheet', p->>'sheet', 'row', p->>'row'));
  return jsonb_build_object('ok', true, 'action', 'kept', 'order_id', v_existing, 'matched', true);
end $function$;

-- function: import_sheet_order
CREATE OR REPLACE FUNCTION public.import_sheet_order(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  r := public.import_sheet_match(p);
  if r is not null then return r; end if;
  return public.import_sheet_order_create(p);
end $function$;

-- function: import_sheet_order_create
CREATE OR REPLACE FUNCTION public.import_sheet_order_create(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  loc public.locations; prod public.products; sz public.product_sizes;
  v_key text := p->>'import_key'; v_imp public.sheet_order_imports; v_order uuid; v_cust uuid; v_ref text;
  v_status public.order_status := coalesce(nullif(p->>'status',''),'awaiting_review')::public.order_status;
  v_date date := (p->>'date')::date; v_time time := coalesce(nullif(p->>'time',''),'12:00')::time;
  v_price numeric := coalesce((p->>'price')::numeric, 0); v_final numeric := nullif(p->>'final_total','')::numeric;
  v_size int := coalesce((p->>'size_inch')::int, 0); v_touched boolean; v_name text; v_email text; v_pkey text;
  v_dietary text[];
begin
  if v_key is null or v_date is null then return jsonb_build_object('ok', false, 'reason', 'missing key or date'); end if;
  select * into loc from public.locations where code = 'corner-cafe';
  select * into prod from public.products where code = p->>'product_code';
  if found and v_size > 0 then select * into sz from public.product_sizes where product_id = prod.id and size_inch = v_size; end if;
  if v_price = 0 and sz.price is not null then v_price := sz.price; end if;
  select coalesce(array_agg(x), '{}') into v_dietary from jsonb_array_elements_text(coalesce(p->'dietary','[]')) x;

  select * into v_imp from public.sheet_order_imports where import_key = v_key;
  if found then
    update public.sheet_order_imports set last_seen_at = now(), sheet_row = (p->>'row')::int where import_key = v_key;
    -- Only refresh orders nobody has worked on in the staff app yet. Once staff act on an order, the app wins.
    select o.version = 1 and not exists (select 1 from public.order_events e where e.order_id = o.id and e.kind <> 'imported')
      into v_touched from public.orders o where o.id = v_imp.order_id;
    if not coalesce(v_touched, false) then return jsonb_build_object('ok', true, 'action', 'kept', 'order_id', v_imp.order_id); end if;
    update public.orders set order_status = v_status, required_date = v_date, required_time = v_time, estimate_total = v_price,
      final_total = v_final, has_dietary = coalesce((p->>'has_dietary')::boolean, false), customer_notes = nullif(p->>'customer_notes',''),
      internal_notes = p->>'internal_notes', fulfilment_method = coalesce(nullif(p->>'method',''),'collection'),
      delivery_address = nullif(p->>'delivery_address',''),
      cancelled_at = case when v_status = 'cancelled' then coalesce(cancelled_at, now()) end,
      confirmed_at = case when v_status = 'confirmed' then coalesce(confirmed_at, now()) end
    where id = v_imp.order_id and version = 1;
    update public.order_items set product_id = prod.id, product_name = coalesce(prod.name, p->>'cake_label'), variant = nullif(p->>'variant',''),
      size_inch = v_size, serves_label = sz.serves_label, unit_price = v_price, finish = coalesce(nullif(p->>'finish',''),'standard'),
      design_description = nullif(p->>'design',''), cake_message = nullif(p->>'message',''), dietary = v_dietary,
      dietary_note = nullif(p->>'dietary_note',''), kitchen_notes = nullif(p->>'kitchen_notes','')
    where order_id = v_imp.order_id;
    return jsonb_build_object('ok', true, 'action', 'refreshed', 'order_id', v_imp.order_id);
  end if;

  -- Customer, matched on mobile number like every other order
  v_pkey := p->'customer'->>'phone_key';
  if coalesce(v_pkey,'') !~ '^[0-9]{7,15}$' then return jsonb_build_object('ok', false, 'reason', 'no usable phone number'); end if;
  v_name := left(coalesce(nullif(trim(p->'customer'->>'name'),''),'Guest'), 120);
  v_email := nullif(lower(trim(coalesce(p->'customer'->>'email',''))),'');
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_email := null; end if;
  insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source)
  values (v_name, coalesce(nullif(p->'customer'->>'phone',''), v_pkey), v_pkey, v_email, 'whatsapp', (p->>'source')::public.order_source)
  on conflict (phone_key) do update set email = coalesce(public.customers.email, excluded.email)
  returning id into v_cust;

  v_ref := 'CC-' || nextval('public.order_ref_seq');
  insert into public.orders (reference, location_id, customer_id, source, order_type, order_status, required_date, required_time,
    estimate_total, final_total, has_dietary, customer_notes, internal_notes, marketing_opt_in, fulfilment_method, delivery_address,
    confirmed_at, cancelled_at, created_at)
  values (v_ref, loc.id, v_cust, (p->>'source')::public.order_source, coalesce(nullif(p->>'finish',''),'standard')::public.order_type, v_status,
    v_date, v_time, v_price, v_final, coalesce((p->>'has_dietary')::boolean, false), nullif(p->>'customer_notes',''), p->>'internal_notes',
    coalesce((p->'customer'->>'opt_in')::boolean, false), coalesce(nullif(p->>'method',''),'collection'), nullif(p->>'delivery_address',''),
    case when v_status = 'confirmed' then now() end, case when v_status = 'cancelled' then now() end,
    coalesce(nullif(p->>'submitted_at','')::timestamptz, now()))
  returning id into v_order;
  insert into public.order_items (order_id, product_id, product_name, variant, size_inch, serves_label, unit_price, quantity, finish,
    design_description, cake_message, dietary, dietary_note, kitchen_notes)
  values (v_order, prod.id, coalesce(prod.name, p->>'cake_label'), nullif(p->>'variant',''), v_size, sz.serves_label, v_price, 1,
    coalesce(nullif(p->>'finish',''),'standard'), nullif(p->>'design',''), nullif(p->>'message',''), v_dietary,
    nullif(p->>'dietary_note',''), nullif(p->>'kitchen_notes',''));
  if coalesce((p->'customer'->>'opt_in')::boolean, false) then
    insert into public.customer_consents (customer_id, granted, source) values (v_cust, true, 'Walk-in cake order sheet');
  end if;
  insert into public.sheet_order_imports (import_key, order_id, sheet, sheet_row) values (v_key, v_order, p->>'sheet', (p->>'row')::int);
  perform public._log(v_order, null, 'Google Sheet import', 'imported', jsonb_build_object('sheet', p->>'sheet', 'row', p->>'row'));
  -- No emails: these customers already went through the old process.
  return jsonb_build_object('ok', true, 'action', 'created', 'order_id', v_order, 'reference', v_ref);
end $function$;

-- function: is_staff
CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.staff_profiles where user_id = auth.uid() and active)
$function$;

-- function: kick_email_sender
CREATE OR REPLACE FUNCTION public.kick_email_sender()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform net.http_post(
    url := (select value from public.app_config where key = 'function_url'),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select value from public.app_config where key = 'cron_key')),
    body := '{"op":"process"}'::jsonb);
  return null;
end $function$;

-- function: kitchen_ack_amendment
CREATE OR REPLACE FUNCTION public.kitchen_ack_amendment(p_order uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_n int; v_who text := nullif(trim(coalesce(p_name, '')), '');
begin
  if not public.has_role('kitchen','manager','front_of_house') then return public._err('forbidden', 'Your login cannot do that.'); end if;
  if v_who is null or length(v_who) < 2 then return public._err('name', 'Enter your name.', 'name'); end if;
  update public.order_amendments set kitchen_ack_by = v_who, kitchen_ack_at = now()
   where order_id = p_order and kitchen_ack_required and kitchen_ack_at is null;
  get diagnostics v_n = row_count;
  if v_n = 0 then return public._err('none', 'There is nothing to acknowledge.'); end if;
  perform public._log(p_order, auth.uid(), v_who, 'kitchen_ack', jsonb_build_object('by', v_who, 'count', v_n));
  return jsonb_build_object('ok', true, 'count', v_n);
end $function$;

-- function: kitchen_assign
CREATE OR REPLACE FUNCTION public.kitchen_assign(p_order uuid, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; v_name text;
begin
  if not public.has_role('kitchen','manager','front_of_house') then return public._err('forbidden', 'Your login cannot assign kitchen work.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status <> 'confirmed' then return public._err('status', 'Only confirmed orders can be assigned.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  update public.orders set kitchen_assignee = nullif(trim(coalesce(p_name, '')), ''), version = version + 1 where id = o.id;
  perform public._log(o.id, auth.uid(), v_name, 'assigned', jsonb_build_object('to', nullif(trim(coalesce(p_name, '')), '')));
  return jsonb_build_object('ok', true);
end $function$;

-- function: kitchen_board
CREATE OR REPLACE FUNCTION public.kitchen_board(p_from date DEFAULT NULL::date, p_days integer DEFAULT 2)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date; v_from date; v_to date;
begin
  if not public.has_role('kitchen','manager','front_of_house') then return public._err('forbidden', 'Your login cannot open the kitchen screen.'); end if;
  v_from := coalesce(p_from, v_today);
  v_to := v_from + greatest(1, least(coalesce(p_days, 2), 14)) - 1;
  return jsonb_build_object('ok', true, 'today', v_today, 'from', v_from, 'to', v_to, 'orders', coalesce((
    select jsonb_agg(public._kitchen_snapshot(o.id) || jsonb_build_object(
      'id', o.id, 'status', o.order_status, 'stage', o.production_status, 'version', o.version,
      'assignee', o.kitchen_assignee, 'qc_by', o.qc_by, 'ready_at', o.ready_at, 'handed_over_at', o.handed_over_at,
      'brief_version', o.brief_version, 'revision', o.revision,
      'brief_changed', o.brief_version > 0 and (select kb.snapshot from public.kitchen_briefs kb where kb.order_id = o.id order by kb.version desc limit 1) is distinct from public._kitchen_snapshot(o.id),
      'amend_pending', (select jsonb_agg(jsonb_build_object('revision', a.revision, 'at', a.amended_at, 'by', a.staff_label,
          'changes', (select coalesce(jsonb_agg(jsonb_build_object('label', e->>'label', 'from', e->>'from', 'to', e->>'to')), '[]') from jsonb_array_elements(a.changes) e where (e->>'kitchen')::boolean))
          order by a.revision)
        from public.order_amendments a where a.order_id = o.id and a.kitchen_ack_required and a.kitchen_ack_at is null),
      'late', o.order_status = 'confirmed' and o.production_status <> 'ready'
              and (o.required_date < v_today or (o.required_date = v_today and o.required_time < (now() at time zone 'Pacific/Fiji')::time)))
      order by o.required_date, o.required_time)
    from public.orders o
    where (o.order_status in ('confirmed','completed') and o.required_date between v_from and v_to)
       or (o.order_status = 'confirmed' and o.required_date < v_from and o.production_status <> 'ready')), '[]'));
end $function$;

-- function: kitchen_set_stage
CREATE OR REPLACE FUNCTION public.kitchen_set_stage(p_order uuid, p_stage text, p_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; v_stage public.production_status; v_name text; v_qc text := nullif(trim(coalesce(p_name, '')), '');
begin
  if not public.has_role('kitchen','manager','front_of_house') then return public._err('forbidden', 'Your login cannot update the kitchen.'); end if;
  if p_stage not in ('not_started','scheduled','preparing','baking','assembling','decorating','quality_check','ready') then
    return public._err('stage', 'Unknown stage.');
  end if;
  v_stage := p_stage::public.production_status;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status <> 'confirmed' then return public._err('status', 'Only confirmed orders that are not yet handed over can move between stages.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  if v_stage = 'ready' then
    if o.production_status <> 'quality_check' then return public._err('stage', 'Do the quality check first, then mark it ready.'); end if;
    if v_qc is null or length(v_qc) < 2 then return public._err('qc', 'Enter the name of the person who checked the cake.', 'qc'); end if;
  end if;
  update public.orders set production_status = v_stage,
    qc_by = case when v_stage = 'ready' then v_qc else null end,
    qc_at = case when v_stage = 'ready' then now() else null end,
    ready_at = case when v_stage = 'ready' then now() else null end,
    version = version + 1
  where id = o.id;
  perform public._log(o.id, auth.uid(), v_name, 'stage', jsonb_build_object('from', o.production_status, 'to', v_stage, 'qc_by', case when v_stage = 'ready' then v_qc end));
  return jsonb_build_object('ok', true, 'stage', v_stage, 'version', o.version + 1);
end $function$;

-- function: my_role
CREATE OR REPLACE FUNCTION public.my_role()
 RETURNS staff_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select role from public.staff_profiles where user_id = auth.uid() and active
$function$;

-- function: protect_amendments
CREATE OR REPLACE FUNCTION public.protect_amendments()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'DELETE' then raise exception 'Change history cannot be removed.'; end if;
  if (to_jsonb(new) - 'kitchen_ack_by' - 'kitchen_ack_at' - 'notification_status')
     is distinct from (to_jsonb(old) - 'kitchen_ack_by' - 'kitchen_ack_at' - 'notification_status') then
    raise exception 'Change history cannot be edited. Make a new amendment instead.';
  end if;
  if old.kitchen_ack_at is not null and new.kitchen_ack_at is distinct from old.kitchen_ack_at then
    raise exception 'This change was already acknowledged.';
  end if;
  return new;
end $function$;

-- function: protect_events
CREATE OR REPLACE FUNCTION public.protect_events()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin raise exception 'Order history cannot be edited or removed.'; end $function$;

-- function: staff_amend_order
CREATE OR REPLACE FUNCTION public.staff_amend_order(p_order uuid, p_version integer, p_changes jsonb, p_requested_by text, p_reason text, p_commit boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o public.orders; it public.order_items; c public.customers; loc public.locations;
  prod public.products; sz public.product_sizes; v_name text; v_mgr boolean;
  ch jsonb := '[]'::jsonb; warn jsonb := '[]'::jsonb;
  n_date date; n_time time; n_prod public.products; n_variant text; n_size int; n_qty int; n_finish text; n_design text; n_msg text; n_occ text;
  n_hasdiet boolean; n_diet text[]; n_dnote text; n_knotes text; n_cnotes text; n_cname text; n_cemail text; n_price numeric;
  v_items_before numeric; v_items_after numeric; v_price_before numeric; v_price_after numeric; v_paid numeric;
  v_kitchen boolean := false; v_timechg boolean := false; v_ack boolean := false; v_reprint boolean := false;
  v_lead int; v_today date := (now() at time zone 'Pacific/Fiji')::date; v_count int; v_rev int; v_cause text; v_bad text;
  v_cake_changed boolean := false;
  fmt_d text; fmt_n text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot amend orders.'); end if;
  v_mgr := public.has_role('manager');
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if p_version is distinct from o.version then
    return public._err('changed', 'Someone else updated this order while you had it open. Check the latest details, then make your change again.');
  end if;
  if o.order_status in ('completed','declined','cancelled') then
    return public._err('status', 'This order is ' || case o.order_status when 'completed' then 'already handed over' else o.order_status::text end || ', so it cannot be amended.');
  end if;
  if o.production_status = 'ready' and not v_mgr then
    return public._err('ready', 'This cake is already ready. Only a manager can amend it.');
  end if;
  if p_requested_by is null or p_requested_by not in ('guest','staff','other') then return public._err('requested_by', 'Choose who asked for the change.', 'requested_by'); end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then return public._err('reason', 'Add a short reason for the change.', 'reason'); end if;

  select * into it from public.order_items where order_id = o.id order by created_at limit 1;
  select * into c from public.customers where id = o.customer_id;
  select * into loc from public.locations where id = o.location_id;
  select * into prod from public.products where id = it.product_id;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();

  n_date := coalesce((p_changes->>'date')::date, o.required_date);
  n_time := coalesce((p_changes->>'time')::time, o.required_time);
  if p_changes ? 'product_code' then select * into n_prod from public.products where code = p_changes->>'product_code' and status = 'active';
    if not found then return public._err('product', 'Choose a cake that is on sale.', 'product'); end if;
  else n_prod := prod; end if;
  n_variant := case when p_changes ? 'variant' then nullif(trim(p_changes->>'variant'), '') else it.variant end;
  n_size := coalesce((p_changes->>'size_inch')::int, it.size_inch);
  n_qty := coalesce((p_changes->>'quantity')::int, it.quantity);
  n_finish := coalesce(nullif(p_changes->>'finish', ''), it.finish);
  n_design := case when p_changes ? 'design' then nullif(trim(p_changes->>'design'), '') else it.design_description end;
  n_msg := case when p_changes ? 'message' then nullif(trim(p_changes->>'message'), '') else it.cake_message end;
  n_occ := case when p_changes ? 'occasion' then nullif(trim(p_changes->>'occasion'), '') else it.occasion end;
  n_hasdiet := coalesce((p_changes->>'has_dietary')::boolean, o.has_dietary);
  if p_changes ? 'dietary' then select coalesce(array_agg(x order by x), '{}') into n_diet from jsonb_array_elements_text(p_changes->'dietary') x;
  else n_diet := coalesce(it.dietary, '{}'); end if;
  n_dnote := case when p_changes ? 'dietary_note' then nullif(trim(p_changes->>'dietary_note'), '') else it.dietary_note end;
  if not n_hasdiet then n_diet := '{}'; n_dnote := null; end if;
  n_knotes := case when p_changes ? 'kitchen_notes' then nullif(trim(p_changes->>'kitchen_notes'), '') else it.kitchen_notes end;
  n_cnotes := case when p_changes ? 'customer_notes' then nullif(trim(p_changes->>'customer_notes'), '') else o.customer_notes end;
  n_cname := case when p_changes ? 'customer_name' then trim(p_changes->>'customer_name') else c.full_name end;
  n_cemail := case when p_changes ? 'customer_email' then nullif(lower(trim(p_changes->>'customer_email')), '') else c.email end;

  if n_prod.id is not null then
    if exists (select 1 from public.product_variants where product_id = n_prod.id and active) then
      if n_variant is null or not exists (select 1 from public.product_variants where product_id = n_prod.id and active and name = n_variant) then
        return public._err('variant', 'Choose one: ' || (select string_agg(name, ', ' order by sort, name) from public.product_variants where product_id = n_prod.id and active) || '.', 'variant');
      end if;
    elsif n_prod.id is distinct from prod.id then n_variant := null;
    end if;
    select * into sz from public.product_sizes where product_id = n_prod.id and size_inch = n_size and active;
    if not found then return public._err('size', 'That size is not offered for ' || n_prod.name || '.', 'size'); end if;
  end if;
  if n_qty < 1 or n_qty > 50 then return public._err('quantity', 'Quantity must be between 1 and 50.', 'quantity'); end if;
  if n_finish not in ('standard','custom') then return public._err('finish', 'Choose Standard finish or Custom design.', 'finish'); end if;
  if n_finish = 'custom' and n_prod.id is not null and not n_prod.supports_custom then return public._err('finish', n_prod.name || ' is not available as a custom design.', 'finish'); end if;
  if n_finish = 'custom' and length(coalesce(n_design, '')) < 3 then return public._err('design', 'Describe the design for the kitchen.', 'design'); end if;
  if length(coalesce(n_msg, '')) > 60 then return public._err('message', 'Keep the cake message to 60 characters.', 'message'); end if;
  if n_hasdiet and cardinality(n_diet) = 0 and n_dnote is null then return public._err('diet', 'Say which dietary need or allergy applies.', 'diet'); end if;
  select x into v_bad from unnest(n_diet) x where x not in ('Vegetarian (eggless)','Gluten-free','Nut allergy','Other') limit 1;
  if v_bad is not null then return public._err('diet', 'Unknown dietary option.', 'diet'); end if;
  if length(coalesce(n_cname, '')) < 2 then return public._err('customer_name', 'Enter the customer name.', 'customer_name'); end if;
  if n_cemail is not null and n_cemail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('customer_email', 'Check the email address.', 'customer_email'); end if;

  if n_date is distinct from o.required_date or n_time is distinct from o.required_time then
    v_timechg := true;
    if n_date < v_today or (n_date = v_today and n_time <= (now() at time zone 'Pacific/Fiji')::time) then return public._err('date', 'That time has already passed.', 'date'); end if;
    if exists (select 1 from public.closed_dates where location_id = loc.id and closed_on = n_date) then return public._err('date', 'The café is closed for cakes that day.', 'date'); end if;
    if n_time < loc.collection_open or n_time > loc.collection_close then
      return public._err('time', format('Collection is between %s and %s.', public._fmt_time(loc.collection_open), public._fmt_time(loc.collection_close)), 'time');
    end if;
    v_lead := case when n_finish = 'custom' then loc.lead_days_custom else coalesce(n_prod.lead_days, loc.lead_days_standard) end;
    if n_date < v_today + v_lead and n_date < o.required_date then
      warn := warn || jsonb_build_array(format('Short notice: this cake normally needs %s days. Check with the kitchen before saving.', v_lead));
    end if;
    if loc.daily_capacity is not null then
      select count(*) into v_count from public.orders where location_id = loc.id and required_date = n_date and id <> o.id and order_status not in ('declined','cancelled','completed');
      if v_count >= loc.daily_capacity then warn := warn || jsonb_build_array(format('%s already has %s cakes, the daily limit you set.', to_char(n_date, 'FMDay FMDD FMMonth'), v_count)); end if;
    end if;
  end if;

  fmt_d := to_char(o.required_date, 'FMDy FMDD FMMon'); fmt_n := to_char(n_date, 'FMDy FMDD FMMon');
  if n_date is distinct from o.required_date then ch := ch || jsonb_build_object('field','date','label','Date','from',fmt_d,'to',fmt_n,'kitchen',true); end if;
  if n_time is distinct from o.required_time then ch := ch || jsonb_build_object('field','time','label', case when o.fulfilment_method = 'delivery' then 'Delivery time' else 'Collection time' end,'from',public._fmt_time(o.required_time),'to',public._fmt_time(n_time),'kitchen',true); end if;
  if n_prod.id is distinct from prod.id or n_variant is distinct from it.variant then
    v_cake_changed := true;
    ch := ch || jsonb_build_object('field','cake','label','Cake','from',coalesce(it.variant, it.product_name),'to',coalesce(n_variant, n_prod.name, it.product_name),'kitchen',true); end if;
  if n_size is distinct from it.size_inch then v_cake_changed := true; ch := ch || jsonb_build_object('field','size','label','Cake size','from',it.size_inch || '-inch','to',n_size || '-inch','kitchen',true); end if;
  if n_qty is distinct from it.quantity then v_cake_changed := true; ch := ch || jsonb_build_object('field','quantity','label','Quantity','from',it.quantity::text,'to',n_qty::text,'kitchen',true); end if;
  if n_finish is distinct from it.finish then ch := ch || jsonb_build_object('field','finish','label','Finish','from',case it.finish when 'custom' then 'Custom design' else 'Standard finish' end,'to',case n_finish when 'custom' then 'Custom design' else 'Standard finish' end,'kitchen',true); end if;
  if n_design is distinct from it.design_description then ch := ch || jsonb_build_object('field','design','label','Design','from',coalesce(it.design_description,'None'),'to',coalesce(n_design,'None'),'kitchen',true); end if;
  if n_msg is distinct from it.cake_message then ch := ch || jsonb_build_object('field','message','label','Cake message','from',coalesce('“'||it.cake_message||'”','None'),'to',coalesce('“'||n_msg||'”','None'),'kitchen',true); end if;
  if n_occ is distinct from it.occasion then ch := ch || jsonb_build_object('field','occasion','label','Occasion','from',coalesce(it.occasion,'None'),'to',coalesce(n_occ,'None'),'kitchen',false); end if;
  if n_hasdiet is distinct from o.has_dietary or n_diet is distinct from coalesce(it.dietary,'{}') or n_dnote is distinct from it.dietary_note then
    ch := ch || jsonb_build_object('field','dietary','label','Dietary and allergies',
      'from', case when o.has_dietary then coalesce(nullif(concat_ws('. ', nullif(array_to_string(it.dietary, ', '), ''), it.dietary_note), ''), 'Yes') else 'None' end,
      'to', case when n_hasdiet then coalesce(nullif(concat_ws('. ', nullif(array_to_string(n_diet, ', '), ''), n_dnote), ''), 'Yes') else 'None' end, 'kitchen', true); end if;
  if n_knotes is distinct from it.kitchen_notes then ch := ch || jsonb_build_object('field','kitchen_notes','label','Kitchen instructions','from',coalesce(it.kitchen_notes,'None'),'to',coalesce(n_knotes,'None'),'kitchen',true); end if;
  if n_cnotes is distinct from o.customer_notes then ch := ch || jsonb_build_object('field','customer_notes','label','Order notes','from',coalesce(o.customer_notes,'None'),'to',coalesce(n_cnotes,'None'),'kitchen',true); end if;
  if n_cname is distinct from c.full_name then ch := ch || jsonb_build_object('field','customer_name','label','Customer name','from',c.full_name,'to',n_cname,'kitchen',false); end if;
  if n_cemail is distinct from c.email then ch := ch || jsonb_build_object('field','customer_email','label','Customer email','from',coalesce(c.email,'None'),'to',coalesce(n_cemail,'None'),'kitchen',false); end if;

  v_items_before := coalesce(it.unit_price, 0) * coalesce(it.quantity, 1);
  v_price_before := coalesce(o.final_total, o.estimate_total);
  v_items_after := case when v_cake_changed and sz.price is not null then sz.price * n_qty else v_items_before end;
  v_price_after := case when o.final_total is null then v_items_after + o.delivery_fee
                        else o.final_total - v_items_before + v_items_after end;
  if p_changes ? 'price' and nullif(p_changes->>'price', '') is not null then
    if not v_mgr then return public._err('price', 'Only a manager can change the agreed price.', 'price'); end if;
    n_price := round((p_changes->>'price')::numeric, 2);
    if n_price < 0 then return public._err('price', 'The price cannot be negative.', 'price'); end if;
    v_price_after := n_price;
  end if;
  if v_cake_changed and n_finish = 'custom' and n_price is null then warn := warn || jsonb_build_array('Custom cake: check whether the agreed price should change.'); end if;
  if v_price_after is distinct from v_price_before then ch := ch || jsonb_build_object('field','price','label','Order total','from','FJD ' || trim(to_char(v_price_before,'FM999990.00')),'to','FJD ' || trim(to_char(v_price_after,'FM999990.00')),'kitchen',false); end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;

  if jsonb_array_length(ch) = 0 then return public._err('nothing', 'Nothing has changed yet.'); end if;

  v_kitchen := o.order_status = 'confirmed' and exists (select 1 from jsonb_array_elements(ch) e where (e->>'kitchen')::boolean);
  v_ack := v_kitchen and o.production_status not in ('not_started','scheduled');
  v_reprint := v_kitchen and o.brief_version > 0;
  v_cause := case when not v_timechg then null when p_requested_by = 'guest' then 'guest_request' when p_requested_by = 'staff' then 'business_delay' else 'other' end;
  if o.production_status = 'ready' and v_kitchen then warn := warn || jsonb_build_array('This cake is already ready. The kitchen will need to remake or change it.'); end if;
  if v_paid > v_price_after then warn := warn || jsonb_build_array(format('FJD %s has been paid, which is FJD %s more than the new total. A manager must decide on a refund or credit. Nothing is refunded automatically.', trim(to_char(v_paid,'FM999990.00')), trim(to_char(v_paid - v_price_after,'FM999990.00')))); end if;

  if not coalesce(p_commit, false) then
    return jsonb_build_object('ok', true, 'preview', true, 'changes', ch, 'warnings', warn,
      'price_before', v_price_before, 'price_after', v_price_after, 'paid', v_paid,
      'balance_before', greatest(v_price_before - v_paid, 0), 'balance_after', greatest(v_price_after - v_paid, 0),
      'excess_paid', greatest(v_paid - v_price_after, 0), 'kitchen_ack_required', v_ack, 'needs_reprint', v_reprint,
      'affects_kitchen', v_kitchen, 'time_change_cause', v_cause,
      'customer_record', exists (select 1 from jsonb_array_elements(ch) e where e->>'field' in ('customer_name','customer_email')));
  end if;

  v_rev := o.revision + 1;
  update public.order_items set product_id = coalesce(n_prod.id, product_id), product_name = coalesce(n_prod.name, product_name),
    variant = n_variant, size_inch = n_size, serves_label = coalesce(sz.serves_label, serves_label),
    unit_price = case when v_cake_changed and sz.price is not null then sz.price else unit_price end, quantity = n_qty,
    finish = n_finish, design_description = n_design, cake_message = n_msg, occasion = n_occ, dietary = n_diet,
    dietary_note = n_dnote, kitchen_notes = n_knotes
  where id = it.id;
  update public.orders set
    original_required_date = case when v_timechg then coalesce(original_required_date, required_date) else original_required_date end,
    original_required_time = case when v_timechg then coalesce(original_required_time, required_time) else original_required_time end,
    required_date = n_date, required_time = n_time, order_type = n_finish::public.order_type,
    has_dietary = n_hasdiet, customer_notes = n_cnotes,
    estimate_total = case when final_total is null then v_price_after else v_items_after + delivery_fee end,
    final_total = case when final_total is null and n_price is null then null else v_price_after end,
    payment_status = case when v_paid > 0 and v_paid >= v_price_after then 'paid' when v_paid > 0 then 'deposit_paid' else payment_status end::public.payment_status,
    rush_override = rush_override or (v_timechg and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date),
    rush_reason = case when v_timechg and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date then trim(p_reason) else rush_reason end,
    revision = v_rev, amended_at = now(), version = version + 1
  where id = o.id;
  if n_cname is distinct from c.full_name or n_cemail is distinct from c.email then
    update public.customers set full_name = n_cname, email = n_cemail where id = c.id;
  end if;
  insert into public.order_amendments (order_id, reference, revision, staff_id, staff_label, requested_by, reason, time_change_cause, changes,
    price_before, price_after, paid, balance_before, balance_after, excess_paid, affects_kitchen, kitchen_ack_required, needs_reprint, notification_status)
  values (o.id, o.reference, v_rev, auth.uid(), v_name, p_requested_by, trim(p_reason), v_cause, ch,
    v_price_before, v_price_after, v_paid, greatest(v_price_before - v_paid, 0), greatest(v_price_after - v_paid, 0), greatest(v_paid - v_price_after, 0),
    v_kitchen, v_ack, v_reprint, 'Not sent: guest emails are off. Tell the customer by WhatsApp or phone.');
  perform public._log(o.id, auth.uid(), v_name, 'amended', jsonb_build_object('revision', v_rev, 'requested_by', p_requested_by, 'reason', trim(p_reason),
    'changes', ch, 'price_before', v_price_before, 'price_after', v_price_after, 'kitchen_ack_required', v_ack));
  return jsonb_build_object('ok', true, 'revision', v_rev, 'reference', o.reference, 'kitchen_ack_required', v_ack, 'needs_reprint', v_reprint,
    'balance_after', greatest(v_price_after - v_paid, 0), 'excess_paid', greatest(v_paid - v_price_after, 0));
exception
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end $function$;

-- function: staff_create_order
CREATE OR REPLACE FUNCTION public.staff_create_order(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_src public.order_source; v_name text; v_res jsonb; v_by text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  v_src := coalesce(nullif(p->>'source', ''), 'walk_in')::public.order_source;
  if v_src = 'online' then v_src := 'walk_in'; end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_by := nullif(trim(coalesce(p->'rush'->>'approved_by', '')), '');
  if jsonb_typeof(p->'rush') = 'object' and (v_by is null or length(v_by) < 2) then
    return public._err('date', 'Enter who approved the short notice.', 'date');
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);
  if coalesce((v_res->>'ok')::boolean, false) and not coalesce((v_res->>'duplicate')::boolean, false) and v_by is not null then
    update public.orders set rush_approved_by = v_by where id = (v_res->>'order_id')::uuid and rush_override;
    if found then
      perform public._log((v_res->>'order_id')::uuid, auth.uid(), v_name, 'rush_approved',
        jsonb_build_object('approved_by', v_by, 'reason', (select rush_reason from public.orders where id = (v_res->>'order_id')::uuid)));
    end if;
  end if;
  return v_res;
exception when invalid_text_representation then return public._err('bad_input', 'Unknown order source.');
end $function$;

-- function: staff_order_action
CREATE OR REPLACE FUNCTION public.staff_order_action(p_order uuid, p_action text, p_version integer, p_final_total numeric DEFAULT NULL::numeric, p_deposit numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; v_name text; v_email text; v_paid numeric; v_total numeric; v_dep numeric; v_new public.order_status;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if p_version is distinct from o.version then return public._err('changed', 'Someone else just updated this order. It has been refreshed, please check it again.'); end if;
  select email into v_email from public.customers where id = o.customer_id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;

  if p_action = 'confirm' then
    if o.order_status not in ('awaiting_review','awaiting_quote','awaiting_approval') then
      return public._err('status', 'Only orders waiting for review or a quote can be confirmed.');
    end if;
    v_total := round(coalesce(p_final_total, o.estimate_total), 2);
    if o.order_type = 'custom' and p_final_total is null then return public._err('final_total', 'Enter the quoted price for this custom cake.', 'final_total'); end if;
    if v_total < 0 then return public._err('final_total', 'The price cannot be negative.', 'final_total'); end if;
    v_dep := nullif(round(coalesce(p_deposit, 0), 2), 0);
    if v_dep is not null and (v_dep < 0 or v_dep > v_total) then return public._err('deposit', 'The deposit must be between zero and the price.', 'deposit'); end if;
    v_new := case when v_dep is not null and v_paid < v_dep then 'awaiting_deposit' else 'confirmed' end;
    update public.orders set order_status = v_new, final_total = v_total, deposit_required = v_dep,
      payment_status = case when v_paid >= v_total and v_total > 0 then 'paid' when v_paid > 0 then 'deposit_paid' else payment_status end,
      confirmed_at = now(), confirmed_by = auth.uid(), version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, v_new::text, jsonb_build_object('final_total', v_total, 'deposit_required', v_dep, 'note', p_note));
    perform public._queue_email(o.id, case when v_new = 'confirmed' then 'guest_confirmed' else 'guest_deposit_needed' end, v_email);

  elsif p_action = 'waive_deposit' then
    if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can waive a deposit.'); end if;
    if o.order_status <> 'awaiting_deposit' then return public._err('status', 'This order is not waiting for a deposit.'); end if;
    if length(trim(coalesce(p_note, ''))) < 3 then return public._err('note', 'Add a short reason for waiving the deposit.', 'note'); end if;
    update public.orders set order_status = 'confirmed', version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'confirmed', jsonb_build_object('reason', 'deposit waived', 'note', p_note));
    perform public._queue_email(o.id, 'guest_confirmed', v_email);

  elsif p_action = 'decline' then
    if o.order_status not in ('awaiting_review','awaiting_quote','awaiting_approval','awaiting_deposit') then
      return public._err('status', 'Only orders that are not yet confirmed can be declined.');
    end if;
    if v_paid > 0 then return public._err('status', 'Money has been paid on this order. Refund it first, then decline.'); end if;
    update public.orders set order_status = 'declined', decline_reason = nullif(trim(p_note), ''), version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'declined', jsonb_build_object('note', p_note));
    perform public._queue_email(o.id, 'guest_declined', v_email);

  elsif p_action = 'cancel' then
    if o.order_status in ('completed','declined','cancelled') then return public._err('status', 'This order is already closed.'); end if;
    if length(trim(coalesce(p_note, ''))) < 3 then return public._err('note', 'Add a short reason for the cancellation.', 'note'); end if;
    update public.orders set order_status = 'cancelled', cancelled_at = now(), version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'cancelled', jsonb_build_object('note', p_note, 'paid_total', v_paid));
    perform public._queue_email(o.id, 'guest_cancelled', v_email);

  elsif p_action = 'collected' then
    if o.order_status <> 'confirmed' then return public._err('status', 'Only confirmed orders can be marked as collected.'); end if;
    if o.production_status <> 'ready' then return public._err('stage', 'The kitchen has not marked this cake Ready yet. The quality check comes first.'); end if;
    if length(trim(coalesce(p_note, ''))) < 2 then return public._err('note', 'Enter who received the cake.', 'note'); end if;
    if v_paid < coalesce(o.final_total, o.estimate_total) then
      return public._err('balance', format('There is $%s still to pay. Record the payment first.', to_char(coalesce(o.final_total, o.estimate_total) - v_paid, 'FM999990.00')));
    end if;
    update public.orders set order_status = 'completed', fulfilment_status = (case when o.fulfilment_method = 'delivery' then 'delivered' else 'collected' end)::public.fulfilment_status, production_status = 'ready', handover_to = trim(p_note), handed_over_at = now(), handed_over_by = auth.uid(),
      completed_at = now(), version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'collected', jsonb_build_object('method', o.fulfilment_method, 'to', trim(p_note)));

  elsif p_action = 'note' then
    if length(trim(coalesce(p_note, ''))) = 0 then return public._err('note', 'Write a note first.', 'note'); end if;
    update public.orders set internal_notes = concat_ws(E'\n', internal_notes, to_char(now() at time zone 'Pacific/Fiji', 'DD Mon HH24:MI') || ' ' || coalesce(v_name, 'Staff') || ': ' || trim(p_note)),
      version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'note', jsonb_build_object('note', p_note));

  else
    return public._err('action', 'Unknown action.');
  end if;

  select * into o from public.orders where id = p_order;
  return jsonb_build_object('ok', true, 'status', o.order_status, 'payment_status', o.payment_status, 'version', o.version);
end $function$;

-- function: staff_print_brief
CREATE OR REPLACE FUNCTION public.staff_print_brief(p_order uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; b public.kitchen_briefs; v_snap jsonb; v_changes jsonb := '[]'; v_name text; v_new boolean := false;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot print kitchen briefs.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status not in ('confirmed','completed') then return public._err('status', 'A kitchen brief is available once the order is confirmed.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_snap := public._kitchen_snapshot(o.id);
  select * into b from public.kitchen_briefs where order_id = o.id order by version desc limit 1;
  if b.id is null or b.snapshot is distinct from v_snap then
    if b.id is not null then
      select coalesce(jsonb_agg(k), '[]') into v_changes from jsonb_object_keys(v_snap) k where v_snap->k is distinct from b.snapshot->k;
    end if;
    insert into public.kitchen_briefs (order_id, version, snapshot, changes, printed_by, printed_by_label)
    values (o.id, coalesce(b.version, 0) + 1, v_snap, v_changes, auth.uid(), v_name) returning * into b;
    update public.orders set brief_version = b.version where id = o.id;
    v_new := true;
  end if;
  perform public._log(o.id, auth.uid(), v_name, 'brief_printed', jsonb_build_object('version', b.version, 'new_version', v_new, 'changes', v_changes));
  return jsonb_build_object('ok', true, 'version', b.version, 'new_version', v_new, 'changes', b.changes,
                            'first_printed_at', b.printed_at, 'snapshot', v_snap);
end $function$;

-- function: staff_record_payment
CREATE OR REPLACE FUNCTION public.staff_record_payment(p_order uuid, p_kind text, p_method text, p_amount numeric, p_reference text DEFAULT NULL::text, p_note text DEFAULT NULL::text, p_idem uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_name text;
begin
  if not public.has_role('manager','finance','front_of_house') then return public._err('forbidden', 'Your login cannot record payments.'); end if;
  if p_kind in ('refund','adjustment') and not public.has_role('manager','finance') then
    return public._err('forbidden', 'Only a manager or finance can record refunds and adjustments.');
  end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  return public._record_payment(p_order, p_kind::public.payment_kind, p_method::public.payment_method, p_amount, p_reference, p_note, auth.uid(), v_name, p_idem);
exception when invalid_text_representation then return public._err('bad_input', 'Unknown payment type or method.');
end $function$;

-- function: staff_search_customers
CREATE OR REPLACE FUNCTION public.staff_search_customers(q text)
 RETURNS SETOF customer_summary
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_digits text := regexp_replace(coalesce(q, ''), '[^0-9]', '', 'g');
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then return; end if;
  if length(trim(coalesce(q, ''))) < 2 then return; end if;
  return query
    select s.* from public.customer_summary s join public.customers c on c.id = s.id
    where (length(v_digits) >= 3 and (c.phone_key like '%' || v_digits || '%'))
       or (length(v_digits) < 3 and lower(c.full_name) like '%' || lower(trim(q)) || '%')
    order by s.last_order_at desc nulls last limit 10;
end $function$;

-- function: staff_set_consent
CREATE OR REPLACE FUNCTION public.staff_set_consent(p_customer uuid, p_granted boolean, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.has_role('manager','front_of_house','marketing') then return public._err('forbidden', 'Your login cannot change marketing preferences.'); end if;
  if not exists (select 1 from public.customers where id = p_customer) then return public._err('customer', 'Customer not found.'); end if;
  insert into public.customer_consents (customer_id, granted, source, recorded_by)
  values (p_customer, p_granted, 'Staff: ' || coalesce(nullif(trim(p_note), ''), case when p_granted then 'customer opted in' else 'customer opted out' end), auth.uid());
  return jsonb_build_object('ok', true);
end $function$;

-- function: staff_set_fulfilment
CREATE OR REPLACE FUNCTION public.staff_set_fulfilment(p_order uuid, p_version integer, p_method text, p_zone text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_fee numeric DEFAULT NULL::numeric, p_contact text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; v_del jsonb; v_items numeric; v_fee numeric; v_paid numeric; v_basis numeric; v_name text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if p_version is distinct from o.version then return public._err('changed', 'Someone else just updated this order. It has been refreshed, please check it again.'); end if;
  if o.order_status in ('completed','declined','cancelled') then return public._err('status', 'This order is already closed.'); end if;
  v_del := public._delivery_check(o.location_id, p_method, p_zone, p_address, p_fee, p_contact);
  if not (v_del->>'ok')::boolean then return v_del; end if;
  v_fee := (v_del->>'fee')::numeric;
  select coalesce(sum(unit_price * quantity), 0) into v_items from public.order_items where order_id = o.id;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_basis := case when o.final_total is null then v_items + v_fee else o.final_total - o.delivery_fee + v_fee end;
  update public.orders set fulfilment_method = v_del->>'method', delivery_zone = v_del->>'zone', delivery_address = v_del->>'address',
    delivery_fee = v_fee, delivery_contact = v_del->>'contact',
    estimate_total = v_items + v_fee,
    final_total = case when final_total is null then null else final_total - delivery_fee + v_fee end,
    payment_status = case when v_paid >= v_basis and v_basis > 0 then 'paid' when v_paid > 0 then 'deposit_paid' else payment_status end::public.payment_status,
    version = version + 1
  where id = o.id;
  perform public._log(o.id, auth.uid(), v_name, 'fulfilment', jsonb_build_object('method', v_del->>'method', 'zone', v_del->>'zone', 'fee', v_fee));
  return jsonb_build_object('ok', true, 'total', v_basis);
end $function$;

-- function: submit_online_order
CREATE OR REPLACE FUNCTION public.submit_online_order(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public._create_order(p, 'online', null, 'Guest (online)')
$function$;

-- function: touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin new.updated_at := now(); return new; end $function$;

-- function: write_audit
CREATE OR REPLACE FUNCTION public.write_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'user_id'),
          lower(tg_op),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $function$;

