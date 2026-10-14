-- Kitchen printing settings, delivery log, resend and "Printed" confirmation.
-- Additive only: new settings rows, new nullable columns, new functions, and an updated slip trigger function.

-- 1. Settings (no addresses written into code; all read from here)
insert into public.app_config (key, value) values
  ('kitchen_slip_backup_email', ''),
  ('kitchen_slip_paper', 'A5'),
  ('kitchen_slip_on_new', 'true')
on conflict (key) do nothing;

-- 2. Physical print confirmation, separate from email delivery
alter table public.kitchen_briefs add column if not exists printed_confirmed_at timestamptz;
alter table public.kitchen_briefs add column if not exists printed_confirmed_by uuid;
alter table public.kitchen_briefs add column if not exists printed_confirmed_label text;

-- 3. The slip email trigger now respects the on/off setting and copies the backup address
create or replace function public.queue_kitchen_slip_email() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare v_to text; v_cc text; v_ref text; v_ok boolean;
begin
  if coalesce((select value from public.app_config where key = 'kitchen_slip_on_new'), 'true') <> 'true' then return null; end if;
  v_to := nullif(trim((select value from public.app_config where key = 'kitchen_slip_email')), '');
  if v_to is null then return null; end if;
  v_cc := nullif(trim((select value from public.app_config where key = 'kitchen_slip_backup_email')), '');
  select reference into v_ref from public.orders where id = new.order_id;
  v_ok := coalesce(v_ref ~ '^[A-Z]{1,4}-[0-9]{3,}$', false);
  -- One email per order and slip version: reprints of the same version are not sent again
  insert into public.email_outbox (order_id, kind, to_email, cc, dedupe_key, status, last_error, attempts)
  values (new.order_id, 'kitchen_slip', v_to, case when v_cc is null or lower(v_cc) = lower(v_to) then null else array[v_cc] end,
    'kitchen_slip:' || new.order_id::text || ':v' || new.version,
    case when v_ok then 'pending' else 'failed' end,
    case when v_ok then null else 'No valid order number: slip not sent. Fix the order, then print again.' end,
    case when v_ok then 0 else 5 end)
  on conflict (dedupe_key) do nothing;
  return null;
end $$;

-- 4. Read settings (administrator only)
create or replace function public.admin_print_settings() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an administrator can see printing settings.'); end if;
  return jsonb_build_object('ok', true,
    'primary', coalesce((select value from public.app_config where key = 'kitchen_slip_email'), ''),
    'backup', coalesce((select value from public.app_config where key = 'kitchen_slip_backup_email'), ''),
    'paper', coalesce((select value from public.app_config where key = 'kitchen_slip_paper'), 'A5'),
    'on_new', coalesce((select value from public.app_config where key = 'kitchen_slip_on_new'), 'true') = 'true',
    'test_mode', coalesce((select value from public.app_config where key = 'test_mode'), 'true') = 'true',
    'test_email', coalesce((select value from public.app_config where key = 'test_email'), ''),
    'sender', coalesce((select value from public.app_config where key = 'from_email'), ''));
end $$;

-- 5. Save settings (administrator only), with an audit record
create or replace function public.admin_print_settings_save(p jsonb) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_old jsonb; v_pri text := lower(trim(coalesce(p->>'primary', ''))); v_bak text := lower(trim(coalesce(p->>'backup', '')));
  v_paper text := upper(coalesce(p->>'paper', 'A5')); v_on text := case when coalesce((p->>'on_new')::boolean, true) then 'true' else 'false' end;
  re text := '^[^@\s]+@[^@\s]+\.[^@\s]+$';
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an administrator can change printing settings.'); end if;
  if v_pri = '' then return public._err('primary', 'Enter the kitchen printer email address.'); end if;
  if v_pri !~ re then return public._err('primary', 'That kitchen printer email address does not look right.'); end if;
  if v_bak <> '' and v_bak !~ re then return public._err('backup', 'That backup email address does not look right.'); end if;
  if v_bak = v_pri then return public._err('backup', 'The backup address is the same as the main one. Use a different address or leave it empty.'); end if;
  if v_paper not in ('A5', 'DL') then return public._err('paper', 'Choose A5 or DL.'); end if;
  v_old := public.admin_print_settings();
  insert into public.app_config (key, value) values ('kitchen_slip_email', v_pri), ('kitchen_slip_backup_email', v_bak), ('kitchen_slip_paper', v_paper), ('kitchen_slip_on_new', v_on)
    on conflict (key) do update set value = excluded.value;
  insert into public.audit_log (table_name, row_id, action, old_data, new_data, actor_id)
    values ('app_config', 'kitchen_printing', 'update', v_old - 'ok', jsonb_build_object('primary', v_pri, 'backup', v_bak, 'paper', v_paper, 'on_new', v_on = 'true'), auth.uid());
  return public.admin_print_settings();
end $$;

-- 6. Send a sample slip (marked TEST-001, invented details) to the current addresses
create or replace function public.admin_print_test() returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_to text; v_cc text; v_recent int;
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an administrator can send a test slip.'); end if;
  v_to := nullif(trim((select value from public.app_config where key = 'kitchen_slip_email')), '');
  if v_to is null then return public._err('primary', 'Save a kitchen printer email address first.'); end if;
  select count(*) into v_recent from public.email_outbox where kind = 'kitchen_slip_test' and created_at > now() - interval '1 minute';
  if v_recent > 0 then return public._err('wait', 'A test slip was sent less than a minute ago. Check the inbox first.'); end if;
  v_cc := nullif(trim((select value from public.app_config where key = 'kitchen_slip_backup_email')), '');
  insert into public.email_outbox (order_id, kind, to_email, cc, dedupe_key, status)
    values (null, 'kitchen_slip_test', v_to, case when v_cc is null then null else array[v_cc] end, 'kitchen_slip_test:' || gen_random_uuid()::text || ':v1', 'pending');
  return jsonb_build_object('ok', true, 'to', v_to, 'backup', v_cc,
    'test_mode', coalesce((select value from public.app_config where key = 'test_mode'), 'true') = 'true',
    'test_email', (select value from public.app_config where key = 'test_email'));
end $$;

-- 7. Delivery log: email delivery and confirmed printing shown separately (administrator and manager)
create or replace function public.admin_slip_log(p_limit int default 40) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can see the slip delivery log.'); end if;
  return jsonb_build_object('ok', true, 'rows', coalesce((select jsonb_agg(r order by r.created_at desc) from (
    select e.id, e.kind, e.status, e.attempts, e.last_error, e.created_at, e.sent_at, e.to_email, e.cc,
      o.id as order_id, o.reference,
      nullif(substring(e.dedupe_key from ':v([0-9]+)$'), '')::int as version,
      (select max(version) from public.kitchen_briefs k where k.order_id = o.id) as latest_version,
      kb.printed_confirmed_at, kb.printed_confirmed_label
    from public.email_outbox e
    left join public.orders o on o.id = e.order_id
    left join public.kitchen_briefs kb on kb.order_id = e.order_id and kb.version = nullif(substring(e.dedupe_key from ':v([0-9]+)$'), '')::int
    where e.kind in ('kitchen_slip', 'kitchen_slip_test')
    order by e.created_at desc limit greatest(1, least(coalesce(p_limit, 40), 200))) r), '[]'::jsonb));
end $$;

-- 8. Send a slip again (latest version only, so an old slip never reaches the kitchen)
create or replace function public.admin_slip_resend(p_order uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_to text; v_cc text; v_ref text; v_ver int; v_recent int;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can send a slip again.'); end if;
  select reference into v_ref from public.orders where id = p_order and deleted_at is null;
  if v_ref is null then return public._err('order', 'That order was not found.'); end if;
  if v_ref !~ '^[A-Z]{1,4}-[0-9]{3,}$' then return public._err('reference', 'This order has no valid order number. Fix it before sending a slip.'); end if;
  select max(version) into v_ver from public.kitchen_briefs where order_id = p_order;
  if v_ver is null then return public._err('version', 'No slip has been printed for this order yet. Press Print kitchen slip on the order first.'); end if;
  select count(*) into v_recent from public.email_outbox where order_id = p_order and kind = 'kitchen_slip' and status in ('pending', 'sending') ;
  if v_recent > 0 then return public._err('busy', 'A slip for this order is already on its way.'); end if;
  v_to := nullif(trim((select value from public.app_config where key = 'kitchen_slip_email')), '');
  if v_to is null then return public._err('primary', 'No kitchen printer email address is set.'); end if;
  v_cc := nullif(trim((select value from public.app_config where key = 'kitchen_slip_backup_email')), '');
  insert into public.email_outbox (order_id, kind, to_email, cc, dedupe_key, status)
    values (p_order, 'kitchen_slip', v_to, case when v_cc is null then null else array[v_cc] end,
      'kitchen_slip:' || p_order::text || ':r' || floor(extract(epoch from now()))::bigint || ':v' || v_ver, 'pending');
  insert into public.order_events (order_id, kind, detail, actor_id, actor_label)
    values (p_order, 'slip_resent', jsonb_build_object('version', v_ver), auth.uid(), public._me_label());
  return jsonb_build_object('ok', true, 'reference', v_ref, 'version', v_ver);
end $$;

-- 9. Kitchen confirms the slip came out of the printer
create or replace function public.kitchen_confirm_printed(p_order uuid, p_version int) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare v_latest int; v_done timestamptz;
begin
  if not public.has_role('kitchen', 'manager', 'front_of_house') then return public._err('forbidden', 'You do not have access to the kitchen.'); end if;
  select max(version) into v_latest from public.kitchen_briefs where order_id = p_order;
  if v_latest is null then return public._err('version', 'No slip has been printed for this order yet.'); end if;
  if p_version is distinct from v_latest then return public._err('stale', 'There is a newer slip (v' || v_latest || '). Print and confirm that one.'); end if;
  select printed_confirmed_at into v_done from public.kitchen_briefs where order_id = p_order and version = v_latest;
  if v_done is not null then return jsonb_build_object('ok', true, 'already', true, 'version', v_latest); end if;
  update public.kitchen_briefs set printed_confirmed_at = now(), printed_confirmed_by = auth.uid(), printed_confirmed_label = public._me_label()
    where order_id = p_order and version = v_latest;
  insert into public.order_events (order_id, kind, detail, actor_id, actor_label)
    values (p_order, 'slip_confirmed', jsonb_build_object('version', v_latest), auth.uid(), public._me_label());
  return jsonb_build_object('ok', true, 'version', v_latest);
end $$;

-- 10. Slip status per order for the kitchen and order screens: latest version, email state, printed or not
create or replace function public.slip_status(p_orders uuid[]) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.is_staff() then return public._err('forbidden', 'Sign in as staff.'); end if;
  return jsonb_build_object('ok', true,
    'paper', coalesce((select value from public.app_config where key = 'kitchen_slip_paper'), 'A5'),
    'rows', coalesce((select jsonb_object_agg(k.order_id::text, jsonb_build_object(
      'version', k.version, 'confirmed_at', k.printed_confirmed_at, 'confirmed_by', k.printed_confirmed_label,
      'email', (select e.status from public.email_outbox e where e.order_id = k.order_id and e.kind = 'kitchen_slip' and e.dedupe_key like '%:v' || k.version order by e.created_at desc limit 1)))
    from (select distinct on (order_id) * from public.kitchen_briefs where order_id = any(coalesce(p_orders, '{}')) order by order_id, version desc) k), '{}'::jsonb));
end $$;

revoke all on function public.admin_print_settings() from public, anon;
revoke all on function public.admin_print_settings_save(jsonb) from public, anon;
revoke all on function public.admin_print_test() from public, anon;
revoke all on function public.admin_slip_log(int) from public, anon;
revoke all on function public.admin_slip_resend(uuid) from public, anon;
revoke all on function public.kitchen_confirm_printed(uuid, int) from public, anon;
revoke all on function public.slip_status(uuid[]) from public, anon;
grant execute on function public.admin_print_settings() to authenticated;
grant execute on function public.admin_print_settings_save(jsonb) to authenticated;
grant execute on function public.admin_print_test() to authenticated;
grant execute on function public.admin_slip_log(int) to authenticated;
grant execute on function public.admin_slip_resend(uuid) to authenticated;
grant execute on function public.kitchen_confirm_printed(uuid, int) to authenticated;
grant execute on function public.slip_status(uuid[]) to authenticated;

-- Applied second (migration kitchen_print_verify): kitchen_slip_verified flag, admin_print_test_confirm(),
-- admin_print_settings() returns verified, verified_note and last_test, slip_status() reports 'retrying' versus final 'failed'.
-- See the migration of that name for the exact text.
-- Applied third (migration kitchen_print_cc_fix): email_outbox.cc is NOT NULL, so "no backup" is written as '{}'
-- in queue_kitchen_slip_email(), admin_print_test() and admin_slip_resend(). Before this fix, printing a new slip
-- version failed (1:00pm to 1:32pm, 14 Oct; no slips were printed in that window).
