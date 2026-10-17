-- Applied 17 Oct 2026 (approved by Roneel): the online and walk-in Google Sheets are uploaded history, no longer read.
-- _register_sync() now reports uploaded:true and the last order date for each, and the dashboard no longer flags them as out of date.
insert into public.reg_meta (k, v, at) select 'uploaded_online', 'Online order sheet uploaded as history', now() where not exists (select 1 from public.reg_meta where k = 'uploaded_online');
insert into public.reg_meta (k, v, at) select 'uploaded_walkin', 'Walk-in sheet uploaded as history', now() where not exists (select 1 from public.reg_meta where k = 'uploaded_walkin');
-- (function body as applied: see migration register_sheets_uploaded_history)
