-- Owner decision 14 Oct, 5:07pm: an administrator can delete any order, including one with payments recorded.
-- Still a soft delete (hidden everywhere, restorable from Settings). Payment rows are not changed; they drop out of figures with the order.
create or replace function public.admin_delete_order(p_order uuid, p_reference text, p_reason text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare o public.orders; v_name text; v_reason text := trim(coalesce(p_reason, '')); v_paid numeric;
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can delete orders.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'That order was not found.'); end if;
  if o.deleted_at is not null then return public._err('deleted', 'This order is already deleted.'); end if;
  if upper(trim(coalesce(p_reference, ''))) <> upper(o.reference) then
    return public._err('reference', 'Type the order number exactly as shown: ' || o.reference || '.', 'reference');
  end if;
  if length(v_reason) < 5 then return public._err('reason', 'Say why this order is being deleted.', 'reason'); end if;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = o.id;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  update public.orders set deleted_at = now(), deleted_by = auth.uid(), deleted_reason = v_reason where id = o.id;
  update public.email_outbox set status = 'failed', attempts = 99, last_error = 'Order deleted'
   where order_id = o.id and status in ('pending','failed','sending');
  perform public._log(o.id, auth.uid(), v_name, 'deleted', jsonb_build_object('reason', v_reason, 'status_at_delete', o.order_status, 'paid_at_delete', v_paid));
  return jsonb_build_object('ok', true, 'reference', o.reference, 'paid', v_paid);
end $$;

create or replace function public.admin_deleted_orders() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can see deleted orders.'); end if;
  return jsonb_build_object('ok', true, 'orders', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'reference', o.reference, 'customer', o.contact_name, 'date', o.required_date,
      'status', o.order_status, 'method', o.fulfilment_method, 'total', coalesce(o.final_total, o.estimate_total),
      'paid', (select coalesce(sum(p.amount), 0) from public.payments p where p.order_id = o.id),
      'deleted_at', o.deleted_at, 'deleted_by', coalesce(sp.full_name, 'Unknown'), 'reason', o.deleted_reason)
      order by o.deleted_at desc)
    from (select * from public.orders where deleted_at is not null order by deleted_at desc limit 200) o
    left join public.staff_profiles sp on sp.user_id = o.deleted_by), '[]'));
end $$;
