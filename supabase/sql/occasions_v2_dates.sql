-- Corner Café cakes: Occasion Intelligence, Phase 1 (database)
-- Occasions stay one master list (Mother's Day is created once). Each year's date is a separate row in occasion_dates,
-- so years can be compared without duplicate occasions and without touching history.
-- Additive only: nothing existing is removed or renamed. Runs as one block; if a check at the end fails, nothing changes.
do $occ2$
declare v_items int; v_text_before bigint; v_text_after bigint; v_codes_before bigint; v_codes_after bigint;
begin
  select count(*), sum(hashtext(coalesce(occasion, '∅'))), sum(hashtext(coalesce(occasion_code, '∅'))) into v_items, v_text_before, v_codes_before from public.order_items;

  -- 1. Master list: a stable id, a category, a colour, archive and merge tracking, and which occasions have calendar dates
  alter table public.occasions add column if not exists id uuid not null default gen_random_uuid();
  begin alter table public.occasions add constraint occasions_id_key unique (id); exception when duplicate_table or duplicate_object then null; end;
  alter table public.occasions add column if not exists category text not null default 'personal';
  begin alter table public.occasions add constraint occasions_category_chk check (category in ('personal', 'holiday', 'business', 'other')); exception when duplicate_object then null; end;
  alter table public.occasions add column if not exists colour text not null default '#5F7A4A';
  begin alter table public.occasions add constraint occasions_colour_chk check (colour ~ '^#[0-9A-Fa-f]{6}$'); exception when duplicate_object then null; end;
  alter table public.occasions add column if not exists has_dates boolean not null default false;
  alter table public.occasions add column if not exists system boolean not null default false;
  alter table public.occasions add column if not exists archived_at timestamptz;
  alter table public.occasions add column if not exists merged_into text references public.occasions (code);
  alter table public.occasions add column if not exists updated_at timestamptz not null default now();

  update public.occasions set category = 'holiday', has_dates = true where code in ('mothers_day', 'fathers_day', 'christmas', 'valentines_day');
  update public.occasions set category = 'business' where code = 'corporate_event';
  update public.occasions set category = 'other' where code in ('just_because', 'other', 'not_specified');
  update public.occasions set system = true where code in ('other', 'not_specified');
  update public.occasions o set colour = c.colour from (values
    ('birthday', '#C2410C'), ('anniversary', '#BE185D'), ('mothers_day', '#9D174D'), ('fathers_day', '#1D4ED8'),
    ('christmas', '#15803D'), ('valentines_day', '#DC2626'), ('wedding', '#7C3AED'), ('corporate_event', '#334155'),
    ('just_because', '#A16207'), ('baby_shower', '#0E7490'), ('graduation', '#4338CA'), ('other', '#6B7280'), ('not_specified', '#9CA3AF')
  ) c(code, colour) where o.code = c.code and o.colour = '#5F7A4A';

  -- 2. Dates for each year, kept separately from the occasion itself
  create table if not exists public.occasion_dates (
    id uuid primary key default gen_random_uuid(),
    occasion_code text not null references public.occasions (code) on update cascade,
    year int not null check (year between 2020 and 2100),
    starts_on date not null,
    ends_on date,
    promo_days int not null default 21 check (promo_days between 0 and 120),
    source text not null default 'manual' check (source in ('rule', 'manual')),
    note text check (note is null or length(note) <= 200),
    updated_at timestamptz not null default now(),
    unique (occasion_code, year),
    check (ends_on is null or ends_on >= starts_on),
    check (extract(year from starts_on)::int = year)
  );
  alter table public.occasion_dates enable row level security;
  drop policy if exists occasion_dates_read on public.occasion_dates;
  create policy occasion_dates_read on public.occasion_dates for select to anon, authenticated using (true);
  grant select on public.occasion_dates to anon, authenticated;

  -- Fiji dates: Mother's Day is the second Sunday of May, Father's Day the first Sunday of September
  insert into public.occasion_dates (occasion_code, year, starts_on, promo_days, source)
  select x.code, y, x.d, x.promo, 'rule' from generate_series(2024, 2028) y,
    lateral (values
      ('mothers_day', (make_date(y, 5, 1) + ((7 - extract(dow from make_date(y, 5, 1))::int) % 7) + 7), 21),
      ('fathers_day', (make_date(y, 9, 1) + ((7 - extract(dow from make_date(y, 9, 1))::int) % 7)), 21),
      ('valentines_day', make_date(y, 2, 14), 21),
      ('christmas', make_date(y, 12, 25), 42)
    ) x(code, d, promo)
  on conflict (occasion_code, year) do nothing;

  -- 3. Every change is written to the audit log
  drop trigger if exists t_audit_occasions on public.occasions;
  create trigger t_audit_occasions after insert or update or delete on public.occasions for each row execute function public.write_audit();
  drop trigger if exists t_audit_occasion_dates on public.occasion_dates;
  create trigger t_audit_occasion_dates after insert or update or delete on public.occasion_dates for each row execute function public.write_audit();

  -- 4. Text matching skips occasions that were merged away (their words now belong to the occasion they joined)
  execute $f$
    create or replace function public._occ_map(p text, out code text, out detail text)
    language sql stable set search_path = public as $b$
      with t as (select nullif(lower(replace(trim(coalesce(p, '')), '’', '''')), '') v),
           o as (select * from public.occasions where merged_into is null)
      select coalesce(
               case when (select v from t) is null then 'not_specified' end,
               (select o.code from o, t where lower(replace(o.label, '’', '''')) = t.v or t.v = any (o.aliases) order by o.sort limit 1),
               'other'),
             case when (select v from t) is not null
                   and not exists (select 1 from o, t where lower(replace(o.label, '’', '''')) = t.v or t.v = any (o.aliases))
                  then left(trim(p), 60) end
    $b$
  $f$;

  -- 5. A merge moves order lines to another occasion but keeps the words written on each order
  execute $f$
    create or replace function public._occ_sync() returns trigger
    language plpgsql set search_path = public as $b$
    declare m record; direct boolean;
    begin
      if current_setting('cc.occ_merge', true) = 'on' then return new; end if;
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

  -- 6. Settings: read everything in one call (any staff with Settings or Dashboard access)
  execute $f$
    create or replace function public.occasion_admin()
    returns jsonb language plpgsql stable security definer set search_path = public as $b$
    begin
      if not (public.has_perm('mgmt.settings') or public.has_perm('mgmt.analytics')) then
        return jsonb_build_object('ok', false, 'message', 'Your login cannot see occasion settings.');
      end if;
      return jsonb_build_object('ok', true, 'can_edit', public.has_perm('mgmt.settings'),
        'occasions', (select coalesce(jsonb_agg(jsonb_build_object(
            'id', o.id, 'code', o.code, 'label', o.label, 'category', o.category, 'colour', o.colour, 'sort', o.sort,
            'featured', o.featured, 'has_dates', o.has_dates, 'system', o.system, 'active', o.active,
            'archived_at', o.archived_at, 'merged_into', o.merged_into,
            'orders', (select count(*) from public.order_items i join public.orders r on r.id = i.order_id where i.occasion_code = o.code and r.deleted_at is null and not coalesce(r.is_test, false))
          ) order by o.sort, o.label), '[]') from public.occasions o),
        'dates', (select coalesce(jsonb_agg(jsonb_build_object(
            'id', d.id, 'code', d.occasion_code, 'year', d.year, 'starts_on', d.starts_on, 'ends_on', d.ends_on,
            'promo_days', d.promo_days, 'source', d.source, 'note', d.note) order by d.year, d.starts_on), '[]') from public.occasion_dates d));
    end $b$
  $f$;

  -- 7. Settings: save, archive or restore, reorder, merge, and dates. Only logins with "Manage restaurant settings".
  execute $f$
    create or replace function public.occasion_save(p jsonb)
    returns jsonb language plpgsql security definer set search_path = public as $b$
    declare v_code text := nullif(trim(coalesce(p->>'code', '')), ''); v_label text := nullif(trim(coalesce(p->>'label', '')), '');
      v_cat text := coalesce(p->>'category', 'personal'); v_col text := coalesce(p->>'colour', '#5F7A4A'); o public.occasions;
    begin
      if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change occasions.'); end if;
      if v_label is null or length(v_label) > 40 then return jsonb_build_object('ok', false, 'message', 'Give the occasion a name of up to 40 characters.', 'field', 'label'); end if;
      if v_cat not in ('personal', 'holiday', 'business', 'other') then return jsonb_build_object('ok', false, 'message', 'Choose a category.', 'field', 'category'); end if;
      if v_col !~ '^#[0-9A-Fa-f]{6}$' then return jsonb_build_object('ok', false, 'message', 'Choose a colour.', 'field', 'colour'); end if;
      if exists (select 1 from public.occasions x where lower(x.label) = lower(v_label) and x.code is distinct from v_code) then
        return jsonb_build_object('ok', false, 'message', 'There is already an occasion called ' || v_label || '. Use that one, or merge them.', 'field', 'label');
      end if;
      if v_code is null then
        v_code := left(regexp_replace(regexp_replace(lower(v_label), '[^a-z]+', '_', 'g'), '^_+|_+$', '', 'g'), 30);
        if v_code !~ '^[a-z][a-z_]{1,30}$' then v_code := 'occ_' || substr(md5(v_label || clock_timestamp()::text), 1, 8); v_code := regexp_replace(v_code, '[0-9]', 'x', 'g'); end if;
        while exists (select 1 from public.occasions where code = v_code) loop v_code := left(v_code, 27) || '_' || chr(97 + floor(random() * 26)::int) || chr(97 + floor(random() * 26)::int); end loop;
        insert into public.occasions (code, label, sort, category, colour, featured, has_dates)
        values (v_code, v_label, coalesce((select max(sort) from public.occasions where sort < 900), 0) + 10, v_cat, v_col, coalesce((p->>'featured')::boolean, false), coalesce((p->>'has_dates')::boolean, v_cat = 'holiday'))
        returning * into o;
      else
        select * into o from public.occasions where code = v_code for update;
        if not found then return jsonb_build_object('ok', false, 'message', 'That occasion no longer exists. Refresh and try again.'); end if;
        if o.system and v_label <> o.label then return jsonb_build_object('ok', false, 'message', o.label || ' is built in and keeps its name.', 'field', 'label'); end if;
        -- The old name keeps matching, so orders typed with it still land here
        update public.occasions set label = v_label, category = v_cat, colour = v_col,
          featured = coalesce((p->>'featured')::boolean, featured), has_dates = coalesce((p->>'has_dates')::boolean, has_dates),
          aliases = case when lower(o.label) <> lower(v_label) and not (lower(o.label) = any (aliases)) then array_append(aliases, lower(o.label)) else aliases end,
          updated_at = now()
        where code = v_code returning * into o;
      end if;
      return jsonb_build_object('ok', true, 'code', o.code);
    end $b$
  $f$;

  execute $f$
    create or replace function public.occasion_archive(p_code text, p_archive boolean)
    returns jsonb language plpgsql security definer set search_path = public as $b$
    declare o public.occasions;
    begin
      if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change occasions.'); end if;
      select * into o from public.occasions where code = p_code for update;
      if not found then return jsonb_build_object('ok', false, 'message', 'That occasion no longer exists.'); end if;
      if o.system then return jsonb_build_object('ok', false, 'message', o.label || ' is built in and cannot be archived.'); end if;
      if o.merged_into is not null and not p_archive then return jsonb_build_object('ok', false, 'message', 'This occasion was merged and cannot be restored.'); end if;
      update public.occasions set active = not p_archive, archived_at = case when p_archive then now() end, updated_at = now() where code = p_code;
      return jsonb_build_object('ok', true);
    end $b$
  $f$;

  execute $f$
    create or replace function public.occasion_move(p_code text, p_dir int)
    returns jsonb language plpgsql security definer set search_path = public as $b$
    declare a public.occasions; b public.occasions;
    begin
      if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change occasions.'); end if;
      select * into a from public.occasions where code = p_code;
      if not found or a.system then return jsonb_build_object('ok', false, 'message', 'This occasion cannot be moved.'); end if;
      if p_dir < 0 then select * into b from public.occasions where sort < a.sort and not system and merged_into is null order by sort desc limit 1;
      else select * into b from public.occasions where sort > a.sort and not system and merged_into is null order by sort limit 1; end if;
      if not found then return jsonb_build_object('ok', true); end if;
      update public.occasions set sort = case when code = a.code then b.sort else a.sort end, updated_at = now() where code in (a.code, b.code);
      return jsonb_build_object('ok', true);
    end $b$
  $f$;

  execute $f$
    create or replace function public.occasion_merge(p_from text, p_into text)
    returns jsonb language plpgsql security definer set search_path = public as $b$
    declare f public.occasions; t public.occasions; v_lines int; v_dates int;
    begin
      if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot merge occasions.'); end if;
      select * into f from public.occasions where code = p_from for update;
      select * into t from public.occasions where code = p_into for update;
      if f.code is null or t.code is null then return jsonb_build_object('ok', false, 'message', 'Choose two occasions that exist.'); end if;
      if f.code = t.code then return jsonb_build_object('ok', false, 'message', 'Choose a different occasion to merge into.'); end if;
      if f.system or t.code = 'not_specified' then return jsonb_build_object('ok', false, 'message', 'Built-in occasions cannot be merged this way.'); end if;
      if f.merged_into is not null or t.merged_into is not null then return jsonb_build_object('ok', false, 'message', 'One of these was already merged.'); end if;
      select count(*) into v_dates from public.occasion_dates d where d.occasion_code = f.code and exists (select 1 from public.occasion_dates e where e.occasion_code = t.code and e.year = d.year);
      if v_dates > 0 then return jsonb_build_object('ok', false, 'message', 'Both occasions have a date for the same year. Remove one of those dates first.'); end if;
      perform set_config('cc.occ_merge', 'on', true);
      update public.order_items set occasion_code = t.code where occasion_code = f.code;
      get diagnostics v_lines = row_count;
      perform set_config('cc.occ_merge', 'off', true);
      update public.occasion_dates set occasion_code = t.code, updated_at = now() where occasion_code = f.code;
      update public.occasions set aliases = (select array_agg(distinct a) from unnest(t.aliases || f.aliases || array[lower(f.label)]) a), updated_at = now() where code = t.code;
      update public.occasions set active = false, archived_at = now(), merged_into = t.code, updated_at = now() where code = f.code;
      return jsonb_build_object('ok', true, 'moved', v_lines);
    end $b$
  $f$;

  execute $f$
    create or replace function public.occasion_date_save(p jsonb)
    returns jsonb language plpgsql security definer set search_path = public as $b$
    declare v_id uuid := nullif(p->>'id', '')::uuid; v_code text := p->>'code'; v_start date; v_end date; v_promo int; v_note text := nullif(left(trim(coalesce(p->>'note', '')), 200), '');
    begin
      if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change occasion dates.'); end if;
      begin v_start := (p->>'starts_on')::date; v_end := nullif(p->>'ends_on', '')::date; v_promo := coalesce(nullif(p->>'promo_days', '')::int, 21);
      exception when others then return jsonb_build_object('ok', false, 'message', 'Check the dates and the number of days.'); end;
      if v_start is null then return jsonb_build_object('ok', false, 'message', 'Choose the date.', 'field', 'start'); end if;
      if v_end is not null and v_end < v_start then return jsonb_build_object('ok', false, 'message', 'The last day must be on or after the first day.', 'field', 'end'); end if;
      if v_end is not null and v_end > v_start + 31 then return jsonb_build_object('ok', false, 'message', 'Keep the range to a month or less.', 'field', 'end'); end if;
      if v_promo < 0 or v_promo > 120 then return jsonb_build_object('ok', false, 'message', 'Start promoting between 0 and 120 days before.', 'field', 'promo'); end if;
      if not exists (select 1 from public.occasions where code = v_code and merged_into is null) then return jsonb_build_object('ok', false, 'message', 'Choose an occasion.'); end if;
      if exists (select 1 from public.occasion_dates where occasion_code = v_code and year = extract(year from v_start)::int and id is distinct from v_id) then
        return jsonb_build_object('ok', false, 'message', 'This occasion already has a date in ' || extract(year from v_start)::int || '. Change that one instead.', 'field', 'start');
      end if;
      if v_id is null then
        insert into public.occasion_dates (occasion_code, year, starts_on, ends_on, promo_days, source, note)
        values (v_code, extract(year from v_start)::int, v_start, v_end, v_promo, 'manual', v_note) returning id into v_id;
      else
        update public.occasion_dates set occasion_code = v_code, year = extract(year from v_start)::int, starts_on = v_start, ends_on = v_end,
          promo_days = v_promo, note = v_note, source = 'manual', updated_at = now() where id = v_id;
        if not found then return jsonb_build_object('ok', false, 'message', 'That date no longer exists. Refresh and try again.'); end if;
      end if;
      update public.occasions set has_dates = true where code = v_code and not has_dates;
      return jsonb_build_object('ok', true, 'id', v_id);
    end $b$
  $f$;

  execute $f$
    create or replace function public.occasion_date_delete(p_id uuid)
    returns jsonb language plpgsql security definer set search_path = public as $b$
    begin
      if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change occasion dates.'); end if;
      delete from public.occasion_dates where id = p_id;
      return jsonb_build_object('ok', true);
    end $b$
  $f$;

  revoke all on function public.occasion_admin(), public.occasion_save(jsonb), public.occasion_archive(text, boolean), public.occasion_move(text, int),
    public.occasion_merge(text, text), public.occasion_date_save(jsonb), public.occasion_date_delete(uuid) from public, anon;
  grant execute on function public.occasion_admin(), public.occasion_save(jsonb), public.occasion_archive(text, boolean), public.occasion_move(text, int),
    public.occasion_merge(text, text), public.occasion_date_save(jsonb), public.occasion_date_delete(uuid) to authenticated;

  -- 8. Checks: no order line changed, and the dates are in place
  select sum(hashtext(coalesce(occasion, '∅'))), sum(hashtext(coalesce(occasion_code, '∅'))) into v_text_after, v_codes_after from public.order_items;
  if (select count(*) from public.order_items) <> v_items then raise exception 'Order line count changed'; end if;
  if v_text_after is distinct from v_text_before then raise exception 'Occasion text on orders would change'; end if;
  if v_codes_after is distinct from v_codes_before then raise exception 'Occasion codes on orders would change'; end if;
  if (select count(*) from public.occasion_dates where source = 'rule') < 20 then raise exception 'Expected 20 starting dates'; end if;
  if (select count(*) from public.occasion_dates where occasion_code = 'mothers_day' and starts_on in ('2025-05-11', '2026-05-10')) <> 2 then raise exception 'Mother''s Day dates wrong'; end if;
  if (select count(*) from public.occasion_dates where occasion_code = 'fathers_day' and starts_on in ('2025-09-07', '2026-09-06')) <> 2 then raise exception 'Father''s Day dates wrong'; end if;
  raise notice 'Occasion dates installed. % order lines unchanged.', v_items;
end $occ2$;
