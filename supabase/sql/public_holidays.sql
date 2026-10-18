-- Fiji public holidays shown on the staff calendar. Read-only to the apps; managed by a database owner.
-- Not applied until approved by Roneel. Dates: 2026 as endorsed by Cabinet (Fiji Times, 2026 public holidays).
create table if not exists public.public_holidays (
  day date primary key,
  name text not null check (length(name) between 2 and 60),
  source text not null default 'Cabinet',
  created_at timestamptz not null default now()
);
alter table public.public_holidays enable row level security;
drop policy if exists public_holidays_read on public.public_holidays;
create policy public_holidays_read on public.public_holidays for select using (true);
revoke insert, update, delete on public.public_holidays from anon, authenticated;
grant select on public.public_holidays to anon, authenticated;
insert into public.public_holidays (day, name) values
  ('2026-01-01','New Year''s Day'),
  ('2026-04-03','Good Friday'),
  ('2026-04-04','Easter Saturday'),
  ('2026-04-06','Easter Monday'),
  ('2026-05-15','Girmit Day'),
  ('2026-05-29','Ratu Sir Lala Sukuna Day'),
  ('2026-08-24','Prophet Mohammed''s Birthday'),
  ('2026-10-10','Fiji Day'),
  ('2026-11-09','Diwali'),
  ('2026-12-25','Christmas Day'),
  ('2026-12-28','Boxing Day'),
  ('2027-01-01','New Year''s Day')
on conflict (day) do nothing;
