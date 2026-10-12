-- Monitoring: health checks for Better Stack heartbeats.
-- Every 5 minutes the database checks its background jobs and calls one Better Stack check-in address per job.
-- A healthy job calls the address; an unhealthy one calls the address with /fail so Better Stack alerts straight away.
-- If the database or its scheduler stops, nothing is called and Better Stack alerts when the check-in is missed.
-- Check-in addresses are entered by the owner in app_config (keys hb_database, hb_sheet_read, hb_email, hb_backup).
-- Only Better Stack addresses are ever called.

create or replace function public.ops_health()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_sheet boolean; v_email boolean; v_backup boolean; b public.sheet_backup;
begin
  -- Order sheets read by the Google script: each sheet read successfully in the last 30 minutes, with no failure since.
  select bool_and(
           exists (select 1 from public.reg_sync_runs r where r.sheet = s and r.ok and r.at > now() - interval '30 minutes')
           and not exists (select 1 from public.reg_sync_runs r where r.sheet = s and not r.ok
                             and r.at > coalesce((select max(r2.at) from public.reg_sync_runs r2 where r2.sheet = s and r2.ok), '-infinity')))
    into v_sheet
    from unnest(array['online','walkin']) s;
  -- Order emails: none failed in the last day, none stuck waiting for more than 30 minutes.
  v_email := not exists (select 1 from public.email_outbox
                          where (status = 'failed' and created_at > now() - interval '24 hours')
                             or (status in ('pending','sending') and created_at < now() - interval '30 minutes'));
  -- Google Sheet backup: only checked once a sheet is linked.
  select * into b from public.sheet_backup where id = 1;
  v_backup := case when b.spreadsheet_id is null then null
                   else coalesce(b.last_ok_at > now() - interval '20 minutes', false) and b.last_error is null end;
  return jsonb_build_object('database', true, 'sheet_read', v_sheet, 'email', v_email, 'backup', v_backup, 'checked_at', now());
end $$;

create or replace function public.ops_heartbeat()
returns int language plpgsql security definer set search_path = public as $$
declare h jsonb := public.ops_health(); r record; k text; n int := 0;
begin
  for r in select key, value from public.app_config
            where key in ('hb_database','hb_sheet_read','hb_email','hb_backup')
              and value ~ '^https://(uptime\.betterstack\.com|betteruptime\.com)/api/v1/heartbeat/[A-Za-z0-9]+$' loop
    k := substr(r.key, 4);
    if jsonb_typeof(h -> k) is distinct from 'boolean' then continue; end if;
    perform net.http_get(url := r.value || case when (h ->> k)::boolean then '' else '/fail' end);
    n := n + 1;
  end loop;
  return n;
end $$;

revoke all on function public.ops_health(), public.ops_heartbeat() from public, anon, authenticated;

select cron.schedule('ops-heartbeat', '*/5 * * * *', $$select public.ops_heartbeat()$$);
