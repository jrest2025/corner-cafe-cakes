-- DRAFT: not applied to the database yet (the apply was cancelled on 15 October). Apply only after the owner says go.
-- Access levels an admin can add, change and delete, and removing staff from the team.
-- Additive only: a new table, two new nullable columns, new functions, and has_role() rewritten with the same signature.
--
-- How it works: every rule in the database and app already asks "does this person hold one of these roles?".
-- A level is a name plus the abilities ticked for it; each ability is one of those existing roles:
--   front_of_house = Counter work, kitchen = Kitchen board, marketing = Customers and marketing,
--   finance = Money and customer spend, manager = Run the café. Admin is its own built-in level with everything.
-- So every existing rule keeps working unchanged, and a new level gets exactly the abilities ticked.
-- staff_profiles.role keeps holding the main ability, for the few places that read it directly.

create table if not exists public.access_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grants public.staff_role[] not null,
  built_in boolean not null default false,
  sort integer not null default 100,
  created_at timestamptz not null default now(),
  created_by uuid
);
create unique index if not exists access_levels_name_key on public.access_levels (lower(name));
alter table public.access_levels enable row level security;
-- No direct table access; everything goes through the functions below.

insert into public.access_levels (name, grants, built_in, sort)
select x.n, x.g::public.staff_role[], true, x.s
from (values ('Admin', '{admin}', 1), ('Counter', '{front_of_house}', 2), ('Kitchen', '{kitchen}', 3)) x(n, g, s)
where not exists (select 1 from public.access_levels l where lower(l.name) = lower(x.n));

alter table public.staff_profiles add column if not exists level_id uuid references public.access_levels(id);
alter table public.staff_profiles add column if not exists removed_at timestamptz;
alter table public.staff_profiles add column if not exists removed_by uuid;

update public.staff_profiles s set level_id = l.id
from public.access_levels l
where s.level_id is null and l.built_in and l.grants = array[s.role]::public.staff_role[];

-- The main ability of a level, kept in staff_profiles.role
create or replace function public._level_primary(p_grants public.staff_role[])
 returns public.staff_role language sql immutable set search_path to 'public'
as $$
  select r from unnest(array['admin','manager','front_of_house','marketing','finance','kitchen']::public.staff_role[]) with ordinality t(r, o)
  where r = any(p_grants) order by o limit 1
$$;

-- Same signature as before; now reads the person's level when they have one
create or replace function public.has_role(variadic roles public.staff_role[])
 returns boolean language sql stable security definer set search_path to 'public'
as $$
  select coalesce((
    select case when s.level_id is null then s.role = 'admin' or s.role = any(roles)
                else exists (select 1 from public.access_levels l where l.id = s.level_id and ('admin' = any(l.grants) or l.grants && roles)) end
    from public.staff_profiles s where s.user_id = auth.uid() and s.active and s.removed_at is null), false)
$$;

-- What the signed-in person can do (the staff app uses this to show the right screens)
create or replace function public.my_access()
 returns jsonb language sql stable security definer set search_path to 'public'
as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'role', s.role, 'level_id', s.level_id, 'level_name', coalesce(l.name, initcap(replace(s.role::text, '_', ' '))),
                              'grants', coalesce(to_jsonb(l.grants), to_jsonb(array[s.role])))
    from public.staff_profiles s left join public.access_levels l on l.id = s.level_id
    where s.user_id = auth.uid() and s.active and s.removed_at is null), jsonb_build_object('ok', false))
$$;

-- Admin: the levels, with how many people use each
create or replace function public.admin_levels()
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can manage access levels.'); end if;
  return jsonb_build_object('ok', true, 'levels', coalesce((
    select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'grants', l.grants, 'built_in', l.built_in,
             'people', (select count(*) from public.staff_profiles s where s.level_id = l.id and s.removed_at is null)) order by l.sort, lower(l.name))
    from public.access_levels l), '[]'::jsonb));
end $$;

-- Admin: add a level (p_id null) or change a level the admin added. Built-in levels stay as they are.
create or replace function public.admin_level_save(p_id uuid, p_name text, p_grants text[])
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_name text := trim(coalesce(p_name, '')); v_grants public.staff_role[]; v_old jsonb; v_id uuid;
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can manage access levels.'); end if;
  if length(v_name) < 2 or length(v_name) > 40 then return public._err('name', 'Give the level a name of 2 to 40 characters.', 'name'); end if;
  if p_grants is null or cardinality(p_grants) = 0 then return public._err('grants', 'Tick at least one thing this level can do.', 'grants'); end if;
  if exists (select 1 from unnest(p_grants) g where g not in ('manager','front_of_house','kitchen','finance','marketing')) then
    return public._err('grants', 'Unknown ability.', 'grants'); end if;
  select array_agg(distinct g::public.staff_role) into v_grants from unnest(p_grants) g;
  if exists (select 1 from public.access_levels where lower(name) = lower(v_name) and id is distinct from p_id) then
    return public._err('name', 'A level with this name already exists.', 'name'); end if;
  if p_id is null then
    insert into public.access_levels (name, grants, created_by) values (v_name, v_grants, auth.uid()) returning id into v_id;
    insert into public.audit_log (actor_id, table_name, row_id, action, new_data) values (auth.uid(), 'access_levels', v_id::text, 'level_added', jsonb_build_object('name', v_name, 'grants', v_grants));
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;
  select to_jsonb(l) into v_old from public.access_levels l where id = p_id;
  if v_old is null then return public._err('missing', 'That level was not found.'); end if;
  if (v_old->>'built_in')::boolean then return public._err('built_in', 'Admin, Counter and Kitchen are built in and cannot be changed. Add a new level instead.'); end if;
  update public.access_levels set name = v_name, grants = v_grants where id = p_id;
  update public.staff_profiles set role = public._level_primary(v_grants) where level_id = p_id;
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data, new_data) values (auth.uid(), 'access_levels', p_id::text, 'level_changed', v_old, jsonb_build_object('name', v_name, 'grants', v_grants));
  return jsonb_build_object('ok', true, 'id', p_id);
end $$;

-- Admin: delete a level the admin added, only when nobody is on it
create or replace function public.admin_level_delete(p_id uuid)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare v_old jsonb; n integer;
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can manage access levels.'); end if;
  select to_jsonb(l) into v_old from public.access_levels l where id = p_id;
  if v_old is null then return public._err('missing', 'That level was not found.'); end if;
  if (v_old->>'built_in')::boolean then return public._err('built_in', 'Admin, Counter and Kitchen are built in and cannot be deleted.'); end if;
  select count(*) into n from public.staff_profiles where level_id = p_id and removed_at is null;
  if n > 0 then return public._err('in_use', n || case when n = 1 then ' person is' else ' people are' end || ' on this level. Move them to another level first.'); end if;
  update public.staff_profiles set level_id = null where level_id = p_id;  -- removed staff only
  delete from public.access_levels where id = p_id;
  insert into public.audit_log (actor_id, table_name, row_id, action, old_data) values (auth.uid(), 'access_levels', p_id::text, 'level_deleted', v_old);
  return jsonb_build_object('ok', true);
end $$;

-- Admin: the team, with each person's level (removed people left out)
create or replace function public.admin_list_team()
 returns jsonb language plpgsql stable security definer set search_path to 'public', 'auth'
as $$
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can manage the team.'); end if;
  return jsonb_build_object('ok', true, 'team', coalesce((
    select jsonb_agg(jsonb_build_object('user_id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
             'full_name', s.full_name, 'role', s.role, 'active', coalesce(s.active, false), 'level_id', s.level_id, 'level_name', l.name)
             order by s.active desc nulls last, u.created_at)
    from auth.users u left join public.staff_profiles s on s.user_id = u.id left join public.access_levels l on l.id = s.level_id
    where u.deleted_at is null and s.removed_at is null), '[]'::jsonb));
end $$;

-- Admin: give a person a name, a level and access
create or replace function public.admin_set_staff_level(p_user uuid, p_name text, p_level uuid, p_active boolean)
 returns jsonb language plpgsql security definer set search_path to 'public', 'auth'
as $$
declare v_grants public.staff_role[]; v_admin_level boolean;
begin
  if not public.has_role('admin') then return public._err('forbidden', 'Only an admin can manage the team.'); end if;
  select grants into v_grants from public.access_levels where id = p_level;
  if v_grants is null then return public._err('level', 'Choose an access level.', 'level'); end if;
  if not exists (select 1 from auth.users where id = p_user and deleted_at is null) then return public._err('user', 'That login was not found.'); end if;
  if length(trim(coalesce(p_name, ''))) < 2 then return public._err('name', 'Enter the staff member''s name.', 'name'); end if;
  v_admin_level := 'admin' = any(v_grants);
  if p_user = auth.uid() and (not v_admin_level or not p_active) then return public._err('self', 'You cannot remove your own admin access.'); end if;
  insert into public.staff_profiles (user_id, full_name, role, level_id, location_id, active)
  values (p_user, trim(p_name), public._level_primary(v_grants), p_level, (select id from public.locations where code = 'corner-cafe'), p_active)
  on conflict (user_id) do update set full_name = excluded.full_name, role = excluded.role, level_id = excluded.level_id, active = excluded.active, removed_at = null, removed_by = null;
  return jsonb_build_object('ok', true);
end $$;

-- Called by the staff-admin function after it has blocked the login: hide the person from the team.
-- Their profile is kept (not deleted) so names in order history stay readable.
create or replace function public._staff_mark_removed(p_user uuid, p_by uuid)
 returns void language sql security definer set search_path to 'public'
as $$
  update public.staff_profiles set active = false, removed_at = now(), removed_by = p_by where user_id = p_user;
  insert into public.audit_log (actor_id, table_name, row_id, action, new_data) values (p_by, 'staff_profiles', p_user::text, 'staff_removed', jsonb_build_object('removed_at', now()));
$$;
revoke all on function public._staff_mark_removed(uuid, uuid) from public, anon, authenticated;
revoke all on function public._level_primary(public.staff_role[]) from public, anon;

grant execute on function public.my_access() to authenticated;
grant execute on function public.admin_levels() to authenticated;
grant execute on function public.admin_level_save(uuid, text, text[]) to authenticated;
grant execute on function public.admin_level_delete(uuid) to authenticated;
grant execute on function public.admin_list_team() to authenticated;
grant execute on function public.admin_set_staff_level(uuid, text, uuid, boolean) to authenticated;
revoke execute on function public.my_access() from anon;
revoke execute on function public.admin_levels() from anon;
revoke execute on function public.admin_level_save(uuid, text, text[]) from anon;
revoke execute on function public.admin_level_delete(uuid) from anon;
revoke execute on function public.admin_list_team() from anon;
revoke execute on function public.admin_set_staff_level(uuid, text, uuid, boolean) from anon;
