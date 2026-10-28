-- Clean-up and safety tightening, 28 October 2026 (approved by Roneel: "fix the safe issues").
-- Nothing here changes what staff or guests can do. It closes doors nobody uses and removes duplicates.
-- Rollback for each part is at the bottom.

-- 1. Staff-only functions: stop logged-out visitors from calling them.
--    Each one already refuses logged-out callers inside, so this only adds a second lock.
--    Kept open for the public order pages: get_catalogue, get_order_setup, get_seasonal_menu,
--    log_catalogue_generation, submit_online_order, submit_treat_order, and has_perm (used by access rules).
do $$
declare f regprocedure;
begin
  for f in
    select p.oid::regprocedure
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
      and has_function_privilege('anon', p.oid, 'EXECUTE')
      and p.proname not in ('get_catalogue','get_order_setup','get_seasonal_menu',
                            'log_catalogue_generation','submit_online_order','submit_treat_order','has_perm')
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

-- 2. Tables logged-out visitors could touch but every row was already blocked: remove the permission itself.
--    Left alone on purpose: occasions, occasion_dates (order page), calendar_events (owner to decide).
do $$
declare t regclass;
begin
  for t in
    select c.oid::regclass
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v','m')
      and has_table_privilege('anon', c.oid, 'SELECT')
      and c.relname not in ('occasions','occasion_dates','calendar_events')
  loop
    execute format('revoke all on %s from anon', t);
  end loop;
end $$;

-- 3. Two leftover tables had their access rules switched off. Switch them on (no one reads them).
alter table if exists public._fix_20261022_fathers_day enable row level security;
alter table if exists public._view_backup enable row level security;

-- 4. Duplicate indexes (exact copies of another index on the same column).
drop index if exists public.orders_customer_idx;      -- copy of orders_customer_id_idx
drop index if exists public.customer_notes_order;     -- copy of customer_notes_order_idx

-- 5. Helper functions without a fixed search path (security advisor warning).
alter function public._enq_open(text) set search_path = public, extensions;
alter function public._enq_today() set search_path = public, extensions;
alter function public._mirror_day(date) set search_path = public, extensions;
alter function public._mirror_pay(text) set search_path = public, extensions;
alter function public._req_clean(jsonb) set search_path = public, extensions;
alter function public._settings_area(text) set search_path = public, extensions;
alter function public._split_emails(text) set search_path = public, extensions;
alter function public._tpl_row(public.email_template_versions) set search_path = public, extensions;

-- 6. Staff profile read rule: same rule, but the signed-in user is looked up once per query, not once per row.
alter policy read_own_or_manage on public.staff_profiles
  using ((user_id = (select auth.uid())) or has_role(variadic array['manager'::staff_role]));

-- Rollback
-- 1: grant execute on function <name>(<args>) to anon;   (list in docs/cleanup-2026-10-28.md)
-- 2: grant select, insert, update, delete on <table> to anon;
-- 3: alter table ... disable row level security;
-- 4: create index orders_customer_idx on public.orders (customer_id);
--    create index customer_notes_order on public.customer_notes (order_id) where order_id is not null;
-- 5: alter function ... reset search_path;
-- 6: alter policy read_own_or_manage on public.staff_profiles using ((user_id = auth.uid()) or has_role(variadic array['manager'::staff_role]));
