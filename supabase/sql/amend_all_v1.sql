-- Corner Café cakes: Change order covers every part of an order, with one audit trail.
-- Adds to staff_amend_order: collection or delivery, delivery area, address, receiver, delivery fee, candles and deposit required.
-- Anyone who can change orders (ord.edit) can change the delivery area and fee, and the price of a custom cake.
-- Menu cakes keep the price list; only a manager can change their price (as before).
-- Every change is recorded in the order's change history: who made it, who asked for it, the reason, and each value from old to new.
-- Payments, status actions (confirm, cancel, hand over) and photos keep their own separate, logged actions.
-- Runs as one block: if any check at the end fails, nothing is changed.
do $amend_all$
begin
  execute $fn$
create or replace function public.staff_amend_order(p_order uuid, p_version integer, p_changes jsonb, p_requested_by text, p_reason text, p_commit boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $body$
declare
  o public.orders; it public.order_items; c public.customers; loc public.locations;
  prod public.products; sz public.product_sizes; v_name text; v_mgr boolean;
  ch jsonb := '[]'::jsonb; warn jsonb := '[]'::jsonb;
  n_date date; n_time time; n_prod public.products; n_variant text; n_size int; n_qty int; n_finish text; n_design text; n_msg text; n_occ text;
  n_hasdiet boolean; n_diet text[]; n_dnote text; n_knotes text; n_cnotes text; n_cname text; n_cemail text; n_cphone text; n_ckey text; n_price numeric;
  n_method text; n_zone text; n_addr text; n_fee numeric; n_dcontact text; n_candles text; n_deposit numeric; z public.delivery_zones; v_std_fee numeric;
  v_dep_given boolean := false; v_dep_done boolean := false;
  v_items_before numeric; v_items_after numeric; v_price_before numeric; v_price_after numeric; v_paid numeric;
  v_kitchen boolean := false; v_timechg boolean := false; v_ack boolean := false; v_reprint boolean := false;
  v_lead int; v_today date := (now() at time zone 'Pacific/Fiji')::date; v_count int; v_rev int; v_cause text; v_bad text;
  v_cake_changed boolean := false;
  fmt_d text; fmt_n text;
begin
  if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot amend orders.'); end if;
  v_mgr := public.has_perm('ord.override');
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
  n_cname := case when p_changes ? 'customer_name' then regexp_replace(trim(p_changes->>'customer_name'), '\s+', ' ', 'g') else o.contact_name end;
  n_cemail := case when p_changes ? 'customer_email' then nullif(lower(trim(p_changes->>'customer_email')), '') else o.contact_email end;
  n_cphone := case when p_changes ? 'customer_phone' then nullif(trim(p_changes->>'customer_phone'), '') else o.contact_phone end;
  n_ckey := case when p_changes ? 'customer_phone' then public._phone_key(n_cphone) else o.contact_phone_key end;
  n_candles := case when p_changes ? 'candles' then nullif(trim(p_changes->>'candles'), '') else it.candles end;
  if length(coalesce(n_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;

  -- Collection or delivery, area, address, receiver and fee. The fee fills in from the area and can be set to any amount.
  n_method := coalesce(nullif(p_changes->>'method', ''), o.fulfilment_method, 'collection');
  if n_method not in ('collection', 'delivery') then return public._err('method', 'Choose collection or delivery.', 'method'); end if;
  if p_changes ?| array['method', 'zone', 'address', 'fee', 'delivery_contact'] then
    if n_method = 'delivery' then
      n_zone := case when p_changes ? 'zone' then nullif(trim(p_changes->>'zone'), '') else o.delivery_zone end;
      n_addr := case when p_changes ? 'address' then nullif(trim(p_changes->>'address'), '') else o.delivery_address end;
      n_dcontact := case when p_changes ? 'delivery_contact' then nullif(trim(p_changes->>'delivery_contact'), '') else o.delivery_contact end;
      select * into z from public.delivery_zones where location_id = o.location_id and name = n_zone and active;
      if not found then return public._err('zone', 'Choose a delivery area.', 'zone'); end if;
      if length(coalesce(n_addr, '')) < 5 then return public._err('address', 'Enter the delivery address.', 'address'); end if;
      v_std_fee := z.fee;
      n_fee := case when p_changes ? 'fee' and nullif(trim(p_changes->>'fee'), '') is not null then round((p_changes->>'fee')::numeric, 2)
                    when o.fulfilment_method = 'delivery' and n_zone is not distinct from o.delivery_zone then o.delivery_fee
                    else z.fee end;
      if n_fee is null then return public._err('fee', 'Enter the delivery fee for this area.', 'fee'); end if;
      if n_fee < 0 then return public._err('fee', 'The delivery fee cannot be negative.', 'fee'); end if;
    else
      n_zone := null; n_addr := null; n_dcontact := null; n_fee := 0;
    end if;
  else
    n_method := coalesce(o.fulfilment_method, 'collection'); n_zone := o.delivery_zone; n_addr := o.delivery_address; n_dcontact := o.delivery_contact; n_fee := coalesce(o.delivery_fee, 0);
  end if;

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
  if n_hasdiet and cardinality(n_diet) = 0 and length(coalesce(n_dnote, '')) < 3 then return public._err('diet', 'Choose the dietary need or allergy, or write the details for the kitchen.', 'diet'); end if;
  if n_hasdiet and 'Other' = any(n_diet) and length(coalesce(n_dnote, '')) < 3 then return public._err('diet', 'You chose Other: write the dietary details for the kitchen.', 'diet'); end if;
  select x into v_bad from unnest(n_diet) x where x not in ('Vegetarian (eggless)','Gluten-free','Nut allergy','Other') limit 1;
  if v_bad is not null then return public._err('diet', 'Unknown dietary option.', 'diet'); end if;
  if length(coalesce(n_cname, '')) < 2 then return public._err('customer_name', 'Enter the customer name.', 'customer_name'); end if;
  if n_cemail is not null and n_cemail !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return public._err('customer_email', 'Check the email address.', 'customer_email'); end if;
  if p_changes ? 'customer_phone' and (n_cphone is null or n_ckey !~ '^[0-9]{7,15}$') then return public._err('customer_phone', 'Enter a mobile number, for example 912 3456.', 'customer_phone'); end if;

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
      select count(*) into v_count from public.orders where location_id = loc.id and deleted_at is null and required_date = n_date and id <> o.id and order_status not in ('declined','cancelled','completed');
      if v_count >= loc.daily_capacity then warn := warn || jsonb_build_array(format('%s already has %s cakes, the daily limit you set.', to_char(n_date, 'FMDay FMDD FMMonth'), v_count)); end if;
    end if;
  end if;

  fmt_d := to_char(o.required_date, 'FMDy FMDD FMMon'); fmt_n := to_char(n_date, 'FMDy FMDD FMMon');
  if n_date is distinct from o.required_date then ch := ch || jsonb_build_object('field','date','label','Date','from',fmt_d,'to',fmt_n,'kitchen',true); end if;
  if n_time is distinct from o.required_time then ch := ch || jsonb_build_object('field','time','label', case when n_method = 'delivery' then 'Delivery time' else 'Collection time' end,'from',public._fmt_time(o.required_time),'to',public._fmt_time(n_time),'kitchen',true); end if;
  if n_prod.id is distinct from prod.id or n_variant is distinct from it.variant then
    v_cake_changed := true;
    ch := ch || jsonb_build_object('field','cake','label','Cake','from',coalesce(it.variant, it.product_name),'to',coalesce(n_variant, n_prod.name, it.product_name),'kitchen',true); end if;
  if n_size is distinct from it.size_inch then v_cake_changed := true; ch := ch || jsonb_build_object('field','size','label','Cake size','from',it.size_inch || '-inch','to',n_size || '-inch','kitchen',true); end if;
  if n_qty is distinct from it.quantity then v_cake_changed := true; ch := ch || jsonb_build_object('field','quantity','label','Quantity','from',it.quantity::text,'to',n_qty::text,'kitchen',true); end if;
  if n_finish is distinct from it.finish then ch := ch || jsonb_build_object('field','finish','label','Finish','from',case it.finish when 'custom' then 'Custom design' else 'Standard finish' end,'to',case n_finish when 'custom' then 'Custom design' else 'Standard finish' end,'kitchen',true); end if;
  if n_design is distinct from it.design_description then ch := ch || jsonb_build_object('field','design','label','Design','from',coalesce(it.design_description,'None'),'to',coalesce(n_design,'None'),'kitchen',true); end if;
  if n_msg is distinct from it.cake_message then ch := ch || jsonb_build_object('field','message','label','Cake message','from',coalesce('“'||it.cake_message||'”','None'),'to',coalesce('“'||n_msg||'”','None'),'kitchen',true); end if;
  if n_candles is distinct from it.candles then ch := ch || jsonb_build_object('field','candles','label','Candles','from',coalesce(it.candles,'None'),'to',coalesce(n_candles,'None'),'kitchen',true); end if;
  if n_occ is distinct from it.occasion then ch := ch || jsonb_build_object('field','occasion','label','Occasion','from',coalesce(it.occasion,'None'),'to',coalesce(n_occ,'None'),'kitchen',false); end if;
  if n_hasdiet is distinct from o.has_dietary or n_diet is distinct from coalesce(it.dietary,'{}') or n_dnote is distinct from it.dietary_note then
    ch := ch || jsonb_build_object('field','dietary','label','Dietary and allergies',
      'from', case when o.has_dietary then coalesce(nullif(concat_ws('. ', nullif(array_to_string(it.dietary, ', '), ''), it.dietary_note), ''), 'Yes') else 'None' end,
      'to', case when n_hasdiet then coalesce(nullif(concat_ws('. ', nullif(array_to_string(n_diet, ', '), ''), n_dnote), ''), 'Yes') else 'None' end, 'kitchen', true); end if;
  if n_knotes is distinct from it.kitchen_notes then ch := ch || jsonb_build_object('field','kitchen_notes','label','Kitchen instructions','from',coalesce(it.kitchen_notes,'None'),'to',coalesce(n_knotes,'None'),'kitchen',true); end if;
  if n_cnotes is distinct from o.customer_notes then ch := ch || jsonb_build_object('field','customer_notes','label','Order notes','from',coalesce(o.customer_notes,'None'),'to',coalesce(n_cnotes,'None'),'kitchen',true); end if;
  if n_method is distinct from coalesce(o.fulfilment_method, 'collection') then ch := ch || jsonb_build_object('field','method','label','Collection or delivery','from',case when o.fulfilment_method = 'delivery' then 'Delivery' else 'Collection from the café' end,'to',case when n_method = 'delivery' then 'Delivery' else 'Collection from the café' end,'kitchen',true); end if;
  if n_zone is distinct from o.delivery_zone and n_method = 'delivery' then ch := ch || jsonb_build_object('field','zone','label','Delivery area','from',coalesce(o.delivery_zone,'None'),'to',n_zone,'kitchen',true); end if;
  if n_addr is distinct from o.delivery_address and n_method = 'delivery' then ch := ch || jsonb_build_object('field','address','label','Delivery address','from',coalesce(o.delivery_address,'None'),'to',n_addr,'kitchen',true); end if;
  if n_dcontact is distinct from o.delivery_contact and n_method = 'delivery' then ch := ch || jsonb_build_object('field','delivery_contact','label','Who receives it','from',coalesce(o.delivery_contact,'None'),'to',coalesce(n_dcontact,'None'),'kitchen',false); end if;
  if n_fee is distinct from coalesce(o.delivery_fee, 0) then ch := ch || jsonb_build_object('field','fee','label','Delivery fee','from','FJD ' || trim(to_char(coalesce(o.delivery_fee, 0),'FM999990.00')),
      'to','FJD ' || trim(to_char(n_fee,'FM999990.00')) || case when v_std_fee is not null and n_fee <> v_std_fee then ' (the area''s usual fee is FJD ' || trim(to_char(v_std_fee,'FM999990.00')) || ')' else '' end,'kitchen',false); end if;
  if n_cname is distinct from o.contact_name then ch := ch || jsonb_build_object('field','customer_name','label','Contact name on this order','from',o.contact_name,'to',n_cname,'kitchen',false); end if;
  if n_ckey is distinct from o.contact_phone_key then ch := ch || jsonb_build_object('field','customer_phone','label','Contact mobile on this order','from',coalesce(o.contact_phone,'None'),'to',coalesce(n_cphone,'None'),'kitchen',false); end if;
  if n_cemail is distinct from o.contact_email then ch := ch || jsonb_build_object('field','customer_email','label','Contact email on this order','from',coalesce(o.contact_email,'None'),'to',coalesce(n_cemail,'None'),'kitchen',false); end if;

  v_items_before := coalesce(it.unit_price, 0) * coalesce(it.quantity, 1);
  v_price_before := coalesce(o.final_total, o.estimate_total);
  v_items_after := case when v_cake_changed and sz.price is not null then sz.price * n_qty else v_items_before end;
  v_price_after := case when o.final_total is null then v_items_after + n_fee
                        else o.final_total - v_items_before + v_items_after - coalesce(o.delivery_fee, 0) + n_fee end;
  if p_changes ? 'price' and nullif(p_changes->>'price', '') is not null then
    -- Menu cakes keep the price list; a custom cake's price is agreed with the customer, so staff can change it
    if not (n_finish = 'custom' or it.product_name = 'Custom cake' or v_mgr) then
      return public._err('price', 'Menu cakes use the price list. Only a manager can change this price.', 'price');
    end if;
    n_price := round((p_changes->>'price')::numeric, 2);
    if n_price < 0 then return public._err('price', 'The price cannot be negative.', 'price'); end if;
    v_price_after := n_price;
  end if;
  if v_cake_changed and n_finish = 'custom' and n_price is null then warn := warn || jsonb_build_array('Custom cake: check whether the agreed price should change.'); end if;
  if v_price_after is distinct from v_price_before then ch := ch || jsonb_build_object('field','price','label','Order total','from','FJD ' || trim(to_char(v_price_before,'FM999990.00')),'to','FJD ' || trim(to_char(v_price_after,'FM999990.00')),'kitchen',false); end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;

  -- Deposit required: for orders already confirmed or waiting for a deposit
  if p_changes ? 'deposit_required' then
    v_dep_given := true;
    n_deposit := nullif(round(coalesce(nullif(trim(p_changes->>'deposit_required'), '')::numeric, 0), 2), 0);
    if o.order_status not in ('awaiting_deposit', 'confirmed') then return public._err('deposit_required', 'A deposit can be set once the order is confirmed.', 'deposit_required'); end if;
    if n_deposit is not null and (n_deposit < 0 or n_deposit > v_price_after) then return public._err('deposit_required', 'The deposit must be between zero and the order total.', 'deposit_required'); end if;
    if n_deposit is distinct from o.deposit_required then
      ch := ch || jsonb_build_object('field','deposit_required','label','Deposit required','from',coalesce('FJD ' || trim(to_char(o.deposit_required,'FM999990.00')),'None'),'to',coalesce('FJD ' || trim(to_char(n_deposit,'FM999990.00')),'None'),'kitchen',false);
      v_dep_done := o.order_status = 'awaiting_deposit' and (n_deposit is null or v_paid >= n_deposit);
      if v_dep_done then warn := warn || jsonb_build_array('The deposit is now covered, so this order moves to Confirmed.'); end if;
    end if;
  end if;

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
      'contact_only', exists (select 1 from jsonb_array_elements(ch) e where e->>'field' in ('customer_name','customer_email','customer_phone')));
  end if;

  v_rev := o.revision + 1;
  update public.order_items set product_id = coalesce(n_prod.id, product_id), product_name = coalesce(n_prod.name, product_name),
    variant = n_variant, size_inch = n_size, serves_label = coalesce(sz.serves_label, serves_label),
    unit_price = case when v_cake_changed and sz.price is not null then sz.price else unit_price end, quantity = n_qty,
    finish = n_finish, design_description = n_design, cake_message = n_msg, occasion = n_occ, dietary = n_diet,
    dietary_note = n_dnote, kitchen_notes = n_knotes, candles = n_candles
  where id = it.id;
  update public.orders set
    original_required_date = case when v_timechg then coalesce(original_required_date, required_date) else original_required_date end,
    original_required_time = case when v_timechg then coalesce(original_required_time, required_time) else original_required_time end,
    required_date = n_date, required_time = n_time, order_type = n_finish::public.order_type,
    has_dietary = n_hasdiet, customer_notes = n_cnotes,
    fulfilment_method = n_method, delivery_zone = n_zone, delivery_address = n_addr, delivery_fee = n_fee, delivery_contact = n_dcontact,
    estimate_total = case when final_total is null then v_price_after else v_items_after + n_fee end,
    final_total = case when final_total is null and n_price is null then null else v_price_after end,
    deposit_required = case when v_dep_given then n_deposit else deposit_required end,
    order_status = case when v_dep_done then 'confirmed'::public.order_status else order_status end,
    payment_status = case when v_paid > 0 and v_paid >= v_price_after then 'paid' when v_paid > 0 then 'deposit_paid' else payment_status end::public.payment_status,
    rush_override = rush_override or (v_timechg and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date),
    rush_reason = case when v_timechg and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date then trim(p_reason) else rush_reason end,
    revision = v_rev, amended_at = now(), version = version + 1
  where id = o.id;
  -- The customer's profile is not changed here. Staff edit the profile separately.
  if (n_cname, n_cemail, n_ckey) is distinct from (o.contact_name, o.contact_email, o.contact_phone_key) then
    update public.orders set contact_name = n_cname, contact_email = n_cemail, contact_phone = n_cphone, contact_phone_key = n_ckey where id = o.id;
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
end $body$
  $fn$;

  revoke all on function public.staff_amend_order(uuid, integer, jsonb, text, text, boolean) from public, anon;
  grant execute on function public.staff_amend_order(uuid, integer, jsonb, text, text, boolean) to authenticated;

  -- Checks
  if position('delivery_fee = n_fee' in pg_get_functiondef('public.staff_amend_order(uuid,integer,jsonb,text,text,boolean)'::regprocedure)) = 0 then
    raise exception 'Change order was not updated';
  end if;
  if has_function_privilege('anon', 'public.staff_amend_order(uuid,integer,jsonb,text,text,boolean)', 'execute') then
    raise exception 'Change order would be open without signing in';
  end if;
  raise notice 'Change order now covers delivery, fee, candles and deposit.';
end $amend_all$;

select 'Change order updated: delivery, fee, candles and deposit, with full change history' as result;
