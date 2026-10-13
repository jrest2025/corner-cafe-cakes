-- Printed slip: delivery address, who receives it, amount paid and how the order came in.
create or replace function public.staff_print_brief(p_order uuid)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare o public.orders; b public.kitchen_briefs; v_snap jsonb; v_changes jsonb := '[]'; v_name text; v_new boolean := false; v_slip jsonb;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot print kitchen briefs.'); end if;
  select * into o from public.orders where id = p_order for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status not in ('confirmed','completed') then return public._err('status', 'A kitchen brief is available once the order is confirmed.'); end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_snap := public._kitchen_snapshot(o.id);
  select * into b from public.kitchen_briefs where order_id = o.id order by version desc limit 1;
  if b.id is null or b.snapshot is distinct from v_snap then
    if b.id is not null then
      select coalesce(jsonb_agg(k), '[]') into v_changes from jsonb_object_keys(v_snap || b.snapshot) k where v_snap->k is distinct from b.snapshot->k;
    end if;
    insert into public.kitchen_briefs (order_id, version, snapshot, changes, printed_by, printed_by_label)
    values (o.id, coalesce(b.version, 0) + 1, v_snap, v_changes, auth.uid(), v_name) returning * into b;
    update public.orders set brief_version = b.version where id = o.id;
    v_new := true;
  end if;
  select jsonb_build_object(
    'name', coalesce(nullif(trim(o.contact_name), ''), c.full_name),
    'phone', coalesce(nullif(trim(o.contact_phone), ''), c.phone),
    'price', coalesce(o.final_total, o.estimate_total),
    'taken_by', case when o.source = 'online' then 'Website order' else coalesce(sp.full_name, 'Staff') end,
    'ordered_at', o.created_at,
    'source', o.source,
    'method', o.fulfilment_method,
    'address', case when o.fulfilment_method = 'delivery' then o.delivery_address end,
    'receiver', case when o.fulfilment_method = 'delivery' then o.delivery_contact end,
    'paid', coalesce((select sum(pm.amount) from public.payments pm where pm.order_id = o.id), 0))
    into v_slip
    from (select 1) x
    left join public.customers c on c.id = o.customer_id
    left join public.staff_profiles sp on sp.user_id = o.created_by;
  perform public._log(o.id, auth.uid(), v_name, 'brief_printed', jsonb_build_object('version', b.version, 'new_version', v_new, 'changes', v_changes));
  return jsonb_build_object('ok', true, 'version', b.version, 'new_version', v_new, 'changes', b.changes,
                            'first_printed_at', b.printed_at, 'snapshot', v_snap, 'slip', v_slip);
end $function$;
