-- Corner Café cakes: occasion tracking, step 1 (database)
-- One master list of occasions with fixed codes. Every order line gets an occasion code.
-- The existing occasion text stays exactly as it is, so the kitchen slip, customer records and reminders keep working.
-- Orders get separate campaign and referral fields. Occasion is never worked out from the collection date.
-- Runs as one block: if any check at the end fails, nothing is changed.
do $occ$
declare
  v_before int; v_changed int; v_nulls int; v_total int; v_bad int;
begin
  -- 1. Master list
  create table if not exists public.occasions (
    code text primary key check (code ~ '^[a-z][a-z_]{1,30}$'),
    label text not null,
    sort int not null,
    active boolean not null default true,
    featured boolean not null default true,
    aliases text[] not null default '{}'
  );
  create unique index if not exists occasions_label_key on public.occasions (lower(label));
  insert into public.occasions (code, label, sort, featured, aliases) values
    ('birthday', 'Birthday', 10, true, '{}'),
    ('anniversary', 'Anniversary', 20, true, '{}'),
    ('mothers_day', 'Mother''s Day', 30, true, '{"mothers day","mother day"}'),
    ('fathers_day', 'Father''s Day', 40, true, '{"fathers day","father day"}'),
    ('christmas', 'Christmas', 50, true, '{"xmas"}'),
    ('valentines_day', 'Valentine''s Day', 60, true, '{"valentines day","valentine"}'),
    ('wedding', 'Wedding', 70, true, '{}'),
    ('corporate_event', 'Corporate event', 80, true, '{"corporate"}'),
    ('just_because', 'Just because', 90, true, '{}'),
    ('baby_shower', 'Baby shower', 100, false, '{}'),
    ('graduation', 'Graduation', 110, false, '{}'),
    ('other', 'Other', 900, true, '{}'),
    ('not_specified', 'Not specified', 999, true, '{"prefer not to say","none","unknown","unclassified"}')
  on conflict (code) do update set label = excluded.label, sort = excluded.sort, featured = excluded.featured, aliases = excluded.aliases;
  alter table public.occasions enable row level security;
  drop policy if exists occasions_read on public.occasions;
  create policy occasions_read on public.occasions for select to anon, authenticated using (true);
  grant select on public.occasions to anon, authenticated;

  -- 2. New fields (nothing existing is changed)
  alter table public.order_items add column if not exists occasion_code text references public.occasions (code);
  alter table public.order_items add column if not exists occasion_detail text;
  alter table public.orders add column if not exists campaign text;
  alter table public.orders add column if not exists referral text;
  begin alter table public.order_items add constraint order_items_occasion_detail_len check (occasion_detail is null or length(occasion_detail) <= 60); exception when duplicate_object then null; end;
  begin alter table public.orders add constraint orders_campaign_fmt check (campaign is null or campaign ~ '^[a-z0-9][a-z0-9_-]{0,59}$'); exception when duplicate_object then null; end;
  begin alter table public.orders add constraint orders_referral_len check (referral is null or length(referral) <= 120); exception when duplicate_object then null; end;

  -- 3. Text to code: exact names only. Anything else is Other, with the original words kept as the detail. Nothing is guessed.
  execute $f$
    create or replace function public._occ_map(p text, out code text, out detail text)
    language sql stable set search_path = public as $b$
      with t as (select nullif(lower(replace(trim(coalesce(p, '')), '’', '''')), '') v)
      select coalesce(
               case when (select v from t) is null then 'not_specified' end,
               (select o.code from public.occasions o, t where lower(replace(o.label, '’', '''')) = t.v or t.v = any (o.aliases) limit 1),
               'other'),
             case when (select v from t) is not null
                   and not exists (select 1 from public.occasions o, t where lower(replace(o.label, '’', '''')) = t.v or t.v = any (o.aliases))
                  then left(trim(p), 60) end
    $b$
  $f$;

  -- 4. Keep code and text in step on every insert, edit and amendment
  execute $f$
    create or replace function public._occ_sync() returns trigger
    language plpgsql set search_path = public as $b$
    declare m record; direct boolean;
    begin
      direct := (tg_op = 'UPDATE' and new.occasion is not distinct from old.occasion
                 and (new.occasion_code is distinct from old.occasion_code or new.occasion_detail is distinct from old.occasion_detail))
             or (tg_op = 'INSERT' and new.occasion is null and new.occasion_code is not null);
      if direct then
        new.occasion_code := coalesce(new.occasion_code, 'not_specified');
        if new.occasion_code = 'other' then new.occasion_detail := nullif(left(trim(coalesce(new.occasion_detail, '')), 60), ''); new.occasion := coalesce(new.occasion_detail, 'Other');
        elsif new.occasion_code = 'not_specified' then new.occasion := null; new.occasion_detail := null;
        else new.occasion := (select label from public.occasions where code = new.occasion_code); new.occasion_detail := null;
        end if;
        return new;
      end if;
      select * into m from public._occ_map(new.occasion);
      new.occasion_code := m.code; new.occasion_detail := m.detail;
      if m.code = 'not_specified' then new.occasion := null; end if;
      return new;
    end $b$
  $f$;
  drop trigger if exists t_order_items_occasion on public.order_items;
  create trigger t_order_items_occasion before insert or update of occasion, occasion_code, occasion_detail on public.order_items
    for each row execute function public._occ_sync();

  -- 5. Existing orders: exact matches get their code, other words go to Other with the words kept, blanks become Not specified
  create temp table _occ_before on commit drop as select id, occasion from public.order_items;
  select count(*) into v_before from _occ_before;
  update public.order_items i set (occasion_code, occasion_detail) = (select m.code, m.detail from public._occ_map(i.occasion) m)
    where i.occasion_code is null;

  -- 6. Website orders: record the campaign and the referring site, separately from the occasion
  execute $f$
    create or replace function public.submit_online_order(p jsonb)
     returns jsonb language plpgsql security definer set search_path to 'public' as $b$
    declare v_res jsonb; v_candles text := nullif(trim(coalesce(p->>'candles', '')), ''); v_answer text := p->>'has_dietary';
      v_camp text := nullif(lower(trim(coalesce(p->>'campaign', ''))), ''); v_ref text := nullif(left(trim(coalesce(p->>'referral', '')), 120), '');
    begin
      if length(coalesce(v_candles, '')) > 60 then return public._err('candles', 'Keep the candles to 60 characters.', 'candles'); end if;
      if length(trim(coalesce(p->>'occasion', ''))) > 60 then return public._err('occasion', 'Keep the occasion to 60 characters.', 'occasion'); end if;
      if v_camp is not null and v_camp !~ '^[a-z0-9][a-z0-9_-]{0,59}$' then v_camp := null; end if;
      v_res := public._create_order(public._diet_unsure(p) - 'candles' - 'campaign' - 'referral', 'online', null, 'Guest (online)');
      if coalesce((v_res->>'ok')::boolean, false) and v_res ? 'order_id' and not coalesce((v_res->>'duplicate')::boolean, false) then
        if v_candles is not null then update public.order_items set candles = v_candles where order_id = (v_res->>'order_id')::uuid and candles is null; end if;
        if v_answer in ('yes', 'no', 'unsure') then update public.orders set dietary_status = v_answer where id = (v_res->>'order_id')::uuid; end if;
        if v_camp is not null or v_ref is not null then update public.orders set campaign = v_camp, referral = v_ref where id = (v_res->>'order_id')::uuid; end if;
      end if;
      return v_res;
    end $b$
  $f$;

  -- 7. Dashboard data: add occasion and campaign; finance (Reports switch) can open it too
  execute $f$
    create or replace function public.dashboard_register()
     returns jsonb language plpgsql security definer set search_path to 'public' as $b$
    begin
      if not (public.has_perm('mgmt.analytics') or public.has_perm('mgmt.reports')) then
        return jsonb_build_object('ok', false, 'message', 'Your login does not have access to the dashboard.');
      end if;
      if coalesce((select at from public.reg_meta where k = 'last_rebuild'), 'epoch') < now() - interval '2 minutes' then
        perform public.register_rebuild('refresh');
      end if;
      return jsonb_build_object(
        'ok', true,
        'generated_at', now(),
        'sync', public._register_sync(),
        'master_url', (select v from public.reg_meta where k = 'master_sheet_url'),
        'left_out', (select jsonb_object_agg(review, n) from (select review, count(*) n from public.register where review <> 'ok' group by review) x),
        'tests_excluded', (select count(*) from public.register where 'test_order' = any (flags)),
        'products', (select coalesce(jsonb_agg(jsonb_build_object('n', name, 'on', status = 'active') order by sort), '[]') from public.products),
        'occasions', (select coalesce(jsonb_agg(jsonb_build_object('c', code, 'l', label) order by sort), '[]') from public.occasions where active),
        'orders', (select coalesce(jsonb_agg(jsonb_build_object(
            'k', g.rec_key, 'i', g.order_id, 'r', g.reference, 'src', g.channel, 'sys', g.source, 'st', g.status, 'cp', g.completion,
            'od', g.order_date, 'odb', g.order_date_basis,
            'odok', g.order_date is not null and g.order_date_basis <> 'Sheet entry time' and (g.fulfil_date is null or g.order_date <= g.fulfil_date),
            'pd', g.fulfil_date, 'pt', g.fulfil_time, 'fm', g.method,
            'c', g.phone_key, 'cn', g.customer,
            'it', jsonb_build_array(jsonb_build_array(coalesce(g.cake_group, 'Cake'), g.cake, g.size_inch, coalesce(g.qty, 1),
                   case when coalesce(g.qty, 1) > 0 then coalesce(g.confirmed_value, g.list_value) / coalesce(g.qty, 1) end)),
            'lv', g.list_value, 'cv', g.confirmed_value, 'paid', g.paid, 'ref', g.refunded, 'bal', g.balance,
            'wn', g.warnings, 'pay', g.extra->'pay', 'ho', g.extra->'ho', 'ra', g.extra->'ra', 'rev', coalesce((g.extra->>'rev')::int, 0),
            'cx', coalesce(g.extra->>'cx', g.status_note), 'ca', g.extra->'ca',
            'oc', coalesce(oi.occasion_code, 'not_specified'), 'ocd', oi.occasion_detail, 'cmp', o.campaign
          ) order by g.fulfil_date), '[]')
          from public.register g
          left join public.orders o on o.id = g.order_id
          left join lateral (select x.occasion_code, x.occasion_detail from public.order_items x where x.order_id = g.order_id order by x.created_at limit 1) oi on true
          where g.review = 'ok' and g.fulfil_date is not null)
      );
    end $b$
  $f$;

  -- 8. Checks: every line has a code, and no existing occasion text changed
  select count(*), count(*) filter (where occasion_code is null) into v_total, v_nulls from public.order_items;
  select count(*) into v_changed from public.order_items i join _occ_before b on b.id = i.id where i.occasion is distinct from b.occasion;
  select count(*) into v_bad from public.order_items where (occasion_code = 'not_specified') <> (occasion is null);
  if v_total <> v_before then raise exception 'Expected % order lines, found %', v_before, v_total; end if;
  if v_nulls <> 0 then raise exception '% order lines still have no occasion code', v_nulls; end if;
  if v_changed <> 0 then raise exception '% existing occasion texts would have changed', v_changed; end if;
  if v_bad <> 0 then raise exception '% order lines have Not specified and text out of step', v_bad; end if;
  if (select count(*) from public.occasions) < 13 then raise exception 'Occasion list incomplete'; end if;
  raise notice 'Occasions installed: % order lines classified, none changed.', v_total;
end $occ$;

-- Summary to read after running
select o.label as occasion, count(i.id) as order_lines
from public.occasions o left join public.order_items i on i.occasion_code = o.code
group by o.label, o.sort order by o.sort;
