-- Draft only: isolated-DB QA required. Based on live function definitions as of 2026-10-28.
begin;

create table if not exists public.cake_addon_quotes (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 quote_version integer not null, lines jsonb not null,
 base_total numeric(12,2) not null, addon_total numeric(12,2) not null, quoted_total numeric(12,2) not null,
 status text not null default 'pending' check(status in ('pending','accepted','superseded')),
 quoted_by uuid, quoted_at timestamptz not null default now(),
 accepted_by uuid, accepted_at timestamptz, acceptance_method text, acceptance_note text,
 unique(order_id,quote_version)
);
create index if not exists cake_addon_quotes_order_idx on public.cake_addon_quotes(order_id,quote_version desc);
alter table public.cake_addon_quotes enable row level security;
revoke all on public.cake_addon_quotes from public,anon,authenticated;
grant select on public.cake_addon_quotes to authenticated;
drop policy if exists cake_addon_quotes_staff_read on public.cake_addon_quotes;
create policy cake_addon_quotes_staff_read on public.cake_addon_quotes for select to authenticated using(public.has_perm('ord.edit'));

create or replace function public.staff_set_addon_quote(p_order uuid,p_version integer,p_lines jsonb)
returns jsonb language plpgsql security definer set search_path=public as $fn$
declare o public.orders; item jsonb; v_lines jsonb:='[]'::jsonb; v_desc text; v_qty int;
v_unit numeric; v_extra numeric:=0; v_total numeric; v_paid numeric; v_name text;
begin
 if not public.has_perm('ord.edit') then return public._err('forbidden','Your login cannot edit orders.'); end if;
 if not public.has_perm('ord.override') then return public._err('forbidden','A manager must approve extra charges.'); end if;
 select * into o from public.orders where id=p_order and deleted_at is null for update;
 if not found then return public._err('order','Order not found.'); end if;
 if p_version is distinct from o.version then return public._err('changed','Someone updated this order. Reopen it before repricing.'); end if;
 if o.order_type <> 'standard' or o.order_status not in ('awaiting_quote','awaiting_approval') or coalesce(o.customer_notes,'') not ilike 'Requested add-ons:%'
 then return public._err('status','Only unconfirmed standard cake requests with extras can use this quotation.'); end if;
 select coalesce(sum(amount),0) into v_paid from public.payments where order_id=o.id;
 if v_paid>0 then return public._err('payment','This order has a payment. Reconcile it before repricing.'); end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 8
 then return public._err('lines','Enter between one and eight extras.'); end if;
 for item in select value from jsonb_array_elements(p_lines) loop
   if jsonb_typeof(item)<>'object' then return public._err('lines','Check the extra details.'); end if;
   v_desc:=trim(coalesce(item->>'description',''));
   v_qty:=coalesce((item->>'quantity')::int,1);
   v_unit:=round((item->>'unit_price')::numeric,2);
   if length(v_desc) not between 2 and 120 or v_qty not between 1 and 50 or v_unit is null or v_unit<0 or v_unit>10000
     then return public._err('lines','Check the description, quantity and amount for each extra.'); end if;
   v_lines:=v_lines || jsonb_build_array(jsonb_build_object('description',v_desc,'quantity',v_qty,'unit_price',v_unit,'line_total',round(v_unit*v_qty,2)));
   v_extra:=v_extra+round(v_unit*v_qty,2);
 end loop;
 v_total:=round(o.estimate_total+v_extra,2);
 if v_total>100000 then return public._err('price','Check the final total.'); end if;
 select full_name into v_name from public.staff_profiles where user_id=auth.uid();
 update public.cake_addon_quotes set status='superseded' where order_id=o.id and status in ('pending','accepted');
 insert into public.cake_addon_quotes(order_id,quote_version,lines,base_total,addon_total,quoted_total,quoted_by)
 values(o.id,o.version+1,v_lines,o.estimate_total,v_extra,v_total,auth.uid());
 update public.orders set final_total=v_total,order_status='awaiting_approval',version=version+1 where id=o.id;
 perform public._log(o.id,auth.uid(),v_name,'addon_quote',jsonb_build_object('base_total',o.estimate_total,'extra_total',v_extra,'lines',v_lines,'total',v_total,'version',o.version+1));
 return jsonb_build_object('ok',true,'total',v_total,'base_total',o.estimate_total,'addon_total',v_extra,'version',o.version+1);
exception when invalid_text_representation or numeric_value_out_of_range then
 return public._err('lines','Check the extra quantity and price.');
end $fn$;
revoke all on function public.staff_set_addon_quote(uuid,integer,jsonb) from public,anon;
grant execute on function public.staff_set_addon_quote(uuid,integer,jsonb) to authenticated;

create or replace function public.staff_accept_addon_quote(p_order uuid,p_version integer,p_method text,p_note text)
returns jsonb language plpgsql security definer set search_path=public as $fn$
declare o public.orders; q public.cake_addon_quotes; v_name text;
begin
 if not public.has_perm('ord.status') then return public._err('forbidden','Your login cannot confirm customer agreement.'); end if;
 select * into o from public.orders where id=p_order and deleted_at is null for update;
 if not found then return public._err('order','Order not found.'); end if;
 if p_version is distinct from o.version or o.order_status<>'awaiting_approval'
 then return public._err('changed','The quote has changed. Reopen the order.'); end if;
 select * into q from public.cake_addon_quotes where order_id=o.id and quote_version=o.version and status='pending' for update;
 if not found or q.quoted_total is distinct from o.final_total
 then return public._err('quote','No current quotation is ready for approval.'); end if;
 if p_method not in ('email','whatsapp','phone','in_person') or length(trim(coalesce(p_note,'')))<3
 then return public._err('agreement','Record how the customer agreed and the evidence.'); end if;
 if p_method='email' and not exists(select 1 from public.email_outbox e where e.order_id=o.id and e.kind='guest_quote' and e.status='sent' and e.created_at>=q.quoted_at)
 then return public._err('email','The latest price email is not yet sent. Wait or record a different contact method.'); end if;
 select full_name into v_name from public.staff_profiles where user_id=auth.uid();
 update public.cake_addon_quotes set status='accepted',accepted_at=now(),accepted_by=auth.uid(),acceptance_method=p_method,acceptance_note=trim(p_note) where id=q.id;
 perform public._log(o.id,auth.uid(),v_name,'addon_quote_accepted',jsonb_build_object('quote_version',q.quote_version,'price',q.quoted_total,'method',p_method,'evidence',trim(p_note)));
 return jsonb_build_object('ok',true,'accepted',true,'version',o.version,'total',q.quoted_total);
end $fn$;
revoke all on function public.staff_accept_addon_quote(uuid,integer,text,text) from public,anon;
grant execute on function public.staff_accept_addon_quote(uuid,integer,text,text) to authenticated;

-- Existing functions updated narrowly to handle add-on quotations.
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
  v_req := p->>'product_code' = 'custom-cake';  -- staff and website
  if v_req then
    v_variant := nullif(trim(coalesce(p->>'variant', '')), '');
    v_size_note := nullif(trim(coalesce(p->>'size_note', '')), '');
    if v_size_note is null or length(v_size_note) < 2 then return public._err('size_note', 'Enter the size or how many people it should serve.', 'size_note'); end if;
    if length(v_size_note) > 80 then return public._err('size_note', 'Keep the size to 80 characters.', 'size_note'); end if;
    if length(coalesce(v_variant, '')) > 80 then return public._err('variant', 'Keep the flavour to 80 characters.', 'variant'); end if;
    v_price := case when v_staff then round(nullif(p->>'price', '')::numeric, 2) end;  -- the website never sets a price
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
  select x into v_bad from unnest(v_diet) x where x not in ('Nuts','Gluten (coeliac)','Dairy','Egg','Other','Vegetarian (eggless)','Gluten-free','Nut allergy') limit 1;
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
  if (v_date < v_today and not v_staff) or (v_date = v_today and v_time <= v_now) then return public._err('date', 'That time has already passed.', 'date'); end if;
  if v_date >= v_today and v_date < v_today + v_lead then
    if v_staff and length(trim(coalesce(p->'rush'->>'reason', ''))) >= 3 then
      v_rush := true; v_rush_reason := trim(p->'rush'->>'reason');
    else
      return public._err('date', format('This cake needs %s days'' notice. The earliest date is %s.', v_lead, to_char(v_today + v_lead, 'FMDay FMDD FMMonth')),
                         'date', jsonb_build_object('min_date', v_today + v_lead, 'rush_allowed', v_staff));
    end if;
  end if;
  if v_date > v_today + loc.max_days_ahead then return public._err('date', format('We take cake orders up to %s days ahead.', loc.max_days_ahead), 'date'); end if;
  if v_date >= v_today and exists (select 1 from public.closed_dates where location_id = loc.id and closed_on = v_date) then
    return public._err('date', 'We are closed for cake collections on that day. Please choose another date.', 'date');
  end if;
  if v_time < loc.collection_open or v_time > loc.collection_close then
    return public._err('time', format('Collection is between %s and %s.', to_char(loc.collection_open, 'FMHH12:MI AM'), to_char(loc.collection_close, 'FMHH12:MI AM')), 'time');
  end if;
  v_mins := extract(hour from v_time)::int * 60 + extract(minute from v_time)::int;
  if v_mins % loc.slot_minutes <> 0 then return public._err('time', 'Choose one of the listed collection times.', 'time'); end if;

  -- Daily capacity (only when a limit is set). The location row lock stops two orders taking the last place at once.
  if v_date >= v_today and loc.daily_capacity is not null then
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
  v_status := case when v_req and v_price is not null then 'awaiting_approval' when v_finish = 'custom' then 'awaiting_quote' when v_finish = 'standard' and (nullif(trim(coalesce(p->>'addon_details','')), '') is not null or coalesce(p->>'notes','') ilike 'Requested add-ons:%') then 'awaiting_quote' else 'awaiting_review' end;
  if length(coalesce(p->>'addon_details','')) > 250 then return public._err('addon_details','Keep extra requests to 250 characters.','addon_details'); end if;
  if v_finish = 'standard' and (nullif(trim(coalesce(p->>'addon_details','')), '') is not null or coalesce(p->>'notes','') ilike 'Requested add-ons:%') and coalesce((p->'payment'->>'amount')::numeric,0) > 0 then return public._err('payment','Agree the final add-on price before taking payment.','payment'); end if;
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
      case when v_staff then 'staff-app-v2' else 'online-form-v3' end, 'Ticked on order ' || v_ref, v_order, p_actor, v_ckey, v_contact_email);
  end if;

  -- Staff can confirm a standard cake at the counter, with or without a deposit
  if v_staff and coalesce((p->>'confirm_now')::boolean, false) and v_finish = 'standard' and not (nullif(trim(coalesce(p->>'addon_details','')), '') is not null or coalesce(p->>'notes','') ilike 'Requested add-ons:%') then
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
  if v_date >= v_today then
    perform public._queue_email(v_order,
      case v_status when 'confirmed' then 'guest_confirmed' when 'awaiting_deposit' then 'guest_deposit_needed' else 'guest_received' end,
      v_contact_email);
  end if;

  return jsonb_build_object('ok', true, 'order_id', v_order, 'reference', v_ref, 'status', v_status, 'estimate', v_total,
                            'customer_id', v_cust, 'lead_days', v_lead);
exception
  when sqlstate 'P0001' then
    return public._err('rejected', sqlerrm);
  when invalid_text_representation or invalid_datetime_format or datetime_field_overflow or numeric_value_out_of_range then
    return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end 
$function$

CREATE OR REPLACE FUNCTION public.staff_order_action(p_order uuid, p_action text, p_version integer, p_final_total numeric DEFAULT NULL::numeric, p_deposit numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.orders; v_name text; v_email text; v_paid numeric; v_total numeric; v_dep numeric; v_new public.order_status;
begin
  if not public.has_perm('ord.status') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if p_version is distinct from o.version then return public._err('changed', 'Someone else just updated this order. It has been refreshed, please check it again.'); end if;
  v_email := o.contact_email;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;

  if p_action = 'confirm' then
    if o.order_status not in ('awaiting_review','awaiting_quote','awaiting_approval') then
      return public._err('status', 'Only orders waiting for review or a quote can be confirmed.');
    end if;
    if exists(select 1 from public.cake_addon_quotes q where q.order_id=o.id) then
      if o.order_status <> 'awaiting_approval' or not exists(select 1 from public.cake_addon_quotes q where q.order_id=o.id and q.quote_version=o.version and q.status='accepted' and q.quoted_total=o.final_total)
        then return public._err('approval','Record agreement to the latest add-on quotation before confirming.'); end if;
      if p_final_total is not null and round(p_final_total,2) is distinct from o.final_total
        then return public._err('price','This price is agreed. Revise the quotation before changing it.'); end if;
    elsif o.order_type='standard' and o.order_status='awaiting_quote' and coalesce(o.customer_notes,'') ilike 'Requested add-ons:%'
      then return public._err('approval','Review and quote the extras first.');
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
    if not public.has_perm('ord.override') then return public._err('forbidden', 'Only a manager can waive a deposit.'); end if;
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
    if v_paid > 0 and not public.has_perm('ord.override') then return public._err('forbidden', 'Money has been paid on this order. Ask an Admin to cancel it.'); end if;
    if length(trim(coalesce(p_note, ''))) < 3 then return public._err('note', 'Add a short reason for the cancellation.', 'note'); end if;
    update public.orders set order_status = 'cancelled', cancelled_at = now(), cancel_reason = public._cancel_reason_code(p_note), version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'cancelled', jsonb_build_object('note', p_note, 'paid_total', v_paid, 'reason', public._cancel_reason_code(p_note)));
    perform public._queue_email(o.id, 'guest_cancelled', v_email);

  elsif p_action = 'collected' then
    if o.order_status <> 'confirmed' then return public._err('status', 'Only confirmed orders can be marked as collected.'); end if;
    if length(trim(coalesce(p_note, ''))) < 2 then return public._err('note', 'Enter who received the cake.', 'note'); end if;
    if v_paid < coalesce(o.final_total, o.estimate_total) then
      return public._err('balance', format('There is $%s still to pay. Record the payment first.', to_char(coalesce(o.final_total, o.estimate_total) - v_paid, 'FM999990.00')));
    end if;
    update public.orders set order_status = 'completed', fulfilment_status = (case when o.fulfilment_method = 'delivery' then 'delivered' else 'collected' end)::public.fulfilment_status, production_status = 'ready', handover_to = trim(p_note), handed_over_at = now(), handed_over_by = auth.uid(),
      completed_at = now(), version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'collected', jsonb_build_object('method', o.fulfilment_method, 'to', trim(p_note)));

  elsif p_action = 'note' then
    if length(trim(coalesce(p_note, ''))) = 0 then return public._err('note', 'Write a note first.', 'note'); end if;
    update public.orders set internal_notes = concat_ws(E'\n', internal_notes, to_char(now() at time zone 'Pacific/Fiji', 'DD Mon FMHH12:MI AM') || ' ' || coalesce(v_name, 'Staff') || ': ' || trim(p_note)),
      version = version + 1 where id = o.id;
    perform public._log(o.id, auth.uid(), v_name, 'note', jsonb_build_object('note', p_note));

  else
    return public._err('action', 'Unknown action.');
  end if;

  select * into o from public.orders where id = p_order;
  return jsonb_build_object('ok', true, 'status', o.order_status, 'payment_status', o.payment_status, 'version', o.version);
end $function$

CREATE OR REPLACE FUNCTION public.email_payload(p_order uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object(
    'order', to_jsonb(o) - 'manage_token' - 'idempotency_key',
    'item', to_jsonb(i),
    'customer', jsonb_build_object('full_name', o.contact_name, 'phone', o.contact_phone, 'email', o.contact_email, 'preferred_contact', coalesce(o.contact_pref, c.preferred_contact),
                                   'past_orders', (select count(*) from public.orders x where x.customer_id = o.customer_id and x.id <> o.id and x.deleted_at is null and x.order_status not in ('declined','cancelled'))),
    'location', jsonb_build_object('name', l.name, 'address', l.address, 'phone', l.phone, 'email', l.email, 'order_page_url', l.order_page_url),
    'paid_total', (select coalesce(sum(amount), 0) from public.payments where order_id = o.id),
    'treats', coalesce((select jsonb_agg(jsonb_build_object('name', x.name, 'detail', x.detail, 'quantity', x.quantity, 'price', x.unit_price) order by x.created_at) from public.order_extras x where x.order_id = o.id), '[]'::jsonb),
    'addon_quote', (select jsonb_build_object('lines',q.lines,'base_total',q.base_total,'addon_total',q.addon_total,'quoted_total',q.quoted_total,'quote_version',q.quote_version) from public.cake_addon_quotes q where q.order_id=o.id and q.status in ('pending','accepted') order by q.quote_version desc limit 1),
    'attachments', (select count(*) from public.order_attachments where order_id = o.id and removed_at is null),
    'config', (select jsonb_object_agg(key, value) from public.app_config where key in ('test_mode','test_email','from_email','reply_to','staff_app_url','guest_emails','review_link')),
    'cross_sell_ok', coalesce((select mc.granted and mc.wording_code = any(string_to_array((select value from public.app_config where key = 'cross_sell_wording'), ','))
        from public.marketing_consents mc where mc.customer_id = o.customer_id and mc.brand_id = l.brand_id and mc.channel = 'email'
        order by mc.recorded_at desc limit 1), false),
    'offers_declined', coalesce((select not mc.granted from public.marketing_consents mc
        where mc.customer_id = o.customer_id and mc.brand_id = l.brand_id and mc.channel = 'email'
        order by mc.recorded_at desc limit 1), false),
    'promo_cards', coalesce((select jsonb_agg(to_jsonb(pc) order by pc.sort_order) from public.promo_cards pc where pc.is_active), '[]'::jsonb)
  )
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  join public.locations l on l.id = o.location_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by created_at limit 1) i on true
  where o.id = p_order
  $function$

commit;
