# Warning: central/ is a stale snapshot. Do not switch over.

Written 28 October 2026.

`central/page/` is a copy of the Webflow staff page (`/cake-orders-staff`) as published on **22 October 2026 at 14:57 UTC**.
The live staff app has moved on since then. If `central/dist` were deployed and staff were switched to
central.cornercafefiji.com today, **staff would be rolled back to the 22 October app.**

**Rule:** do not switch staff over to central.cornercafefiji.com, and do not change `app_config.staff_app_url`, until
`central/page/` has been rebuilt from the **current** live Webflow staff page and the checksums in
`scripts/build-central.mjs` and `tests/central/build.mjs` have been updated in the same commit.

## What the snapshot is missing

- **Order tools loaders 2 to 34.** These are Webflow-registered footer scripts named `ccOrderToolsLoader` (versions 1.0.2 to
  1.0.34). The live one is `ccOrderToolsLoader34`, pinned to commit `1870847c`. Loader 35 (welcome screen, commit `ff0f0ac2`)
  was rolled back on 27 October at 8:03 PM. A grep of `central/page/` finds no `ccOrderToolsLoader` at all.
  See `docs/history/order-tools-2026-10-27.md` and `docs/loader34.js`.
- **What those loaders deliver** (files loaded by `docs/loader34.js`, from `src/`):
  - `staff.order-tools.js`: 26 October order tools
  - `staff.analytics-birthday.js`: birthday comeback
  - `staff.cake-lead-time.js`
  - `staff.service-tools.js`
  - `staff.seasonal.js`: seasonal demand
  - `staff.treat-orders.js`: treat orders
  - `staff.analytics-focus.js`
  - `staff.polish.js`: refined lines and icons, icon tiles coloured by meaning
  - `staff.ipad.js`: the iPad shell and iPad Today layout
  - `staff.flow.js`: one flow on every screen and device, island alignment, Today "Act now"
  - `staff.analytics-metrics.js`: analytics charts over text, Stage 2a metrics (loader 33)
  - `staff.admin.js`: Admin console Step A (loader 34)
- **The "Cake Heartbeat" to "Cake Pulse" rename** (loader 24).
- **Any registered-script or custom-code change made in Webflow after 22 October 14:57 UTC.** The rebuild must diff the
  whole live page, not only the loaders.

## Pinned files that are not in this checkout

The snapshot loads these at runtime from jsDelivr or raw.githubusercontent.com, pinned to old commits. They are not in
the current tree. Read-only copies, checked against GitHub, are kept in `recovered/` (see `recovered/README.md`). They are
for reference only and are not used by any build.

- `dist/analytics/approved-dashboard-stable.{js,css}` at `3fb6a2e1f548bbf0de6b5796eb76aa432931111e` (Heartbeat core)
- `src/staff.customer-directory-v3.{js,css}` at `17e9a1396eb653f157d3ea51491bf1793ae7e7da`
- `src/staff.calendar-dashboard.{js,css}` at `fe3704f76a03a2391819630318230dca0f7541a5`

## Before switch-over (other blockers)

- The Edge Functions `staff-admin`, `sheet-backup` and `unsubscribe` must be **redeployed (with approval)** with the
  `https://central.cornercafefiji.com` origin added (done in source on branch `fix/cockpit-safety-2026-10-28`). Until
  then, team admin and backup calls from central.cornercafefiji.com will be refused by the browser.
