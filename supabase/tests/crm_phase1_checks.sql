-- CRM Phase 1 checks. Run after crm_phase1.sql inside one batch that is rolled back at the end.
-- Uses invented customers on an unused number (999 0001). Nothing here is kept.
do $$
declare
  r jsonb := '{}'::jsonb; a jsonb; b jsonb; c3 jsonb; x uuid; y uuid; v int; t jsonb; prod text; sz int; d date; oa uuid;
  admin uuid := (select user_id from public.staff_profiles where role = 'admin' and active order by created_at limit 1);
  base jsonb;
begin
  -- Data carried over
  r := r || jsonb_build_object(
    'customers', (select count(*) from public.customers),
    'phone_unique_gone', not exists (select 1 from pg_indexes where indexname = 'customers_phone_key_key'),
    'orders_without_contact', (select count(*) from public.orders where contact_name is null),
    'orders_contact_differs', (select count(*) from public.orders o join public.customers c on c.id = o.customer_id
                                where (o.contact_name, o.contact_phone_key, o.contact_email) is distinct from (c.full_name, c.phone_key, c.email)),
    'orders_updated_at_changed', (select count(*) from public.orders o join backup_20261012.orders b on b.id = o.id where o.updated_at <> b.updated_at or o.version <> b.version),
    'consent_rows', (select count(*) from public.marketing_consents),
    'consent_reconfirm_customers', (select count(*) from public.customer_summary where consent_reconfirm),
    'opted_in_after', (select count(*) from public.customer_summary where marketing_opt_in),
    'summary_rows', (select count(*) from public.customer_summary),
    'location_brand', (select b.code from public.locations l join public.brands b on b.id = l.brand_id limit 1));

  -- Order setup for invented orders
  select p.code, s.size_inch into prod, sz from public.products p join public.product_sizes s on s.product_id = p.id
   where p.status = 'active' and s.active and not exists (select 1 from public.product_variants v where v.product_id = p.id and v.active)
   order by p.sort, s.size_inch limit 1;
  d := (now() at time zone 'Pacific/Fiji')::date + 20;
  while exists (select 1 from public.closed_dates where closed_on = d) loop d := d + 1; end loop;
  base := jsonb_build_object('product_code', prod, 'size_inch', sz, 'finish', 'standard', 'has_dietary', 'no', 'date', d, 'time', '12:00');

  -- Staff orders, no email given, so nothing is queued to send
  a := public._create_order(base || jsonb_build_object('customer', jsonb_build_object('name', 'Test Person Alpha', 'phone', '999 0001', 'opt_in', true)), 'walk_in', admin, 'Check');
  x := (a->>'customer_id')::uuid; oa := (a->>'order_id')::uuid;
  b := public._create_order(base || jsonb_build_object('customer', jsonb_build_object('name', 'test  person ALPHA', 'phone', '9990001')), 'walk_in', admin, 'Check');
  c3 := public._create_order(base || jsonb_build_object('customer', jsonb_build_object('name', 'Different Name', 'phone', '9990001')), 'walk_in', admin, 'Check');
  y := (c3->>'customer_id')::uuid;
  r := r || jsonb_build_object(
    'order_a_ok', a->>'ok', 'same_name_links', (b->>'customer_id')::uuid = x, 'new_name_new_profile', y <> x,
    'profile_name_kept', (select full_name from public.customers where id = x),
    'flagged', (select review_flag from public.customers where id = y),
    'order_c_contact', (select contact_name from public.orders where id = (c3->>'order_id')::uuid),
    'consent_from_order', (select count(*) from public.marketing_consents where customer_id = x),
    'x_opted', (select marketing_opt_in from public.customer_summary where id = x),
    'outbox_for_test', (select count(*) from public.email_outbox where order_id in (oa, (b->>'order_id')::uuid, (c3->>'order_id')::uuid)));
  -- An online order with an ambiguous number (two profiles) does not link to either
  t := public._create_order(base || jsonb_build_object('customer', jsonb_build_object('name', 'Test Person Alpha', 'phone', '9990001')), 'walk_in', admin, 'Check');
  r := r || jsonb_build_object('second_same_name_still_links', (t->>'customer_id')::uuid = x);

  -- Staff actions run as the admin login
  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', admin::text, true);
  select version into v from public.customers where id = x;
  r := r || jsonb_build_object('stale_version', public.staff_update_customer(x, v - 1, '{"full_name":"Changed"}')->>'error');
  r := r || jsonb_build_object('bad_birthday', public.staff_update_customer(x, v, '{"birth_day":31,"birth_month":2}')->>'error');
  r := r || jsonb_build_object('no_contact_left', public.staff_update_customer(x, v, '{"phone":""}')->>'error');
  r := r || jsonb_build_object('unknown_field', public.staff_update_customer(x, v, '{"phone_key":"1"}')->>'error');
  t := public.staff_update_customer(x, v, '{"phone":"999 0002","birth_day":29,"birth_month":2,"preferences":"Less sugar"}', false);
  r := r || jsonb_build_object('update', t,
    'orders_untouched_profile_only', (select contact_phone_key from public.orders where id = oa),
    'x_opted_after_phone_change', (select marketing_opt_in from public.customer_summary where id = x),
    'history', (select jsonb_agg(e->>'field') from jsonb_array_elements(public.customer_history(x)->'changes') e));
  t := public.staff_update_customer(x, v + 1, '{"full_name":"Test Person Alpha-Beta"}', true);
  r := r || jsonb_build_object('update_active', t->'orders_updated',
    'order_a_contact_now', (select contact_name || ' / ' || contact_phone_key from public.orders where id = oa),
    'order_event', (select count(*) from public.order_events where order_id = oa and kind = 'contact_updated'));
  -- Amending the contact on one order leaves the profile alone
  select version into v from public.orders where id = oa;
  t := public.staff_amend_order(oa, v, '{"customer_name":"Collected by Sam"}', 'guest', 'Different person collecting', true);
  r := r || jsonb_build_object('amend', t->>'ok', 'amend_contact', (select contact_name from public.orders where id = oa),
    'profile_after_amend', (select full_name from public.customers where id = x));
  -- Consent per channel, and kept to the number it was given for
  r := r || jsonb_build_object('consent_email_needs_email', public.staff_set_channel_consent(x, array['email'], true)->>'error',
    'consent_wa', public.staff_set_channel_consent(x, array['whatsapp'], true, 'Asked at the counter')->>'ok',
    'x_channels', (select jsonb_build_array(consent_whatsapp, consent_sms, consent_email) from public.customer_summary where id = x),
    'old_switch_off', public.staff_set_consent(x, false)->>'ok',
    'x_opted_off', (select marketing_opt_in from public.customer_summary where id = x));
  begin
    update public.marketing_consents set granted = true where customer_id = x;
    r := r || jsonb_build_object('consent_edit_blocked', false);
  exception when others then r := r || jsonb_build_object('consent_edit_blocked', true);
  end;
  -- Search
  r := r || jsonb_build_object(
    'search_no', (select count(*) from public.staff_search_customers('C-' || (select customer_no from public.customers where id = x)) s where s.id = x),
    'search_ref', (select count(*) from public.staff_search_customers(a->>'reference') s where s.id = x),
    'search_phone', (select count(*) from public.staff_search_customers('999 0001')),
    'search_name', (select count(*) from public.staff_search_customers('alpha-beta')),
    'search_pct', (select count(*) from public.staff_search_customers('%%')));
  -- Kitchen and email views use the name on the order
  r := r || jsonb_build_object('kitchen_name', public._kitchen_snapshot(oa)->>'customer', 'email_name', public.email_payload(oa)->'customer'->>'full_name');
  raise exception 'RESULT %', r;
end $$;
