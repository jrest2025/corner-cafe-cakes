# Settings: Events and public holidays — 18 October 2026

Approved by Roneel. Admins with the Settings permission can add, change and remove café events (blue) and public holidays (grey) from Settings > Events and public holidays. They appear on the calendar and in Coming up.

Database (run by Roneel in the Supabase SQL editor; the approval prompt here kept cancelling): public.calendar_events with the 12 public holidays for 2026 and New Year's Day 2027; calendar_event_save and calendar_event_delete (security definer, Settings permission checked, anonymous callers denied, no direct table writes for staff); private calendar_event_log with no app access. Files: supabase/sql/calendar_events.sql and supabase/sql/calendar_events_settings.sql.

Release commit 589c915d2bbd7a472faf4569f45085ca7777120a, artifact dist/app/staff-app.54f9723a36.js, SRI sha384-VsLTh3pRFooEMM0RXhSVzgrN0O22NyNnyJcJbKKDuLGSzwDvV5OT84ui1Jx3TN4H. Tests: events 51 (new), fit 220, wide 42, calendar 70, islands 78, Needs attention 171 and earlier suites. Footer read-back matched. Published to both production domains.

Live check, signed in: Settings lists Events and public holidays with Diwali, Christmas Day, Boxing Day and New Year's Day and the add form; calendar Coming up shows Diwali (in 3 weeks), Christmas, Boxing Day, New Year's Day. No entries were added or changed during the check.

Rollback: docs/rollback/staff-footer-before-events-2026-10-18.html. The database additions can stay.
