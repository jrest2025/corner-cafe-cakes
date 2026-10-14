-- Applied 14 Oct as migration audit_tidy_and_manager_dashboard.
-- Managers may read the Dashboard (owner's decision).
do $$
declare f text;
begin
  foreach f in array array['public.dashboard_data()', 'public.dashboard_register()'] loop
    execute replace(pg_get_functiondef(f::regprocedure), 'has_role(''marketing'')', 'has_role(''marketing'', ''manager'')');
  end loop;
end $$;
-- Fixed search path on helper functions flagged by the security check
alter function public._reg_status set search_path = public;
alter function public._fiji_today set search_path = public;
alter function public._note_problem set search_path = public;
alter function public._filter_problem set search_path = public;
alter function public._stage_label(text) set search_path = public;
alter function public._t12(time) set search_path = public;
alter function public._status_label(text) set search_path = public;
-- The old robot-account Sheet backup never ran; the Sheet in the owner's Drive replaced it
select cron.unschedule('cakes-sheet-backup') where exists (select 1 from cron.job where jobname = 'cakes-sheet-backup');
