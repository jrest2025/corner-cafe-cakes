# Analytics: Cake Heartbeat first, with insight cards (20 October 2026)

Published to cornercafefiji.com and www.cornercafefiji.com on 20 October 2026, about 1:55 PM Fiji. Approved by Roneel
("Yes, publish"), including the Heartbeat fix ("Yes, fix it").

## What changed

Analytics only. Orders, customers, forms and the database are unchanged.

- **Cake Heartbeat at the top.** Analytics opens on the Heartbeat (called "Cake Heartbeat", with "Live · updated" and
  the time in 12-hour form). Daily cake demand (the scrolling day chart, green cakes due, purple cakes booked) comes
  straight under the header, then the insight cards, then the management cards, then Seasonal booking buildup and the
  daily breakdown. Nothing in the Heartbeat was removed.
- **Insight cards** (built-in rules, no outside AI). They read the same orders as the Heartbeat and show the most
  important findings first, each with a number, why it matters and what to do: orders still to confirm, money still
  owed this week, orders without a price, the busiest day ahead, booking pace, the next occasion (Christmas,
  Valentine's Day, Mother's Day, Father's Day), the top cake, how far ahead people book, online share, returning
  customers and quiet days. Four cards show (three on phones) with "Show all". Percentages are only shown when there are
  enough orders to make them meaningful; otherwise the card says so.
- **Management cards:** "Confirmed order value" now shows the dollar value of priced orders for the next 30 days;
  "Ordered ahead" replaces "Booking dates to verify"; the empty follow-ups box is gone.
- **Tidier Overview:** the old filter and period bars under the Heartbeat are hidden on Overview; module tabs with no data
  yet are hidden until data arrives; Cake orders no longer shows a "Loading cake analytics…" box, and its sub-tabs wrap
  on tablets instead of scrolling sideways.
- **Heartbeat fix (Daily cake demand v1.0.1):** after switching to another tab and back, the day chart stays on the
  current week instead of jumping to January 2024. One line changed in the protected rail, approved by Roneel.

## Release

Only the `cc-heartbeat-loader` block in the staff page footer changed (built by `build/staff_analytics_insights_footer.py
… 71758a893197746fcca5a1027e4d40450c3dcb26 --rail`).

- Approved core `dist/analytics/approved-dashboard-stable.js/.css`: unchanged at `3fb6a2e1f548bbf0de6b5796eb76aa432931111e`.
- At `71758a893197746fcca5a1027e4d40450c3dcb26` (raw.githubusercontent.com):
  - `src/seasonal-demand-staging.js/.css` (management v5), previously `74e18a7`;
  - `src/staff.demand-rail.locked.js/.css` (v1.0.1), previously `1acf060`;
  - `src/staff.analytics-insights.js/.css` (new, `2026-10-20-insights-v1`). If these two files fail to load, the
    Heartbeat loads exactly as before.
- Staff app bundle unchanged: `855328b…/dist/app/staff-app.3e258cb148.js`.
- The footer saved in Webflow was read back after publishing and is identical to `test/fixtures/staff-footer.html`.

Tests on the published footer: Heartbeat guard `test/run_heartbeat_guard.cjs` 51 of 51 (tablet landscape, tablet
upright, phone; without the rail fix it was 48 of 51), rail contract `tests/demand-rail-contract.test.cjs` pass, insight
rules `test/run_analytics_insights.cjs` 24 of 24.

## What the cards showed on real orders at release

Read-only check of the register: 4 confirmed orders due this week still owe $899; no orders waiting to be confirmed and
none without a price; online share 43% of the last 30 days (17% the 30 days before); people book 6 days ahead on average
(3 before); Christmas shows a countdown rather than a comparison because last Christmas has only 3 orders on record; 26
older records without a reliable booking date are left out of pace and lead-time figures. The six orders CC-1076 to
CC-1081 with year-1 and year-2 dates are kept as historical data and raise no alerts.

## Rollback

One step: set the staff page footer to `docs/analytics-insights-rollback.footer.html` (the footer as it was before this
release) and publish. If the footer has changed since, edit only the `cc-heartbeat-loader` block instead: pin the
seasonal files back to `74e18a793ea158d98860c1f5e66b510e24e2159e` and the rail files to
`1acf060a9e22beea028d04820c1d51c101c5599c`, remove the two `staff.analytics-insights` reads, the `CCCakeInsights.mount`
line and `insReady`, then publish. To undo only the rail fix, pin the two rail files back to `1acf060…`.
