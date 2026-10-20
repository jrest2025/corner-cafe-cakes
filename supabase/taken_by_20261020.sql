-- Who took the order (20 October 2026). Applied as migration taken_by_20261020.
-- Roneel: "in the order form the person filling the cake order form must enter their name. its a requirement. because
-- the counter tablet has no specific login". The counter tablet is signed in as one person for everyone, so every order
-- it saves looked as if that person took it. Approved: New order asks for the name of whoever takes the order, every time
-- and on every device; names used before on that device are one-tap buttons, none picked in advance.
--
-- Additive. Nothing changes until the staff app sends a name: orders keep showing the login's name until then.
--   * orders.taken_by_name: the name given on New order.
--   * order_set_taken_by(order, name): saved right after New order saves the order (like the original order date), by the
--     same login within 2 hours, or later by anyone who can change orders. It adds 1 to the order's version and writes
--     an order event ("Taken by Mere, signed in as Lavenia Koroi").
--   * staff_print_brief: the kitchen slip's "Order Taken by" uses the name given, then the login's name as before.
--     (The emailed slip does the same in supabase/functions/send-emails/index.ts.)

alter table public.orders add column if not exists taken_by_name text;
alter table public.orders drop constraint if exists orders_taken_by_name_check;
alter table public.orders add constraint orders_taken_by_name_check check (taken_by_name is null or length(taken_by_name) between 2 and 60);
comment on column public.orders.taken_by_name is 'Who took the order, as given on New order (the counter tablet has one shared login). Shown as Order Taken by on the kitchen slip.';

create or replace function public.order_set_taken_by(p_order uuid, p_name text) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare o public.orders; v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'); v_me text := public._me_label();
begin
  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot create orders.'); end if;
  if length(v_name) < 2 or length(v_name) > 60 or v_name !~ '[[:alpha:]]' then
    return public._err('name', 'Enter the name of the person who took the order.', 'taken_by');
  end if;
  select * into o from public.orders where id = p_order and deleted_at is null for update;
  if not found then return public._err('not_found', 'That order was not found.'); end if;
  if o.source = 'online' then return public._err('online', 'Website orders are taken by the website.'); end if;
  if not ((o.created_by = auth.uid() and o.created_at > now() - interval '2 hours') or public.has_perm('ord.edit')) then
    return public._err('forbidden', 'Only the login that saved this order can say who took it.');
  end if;
  if o.taken_by_name is not distinct from v_name then return jsonb_build_object('ok', true, 'name', v_name, 'same', true); end if;
  update public.orders set taken_by_name = v_name, version = version + 1, updated_at = now() where id = o.id;
  perform public._log(o.id, auth.uid(), v_me, 'taken_by', jsonb_build_object('name', v_name, 'login', v_me, 'was', o.taken_by_name));
  return jsonb_build_object('ok', true, 'name', v_name);
end $$;
revoke all on function public.order_set_taken_by(uuid, text) from public, anon;
grant execute on function public.order_set_taken_by(uuid, text) to authenticated;

-- The kitchen slip: one expression in staff_print_brief changes; the rest of the function is kept exactly as it is.
do $$
declare d text;
  a text := $a$'taken_by', case when o.source = 'online' then 'Website order' else coalesce(sp.full_name, 'Staff') end,$a$;
  b text := $b$'taken_by', case when o.source = 'online' then 'Website order' else coalesce(nullif(btrim(o.taken_by_name), ''), sp.full_name, 'Staff') end,$b$;
begin
  d := pg_get_functiondef('public.staff_print_brief(uuid, boolean)'::regprocedure);
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'staff_print_brief: the taken_by line was not found exactly once'; end if;
  execute replace(d, a, b);
end $$;
