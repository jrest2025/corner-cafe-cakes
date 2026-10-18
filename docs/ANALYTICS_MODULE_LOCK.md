# LOCKED: Daily Cake Demand scrolling module

**Owner:** Corner Cafe CRM / marketing. **Protected contract v1.0.0**, approved 19 October 2026.

The management dashboard must retain the Daily Cake Demand horizontal, day-by-day
scrolling timeline through **31 December 2027**. It is explicitly requested and
MUST NOT be replaced with only a monthly chart, removed during management layout
simplification, or silently rewritten during other Analytics changes.

## Contract

- Dedicated source files: `src/staff.demand-rail.locked.js` and `src/staff.demand-rail.locked.css`.
- Public API: `window.CCCakeDemandRail.mount(host, orders, {today})`.
- Invariants: `rangeStart === '2024-01-01'`; `rangeEnd === '2027-12-31'`; `maxRenderedDays <= 62`.
- Always render a horizontal scrollbar, left/right 7-day navigation, Today, **Dec 2027** and jump-to-month controls.
- Visible day cards and the chart move together. The green solid line shows scheduled pickup cake quantities (future dates confirmed only); the purple dashed line shows verified booking dates only through today. Missing or future booking-date observations are unknown, not zero.
- Pick a day for exact verified booking and pickup order counts; do not present scheduled pickups as completed sales.
- Use the already-authorized read-only `dashboard_register` response supplied through the existing Analytics bridge. Never call Supabase directly, expose credentials, change existing CRM data, or mount outside Analytics.
- Keep existing approved management KPI cards, four supporting insight panels, and seasonal booking buildup unchanged.
- Only hide the previous month-sized demand chart **after** the protected rail is mounted and validated. If the new rail fails, restore the previously working chart automatically (fail open).
- On subsequent normal Analytics renders, the rail can be remounted from the pinned locked source without changing the base CRM.

## Release controls

1. Keep `snapshot/management-analytics-approved-20261019` as the rollback branch.
2. Develop in `feature/protected-daily-demand-rail-20261019` (not in the core CRM app).
3. Always pin exact Git commit SHA for the rail's JS and CSS. Never pin branch HEAD or moving `latest`.
4. Enforce review of protected files through GitHub CODEOWNERS and **require code-owner review** in repository branch rules. CODEOWNERS alone is not enforcement.
5. Before changing a production asset pin, run the rail's contract tests: coverage through December 2027, at most 62 rendered day cells, horizontal scrolling and month jump, correct booking and pickup series, and fallback on mount failure; re-run six KPI/four panel checks.
6. Publish a single controlled Webflow pin update, preserve the approved core Analytics commit, then verify the authenticated screen. If auth is unavailable, do not claim visual verification.
7. Never edit these protected files for typography, KPIs, customer data, seasonal pace, or other unrelated changes without explicit approval to change Daily Cake Demand.

**Previous regression cause:** combining layout cleanups with replacement of the day-by-day scrolling chart, often losing the approved experience. This document takes precedence over generic Analytics cleanup instructions.
