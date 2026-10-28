-- Treat orders: festive treats ordered without a cake (26 October 2026).
-- Roneel: a separate Festive treats module above the cake form, "customers fill it and request, basic details with items",
-- leaving the cake form as it is. Treat orders live in their own tables, so cake orders, the cake screens, the protected
-- Daily Cake Demand chart and the daily cake limit are untouched. Each item's daily limit counts treats on cake orders
-- and on treat orders together.

create sequence if not exists public.treat_ref_seq start 1001;

create table if not exists public.treat_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  status text not null default 'new' check (status in ('new', 'confirmed', 'collected', 'cancelled')),
  source text not null default 'online' check (source in ('online', 'counter')),
  pickup_date date not null,
  pickup_time time not null,
  name text not null check (length(trim(name)) between 2 and 120),
  phone text, phone_key text,
  note text check (length(note) <= 300),
  total numeric(10,2) not null default 0,
  paid numeric(10,2) not null default 0,
  idempotency_key uuid unique,
  cancel_reason text,
  created_at timestamptz not null default now(),
  created_by uuid, created_by_label text,
  confirmed_at timestamptz, confirmed_by_label text,
  collected_at timestamptz, collected_by_label text,
  updated_at timestamptz not null default now()
);
create index if not exists treat_orders_pickup_idx on public.treat_orders (pickup_date);

create table if not exists public.treat_order_items (
  id uuid primary key default gen_random_uuid(),
  treat_order_id uuid not null references public.treat_orders(id) on delete cascade,
  item_id uuid references public.seasonal_items(id),
  group_name text, name text not null, detail text,
  unit_price numeric(10,2) not null, quantity int not null check (quantity between 1 and 99)
);
create index if not exists treat_order_items_order_idx on public.treat_order_items (treat_order_id);
create index if not exists treat_order_items_item_idx on public.treat_order_items (item_id);

create table if not exists public.treat_order_events (
  id bigint generated always as identity primary key,
  treat_order_id uuid not null references public.treat_orders(id) on delete cascade,
  at timestamptz not null default now(), by_label text, kind text not null, detail jsonb
);

alter table public.treat_orders enable row level security;
alter table public.treat_order_items enable row level security;
alter table public.treat_order_events enable row level security;
drop policy if exists staff_read_treat_orders on public.treat_orders;
create policy staff_read_treat_orders on public.treat_orders for select to authenticated using (public.has_perm('ord.view'));
drop policy if exists staff_read_treat_order_items on public.treat_order_items;
create policy staff_read_treat_order_items on public.treat_order_items for select to authenticated using (public.has_perm('ord.view'));
drop policy if exists staff_read_treat_order_events on public.treat_order_events;
create policy staff_read_treat_order_events on public.treat_order_events for select to authenticated using (public.has_perm('ord.view'));

-- Every seasonal item sold, from cake orders and treat orders, in one place (cancelled, declined and deleted left out)
create or replace view public.seasonal_lines with (security_invoker = true) as
  select x.item_id, x.name, x.quantity, x.unit_price * x.quantity as value, o.required_date as day, 'cake'::text as kind, o.id as order_id,
    o.order_status = 'completed' as collected, case when o.source = 'online' then 'website' else 'counter' end as channel, coalesce(o.is_test, false) as is_test
  from public.order_extras x join public.orders o on o.id = x.order_id
  where o.deleted_at is null and o.order_status not in ('declined', 'cancelled')
  union all
  select ti.item_id, ti.name, ti.quantity, ti.unit_price * ti.quantity, t.pickup_date, 'treats', t.id,
    t.status = 'collected', case when t.source = 'online' then 'website' else 'counter' end, false
  from public.treat_order_items ti join public.treat_orders t on t.id = ti.treat_order_id
  where t.status <> 'cancelled';
revoke all on public.seasonal_lines from anon, authenticated;

create or replace function public._treats_booked(p_item uuid, p_date date, p_skip uuid default null) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(quantity), 0)::int from public.seasonal_lines where item_id = p_item and day = p_date and order_id is distinct from p_skip
$$;

create or replace function public.get_seasonal_menu(p_channel text default 'website')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date; v_staff boolean := p_channel = 'counter' and public.is_staff();
begin
  return jsonb_build_object('ok', true, 'today', v_today, 'groups', coalesce((
    select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name, 'message', g.web_message, 'payment', g.payment, 'items', gi.items) order by g.sort, g.name)
    from public.seasonal_groups g cross join lateral (select (select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'detail', i.detail, 'image', i.image_url, 'price', i.price,
          'counter_only', i.channel = 'counter', 'pickup_from', i.pickup_from, 'pickup_to', i.pickup_to, 'lead_days', i.lead_days,
          'max', i.max_per_order, 'blocked', to_jsonb(i.blocked_days),
          'sold_out', case when i.daily_limit is null then '[]'::jsonb else coalesce((
            select jsonb_agg(d.day order by d.day) from (select l.day from public.seasonal_lines l where l.item_id = i.id and l.day >= v_today
              group by l.day having sum(l.quantity) >= i.daily_limit) d), '[]') end,
          'left', case when i.daily_limit is null or not v_staff then null else coalesce((
            select jsonb_object_agg(d.day, i.daily_limit - d.n) from (select l.day, sum(l.quantity)::int n from public.seasonal_lines l
              where l.item_id = i.id and l.day >= v_today group by l.day) d), '{}') end,
          'limit', case when v_staff then i.daily_limit end)
        order by i.sort, i.name)
        from public.seasonal_items i
        where i.group_id = g.id and i.active and i.archived_at is null and (i.channel = 'website' or v_staff)
          and (i.sale_from is null or i.sale_from <= v_today) and (i.sale_to is null or i.sale_to >= v_today)
          and (i.pickup_to is null or i.pickup_to >= v_today)) as items) gi
    where gi.items is not null and g.active), '[]'::jsonb));
end $$;

create or replace function public.staff_seasonal_list()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date;
begin
  if not public.has_perm('ord.view') then return public._err('forbidden', 'Your login cannot see seasonal items.'); end if;
  return jsonb_build_object('ok', true, 'today', v_today, 'can_edit', public.has_perm('mgmt.settings'),
    'groups', coalesce((select jsonb_agg(to_jsonb(g) order by g.sort, g.name) from public.seasonal_groups g), '[]'),
    'items', coalesce((select jsonb_agg(to_jsonb(i) || jsonb_build_object('sold', (select coalesce(sum(l.quantity), 0) from public.seasonal_lines l where l.item_id = i.id)) order by i.sort, i.name)
      from public.seasonal_items i where i.archived_at is null), '[]'),
    'booked', coalesce((select jsonb_agg(jsonb_build_object('day', q.day, 'item', q.item_id, 'name', q.name, 'quantity', q.n) order by q.day, q.name)
      from (select l.item_id, l.name, l.day, sum(l.quantity)::int n from public.seasonal_lines l where l.day >= v_today and not l.collected
            group by l.item_id, l.name, l.day) q), '[]'));
end $$;

create or replace function public.crm_seasonal_sales()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date;
begin
  if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.reports')) then return public._err('forbidden', 'Your login cannot see Analytics.'); end if;
  return (
    with t as (select * from public.seasonal_lines where not is_test), first_day as (select min(day) f from t)
    select jsonb_build_object('ok', true, 'today', v_today,
      'summary', jsonb_build_object(
        'items', coalesce((select sum(quantity) from t), 0),
        'value', coalesce((select sum(value) from t), 0),
        'collected_value', coalesce((select sum(value) from t where collected), 0),
        'booked_value', coalesce((select sum(value) from t where not collected), 0),
        'orders', (select count(distinct order_id) from t where kind = 'cake'),
        'treat_orders', (select count(distinct order_id) from t where kind = 'treats'),
        'cake_orders', (select count(*) from public.orders o where o.deleted_at is null and not coalesce(o.is_test, false)
          and o.order_status not in ('declined', 'cancelled') and o.required_date >= coalesce((select f from first_day), v_today))),
      'items', coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', qq, 'value', vv) order by vv desc, name)
        from (select name, sum(quantity) qq, sum(value) vv from t group by name) s), '[]'),
      'weeks', coalesce((select jsonb_agg(jsonb_build_object('week', wk, 'collected', c, 'booked', b) order by wk)
        from (select date_trunc('week', day)::date wk, sum(value) filter (where collected) c, sum(value) filter (where not collected) b from t group by 1) w), '[]'),
      'sources', coalesce((select jsonb_object_agg(channel, vv) from (select channel, sum(value) vv from t group by 1) s), '{}'),
      'kinds', coalesce((select jsonb_object_agg(kind, vv) from (select kind, sum(value) vv from t group by 1) s), '{}'))
  );
end $$;

-- Pickup day and time rules for treat orders (the café's collection hours and closed days)
create or replace function public._treat_when(p_date date, p_time time, p_staff boolean)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare loc public.locations; v_today date; v_now time; v_mins int;
begin
  select * into loc from public.locations where code = 'corner-cafe' and active;
  v_today := (now() at time zone loc.timezone)::date; v_now := (now() at time zone loc.timezone)::time;
  if p_date is null then return public._err('date', 'Choose a pickup day.', 'date'); end if;
  if p_time is null then return public._err('time', 'Choose a pickup time.', 'time'); end if;
  if p_date < v_today or (p_date = v_today and p_time <= v_now) then return public._err('date', 'That time has already passed.', 'date'); end if;
  if p_date > v_today + loc.max_days_ahead then return public._err('date', format('We take orders up to %s days ahead.', loc.max_days_ahead), 'date'); end if;
  if exists (select 1 from public.closed_dates where location_id = loc.id and closed_on = p_date) then return public._err('date', 'We are closed for pickups on that day. Please choose another day.', 'date'); end if;
  if p_time < loc.collection_open or p_time > loc.collection_close then
    return public._err('time', format('Pickup is between %s and %s.', to_char(loc.collection_open, 'FMHH12:MI AM'), to_char(loc.collection_close, 'FMHH12:MI AM')), 'time');
  end if;
  v_mins := extract(hour from p_time)::int * 60 + extract(minute from p_time)::int;
  if not p_staff and v_mins % loc.slot_minutes <> 0 then return public._err('time', 'Choose one of the listed pickup times.', 'time'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- Create a treat order (website or counter). Treats are checked with the same rules as treats on a cake order.
create or replace function public._create_treat_order(p jsonb, p_staff boolean, p_actor uuid, p_label text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare ex public.treat_orders; v_date date; v_time time; v_chk jsonb; v_w jsonb; v_name text; v_phone text; v_key text; v_note text;
  v_id uuid; v_ref text; l jsonb; v_count int; v_paid numeric;
begin
  if nullif(p->>'idempotency_key', '') is not null then
    select * into ex from public.treat_orders where idempotency_key = (p->>'idempotency_key')::uuid;
    if found then return jsonb_build_object('ok', true, 'duplicate', true, 'id', ex.id, 'reference', ex.reference, 'total', ex.total); end if;
  end if;
  if coalesce(jsonb_typeof(p->'treats'), '') <> 'array' or jsonb_array_length(p->'treats') = 0 then return public._err('treats', 'Choose at least one treat.', 'treats'); end if;
  begin v_date := nullif(p->>'date', '')::date; v_time := nullif(p->>'time', '')::time;
  exception when others then return public._err('date', 'Check the pickup day and time.', 'date'); end;
  v_w := public._treat_when(v_date, v_time, p_staff); if not (v_w->>'ok')::boolean then return v_w; end if;
  v_name := trim(coalesce(p->>'name', '')); v_phone := trim(coalesce(p->>'phone', '')); v_note := nullif(left(trim(coalesce(p->>'note', '')), 300), '');
  if length(v_name) < 2 or length(v_name) > 120 then return public._err('name', 'Enter a name for the order.', 'name'); end if;
  v_key := public._phone_key(v_phone);
  if v_key !~ '^[0-9]{7,15}$' then return public._err('phone', 'Enter a mobile number, for example 912 3456.', 'phone'); end if;
  if not p_staff then
    select count(*) into v_count from public.treat_orders where phone_key = v_key and created_at > now() - interval '1 hour';
    if v_count >= 5 then return public._err('rate', 'We have already received several requests from this number. Please call us.'); end if;
    select count(*) into v_count from public.treat_orders where source = 'online' and created_at > now() - interval '10 minutes';
    if v_count >= 60 then return public._err('busy', 'We are receiving a lot of requests right now. Please try again in a few minutes.'); end if;
  end if;
  v_chk := public._treats_check(p->'treats', v_date, p_staff, p_staff);
  if not (v_chk->>'ok')::boolean then return v_chk; end if;
  if jsonb_array_length(v_chk->'lines') = 0 then return public._err('treats', 'Choose at least one treat.', 'treats'); end if;
  v_ref := 'T-' || nextval('public.treat_ref_seq');
  insert into public.treat_orders (reference, status, source, pickup_date, pickup_time, name, phone, phone_key, note, total, idempotency_key, created_by, created_by_label)
  values (v_ref, case when p_staff and coalesce((p->>'confirm_now')::boolean, false) then 'confirmed' else 'new' end, case when p_staff then 'counter' else 'online' end,
    v_date, v_time, v_name, v_phone, v_key, v_note, (v_chk->>'total')::numeric, nullif(p->>'idempotency_key', '')::uuid, p_actor, p_label)
  returning id into v_id;
  for l in select * from jsonb_array_elements(v_chk->'lines') loop
    insert into public.treat_order_items (treat_order_id, item_id, group_name, name, detail, unit_price, quantity)
    values (v_id, (l->>'id')::uuid, l->>'group', l->>'name', nullif(l->>'detail', ''), (l->>'price')::numeric, (l->>'quantity')::int);
  end loop;
  insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (v_id, p_label, 'created', jsonb_build_object('source', case when p_staff then 'counter' else 'online' end, 'total', v_chk->'total'));
  if p_staff then
    update public.treat_orders set confirmed_at = case when status = 'confirmed' then now() end, confirmed_by_label = case when status = 'confirmed' then p_label end where id = v_id;
    v_paid := round(coalesce(nullif(p->>'paid', '')::numeric, 0), 2);
    if v_paid > 0 then
      update public.treat_orders set paid = least(v_paid, total) where id = v_id;
      insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (v_id, p_label, 'paid', jsonb_build_object('amount', least(v_paid, (v_chk->>'total')::numeric), 'method', coalesce(p->>'method', 'cash')));
    end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'reference', v_ref, 'total', (v_chk->>'total')::numeric);
exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
  return public._err('bad_input', 'Some details were not in the right format. Please check and try again.');
end $$;

create or replace function public.submit_treat_order(p jsonb) returns jsonb
language sql security definer set search_path = public as $$ select public._create_treat_order(p, false, null, 'Guest (online)') $$;

create or replace function public.staff_create_treat_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_label text;
begin
  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot take orders.'); end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  return public._create_treat_order(p, true, auth.uid(), coalesce(v_label, 'Staff'));
end $$;

-- The Treat orders board
create or replace function public.staff_treat_orders(p_from date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date; v_from date := coalesce(p_from, (now() at time zone 'Pacific/Fiji')::date - 7);
begin
  if not public.has_perm('ord.view') then return public._err('forbidden', 'Your login cannot see orders.'); end if;
  return jsonb_build_object('ok', true, 'today', v_today,
    'can_edit', public.has_perm('ord.edit'), 'can_create', public.has_perm('ord.create'), 'can_pay', public.has_perm('ord.payments'),
    'new', (select count(*) from public.treat_orders where status = 'new'),
    'orders', coalesce((select jsonb_agg(to_jsonb(t) - 'idempotency_key' - 'phone_key' || jsonb_build_object('items',
        (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'detail', i.detail, 'quantity', i.quantity, 'price', i.unit_price) order by i.name), '[]') from public.treat_order_items i where i.treat_order_id = t.id))
      order by t.pickup_date, t.pickup_time, t.reference)
      from public.treat_orders t where t.pickup_date >= v_from or t.status = 'new'), '[]'));
end $$;

create or replace function public.staff_treat_order_action(p_id uuid, p_action text, p_amount numeric default null, p_method text default null, p_note text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t public.treat_orders; v_label text; v_amt numeric;
begin
  select * into t from public.treat_orders where id = p_id for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  if p_action = 'pay' then
    if not public.has_perm('ord.payments') then return public._err('forbidden', 'Your login cannot record payments.'); end if;
    if t.status = 'cancelled' then return public._err('status', 'This order is cancelled.'); end if;
    v_amt := round(coalesce(p_amount, 0), 2);
    if v_amt <= 0 then return public._err('amount', 'Enter the amount paid.', 'amount'); end if;
    if t.paid + v_amt > t.total + 0.005 then return public._err('amount', format('Only $%s is still to pay.', to_char(t.total - t.paid, 'FM999990.00')), 'amount'); end if;
    if coalesce(p_method, '') not in ('cash', 'eftpos', 'mpaisa', 'bank_transfer', 'other') then return public._err('method', 'Choose how they paid.', 'method'); end if;
    update public.treat_orders set paid = paid + v_amt, updated_at = now() where id = t.id;
    insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (t.id, v_label, 'paid', jsonb_build_object('amount', v_amt, 'method', p_method));
  else
    if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
    if p_action = 'confirm' then
      if t.status <> 'new' then return public._err('status', 'Only a new request can be confirmed.'); end if;
      update public.treat_orders set status = 'confirmed', confirmed_at = now(), confirmed_by_label = v_label, updated_at = now() where id = t.id;
    elsif p_action = 'collected' then
      if t.status not in ('new', 'confirmed') then return public._err('status', 'This order is already closed.'); end if;
      update public.treat_orders set status = 'collected', collected_at = now(), collected_by_label = v_label, updated_at = now() where id = t.id;
    elsif p_action = 'cancel' then
      if t.status in ('collected', 'cancelled') then return public._err('status', 'This order is already closed.'); end if;
      if length(trim(coalesce(p_note, ''))) < 2 then return public._err('note', 'Say why it is cancelled.', 'note'); end if;
      update public.treat_orders set status = 'cancelled', cancel_reason = left(trim(p_note), 200), updated_at = now() where id = t.id;
    else return public._err('action', 'Unknown action.'); end if;
    insert into public.treat_order_events (treat_order_id, by_label, kind, detail) values (t.id, v_label, p_action, case when p_note is not null then jsonb_build_object('note', p_note) end);
  end if;
  select * into t from public.treat_orders where id = p_id;
  return jsonb_build_object('ok', true, 'status', t.status, 'paid', t.paid, 'total', t.total);
end $$;

grant execute on function public.submit_treat_order(jsonb) to anon, authenticated;
grant execute on function public.staff_create_treat_order(jsonb), public.staff_treat_orders(date), public.staff_treat_order_action(uuid, text, numeric, text, text) to authenticated;
revoke execute on function public._create_treat_order(jsonb, boolean, uuid, text), public._treat_when(date, time, boolean) from public, anon, authenticated;
