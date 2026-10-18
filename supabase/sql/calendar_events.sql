-- Dates shown on the staff calendar: Fiji public holidays and the café's own events.
-- Read-only to the apps for now; Settings management comes in a later release.
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  ends_on date,
  name text not null check (length(name) between 2 and 60),
  kind text not null default 'event' check (kind in ('holiday','event')),
  note text check (note is null or length(note) <= 200),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= day),
  unique (day, name)
);
alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_read on public.calendar_events;
create policy calendar_events_read on public.calendar_events for select using (true);
revoke insert, update, delete on public.calendar_events from anon, authenticated;
grant select on public.calendar_events to anon, authenticated;
-- 2026 Fiji public holidays as endorsed by Cabinet, plus New Year's Day 2027.
insert into public.calendar_events (day, name, kind, source) values
  ('2026-01-01','New Year''s Day','holiday','Cabinet'),
  ('2026-04-03','Good Friday','holiday','Cabinet'),
  ('2026-04-04','Easter Saturday','holiday','Cabinet'),
  ('2026-04-06','Easter Monday','holiday','Cabinet'),
  ('2026-05-15','Girmit Day','holiday','Cabinet'),
  ('2026-05-29','Ratu Sir Lala Sukuna Day','holiday','Cabinet'),
  ('2026-08-24','Prophet Mohammed''s Birthday','holiday','Cabinet'),
  ('2026-10-10','Fiji Day','holiday','Cabinet'),
  ('2026-11-09','Diwali','holiday','Cabinet'),
  ('2026-12-25','Christmas Day','holiday','Cabinet'),
  ('2026-12-28','Boxing Day','holiday','Cabinet'),
  ('2027-01-01','New Year''s Day','holiday','Fixed date')
on conflict (day, name) do nothing;
