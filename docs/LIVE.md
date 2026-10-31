# What is live (checked 31 Oct 2026, 12:30 PM Fiji)

The live website loads each file from a fixed saved version (commit). This copy of main holds exactly those versions,
so main now matches what customers and staff see. Every older branch is kept in the branch `archive/all-branches-20261031`.

## Staff app (cornercafefiji.com/cake-orders-staff)
- Main app bundle: https://corner-cafe-staff-assets.vercel.app/staff-app-complimentary-20261030.js, built from `src/staff.js` (complimentary delivery release, 30 Oct).
- Add-ons loader: `ccordertoolsloader74` (31 Oct 2026, 12:57 PM). Add-ons from commit 3bbf958 (same as 087b0a8 except `staff.polish.js` (shell tidy), `staff.pickups.js` and `staff.cake-lead-time.js` 0.4.0 (distinctive colours)); treat orders from 3233aa4. Asset list: `ccAssetManifestAll2` (adds the two analytics workspace files).
- Rollback: put back `ccordertoolsloader73` (or 71 with `ccAssetManifestAll`) on the staff page, publish.

| File | Live commit |
|---|---|
| `dist/analytics/approved-dashboard-stable.css` | 3fb6a2e1 |
| `dist/analytics/approved-dashboard-stable.js` | 3fb6a2e1 |
| `dist/app/email-templates.82a1c537ec.js` | 17dbfb9d |
| `dist/app/guest-app.cdf126b4b7.js` | 947432f3 |
| `dist/app/staff-app.d1c119f6f0.js` | bd90f95e |
| `src/guest.seasonal.js` | 07268f06 |
| `src/seasonal-demand-staging.css` | 71758a89 |
| `src/seasonal-demand-staging.js` | 71758a89 |
| `src/staff.admin.js` | 087b0a88 |
| `src/staff.analytics-birthday.js` | 087b0a88 |
| `src/staff.analytics-calm.js` | 595c7f98 |
| `src/staff.analytics-focus.js` | 087b0a88 |
| `src/staff.analytics-insights.css` | 71758a89 |
| `src/staff.analytics-insights.js` | 71758a89 |
| `src/staff.analytics-metrics.js` | 087b0a88 |
| `src/staff.analytics-workspace.css` | 8ee47424 |
| `src/staff.analytics-workspace.js` | 8ee47424 |
| `src/staff.answers.js` | 087b0a88 |
| `src/staff.cake-lead-time.css` | 595c7f98 |
| `src/staff.cake-lead-time.js` | 3bbf958a (head also loads 595c7f98) |
| `src/staff.calendar-dashboard.css` | fe3704f7 |
| `src/staff.calendar-dashboard.js` | fe3704f7 |
| `src/staff.customer-directory-v3.css` | 17e9a139 |
| `src/staff.customer-directory-v3.js` | 17e9a139 |
| `src/staff.date-picker.css` | e414d14d |
| `src/staff.date-picker.js` | e414d14d |
| `src/staff.demand-rail.locked.css` | fd6e6fa6 |
| `src/staff.demand-rail.locked.js` | fd6e6fa6 |
| `src/staff.finish-flow.css` | 7103cd83 |
| `src/staff.finish-flow.js` | 7103cd83 |
| `src/staff.flow.js` | 087b0a88 |
| `src/staff.ipad.js` | 087b0a88 |
| `src/staff.marketing-campaigns.css` | 75642a18 |
| `src/staff.marketing-campaigns.js` | 75642a18 |
| `src/staff.new-order-clarity.css` | 0af0f630 |
| `src/staff.oldentry.js` | 087b0a88 |
| `src/staff.order-tools.js` | 087b0a88 |
| `src/staff.pickups.js` | 3bbf958a |
| `src/staff.polish.js` | 3bbf958a |
| `src/staff.relationship-profile.css` | 40e1cf19 |
| `src/staff.relationship-profile.js` | 40e1cf19 |
| `src/staff.seasonal-heartbeat.js` | e04dc4fc |
| `src/staff.seasonal.js` | 087b0a88 |
| `src/staff.semantic-colour.css` | e7a032ec |
| `src/staff.service-tools.js` | 087b0a88 |
| `src/staff.treat-orders.js` | 3233aa46 |
| `src/staff.welcome.js` | 087b0a88 |

## Website
- Order a Cake and /festive: `src/guest.seasonal.js` at 07268f0 (with SRI); order form `dist/app/guest-app.cdf126b4b7.js` at 947432f.
- /festive page footer: `src/festive/festive-page-footer.html`; SEO data `src/festive/festive-jsonld.json`.

## Rule for every release
1. Build from main. 2. Preview. 3. Deploy only on Roneel's "deploy". 4. Merge the release into main the same day and update this file.
