-- Order capture Phase 2 (7 Nov 2026, approved by Roneel: "Yes, one-go save"). Additive: nothing existing changes.
-- 1. staff_create_order_all(p): the order, who took it, its cake requirements and the time it was taken, saved together
--    or not at all. It calls the existing staff_create_order, then the existing order_set_taken_by, order_set_requirements
--    and order_set_taken inside the same database transaction; if any of them refuses, everything is undone and the
--    reason comes back like any other form error. A repeated tap (same idempotency_key) returns the first order.
-- 2. staff_cake_popularity(): how many times each menu cake was ordered in the last 180 days (real, not test or
--    deleted orders), so New order can show the most ordered cakes first. Staff only, no customer data.
-- Undo: drop function public.staff_create_order_all(jsonb); drop function public.staff_cake_popularity();
--       The app falls back to the earlier save when staff_create_order_all is missing.

create or replace function public.staff_create_order_all(p jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_res jsonb; v_oid uuid; x jsonb; v_det text; v_inc text[] := '{}';
  v_taker text := nullif(regexp_replace(btrim(coalesce(p->>'taken_by_name', '')), '\s+', ' ', 'g'), '');
  v_reqs jsonb := case when jsonb_typeof(p->'requirements') = 'array' then p->'requirements' end;
  v_at timestamptz;
begin
  if nullif(p->>'taken_at', '') is not null then
    begin v_at := (p->>'taken_at')::timestamptz; exception when others then return public._err('taken', 'Check the date the order was taken.'); end;
  end if;
  v_res := public.staff_create_order(p - 'taken_by_name' - 'requirements' - 'requirements_note' - 'taken_at');
  if not coalesce((v_res->>'ok')::boolean, false) then return v_res; end if;
  if coalesce((v_res->>'duplicate')::boolean, false) then return v_res || jsonb_build_object('includes', jsonb_build_array('taken_by', 'requirements', 'taken_at')); end if;
  v_oid := (v_res->>'order_id')::uuid;
  if v_taker is not null then
    x := public.order_set_taken_by(v_oid, v_taker);
    if not coalesce((x->>'ok')::boolean, false) then raise exception using errcode = 'P0001', message = 'cc_step', detail = x::text; end if;
    v_inc := v_inc || 'taken_by'::text;
  end if;
  if v_reqs is not null and jsonb_array_length(v_reqs) > 0 then
    x := public.order_set_requirements(v_oid, v_reqs, p->>'requirements_note');
    if not coalesce((x->>'ok')::boolean, false) then raise exception using errcode = 'P0001', message = 'cc_step', detail = x::text; end if;
    v_inc := v_inc || 'requirements'::text;
  end if;
  if v_at is not null then
    x := public.order_set_taken(v_oid, v_at);
    if not coalesce((x->>'ok')::boolean, false) then raise exception using errcode = 'P0001', message = 'cc_step', detail = x::text; end if;
    v_inc := v_inc || 'taken_at'::text;
  end if;
  return v_res || jsonb_build_object('includes', to_jsonb(v_inc));
exception when sqlstate 'P0001' then
  get stacked diagnostics v_det = pg_exception_detail;
  if sqlerrm <> 'cc_step' then raise; end if;
  x := v_det::jsonb;
  return jsonb_build_object('ok', false, 'error', coalesce(x->>'error', 'not_saved'), 'field', x->>'field',
    'message', 'Not saved: ' || rtrim(coalesce(x->>'message', 'part of the order could not be saved'), '.') || '. Nothing was saved. Check it and try again.');
end $$;
revoke all on function public.staff_create_order_all(jsonb) from public, anon;
grant execute on function public.staff_create_order_all(jsonb) to authenticated;

create or replace function public.staff_cake_popularity()
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select case when not public.has_perm('ord.create') then jsonb_build_object('ok', false)
  else jsonb_build_object('ok', true, 'days', 180, 'cakes', coalesce((
    select jsonb_object_agg(code, n) from (
      select pr.code, count(*) n from public.orders o join public.order_items i on i.order_id = o.id join public.products pr on pr.id = i.product_id
      where o.created_at > now() - interval '180 days' and not coalesce(o.is_test, false) and o.deleted_at is null
      group by pr.code) t), '{}'::jsonb)) end
$$;
revoke all on function public.staff_cake_popularity() from public, anon;
grant execute on function public.staff_cake_popularity() to authenticated;
