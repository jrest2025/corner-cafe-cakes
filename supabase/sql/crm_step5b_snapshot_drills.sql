-- CRM step 5b: full in-database copy of every public table (backup_20261013), restore test record, backup check with snapshots and tests.
-- Applied as crm_step5_full_snapshot_and_restore_drills. Restore steps: docs/restore-guide.md.
-- The schema cannot be reached from the app or the website (no grants to anon or authenticated).

create schema if not exists backup_20261013;
revoke all on schema backup_20261013 from public, anon, authenticated;
create table if not exists backup_20261013.manifest (table_name text primary key, row_count bigint not null, copied_at timestamptz not null default now());
do $$
declare t record; n bigint;
begin
  for t in select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
            where s.nspname = 'public' and c.relkind in ('r','p') order by 1 loop
    if to_regclass('backup_20261013.' || quote_ident(t.relname)) is null then
      execute format('create table backup_20261013.%I as table public.%I', t.relname, t.relname);
      execute format('select count(*) from backup_20261013.%I', t.relname) into n;
      insert into backup_20261013.manifest (table_name, row_count) values (t.relname, n);
    end if;
  end loop;
end $$;

create table if not exists public.restore_drills (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  snapshot text not null,
  method text not null,
  result text not null,
  passed boolean not null
);
alter table public.restore_drills enable row level security;
revoke all on public.restore_drills from anon, authenticated;

-- Drill records inserted after each test (see docs/restore-guide.md for the test scripts).

create or replace function public.backup_check()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare b public.sheet_backup; v_total int; v_synced int; v_pending int; v_snaps jsonb := '[]'; s text; v_tables int; v_rows bigint; v_at timestamptz;
begin
  if not public.has_role('manager') then return public._err('forbidden', 'Only a manager can see the backup check.'); end if;
  select * into b from public.sheet_backup where id = 1;
  select count(*) into v_total from public.sheet_backup_rows_data();
  select count(*) into v_synced from public.sheet_backup_rows;
  select count(*) into v_pending from public.sheet_backup_rows_data() d
    left join public.sheet_backup_rows r on r.order_id = d.order_id where r.hash is distinct from d.hash;
  for s in select nspname from pg_namespace where nspname like 'backup\_%' order by nspname desc loop
    v_tables := null; v_rows := null; v_at := null;
    if to_regclass(s || '.manifest') is not null then
      execute format('select count(*), sum(%s), max(%s) from %I.manifest',
        case when exists (select 1 from information_schema.columns where table_schema = s and table_name = 'manifest' and column_name = 'row_count') then 'row_count' else 'null::bigint' end,
        case when exists (select 1 from information_schema.columns where table_schema = s and table_name = 'manifest' and column_name = 'copied_at') then 'copied_at' else 'null::timestamptz' end, s)
        into v_tables, v_rows, v_at;
    end if;
    v_snaps := v_snaps || jsonb_build_array(jsonb_build_object('name', s, 'tables', v_tables, 'rows', v_rows, 'at', v_at,
      'covers_crm', to_regclass(s || '.marketing_consents') is not null and to_regclass(s || '.customer_notes') is not null));
  end loop;
  return jsonb_build_object('ok', true, 'checked_at', now(),
    'sheet', jsonb_build_object('linked', b.spreadsheet_id is not null, 'title', b.spreadsheet_title, 'tab', b.tab_name,
       'linked_at', b.linked_at, 'last_run_at', b.last_run_at, 'last_ok_at', b.last_ok_at, 'last_error', b.last_error),
    'orders', v_total, 'synced', v_synced, 'pending', v_pending, 'snapshots', v_snaps,
    'drills', coalesce((select jsonb_agg(jsonb_build_object('at', d.at, 'snapshot', d.snapshot, 'method', d.method, 'result', d.result, 'passed', d.passed) order by d.at desc)
                         from (select * from public.restore_drills order by at desc limit 5) d), '[]'::jsonb));
end $$;
