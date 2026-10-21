-- Cake Heartbeat holidays and events (21 October 2026, approved by Roneel: "open the cakes heartbeat, keep the data,
-- holidays all the way to 2030", then "keep it till end of 2028"). Used by the Daily Cake Demand rail v1.1.0 (src/staff.demand-rail.locked.js).
-- 1. Fiji public holidays 2027 and 2028 are added to calendar_events (the café's own list in Settings, Events and public
--    holidays), so they also show on the staff calendar as the 2026 ones do. Dates not yet announced carry the note
--    "Date expected; not yet announced." Existing entries are never changed (same day and name are skipped).
-- 2. New table timeline_events for international days and Australian and New Zealand public and school holidays (these
--    are for the timeline only, so they stay off the staff calendar). Staff can read them through timeline_events_list();
--    timeline_event_save(p) adds, changes or removes one and needs the Settings permission (mgmt.settings). Every change
--    is written to timeline_event_log. Japanese holidays are for Kazumi only and are not included.
-- Source: Jack's Restaurants shared list (kazumi-website-reservations shared/holidays-2026-2028.json), checked against
-- official sources on 21 October 2026. Safe to run more than once.
-- Reversal: drop function public.timeline_event_save(jsonb); drop function public.timeline_events_list();
--   drop table public.timeline_event_log; drop table public.timeline_events;
--   delete from public.calendar_events where source = 'Jack''s Restaurants holiday list';

insert into public.calendar_events (day, ends_on, name, kind, note, source)
select v.day::date, v.ends_on::date, v.name, 'holiday', v.note, 'Jack''s Restaurants holiday list' from (values
('2027-03-26', null, 'Good Friday', 'Date expected; not yet announced.'),
('2027-03-27', null, 'Easter Saturday', 'Date expected; not yet announced.'),
('2027-03-29', null, 'Easter Monday', 'Date expected; not yet announced.'),
('2027-05-14', null, 'Girmit Day', 'Date expected; not yet announced.'),
('2027-05-28', null, 'Ratu Sir Lala Sukuna Day', 'Date expected; not yet announced.'),
('2027-08-16', null, 'Prophet Mohammed''s Birthday', 'Date expected; not yet announced.'),
('2027-10-10', null, 'Fiji Day', 'Date expected; not yet announced.'),
('2027-10-29', null, 'Diwali', 'Date expected; not yet announced.'),
('2027-12-27', null, 'Christmas Day (observed)', 'Date expected; not yet announced.'),
('2027-12-28', null, 'Boxing Day (observed)', 'Date expected; not yet announced.'),
('2028-01-01', null, 'New Year''s Day', 'Date expected; not yet announced.'),
('2028-04-14', null, 'Good Friday', 'Date expected; not yet announced.'),
('2028-04-15', null, 'Easter Saturday', 'Date expected; not yet announced.'),
('2028-04-17', null, 'Easter Monday', 'Date expected; not yet announced.'),
('2028-05-15', null, 'Girmit Day', 'Date expected; not yet announced.'),
('2028-05-29', null, 'Ratu Sir Lala Sukuna Day', 'Date expected; not yet announced.'),
('2028-08-07', null, 'Prophet Mohammed''s Birthday', 'Date expected; not yet announced.'),
('2028-10-10', null, 'Fiji Day', 'Date expected; not yet announced.'),
('2028-10-17', null, 'Diwali', 'Date expected; not yet announced.'),
('2028-12-25', null, 'Christmas Day', 'Date expected; not yet announced.'),
('2028-12-26', null, 'Boxing Day', 'Date expected; not yet announced.')
) v(day, ends_on, name, note)
on conflict (day, name) do nothing;

create table if not exists public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  date_from date not null,
  date_to date,
  name text not null check (length(btrim(name)) between 2 and 200),
  grp text not null check (grp in ('intl','au','nz')),
  kind text not null default 'holiday' check (kind in ('holiday','school','event')),
  expected boolean not null default false,
  note text,
  source text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text,
  check (date_to is null or date_to >= date_from)
);
alter table public.timeline_events enable row level security;
revoke all on public.timeline_events from anon, authenticated;
create index if not exists timeline_events_dates on public.timeline_events (date_from) where is_active;

create table if not exists public.timeline_event_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_label text,
  action text not null,
  snapshot jsonb not null
);
alter table public.timeline_event_log enable row level security;
revoke all on public.timeline_event_log from anon, authenticated;

insert into public.timeline_events (date_from, date_to, name, grp, kind, expected, note, source)
select v.date_from::date, v.date_to::date, v.name, v.grp, v.kind, v.expected::boolean, v.note, v.source from (values
('2026-09-06', null, 'Father''s Day (Fiji)', 'intl', 'event', false, null, 'https://www.fijitimes.com.fj/happy-fatherds-day-celebrated-around-the-world/'),
('2026-09-19', '2026-10-04', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2026-09-19', '2026-10-05', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/term-dates'),
('2026-09-26', '2026-10-11', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://www.education.govt.nz/term-dates-and-holidays'),
('2026-09-28', '2026-10-09', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/2026'),
('2026-10-05', null, 'King''s Birthday (Queensland only)', 'au', 'holiday', false, null, 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2026-public-holidays'),
('2026-10-26', null, 'Labour Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2026-10-31', null, 'Halloween', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/halloween'),
('2026-12-12', '2027-01-26', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/term-dates'),
('2026-12-18', '2027-01-27', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/2027'),
('2026-12-19', '2027-01-26', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2026-12-19', '2027-01-27', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2026-12-24', null, 'Christmas Eve', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/christmas-eve'),
('2026-12-25', null, 'Christmas Day', 'au', 'holiday', false, null, 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2026-public-holidays'),
('2026-12-25', null, 'Christmas Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2026-12-28', null, 'Boxing Day', 'au', 'holiday', false, 'Observed Monday; Boxing Day falls on Saturday 26 December', 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2026-public-holidays'),
('2026-12-28', null, 'Boxing Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2026-12-31', null, 'New Year''s Eve', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/new-year-eve'),
('2027-01-01', null, 'New Year''s Day', 'au', 'holiday', false, null, 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-01-01', null, 'New Year''s Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-01-04', null, 'Day after New Year''s Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-01-26', null, 'Australia Day', 'au', 'holiday', false, null, 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-02-06', null, 'Chinese New Year (Lunar New Year)', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/china/chinese-new-year'),
('2027-02-08', null, 'Ramadan begins', 'intl', 'event', true, null, 'https://www.thenationalnews.com/news/uae/2026/10/06/ramadan-2027-uae-dates-eid-al-fitr-holiday/'),
('2027-02-08', null, 'Waitangi Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-02-14', null, 'Valentine''s Day', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/valentine-day'),
('2027-03-08', null, 'International Women''s Day', 'intl', 'event', false, null, 'https://www.un.org/en/observances/womens-day'),
('2027-03-10', null, 'Eid al-Fitr', 'intl', 'event', true, null, 'https://www.thenationalnews.com/news/uae/2026/10/06/ramadan-2027-uae-dates-eid-al-fitr-holiday/'),
('2027-03-22', null, 'Holi', 'intl', 'event', true, null, 'https://dekhopanchang.com/en/festivals/holi/2027'),
('2027-03-26', null, 'Good Friday', 'au', 'holiday', false, null, 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-03-26', '2027-04-11', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2027-03-26', '2027-04-11', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2027-03-26', null, 'Good Friday', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-03-27', '2027-03-29', 'Easter Saturday to Easter Monday', 'au', 'holiday', false, null, 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-03-28', null, 'Easter Sunday', 'intl', 'event', false, null, 'https://www.timeanddate.com/calendar/determining-easter-date.html'),
('2027-03-29', null, 'Easter Monday', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-04-10', '2027-04-26', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2027-04-12', '2027-04-23', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/2027'),
('2027-04-25', '2027-04-26', 'Anzac Day', 'au', 'holiday', false, 'Falls on Sunday; Monday 26 April is also a holiday in New South Wales, Queensland, Western Australia and the Australian Capital Territory, but not Victoria', 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-04-26', null, 'Anzac Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-05-09', null, 'Mother''s Day (Fiji)', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/fiji/mothers-day'),
('2027-06-07', null, 'King''s Birthday', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-06-14', null, 'King''s Birthday', 'au', 'holiday', false, 'Most states; Queensland is in October, Western Australia in September', 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-06-25', null, 'Matariki', 'nz', 'holiday', false, null, 'https://www.tepapa.govt.nz/node/4867'),
('2027-06-26', '2027-07-11', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2027-06-26', '2027-07-11', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2027-07-03', '2027-07-18', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2027-07-05', '2027-07-16', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/2027'),
('2027-09-05', null, 'Father''s Day (Fiji)', 'intl', 'event', false, null, 'https://www.fijitimes.com.fj/happy-fatherds-day-celebrated-around-the-world/'),
('2027-09-18', '2027-10-03', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2027-09-18', '2027-10-04', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2027-09-25', '2027-10-10', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2027-09-27', '2027-10-08', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/2027'),
('2027-10-04', null, 'King''s Birthday (Queensland only)', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2027-10-25', null, 'Labour Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-10-31', null, 'Halloween', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/halloween'),
('2027-12-11', '2028-01-23', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2027-12-18', '2028-01-26', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2027-12-18', '2028-01-30', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2027-12-21', '2028-01-28', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/2027'),
('2027-12-24', null, 'Christmas Eve', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/christmas-eve'),
('2027-12-27', null, 'Christmas Day', 'au', 'holiday', false, 'Observed Monday; Christmas falls on Saturday 25 December', 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-12-27', null, 'Christmas Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-12-28', null, 'Boxing Day', 'au', 'holiday', false, 'Observed Tuesday; Boxing Day falls on Sunday 26 December', 'https://www.fairwork.gov.au/employment-conditions/public-holidays/2027-public-holidays'),
('2027-12-28', null, 'Boxing Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2027-12-31', null, 'New Year''s Eve', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/new-year-eve'),
('2028-01-03', null, 'New Year''s Day', 'au', 'holiday', false, 'Observed Monday; New Year''s Day falls on Saturday 1 January', 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-01-03', null, 'New Year''s Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-01-04', null, 'Day after New Year''s Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-01-26', null, 'Australia Day', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-01-26', null, 'Chinese New Year (Lunar New Year)', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/china/chinese-new-year'),
('2028-01-28', null, 'Ramadan begins', 'intl', 'event', true, null, 'https://www.wisconsin.edu/academic-calendars/download/2028-Universities-of-Wisconsin-religious-and-spiritual-calendar-(1).pdf'),
('2028-02-07', null, 'Waitangi Day (observed)', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-02-14', null, 'Valentine''s Day', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/valentine-day'),
('2028-02-26', null, 'Eid al-Fitr', 'intl', 'event', true, null, 'https://www.wisconsin.edu/academic-calendars/download/2028-Universities-of-Wisconsin-religious-and-spiritual-calendar-(1).pdf'),
('2028-03-08', null, 'International Women''s Day', 'intl', 'event', false, null, 'https://www.un.org/en/observances/womens-day'),
('2028-03-11', null, 'Holi', 'intl', 'event', true, null, 'https://www.wisconsin.edu/academic-calendars/download/2028-Universities-of-Wisconsin-religious-and-spiritual-calendar-(1).pdf'),
('2028-04-01', '2028-04-17', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2028-04-01', '2028-04-17', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2028-04-10', '2028-04-21', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates'),
('2028-04-14', null, 'Good Friday', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-04-14', null, 'Good Friday', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-04-14', '2028-04-30', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2028-04-15', '2028-04-17', 'Easter Saturday to Easter Monday', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-04-16', null, 'Easter Sunday', 'intl', 'event', false, null, 'https://www.timeanddate.com/calendar/determining-easter-date.html'),
('2028-04-17', null, 'Easter Monday', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-04-25', null, 'Anzac Day', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-04-25', null, 'Anzac Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-05-14', null, 'Mother''s Day (Fiji)', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/fiji/mothers-day'),
('2028-06-05', null, 'King''s Birthday', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-06-12', null, 'King''s Birthday', 'au', 'holiday', true, 'Most states; Queensland is in October, Western Australia in September', 'https://www.vic.gov.au/public-holidays-victoria'),
('2028-06-24', '2028-07-09', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2028-07-01', '2028-07-16', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2028-07-08', '2028-07-23', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2028-07-10', '2028-07-21', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates'),
('2028-07-14', null, 'Matariki', 'nz', 'holiday', false, null, 'https://www.tepapa.govt.nz/node/4867'),
('2028-09-03', null, 'Father''s Day (Fiji)', 'intl', 'event', false, null, 'https://www.fijitimes.com.fj/happy-fatherds-day-celebrated-around-the-world/'),
('2028-09-16', '2028-10-02', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2028-09-23', '2028-10-08', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2028-09-30', '2028-10-15', 'School holidays: New Zealand', 'nz', 'school', false, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2028-10-02', null, 'King''s Birthday (Queensland only)', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-10-03', '2028-10-13', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates'),
('2028-10-23', null, 'Labour Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-10-31', null, 'Halloween', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/halloween'),
('2028-12-09', '2029-01-21', 'School holidays: Queensland', 'au', 'school', false, null, 'https://education.qld.gov.au/about-us/calendar/future-dates'),
('2028-12-16', '2029-01-28', 'School holidays: New Zealand', 'nz', 'school', true, null, 'https://gazette.govt.nz/notice/id/2025-sl5849'),
('2028-12-22', '2029-01-25', 'School holidays: New South Wales', 'au', 'school', false, null, 'https://education.nsw.gov.au/schooling/calendars/future-and-past-nsw-term-and-vacation-dates'),
('2028-12-22', '2029-01-28', 'School holidays: Victoria', 'au', 'school', false, null, 'https://www.vic.gov.au/school-term-dates-holidays-victoria'),
('2028-12-24', null, 'Christmas Eve', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/christmas-eve'),
('2028-12-25', null, 'Christmas Day', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-12-25', null, 'Christmas Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-12-26', null, 'Boxing Day', 'au', 'holiday', false, null, 'https://www.qld.gov.au/recreation/travel/holidays/public'),
('2028-12-26', null, 'Boxing Day', 'nz', 'holiday', false, null, 'https://www.employment.govt.nz/leave-and-holidays/public-holidays/public-holidays-and-anniversary-dates'),
('2028-12-31', null, 'New Year''s Eve', 'intl', 'event', false, null, 'https://www.timeanddate.com/holidays/world/new-year-eve')
) v(date_from, date_to, name, grp, kind, expected, note, source)
where not exists (select 1 from public.timeline_events t where t.date_from = v.date_from::date and t.grp = v.grp and t.name = v.name);

create or replace function public.timeline_events_list()
returns jsonb language plpgsql stable security definer set search_path to '' as $function$
begin
  if not public.is_staff() then return jsonb_build_object('ok', false, 'error', 'not_allowed'); end if;
  return jsonb_build_object('ok', true, 'items', (select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'date', t.date_from, 'end', t.date_to, 'name', t.name, 'grp', t.grp, 'kind', t.kind, 'expected', t.expected,
      'note', t.note) order by t.date_from, t.grp, t.name), '[]'::jsonb) from public.timeline_events t where t.is_active));
end $function$;

create or replace function public.timeline_event_save(p jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_id uuid := nullif(p->>'id', '')::uuid; v_from date; v_to date; v_name text; v_grp text; v_kind text;
        v_who text := coalesce((select full_name from public.staff_profiles where user_id = auth.uid()), 'Staff'); v_row public.timeline_events;
begin
  if not public.has_perm('mgmt.settings') then return jsonb_build_object('ok', false, 'message', 'Your login cannot change holidays and events.'); end if;
  if coalesce((p->>'remove')::boolean, false) then
    update public.timeline_events set is_active = false, updated_at = now(), updated_by = v_who where id = v_id and is_active returning * into v_row;
    if v_row.id is null then return jsonb_build_object('ok', false, 'message', 'That entry was not found.'); end if;
    insert into public.timeline_event_log (actor, actor_label, action, snapshot) values (auth.uid(), v_who, 'remove', to_jsonb(v_row));
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;
  v_from := nullif(p->>'date', '')::date; v_to := nullif(p->>'end', '')::date; v_name := btrim(coalesce(p->>'name', ''));
  v_grp := coalesce(p->>'grp', ''); v_kind := coalesce(nullif(p->>'kind', ''), 'holiday');
  if v_from is null then return jsonb_build_object('ok', false, 'message', 'Choose the date.'); end if;
  if v_to is not null and v_to < v_from then return jsonb_build_object('ok', false, 'message', 'The last day cannot be before the first day.'); end if;
  if v_to = v_from then v_to := null; end if;
  if length(v_name) < 2 or length(v_name) > 200 then return jsonb_build_object('ok', false, 'message', 'Give it a name of 2 to 200 characters.'); end if;
  if v_grp not in ('intl','au','nz') then return jsonb_build_object('ok', false, 'message', 'Choose International, Australia or New Zealand.'); end if;
  if v_kind not in ('holiday','school','event') then return jsonb_build_object('ok', false, 'message', 'Choose the type.'); end if;
  if v_id is null then
    insert into public.timeline_events (date_from, date_to, name, grp, kind, expected, note, updated_by)
      values (v_from, v_to, v_name, v_grp, v_kind, coalesce((p->>'expected')::boolean, false), nullif(btrim(coalesce(p->>'note', '')), ''), v_who) returning * into v_row;
  else
    update public.timeline_events set date_from = v_from, date_to = v_to, name = v_name, grp = v_grp, kind = v_kind,
      expected = coalesce((p->>'expected')::boolean, false), note = nullif(btrim(coalesce(p->>'note', '')), ''), updated_at = now(), updated_by = v_who
      where id = v_id and is_active returning * into v_row;
    if v_row.id is null then return jsonb_build_object('ok', false, 'message', 'That entry was not found.'); end if;
  end if;
  insert into public.timeline_event_log (actor, actor_label, action, snapshot) values (auth.uid(), v_who, case when v_id is null then 'add' else 'change' end, to_jsonb(v_row));
  return jsonb_build_object('ok', true, 'id', v_row.id);
end $function$;
revoke all on function public.timeline_events_list() from public, anon;
revoke all on function public.timeline_event_save(jsonb) from public, anon;
grant execute on function public.timeline_events_list() to authenticated;
grant execute on function public.timeline_event_save(jsonb) to authenticated;
