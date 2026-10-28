# Connected staff journey refinement — 18 October 2026

## Findings and fixes

1. Analytics and the cake register reused cached data when staff returned after order work. Both now request current records on entry, preserving chosen Analytics filters. The old bundle fails the new refresh regression check.
2. Confirming directly opened the kitchen-slip choice, but paying the required deposit did not. Once a payment changes an order from awaiting_deposit to confirmed, the refreshed order now opens the same slip choice. A partial deposit does not open it; an ordinary balance payment does not reopen it. No email or print is triggered automatically.
3. Saving a custom cake price had duplicate-request protection but lacked a disabled Saving state. Its button now uses the shared busy treatment.

The rejected Cake Hub name was discarded. No name or styling changes are included.

## Verification

20 connected journey browser checks use an invented received custom order: price, agreement, split deposit, kitchen slip, production stages, required checker name, balance and handover. The same order completes, partial deposits remain waiting, ordinary balance payments do not recreate slips, and handover remains locked with money owing. No script errors. All remote requests blocked.

132 responsive alignment/spacing checks, 40 viewport checks and 59 earlier workflow checks also passed against this release: 251 checks total. Existing released CSS preserved byte for byte. This is local functional verification with simulated server responses, not production payment, message, print or database testing.

## Build and rollback

build/staff_journey.py reproduces the exact prior cleanup source and verifies parity before applying build/staff_journey.patch. It retains the released spacing, viewport and alignment layers. Unfinished features in the broader source templates are excluded.

Rollback: restore docs/rollback/staff-footer-before-journey-2026-10-18.html to the staff page footer and publish. No database rollback is needed.

## Remaining readiness work

Physical printer output and destination verification, recovery from an actual backup, independent staff acceptance, and live permission/security verification remain unproven by these UI checks. Earlier technical findings remain open: payment overage handling, more than 400 active/recent records, and atomic multi-row delivery/price saves. These need separate backend work and acceptance tests; this refinement does not certify the whole system production-ready.

New-order entry and cancellation/refund branches were not re-exercised by the connected journey test. Analytics freshness is verified by a new request and filter preservation; backend aggregation accuracy is outside this change.

## Publication

Published to both production domains at 2026-10-17T18:49:20.744Z (18 October, 06:49 Fiji). Domain publication timestamps verified. Exact footer read-back and CDN byte comparison passed. Festive page remains draft. Signed-in production inspection was unavailable in this session.

Release commit: fe3b10dd1c9f3b8563556af3e714276f1c05cd20. Artifact: dist/app/staff-app.58869aff6c.js. SRI: sha384-fgZ3VZR535a9f0xnEhI0jM5CsN5QF22ew0FKBmAOgLJV+XLo6tRfDa9nMowyDa+V.
