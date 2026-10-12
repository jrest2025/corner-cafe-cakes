-- Delete orders entered by mistake or for testing.
-- Admin only. The order is hidden everywhere, kept with who, when and why, and an admin can restore it.
-- Orders with any payment recorded cannot be deleted: cancel and refund those instead.

alter table public.orders
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id),
  add column if not exists deleted_reason text;

-- Staff never see deleted orders through normal reads.
alter policy staff_read_orders on public.orders
  using (public.has_role('manager','front_of_house','finance','marketing') and deleted_at is null);

-- A deleted order cannot be changed by anything except a restore.
create or replace function public.block_deleted_order_change() returns trigger
language plpgsql set search_path = public as $$
begin
  if old.deleted_at is not null and new.deleted_at is not null then
    raise exception 'This order has been deleted. An admin can restore it from Settings.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace trigger t_orders_deleted_guard before update on public.orders
  for each row execute function public.block_deleted_order_change();

create or replace function public.block_payment_on_deleted() returns trigger
language plpgsql set search_path = public as $$
begin
  if exists (select 1 from public.orders where id = new.order_id and deleted_at is not null) then
    raise exception 'This order has been deleted. Payments cannot be recorded against it.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace trigger t_payments_deleted_guard before insert on public.payments
  for each row execute function public.block_payment_on_deleted();

-- Emails for a deleted order are stopped: the sender skips them, and delete marks them as failed so they are never retried.
create or replace function public.claim_outbox(p_limit integer default 20)
returns setof public.email_outbox language sql security definer set search_path = public as $$
  update public.email_outbox e set status = 'sending', attempts = e.attempts + 1
  where e.id in (
    select x.id from public.email_outbox x
    where (x.status = 'pending'
       or (x.status = 'failed' and x.attempts < 5)
       or (x.status = 'sending' and x.created_at < now() - interval '10 minutes' and x.attempts < 5))
      and not exists (select 1 from public.orders d where d.id = x.order_id and d.deleted_at is not null)
    order by x.created_at limit p_limit for update skip locked)
  returning e.*
$$;

-- Leave deleted orders out of every count and list that bypasses the access rules.
create or replace function pg_temp.patch(p_fn regprocedure, p_old text, p_new text) returns void
language plpgsql as $$
declare d text := pg_get_functiondef(p_fn);
begin
  if position(p_new in d) > 0 then return; end if;
  if position(p_old in d) = 0 then raise exception 'Patch target not found in %: %', p_fn, p_old; end if;
  execute replace(d, p_old, p_new);
end $$;

select pg_temp.patch('public.calendar_counts(date,date)',
  'where public.is_staff()', 'where public.is_staff() and o.deleted_at is null');
select pg_temp.patch('public.get_order_setup(text)',
  'where location_id = loc.id and required_date >= v_today', 'where location_id = loc.id and deleted_at is null and required_date >= v_today');
select pg_temp.patch('public.kitchen_board(date,integer)',
  'where (o.order_status in (''confirmed'',''completed'') and o.required_date between v_from and v_to)',
  'where (o.deleted_at is null and o.order_status in (''confirmed'',''completed'') and o.required_date between v_from and v_to)');
select pg_temp.patch('public.kitchen_board(date,integer)',
  'or (o.order_status = ''confirmed'' and o.required_date < v_from',
  'or (o.deleted_at is null and o.order_status = ''confirmed'' and o.required_date < v_from');
select pg_temp.patch('public.email_payload(uuid)',
  'x.id <> o.id and', 'x.id <> o.id and x.deleted_at is null and');
select pg_temp.patch('public.sheet_backup_rows_data()',
  'where o.reference not like ''H-%''', 'where o.reference not like ''H-%'' and o.deleted_at is null');
select pg_temp.patch('public.import_sheet_match(jsonb)',
  'and o.required_date = (p->>''date'')::date', 'and o.required_date = (p->>''date'')::date and o.deleted_at is null');
select pg_temp.patch(p.oid::regprocedure,
  'where location_id = loc.id and required_date = v_date and order_status', 'where location_id = loc.id and deleted_at is null and required_date = v_date and order_status')
  from pg_proc p where p.proname = '_create_order' and p.pronamespace = 'public'::regnamespace;
select pg_temp.patch(p.oid::regprocedure,
  'where location_id = loc.id and required_date = n_date and id <> o.id', 'where location_id = loc.id and deleted_at is null and required_date = n_date and id <> o.id')
  from pg_proc p where p.proname = 'staff_amend_order' and p.pronamespace = 'public'::regnamespace;
select pg_temp.patch('public.dashboard_data()', 'where not o.is_test)', 'where not o.is_test and o.deleted_at is null)');
select pg_temp.patch('public.dashboard_data()', 'where is_test)', 'where is_test and deleted_at is null)');

-- Customer totals (also read by the customer search, which bypasses the access rules).
do $$
declare d text := pg_get_viewdef('public.customer_summary'::regclass);
begin
  if position('o.deleted_at IS NULL' in d) = 0 then
    if position('i ON (true))' || E'\n' || '        ), agg AS (' in d) = 0 then raise exception 'customer_summary layout changed'; end if;
    d := replace(d, 'i ON (true))' || E'\n' || '        ), agg AS (', 'i ON (true))' || E'\n' || '          WHERE (o.deleted_at IS NULL)' || E'\n' || '        ), agg AS (');
    execute 'create or replace view public.customer_summary with (security_invoker = true) as ' || d;
  end if;
end $$;

-- Delete (admin only)
create or replace function public.admin_delete_order(p_order uuid, p_reference text, p_reason text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; v_name text; v_reason text := trim(coalesce(p_reason, ''));
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can delete orders.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'That order was not found.'); end if;
  if o.deleted_at is not null then return public._err('deleted', 'This order is already deleted.'); end if;
  if upper(trim(coalesce(p_reference, ''))) <> upper(o.reference) then
    return public._err('reference', 'Type the order number exactly as shown: ' || o.reference || '.', 'reference');
  end if;
  if length(v_reason) < 5 then return public._err('reason', 'Say why this order is being deleted.', 'reason'); end if;
  if exists (select 1 from public.payments where order_id = o.id) then
    return public._err('paid', 'This order has a payment recorded, so it cannot be deleted. Cancel it and arrange the refund instead.');
  end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  update public.orders set deleted_at = now(), deleted_by = auth.uid(), deleted_reason = v_reason where id = o.id;
  update public.email_outbox set status = 'failed', attempts = 99, last_error = 'Order deleted'
   where order_id = o.id and status in ('pending','failed','sending');
  perform public._log(o.id, auth.uid(), v_name, 'deleted', jsonb_build_object('reason', v_reason, 'status_at_delete', o.order_status));
  return jsonb_build_object('ok', true, 'reference', o.reference);
end $$;

-- Restore (admin only)
create or replace function public.admin_restore_order(p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; v_name text;
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can restore orders.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'That order was not found.'); end if;
  if o.deleted_at is null then return public._err('restored', 'This order is not deleted.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  update public.orders set deleted_at = null, deleted_by = null, deleted_reason = null where id = o.id;
  perform public._log(o.id, auth.uid(), v_name, 'restored', jsonb_build_object('deleted_at', o.deleted_at, 'reason', o.deleted_reason));
  return jsonb_build_object('ok', true, 'reference', o.reference);
end $$;

-- Deleted orders log (admin only)
create or replace function public.admin_deleted_orders()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can see deleted orders.'); end if;
  return jsonb_build_object('ok', true, 'orders', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'reference', o.reference, 'customer', c.full_name, 'date', o.required_date,
      'status', o.order_status, 'method', o.fulfilment_method, 'total', coalesce(o.final_total, o.estimate_total),
      'deleted_at', o.deleted_at, 'deleted_by', coalesce(sp.full_name, 'Unknown'), 'reason', o.deleted_reason)
      order by o.deleted_at desc)
    from (select * from public.orders where deleted_at is not null order by deleted_at desc limit 200) o
    left join public.customers c on c.id = o.customer_id
    left join public.staff_profiles sp on sp.user_id = o.deleted_by), '[]'));
end $$;

revoke all on function public.admin_delete_order(uuid, text, text) from public, anon;
revoke all on function public.admin_restore_order(uuid) from public, anon;
revoke all on function public.admin_deleted_orders() from public, anon;
grant execute on function public.admin_delete_order(uuid, text, text) to authenticated;
grant execute on function public.admin_restore_order(uuid) to authenticated;
grant execute on function public.admin_deleted_orders() to authenticated;
revoke all on function public.block_deleted_order_change() from public, anon, authenticated;
revoke all on function public.block_payment_on_deleted() from public, anon, authenticated;
