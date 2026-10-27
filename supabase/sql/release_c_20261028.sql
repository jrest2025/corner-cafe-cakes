-- Release C (Settings audit, 28 Oct 2026): Settings history. PREVIEW: applied only when Roneel says "deploy".
-- 1. Change history also on promotion cards, calendar events and the cake catalogue (write_audit, as on the other
--    settings tables); rows keyed by a code get that code as their reference.
-- 2. settings_history(): who changed which setting, when, and each field's before and after. Customers and orders are
--    never included. System keys show as "changed", never their values.
-- 3. settings_restore(id): puts back the values a change replaced, only when nothing has changed them again since.
-- Nothing here changes an order, a customer, a payment or a setting value.
-- Rollback: supabase/sql/release_c_20261028_rollback.sql

create or replace function public.write_audit()
 returns trigger language plpgsql security definer set search_path to 'public' as $function$
begin
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'user_id',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'code',
                   (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'key'),
          lower(tg_op),
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $function$;

drop trigger if exists t_audit_promo_cards on public.promo_cards;
create trigger t_audit_promo_cards after insert or update or delete on public.promo_cards for each row execute function public.write_audit();
drop trigger if exists t_audit_calendar_events on public.calendar_events;
create trigger t_audit_calendar_events after insert or update or delete on public.calendar_events for each row execute function public.write_audit();
drop trigger if exists t_audit_catalogue_items on public.catalogue_items;
create trigger t_audit_catalogue_items after insert or update or delete on public.catalogue_items for each row execute function public.write_audit();
drop trigger if exists t_audit_catalogue_item_options on public.catalogue_item_options;
create trigger t_audit_catalogue_item_options after insert or update or delete on public.catalogue_item_options for each row execute function public.write_audit();

-- What each settings table is called on screen, and whether a change to it can be put back from the history
create or replace function public._settings_area(p_table text)
 returns table (area text, restorable boolean) language sql immutable as $f$
  select x.a, x.r from (values
    ('locations', 'Ordering and hours', true), ('closed_dates', 'Closed days', false), ('delivery_zones', 'Delivery areas', true),
    ('products', 'Cakes', true), ('product_sizes', 'Cake sizes and prices', true), ('product_variants', 'Cake flavours', true),
    ('occasions', 'Occasions', true), ('occasion_dates', 'Occasion dates', true), ('calendar_events', 'Events and public holidays', true),
    ('promo_cards', 'Email offer cards', true), ('catalogue_items', 'Cake catalogue', true), ('catalogue_item_options', 'Cake catalogue options', true),
    ('app_config', 'System settings', false), ('access_levels', 'Access levels', false), ('level_permissions', 'Access levels', false),
    ('staff_permission_overrides', 'Personal permissions', false), ('staff_profiles', 'Team', false)
  ) x(t, a, r) where x.t = p_table
$f$;

-- One line naming the thing that changed
create or replace function public._settings_item(p_table text, d jsonb)
 returns text language sql stable security definer set search_path to 'public' as $f$
  select case p_table
    when 'locations' then d->>'name'
    when 'closed_dates' then to_char((d->>'closed_on')::date, 'FMDy FMDD FMMon YYYY')
    when 'delivery_zones' then d->>'name'
    when 'products' then d->>'name'
    when 'product_sizes' then coalesce((select p.name from public.products p where p.id::text = d->>'product_id'), 'Cake') || ', ' || (d->>'size_inch') || ' inch'
    when 'product_variants' then coalesce((select p.name from public.products p where p.id::text = d->>'product_id'), 'Cake') || ': ' || (d->>'name')
    when 'occasions' then d->>'label'
    when 'occasion_dates' then coalesce((select o.label from public.occasions o where o.code = d->>'occasion_code'), d->>'occasion_code') || ' ' || (d->>'year')
    when 'calendar_events' then d->>'name'
    when 'promo_cards' then d->>'title'
    when 'catalogue_items' then d->>'name'
    when 'catalogue_item_options' then d->>'label'
    when 'app_config' then d->>'key'
    when 'access_levels' then d->>'name'
    when 'level_permissions' then coalesce((select a.name from public.access_levels a where a.id::text = d->>'level_id'), 'Level') || ': ' || coalesce((select pm.label from public.permissions pm where pm.key = d->>'perm_key'), d->>'perm_key')
    when 'staff_permission_overrides' then coalesce((select s.full_name from public.staff_profiles s where s.user_id::text = d->>'user_id'), 'Staff') || ': ' || coalesce((select pm.label from public.permissions pm where pm.key = d->>'perm_key'), d->>'perm_key')
    when 'staff_profiles' then d->>'full_name'
  end
$f$;

create or replace function public.settings_history(p_area text default null, p_before bigint default null, p_limit int default 50)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare r jsonb; v_more boolean;
begin
  if not (public.has_perm('mgmt.settings') or public.has_perm('mgmt.audit')) then
    return public._err('forbidden', 'Only managers can see the settings history.');
  end if;
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 200);
  with rows as (
    select l.*, a.area, a.restorable
    from public.audit_log l cross join lateral public._settings_area(l.table_name) a
    where (p_area is null or a.area = p_area) and (p_before is null or l.id < p_before)
    order by l.id desc limit p_limit + 1)
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', x.id, 'at', x.at, 'area', x.area,
      'who', case when x.actor_id is null then 'System' else coalesce((select s.full_name from public.staff_profiles s where s.user_id = x.actor_id), 'Former staff member') end,
      'action', x.action,
      'item', public._settings_item(x.table_name, coalesce(x.new_data, x.old_data)),
      'changes', case when x.action = 'update' and x.old_data is not null and x.new_data is not null then (
          select coalesce(jsonb_agg(jsonb_build_object('field', k,
              'before', case when x.table_name = 'app_config' and coalesce(x.new_data->>'key', '') ~ '_key$' then to_jsonb('(hidden)'::text) else x.old_data->k end,
              'after',  case when x.table_name = 'app_config' and coalesce(x.new_data->>'key', '') ~ '_key$' then to_jsonb('(hidden)'::text) else x.new_data->k end) order by k), '[]')
          from jsonb_object_keys(x.new_data) k
          where k not in ('updated_at', 'created_at', 'version', 'updated_by', 'id') and (x.old_data->k) is distinct from (x.new_data->k))
        else '[]'::jsonb end,
      'can_restore', x.restorable and x.action = 'update' and x.old_data is not null) order by x.id desc), '[]'),
         (select count(*) from rows) > p_limit
    into r, v_more
  from (select * from rows order by id desc limit p_limit) x;
  return jsonb_build_object('ok', true, 'entries', r, 'more', coalesce(v_more, false),
    'areas', (select jsonb_agg(distinct a.area) from public.audit_log l cross join lateral public._settings_area(l.table_name) a));
end $function$;

create or replace function public.settings_restore(p_id bigint)
 returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare l public.audit_log; a record; cur jsonb; k text; cols text[] := '{}'; v_key text; v_where text;
begin
  if not public.has_perm('mgmt.settings') then return public._err('forbidden', 'Only managers can put a setting back.'); end if;
  select * into l from public.audit_log where id = p_id;
  if not found then return public._err('not_found', 'That change is not in the history.'); end if;
  select * into a from public._settings_area(l.table_name);
  if a is null or not a.restorable or l.action <> 'update' or l.old_data is null or l.new_data is null then
    return public._err('not_restorable', 'This change cannot be put back from here. Change it in its own screen.');
  end if;
  v_key := case when l.new_data ? 'id' then 'id' else 'code' end;
  v_where := format('%I::text = %L', v_key, l.new_data->>v_key);
  execute format('select to_jsonb(t) from public.%I t where %s', l.table_name, v_where) into cur;
  if cur is null then return public._err('gone', 'That item no longer exists.'); end if;
  for k in select jsonb_object_keys(l.new_data) loop
    if k in ('updated_at', 'created_at', 'version', 'updated_by', 'id') then continue; end if;
    if (l.old_data->k) is distinct from (l.new_data->k) then
      if (cur->k) is distinct from (l.new_data->k) then
        return public._err('changed_since', 'This was changed again later. Put back the later change first.');
      end if;
      cols := cols || k;
    end if;
  end loop;
  if cardinality(cols) = 0 then return public._err('nothing', 'Nothing to put back.'); end if;
  execute format('update public.%I t set (%s) = (select %s from jsonb_populate_record(null::public.%I, $1) r) where %s',
    l.table_name,
    (select string_agg(format('%I', c), ', ') from unnest(cols) c),
    (select string_agg(format('r.%I', c), ', ') from unnest(cols) c),
    l.table_name, v_where) using l.old_data;
  return jsonb_build_object('ok', true, 'restored', to_jsonb(cols));
end $function$;

revoke all on function public.settings_history(text, bigint, int) from public, anon;
revoke all on function public.settings_restore(bigint) from public, anon;
grant execute on function public.settings_history(text, bigint, int) to authenticated;
grant execute on function public.settings_restore(bigint) to authenticated;
revoke all on function public._settings_item(text, jsonb) from public, anon, authenticated;
