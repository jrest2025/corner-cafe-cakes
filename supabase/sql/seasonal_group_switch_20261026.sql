-- Seasonal items: a master On/Off switch for each heading (for example Festive treats), 26 October 2026.
-- Roneel: "this treat should be like the specials module ... so we can turn it on and off as required".
-- Off hides every item under the heading on the website and at the counter, and the database refuses them,
-- without touching each item's own switch, so turning the heading back On brings back exactly what was on.
alter table public.seasonal_groups add column if not exists active boolean not null default true;
do $mig$
declare d text; n text;
begin
  d := pg_get_functiondef('public.get_seasonal_menu(text)'::regprocedure);
  if position('g.active' in d) = 0 then
    n := replace(d, $a$    where gi.items is not null), '[]'::jsonb));$a$, $b$    where gi.items is not null and g.active), '[]'::jsonb));$b$);
    if n = d then raise exception 'get_seasonal_menu has changed'; end if; execute n;
  end if;
  d := pg_get_functiondef('public._treats_check(jsonb,date,boolean,boolean,uuid)'::regprocedure);
  if position('not g.active' in d) = 0 then
    n := replace(d, $a$    select * into g from public.seasonal_groups where id = it.group_id;$a$, $b$    select * into g from public.seasonal_groups where id = it.group_id;
    if not g.active then return public._err('treats', it.name || ' is not available right now. Please remove it.', 'treats'); end if;$b$);
    if n = d then raise exception '_treats_check has changed'; end if; execute n;
  end if;
  d := pg_get_functiondef('public.staff_seasonal_save_group(jsonb)'::regprocedure);
  if position('switched_on' in d) = 0 then
    n := replace(d, $a$  if length(v_name) < 2 or length(v_name) > 40 then$a$, $b$  if p ? 'active' and (p - 'id' - 'active') = '{}'::jsonb then  -- the heading's On or Off switch on its own
    select to_jsonb(x) into v_before from public.seasonal_groups x where id = v_id;
    if v_before is null then return public._err('group', 'That heading was not found.'); end if;
    select full_name into v_label from public.staff_profiles where user_id = auth.uid();
    update public.seasonal_groups set active = coalesce((p->>'active')::boolean, false), updated_at = now(), updated_by_label = v_label where id = v_id returning * into g;
    insert into public.seasonal_item_changes (group_id, by_user, by_label, action, before, after) values (g.id, auth.uid(), v_label, case when g.active then 'switched_on' else 'switched_off' end, v_before, to_jsonb(g));
    return jsonb_build_object('ok', true, 'group', to_jsonb(g));
  end if;
  if length(v_name) < 2 or length(v_name) > 40 then$b$);
    if n = d then raise exception 'staff_seasonal_save_group has changed'; end if; execute n;
  end if;
end $mig$;
