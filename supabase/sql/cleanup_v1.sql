-- Corner Café cakes: test data clean-up, approved 16 October 2026.
-- 1. Order CC-1046 (customer "Test", walk-in, $38 recorded) is deleted the same way the staff app deletes:
--    hidden, with the reason, kept in full and restorable by an admin from Settings. Its payment stays recorded with it.
-- 2. Five test customer profiles are archived: hidden from lists, search and exports, not deleted.
-- A copy of every row changed is kept in public.cleanup_backup_20261016 first.
-- Runs as one block: if any check fails, nothing is changed.
do $cleanup_v1$
declare v_order uuid; v_paid numeric; n int;
begin
  create table if not exists public.cleanup_backup_20261016 (kind text, row_data jsonb, saved_at timestamptz default now());
  revoke all on public.cleanup_backup_20261016 from public, anon, authenticated;

  -- 1. CC-1046
  select id into v_order from public.orders where reference = 'CC-1046' and deleted_at is null;
  if v_order is not null then
    insert into public.cleanup_backup_20261016 (kind, row_data) select 'order', to_jsonb(o) from public.orders o where o.id = v_order;
    select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = v_order;
    update public.orders set deleted_at = now(), deleted_reason = 'Test order (clean-up approved by Roneel)' where id = v_order;
    update public.email_outbox set status = 'failed', attempts = 99, last_error = 'Order deleted'
      where order_id = v_order and status in ('pending', 'failed', 'sending');
    perform public._log(v_order, null, 'Clean-up', 'deleted', jsonb_build_object('reason', 'Test order (clean-up approved by Roneel)', 'status_at_delete', 'confirmed', 'paid_at_delete', v_paid));
  end if;

  -- 2. Test profiles, matched by number and name together so no real customer can be caught
  insert into public.cleanup_backup_20261016 (kind, row_data)
    select 'customer', to_jsonb(c) from public.customers c
    where archived_at is null and (customer_no, full_name) in ((1, 'Test Order Email Check'), (420, 'TEST Roneel'), (421, 'TEST Counter Roneel'), (424, 'Marlin Jones Test Order'), (439, 'Test'));
  update public.customers set archived_at = now(), version = version + 1
    where archived_at is null and (customer_no, full_name) in ((1, 'Test Order Email Check'), (420, 'TEST Roneel'), (421, 'TEST Counter Roneel'), (424, 'Marlin Jones Test Order'), (439, 'Test'));

  -- Checks
  if exists (select 1 from public.orders where reference = 'CC-1046' and deleted_at is null) then raise exception 'CC-1046 is still showing'; end if;
  select count(*) into n from public.customers where archived_at is null and (customer_no, full_name) in ((1, 'Test Order Email Check'), (420, 'TEST Roneel'), (421, 'TEST Counter Roneel'), (424, 'Marlin Jones Test Order'), (439, 'Test'));
  if n > 0 then raise exception 'Some test profiles are still showing'; end if;
  -- the archived profiles have no orders still showing
  if exists (select 1 from public.orders o join public.customers c on c.id = o.customer_id where c.archived_at is not null and o.deleted_at is null
             and (c.customer_no, c.full_name) in ((1, 'Test Order Email Check'), (420, 'TEST Roneel'), (421, 'TEST Counter Roneel'), (424, 'Marlin Jones Test Order'), (439, 'Test'))) then
    raise exception 'An archived test profile still has an order showing';
  end if;
  raise notice 'Clean-up done.';
end $cleanup_v1$;

select 'Clean-up done' as result,
  (select count(*) from public.cleanup_backup_20261016) as rows_backed_up,
  (select count(*) from public.customers where archived_at is null and merged_into is null) as customers_showing,
  (select count(*) from public.orders where deleted_at is null) as orders_showing;
