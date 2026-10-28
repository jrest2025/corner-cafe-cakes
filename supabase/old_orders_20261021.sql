-- Corner Café cakes: old orders from paper slips, a duplicate warning, corrections after handover, and real years.
-- Roneel, 21 October 2026: "the form should allow our staff to renter orders that were taken ealier becasue we are now
-- doing all the cake entries that were done previously manually" and "Yes warn for duplicates.. yes allow correctiong for
-- old orders but all orders showu d have a clear audit traiut showing all changes".
--
-- 1. staff_enter_old_order(p): one call saves an old order (a cake handed over before today) the way it really happened:
--    ordered on the slip date, picked up (or delivered) on the pickup date, paid on the day it was paid. It goes through the normal order path (customer,
--    cake, occasion, permission to message), then is confirmed at the slip price and handed over. No kitchen slip, no
--    short-notice reason, no customer email (no thank-you either). If any part fails, nothing is saved.
-- 2. order_possible_duplicates(p): orders already in the system for the same customer that look like this one.
-- 3. staff_correct_order(...): corrections to an order that was already handed over, through the same checks and
--    history as Change order, with a reason. Recorded as "corrected" with every field's old and new value.
-- 4. Dates need a real year: a pickup date before 2015 is refused when an order is created, and an order date before
--    2015 when it is set.
-- Nothing here changes existing orders.

-- 4a. New orders: no pickup date before 2015 (the year was being cut to 1 or 2)
do $create$
declare d text; a text := $a$  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
$a$;
begin
  d := pg_get_functiondef('public.staff_create_order(jsonb)'::regprocedure);
  if position('Check the year of the pickup date' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'staff_create_order: anchor not found once'; end if;
  d := replace(d, a, a || $b$  if coalesce(p->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' and (p->>'date')::date < date '2015-01-01' then
    return public._err('date', 'Check the year of the pickup date.', 'date');
  end if;
$b$);
  execute d;
end $create$;

-- 4b. The order date ("When did they order?"): no year before 2015
do $taken$
declare d text; a text := $a$  if p_at is null or p_at > o.created_at + interval '1 minute' then return jsonb_build_object('ok', false, 'message', 'The time taken cannot be after the order was entered.'); end if;
$a$;
begin
  d := pg_get_functiondef('public.order_set_taken(uuid,timestamp with time zone)'::regprocedure);
  if position('Check the year of the order date' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'order_set_taken: anchor not found once'; end if;
  d := replace(d, a, a || $b$  if p_at < timestamptz '2015-01-01 00:00+12' then return jsonb_build_object('ok', false, 'message', 'Check the year of the order date.'); end if;
$b$);
  execute d;
end $taken$;

-- 3a. Change order learns a correction mode, switched on only by staff_correct_order for this one call: an order that
--     was already handed over can be corrected; its pickup date may be in the past (but not before 2015 or after today);
--     no closed-day, notice or capacity checks; never marked short notice; logged as "corrected".
do $amend$
declare d text; n int;
  pairs text[][] := array[
    array[$x$  v_cake_changed boolean := false;
$x$, $x$  v_cake_changed boolean := false;
  v_fix boolean := coalesce(current_setting('cc.correction', true), '') = 'on';
$x$],
    array[$x$  if o.order_status in ('completed','declined','cancelled') then$x$,
          $x$  if o.order_status in ('completed','declined','cancelled') and not (v_fix and o.order_status = 'completed') then$x$],
    array[$x$  if o.production_status = 'ready' and not v_mgr then$x$,
          $x$  if o.production_status = 'ready' and not v_mgr and not v_fix then$x$],
    array[$x$    if n_date < v_today or (n_date = v_today and n_time <= (now() at time zone 'Pacific/Fiji')::time) then return public._err('date', 'That time has already passed.', 'date'); end if;$x$,
          $x$    if v_fix and (n_date < date '2015-01-01' or n_date > v_today) then return public._err('date', 'This order was already handed over, so its pickup date is today or earlier. Check the year.', 'date'); end if;
    if not v_fix and (n_date < v_today or (n_date = v_today and n_time <= (now() at time zone 'Pacific/Fiji')::time)) then return public._err('date', 'That time has already passed.', 'date'); end if;$x$],
    array[$x$    if exists (select 1 from public.closed_dates where location_id = loc.id and closed_on = n_date) then$x$,
          $x$    if not v_fix and exists (select 1 from public.closed_dates where location_id = loc.id and closed_on = n_date) then$x$],
    array[$x$    if n_date < v_today + v_lead and n_date < o.required_date then$x$,
          $x$    if not v_fix and n_date < v_today + v_lead and n_date < o.required_date then$x$],
    array[$x$    if loc.daily_capacity is not null then
      select count(*) into v_count$x$,
          $x$    if loc.daily_capacity is not null and not v_fix then
      select count(*) into v_count$x$],
    array[$x$rush_override = rush_override or (v_timechg and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date),$x$,
          $x$rush_override = rush_override or (v_timechg and not v_fix and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date),$x$],
    array[$x$rush_reason = case when v_timechg and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date then trim(p_reason) else rush_reason end,$x$,
          $x$rush_reason = case when v_timechg and not v_fix and n_date < v_today + coalesce(v_lead, 0) and n_date < o.required_date then trim(p_reason) else rush_reason end,$x$],
    array[$x$perform public._log(o.id, auth.uid(), v_name, 'amended', jsonb_build_object($x$,
          $x$perform public._log(o.id, auth.uid(), v_name, case when v_fix then 'corrected' else 'amended' end, jsonb_build_object($x$]
  ];
begin
  d := pg_get_functiondef('public.staff_amend_order(uuid,integer,jsonb,text,text,boolean)'::regprocedure);
  if position('cc.correction' in d) > 0 then return; end if;
  for i in 1 .. array_length(pairs, 1) loop
    n := (length(d) - length(replace(d, pairs[i][1], ''))) / length(pairs[i][1]);
    if n <> 1 then raise exception 'staff_amend_order: anchor % found % times', i, n; end if;
    d := replace(d, pairs[i][1], pairs[i][2]);
  end loop;
  execute d;
end $amend$;

-- 3b. Correct an order that was already handed over
create or replace function public.staff_correct_order(p_order uuid, p_version integer, p_changes jsonb,
  p_requested_by text default 'other', p_reason text default null, p_commit boolean default false)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare o public.orders; v jsonb;
begin
  if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot correct orders.'); end if;
  select * into o from public.orders where id = p_order;
  if not found or o.deleted_at is not null then return public._err('order', 'Order not found.'); end if;
  if o.order_status <> 'completed' then
    return public._err('status', 'Only orders that were already handed over are corrected here. Use Change order.');
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then return public._err('reason', 'Say what is being corrected.', 'reason'); end if;
  perform set_config('cc.correction', 'on', true);
  v := public.staff_amend_order(p_order, p_version, p_changes, 'other', p_reason, p_commit);
  perform set_config('cc.correction', 'off', true);
  return v;
end $fn$;

-- 2. Orders already in the system for this customer that look like this one: within 2 days of the pickup date, or
--    (for an old order, p.wide) the same cake and size within 31 days, in case the date on one of them is wrong.
create or replace function public.order_possible_duplicates(p jsonb)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $fn$
declare v_cust uuid; v_key text; v_date date; v_prod uuid; v_size int; v_wide boolean := coalesce((p->>'wide')::boolean, false); r jsonb;
begin
  if not public.has_perm('ord.create') then return '[]'::jsonb; end if;
  if coalesce(p->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' then return '[]'::jsonb; end if;
  v_date := (p->>'date')::date;
  v_cust := case when coalesce(p->>'customer_id', '') ~ '^[0-9a-f-]{36}$' then (p->>'customer_id')::uuid end;
  v_key := nullif(public._phone_key(coalesce(p->'customer'->>'phone', p->>'phone', '')), '');
  if v_cust is null and v_key is null then return '[]'::jsonb; end if;
  select id into v_prod from public.products where code = p->>'product_code';
  v_size := case when coalesce(p->>'size_inch', '') ~ '^\d+$' then (p->>'size_inch')::int end;
  select coalesce(jsonb_agg(x order by gap, ref), '[]'::jsonb) into r from (
    select abs(o.required_date - v_date) as gap, o.reference as ref,
      jsonb_build_object('id', o.id, 'reference', o.reference, 'date', o.required_date, 'time', o.required_time,
        'cake', coalesce(i.variant, i.product_name), 'size', i.size_inch, 'total', coalesce(o.final_total, o.estimate_total),
        'status', o.order_status, 'name', o.contact_name) as x
    from public.orders o
    left join lateral (select * from public.order_items it where it.order_id = o.id order by it.created_at limit 1) i on true
    where o.deleted_at is null and not coalesce(o.is_test, false) and o.order_status not in ('declined', 'cancelled')
      and ((v_cust is not null and o.customer_id = v_cust) or (v_key is not null and o.contact_phone_key = v_key))
      and (abs(o.required_date - v_date) <= 2
           or (v_wide and abs(o.required_date - v_date) <= 31 and v_prod is not null and i.product_id = v_prod
               and coalesce(i.size_inch, 0) = coalesce(v_size, 0)))
    order by abs(o.required_date - v_date), o.reference
    limit 3) q;
  return r;
end $fn$;

-- 1. Enter an old order from a paper slip, in one go
create or replace function public.staff_enter_old_order(p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  v_today date := (now() at time zone 'Pacific/Fiji')::date;
  v_old jsonb := coalesce(p->'old', '{}'::jsonb);
  v_pick date; v_taken date; v_paid_on date; v_paid text; v_method text; v_who text;
  v_res jsonb; v_r jsonb; v_oid uuid; o public.orders; v_name text; v_total numeric; v_amount numeric; v_kind text;
  v_at timestamptz; v_ordered timestamptz; v_handover timestamptz; v_msg text; v_hint text;
begin
  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  if not public.has_perm('ord.status') then return public._err('forbidden', 'Your login cannot mark orders as handed over.'); end if;
  -- The dates on the slip
  if coalesce(p->>'date', '') !~ '^\d{4}-\d{2}-\d{2}$' then return public._err('date', 'Choose the pickup date from the slip.', 'date'); end if;
  v_pick := (p->>'date')::date;
  if v_pick < date '2015-01-01' then return public._err('date', 'Check the year of the pickup date.', 'date'); end if;
  -- Old orders are cakes already handed over before today. A cake for today or later is a New order (with the slip
  -- date under When did they order), and one handed over today is a New order marked Order completed.
  if v_pick >= v_today then
    return public._err('date', 'Old orders are for cakes picked up before today. For today or a later date, use New order and choose the slip date under When did they order.', 'date');
  end if;
  if coalesce(v_old->>'taken_on', '') !~ '^\d{4}-\d{2}-\d{2}$' then return public._err('taken', 'Choose the date on the slip (the day they ordered).', 'taken'); end if;
  v_taken := (v_old->>'taken_on')::date;
  if v_taken < date '2015-01-01' then return public._err('taken', 'Check the year of the order date.', 'taken'); end if;
  if v_taken > v_pick then return public._err('taken', 'The order date must be on or before the pickup date.', 'taken'); end if;
  -- Payment
  v_paid := coalesce(v_old->>'paid', '');
  if v_paid not in ('full', 'part', 'none') then return public._err('payment', 'Choose whether it was paid.', 'payment'); end if;
  if v_paid <> 'none' then
    if not public.has_perm('ord.payments') then return public._err('forbidden', 'Your login cannot record payments.'); end if;
    v_method := coalesce(v_old->>'method', '');
    if v_method not in ('cash', 'eftpos', 'bank_transfer', 'mpaisa', 'other') then return public._err('payment', 'Choose how they paid.', 'payment'); end if;
    if coalesce(v_old->>'paid_on', '') !~ '^\d{4}-\d{2}-\d{2}$' then return public._err('paid_on', 'Choose the day they paid.', 'paid_on'); end if;
    v_paid_on := (v_old->>'paid_on')::date;
    if v_paid_on < v_taken or v_paid_on > v_today then return public._err('paid_on', 'The day they paid must be between the order date and today.', 'paid_on'); end if;
  end if;
  v_who := nullif(regexp_replace(btrim(coalesce(v_old->>'taken_by', '')), '\s+', ' ', 'g'), '');
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_name := coalesce(v_name, 'Staff');

  begin
    -- The normal order path: customer, cake, occasion, permission to message, and the guard against saving twice.
    -- Payment, short notice and confirmation come from the slip below.
    v_res := public.staff_create_order((p - 'payment' - 'rush' - 'old' - 'deposit_required') || jsonb_build_object('confirm_now', false));
    if not coalesce((v_res->>'ok')::boolean, false) then return v_res; end if;
    if coalesce((v_res->>'duplicate')::boolean, false) then return v_res || jsonb_build_object('old', true); end if;
    v_oid := (v_res->>'order_id')::uuid;
    select * into o from public.orders where id = v_oid for update;
    -- A custom design is priced from the slip, through the same pricing step as any custom cake. Menu cakes keep the
    -- price list, as everywhere else.
    if o.order_type = 'custom' and o.final_total is null then
      if coalesce(v_old->>'price', '') !~ '^\d+(\.\d+)?$' or (v_old->>'price')::numeric <= 0 then
        raise exception using errcode = 'P0001', message = 'Enter the cake price from the slip.', hint = 'price';
      end if;
      v_r := public.staff_set_quote(v_oid, o.version, (v_old->>'price')::numeric, null, null);
      if not coalesce((v_r->>'ok')::boolean, false) then
        raise exception using errcode = 'P0001', message = coalesce(v_r->>'message', 'The price could not be saved.'), hint = 'price';
      end if;
      select * into o from public.orders where id = v_oid for update;
    end if;
    v_total := coalesce(o.final_total, o.estimate_total);
    if v_total is null or v_total <= 0 then
      raise exception using errcode = 'P0001', message = 'Enter the price from the slip.', hint = 'price';
    end if;
    v_handover := least((v_pick + coalesce(o.required_time, time '12:00')) at time zone 'Pacific/Fiji', now());
    v_ordered := least((v_taken + time '12:00') at time zone 'Pacific/Fiji', v_handover, now());
    -- When they ordered (unless it was today), and who took it
    if v_taken < v_today then
      v_r := public.order_set_taken(v_oid, v_ordered);
      if not coalesce((v_r->>'ok')::boolean, false) then
        raise exception using errcode = 'P0001', message = coalesce(v_r->>'message', 'The order date could not be saved.'), hint = 'taken';
      end if;
    end if;
    if v_who is not null then
      v_r := public.order_set_taken_by(v_oid, v_who);
      if not coalesce((v_r->>'ok')::boolean, false) then
        raise exception using errcode = 'P0001', message = coalesce(v_r->>'message', 'Who took the order could not be saved.'), hint = 'taken_by';
      end if;
    end if;
    -- Confirmed at the slip price
    select * into o from public.orders where id = v_oid for update;
    if o.order_status <> 'confirmed' then
      update public.orders set order_status = 'confirmed', final_total = v_total, confirmed_at = v_ordered, confirmed_by = auth.uid(),
        version = version + 1 where id = v_oid;
      perform public._log(v_oid, auth.uid(), v_name, 'confirmed', jsonb_build_object('final_total', v_total, 'note', 'Old order from a paper slip'));
    end if;
    -- Paid on the day it was paid
    if v_paid <> 'none' then
      v_amount := case when v_paid = 'full' then v_total else round(coalesce((v_old->>'amount')::numeric, 0), 2) end;
      if v_amount is null or v_amount <= 0 then
        raise exception using errcode = 'P0001', message = 'Enter the amount they paid.', hint = 'payment';
      end if;
      if v_amount > v_total then
        raise exception using errcode = 'P0001', message = 'That is more than the price. Choose Paid in full.', hint = 'payment';
      end if;
      v_kind := case when v_amount >= v_total then 'full' else 'deposit' end;
      -- Payments can never be changed once saved, so this one is saved with the day it was paid from the start.
      v_at := least((v_paid_on + time '12:00') at time zone 'Pacific/Fiji', now());
      insert into public.payments (order_id, kind, method, amount, note, recorded_by, recorded_at)
      values (v_oid, v_kind::public.payment_kind, v_method::public.payment_method, v_amount,
        'Old order from a paper slip: paid on ' || to_char(v_paid_on, 'FMDy FMDD FMMon YYYY'), auth.uid(), v_at);
      update public.orders set payment_status = (case when v_amount >= v_total then 'paid' else 'deposit_paid' end)::public.payment_status,
        version = version + 1 where id = v_oid;
      perform public._log(v_oid, auth.uid(), v_name, 'payment_recorded',
        jsonb_build_object('kind', v_kind, 'method', v_method, 'amount', v_amount, 'paid_total', v_amount, 'paid_on', v_paid_on));
    end if;
    -- Handed over on the pickup day. No thank-you email for an order from the past.
    select * into o from public.orders where id = v_oid for update;
    update public.orders set order_status = 'completed',
      fulfilment_status = (case when o.fulfilment_method = 'delivery' then 'delivered' else 'collected' end)::public.fulfilment_status,
      production_status = 'ready', ready_at = coalesce(ready_at, v_handover),
      handover_to = coalesce(nullif(btrim(o.contact_name), ''), 'Customer'), handed_over_at = v_handover, handed_over_by = auth.uid(),
      completed_at = v_handover, hold_thanks = true, version = version + 1
    where id = v_oid;
    perform public._log(v_oid, auth.uid(), v_name, 'collected',
      jsonb_build_object('method', o.fulfilment_method, 'to', coalesce(nullif(btrim(o.contact_name), ''), 'Customer'), 'on', v_pick));
    perform public._log(v_oid, auth.uid(), v_name, 'entered_later',
      jsonb_build_object('taken_on', v_taken, 'pickup', v_pick, 'paid', v_paid, 'paid_on', v_paid_on, 'amount', v_amount, 'taken_by', v_who));
  exception when sqlstate 'P0001' then
    get stacked diagnostics v_msg = message_text, v_hint = pg_exception_hint;
    return public._err('old_order', v_msg, nullif(v_hint, ''));
  end;
  return jsonb_build_object('ok', true, 'old', true, 'order_id', v_oid, 'reference', v_res->>'reference', 'status', 'completed',
    'pickup', v_pick, 'taken_on', v_taken, 'paid', coalesce(v_amount, 0), 'total', v_total, 'paid_on', v_paid_on);
end $fn$;

revoke all on function public.staff_enter_old_order(jsonb) from public, anon;
revoke all on function public.order_possible_duplicates(jsonb) from public, anon;
revoke all on function public.staff_correct_order(uuid, integer, jsonb, text, text, boolean) from public, anon;
grant execute on function public.staff_enter_old_order(jsonb) to authenticated, service_role;
grant execute on function public.order_possible_duplicates(jsonb) to authenticated, service_role;
grant execute on function public.staff_correct_order(uuid, integer, jsonb, text, text, boolean) to authenticated, service_role;
