-- Phase 1: amend existing orders safely, with a protected change history.
alter table public.orders
  add column if not exists revision int not null default 0,
  add column if not exists amended_at timestamptz,
  add column if not exists original_required_date date,
  add column if not exists original_required_time time;

create table if not exists public.order_amendments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  reference text not null,
  revision int not null,
  amended_at timestamptz not null default now(),
  staff_id uuid,
  staff_label text,
  requested_by text not null check (requested_by in ('guest','staff','other')),
  reason text not null check (length(trim(reason)) >= 3),
  time_change_cause text check (time_change_cause in ('guest_request','business_delay','other')),
  changes jsonb not null,
  price_before numeric, price_after numeric, paid numeric, balance_before numeric, balance_after numeric, excess_paid numeric,
  affects_kitchen boolean not null default false,
  kitchen_ack_required boolean not null default false,
  kitchen_ack_by text, kitchen_ack_at timestamptz,
  needs_reprint boolean not null default false,
  notification_status text,
  unique (order_id, revision)
);
alter table public.order_amendments enable row level security;
drop policy if exists "staff read amendments" on public.order_amendments;
create policy "staff read amendments" on public.order_amendments for select to authenticated using (public.has_role('manager','front_of_house','finance'));
revoke insert, update, delete on public.order_amendments from anon, authenticated;

-- History is permanent: no deletes, and the only later updates allowed are the kitchen acknowledgement and notification status.
create or replace function public.protect_amendments() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then raise exception 'Change history cannot be deleted.'; end if;
  if (to_jsonb(new) - 'kitchen_ack_by' - 'kitchen_ack_at' - 'notification_status')
     is distinct from (to_jsonb(old) - 'kitchen_ack_by' - 'kitchen_ack_at' - 'notification_status') then
    raise exception 'Change history cannot be edited. Make a new amendment instead.';
  end if;
  if old.kitchen_ack_at is not null and new.kitchen_ack_at is distinct from old.kitchen_ack_at then
    raise exception 'This change was already acknowledged.';
  end if;
  return new;
end $$;
drop trigger if exists t_amendments_protect on public.order_amendments;
create trigger t_amendments_protect before update or delete on public.order_amendments for each row execute function public.protect_amendments();

-- Order events are also append-only
create or replace function public.protect_events() returns trigger language plpgsql as $$
begin raise exception 'Order history cannot be edited or deleted.'; end $$;
drop trigger if exists t_events_protect on public.order_events;
create trigger t_events_protect before update or delete on public.order_events for each row execute function public.protect_events();

create or replace function public._fmt_time(t time) returns text language sql immutable as $$
  select ltrim(to_char(t, 'FMHH12:MI'), '0') || case when t < '12:00' then 'am' else 'pm' end $$;

-- Preview (p_commit false) or save (p_commit true) an amendment. Same checks either way.
create or replace function public.staff_amend_order(p_order uuid, p_version int, p_changes jsonb, p_requested_by text, p_reason text, p_commit boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
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

  -- New values: anything not sent stays as it is
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

  -- Checks
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

  -- What changed, in plain words
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

  -- Price: recalculated from the price list when the cake changes; a manager can set an agreed price
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
  if v_cake_changed and n_finish = 'custom' and not (p_changes ? 'price') then warn := warn || jsonb_build_array('Custom cake: check whether the agreed price should change.'); end if;
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

  -- Save the order and its history together (one transaction)
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
end $$;
revoke all on function public.staff_amend_order(uuid,int,jsonb,text,text,boolean) from public, anon;
grant execute on function public.staff_amend_order(uuid,int,jsonb,text,text,boolean) to authenticated;

-- Kitchen acknowledges the latest changes
create or replace function public.kitchen_ack_amendment(p_order uuid, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
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
end $$;
revoke all on function public.kitchen_ack_amendment(uuid,text) from public, anon;
grant execute on function public.kitchen_ack_amendment(uuid,text) to authenticated;

-- Kitchen board: show changes the kitchen has not acknowledged yet (no prices)
create or replace function public.kitchen_board(p_from date DEFAULT NULL::date, p_days integer DEFAULT 2)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
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
