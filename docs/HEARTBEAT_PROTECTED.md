# The Cake Heartbeat is protected

Roneel's standing instruction (20 October 2026): the booking curve, also called the Cake Heartbeat, must never be
deleted. It is the live rhythm of the cake business and sits at the top of Analytics.

## What counts as the Heartbeat

- **Daily cake demand** on Analytics, Overview: the day-by-day scrolling chart, green solid line for cakes due,
  purple dashed line for cakes booked, day cards above it. Source `src/staff.demand-rail.locked.js` and `.css`,
  also covered by the earlier lock in `docs/ANALYTICS_MODULE_LOCK.md` on the `feature/protected-daily-demand-rail-20261019` branch.
- The **Cake Heartbeat** section around it (live refresh, daily breakdown) from the approved core
  `dist/analytics/approved-dashboard-stable.js` at commit `3fb6a2e`.
- **Seasonal booking buildup** (`src/seasonal-demand-staging.js`).
- The **Booking curve** chart on Analytics, Occasions (in the staff app bundle).

## Rules

1. Nothing is removed, hidden or replaced by a cleanup or redesign. Changes to the Heartbeat files themselves need
   Roneel's explicit approval for that change.
2. Every asset stays pinned to an exact commit in the page footer; never a branch name.
3. Before any release of the staff page footer or bundle, run the guard and do not publish if it fails:

   ```
   git fetch origin '+refs/heads/*:refs/remotes/origin/*'
   node test/run_heartbeat_guard.cjs                      # live head and footer from test/fixtures
   FOOTER=path/to/candidate-footer.html BUNDLE=dist/app/<bundle>.js node test/run_heartbeat_guard.cjs
   node tests/demand-rail-contract.test.cjs               # the rail's own contract
   ```

   The guard checks on a tablet in landscape and upright, and on a phone, that the Heartbeat loads, that Daily cake
   demand is present with both lines and comes first under the Heartbeat header, that Seasonal booking buildup and the
   daily breakdown are there, that the Occasions booking curve is there, and that after visiting other tabs the
   Heartbeat still shows the current week.
4. Keep `test/fixtures/staff-head.html` and `staff-footer.html` equal to the live page after each release, so the
   guard always tests what is live.
