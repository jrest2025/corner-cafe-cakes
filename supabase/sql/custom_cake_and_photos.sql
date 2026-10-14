-- Custom cakes that are not on the menu, taken by staff: New order, Custom cake, details, save (with or without a price),
-- add the price, email it to the customer, the customer agrees, Confirm order, kitchen.
-- Additive only:
--   order_items.size_inch may now be empty (a custom cake has no set tin size). Nothing is deleted; existing orders are unchanged.
--   _create_order rewritten with the same signature: staff may send product_code 'custom-cake' with size_note, flavour and an optional price.
--     Website orders cannot use it. Menu cakes work exactly as before.
--   New: staff_set_quote (add or change the price, flavour and size of a custom cake before it is confirmed; moves it to Waiting for customer).
--   New: staff_send_quote (emails the price to the customer; sending is not acceptance: staff still press Confirm order).
--   staff_resend_email rewritten with the same signature so Send again can also resend the price email.
--   Cake photos: order_attachments gets removed_at and removed_by. Staff can take an out-of-date photo off an open order;
--     it is hidden, not deleted (the file and the record stay, and the order history says who removed it and when).
--     The kitchen slip and kitchen board show only the current photos (_kitchen_snapshot rewritten with the same signature).
--     New: staff_remove_photo. staff_add_photos rewritten with the same signature (the 10-photo limit counts current photos only).
-- Rollback: restore _create_order, staff_resend_email, _kitchen_snapshot and staff_add_photos from this repository's history.
--   The new columns and functions can stay.

alter table public.order_items alter column size_inch drop not null;

create or replace function public._create_order(p jsonb, p_source order_source, p_actor uuid, p_label text)
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
  v_match jsonb; v_contact_email text; v_cphone text; v_ckey text; v_company text;
  v_req boolean := false; v_price numeric; v_size_note text;
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

  -- Cake. Staff can also take a custom cake that is not on the menu (product_code 'custom-cake'):
  -- no set size or price; it is saved as Needs a price, or Waiting for customer when staff already give the price.
  v_req := v_staff and p->>'product_code' = 'custom-cake';
  if v_req then
    v_variant := nullif(trim(coalesce(p->>'variant', '')), '');
    v_size_note := nullif(trim(coalesce(p->>'size_note', '')), '');
    if v_size_note is null or length(v_size_note) < 2 then return public._err('size_note', 'Enter the size or how many people it should serve.', 'size_note'); end if;
    if length(v_size_note) > 80 then return public._err('size_note', 'Keep the size to 80 characters.', 'size_note'); end if;
    if length(coalesce(v_variant, '')) > 80 then return public._err('variant', 'Keep the flavour to 80 characters.', 'variant'); end if;
    v_price := round(nullif(p->>'price', '')::numeric, 2);
    if v_price is not null and v_price <= 0 then return public._err('price', 'Enter a price above zero, or leave it empty.', 'price'); end if;
  else
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
  end if;
  v_qty := case when v_staff then greatest(1, least(50, coalesce((p->>'quantity')::int, 1))) else 1 end;

  -- Finish and details
  v_finish := case when v_req then 'custom' else coalesce(nullif(p->>'finish', ''), 'standard') end;
  if v_finish not in ('standard','custom') then return public._err('finish', 'Choose Standard finish or Custom design.', 'finish'); end if;
  if v_finish = 'custom' and not v_req and not prod.supports_custom then return public._err('finish', prod.name || ' is not available as a custom design. Choose Standard finish.', 'finish'); end if;
  if v_finish = 'custom' and length(trim(coalesce(p->>'design', ''))) < 3 then return public._err('design', 'Describe the design so our team can quote it.', 'design'); end if;
  v_msg := nullif(trim(coalesce(p->>'message', '')), '');
  if v_msg is not null and not v_req and not prod.supports_message then return public._err('message', prod.name || ' does not take a written message.', 'message'); end if;
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
      where location_id = loc.id and deleted_at is null and required_date = v_date and order_status not in ('declined','cancelled','completed');
    if v_count >= loc.daily_capacity and not (v_staff and v_rush) then
      return public._err('full', 'That day is fully booked for cakes. Please choose another date.', 'date');
    end if;
  end if;

  -- Customer: a profile staff chose, or a match on mobile number and name. An order never overwrites a profile.
  if v_staff and nullif(p->>'customer_id', '') is not null then
    select id, email, full_name, phone, phone_key, company into v_cust, v_cust_email, v_name, v_cphone, v_ckey, v_company
      from public.customers where id = (p->>'customer_id')::uuid and merged_into is null;
    if not found then return public._err('customer', 'That customer record was not found.', 'customer'); end if;
    v_email := lower(nullif(trim(coalesce(p->'customer'->>'email', '')), ''));
    if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('email', 'Check the email address.', 'email'); end if;
    if v_email is not null and v_cust_email is null then
      update public.customers set email = v_email, version = version + 1 where id = v_cust; v_cust_email := v_email;
    end if;
    v_contact_email := coalesce(v_email, v_cust_email);
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
      select count(*) into v_count from public.orders o
        where o.contact_phone_key = v_key and o.created_at > now() - interval '1 hour';
      if v_count >= 5 then return public._err('rate', 'We have already received several orders from this number. Please call us on ' || coalesce(loc.phone, 'the cafe') || '.'); end if;
      select count(*) into v_count from public.orders where source = 'online' and created_at > now() - interval '10 minutes';
      if v_count >= 60 then return public._err('busy', 'We are receiving a lot of orders right now. Please try again in a few minutes.'); end if;
    end if;
    v_match := public._match_customer(v_name, v_key);
    v_cust := nullif(v_match->>'id', '')::uuid;
    if v_cust is null then
      insert into public.customers (full_name, phone, phone_key, email, preferred_contact, first_source, created_by, review_flag, review_note)
      values (v_name, v_phone, v_key, v_email,
              case when coalesce((p->'customer'->>'whatsapp')::boolean, true) then 'whatsapp' else 'phone' end, p_source, p_actor,
              case when (v_match->>'same_phone')::int > 0 then 'possible_duplicate' end,
              case when (v_match->>'same_phone')::int > 0 then
                'Same mobile number as ' || (v_match->>'same_phone') || ' other profile' || case when (v_match->>'same_phone')::int > 1 then 's' else '' end ||
                case when (v_match->>'named')::int > 1 then ' with the same name' else ' with a different name' end || '. Check whether this is the same person.' end)
      returning id, email into v_cust, v_cust_email;
    else
      select email into v_cust_email from public.customers where id = v_cust;
      -- Staff may fill a missing email. Online orders never change a profile.
      if v_staff and v_email is not null and v_cust_email is null then
        update public.customers set email = v_email, version = version + 1 where id = v_cust; v_cust_email := v_email;
      end if;
    end if;
    v_cphone := v_phone; v_ckey := v_key;
    v_contact_email := coalesce(v_email, v_cust_email);
  end if;

  -- Create the order
  v_total := case when v_req then coalesce(v_price, 0) else sz.price * v_qty end;
  if coalesce(p->'delivery'->>'method', 'collection') = 'delivery' then
    -- online delivery: set-fee areas only, and the website never sets the fee
    if not v_staff and not exists (select 1 from public.delivery_zones z where z.location_id = loc.id and z.name = p->'delivery'->>'zone' and z.active and z.fee is not null) then
      return public._err('zone', 'We can''t deliver to that area from the website. Please call us on ' || coalesce(loc.phone, 'the cafe') || '.', 'zone');
    end if;
    v_del := public._delivery_check(loc.id, 'delivery', p->'delivery'->>'zone', p->'delivery'->>'address',
                                    case when v_staff then nullif(p->'delivery'->>'fee', '')::numeric end, p->'delivery'->>'contact');
    if not (v_del->>'ok')::boolean then return v_del; end if;
    v_total := v_total + (v_del->>'fee')::numeric;
  end if;
  v_status := case when v_req and v_price is not null then 'awaiting_approval' when v_finish = 'custom' then 'awaiting_quote' else 'awaiting_review' end;
  v_ref := 'CC-' || nextval('public.order_ref_seq');
  v_opt := coalesce((p->'customer'->>'opt_in')::boolean, false);

  insert into public.orders (reference, location_id, customer_id, source, order_type, order_status, required_date, required_time,
    estimate_total, final_total, has_dietary, customer_notes, rush_override, rush_reason, marketing_opt_in, idempotency_key, created_by, fulfilment_method, delivery_zone, delivery_address, delivery_fee, delivery_contact,
    contact_name, contact_phone, contact_phone_key, contact_email, contact_company)
  values (v_ref, loc.id, v_cust, p_source, v_finish::public.order_type, v_status, v_date, v_time,
    v_total, case when v_req and v_price is not null then v_total end, v_dietary_answer = 'yes', nullif(trim(coalesce(p->>'notes', '')), ''), v_rush, v_rush_reason, v_opt,
    nullif(p->>'idempotency_key', '')::uuid, p_actor, coalesce(v_del->>'method', 'collection'), v_del->>'zone', v_del->>'address', coalesce((v_del->>'fee')::numeric, 0), v_del->>'contact',
    v_name, v_cphone, v_ckey, v_contact_email, v_company)
  returning id into v_order;

  insert into public.order_items (order_id, product_id, product_name, variant, size_inch, serves_label, unit_price, quantity, finish,
    design_description, cake_message, occasion, dietary, dietary_note)
  values (v_order, prod.id, case when v_req then 'Custom cake' else prod.name end, v_variant, sz.size_inch, case when v_req then v_size_note else sz.serves_label end,
    case when v_req then round(coalesce(v_price, 0) / v_qty, 2) else sz.price end, v_qty, v_finish,
    nullif(trim(coalesce(p->>'design', '')), ''), v_msg, nullif(trim(coalesce(p->>'occasion', '')), ''), v_diet,
    case when v_dietary_answer = 'yes' then nullif(trim(coalesce(p->>'dietary_note', '')), '') end);

  perform public._log(v_order, p_actor, p_label, 'created',
    jsonb_build_object('source', p_source, 'status', v_status, 'estimate', v_total) ||
    case when v_req then jsonb_build_object('custom_cake', true, 'price', v_price) else '{}'::jsonb end ||
    case when v_rush then jsonb_build_object('rush_reason', v_rush_reason) else '{}'::jsonb end);

  for v_path in select jsonb_array_elements_text(coalesce(p->'attachments', '[]')) limit 5 loop
    if v_path like 'incoming/%'
       and exists (select 1 from storage.objects where bucket_id = 'cake-references' and name = v_path)
       and not exists (select 1 from public.order_attachments where storage_path = v_path) then
      insert into public.order_attachments (order_id, storage_path, file_name) values (v_order, v_path, regexp_replace(v_path, '^.*/', ''));
    end if;
  end loop;

  if v_opt then
    perform public._add_consent(v_cust, loc.brand_id, array['whatsapp','sms','email'], true, false,
      case when v_staff then 'Staff entered order (' || p_source || ')' else 'Online cake order form' end,
      case when v_staff then 'staff-app-v1' else 'online-form-v1' end, 'Ticked on order ' || v_ref, v_order, p_actor, v_ckey, v_contact_email);
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
  if p_source = 'online' then perform public._queue_email(v_order, 'staff_new_order', x) from unnest(public._split_emails(loc.alert_email)) x; end if;
  select order_status into v_status from public.orders where id = v_order;
  perform public._queue_email(v_order,
    case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
    v_contact_email);

  return jsonb_build_object('ok', true, 'order_id', v_order, 'reference', v_ref, 'status', v_status, 'estimate', v_total,
                            'customer_id', v_cust, 'lead_days', v_lead);
exception
  when sqlstate 'P0001' then
    return public._err('rejected', sqlerrm);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end $function$;

-- Staff: send the customer's latest email again (for example after a failure or a new email address)
create or replace function public.staff_resend_email(p_order uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare o public.orders; v_kind text; v_name text;
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Your login cannot send order emails.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null;
  if not found then return public._err('missing', 'That order was not found.'); end if;
  if coalesce(o.contact_email, '') = '' then return public._err('no_email', 'This order has no email address. Add one with Amend order first.'); end if;
  if coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return public._err('off', 'Customer emails are switched off.'); end if;
  if exists (select 1 from public.email_outbox where order_id = p_order and kind like 'guest\_%' and status in ('pending', 'sending')) then
    return public._err('busy', 'An email for this order is already on its way.'); end if;
  if exists (select 1 from public.email_outbox where order_id = p_order and kind like 'guest\_%' and created_at > now() - interval '2 minutes') then
    return public._err('soon', 'An email went to this customer in the last 2 minutes. Wait a moment before sending again.'); end if;
  select kind into v_kind from public.email_outbox where order_id = p_order and kind in ('guest_received', 'guest_quote', 'guest_confirmed', 'guest_deposit_needed', 'guest_declined', 'guest_cancelled')
    order by created_at desc limit 1;
  if v_kind is null then
    v_kind := case o.order_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed'
                when 'declined' then 'guest_declined' when 'cancelled' then 'guest_cancelled' else 'guest_received' end;
  end if;
  perform public._queue_email(p_order, v_kind, o.contact_email, true);
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(p_order, auth.uid(), v_name, 'email_resent', jsonb_build_object('kind', v_kind, 'to', o.contact_email));
  return jsonb_build_object('ok', true, 'kind', v_kind, 'to', o.contact_email);
end $$;


-- Staff: add or change the price of a custom cake before it is confirmed. For a custom cake not on the menu,
-- the flavour and the size or servings can be changed here too. The order moves to Waiting for customer.
create or replace function public.staff_set_quote(p_order uuid, p_version integer, p_price numeric, p_flavour text default null, p_size_note text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare o public.orders; it public.order_items; v_name text; v_price numeric := round(p_price, 2); v_req boolean; v_total numeric;
  v_flav text := nullif(trim(coalesce(p_flavour, '')), ''); v_size text := nullif(trim(coalesce(p_size_note, '')), ''); v_from jsonb;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if p_version is distinct from o.version then return public._err('changed', 'Someone else just updated this order. It has been refreshed, please check it again.'); end if;
  if o.order_type <> 'custom' then return public._err('type', 'Only custom cakes are priced here. Use Amend order for menu cakes.'); end if;
  if o.order_status not in ('awaiting_review', 'awaiting_quote', 'awaiting_approval') then
    return public._err('status', 'This order is already confirmed or closed. Use Amend order to change it.');
  end if;
  if v_price is null or v_price <= 0 then return public._err('price', 'Enter the agreed cake price.', 'price'); end if;
  if v_price > 100000 then return public._err('price', 'Check the price.', 'price'); end if;
  select * into it from public.order_items where order_id = o.id order by created_at limit 1;
  v_req := it.product_id is null and it.size_inch is null;
  if v_req then
    if v_size is null or length(v_size) < 2 then return public._err('size_note', 'Enter the size or how many people it should serve.', 'size_note'); end if;
    if length(v_size) > 80 then return public._err('size_note', 'Keep the size to 80 characters.', 'size_note'); end if;
    if length(coalesce(v_flav, '')) > 80 then return public._err('variant', 'Keep the flavour to 80 characters.', 'variant'); end if;
  end if;
  v_total := v_price + coalesce(o.delivery_fee, 0);
  v_from := jsonb_build_object('price', o.final_total, 'flavour', it.variant, 'size', it.serves_label, 'status', o.order_status);
  update public.order_items set unit_price = round(v_price / greatest(quantity, 1), 2),
    variant = case when v_req then v_flav else variant end, serves_label = case when v_req then v_size else serves_label end
  where id = it.id;
  update public.orders set final_total = v_total, estimate_total = v_total, order_status = 'awaiting_approval', version = version + 1 where id = o.id;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(o.id, auth.uid(), v_name, 'quoted', jsonb_build_object('from', v_from, 'price', v_price, 'total', v_total,
    'flavour', case when v_req then v_flav end, 'size', case when v_req then v_size end));
  select * into o from public.orders where id = o.id;
  return jsonb_build_object('ok', true, 'status', o.order_status, 'version', o.version, 'total', v_total,
    'can_email', coalesce(o.contact_email, '') <> '' and coalesce((select value from public.app_config where key = 'guest_emails'), 'false') = 'true');
end $function$;

-- Staff: email the price to the customer. Sending is not acceptance: staff still press Confirm order once the customer agrees.
create or replace function public.staff_send_quote(p_order uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare o public.orders; v_name text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot send order emails.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status <> 'awaiting_approval' or o.final_total is null then return public._err('status', 'Add the price first.'); end if;
  if coalesce(o.contact_email, '') = '' then return public._err('no_email', 'This order has no email address. Add one with Amend order, or tell the customer by phone or WhatsApp.'); end if;
  if coalesce((select value from public.app_config where key = 'guest_emails'), 'false') <> 'true' then return public._err('off', 'Customer emails are switched off. Tell the customer by phone or WhatsApp.'); end if;
  if exists (select 1 from public.email_outbox where order_id = o.id and kind like 'guest\_%' and status in ('pending', 'sending')) then
    return public._err('busy', 'An email for this order is already on its way.'); end if;
  if exists (select 1 from public.email_outbox where order_id = o.id and kind = 'guest_quote' and created_at > now() - interval '2 minutes') then
    return public._err('soon', 'The price went to this customer in the last 2 minutes. Wait a moment before sending again.'); end if;
  perform public._queue_email(o.id, 'guest_quote', o.contact_email, true);
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(o.id, auth.uid(), v_name, 'quote_sent', jsonb_build_object('to', o.contact_email, 'total', o.final_total));
  return jsonb_build_object('ok', true, 'to', o.contact_email);
end $function$;

grant execute on function public.staff_set_quote(uuid, integer, numeric, text, text) to authenticated;
grant execute on function public.staff_send_quote(uuid) to authenticated;
revoke execute on function public.staff_set_quote(uuid, integer, numeric, text, text) from anon;
revoke execute on function public.staff_send_quote(uuid) from anon;

-- ---------- Cake photos: take an out-of-date photo off an order (hidden, never deleted) ----------
alter table public.order_attachments add column if not exists removed_at timestamptz;
alter table public.order_attachments add column if not exists removed_by uuid;

create or replace function public._kitchen_snapshot(p_order uuid)
 returns jsonb language sql stable security definer set search_path to 'public'
as $function$
  select jsonb_build_object(
    'reference', o.reference, 'date', o.required_date, 'time', to_char(o.required_time, 'HH24:MI'),
    'method', o.fulfilment_method, 'area', o.delivery_zone,
    'customer', split_part(trim(o.contact_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(o.contact_name), ' ', 2), ''), 1) || '.', ''),
    'cake', i.product_name, 'variant', i.variant, 'size', i.size_inch, 'quantity', i.quantity, 'serves', i.serves_label,
    'finish', i.finish, 'design', i.design_description, 'message', i.cake_message, 'occasion', i.occasion,
    'has_dietary', o.has_dietary, 'dietary', to_jsonb(coalesce(i.dietary, '{}')), 'dietary_note', i.dietary_note,
    'kitchen_notes', i.kitchen_notes, 'order_notes', o.customer_notes, 'rush', o.rush_override,
    'photos', (select coalesce(jsonb_agg(a.storage_path order by a.created_at), '[]') from public.order_attachments a where a.order_id = o.id and a.removed_at is null))
    || case when nullif(trim(i.candles), '') is not null then jsonb_build_object('candles', i.candles) else '{}'::jsonb end
  from public.orders o
  left join lateral (select * from public.order_items x where x.order_id = o.id order by x.created_at limit 1) i on true
  where o.id = p_order
$function$;

create or replace function public.staff_add_photos(p_order uuid, p_paths text[])
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare v_ref text; v_have int; v_path text; v_added int := 0;
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Only front of house and managers can add photos.'); end if;
  select reference into v_ref from public.orders where id = p_order and deleted_at is null;
  if v_ref is null then return public._err('order', 'That order was not found.'); end if;
  if coalesce(array_length(p_paths, 1), 0) = 0 then return public._err('photos', 'Choose at least one photo.'); end if;
  select count(*) into v_have from public.order_attachments where order_id = p_order and removed_at is null;
  if v_have + array_length(p_paths, 1) > 10 then return public._err('photos', 'An order can hold up to 10 photos. It has ' || v_have || ' already.'); end if;
  foreach v_path in array p_paths loop
    if v_path !~ '^incoming/[^/]+/[^/]+$' then return public._err('photos', 'One of the photos was not uploaded properly. Remove it and try again.'); end if;
    if not exists (select 1 from storage.objects where bucket_id = 'cake-references' and name = v_path) then return public._err('photos', 'One of the photos has not finished uploading. Wait a moment and try again.'); end if;
    if not exists (select 1 from public.order_attachments where storage_path = v_path) then
      insert into public.order_attachments (order_id, storage_path, file_name) values (p_order, v_path, regexp_replace(v_path, '^.*/', ''));
      v_added := v_added + 1;
    end if;
  end loop;
  if v_added > 0 then
    perform public._log(p_order, auth.uid(), public._me_label(), 'photos_added', jsonb_build_object('count', v_added));
  end if;
  return jsonb_build_object('ok', true, 'added', v_added, 'reference', v_ref);
end $function$;

-- Staff: take a photo off an open order (for example a design the customer has replaced). Hidden, not deleted.
create or replace function public.staff_remove_photo(p_attachment uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare a public.order_attachments; o public.orders;
begin
  if not public.has_role('manager', 'front_of_house') then return public._err('forbidden', 'Only front of house and managers can remove photos.'); end if;
  select * into a from public.order_attachments where id = p_attachment;
  if not found or a.removed_at is not null then return public._err('photo', 'That photo is already off the order.'); end if;
  select * into o from public.orders where id = a.order_id and deleted_at is null for update;
  if not found then return public._err('order', 'That order was not found.'); end if;
  if o.order_status in ('completed', 'cancelled', 'declined') then return public._err('status', 'This order is closed, so its photos stay as they are.'); end if;
  update public.order_attachments set removed_at = now(), removed_by = auth.uid() where id = a.id;
  perform public._log(o.id, auth.uid(), public._me_label(), 'photo_removed', jsonb_build_object('file', a.file_name));
  return jsonb_build_object('ok', true, 'reference', o.reference, 'brief_needs_reprint', coalesce(o.brief_version, 0) > 0,
    'left', (select count(*) from public.order_attachments where order_id = o.id and removed_at is null));
end $function$;
grant execute on function public.staff_remove_photo(uuid) to authenticated;
revoke execute on function public.staff_remove_photo(uuid) from anon;
