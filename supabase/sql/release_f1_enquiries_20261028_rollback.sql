-- Rollback for release_f1_enquiries_20261028.sql. Removes only the new enquiry objects; orders, customers and payments
-- were never changed. Take a copy first if any real enquiries were recorded: create table public._bk_enquiries_<date> as table public.enquiries;
drop function if exists public.enquiry_get(uuid);
drop function if exists public.enquiry_list(text, text, int);
drop function if exists public.enquiry_link_order(uuid, uuid);
drop function if exists public.enquiry_reopen(uuid);
drop function if exists public.enquiry_close(uuid, text, text, text);
drop function if exists public.enquiry_note(uuid, text, boolean);
drop function if exists public.enquiry_set_status(uuid, text);
drop function if exists public.enquiry_save(jsonb);
drop function if exists public._enq_json(public.enquiries);
drop function if exists public._enq_event(uuid, text, text, text, text, jsonb);
drop function if exists public._enq_open(text);
drop function if exists public._enq_today();
drop function if exists public._enq_me();
drop table if exists public.enquiry_events;
drop table if exists public.enquiries;
drop sequence if exists public.enquiry_ref_seq;
