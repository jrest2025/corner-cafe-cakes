-- Kitchen brief in the Cake Order Slip layout, and a Candles field.
-- 1. Candles on the cake line (optional, up to 60 characters).
alter table public.order_items add column if not exists candles text;
alter table public.order_items add constraint order_items_candles_len check (candles is null or length(candles) <= 60) not valid;
alter table public.order_items validate constraint order_items_candles_len;

-- 2. Candles are part of what the kitchen sees, so a change after printing makes a new brief version.
--    The key is only added when candles are recorded, so briefs printed before this change are not marked as changed.
create or replace function public._kitchen_snapshot(p_order uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'reference', o.reference, 'date', o.required_date, 'time', to_char(o.required_time, 'HH24:MI'),
    'method', o.fulfilment_method, 'area', o.delivery_zone,
    'customer', split_part(trim(o.contact_name), ' ', 1) || coalesce(' ' || left(nullif(split_part(trim(o.contact_name), ' ', 2), ''), 1) || '.', ''),
    'cake', i.product_name, 'variant', i.variant, 'size', i.size_inch, 'quantity', i.quantity, 'serves', i.serves_label,
    'finish', i.finish, 'design', i.design_description, 'message', i.cake_message, 'occasion', i.occasion,
    'has_dietary', o.has_dietary, 'dietary', to_jsonb(coalesce(i.dietary, '{}')), 'dietary_note', i.dietary_note,
    'kitchen_notes', i.kitchen_notes, 'order_notes', o.customer_notes, 'rush', o.rush_override,
    'photos', (select coalesce(jsonb_agg(a.storage_path order by a.created_at), '[]') from public.order_attachments a where a.order_id = o.id))
    || case when nullif(trim(i.candles), '') is not null then jsonb_build_object('candles', i.candles) else '{}'::jsonb end
  from public.orders o
  left join lateral (select * from public.order_items x where x.order_id = o.id order by x.created_at limit 1) i on true
  where o.id = p_order
$$;

-- 3. Taking an order saves candles.
create or replace function public.staff_create_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $function$
declare v_src public.order_source; v_name text; v_res jsonb; v_by text; v_candles text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  v_src := coalesce(nullif(p->>'source', ''), 'walk_in')::public.order_source;
  if v_src = 'online' then v_src := 'walk_in'; end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_by := nullif(trim(coalesce(p->'rush'->>'approved_by', '')), '');
  if jsonb_typeof(p->'rush') = 'object' and (v_by is null or length(v_by) < 2) then
    return public._err('date', 'Enter who approved the short notice.', 'date');
  end if;
  if p->>'has_dietary' = 'yes' then
    if coalesce(jsonb_array_length(case when jsonb_typeof(p->'dietary') = 'array' then p->'dietary' end), 0) = 0
       and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'Choose the dietary need or allergy, or write the details for the kitchen.', 'diet');
    end if;
    if jsonb_typeof(p->'dietary') = 'array' and p->'dietary' ? 'Other' and length(trim(coalesce(p->>'dietary_note', ''))) < 3 then
      return public._err('diet', 'You chose Other: write the dietary details for the kitchen.', 'diet');
    end if;
  end if;
  v_candles := nullif(trim(coalesce(p->>'candles', '')), '');
  if length(coalesce(v_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);
  if coalesce((v_res->>'ok')::boolean, false) and not coalesce((v_res->>'duplicate')::boolean, false) then
    if v_by is not null then
      update public.orders set rush_approved_by = v_by where id = (v_res->>'order_id')::uuid and rush_override;
      if found then
        perform public._log((v_res->>'order_id')::uuid, auth.uid(), v_name, 'rush_approved',
          jsonb_build_object('approved_by', v_by, 'reason', (select rush_reason from public.orders where id = (v_res->>'order_id')::uuid)));
      end if;
    end if;
    if v_candles is not null then
      update public.order_items set candles = v_candles where order_id = (v_res->>'order_id')::uuid;
    end if;
  end if;
  return v_res;
exception when invalid_text_representation then return public._err('bad_input', 'Unknown order source.');
end $function$;

-- 4. Change candles on an open order.
create or replace function public.staff_set_candles(p_order uuid, p_candles text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; v_old text; v_new text := nullif(trim(coalesce(p_candles, '')), ''); v_name text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status in ('completed','cancelled','declined') then return public._err('status', 'This order is closed. Candles can no longer be changed.'); end if;
  if length(coalesce(v_new, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
  select candles into v_old from public.order_items where order_id = o.id order by created_at limit 1;
  if v_old is not distinct from v_new then return jsonb_build_object('ok', true, 'changed', false); end if;
  update public.order_items set candles = v_new where id = (select id from public.order_items where order_id = o.id order by created_at limit 1);
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  perform public._log(o.id, auth.uid(), v_name, 'candles_changed', jsonb_build_object('from', v_old, 'to', v_new));
  return jsonb_build_object('ok', true, 'changed', true, 'brief_needs_reprint', coalesce(o.brief_version, 0) > 0);
end $$;
revoke all on function public.staff_set_candles(uuid, text) from public, anon;
grant execute on function public.staff_set_candles(uuid, text) to authenticated;

-- 5. The printed slip also shows the guest's full name and phone, the price, who took the order and when.
--    These are not part of the kitchen version check, so a price change alone does not make a new brief version.
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
    'ordered_at', o.created_at)
    into v_slip
    from (select 1) x
    left join public.customers c on c.id = o.customer_id
    left join public.staff_profiles sp on sp.user_id = o.created_by;
  perform public._log(o.id, auth.uid(), v_name, 'brief_printed', jsonb_build_object('version', b.version, 'new_version', v_new, 'changes', v_changes));
  return jsonb_build_object('ok', true, 'version', b.version, 'new_version', v_new, 'changes', b.changes,
                            'first_printed_at', b.printed_at, 'snapshot', v_snap, 'slip', v_slip);
end $function$;
