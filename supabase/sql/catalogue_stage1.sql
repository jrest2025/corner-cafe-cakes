-- Catalogue Stage 1: product catalogue source and public read. Additive only.
create table if not exists public.catalogue_collections (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id),
  location_id uuid references public.locations(id),
  code text not null unique check (code ~ '^[a-z0-9-]{3,40}$'),
  title text not null,
  kicker text,
  intro text,
  ordering_info text,
  deadline_text text,
  collection_text text,
  disclaimer text not null default 'Prices and availability are correct on the date this catalogue was made and may change. Your order is confirmed only when our team confirms it with you.',
  page_url text,
  downloads_enabled boolean not null default false,
  show_prices boolean not null default true,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalogue_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.catalogue_collections(id) on delete restrict,
  product_id uuid references public.products(id) on delete restrict,
  code text not null check (code ~ '^[a-z0-9-]{2,60}$'),
  name text check (name is null or length(name) between 2 and 80),
  category text,
  description text check (description is null or length(description) <= 400),
  image_url text,
  image_alt text,
  dietary_info text,
  allergen_info text,
  availability text not null default 'available' check (availability in ('available','limited','sold_out','coming_soon')),
  ordering_note text,
  lead_days int check (lead_days is null or lead_days between 0 and 90),
  included boolean not null default true,
  sort int not null default 0,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_id, code),
  check (product_id is not null or name is not null)
);

create table if not exists public.catalogue_item_options (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalogue_items(id) on delete cascade,
  label text not null check (length(label) between 1 and 60),
  price numeric(10,2) check (price is null or (price >= 0 and price <= 100000)),
  price_on_request boolean not null default false,
  sort int not null default 0,
  active boolean not null default true,
  unique (item_id, label)
);

create table if not exists public.catalogue_generations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  collection_id uuid not null references public.catalogue_collections(id),
  kind text not null check (kind in ('full','custom')),
  item_count int not null,
  item_ids uuid[] not null default '{}'
);
create index if not exists catalogue_generations_recent on public.catalogue_generations (created_at desc);
create index if not exists catalogue_items_collection on public.catalogue_items (collection_id, sort);

alter table public.catalogue_collections enable row level security;
alter table public.catalogue_items enable row level security;
alter table public.catalogue_item_options enable row level security;
alter table public.catalogue_generations enable row level security;

create policy staff_read_catalogue_collections on public.catalogue_collections for select to authenticated using (public.is_staff());
create policy managers_write_catalogue_collections on public.catalogue_collections for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy staff_read_catalogue_items on public.catalogue_items for select to authenticated using (public.is_staff());
create policy managers_write_catalogue_items on public.catalogue_items for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy staff_read_catalogue_options on public.catalogue_item_options for select to authenticated using (public.is_staff());
create policy managers_write_catalogue_options on public.catalogue_item_options for all to authenticated using (public.has_role('manager')) with check (public.has_role('manager'));
create policy staff_read_catalogue_generations on public.catalogue_generations for select to authenticated using (public.is_staff());

-- Public read: only what a guest may see, prices straight from the database.
create or replace function public.get_catalogue(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.catalogue_collections; loc public.locations;
begin
  select * into c from public.catalogue_collections where code = p_code;
  if not found or not c.downloads_enabled then
    return public._err('closed', 'This catalogue is not available right now.');
  end if;
  select * into loc from public.locations where id = c.location_id;
  return jsonb_build_object('ok', true,
    'collection', jsonb_build_object('code', c.code, 'title', c.title, 'kicker', c.kicker, 'intro', c.intro,
      'ordering_info', c.ordering_info, 'deadline_text', c.deadline_text, 'collection_text', c.collection_text,
      'disclaimer', c.disclaimer, 'page_url', c.page_url, 'show_prices', c.show_prices, 'is_test', c.is_test,
      'updated_at', c.updated_at),
    'contact', jsonb_build_object('name', coalesce(loc.name, 'Corner Café'), 'address', loc.address, 'phone', loc.phone, 'email', loc.email),
    'today', (now() at time zone coalesce(loc.timezone, 'Pacific/Fiji'))::date,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id, 'code', i.code,
        'name', coalesce(i.name, p.name), 'category', coalesce(i.category, p.category),
        'description', coalesce(i.description, p.description),
        'image_url', coalesce(i.image_url, p.image_url), 'image_alt', i.image_alt,
        'dietary_info', coalesce(i.dietary_info, p.dietary_info), 'allergen_info', coalesce(i.allergen_info, p.allergen_info),
        'availability', i.availability, 'ordering_note', i.ordering_note, 'lead_days', coalesce(i.lead_days, p.lead_days),
        'is_test', i.is_test,
        'options', case when i.product_id is not null then coalesce((
            select jsonb_agg(jsonb_build_object('label', s.size_inch || ' inch' || coalesce(', ' || s.serves_label, ''),
              'price', case when c.show_prices then s.price end, 'price_on_request', false) order by s.size_inch)
            from public.product_sizes s where s.product_id = i.product_id and s.active), '[]')
          else coalesce((
            select jsonb_agg(jsonb_build_object('label', o.label,
              'price', case when c.show_prices and not o.price_on_request then o.price end,
              'price_on_request', o.price_on_request) order by o.sort, o.label)
            from public.catalogue_item_options o where o.item_id = i.id and o.active), '[]') end
      ) order by i.sort, coalesce(i.name, p.name))
      from public.catalogue_items i left join public.products p on p.id = i.product_id
      where i.collection_id = c.id and i.included
        and (i.product_id is null or p.status = 'active')), '[]'));
end $$;

-- Count each generated catalogue (no personal data). Light throttle against automated misuse.
create or replace function public.log_catalogue_generation(p_code text, p_kind text, p_item_ids uuid[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.catalogue_collections; n int;
begin
  select * into c from public.catalogue_collections where code = p_code;
  if not found or not c.downloads_enabled then return public._err('closed', 'This catalogue is not available right now.'); end if;
  if p_kind not in ('full','custom') then return public._err('kind', 'Unknown catalogue type.'); end if;
  if coalesce(array_length(p_item_ids, 1), 0) = 0 or array_length(p_item_ids, 1) > 200 then return public._err('items', 'Choose at least one product.'); end if;
  select count(*) into n from public.catalogue_items where collection_id = c.id and included and id = any (p_item_ids);
  if n <> (select count(distinct x) from unnest(p_item_ids) x) then return public._err('items', 'Some products are no longer available. Refresh the page and try again.'); end if;
  if (select count(*) from public.catalogue_generations where created_at > now() - interval '10 minutes') >= 300 then
    return public._err('busy', 'Too many catalogues are being made right now. Please try again in a few minutes.');
  end if;
  insert into public.catalogue_generations (collection_id, kind, item_count, item_ids) values (c.id, p_kind, n, p_item_ids);
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.get_catalogue(text) from public;
revoke all on function public.log_catalogue_generation(text, text, uuid[]) from public;
grant execute on function public.get_catalogue(text) to anon, authenticated;
grant execute on function public.log_catalogue_generation(text, text, uuid[]) to anon, authenticated;
