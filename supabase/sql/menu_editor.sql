-- Cake menu editor: add and change cake types, flavours, sizes and prices from Settings.
-- Nothing is ever removed: cakes, flavours and sizes are taken off sale, so past orders keep their names and prices.
create table if not exists public.product_changes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  changed_by uuid,
  changed_by_label text,
  changed_at timestamptz not null default now(),
  summary jsonb not null default '[]',
  before jsonb,
  after jsonb
);
alter table public.product_changes enable row level security;
create policy managers_read_product_changes on public.product_changes for select to authenticated using (public.has_role('manager'));
create index if not exists product_changes_product_idx on public.product_changes (product_id, changed_at desc);

create or replace function public._product_snapshot(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('name', p.name, 'status', p.status, 'choice_label', p.choice_label, 'lead_days', p.lead_days,
    'supports_custom', p.supports_custom, 'supports_message', p.supports_message, 'dietary_info', p.dietary_info, 'allergen_info', p.allergen_info, 'sort', p.sort,
    'flavours', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'name', v.name, 'active', v.active) order by v.sort, v.name) from public.product_variants v where v.product_id = p.id), '[]'),
    'sizes', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'inch', s.size_inch, 'price', s.price, 'serves', s.serves_label, 'active', s.active) order by s.size_inch) from public.product_sizes s where s.product_id = p.id), '[]'))
  from public.products p where p.id = p_id
$$;

create or replace function public.staff_save_product(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid := nullif(p->>'id', '')::uuid; v_name text := trim(coalesce(p->>'name', '')); v_status text := coalesce(nullif(p->>'status', ''), 'active');
  v_before jsonb; v_after jsonb; v_code text; v_base text; n int := 0; v_label text; f jsonb; s jsonb; v_fid uuid; v_sid uuid; v_ord int := 0;
  v_names text[] := '{}'; v_inches int[] := '{}'; v_inch int; v_price numeric; v_lead int; v_sort int;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only managers can change the cake menu.'); end if;
  if length(v_name) < 2 or length(v_name) > 60 then return public._err('name', 'Give the cake a name of 2 to 60 characters.', 'name'); end if;
  if v_status not in ('active', 'hidden') then return public._err('status', 'Unknown status.'); end if;
  if exists (select 1 from public.products x where lower(x.name) = lower(v_name) and x.id is distinct from v_id) then return public._err('name', 'Another cake already has this name.', 'name'); end if;
  v_lead := nullif(p->>'lead_days', '')::int;
  if v_lead is not null and (v_lead < 0 or v_lead > 60) then return public._err('lead_days', 'Notice must be between 0 and 60 days.', 'lead_days'); end if;
  -- check flavours and sizes before writing anything
  for f in select * from jsonb_array_elements(coalesce(p->'flavours', '[]')) loop
    if length(trim(coalesce(f->>'name', ''))) = 0 then continue; end if;
    if length(trim(f->>'name')) > 40 then return public._err('flavours', 'Keep each flavour name to 40 characters.', 'flavours'); end if;
    if lower(trim(f->>'name')) = any (v_names) then return public._err('flavours', 'The flavour "' || trim(f->>'name') || '" is listed twice.', 'flavours'); end if;
    v_names := v_names || lower(trim(f->>'name'));
  end loop;
  for s in select * from jsonb_array_elements(coalesce(p->'sizes', '[]')) loop
    v_inch := nullif(s->>'inch', '')::int; v_price := nullif(s->>'price', '')::numeric;
    if v_inch is null or v_inch < 3 or v_inch > 24 then return public._err('sizes', 'Each size must be a whole number of inches between 3 and 24.', 'sizes'); end if;
    if v_inch = any (v_inches) then return public._err('sizes', 'The ' || v_inch || ' inch size is listed twice.', 'sizes'); end if;
    if v_price is null or v_price < 0 or v_price > 5000 then return public._err('sizes', 'Check the ' || v_inch || ' inch price.', 'sizes'); end if;
    v_inches := v_inches || v_inch;
  end loop;
  if v_status = 'active' and not exists (select 1 from jsonb_array_elements(coalesce(p->'sizes', '[]')) x where coalesce((x->>'active')::boolean, true)) then
    return public._err('sizes', 'A cake on sale needs at least one size offered.', 'sizes');
  end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  if v_id is null then
    v_base := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g')); if v_base = '' then v_base := 'cake'; end if;
    v_code := v_base; while exists (select 1 from public.products where code = v_code) loop n := n + 1; v_code := v_base || '-' || n; end loop;
    v_sort := coalesce(nullif(p->>'sort', '')::int, (select coalesce(max(sort), 0) + 1 from public.products));
    insert into public.products (code, name, choice_label, lead_days, supports_custom, supports_message, dietary_info, allergen_info, status, sort, swatch)
    values (v_code, v_name, nullif(trim(coalesce(p->>'choice_label', '')), ''), v_lead, coalesce((p->>'supports_custom')::boolean, true), coalesce((p->>'supports_message')::boolean, true),
            nullif(trim(coalesce(p->>'dietary_info', '')), ''), nullif(trim(coalesce(p->>'allergen_info', '')), ''), v_status, v_sort,
            'radial-gradient(circle at 50% 35%, #F3E3B8 0 55%, #C99A5B 56%)')
    returning id into v_id;
  else
    if not exists (select 1 from public.products where id = v_id) then return public._err('product', 'This cake was not found. Refresh and try again.'); end if;
    v_before := public._product_snapshot(v_id);
    update public.products set name = v_name, choice_label = nullif(trim(coalesce(p->>'choice_label', '')), ''), lead_days = v_lead,
      supports_custom = coalesce((p->>'supports_custom')::boolean, supports_custom), supports_message = coalesce((p->>'supports_message')::boolean, supports_message),
      dietary_info = nullif(trim(coalesce(p->>'dietary_info', '')), ''), allergen_info = nullif(trim(coalesce(p->>'allergen_info', '')), ''),
      status = v_status, sort = coalesce(nullif(p->>'sort', '')::int, sort), updated_at = now()
    where id = v_id;
  end if;
  -- flavours: update by id, otherwise add (or bring back one with the same name)
  for f in select * from jsonb_array_elements(coalesce(p->'flavours', '[]')) loop
    if length(trim(coalesce(f->>'name', ''))) = 0 then continue; end if;
    v_ord := v_ord + 1; v_fid := nullif(f->>'id', '')::uuid;
    if v_fid is not null and exists (select 1 from public.product_variants where id = v_fid and product_id = v_id) then
      update public.product_variants set name = trim(f->>'name'), active = coalesce((f->>'active')::boolean, true), sort = v_ord where id = v_fid;
    else
      insert into public.product_variants (product_id, name, sort, active) values (v_id, trim(f->>'name'), v_ord, coalesce((f->>'active')::boolean, true))
      on conflict (product_id, name) do update set active = excluded.active, sort = excluded.sort;
    end if;
  end loop;
  -- sizes: update by id, otherwise add (or bring back the same inch size)
  for s in select * from jsonb_array_elements(coalesce(p->'sizes', '[]')) loop
    v_sid := nullif(s->>'id', '')::uuid;
    if v_sid is not null and exists (select 1 from public.product_sizes where id = v_sid and product_id = v_id) then
      update public.product_sizes set size_inch = (s->>'inch')::int, price = round((s->>'price')::numeric, 2), serves_label = nullif(trim(coalesce(s->>'serves', '')), ''),
        active = coalesce((s->>'active')::boolean, true), updated_at = now() where id = v_sid;
    else
      insert into public.product_sizes (product_id, size_inch, price, serves_label, active)
      values (v_id, (s->>'inch')::int, round((s->>'price')::numeric, 2), nullif(trim(coalesce(s->>'serves', '')), ''), coalesce((s->>'active')::boolean, true))
      on conflict (product_id, size_inch) do update set price = excluded.price, serves_label = excluded.serves_label, active = excluded.active, updated_at = now();
    end if;
  end loop;
  v_after := public._product_snapshot(v_id);
  if v_before is distinct from v_after then
    insert into public.product_changes (product_id, changed_by, changed_by_label, summary, before, after)
    values (v_id, auth.uid(), v_label, coalesce(p->'summary', '[]'), v_before, v_after);
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'created', v_before is null, 'changed', v_before is distinct from v_after);
exception when unique_violation then return public._err('duplicate', 'Two flavours or sizes clash. Check for the same name or size twice.');
end $$;
revoke all on function public.staff_save_product(jsonb) from public, anon;
grant execute on function public.staff_save_product(jsonb) to authenticated;
revoke all on function public._product_snapshot(uuid) from public, anon, authenticated;
