-- Corner Café cake app: switch-based permissions, first module (Customers).
-- One block: it either all goes in, or nothing changes. It checks itself before finishing:
-- if anyone's Customers access would be different from today, it stops and changes nothing.
-- Adds: permissions (the list of switches), level_permissions, staff_permission_overrides (personal exceptions),
-- has_perm (the check), admin_perms, admin_level_perm, admin_staff_perm (the permissions screen),
-- audit of every change, a guard that keeps at least one person able to manage users and permissions,
-- and three editable templates: Supervisor, Restaurant Manager, Group Management.
-- Customers functions and read rules now check the switches. Orders, Kitchen and Management still follow the old ticks.
-- Rollback: permissions_v1_rollback.sql
do $wrap$
declare u record; res jsonb := '[]'::jsonb; mism jsonb := '[]'::jsonb; c record; o boolean; nw boolean; r jsonb; adm uuid; lv uuid;
begin
execute $X$create table if not exists public.permissions (
  key text primary key,
  module text not null check (module in ('customers','orders','kitchen','management')),
  label text not null,
  help text,
  risky boolean not null default false,
  live boolean not null default false,   -- true once that part of the app checks this switch
  sort int not null default 0
)$X$;
execute $X$create table if not exists public.level_permissions (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.access_levels(id) on delete cascade,
  perm_key text not null references public.permissions(key),
  unique (level_id, perm_key)
)$X$;
execute $X$create table if not exists public.staff_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.staff_profiles(user_id) on delete cascade,
  perm_key text not null references public.permissions(key),
  allow boolean not null,
  reason text not null,
  set_by uuid,
  set_by_label text,
  set_at timestamptz not null default now(),
  unique (user_id, perm_key)
)$X$;
execute $X$alter table public.permissions enable row level security$X$;
execute $X$alter table public.level_permissions enable row level security$X$;
execute $X$alter table public.staff_permission_overrides enable row level security$X$;
execute $X$revoke all on public.permissions, public.level_permissions, public.staff_permission_overrides from anon, authenticated$X$;
execute $X$insert into public.permissions (key, module, label, help, risky, live, sort) values
 ('cust.view',     'customers', 'View customer records', 'Search, list and open customer profiles', false, true, 10),
 ('cust.create',   'customers', 'Create customer', null, false, true, 11),
 ('cust.edit',     'customers', 'Edit customer details', 'Name, mobile, email, birthday, preferences', false, true, 12),
 ('cust.consent',  'customers', 'See and record marketing permission', null, false, true, 13),
 ('cust.history',  'customers', 'View purchase history', 'Orders from the app and the old sheets', false, true, 14),
 ('cust.comms',    'customers', 'View change and contact history', 'Who changed what on a customer, earlier wording of notes', false, true, 15),
 ('cust.followup', 'customers', 'Record notes and follow-ups', 'Notes, enquiries, feedback, follow-ups, What happened?', false, true, 16),
 ('cust.oversee',  'customers', 'Oversee the team''s follow-ups', 'See everyone''s follow-ups, change or hide anyone''s notes', false, true, 17),
 ('cust.merge',    'customers', 'Merge duplicate customers', null, true, true, 18),
 ('cust.export',   'customers', 'Export customer data and save customer groups', null, true, true, 19),
 ('ord.view',      'orders', 'View orders', null, false, false, 30),
 ('ord.create',    'orders', 'Create orders', null, false, false, 31),
 ('ord.edit',      'orders', 'Change orders', null, false, false, 32),
 ('ord.cancel',    'orders', 'Cancel orders', null, false, false, 33),
 ('ord.restore',   'orders', 'Restore eligible orders', null, false, false, 34),
 ('ord.status',    'orders', 'Update order progress', 'Confirm, hand over, mark collected', false, false, 35),
 ('ord.notes_view','orders', 'View internal notes', null, false, false, 36),
 ('ord.notes_add', 'orders', 'Add internal notes', null, false, false, 37),
 ('ord.prices',    'orders', 'View order prices', null, false, false, 38),
 ('ord.comms',     'orders', 'Send approved customer emails', null, false, false, 39),
 ('ord.payments',  'orders', 'Record payments', null, false, false, 40),
 ('ord.delete',    'orders', 'Delete orders', null, true, false, 41),
 ('kit.view',      'kitchen', 'View confirmed production orders', null, false, false, 50),
 ('kit.calendar',  'kitchen', 'View production calendar', null, false, false, 51),
 ('kit.instructions','kitchen', 'View preparation instructions', null, false, false, 52),
 ('kit.images',    'kitchen', 'View full-size reference images', null, false, false, 53),
 ('kit.status',    'kitchen', 'Update production status', null, false, false, 54),
 ('kit.issue',     'kitchen', 'Flag production issues', null, false, false, 55),
 ('kit.complete',  'kitchen', 'Mark production complete', null, false, false, 56),
 ('kit.print',     'kitchen', 'Print kitchen production briefs', null, false, false, 57),
 ('kit.pending',   'kitchen', 'See orders not yet confirmed', null, false, false, 58),
 ('mgmt.analytics','management', 'View analytics', 'The Dashboard', false, false, 70),
 ('mgmt.reports',  'management', 'Export reports', null, true, false, 71),
 ('staff.users',   'management', 'Manage users', 'Add and remove staff', true, false, 72),
 ('staff.roles',   'management', 'Assign access levels', null, true, false, 73),
 ('staff.permissions','management', 'Configure staff permissions', 'This screen', true, true, 74),
 ('mgmt.notifications','management', 'Configure notifications', null, false, false, 75),
 ('mgmt.recipients','management', 'Manage email recipients', null, true, false, 76),
 ('mgmt.audit',    'management', 'View audit logs', null, false, false, 77),
 ('mgmt.settings', 'management', 'Manage restaurant settings', null, true, false, 78)
on conflict (key) do update set module = excluded.module, label = excluded.label, help = excluded.help, risky = excluded.risky, sort = excluded.sort,
  live = public.permissions.live or excluded.live$X$;
execute $X$create or replace function public._perm_defaults(p_grants text[]) returns text[]
language sql stable set search_path = public as $$
  select case when 'admin' = any(p_grants) then (select array_agg(key) from public.permissions) else array(select distinct k from unnest(
    case when 'manager' = any(p_grants) then array['cust.view','cust.create','cust.edit','cust.consent','cust.history','cust.comms','cust.followup','cust.oversee','cust.merge','cust.export',
      'ord.view','ord.create','ord.edit','ord.cancel','ord.status','ord.notes_view','ord.notes_add','ord.prices','ord.comms','ord.payments','ord.restore',
      'kit.view','kit.calendar','kit.instructions','kit.images','kit.status','kit.issue','kit.complete','kit.print','kit.pending'] else '{}'::text[] end ||
    case when 'front_of_house' = any(p_grants) then array['cust.view','cust.create','cust.edit','cust.consent','cust.history','cust.followup',
      'ord.view','ord.create','ord.edit','ord.cancel','ord.status','ord.notes_view','ord.notes_add','ord.prices','ord.comms','ord.payments',
      'kit.view','kit.calendar','kit.instructions','kit.images','kit.print'] else '{}'::text[] end ||
    case when 'finance' = any(p_grants) then array['cust.view','cust.history','ord.view','ord.notes_view','ord.prices','ord.payments','mgmt.reports'] else '{}'::text[] end ||
    case when 'marketing' = any(p_grants) then array['cust.view','cust.consent','cust.history','cust.followup','cust.export','ord.view','ord.notes_view','ord.prices','mgmt.analytics','mgmt.reports'] else '{}'::text[] end ||
    case when 'kitchen' = any(p_grants) then array['kit.view','kit.calendar','kit.instructions','kit.images','kit.status','kit.issue','kit.complete','kit.print'] else '{}'::text[] end
  ) k where k in (select key from public.permissions)) end
$$$X$;
execute $X$insert into public.level_permissions (level_id, perm_key)
select l.id, k from public.access_levels l, unnest(public._perm_defaults(l.grants)) k
where not exists (select 1 from public.level_permissions lp where lp.level_id = l.id)
on conflict do nothing$X$;
execute $X$create or replace function public._level_perm_sync() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.level_permissions (level_id, perm_key) select new.id, k from unnest(public._perm_defaults(new.grants)) k on conflict do nothing;
  elsif new.grants is distinct from old.grants then
    delete from public.level_permissions lp using public.permissions p where lp.level_id = new.id and p.key = lp.perm_key and not p.live;
    insert into public.level_permissions (level_id, perm_key) select new.id, k from unnest(public._perm_defaults(new.grants)) k join public.permissions p on p.key = k and not p.live on conflict do nothing;
  end if;
  return new;
end $$$X$;
execute $X$drop trigger if exists t_level_perm_sync on public.access_levels$X$;
execute $X$create trigger t_level_perm_sync after insert or update of grants on public.access_levels for each row execute function public._level_perm_sync()$X$;
execute $X$drop trigger if exists t_audit_levels on public.access_levels$X$;
execute $X$create trigger t_audit_levels after insert or update or delete on public.access_levels for each row execute function public.write_audit()$X$;
execute $X$drop trigger if exists t_audit_level_perms on public.level_permissions$X$;
execute $X$create trigger t_audit_level_perms after insert or delete on public.level_permissions for each row execute function public.write_audit()$X$;
execute $X$drop trigger if exists t_audit_staff_perms on public.staff_permission_overrides$X$;
execute $X$create trigger t_audit_staff_perms after insert or update or delete on public.staff_permission_overrides for each row execute function public.write_audit()$X$;
execute $X$create or replace function public._perm_of(p_user uuid, p_key text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select coalesce(o.allow, exists (select 1 from public.level_permissions lp where lp.level_id = s.level_id and lp.perm_key = p_key))
    from public.staff_profiles s
    left join public.staff_permission_overrides o on o.user_id = s.user_id and o.perm_key = p_key
    where s.user_id = p_user and s.active and s.removed_at is null), false)
$$$X$;
execute $X$create or replace function public.has_perm(p_key text) returns boolean
language sql stable security definer set search_path = public as $$ select public._perm_of(auth.uid(), p_key) $$$X$;
execute $X$revoke all on function public._perm_of(uuid, text) from public, anon, authenticated$X$;
execute $X$grant execute on function public.has_perm(text) to authenticated$X$;
execute $X$create or replace function public._perm_guard_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_profiles s where s.active and s.removed_at is null
    and public._perm_of(s.user_id, 'staff.users') and public._perm_of(s.user_id, 'staff.permissions'))
$$$X$;
execute $X$create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((
    select jsonb_build_object('ok', true, 'role', s.role, 'level_id', s.level_id,
      'level_name', coalesce(l.name, initcap(replace(s.role::text, '_', ' '))),
      'grants', coalesce(to_jsonb(l.grants), to_jsonb(array[s.role])),
      'perms', coalesce((select jsonb_agg(p.key order by p.sort) from public.permissions p where public._perm_of(s.user_id, p.key)), '[]'::jsonb),
      'live', coalesce((select jsonb_agg(p.module) from (select distinct module from public.permissions where live and module <> 'management') p), '[]'::jsonb))
    from public.staff_profiles s left join public.access_levels l on l.id = s.level_id
    where s.user_id = auth.uid() and s.active and s.removed_at is null), jsonb_build_object('ok', false))
$$$X$;
execute $X$create or replace function public.admin_perms() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('staff.permissions') then return public._err('forbidden', 'Your login cannot see staff permissions.'); end if;
  return jsonb_build_object('ok', true,
    'catalogue', (select jsonb_agg(jsonb_build_object('key', key, 'module', module, 'label', label, 'help', help, 'risky', risky, 'live', live) order by sort) from public.permissions),
    'levels', (select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'built_in', l.built_in, 'grants', l.grants,
        'people', (select count(*) from public.staff_profiles s where s.level_id = l.id and s.removed_at is null),
        'perms', coalesce((select jsonb_agg(lp.perm_key) from public.level_permissions lp where lp.level_id = l.id), '[]'::jsonb)) order by l.sort, l.name) from public.access_levels l),
    'staff', (select jsonb_agg(jsonb_build_object('user_id', s.user_id, 'name', s.full_name, 'level_id', s.level_id, 'level', l.name, 'active', s.active,
        'location', (select name from public.locations where id = s.location_id), 'me', s.user_id = auth.uid(),
        'last_sign_in', (select u.last_sign_in_at from auth.users u where u.id = s.user_id),
        'overrides', coalesce((select jsonb_agg(jsonb_build_object('key', o.perm_key, 'allow', o.allow, 'reason', o.reason, 'by', o.set_by_label, 'at', o.set_at)) from public.staff_permission_overrides o where o.user_id = s.user_id), '[]'::jsonb),
        'effective', coalesce((select jsonb_agg(p.key) from public.permissions p where public._perm_of(s.user_id, p.key)), '[]'::jsonb)) order by s.full_name)
      from public.staff_profiles s left join public.access_levels l on l.id = s.level_id where s.removed_at is null));
end $$$X$;
execute $X$create or replace function public.admin_level_perm(p_level uuid, p_key text, p_on boolean, p_confirm boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.permissions; v_l public.access_levels;
begin
  if not public.has_perm('staff.permissions') then return public._err('forbidden', 'Your login cannot change staff permissions.'); end if;
  select * into v_p from public.permissions where key = p_key;
  select * into v_l from public.access_levels where id = p_level;
  if v_p.key is null or v_l.id is null then return public._err('not_found', 'That level or switch no longer exists. Refresh and try again.'); end if;
  if not v_p.live then return public._err('not_live', 'This part of the app still follows the level''s ticks. It can be switched here once it moves over.'); end if;
  if v_p.risky and p_on and not coalesce(p_confirm, false) then return public._err('confirm', 'Confirm this change first.'); end if;
  begin
    if p_on then insert into public.level_permissions (level_id, perm_key) values (p_level, p_key) on conflict do nothing;
    else delete from public.level_permissions where level_id = p_level and perm_key = p_key; end if;
    if not public._perm_guard_ok() then raise exception using errcode = 'P0001', message = 'perm_guard'; end if;
  exception when sqlstate 'P0001' then
    if sqlerrm = 'perm_guard' then return public._err('last_admin', 'Not changed: at least one person must keep Manage users and Configure staff permissions.'); end if; raise;
  end;
  return jsonb_build_object('ok', true);
end $$$X$;
execute $X$create or replace function public.admin_staff_perm(p_user uuid, p_key text, p_allow boolean, p_reason text, p_confirm boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_p public.permissions; v_s public.staff_profiles; v_label text;
begin
  if not public.has_perm('staff.permissions') then return public._err('forbidden', 'Your login cannot change staff permissions.'); end if;
  select * into v_p from public.permissions where key = p_key;
  select * into v_s from public.staff_profiles where user_id = p_user and removed_at is null;
  if v_p.key is null or v_s.user_id is null then return public._err('not_found', 'That person or switch no longer exists. Refresh and try again.'); end if;
  if not v_p.live then return public._err('not_live', 'This part of the app still follows the level''s ticks. It can be switched here once it moves over.'); end if;
  if p_allow is not null and coalesce(btrim(p_reason), '') = '' then return public._err('reason', 'Add a short reason.'); end if;
  if v_p.risky and p_allow is true and not coalesce(p_confirm, false) then return public._err('confirm', 'Confirm this change first.'); end if;
  select full_name into v_label from public.staff_profiles where user_id = auth.uid();
  begin
    if p_allow is null then delete from public.staff_permission_overrides where user_id = p_user and perm_key = p_key;
    else
      insert into public.staff_permission_overrides (user_id, perm_key, allow, reason, set_by, set_by_label) values (p_user, p_key, p_allow, btrim(p_reason), auth.uid(), v_label)
      on conflict (user_id, perm_key) do update set allow = excluded.allow, reason = excluded.reason, set_by = excluded.set_by, set_by_label = excluded.set_by_label, set_at = now();
    end if;
    if not public._perm_guard_ok() then raise exception using errcode = 'P0001', message = 'perm_guard'; end if;
  exception when sqlstate 'P0001' then
    if sqlerrm = 'perm_guard' then return public._err('last_admin', 'Not changed: at least one person must keep Manage users and Configure staff permissions.'); end if; raise;
  end;
  return jsonb_build_object('ok', true);
end $$$X$;
execute $X$revoke all on function public.admin_perms(), public.admin_level_perm(uuid,text,boolean,boolean), public.admin_staff_perm(uuid,text,boolean,text,boolean) from public, anon$X$;
execute $X$grant execute on function public.admin_perms(), public.admin_level_perm(uuid,text,boolean,boolean), public.admin_staff_perm(uuid,text,boolean,text,boolean) to authenticated$X$;
execute $X$insert into public.access_levels (name, grants, built_in, sort)
select x.n, x.g, false, x.s from (values ('Supervisor', array['front_of_house']::text[], 4), ('Restaurant Manager', array['manager']::text[], 5), ('Group Management', array['manager','finance','marketing']::text[], 6)) x(n, g, s)
where not exists (select 1 from public.access_levels l where lower(l.name) = lower(x.n))$X$;
execute $X$insert into public.level_permissions (level_id, perm_key) select id, 'cust.oversee' from public.access_levels where name = 'Supervisor' on conflict do nothing$X$;
execute $X$do $migrate$
declare r record; d text; n int := 0;
begin
  for r in select * from (values
    ('crm_home(boolean)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('crm_home(boolean)', $a$public.has_role('manager','marketing')$a$, $b$(public.has_perm('cust.oversee') or public.has_perm('mgmt.analytics'))$b$),
    ('crm_home(boolean)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('crm_record_contact(uuid,text,text,text,text,text,uuid,integer,uuid,date,text,uuid)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('customer_duplicates()', $a$has_role('manager')$a$, $b$has_perm('cust.merge')$b$),
    ('_merge_check(uuid,uuid)', $a$has_role('manager')$a$, $b$has_perm('cust.merge')$b$),
    ('customer_merge_undo(uuid,text)', $a$has_role('manager')$a$, $b$has_perm('cust.merge')$b$),
    ('customer_pair_dismiss(uuid,uuid,text)', $a$has_role('manager')$a$, $b$has_perm('cust.merge')$b$),
    ('customer_pair_undismiss(uuid)', $a$has_role('manager')$a$, $b$has_perm('cust.merge')$b$),
    ('customer_export(jsonb,text,uuid,boolean)', $a$has_role('manager','marketing')$a$, $b$has_perm('cust.export')$b$),
    ('customer_export_preview(jsonb,text)', $a$has_role('manager','marketing')$a$, $b$has_perm('cust.export')$b$),
    ('customer_exports_list(integer)', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.view')$b$),
    ('customer_exports_list(integer)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('customer_filter(jsonb,integer)', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.view')$b$),
    ('customer_filter_options()', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.view')$b$),
    ('customer_group_archive(uuid,integer)', $a$has_role('manager','marketing')$a$, $b$has_perm('cust.export')$b$),
    ('customer_group_save(uuid,text,jsonb,integer)', $a$has_role('manager','marketing')$a$, $b$has_perm('cust.export')$b$),
    ('customer_groups_list()', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.view')$b$),
    ('customer_groups_list()', $a$has_role('manager','marketing')$a$, $b$has_perm('cust.export')$b$),
    ('customer_history(uuid)', $a$has_role('manager')$a$, $b$has_perm('cust.comms')$b$),
    ('customer_note_add(uuid,text,text,uuid,text,text,uuid)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('customer_note_edit(uuid,integer,text,text)', $a$has_role('front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('customer_note_edit(uuid,integer,text,text)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('customer_note_hide(uuid,text)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('customer_note_history(uuid)', $a$has_role('manager')$a$, $b$has_perm('cust.comms')$b$),
    ('customer_report_logged(uuid,text[])', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.view')$b$),
    ('customer_sheet_orders(uuid)', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.history')$b$),
    ('customer_task_add(uuid,text,date,uuid,uuid,uuid,uuid)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('customer_task_update(uuid,integer,text,date,uuid,text)', $a$has_role('front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('customer_task_update(uuid,integer,text,date,uuid,text)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('customer_workspace(uuid)', $a$has_role('manager','front_of_house','marketing','finance')$a$, $b$has_perm('cust.view')$b$),
    ('customer_workspace(uuid)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('customer_workspace(uuid)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('my_followups(integer,boolean)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('my_followups(integer,boolean)', $a$has_role('manager')$a$, $b$has_perm('cust.oversee')$b$),
    ('order_followups(uuid)', $a$has_role('manager','front_of_house','marketing','finance')$a$, $b$has_perm('cust.view')$b$),
    ('staff_create_customer(jsonb,boolean)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('cust.create')$b$),
    ('staff_mark_reminded(uuid,date)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('staff_reminders_due()', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.followup')$b$),
    ('staff_search_customers(text)', $a$has_role('manager','front_of_house','finance','marketing')$a$, $b$has_perm('cust.view')$b$),
    ('staff_set_channel_consent(uuid,text[],boolean,text,text)', $a$has_role('manager','front_of_house','marketing')$a$, $b$has_perm('cust.consent')$b$),
    ('staff_update_customer(uuid,integer,jsonb,boolean)', $a$has_role('manager','front_of_house')$a$, $b$has_perm('cust.edit')$b$)
  ) t(sig, old, new) loop
    d := pg_get_functiondef(('public.' || r.sig)::regprocedure);
    if position(r.old in d) > 0 then
      d := replace(d, r.old, r.new); execute d; n := n + 1;
    elsif position(r.new in d) = 0 then
      raise exception 'Check not found in %: %. Nothing changed.', r.sig, r.old;
    end if;
  end loop;
  raise notice '% checks moved to switches', n;
end
$migrate$$X$;
execute $X$drop policy if exists read_customers on public.customers$X$;
execute $X$create policy read_customers on public.customers for select using (public.has_perm('cust.view'))$X$;
execute $X$drop policy if exists read_consents on public.customer_consents$X$;
execute $X$create policy read_consents on public.customer_consents for select using (public.has_perm('cust.consent'))$X$;
execute $X$drop policy if exists read_marketing_consents on public.marketing_consents$X$;
execute $X$create policy read_marketing_consents on public.marketing_consents for select using (public.has_perm('cust.consent'))$X$;
execute $X$drop policy if exists staff_read_reminders on public.customer_reminders$X$;
execute $X$create policy staff_read_reminders on public.customer_reminders for select using (public.has_perm('cust.followup'))$X$;
  -- Self-check: every active person keeps exactly the Customers access they had before. If not, nothing is changed.
  for u in select s.user_id, s.full_name from staff_profiles s where s.active and s.removed_at is null loop
    perform set_config('request.jwt.claims', json_build_object('sub', u.user_id, 'role', 'authenticated')::text, true);
    for c in select * from (values (array['manager','front_of_house','finance','marketing'],'cust.view'),(array['manager','front_of_house'],'cust.create'),(array['manager','front_of_house'],'cust.edit'),(array['manager','front_of_house','marketing'],'cust.consent'),(array['manager','front_of_house','finance','marketing'],'cust.history'),(array['manager'],'cust.comms'),(array['manager','front_of_house','marketing'],'cust.followup'),(array['manager'],'cust.oversee'),(array['manager'],'cust.merge'),(array['manager','marketing'],'cust.export')) x(roles, k) loop
      o := public.has_role(variadic c.roles::staff_role[]); nw := public.has_perm(c.k);
      if o is distinct from nw then mism := mism || jsonb_build_object('who', u.full_name, 'switch', c.k, 'before', o, 'after', nw); end if;
    end loop;
  end loop;
  perform set_config('request.jwt.claims', '', true);
  if jsonb_array_length(mism) > 0 then raise exception 'Nothing changed: access would differ for %', mism; end if;
  if not public._perm_guard_ok() then raise exception 'Nothing changed: no one would keep Manage users and Configure staff permissions.'; end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.prokind = 'f'
       and p.proname in ('crm_home','crm_record_contact','customer_duplicates','_merge_check','customer_merge_undo','customer_pair_dismiss','customer_pair_undismiss','customer_export','customer_export_preview','customer_exports_list','customer_filter','customer_filter_options','customer_group_archive','customer_group_save','customer_groups_list','customer_history','customer_note_add','customer_note_edit','customer_note_hide','customer_note_history','customer_report_logged','customer_sheet_orders','customer_task_add','customer_task_update','customer_workspace','my_followups','order_followups','staff_create_customer','staff_mark_reminded','staff_reminders_due','staff_search_customers','staff_set_channel_consent','staff_update_customer')
       and pg_get_functiondef(p.oid) like '%has_role(%') then raise exception 'Nothing changed: a Customers function still uses the old check.'; end if;
  raise notice 'Permissions installed. Everyone kept the same access.';
end $wrap$;
