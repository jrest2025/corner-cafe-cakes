-- Seasonal items (festive treats and other limited-time items), 26 October 2026. Step 1: treats added to a cake order.
-- Roneel: "special limited time items we punch in and upload in the back end and it automatically appears on the website order form".
-- Managers set everything in the Service Hub (Seasonal items). Prices and every rule are checked here, never trusted from a browser.
-- A cake order and its treats save together or not at all. Treats never create an order of their own (step 2), so the
-- protected Daily Cake Demand chart and the daily cake limit are unchanged.

create table if not exists public.seasonal_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 40),
  web_message text check (length(web_message) <= 160),
  payment text not null default 'pickup' check (payment in ('pickup', 'deposit', 'full')),
  alone_allowed boolean not null default false,          -- step 2 (treats without a cake); not used yet
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_label text
);
create unique index if not exists seasonal_groups_name_uq on public.seasonal_groups (lower(name));

create table if not exists public.seasonal_items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.seasonal_groups(id),
  name text not null check (length(trim(name)) between 2 and 60),
  detail text check (length(detail) <= 80),
  image_url text check (length(image_url) <= 500),
  price numeric(10,2) not null check (price > 0 and price <= 5000),
  channel text not null default 'website' check (channel in ('website', 'counter')),
  sort int not null default 0,
  sale_from date, sale_to date,
  pickup_from date, pickup_to date,
  lead_days int not null default 0 check (lead_days between 0 and 60),
  daily_limit int check (daily_limit between 1 and 999),
  max_per_order int check (max_per_order between 1 and 99),
  blocked_days date[] not null default '{}',
  active boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_label text,
  check (sale_to is null or sale_from is null or sale_to >= sale_from),
  check (pickup_to is null or pickup_from is null or pickup_to >= pickup_from)
);
create index if not exists seasonal_items_group_idx on public.seasonal_items (group_id, sort);

create table if not exists public.seasonal_item_changes (
  id bigint generated always as identity primary key,
  item_id uuid references public.seasonal_items(id),
  group_id uuid references public.seasonal_groups(id),
  at timestamptz not null default now(),
  by_user uuid, by_label text, action text not null, before jsonb, after jsonb
);

create table if not exists public.order_extras (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  item_id uuid references public.seasonal_items(id),
  group_name text, name text not null, detail text,
  unit_price numeric(10,2) not null, quantity int not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(), created_by_label text
);
create index if not exists order_extras_order_idx on public.order_extras (order_id);
create index if not exists order_extras_item_idx on public.order_extras (item_id);

-- Treats chosen at the counter wait here (by the order's own save key) until the order saves
create table if not exists public.pending_treats (
  key uuid primary key, lines jsonb not null, paid_full boolean not null default false, created_by uuid, created_at timestamptz not null default now()
);

alter table public.seasonal_groups enable row level security;
alter table public.seasonal_items enable row level security;
alter table public.seasonal_item_changes enable row level security;
alter table public.order_extras enable row level security;
alter table public.pending_treats enable row level security;
drop policy if exists staff_read_seasonal_groups on public.seasonal_groups;
create policy staff_read_seasonal_groups on public.seasonal_groups for select to authenticated using (public.is_staff());
drop policy if exists staff_read_seasonal_items on public.seasonal_items;
create policy staff_read_seasonal_items on public.seasonal_items for select to authenticated using (public.is_staff());
drop policy if exists managers_read_seasonal_changes on public.seasonal_item_changes;
create policy managers_read_seasonal_changes on public.seasonal_item_changes for select to authenticated using (public.has_perm('mgmt.settings'));
drop policy if exists staff_read_order_extras on public.order_extras;
create policy staff_read_order_extras on public.order_extras for select to authenticated using (public.has_perm('ord.view'));
-- No write policies: every change goes through the functions below.

create or replace function public._treats_total(p_order uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(unit_price * quantity), 0) from public.order_extras where order_id = p_order
$$;

-- How many of an item are already booked for a pickup day (cancelled and declined orders do not count)
create or replace function public._treats_booked(p_item uuid, p_date date, p_skip uuid default null) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(x.quantity), 0)::int from public.order_extras x join public.orders o on o.id = x.order_id
  where x.item_id = p_item and o.required_date = p_date and o.deleted_at is null
    and o.order_status not in ('declined', 'cancelled') and o.id is distinct from p_skip
$$;

-- Check a list of treats [{id, quantity}] for a pickup day. Locks the items so two orders cannot take the last one.
create or replace function public._treats_check(p_lines jsonb, p_date date, p_staff boolean, p_rush boolean default false, p_skip uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare l jsonb; it public.seasonal_items; g public.seasonal_groups; v_today date; v_qty int; v_out jsonb := '[]'; v_total numeric := 0;
  v_ids uuid[] := '{}'; v_id uuid; v_left int; v_day text;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('ok', true, 'lines', '[]'::jsonb, 'total', 0);
  end if;
  if jsonb_array_length(p_lines) > 30 then return public._err('treats', 'Too many treats on one order.', 'treats'); end if;
  v_today := (now() at time zone 'Pacific/Fiji')::date;
  v_day := case when p_date is null then 'that day' else to_char(p_date, 'FMDay FMDD FMMonth') end;
  for l in select * from jsonb_array_elements(p_lines) loop
    begin v_id := (l->>'id')::uuid; exception when others then return public._err('treats', 'One of the treats was not recognised. Please refresh and try again.', 'treats'); end;
    v_qty := coalesce(nullif(l->>'quantity', '')::int, 0);
    if v_qty = 0 then continue; end if;
    if v_qty < 1 or v_qty > 99 then return public._err('treats', 'Check the treat quantities.', 'treats'); end if;
    if v_id = any (v_ids) then return public._err('treats', 'A treat is listed twice.', 'treats'); end if;
    v_ids := v_ids || v_id;
    select * into it from public.seasonal_items where id = v_id for update;
    if not found or it.archived_at is not null or not it.active then
      return public._err('treats', coalesce(it.name, 'One of the treats') || ' is no longer available. Please remove it.', 'treats');
    end if;
    select * into g from public.seasonal_groups where id = it.group_id;
    if it.channel = 'counter' and not p_staff then return public._err('treats', it.name || ' can only be added at the counter.', 'treats'); end if;
    if (it.sale_from is not null and v_today < it.sale_from) or (it.sale_to is not null and v_today > it.sale_to) then
      return public._err('treats', it.name || ' is not on sale today.', 'treats');
    end if;
    if p_date is not null then
      if it.pickup_from is not null and p_date < it.pickup_from then
        return public._err('treats', it.name || ' can be collected from ' || to_char(it.pickup_from, 'FMDay FMDD FMMonth') || '.', 'treats');
      end if;
      if it.pickup_to is not null and p_date > it.pickup_to then
        return public._err('treats', it.name || ' can be collected until ' || to_char(it.pickup_to, 'FMDay FMDD FMMonth') || '.', 'treats');
      end if;
      if p_date = any (it.blocked_days) then return public._err('treats', it.name || ' is not available on ' || v_day || '.', 'treats'); end if;
      if p_date < v_today + it.lead_days and not (p_staff and p_rush) then
        return public._err('treats', it.name || ' needs ' || it.lead_days || ' day' || case when it.lead_days = 1 then '' else 's' end || ' notice. The earliest pickup is ' || to_char(v_today + it.lead_days, 'FMDay FMDD FMMonth') || '.', 'treats');
      end if;
      if it.daily_limit is not null then
        v_left := it.daily_limit - public._treats_booked(it.id, p_date, p_skip);
        if v_qty > v_left then
          return public._err('treats', case when v_left <= 0 then it.name || ' is sold out for ' || v_day || '.'
            else 'Only ' || v_left || ' ' || it.name || ' left for ' || v_day || '.' end, 'treats');
        end if;
      end if;
    end if;
    if it.max_per_order is not null and v_qty > it.max_per_order then
      return public._err('treats', 'Up to ' || it.max_per_order || ' ' || it.name || ' per order.', 'treats');
    end if;
    v_out := v_out || jsonb_build_object('id', it.id, 'group', g.name, 'name', it.name, 'detail', it.detail, 'price', it.price, 'quantity', v_qty);
    v_total := v_total + it.price * v_qty;
  end loop;
  return jsonb_build_object('ok', true, 'lines', v_out, 'total', v_total);
end $$;

-- Put checked treats on an order (replacing any already there) and keep the order total and payment status right
create or replace function public._treats_apply(p_order uuid, p_lines jsonb, p_actor uuid, p_label text)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; v_old numeric; v_new numeric := 0; v_paid numeric; v_basis numeric; l jsonb; v_before jsonb;
begin
  select * into o from public.orders where id = p_order for update;
  v_old := public._treats_total(p_order);
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'price', unit_price) order by created_at), '[]') into v_before from public.order_extras where order_id = p_order;
  delete from public.order_extras where order_id = p_order;
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]')) loop
    insert into public.order_extras (order_id, item_id, group_name, name, detail, unit_price, quantity, created_by_label)
    values (p_order, (l->>'id')::uuid, l->>'group', l->>'name', nullif(l->>'detail', ''), (l->>'price')::numeric, (l->>'quantity')::int, p_label);
    v_new := v_new + (l->>'price')::numeric * (l->>'quantity')::int;
  end loop;
  if v_new = v_old and v_before = coalesce((select jsonb_agg(jsonb_build_object('name', name, 'quantity', quantity, 'price', unit_price) order by created_at) from public.order_extras where order_id = p_order), '[]') then return; end if;
  update public.orders set estimate_total = coalesce(estimate_total, 0) - v_old + v_new,
    final_total = case when final_total is null then null else final_total - v_old + v_new end, version = version + 1
  where id = p_order returning * into o;
  select coalesce(sum(amount), 0) into v_paid from public.payments where order_id = p_order;
  v_basis := coalesce(o.final_total, o.estimate_total);
  if v_paid > 0 then
    update public.orders set payment_status = case when v_paid >= v_basis then 'paid' else 'deposit_paid' end::public.payment_status where id = p_order;
  end if;
  perform public._log(p_order, p_actor, p_label, 'treats_set', jsonb_build_object('before', v_before, 'after', p_lines, 'treats_total', v_new));
end $$;

-- The Webflow order form and the counter: what is on sale now, with the days each item is sold out
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
            select jsonb_agg(d.day order by d.day) from (
              select o.required_date as day from public.order_extras x join public.orders o on o.id = x.order_id
              where x.item_id = i.id and o.deleted_at is null and o.order_status not in ('declined', 'cancelled') and o.required_date >= v_today
              group by o.required_date having sum(x.quantity) >= i.daily_limit) d), '[]') end,
          'left', case when i.daily_limit is null or not v_staff then null else coalesce((
            select jsonb_object_agg(d.day, i.daily_limit - d.n) from (
              select o.required_date as day, sum(x.quantity)::int n from public.order_extras x join public.orders o on o.id = x.order_id
              where x.item_id = i.id and o.deleted_at is null and o.order_status not in ('declined', 'cancelled') and o.required_date >= v_today
              group by o.required_date) d), '{}') end,
          'limit', case when v_staff then i.daily_limit end)
        order by i.sort, i.name)
        from public.seasonal_items i
        where i.group_id = g.id and i.active and i.archived_at is null and (i.channel = 'website' or v_staff)
          and (i.sale_from is null or i.sale_from <= v_today) and (i.sale_to is null or i.sale_to >= v_today)
          and (i.pickup_to is null or i.pickup_to >= v_today)) as items) gi
    where gi.items is not null), '[]'::jsonb));
end $$;

-- Service Hub: everything for the Seasonal items screen, with what is booked for each upcoming day
create or replace function public.staff_seasonal_list()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Pacific/Fiji')::date;
begin
  if not public.has_perm('ord.view') then return public._err('forbidden', 'Your login cannot see seasonal items.'); end if;
  return jsonb_build_object('ok', true, 'today', v_today, 'can_edit', public.has_perm('mgmt.settings'),
    'groups', coalesce((select jsonb_agg(to_jsonb(g) order by g.sort, g.name) from public.seasonal_groups g), '[]'),
    'items', coalesce((select jsonb_agg(to_jsonb(i) || jsonb_build_object('sold', (select coalesce(sum(x.quantity), 0) from public.order_extras x join public.orders o on o.id = x.order_id
        where x.item_id = i.id and o.deleted_at is null and o.order_status not in ('declined', 'cancelled')))) order by i.sort, i.name)
      from public.seasonal_items i where i.archived_at is null), '[]'),
    'booked', coalesce((select jsonb_agg(jsonb_build_object('day', q.day, 'item', q.item_id, 'name', q.name, 'quantity', q.n) order by q.day, q.name)
      from (select x.item_id, x.name, o.required_date as day, sum(x.quantity)::int n from public.order_extras x join public.orders o on o.id = x.order_id
            where o.deleted_at is null and o.order_status not in ('declined', 'cancelled') and o.required_date >= v_today
            group by x.item_id, x.name, o.required_date) q), '[]'));
end $$;

create or replace function public.staff_seasonal_save_group(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; g public.seasonal_groups; v_before jsonb; v_label text; v_name text := trim(coalesce(p->>'name', ''));
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change seasonal items.'); end if;
  if length(v_name) < 2 or length(v_name) > 40 then return public._err('name', 'Give the heading 2 to 40 characters.', 'name'); end if;
  if length(coalesce(p->>'message', '')) > 160 then return public._err('message', 'Keep the website message to 160 characters.', 'message'); end if;
  if coalesce(p->>'payment', 'pickup') not in ('pickup', 'deposit', 'full') then return public._err('payment', 'Choose how customers pay.', 'payment'); end if;
  if exists (select 1 from public.seasonal_groups x where lower(x.name) = lower(v_name) and x.id is distinct from v_id) then return public._err('name', 'Another heading already has this name.', 'name'); end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  if v_id is null then
    insert into public.seasonal_groups (name, web_message, payment, sort, updated_by_label)
    values (v_name, nullif(trim(coalesce(p->>'message', '')), ''), coalesce(p->>'payment', 'pickup'), coalesce((select max(sort) + 1 from public.seasonal_groups), 1), v_label) returning * into g;
  else
    select to_jsonb(x) into v_before from public.seasonal_groups x where id = v_id;
    if v_before is null then return public._err('group', 'That heading was not found.'); end if;
    update public.seasonal_groups set name = v_name, web_message = nullif(trim(coalesce(p->>'message', '')), ''), payment = coalesce(p->>'payment', 'pickup'),
      updated_at = now(), updated_by_label = v_label where id = v_id returning * into g;
  end if;
  insert into public.seasonal_item_changes (group_id, by_user, by_label, action, before, after) values (g.id, auth.uid(), v_label, case when v_id is null then 'group_added' else 'group_changed' end, v_before, to_jsonb(g));
  return jsonb_build_object('ok', true, 'group', to_jsonb(g));
end $$;

create or replace function public.staff_seasonal_save_item(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid := nullif(p->>'id', '')::uuid; it public.seasonal_items; v_before jsonb; v_label text; v_name text := trim(coalesce(p->>'name', ''));
  v_price numeric; v_group uuid; v_blocked date[]; d text;
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change seasonal items.'); end if;
  if v_id is not null then select to_jsonb(x) into v_before from public.seasonal_items x where id = v_id and archived_at is null;
    if v_before is null then return public._err('item', 'That item was not found.'); end if; end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  if coalesce((p->>'archive')::boolean, false) then
    update public.seasonal_items set archived_at = now(), active = false, updated_at = now(), updated_by_label = v_label where id = v_id returning * into it;
    insert into public.seasonal_item_changes (item_id, by_user, by_label, action, before, after) values (v_id, auth.uid(), v_label, 'removed', v_before, to_jsonb(it));
    return jsonb_build_object('ok', true);
  end if;
  if p ? 'active' and (p - 'id' - 'active') = '{}'::jsonb then  -- the On or Off switch on its own
    if v_id is null then return public._err('item', 'Save the item first.'); end if;
    update public.seasonal_items set active = coalesce((p->>'active')::boolean, false), updated_at = now(), updated_by_label = v_label where id = v_id returning * into it;
    insert into public.seasonal_item_changes (item_id, by_user, by_label, action, before, after) values (v_id, auth.uid(), v_label, case when it.active then 'switched_on' else 'switched_off' end, v_before, to_jsonb(it));
    return jsonb_build_object('ok', true, 'item', to_jsonb(it));
  end if;
  if length(v_name) < 2 or length(v_name) > 60 then return public._err('name', 'Give the item a name of 2 to 60 characters.', 'name'); end if;
  if length(coalesce(p->>'detail', '')) > 80 then return public._err('detail', 'Keep the size or pack line to 80 characters.', 'detail'); end if;
  begin v_price := round((p->>'price')::numeric, 2); exception when others then v_price := null; end;
  if v_price is null or v_price <= 0 or v_price > 5000 then return public._err('price', 'Enter the price, for example 35.', 'price'); end if;
  v_group := nullif(p->>'group_id', '')::uuid;
  if v_group is null or not exists (select 1 from public.seasonal_groups where id = v_group) then return public._err('group_id', 'Choose the heading it sits under.', 'group_id'); end if;
  if coalesce(p->>'channel', 'website') not in ('website', 'counter') then return public._err('channel', 'Choose where it shows.', 'channel'); end if;
  if nullif(p->>'sale_from', '') is not null and nullif(p->>'sale_to', '') is not null and (p->>'sale_to')::date < (p->>'sale_from')::date then
    return public._err('sale_to', 'The last day on sale is before the first day.', 'sale_to'); end if;
  if nullif(p->>'pickup_from', '') is not null and nullif(p->>'pickup_to', '') is not null and (p->>'pickup_to')::date < (p->>'pickup_from')::date then
    return public._err('pickup_to', 'The last pickup day is before the first pickup day.', 'pickup_to'); end if;
  if coalesce(nullif(p->>'lead_days', '')::int, 0) not between 0 and 60 then return public._err('lead_days', 'Notice must be 0 to 60 days.', 'lead_days'); end if;
  if nullif(p->>'daily_limit', '') is not null and (p->>'daily_limit')::int not between 1 and 999 then return public._err('daily_limit', 'The daily limit must be 1 to 999, or left empty.', 'daily_limit'); end if;
  if nullif(p->>'max_per_order', '') is not null and (p->>'max_per_order')::int not between 1 and 99 then return public._err('max_per_order', 'The most per order must be 1 to 99, or left empty.', 'max_per_order'); end if;
  if length(coalesce(p->>'image_url', '')) > 500 or (nullif(p->>'image_url', '') is not null and p->>'image_url' !~ '^https://') then return public._err('image_url', 'The photo link is not valid. Upload the photo again.', 'image_url'); end if;
  v_blocked := '{}';
  for d in select jsonb_array_elements_text(coalesce(p->'blocked_days', '[]')) loop
    if d !~ '^\d{4}-\d{2}-\d{2}$' then return public._err('blocked_days', 'Check the blocked days.', 'blocked_days'); end if;
    if not d::date = any (v_blocked) then v_blocked := v_blocked || d::date; end if;
  end loop;
  if v_id is null then
    insert into public.seasonal_items (group_id, name, detail, image_url, price, channel, sort, sale_from, sale_to, pickup_from, pickup_to, lead_days, daily_limit, max_per_order, blocked_days, active, updated_by_label)
    values (v_group, v_name, nullif(trim(coalesce(p->>'detail', '')), ''), nullif(p->>'image_url', ''), v_price, coalesce(p->>'channel', 'website'),
      coalesce((select max(sort) + 1 from public.seasonal_items where group_id = v_group), 1),
      nullif(p->>'sale_from', '')::date, nullif(p->>'sale_to', '')::date, nullif(p->>'pickup_from', '')::date, nullif(p->>'pickup_to', '')::date,
      coalesce(nullif(p->>'lead_days', '')::int, 0), nullif(p->>'daily_limit', '')::int, nullif(p->>'max_per_order', '')::int, v_blocked,
      coalesce((p->>'active')::boolean, false), v_label) returning * into it;
  else
    update public.seasonal_items set group_id = v_group, name = v_name, detail = nullif(trim(coalesce(p->>'detail', '')), ''), image_url = nullif(p->>'image_url', ''),
      price = v_price, channel = coalesce(p->>'channel', 'website'), sale_from = nullif(p->>'sale_from', '')::date, sale_to = nullif(p->>'sale_to', '')::date,
      pickup_from = nullif(p->>'pickup_from', '')::date, pickup_to = nullif(p->>'pickup_to', '')::date, lead_days = coalesce(nullif(p->>'lead_days', '')::int, 0),
      daily_limit = nullif(p->>'daily_limit', '')::int, max_per_order = nullif(p->>'max_per_order', '')::int, blocked_days = v_blocked,
      active = coalesce((p->>'active')::boolean, active), updated_at = now(), updated_by_label = v_label
    where id = v_id returning * into it;
  end if;
  insert into public.seasonal_item_changes (item_id, by_user, by_label, action, before, after) values (it.id, auth.uid(), v_label, case when v_id is null then 'added' else 'changed' end, v_before, to_jsonb(it));
  return jsonb_build_object('ok', true, 'item', to_jsonb(it));
exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation then
  return public._err('bad_input', 'Check the dates and numbers.');
end $$;

-- Move an item up or down within its heading
create or replace function public.staff_seasonal_move(p_id uuid, p_dir int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare it public.seasonal_items; nb public.seasonal_items;
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change seasonal items.'); end if;
  select * into it from public.seasonal_items where id = p_id and archived_at is null;
  if not found then return public._err('item', 'That item was not found.'); end if;
  -- renumber the heading first so every item has its own place
  update public.seasonal_items s set sort = r.n from (select id, row_number() over (order by sort, name) n from public.seasonal_items where group_id = it.group_id and archived_at is null) r where s.id = r.id;
  select * into it from public.seasonal_items where id = p_id;
  select * into nb from public.seasonal_items where group_id = it.group_id and archived_at is null and sort = it.sort + sign(p_dir)::int;
  if not found then return jsonb_build_object('ok', true); end if;
  update public.seasonal_items set sort = nb.sort where id = it.id;
  update public.seasonal_items set sort = it.sort where id = nb.id;
  return jsonb_build_object('ok', true);
end $$;

-- Copy a heading's items for next year: same names, prices and settings, dates moved on one year, all switched Off
create or replace function public.staff_seasonal_copy_year(p_group uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_label text; n int;
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can change seasonal items.'); end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  insert into public.seasonal_items (group_id, name, detail, image_url, price, channel, sort, sale_from, sale_to, pickup_from, pickup_to, lead_days, daily_limit, max_per_order, blocked_days, active, updated_by_label)
  select group_id, name, detail, image_url, price, channel, sort, sale_from + interval '1 year', sale_to + interval '1 year', pickup_from + interval '1 year', pickup_to + interval '1 year',
    lead_days, daily_limit, max_per_order, (select coalesce(array_agg((d + interval '1 year')::date), '{}') from unnest(blocked_days) d), false, v_label
  from public.seasonal_items where group_id = p_group and archived_at is null;
  get diagnostics n = row_count;
  insert into public.seasonal_item_changes (group_id, by_user, by_label, action, after) values (p_group, auth.uid(), v_label, 'copied_next_year', jsonb_build_object('items', n));
  return jsonb_build_object('ok', true, 'copied', n);
end $$;

-- Counter: hold the treats chosen on the order form until the order saves (keyed by the order's own save key)
create or replace function public.staff_stage_treats(p_key uuid, p_lines jsonb, p_paid_full boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('ord.create') then return public._err('forbidden', 'Your login cannot take orders.'); end if;
  delete from public.pending_treats where created_at < now() - interval '2 days';
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    delete from public.pending_treats where key = p_key; return jsonb_build_object('ok', true, 'lines', 0);
  end if;
  if jsonb_array_length(p_lines) > 30 then return public._err('treats', 'Too many treats on one order.'); end if;
  insert into public.pending_treats (key, lines, paid_full, created_by) values (p_key, p_lines, coalesce(p_paid_full, false), auth.uid())
  on conflict (key) do update set lines = excluded.lines, paid_full = excluded.paid_full, created_by = excluded.created_by, created_at = now();
  return jsonb_build_object('ok', true, 'lines', jsonb_array_length(p_lines));
end $$;

-- Change the treats on an order that already exists (open order > Treats)
create or replace function public.staff_set_order_treats(p_order uuid, p_lines jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.orders; v_chk jsonb; v_label text;
begin
  if not public.has_perm('ord.edit') then return public._err('forbidden', 'Your login cannot change orders.'); end if;
  select * into o from public.orders where id = p_order and deleted_at is null for update;
  if not found then return public._err('order', 'Order not found.'); end if;
  if o.order_status in ('cancelled', 'declined', 'completed') then return public._err('status', 'This order is closed, so its treats cannot change.'); end if;
  v_chk := public._treats_check(p_lines, o.required_date, true, true, o.id);
  if not (v_chk->>'ok')::boolean then return v_chk; end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  perform public._treats_apply(o.id, v_chk->'lines', auth.uid(), v_label);
  select * into o from public.orders where id = p_order;
  return jsonb_build_object('ok', true, 'treats_total', public._treats_total(o.id), 'total', coalesce(o.final_total, o.estimate_total),
    'printed', o.brief_version is not null);
end $$;

grant execute on function public.get_seasonal_menu(text) to anon, authenticated;
grant execute on function public.staff_seasonal_list(), public.staff_seasonal_save_group(jsonb), public.staff_seasonal_save_item(jsonb),
  public.staff_seasonal_move(uuid, int), public.staff_seasonal_copy_year(uuid), public.staff_stage_treats(uuid, jsonb, boolean),
  public.staff_set_order_treats(uuid, jsonb) to authenticated;
revoke execute on function public._treats_check(jsonb, date, boolean, boolean, uuid), public._treats_apply(uuid, jsonb, uuid, text),
  public._treats_booked(uuid, date, uuid), public._treats_total(uuid) from public, anon, authenticated;

-- Photos: managers upload into the public cake-menu bucket under seasonal/ (the existing manager upload rule already covers it)

-- ---------- order saving: treats are checked before the order is created and saved with it ----------
do $mig$
declare d text; n text;
begin
  -- Website: the form sends p.treats = [{id, quantity}]
  d := pg_get_functiondef('public.submit_online_order(jsonb)'::regprocedure);
  if position('_treats_check' in d) = 0 then
    n := replace(d, $a$    begin
      if length(coalesce(v_candles, '')) > 60 then$a$, $b$      v_treats jsonb;
    begin
      if jsonb_typeof(p->'treats') = 'array' and jsonb_array_length(p->'treats') > 0 then
        v_treats := public._treats_check(p->'treats', case when coalesce(p->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'date')::date end, false);
        if not (v_treats->>'ok')::boolean then return v_treats; end if;
      end if;
      if length(coalesce(v_candles, '')) > 60 then$b$);
    n := replace(n, $a$          campaign = coalesce(v_camp, campaign), referral = coalesce(v_ref, referral), contact_pref = v_pref
        where id = (v_res->>'order_id')::uuid;
      end if;$a$, $b$          campaign = coalesce(v_camp, campaign), referral = coalesce(v_ref, referral), contact_pref = v_pref
        where id = (v_res->>'order_id')::uuid;
        if jsonb_array_length(coalesce(v_treats->'lines', '[]')) > 0 then
          perform public._treats_apply((v_res->>'order_id')::uuid, v_treats->'lines', null, 'Guest (online)');
          v_res := v_res || jsonb_build_object('estimate', (select estimate_total from public.orders where id = (v_res->>'order_id')::uuid), 'treats_total', (v_treats->>'total')::numeric);
        end if;
      end if;$b$);
    if n = d or (length(n) - length(replace(n, '_treats_', ''))) <> 2 * length('_treats_') then raise exception 'submit_online_order has changed; treats not added'; end if;
    execute n;
  end if;

  -- Counter: treats staged under the order's save key
  d := pg_get_functiondef('public.staff_create_order(jsonb)'::regprocedure);
  if position('_treats_check' in d) = 0 then
    n := replace(d, $a$  v_res := public._create_order(p, v_src, auth.uid(), v_name);$a$, $b$  if nullif(p->>'idempotency_key', '') is not null and not exists (select 1 from public.orders where idempotency_key = (p->>'idempotency_key')::uuid) then
    select t.lines, t.paid_full into v_treat_lines, v_treat_paid from public.pending_treats t where t.key = (p->>'idempotency_key')::uuid;
    if v_treat_lines is not null then
      v_treats := public._treats_check(v_treat_lines, case when coalesce(p->>'date', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p->>'date')::date end, true, jsonb_typeof(p->'rush') = 'object');
      if not (v_treats->>'ok')::boolean then return v_treats; end if;
    end if;
  end if;
  v_res := public._create_order(p, v_src, auth.uid(), v_name);$b$);
    n := replace(n, $a$    v_oid := (v_res->>'order_id')::uuid;$a$, $b$    v_oid := (v_res->>'order_id')::uuid;
    if jsonb_array_length(coalesce(v_treats->'lines', '[]')) > 0 then
      perform public._treats_apply(v_oid, v_treats->'lines', auth.uid(), v_name);
      -- "Paid in full" at the counter: the customer paid for the treats too, by the same method
      if coalesce(v_treat_paid, false) and jsonb_typeof(p->'payment') = 'object' and p->'payment'->>'kind' = 'full' then
        v_pay := public._record_payment(v_oid, 'full', coalesce(p->'payment'->>'method', 'cash')::public.payment_method, (v_treats->>'total')::numeric, null, 'Treats', auth.uid(), v_name, null);
        if not (v_pay->>'ok')::boolean then raise exception '%', v_pay->>'message'; end if;
      end if;
      delete from public.pending_treats where key = (p->>'idempotency_key')::uuid;
      v_res := v_res || jsonb_build_object('estimate', (select estimate_total from public.orders where id = v_oid), 'treats_total', (v_treats->>'total')::numeric);
    end if;$b$);
    n := replace(n, $a$v_oid uuid; v_answer text := p->>'has_dietary';$a$, $b$v_oid uuid; v_answer text := p->>'has_dietary'; v_treats jsonb; v_treat_lines jsonb; v_treat_paid boolean; v_pay jsonb;$b$);
    if n = d or (length(n) - length(replace(n, '_treats_', ''))) <> 2 * length('_treats_') or position('v_treat_lines jsonb;' in n) = 0 then raise exception 'staff_create_order has changed; treats not added'; end if;
    execute n;
  end if;

  -- Change order: the order total keeps the treats when a cake is changed before the order is confirmed
  d := pg_get_functiondef('public.staff_amend_order(uuid,integer,jsonb,text,text,boolean)'::regprocedure);
  if position('_treats_total' in d) = 0 then
    n := replace(d, $a$  v_price_after := case when o.final_total is null then v_items_after + n_fee$a$, $b$  v_price_after := case when o.final_total is null then v_items_after + n_fee + public._treats_total(o.id)$b$);
    n := replace(n, $a$estimate_total = case when final_total is null then v_price_after else v_items_after + n_fee end,$a$, $b$estimate_total = case when final_total is null then v_price_after else v_items_after + n_fee + public._treats_total(o.id) end,$b$);
    if (length(n) - length(replace(n, '_treats_total', ''))) <> 2 * length('_treats_total') then raise exception 'staff_amend_order has changed; treats not added'; end if;
    execute n;
  end if;

  -- Kitchen slip: the treats print first in the notes, on the printed, emailed and downloaded slip.
  -- Orders without treats keep exactly the same slip (and no "changed" mark).
  d := pg_get_functiondef('public._kitchen_snapshot(uuid)'::regprocedure);
  if position('order_extras' in d) = 0 then
    n := replace(d, $a$'kitchen_notes', i.kitchen_notes, 'order_notes', o.customer_notes, 'rush', o.rush_override,$a$, $b$'kitchen_notes', i.kitchen_notes, 'order_notes', nullif(concat_ws(' · ', (select string_agg(t.g || ': ' || t.l, '. ' order by t.g) from (
        select coalesce(x.group_name, 'Treats') g, string_agg(x.quantity || ' × ' || x.name || coalesce(' (' || x.detail || ')', ''), ', ' order by x.created_at) l
        from public.order_extras x where x.order_id = o.id group by coalesce(x.group_name, 'Treats')) t), o.customer_notes), ''), 'rush', o.rush_override,$b$);
    if n = d then raise exception '_kitchen_snapshot has changed; treats not added'; end if;
    execute n;
  end if;

  -- Analytics feed: each record carries the value of its treats (0 when none), so treats can be counted separately
  d := pg_get_functiondef('public.dashboard_register()'::regprocedure);
  if position('_treats_total' in d) = 0 then
    n := replace(d, $a$'rush', coalesce(o.rush_override, false),$a$, $b$'rush', coalesce(o.rush_override, false), 'treats', public._treats_total(o.id),$b$);
    if n = d then raise exception 'dashboard_register has changed; treats not added'; end if;
    execute n;
  end if;
end $mig$;

-- The flyer items, ready to go: prices in, dates empty, all switched Off
insert into public.seasonal_groups (name, web_message, payment, sort)
select 'Festive treats', 'A little festive joy, made to share.', 'pickup', 1
where not exists (select 1 from public.seasonal_groups where lower(name) = 'festive treats');
insert into public.seasonal_items (group_id, name, detail, price, channel, sort, lead_days, active)
select g.id, v.name, v.detail, v.price, v.channel, v.sort, 2, false
from public.seasonal_groups g, (values
  ('Gingerbread House', '15cm (H) × 13cm (W) × 20cm (L)', 35.00, 'website', 1),
  ('White Chocolate House', '11cm (H) × 7cm (W) × 9cm (L)', 35.00, 'website', 2),
  ('Chocolate House', '11cm (H) × 7cm (W) × 9cm (L)', 35.00, 'website', 3),
  ('Rich Festive Fruit Cake', '6 inch', 46.00, 'website', 4),
  ('Mince Pies', 'Pack of 3', 12.00, 'website', 5),
  ('Chocolate Pralines', 'Pack of 6', 12.00, 'website', 6),
  ('Festive Cookies', 'Pack of 6', 12.00, 'website', 7),
  ('Bottle of wine', 'Red or white', 30.00, 'counter', 8)
) v(name, detail, price, channel, sort)
where lower(g.name) = 'festive treats' and not exists (select 1 from public.seasonal_items s where s.group_id = g.id);
