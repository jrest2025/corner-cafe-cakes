-- Corner Café cakes: front end and back end alignment fixes (audit of 16 October 2026).
-- 1. Payment status always follows the money: recalculated whenever the price changes or a payment is recorded.
--    Fixes a custom cake with no price yet showing Paid after a deposit, and a price set later not updating Paid or Part paid.
--    Orders imported from the old order sheets (H- numbers) are left exactly as they were.
-- 2. The customer's choice on the website (WhatsApp or a call) is kept on the order, so staff and emails use it.
-- 3. Staff alert emails count only the photos still on the order (removed photos were counted).
-- 4. Backup Sheet: cancellation and deletion reasons now show in Change History (they were blank), kitchen progress,
--    quotes sent and slips printed are added, and All Cake Orders gains the agreed size for custom cakes, who receives a delivery and the delivery fee.
--    Email addresses stay out of the Sheet, as before.
-- 5. Cake menu: each cake can have a short description and a photo, set by managers in the staff app (Settings, Cake menu).
--    Photos go in a new public folder, cake-menu. Only managers can add or change them.
-- 6. Six early website orders get their allergy answer filled in from what was recorded (No).
-- 7. Photos for four cakes on the order page. Cheesecake and Strawberry keep the plain plate until a photo is added.
-- Runs as one block: if any check at the end fails, nothing is changed.
do $align_v1$
declare v_bad int;
begin
  -- 1. Payment status follows the money --------------------------------------------------------------
  execute $fn$
  create or replace function public._sync_payment_status() returns trigger
  language plpgsql security definer set search_path to 'public' as $b$
  declare v_paid numeric; v_refunds int; v_basis numeric;
  begin
    select coalesce(sum(amount), 0), count(*) filter (where kind = 'refund') into v_paid, v_refunds from public.payments where order_id = new.id;
    v_basis := coalesce(new.final_total, new.estimate_total, 0);
    new.payment_status := (case
      when v_paid <= 0 then case when v_refunds > 0 then 'refunded' else 'unpaid' end
      when v_basis > 0 and v_paid >= v_basis then 'paid'
      else 'deposit_paid' end)::public.payment_status;
    return new;
  end $b$
  $fn$;
  revoke all on function public._sync_payment_status() from public, anon, authenticated;
  drop trigger if exists t_orders_pay_sync on public.orders;
  create trigger t_orders_pay_sync before update of final_total, estimate_total, payment_status on public.orders
    for each row when (new.reference not like 'H-%' and new.deleted_at is null) execute function public._sync_payment_status();

  -- 2. WhatsApp or a call, as the customer chose on this order ----------------------------------------
  alter table public.orders add column if not exists contact_pref text;
  begin alter table public.orders add constraint orders_contact_pref_chk check (contact_pref in ('whatsapp', 'phone', 'email'));
  exception when duplicate_object then null; end;

  execute $fn$
  create or replace function public.submit_online_order(p jsonb) returns jsonb
  language plpgsql security definer set search_path to 'public' as $b$
    declare v_res jsonb; v_candles text := nullif(trim(coalesce(p->>'candles', '')), ''); v_answer text := p->>'has_dietary';
      v_camp text := nullif(lower(trim(coalesce(p->>'campaign', ''))), ''); v_ref text := nullif(left(trim(coalesce(p->>'referral', '')), 120), '');
      v_pref text := case when p->'customer'->>'whatsapp' = 'false' then 'phone' else 'whatsapp' end;
    begin
      if length(coalesce(v_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
      if length(trim(coalesce(p->>'occasion', ''))) > 60 then return public._err('occasion', 'Keep the occasion to 60 characters.', 'occasion'); end if;
      if length(coalesce(p->>'dietary_note', '')) > 200 then return public._err('diet', 'Keep the dietary note to 200 characters.', 'diet'); end if;
      if v_camp is not null and v_camp !~ '^[a-z0-9][a-z0-9_-]{0,59}$' then v_camp := null; end if;
      v_res := public._create_order(public._diet_unsure(p) - 'candles' - 'campaign' - 'referral', 'online', null, 'Guest (online)');
      if coalesce((v_res->>'ok')::boolean, false) and v_res ? 'order_id' and not coalesce((v_res->>'duplicate')::boolean, false) then
        if v_candles is not null then update public.order_items set candles = v_candles where order_id = (v_res->>'order_id')::uuid and candles is null; end if;
        update public.orders set dietary_status = case when v_answer in ('yes', 'no', 'unsure') then v_answer else dietary_status end,
          campaign = coalesce(v_camp, campaign), referral = coalesce(v_ref, referral), contact_pref = v_pref
        where id = (v_res->>'order_id')::uuid;
      end if;
      return v_res;
    end $b$
  $fn$;

  -- 3. Email facts: photos still on the order; contact preference from the order ---------------------
  execute $fn$
  create or replace function public.email_payload(p_order uuid) returns jsonb
  language sql stable security definer set search_path to 'public' as $b$
  select jsonb_build_object(
    'order', to_jsonb(o) - 'manage_token' - 'idempotency_key',
    'item', to_jsonb(i),
    'customer', jsonb_build_object('full_name', o.contact_name, 'phone', o.contact_phone, 'email', o.contact_email, 'preferred_contact', coalesce(o.contact_pref, c.preferred_contact),
                                   'past_orders', (select count(*) from public.orders x where x.customer_id = o.customer_id and x.id <> o.id and x.deleted_at is null and x.order_status not in ('declined','cancelled'))),
    'location', jsonb_build_object('name', l.name, 'address', l.address, 'phone', l.phone, 'email', l.email, 'order_page_url', l.order_page_url),
    'paid_total', (select coalesce(sum(amount), 0) from public.payments where order_id = o.id),
    'attachments', (select count(*) from public.order_attachments where order_id = o.id and removed_at is null),
    'config', (select jsonb_object_agg(key, value) from public.app_config where key in ('test_mode','test_email','from_email','reply_to','staff_app_url','guest_emails','review_link')),
    'cross_sell_ok', coalesce((select mc.granted and mc.wording_code = any(string_to_array((select value from public.app_config where key = 'cross_sell_wording'), ','))
        from public.marketing_consents mc where mc.customer_id = o.customer_id and mc.brand_id = l.brand_id and mc.channel = 'email'
        order by mc.recorded_at desc limit 1), false),
    'promo_cards', coalesce((select jsonb_agg(to_jsonb(pc) order by pc.sort_order) from public.promo_cards pc where pc.is_active), '[]'::jsonb)
  )
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  join public.locations l on l.id = o.location_id
  left join lateral (select * from public.order_items x where x.order_id = o.id order by created_at limit 1) i on true
  where o.id = p_order
  $b$
  $fn$;
  revoke all on function public.email_payload(uuid) from public, anon, authenticated;

  -- 4. Backup Sheet ---------------------------------------------------------------------------------
  execute $fn$
  create or replace function public.mirror_snapshot() returns jsonb
  language plpgsql stable security definer set search_path to 'public' as $b$
  declare v_today date := (now() at time zone 'Pacific/Fiji')::date; t_all jsonb; t_up jsonb; t_pay jsonb; t_hist jsonb;
  begin
    select jsonb_build_array(jsonb_build_array('Order', 'Source', 'Ordered on', 'Status', 'Kitchen stage', 'Collect or deliver', 'Date', 'Time', 'Customer', 'Mobile',
        'Cake', 'Size (inch)', 'Serves or size agreed', 'Quantity', 'Finish', 'Design', 'Writing on the cake', 'Candles', 'Occasion', 'Allergy or dietary', 'Kitchen instructions', 'Order notes',
        'Delivery area', 'Delivery address', 'Who receives it', 'Delivery fee (FJD)', 'Total (FJD)', 'Paid (FJD)', 'Balance (FJD)', 'Payment', 'Changes made', 'Last updated'))
      || coalesce(jsonb_agg(jsonb_build_array(b.reference, b.source_label, public._mirror_when(b.created_at), public._status_label(b.order_status::text),
        case when b.order_status in ('confirmed', 'completed') then public._stage_label(b.production_status::text) else '' end,
        case when b.method = 'delivery' then 'Delivery' else 'Collection' end, public._mirror_day(b.required_date), public._fmt_time(b.required_time), b.guest, b.phone,
        b.cake, coalesce(b.size_inch::text, ''), b.serves, b.quantity, b.finish, b.design, b.message, b.candles, b.occasion, b.diet, b.kitchen_notes, b.order_notes,
        b.zone, b.address, b.receiver, case when b.method = 'delivery' then b.delivery_fee end, b.total, b.paid,
        case when b.order_status in ('cancelled', 'declined') then 0 else greatest(b.total - b.paid, 0) end,
        public._mirror_pay(b.payment_status::text), b.revision, public._mirror_when(b.updated_at))
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
  end $b$
  $fn$;
  revoke all on function public.mirror_snapshot() from public, anon, authenticated;

  -- 5. Cake menu: description and photo ------------------------------------------------------------
  execute $fn$
  create or replace function public._product_snapshot(p_id uuid) returns jsonb
  language sql stable security definer set search_path to 'public' as $b$
  select jsonb_build_object('name', p.name, 'status', p.status, 'choice_label', p.choice_label, 'lead_days', p.lead_days,
    'supports_custom', p.supports_custom, 'supports_message', p.supports_message, 'dietary_info', p.dietary_info, 'allergen_info', p.allergen_info, 'sort', p.sort,
    'description', p.description, 'image_url', p.image_url,
    'flavours', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'active', v.active) order by v.sort, v.name) from public.product_variants v where v.product_id = p.id), '[]'),
    'sizes', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'inch', s.size_inch, 'price', s.price, 'serves', s.serves_label, 'active', s.active) order by s.size_inch) from public.product_sizes s where s.product_id = p.id), '[]'))
  from public.products p where p.id = p_id
  $b$
  $fn$;

  execute $fn$
  create or replace function public.staff_save_product(p jsonb) returns jsonb
  language plpgsql security definer set search_path to 'public' as $b$
  declare
    v_id uuid := nullif(p->>'id', '')::uuid; v_name text := trim(coalesce(p->>'name', '')); v_status text := coalesce(nullif(p->>'status', ''), 'active');
    v_before jsonb; v_after jsonb; v_code text; v_base text; n int := 0; v_label text; f jsonb; s jsonb; v_fid uuid; v_sid uuid; v_ord int := 0;
    v_names text[] := '{}'; v_inches int[] := '{}'; v_inch int; v_price numeric; v_lead int; v_sort int;
    v_desc text := nullif(trim(coalesce(p->>'description', '')), ''); v_img text := nullif(trim(coalesce(p->>'image_url', '')), '');
    v_has_desc boolean := p ? 'description'; v_has_img boolean := p ? 'image_url';
  begin
    if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change the cake menu.'); end if;
    if length(v_name) < 2 or length(v_name) > 60 then return public._err('name', 'Give the cake a name of 2 to 60 characters.', 'name'); end if;
    if v_status not in ('active', 'hidden') then return public._err('status', 'Unknown status.'); end if;
    if exists (select 1 from public.products x where lower(x.name) = lower(v_name) and x.id is distinct from v_id) then return public._err('name', 'Another cake already has this name.', 'name'); end if;
    if length(coalesce(v_desc, '')) > 160 then return public._err('description', 'Keep the description to 160 characters.', 'description'); end if;
    if v_img is not null and (length(v_img) > 500 or v_img !~ '^https://[^\s"<>]+$') then return public._err('image_url', 'The photo link is not valid. Upload the photo again.', 'image_url'); end if;
    v_lead := nullif(p->>'lead_days', '')::int;
    if v_lead is not null and (v_lead < 0 or v_lead > 60) then return public._err('lead_days', 'Notice must be between 0 and 60 days.', 'lead_days'); end if;
    for f in select * from jsonb_array_elements(coalesce(p->'flavours', '[]')) loop
      if length(trim(coalesce(f->>'name', ''))) = 0 then continue; end if;
      if length(trim(f->>'name')) > 40 then return public._err('flavours', 'Keep each flavour name to 40 characters.', 'flavours'); end if;
      if lower(trim(f->>'name')) = any (v_names) then return public._err('flavours', 'The flavour "' || trim(f->>'name') || '" is listed twice.', 'flavours'); end if;
      v_names := v_names || lower(trim(f->>'name'));
    end loop;
    for s in select * from jsonb_array_elements(coalesce(p->'sizes', '[]')) loop
      v_inch := nullif(s->>'inch', '')::int; v_price := nullif(s->>'price', '')::numeric;
      if v_inch is null or v_inch < 3 or v_inch > 24 then return public._err('sizes', 'Each size must be a whole number of inches between 3 and 24.', 'sizes'); end if;
      if v_inch = any (v_inches) then return public._err('sizes', 'The ' || v_inch || ' inch size is listed twice.', 'sizes'); end if;
      if v_price is null or v_price < 0 or v_price > 5000 then return public._err('sizes', 'Check the ' || v_inch || ' inch price.', 'sizes'); end if;
      v_inches := v_inches || v_inch;
    end loop;
    if v_status = 'active' and not exists (select 1 from jsonb_array_elements(coalesce(p->'sizes', '[]')) x where coalesce((x->>'active')::boolean, true)) then
      return public._err('sizes', 'A cake on sale needs at least one size offered.', 'sizes');
    end if;
    select full_name into v_label from public.staff_profiles where user_id = auth.uid();
    if v_id is null then
      v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')); if v_base = '' then v_base := 'cake'; end if;
      v_code := v_base; while exists (select 1 from public.products where code = v_code) loop n := n + 1; v_code := v_base || '-' || n; end loop;
      v_sort := coalesce(nullif(p->>'sort', '')::int, (select coalesce(max(sort), 0) + 1 from public.products));
      insert into public.products (code, name, choice_label, lead_days, supports_custom, supports_message, dietary_info, allergen_info, status, sort, swatch, description, image_url)
      values (v_code, v_name, nullif(trim(coalesce(p->>'choice_label', '')), ''), v_lead, coalesce((p->>'supports_custom')::boolean, true), coalesce((p->>'supports_message')::boolean, true),
              nullif(trim(coalesce(p->>'dietary_info', '')), ''), nullif(trim(coalesce(p->>'allergen_info', '')), ''), v_status, v_sort,
              'radial-gradient(circle at 50% 35%, #F3E3B8 0 55%, #C99A5B 56%)', v_desc, v_img)
      returning id into v_id;
    else
      if not exists (select 1 from public.products where id = v_id) then return public._err('product', 'This cake was not found. Refresh and try again.'); end if;
      v_before := public._product_snapshot(v_id);
      update public.products set name = v_name, choice_label = nullif(trim(coalesce(p->>'choice_label', '')), ''), lead_days = v_lead,
        supports_custom = coalesce((p->>'supports_custom')::boolean, supports_custom), supports_message = coalesce((p->>'supports_message')::boolean, supports_message),
        dietary_info = nullif(trim(coalesce(p->>'dietary_info', '')), ''), allergen_info = nullif(trim(coalesce(p->>'allergen_info', '')), ''),
        description = case when v_has_desc then v_desc else description end, image_url = case when v_has_img then v_img else image_url end,
        status = v_status, sort = coalesce(nullif(p->>'sort', '')::int, sort), updated_at = now()
      where id = v_id;
    end if;
    for f in select * from jsonb_array_elements(coalesce(p->'flavours', '[]')) loop
      if length(trim(coalesce(f->>'name', ''))) = 0 then continue; end if;
      v_ord := v_ord + 1; v_fid := nullif(f->>'id', '')::uuid;
      if v_fid is not null and exists (select 1 from public.product_variants where id = v_fid and product_id = v_id) then
        update public.product_variants set name = trim(f->>'name'), active = coalesce((f->>'active')::boolean, true), sort = v_ord where id = v_fid;
      else
        insert into public.product_variants (product_id, name, sort, active) values (v_id, trim(f->>'name'), v_ord, coalesce((f->>'active')::boolean, true))
        on conflict (product_id, name) do update set active = excluded.active, sort = excluded.sort;
      end if;
    end loop;
    for s in select * from jsonb_array_elements(coalesce(p->'sizes', '[]')) loop
      v_sid := nullif(s->>'id', '')::uuid;
      if v_sid is not null and exists (select 1 from public.product_sizes where id = v_sid and product_id = v_id) then
        update public.product_sizes set size_inch = (s->>'inch')::int, price = round((s->>'price')::numeric, 2), serves_label = nullif(trim(coalesce(s->>'serves', '')), ''),
          active = coalesce((s->>'active')::boolean, true), updated_at = now() where id = v_sid;
      else
        insert into public.product_sizes (product_id, size_inch, price, serves_label, active)
        values (v_id, (s->>'inch')::int, round((s->>'price')::numeric, 2), nullif(trim(coalesce(s->>'serves', '')), ''), coalesce((s->>'active')::boolean, true))
        on conflict (product_id, size_inch) do update set price = excluded.price, serves_label = excluded.serves_label, active = excluded.active, updated_at = now();
      end if;
    end loop;
    v_after := public._product_snapshot(v_id);
    if v_before is distinct from v_after then
      insert into public.product_changes (product_id, changed_by, changed_by_label, summary, before, after)
      values (v_id, auth.uid(), v_label, coalesce(p->'summary', '[]'), v_before, v_after);
    end if;
    return jsonb_build_object('ok', true, 'id', v_id, 'created', v_before is null, 'changed', v_before is distinct from v_after);
  exception when unique_violation then return public._err('duplicate', 'Two flavours or sizes clash. Check for the same name or size twice.');
  end $b$
  $fn$;

  -- Public folder for menu photos: anyone can view (the website shows them), only managers can add, replace or remove
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('cake-menu', 'cake-menu', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];
  drop policy if exists managers_add_menu_photos on storage.objects;
  drop policy if exists managers_change_menu_photos on storage.objects;
  drop policy if exists managers_remove_menu_photos on storage.objects;
  create policy managers_add_menu_photos on storage.objects for insert to authenticated with check (bucket_id = 'cake-menu' and public.has_perm('mgmt.settings'));
  create policy managers_change_menu_photos on storage.objects for update to authenticated using (bucket_id = 'cake-menu' and public.has_perm('mgmt.settings')) with check (bucket_id = 'cake-menu' and public.has_perm('mgmt.settings'));
  create policy managers_remove_menu_photos on storage.objects for delete to authenticated using (bucket_id = 'cake-menu' and public.has_perm('mgmt.settings'));

  -- 6. Early website orders: the allergy answer recorded as No ------------------------------------
  update public.orders set dietary_status = case when has_dietary then 'yes' else 'no' end
  where source = 'online' and dietary_status is null and reference not like 'H-%';


  -- 7. Cake photos on the order page (hosted with the app, pinned to one version; managers can replace them in the staff app)
  update public.products p set image_url = 'https://cdn.jsdelivr.net/gh/jrest2025/corner-cafe-cakes@d34ff66373f8719fd47b0e986f306de6d7c321a1/dist/brand/cakes/' || p.code || '.jpg'
  where p.code in ('chocolate-mudcake-mocha', 'red-velvet', 'black-white-forest', 'vanilla-pina-colada') and p.image_url is null;

  -- Checks --------------------------------------------------------------------------------------------
  select count(*) into v_bad
  from public.orders o left join (select order_id, sum(amount) paid, count(*) filter (where kind = 'refund') refunds from public.payments group by 1) s on s.order_id = o.id
  where o.deleted_at is null and o.reference not like 'H-%'
    and o.payment_status::text <> case when coalesce(s.paid, 0) <= 0 then case when coalesce(s.refunds, 0) > 0 then 'refunded' else 'unpaid' end
      when coalesce(o.final_total, o.estimate_total, 0) > 0 and s.paid >= coalesce(o.final_total, o.estimate_total) then 'paid' else 'deposit_paid' end;
  if v_bad > 0 then raise exception 'Payment status does not match the money on % orders', v_bad; end if;
  if not exists (select 1 from pg_trigger where tgname = 't_orders_pay_sync') then raise exception 'Payment status trigger missing'; end if;
  if (select jsonb_array_length(public.mirror_snapshot()->'tabs'->'All Cake Orders'->0)) <> 32 then raise exception 'All Cake Orders header is not 32 columns'; end if;
  if (select (public.mirror_snapshot()->'counts'->>'All Cake Orders')::int) < (select count(*) from public.orders where deleted_at is null and not coalesce(is_test, false)) then
    raise exception 'Backup copy is missing orders';
  end if;
  if has_function_privilege('anon', 'public.mirror_snapshot()', 'execute') or has_function_privilege('authenticated', 'public.mirror_snapshot()', 'execute') then
    raise exception 'Backup copy would be readable by staff or the public';
  end if;
  if has_function_privilege('anon', 'public.email_payload(uuid)', 'execute') then raise exception 'Email facts would be readable by the public'; end if;
  if not exists (select 1 from storage.buckets where id = 'cake-menu' and public) then raise exception 'Menu photo folder missing'; end if;
  if exists (select 1 from public.orders where source = 'online' and dietary_status is null and reference not like 'H-%' and deleted_at is null) then raise exception 'Website orders without an allergy answer'; end if;
  if not (public._product_snapshot((select id from public.products limit 1)) ? 'description') then raise exception 'Menu change log does not include the description'; end if;
  if not has_function_privilege('anon', 'public.submit_online_order(jsonb)', 'execute') then raise exception 'The website could no longer send orders'; end if;
  raise notice 'Alignment fixes installed.';
end $align_v1$;

select 'Alignment fixes installed' as result,
  (select public.mirror_snapshot()->'counts') as rows_per_tab,
  (select count(*) from public.orders where contact_pref is not null) as orders_with_contact_choice;
