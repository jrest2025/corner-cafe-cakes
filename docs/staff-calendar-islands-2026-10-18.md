# Calendar occasions, Handover and Customers islands — 18 October 2026

Approved by Roneel. Bigger month view listing up to three cakes per day; occasion lead-up line; Coming up strip; café events in blue and public holidays in grey (from public.calendar_events). Handover sections as islands (centred pop-up, or two panes on wide screens). Customers needing attention rows as islands.

Release commit 773e730d441cfc33536b3ef0c12a0a1059c5a2b8, artifact dist/app/staff-app.a3a0b27361.js, SRI sha384-Xj+NnqaYcLf5ng2NPCicrva9iOXlmYvU4cZsKbnE6Lgpz/QTRN/+9OlnhkrrUvt3. Tests: calendar 70, islands 78, Needs attention 171, order date 34, cleanup 59, alignment 132. Footer read-back matched. Published to both production domains.

Live check, signed in: calendar month cells 151px with 22 cakes listed across October; Coming up shows Christmas (no orders yet). Handover shows 5 islands with notes open in the pane. Customers shows 6 attention islands. Needs attention unchanged.

Database: supabase/sql/calendar_events.sql is NOT applied. The approval prompt was cancelled twice. Until it is applied the calendar shows occasions only, with no public holidays; the app handles the missing table without errors.

Rollback: docs/rollback/staff-footer-before-calendar-2026-10-18.html.
