# Pickup date guard on New order (22 October 2026)

Why: Daily Cake Demand showed cakes due but not booked. 16 paper-slip orders were typed in on 20 and 21 October as
New orders with "Today" as the order day after their pickup days, and 4 had the pickup year saved as 1 or 2
(see DATA-FIX-2026-10-22.md). Old order (live 21 October) already checks both; New order did not.

What changes (New order, pickup date step only):
- A pickup year before 2015 or more than two years ahead: "Check the year of the pickup date".
- A pickup day before today when the order day (Today, Yesterday or Another date) is after it: "This pickup day is before
  the day they ordered. For a cake already picked up (a paper slip), tap Old order at the top".
Nothing else changes: no database change, no other step, Old order untouched.

Build: `build/staff_pickup_guard.py` on the live `staff-app.efbea59dfe.js` (checks its SRI first), one anchored change.
Result: `dist/app/staff-app.61d3858119.js` (manifest `dist/app/staff-pickup-guard-manifest.json`).
Tests: `test/run_pickup_guard.cjs` 10/10 (the live build fails the two new checks); `run_old_orders.cjs` 144/144;
`run_order_flow.cjs` 123/123; `run_date_typing.cjs` 26/26.

Release footer: `dist/staff.footer.pickup-guard.html` = the live footer of 21 Oct 11:37 PM with only the app loader line
changed. Before writing it, read the live footer and confirm it is still `dist/staff.footer.sidebar-contract.html`.
Rollback: put `dist/staff.footer.sidebar-contract.html` back as the staff page footer and publish.
Not live. Waiting for Roneel's "deploy".
