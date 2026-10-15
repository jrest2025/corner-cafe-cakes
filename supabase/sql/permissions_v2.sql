-- Corner Cafe cakes: permissions, step 2. Every switch works.
-- Orders, money, kitchen, reports and admin move from the old level ticks to the permission switches,
-- checked on the server and in the database rules. Switches that would do nothing are removed.
-- One atomic, self-checking block: every active person must keep exactly the access they have today,
-- or nothing changes.
do $wrap$
declare
  r record; u record; d text; n int := 0; mism jsonb := '[]'::jsonb; o boolean; nw boolean;
begin
  -- 1. Groups on the permissions screen
  execute $X$alter table public.permissions drop constraint if exists permissions_module_check$X$;
  execute $X$alter table public.permissions add constraint permissions_module_check check (module = any (array['customers','orders','money','kitchen','reports','admin','management']))$X$;

  -- 2. The switch list: keep what the app checks, add what was missing, drop what did nothing
  create temp table _pmap (key text primary key, module text, label text, help text, risky boolean, sort int, roles text[]) on commit drop;
  insert into _pmap values
   ('nav.customers',  'customers', 'Customers screen in the menu', 'The customer list, groups and exports. Counter staff still see the customer on each order.', false, 9, array['manager','finance','marketing']),
   ('ord.view',       'orders',  'View orders', 'Orders list, order details and the calendar', false, 30, array['manager','front_of_house','finance','marketing']),
   ('ord.history',    'orders',  'View order change history', 'What changed on an order, and orders from the old sheets', false, 31, array['manager','front_of_house','finance']),
   ('ord.create',     'orders',  'Take new orders', null, false, 32, array['manager','front_of_house']),
   ('ord.edit',       'orders',  'Change orders', 'Cake, date, delivery, candles, photos, price for custom cakes, print slips', false, 33, array['manager','front_of_house']),
   ('ord.status',     'orders',  'Move orders on', 'Confirm, decline, hand over, mark collected, cancel', false, 34, array['manager','front_of_house']),
   ('ord.comms',      'orders',  'Send customer emails', 'Send the price, send updates, resend, hold the thank-you', false, 35, array['manager','front_of_house']),
   ('ord.override',   'orders',  'Approve exceptions', 'Waive a deposit, cancel an order with money paid, manager-only changes', true, 36, array['manager']),
   ('ord.restore',    'orders',  'See and restore deleted orders', null, true, 37, array[]::text[]),
   ('ord.delete',     'orders',  'Delete orders', null, true, 38, array[]::text[]),
   ('ord.payments',   'money',   'Record payments', 'Deposits and balances, and see payments', false, 40, array['manager','finance','front_of_house']),
   ('ord.refunds',    'money',   'Record refunds and adjustments', null, true, 41, array['manager','finance']),
   ('kit.view',       'kitchen', 'See the kitchen board', 'Confirmed cakes, stages and slips', false, 50, array['kitchen','manager','front_of_house']),
   ('kit.status',     'kitchen', 'Move cakes through the kitchen', 'Start, in progress, quality check, ready; who made it; acknowledge changes', false, 51, array['kitchen','manager','front_of_house']),
   ('kit.print',      'kitchen', 'Confirm slips printed', null, false, 52, array['kitchen','manager','front_of_house']),
   ('mgmt.analytics', 'reports', 'See the Dashboard', null, false, 70, array['manager','marketing']),
   ('mgmt.reports',   'reports', 'See the Register', 'Records from the old sheets', false, 71, array['manager','marketing','finance']),
   ('mgmt.register',  'reports', 'Review and fix Register records', null, true, 72, array['manager']),
   ('mgmt.settings',  'admin',   'Manage restaurant settings', 'Cakes and prices, hours, closed days, delivery areas, catalogue, backup check, slip log', true, 80, array['manager']),
   ('mgmt.system',    'admin',   'Printing, backup sheet and order alerts set-up', null, true, 81, array[]::text[]),
   ('mgmt.audit',     'admin',   'View the audit log', null, false, 82, array[]::text[]),
   ('staff.users',    'admin',   'Manage the team', 'Add staff, switch access on or off, change their level', true, 83, array[]::text[]);

  delete from public.level_permissions where perm_key in (select key from public.permissions where module <> 'customers' and key not in (select key from _pmap) and key <> 'staff.permissions');
  delete from public.staff_permission_overrides where perm_key in (select key from public.permissions where module <> 'customers' and key not in (select key from _pmap) and key <> 'staff.permissions');
  delete from public.permissions where module <> 'customers' and key not in (select key from _pmap) and key <> 'staff.permissions';
  insert into public.permissions (key, module, label, help, risky, live, sort)
    select key, module, label, help, risky, false, sort from _pmap
  on conflict (key) do update set module = excluded.module, label = excluded.label, help = excluded.help, risky = excluded.risky, sort = excluded.sort;
  update public.permissions set module = 'admin', label = 'Change what each level can do', help = 'This screen', sort = 84 where key = 'staff.permissions';

  -- 3. Each level gets exactly what its ticks gave it before (Admin gets everything)
  delete from public.level_permissions where perm_key in (select key from _pmap);
  insert into public.level_permissions (level_id, perm_key)
    select l.id, m.key from public.access_levels l cross join _pmap m
    where 'admin' = any(l.grants::text[]) or l.grants::text[] && m.roles
  on conflict do nothing;

  -- 4. New levels: the ticks become a starting template only
  execute $X$create or replace function public._perm_defaults(p_grants text[]) returns text[]
  language sql stable set search_path = public as $$
    select case when 'admin' = any(p_grants) then (select array_agg(key) from public.permissions) else array(select distinct k from unnest(
      case when 'manager' = any(p_grants) then array['cust.view','cust.create','cust.edit','cust.consent','cust.history','cust.comms','cust.followup','cust.oversee','cust.merge','cust.export',
        'ord.view','ord.history','ord.create','ord.edit','ord.status','ord.comms','ord.override','ord.payments','ord.refunds','kit.view','kit.status','kit.print',
        'mgmt.analytics','mgmt.reports','mgmt.register','mgmt.settings','nav.customers'] else '{}'::text[] end ||
      case when 'front_of_house' = any(p_grants) then array['cust.view','cust.create','cust.edit','cust.consent','cust.history','cust.followup',
        'ord.view','ord.history','ord.create','ord.edit','ord.status','ord.comms','ord.payments','kit.view','kit.status','kit.print'] else '{}'::text[] end ||
      case when 'finance' = any(p_grants) then array['cust.view','cust.history','ord.view','ord.history','ord.payments','ord.refunds','mgmt.reports','nav.customers'] else '{}'::text[] end ||
      case when 'marketing' = any(p_grants) then array['cust.view','cust.consent','cust.history','cust.followup','cust.export','ord.view','mgmt.analytics','mgmt.reports','nav.customers'] else '{}'::text[] end ||
      case when 'kitchen' = any(p_grants) then array['kit.view','kit.status','kit.print'] else '{}'::text[] end
    ) k where k in (select key from public.permissions)) end
  $$$X$;

  -- 5. The server checks move to the switches
  for r in select * from (values
    ('admin_alert_settings()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('admin_alert_settings_save(text[])', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('admin_delete_order(uuid,text,text)', $a$has_role('admin')$a$, $b$has_perm('ord.delete')$b$),
    ('admin_deleted_orders()', $a$has_role('admin')$a$, $b$has_perm('ord.restore')$b$),
    ('admin_restore_order(uuid)', $a$has_role('admin')$a$, $b$has_perm('ord.restore')$b$),
    ('admin_level_delete(uuid)', $a$has_role('admin')$a$, $b$has_perm('staff.permissions')$b$),
    ('admin_level_save(uuid,text,text[])', $a$has_role('admin')$a$, $b$has_perm('staff.permissions')$b$),
    ('admin_levels()', $a$has_role('admin')$a$, $b$has_perm('staff.permissions')$b$),
    ('admin_list_team()', $a$has_role('admin')$a$, $b$has_perm('staff.users')$b$),
    ('admin_list_users()', $a$has_role('admin')$a$, $b$has_perm('staff.users')$b$),
    ('admin_set_staff(uuid,text,text,boolean)', $a$has_role('admin')$a$, $b$has_perm('staff.users')$b$),
    ('admin_set_staff_level(uuid,text,uuid,boolean)', $a$has_role('admin')$a$, $b$has_perm('staff.users')$b$),
    ('admin_print_settings()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('admin_print_settings_save(jsonb)', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('admin_print_test()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('admin_print_test_confirm()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('admin_slip_log(integer)', $a$has_role('manager')$a$, $b$has_perm('mgmt.settings')$b$),
    ('admin_slip_resend(uuid)', $a$has_role('manager')$a$, $b$has_perm('mgmt.settings')$b$),
    ('backup_check()', $a$has_role('manager')$a$, $b$has_perm('mgmt.settings')$b$),
    ('dashboard_data()', $a$has_role('marketing', 'manager')$a$, $b$has_perm('mgmt.analytics')$b$),
    ('dashboard_register()', $a$has_role('marketing', 'manager')$a$, $b$has_perm('mgmt.analytics')$b$),
    ('kitchen_ack_amendment(uuid,text)', $a$has_role('kitchen','manager','front_of_house')$a$, $b$has_perm('kit.status')$b$),
    ('kitchen_assign(uuid,text)', $a$has_role('kitchen','manager','front_of_house')$a$, $b$has_perm('kit.status')$b$),
    ('kitchen_set_stage(uuid,text,text)', $a$has_role('kitchen','manager','front_of_house')$a$, $b$has_perm('kit.status')$b$),
    ('kitchen_board(date,integer)', $a$has_role('kitchen','manager','front_of_house')$a$, $b$has_perm('kit.view')$b$),
    ('kitchen_confirm_printed(uuid,integer)', $a$has_role('kitchen', 'manager', 'front_of_house')$a$, $b$has_perm('kit.print')$b$),
    ('mirror_health()', $a$has_role('manager')$a$, $b$has_perm('mgmt.settings')$b$),
    ('mirror_health()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('mirror_new_code()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('mirror_setup_code()', $a$has_role('admin')$a$, $b$has_perm('mgmt.system')$b$),
    ('register_customer_decide(text,text,uuid,text,text)', $a$has_role('manager')$a$, $b$has_perm('mgmt.register')$b$),
    ('register_customer_review()', $a$has_role('manager')$a$, $b$has_perm('mgmt.register')$b$),
    ('register_decide(text,text,text)', $a$has_role('manager')$a$, $b$has_perm('mgmt.register')$b$),
    ('register_review_list()', $a$has_role('manager')$a$, $b$has_perm('mgmt.register')$b$),
    ('register_record(text)', $a$has_role('manager', 'marketing', 'finance')$a$, $b$has_perm('mgmt.reports')$b$),
    ('register_status()', $a$has_role('manager', 'marketing', 'finance')$a$, $b$has_perm('mgmt.reports')$b$),
    ('role_permissions()', $a$has_role('manager')$a$, $b$has_perm('mgmt.settings')$b$),
    ('staff_add_photos(uuid,text[])', $a$has_role('manager', 'front_of_house')$a$, $b$has_perm('ord.edit')$b$),
    ('staff_amend_order(uuid,integer,jsonb,text,text,boolean)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.edit')$b$),
    ('staff_amend_order(uuid,integer,jsonb,text,text,boolean)', $a$has_role('manager')$a$, $b$has_perm('ord.override')$b$),
    ('staff_create_order(jsonb)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.create')$b$),
    ('staff_order_action(uuid,text,integer,numeric,numeric,text)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.status')$b$),
    ('staff_order_action(uuid,text,integer,numeric,numeric,text)', $a$has_role('manager')$a$, $b$has_perm('ord.override')$b$),
    ('staff_order_emails(uuid)', $a$has_role('manager', 'front_of_house')$a$, $b$has_perm('ord.comms')$b$),
    ('staff_print_brief(uuid)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.edit')$b$),
    ('staff_record_payment(uuid,text,text,numeric,text,text,uuid)', $a$has_role('manager','finance','front_of_house')$a$, $b$has_perm('ord.payments')$b$),
    ('staff_record_payment(uuid,text,text,numeric,text,text,uuid)', $a$has_role('manager','finance')$a$, $b$has_perm('ord.refunds')$b$),
    ('staff_remove_photo(uuid)', $a$has_role('manager', 'front_of_house')$a$, $b$has_perm('ord.edit')$b$),
    ('staff_resend_email(uuid)', $a$has_role('manager', 'front_of_house')$a$, $b$has_perm('ord.comms')$b$),
    ('staff_save_product(jsonb)', $a$has_role('manager')$a$, $b$has_perm('mgmt.settings')$b$),
    ('staff_send_quote(uuid)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.comms')$b$),
    ('staff_send_update(uuid)', $a$has_role('manager', 'front_of_house')$a$, $b$has_perm('ord.comms')$b$),
    ('staff_set_candles(uuid,text)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.edit')$b$),
    ('staff_set_fulfilment(uuid,integer,text,text,text,numeric,text)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.edit')$b$),
    ('staff_set_hold_thanks(uuid,boolean)', $a$has_role('manager', 'front_of_house')$a$, $b$has_perm('ord.comms')$b$),
    ('staff_set_quote(uuid,integer,numeric,text,text)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('ord.edit')$b$)
  ) t(sig, old, new) loop
    d := pg_get_functiondef(('public.' || r.sig)::regprocedure);
    if position(r.old in d) > 0 then
      d := replace(d, r.old, r.new); execute d; n := n + 1;
    elsif position(r.new in d) = 0 then
      raise exception 'Check not found in %: %. Nothing changed.', r.sig, r.old;
    end if;
  end loop;

  -- 6. The database rules move to the switches too
  for r in select * from (values
    ('orders', 'staff_read_orders', 'select', $q$public.has_perm('ord.view') and deleted_at is null$q$, null),
    ('order_items', 'staff_read_items', 'select', $q$public.has_perm('ord.view')$q$, null),
    ('order_events', 'staff_read_events', 'select', $q$public.has_perm('ord.view')$q$, null),
    ('order_amendments', 'staff read amendments', 'select', $q$public.has_perm('ord.history')$q$, null),
    ('sheet_order_imports', 'staff read sheet imports', 'select', $q$public.has_perm('ord.history')$q$, null),
    ('payments', 'read_payments', 'select', $q$public.has_perm('ord.payments')$q$, null),
    ('email_outbox', 'admin_read_outbox', 'select', $q$public.has_perm('mgmt.system')$q$, null),
    ('audit_log', 'admin_read_audit', 'select', $q$public.has_perm('mgmt.audit')$q$, null),
    ('staff_profiles', 'admin_manage_staff', 'all', $q$public.has_perm('staff.users')$q$, $q$public.has_perm('staff.users')$q$),
    ('locations', 'managers_edit_locations', 'update', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('closed_dates', 'managers_write_closed', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('products', 'managers_write_products', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('product_variants', 'managers_write_variants', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('product_sizes', 'managers_write_sizes', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('delivery_zones', 'managers_write_zones', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('product_changes', 'managers_read_product_changes', 'select', $q$public.has_perm('mgmt.settings')$q$, null),
    ('catalogue_collections', 'managers_write_catalogue_collections', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('catalogue_items', 'managers_write_catalogue_items', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$),
    ('catalogue_item_options', 'managers_write_catalogue_options', 'all', $q$public.has_perm('mgmt.settings')$q$, $q$public.has_perm('mgmt.settings')$q$)
  ) p(tbl, pol, cmd, q, wc) loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = r.tbl and policyname = r.pol) then
      raise exception 'Rule % on % not found. Nothing changed.', r.pol, r.tbl;
    end if;
    execute format('drop policy %I on public.%I', r.pol, r.tbl);
    execute format('create policy %I on public.%I for %s using (%s)%s', r.pol, r.tbl, r.cmd, r.q, case when r.wc is null then '' else format(' with check (%s)', r.wc) end);
  end loop;

  -- 7. Every switch is now live
  update public.permissions set live = true;

  -- 7b. The app learns that every switch is live
  d := pg_get_functiondef('public.my_access()'::regprocedure);
  if position($q$'perm_v'$q$ in d) = 0 then
    if position($q$'ok', true, 'role'$q$ in d) = 0 then raise exception 'my_access changed shape. Nothing changed.'; end if;
    execute replace(d, $q$'ok', true, 'role'$q$, $q$'ok', true, 'perm_v', 2, 'role'$q$);
  end if;
  -- 7c. Never lose the last person who can manage the team; the staff-admin function checks the same switch
  d := pg_get_functiondef('public.admin_set_staff_level(uuid,text,uuid,boolean)'::regprocedure);
  if position('last_admin' in d) = 0 then
    if position('  insert into public.staff_profiles (user_id, full_name, role, level_id, location_id, active)' in d) = 0 then raise exception 'admin_set_staff_level changed shape. Nothing changed.'; end if;
    execute replace(d, '  insert into public.staff_profiles (user_id, full_name, role, level_id, location_id, active)',
      $q$  if public._perm_of(p_user, 'staff.users') and (not p_active or not exists (select 1 from public.level_permissions where level_id = p_level and perm_key = 'staff.users'))
     and not exists (select 1 from public.staff_profiles s where s.user_id <> p_user and s.active and s.removed_at is null and public._perm_of(s.user_id, 'staff.users')) then
    return public._err('last_admin', 'At least one person must keep Manage the team. Give someone else that access first.');
  end if;
  insert into public.staff_profiles (user_id, full_name, role, level_id, location_id, active)$q$);
  end if;
  execute 'grant execute on function public._perm_of(uuid, text) to service_role';

  -- 8. Self-check: every active person keeps exactly the access they had. If not, nothing is changed.
  for u in select s.user_id, s.full_name from public.staff_profiles s where s.active and s.removed_at is null loop
    perform set_config('request.jwt.claims', json_build_object('sub', u.user_id, 'role', 'authenticated')::text, true);
    for r in select key, roles from _pmap loop
      o := public.has_role(variadic (array['admin'] || r.roles)::public.staff_role[]);
      nw := public.has_perm(r.key);
      if o is distinct from nw then mism := mism || jsonb_build_object('who', u.full_name, 'switch', r.key, 'before', o, 'after', nw); end if;
    end loop;
  end loop;
  perform set_config('request.jwt.claims', '', true);
  if jsonb_array_length(mism) > 0 then raise exception 'Nothing changed: access would differ for %', mism; end if;
  if not public._perm_guard_ok() then raise exception 'Nothing changed: no one would keep Manage the team and Change what each level can do.'; end if;
  if exists (select 1 from public.permissions where not live) then raise exception 'Nothing changed: a switch is still not live.'; end if;
  if exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.prokind = 'f'
      and p.proname <> 'has_role' and pg_get_functiondef(p.oid) like '%has_role(%') then
    raise exception 'Nothing changed: a function still uses the old level check.';
  end if;
  raise notice 'Permissions step 2 installed: % checks moved, every switch live, everyone kept the same access.', n;
end $wrap$;
