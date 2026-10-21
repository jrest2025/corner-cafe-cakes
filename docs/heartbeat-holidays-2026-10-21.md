# Cake Heartbeat: holidays and events (21 October 2026)

Approved by Roneel: "open the cakes heartbeat, keep the data", holidays to the end of 2028, the same format as the other
Jack's Restaurants Heartbeats (Kazumi Service Hub v98 and v99). This is an approved change to the protected Daily Cake Demand
rail (docs/HEARTBEAT_PROTECTED.md, rule 1).

## What changes
- `src/staff.demand-rail.locked.js` and `.css` v1.1.0. The order counting (indexOrders, dayStat) is unchanged; the contract
  test keeps every v1.0.1 check and adds holiday checks. The timeline runs to 31 December 2028 (was 2027).
- Under the chart: two rows, Fiji (public holidays, café events, international days) and Tourist markets (Australia and New
  Zealand, with school holidays). Names on the marks, Fiji public holidays shaded across the day, hollow marks for dates not
  yet announced, buttons to show or hide each row (remembered on the device), tap a day to list its holidays.
- "Holidays and events" button: managers change, add or remove entries. Fiji public holidays and café events are the same
  entries as Settings, Events and public holidays (calendar_events); international, Australian and New Zealand entries are
  in the new timeline_events table. Both need the Settings permission (checked on the server).
- No Japanese holidays (Kazumi only).

## Database (supabase/sql/timeline_events_v1.sql)
- Adds Fiji public holidays for 2027 and 2028 to calendar_events (existing entries untouched; dates not yet announced carry
  the note "Date expected; not yet announced."). These also show on the staff calendar, like the 2026 holidays.
- New table timeline_events (114 entries), timeline_event_log, functions timeline_events_list() and timeline_event_save(p).
- Dry run on the live database inside a transaction that was rolled back: passed.

## Release (on "deploy")
1. Apply supabase/sql/timeline_events_v1.sql.
2. In the staff page footer, pin `staff.demand-rail.locked.js` and `.css` to the new commit (nothing else changes).
3. Run the guard (docs/HEARTBEAT_PROTECTED.md, rule 3), publish, then update test/fixtures/staff-footer.html.
Rollback: pin the two files back to commit 71758a893197746fcca5a1027e4d40450c3dcb26. The database part can stay.
