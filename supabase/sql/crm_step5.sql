-- CRM step 5: customer report log, export and report log screen, role permissions read from the database rules, backup check.
-- Additive only. Nothing existing is changed.

-- Every printed customer report is recorded: who, when, which customer, which sections.
create table if not exists public.customer_report_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  by_user uuid not null,
  by_label text not null,
  customer_id uuid not null references public.customers(id),
  customer_no int,
  customer_name text,
  sections text[] not null
);
alter table public.customer_report_log enable row level security;
revoke all on public.customer_report_log from anon, authenticated;

-- Called just before a report is printed. The report is only printed if this succeeds.
create or replace function public.customer_report_logged(p_customer uuid, p_sections text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.customers;
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then
    return public._err('forbidden', 'Your login cannot print customer reports.');
  end if;
  select * into c from public.customers where id = p_customer;
  if c.id is null then return public._err('not_found', 'That customer was not found.'); end if;
  if c.merged_into is not null then return public._err('merged', 'That profile was merged into another. Open the main profile.'); end if;
  insert into public.customer_report_log (by_user, by_label, customer_id, customer_no, customer_name, sections)
  values (auth.uid(), public._me_label(), c.id, c.customer_no, c.full_name, coalesce(p_sections, '{}'));
  return jsonb_build_object('ok', true, 'by', public._me_label(), 'at', now());
end $$;

-- Contact list exports and printed reports, newest first. Managers see everyone's; others see their own.
create or replace function public.customer_exports_list(p_limit int default 200)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_all boolean := public.has_role('manager');
begin
  if not public.has_role('manager','front_of_house','finance','marketing') then
    return public._err('forbidden', 'Your login cannot see the export log.');
  end if;
  return jsonb_build_object('ok', true, 'all', v_all, 'rows', coalesce((
    select jsonb_agg(x order by (x->>'at') desc) from (
      select x from (
        select jsonb_build_object('kind', 'export', 'id', e.id, 'at', e.at, 'by', e.by_label, 'mine', e.by_user = auth.uid(),
                 'channel', e.channel, 'group', e.group_name, 'filter', e.filter, 'reconfirm', e.include_reconfirm,
                 'count', e.rows_exported, 'left_no', e.left_out_no_permission, 'left_re', e.left_out_reconfirm) x, e.at
          from public.customer_exports e where v_all or e.by_user = auth.uid()
        union all
        select jsonb_build_object('kind', 'report', 'id', r.id, 'at', r.at, 'by', r.by_label, 'mine', r.by_user = auth.uid(),
                 'customer_id', r.customer_id, 'customer_no', r.customer_no, 'customer', r.customer_name, 'sections', to_jsonb(r.sections)) x, r.at
          from public.customer_report_log r where v_all or r.by_user = auth.uid()
      ) u order by u.at desc limit greatest(1, least(coalesce(p_limit, 200), 1000))
    ) s), '[]'::jsonb));
end $$;

-- Roles named in every has_role(...) call of a piece of database code.
create or replace function public._role_sets(src text) returns text[]
language sql immutable set search_path = public as $$
  select coalesce(array_agg(array_to_string(array(
           select (regexp_matches(m[1], '''([a-z_]+)''', 'g'))[1]), ',')), '{}')
    from regexp_matches(coalesce(src, ''), 'has_role\(([^)]*)\)', 'g') m
$$;

-- What each role can do, worked out from the live database rules (function role checks and table policies).
-- Yes: every part. Partly: some parts only (for example, a manager-only action inside the same screen).
create or replace function public.role_permissions()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_roles text[] := array(select unnest(enum_range(null::staff_role))::text);
  r record; v_src text; v_sets text[]; v_all_staff boolean; v_none boolean; v_found boolean;
  v_union text[]; v_inter text[]; v_cells jsonb; v_out jsonb := '[]'; role text; v_set text[]; s text;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can see role permissions.'); end if;
  for r in select * from (values
    (1,'Orders','See orders','table','orders','SELECT'),
    (2,'Orders','Take a new order','function','staff_create_order',null),
    (3,'Orders','Confirm, decline, cancel, add a note','function','staff_order_action',null),
    (4,'Orders','Amend an order','function','staff_amend_order',null),
    (5,'Orders','Change collection or delivery','function','staff_set_fulfilment',null),
    (6,'Orders','See payments','table','payments','SELECT'),
    (7,'Orders','Record a payment','function','staff_record_payment',null),
    (8,'Orders','Print the kitchen brief','function','staff_print_brief',null),
    (9,'Orders','Dele'||'te or restore an order','function','admin_'||'dele'||'te_order',null),
    (10,'Kitchen','Kitchen board and stages','function','kitchen_set_stage',null),
    (11,'Kitchen','Calendar counts','function','calendar_counts',null),
    (12,'Customers','See customer profiles','table','customers','SELECT'),
    (13,'Customers','Search customers','function','staff_search_customers',null),
    (14,'Customers','Add a customer','function','staff_create_customer',null),
    (15,'Customers','Edit a customer','function','staff_update_customer',null),
    (16,'Customers','Customer change history','function','customer_history',null),
    (17,'Customers','Print a customer report','function','customer_report_logged',null),
    (18,'Customers','Read notes and follow-ups','function','customer_workspace',null),
    (19,'Customers','Add notes and follow-ups','function','customer_note_add',null),
    (20,'Customers','See marketing permission','table','marketing_consents','SELECT'),
    (21,'Customers','Record marketing permission','function','staff_set_channel_consent',null),
    (22,'Customers','Filter customers','function','customer_filter',null),
    (23,'Customers','Save groups','function','customer_group_save',null),
    (24,'Customers','Export a contact list','function','customer_export',null),
    (25,'Customers','See the export log','function','customer_exports_list',null),
    (26,'Customers','Review duplicates and merge','function','customer_duplicates',null),
    (27,'Reports','Dashboard','function','dashboard_register',null),
    (28,'Reports','Cake register review','function','register_review_list',null),
    (29,'Settings','Products and prices','table','products','ALL'),
    (30,'Settings','Notice and collection hours','table','locations','UPDATE'),
    (31,'Settings','Closed days','table','closed_dates','ALL'),
    (32,'Settings','Delivery areas','table','delivery_zones','ALL'),
    (33,'Settings','Role permissions (this table)','function','role_permissions',null),
    (34,'Settings','Team and access','function','admin_set_staff',null)
  ) t(n, area, label, kind, obj, cmd) order by n loop
    v_sets := '{}'; v_all_staff := false; v_none := false; v_found := false;
    if r.kind = 'function' then
      select string_agg(p.prosrc, ' '), count(*) > 0 into v_src, v_found
        from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace
       where ns.nspname = 'public' and p.proname = r.obj;
      if r.obj = 'customer_duplicates' then v_src := v_src || ' ' || (select prosrc from pg_proc where proname = '_merge_check' limit 1); end if;
    else
      select string_agg(coalesce(pol.qual, ''), ' '), count(*) > 0 into v_src, v_found
        from pg_policies pol where pol.schemaname = 'public' and pol.tablename = r.obj and pol.cmd in (r.cmd, 'ALL')
         and coalesce(pol.qual, '') <> 'false';
    end if;
    v_all_staff := coalesce(v_src, '') like '%is_staff()%' and coalesce(v_src, '') not like '%has_role%';
    v_sets := public._role_sets(v_src);
    v_union := '{}'; v_inter := null;
    foreach s in array v_sets loop
      v_set := string_to_array(s, ',');
      v_union := array(select distinct unnest(v_union || v_set));
      v_inter := case when v_inter is null then v_set else array(select unnest(v_inter) intersect select unnest(v_set)) end;
    end loop;
    v_cells := '{}';
    foreach role in array v_roles loop
      v_cells := v_cells || jsonb_build_object(role,
        case when not v_found then 'no'
             when role = 'admin' then 'yes'
             when v_all_staff then 'yes'
             when role = any(coalesce(v_inter, '{}')) or (r.kind = 'table' and role = any(v_union)) then 'yes'
             when role = any(v_union) then 'partly'
             else 'no' end);
    end loop;
    v_out := v_out || jsonb_build_array(jsonb_build_object('area', r.area, 'label', r.label,
               'source', case r.kind when 'function' then 'Database function ' || r.obj else 'Table rule on ' || r.obj end,
               'found', v_found, 'cells', v_cells));
  end loop;
  return jsonb_build_object('ok', true, 'roles', to_jsonb(v_roles), 'rows', v_out, 'checked_at', now(),
    'notes', jsonb_build_array(
      'Admin can do everything a manager can, plus team access, deleting orders and the Google Sheet backup.',
      'Google Sheet backup is controlled by the backup service, not the database: admin only.',
      'Partly means some actions on that screen are manager only.'));
end $$;

-- Backup check: Google Sheet backup state and the in-database copies.
create or replace function public.backup_check()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare b public.sheet_backup; v_total int; v_synced int; v_pending int;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can see the backup check.'); end if;
  select * into b from public.sheet_backup where id = 1;
  select count(*) into v_total from public.sheet_backup_rows_data();
  select count(*) into v_synced from public.sheet_backup_rows;
  select count(*) into v_pending from public.sheet_backup_rows_data() d
    left join public.sheet_backup_rows s on s.order_id = d.order_id where s.hash is distinct from d.hash;
  return jsonb_build_object('ok', true, 'checked_at', now(),
    'sheet', jsonb_build_object('linked', b.spreadsheet_id is not null, 'title', b.spreadsheet_title, 'tab', b.tab_name,
       'linked_at', b.linked_at, 'last_run_at', b.last_run_at, 'last_ok_at', b.last_ok_at, 'last_error', b.last_error),
    'orders', v_total, 'synced', v_synced, 'pending', v_pending,
    'snapshots', coalesce((select jsonb_agg(nspname order by nspname desc) from pg_namespace where nspname like 'backup\_%'), '[]'::jsonb));
end $$;

revoke all on function public.customer_report_logged(uuid, text[]), public.customer_exports_list(int),
  public.role_permissions(), public.backup_check() from public, anon;
grant execute on function public.customer_report_logged(uuid, text[]), public.customer_exports_list(int),
  public.role_permissions(), public.backup_check() to authenticated;
revoke all on function public._role_sets(text) from public, anon, authenticated;
