-- Rollback: put back the previous customer_summary view text (saved in public._view_backup at apply time).
-- Note: the previous view reads app_config directly, which staff cannot read, so profiles would break again.
do $r$ declare d text; begin
  select def into d from public._view_backup where name = 'customer_summary' order by saved_at desc limit 1;
  execute 'create or replace view public.customer_summary with (security_invoker = true) as ' || d;
end $r$;
drop function if exists public._cfg_public(text);
