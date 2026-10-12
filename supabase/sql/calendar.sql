-- Calendar support and short-notice approval (no drop statements)

alter table public.orders add column if not exists rush_approved_by text;

-- Daily order and cake counts for the staff calendar. Cancelled and declined orders are left out.
create or replace function public.calendar_counts(p_from date, p_to date)
returns table(day date, orders int, cakes int, deliveries int, attention int, done int)
language sql stable security definer set search_path to 'public'
as $$
  select o.required_date,
         count(*)::int,
         coalesce(sum((select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = o.id)), 0)::int,
         count(*) filter (where o.fulfilment_method = 'delivery')::int,
         count(*) filter (where o.order_status in ('awaiting_review','awaiting_quote','awaiting_deposit'))::int,
         count(*) filter (where o.order_status = 'completed')::int
  from public.orders o
  where public.is_staff()
    and o.required_date between p_from and least(p_to, p_from + 400)
    and o.order_status not in ('declined','cancelled')
  group by o.required_date
  order by o.required_date
$$;
revoke all on function public.calendar_counts(date, date) from public, anon;
grant execute on function public.calendar_counts(date, date) to authenticated;

-- Staff orders: short notice needs a reason and the name of who approved it.
create or replace function public.staff_create_order(p jsonb)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $function$
declare v_src public.order_source; v_name text; v_res jsonb; v_by text;
begin
  if not public.has_role('manager','front_of_house') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  v_src := coalesce(nullif(p->>'source', ''), 'walk_in')::public.order_source;
  if v_src = 'online' then v_src := 'walk_in'; end if;
  select full_name into v_name from public.staff_profiles where user_id = auth.uid();
  v_by := nullif(trim(coalesce(p->'rush'->>'approved_by', '')), '');
  if jsonb_typeof(p->'rush') = 'object' and (v_by is null or length(v_by) < 2) then
    return public._err('date', 'Enter who approved the short notice.', 'date');
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);
  if coalesce((v_res->>'ok')::boolean, false) and not coalesce((v_res->>'duplicate')::boolean, false) and v_by is not null then
    update public.orders set rush_approved_by = v_by where id = (v_res->>'order_id')::uuid and rush_override;
    if found then
      perform public._log((v_res->>'order_id')::uuid, auth.uid(), v_name, 'rush_approved',
        jsonb_build_object('approved_by', v_by, 'reason', (select rush_reason from public.orders where id = (v_res->>'order_id')::uuid)));
    end if;
  end if;
  return v_res;
exception when invalid_text_representation then return public._err('bad_input', 'Unknown order source.');
end $function$;
