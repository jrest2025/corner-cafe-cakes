# Release 7 Nov 2026, 12:49 PM Fiji (approved by Roneel, "deploy")
- New order: "Who is taking this order?" is back (required, first on the Customer step, names used on the device are one-tap buttons, none picked in advance). Saved on the order with order_set_taken_by before the finish screen; history shows "Order taken by". It had been missing since the 3 Nov release (0 of 7 staff orders from 4 to 6 Nov have a taker); those orders need the taker added by staff.
- Staff app: Vercel production deployment dpl_4pox7NwAxHdX4Zc3Y2sR1Yr7Rmsy from branch release/order-taker-asset-20261107 (commit 74aa4af; same URL staff-app-complimentary-20261030.js; staff-app.0dcf4523b7.js). The build of main before this change matched the live file byte for byte. Checked after release: the served file has the same fingerprint, and the live staff page shows the question.
- Rollback: Vercel rollback to dpl_BQUc7PCdS68emsSEjFXk2Chpnw3L.
- Add-ons loader, Webflow page and database unchanged.

# Release 5 Nov 2026, 6:06 PM Fiji (approved by Roneel, "deploy")
- Settings home: Copy of customer emails sits under Alerts and communications; Bank details for customer emails has a new Payments group (no more "Other"). PR #53.
- Add-ons loader: `ccordertoolsloader88` (docs/loader88.js) on the staff page (6aca162870735ac2247de4dd), add-ons from commit 42ae8fe. Only staff.admin.js changed; every other add-on is byte-identical to loader 87's a748f68 and keeps its checksum. Corner Café site published to cornercafefiji.com and www (no other page had changed since 31 Oct).
- Note: the staff page holds at most 15 scripts. To swap loaders, remove the old one first, then add the new one, then publish.
- Rollback: remove ccordertoolsloader88, add ccordertoolsloader87 (version 1.0.87, footer), publish.

# Release 5 Nov 2026, 5:50 PM Fiji (approved by Roneel, "deploy")
- Copy of customer emails: up to 10 addresses (was three), entered one per line in Settings. PR #52.
- Database: migration customer_email_copy_limit10_20261105 (admin_email_copy_save only).
- Email sender: send-emails v33 pins commit 407b620, loaded from raw.githubusercontent.com because jsDelivr returned 403 for this commit at release time (same pinned commit). Checked after release: a queue check returned ok with nothing claimed. Rollback: import the v32 jsDelivr URL at 71cb1af190592ad7ed08d13dd8a1de23fc8393fb.
- Staff app: Vercel production deployment dpl_BQUc7PCdS68emsSEjFXk2Chpnw3L from branch release/customer-email-copy-10-asset-20261105 (commit c3bc7e3; staff-app.ac5f5d616c.js, only that Settings section changed). Rollback: Vercel rollback to dpl_DU3EKCLWWr92goFjDjUuYE3kTcqa.

# Release 5 Nov 2026, 5:40 PM Fiji (approved by Roneel, "deploy")
- Settings, Copy of customer emails (admins only, every change in the audit log): up to three addresses get a separate "Copy:" email of every customer email, with no unsubscribe link or header; customers never see these addresses. Empty = off (starting state). Skipped in test mode. PR #51.
- Database: supabase/sql/customer_email_copy_20261105.sql, applied as migration customer_email_copy_20261105 (app_config guest_email_copy, admin_email_copy, admin_email_copy_save).
- Email sender: send-emails v32 pins commit 71cb1af (built on v31, commit f82bfc0). Checked after release: a queue check returned ok with nothing claimed. Rollback: point the import back at f82bfc0de7bd327ae8a4fc0b087592041edc339d.
- Staff app: Vercel production deployment dpl_DU3EKCLWWr92goFjDjUuYE3kTcqa from branch release/customer-email-copy-asset-20261105 (commit 5c56489; same URL staff-app-complimentary-20261030.js; staff-app.b332279a07.js, only the new Settings section added). Rollback: Vercel rollback to dpl_HYDecZ24fMPvUxosnYd23T6C3U7Q.

# Release 5 Nov 2026, 5:25 PM Fiji (approved by Roneel, "deploy")
- Custom cake quote and approval wording: Set price, Save quoted price, Email the quoted price (emailing is not approval), Record approval and confirm, "How did the customer approve the design and price?"; kitchen line now says staff make the kitchen slip after confirming. Wording only: statuses, emails, deposit and kitchen logic unchanged. PR #50.
- Staff app: Vercel project corner-cafe-staff-assets, production deployment dpl_HYDecZ24fMPvUxosnYd23T6C3U7Q from branch release/custom-cake-quote-asset-20261105 (commit 7a2e035; same URL staff-app-complimentary-20261030.js). Built from src at 7b79aed (staff-app.5973d6c9cf.js); the build of main before this change matched the live file byte for byte. Rollback: Vercel rollback to dpl_7oEUqsVGPykiX4XkFZR1UiapTTDp.
- Add-ons loader, Webflow page and database unchanged.

# Release 3 Nov 2026, 10:00 PM Fiji (approved by Roneel, "deploy")
- Delivery: staff can type an Other area with its own charge, or give a listed area a Different amount with a reason; both go in the order history. Website guests unchanged (listed areas, set charge).
- Bank details: Settings, Bank details for customer emails (admins only, audited). Order confirmed, Order updated and Deposit needed emails show a Pay by bank transfer box with the order number as the reference and the 2% card surcharge note.
- Database: supabase/sql/delivery_flex_bank_20261103.sql, run by Roneel in the SQL Editor (checked afterwards).
- Email sender: send-emails v31 pins commit f82bfc0 (built on the live v30, commit 166b08c). Rollback: point the import back at 166b08cccea3a690df1b2186d9ed46bb444e71b7.
- Staff app: Vercel project corner-cafe-staff-assets, production deployment dpl_7oEUqsVGPykiX4XkFZR1UiapTTDp from branch release/delivery-bank-asset-20261103 (same URL staff-app-complimentary-20261030.js, loaded by the site script cake_delivery_waiver_release). Rollback: Vercel rollback to dpl_9XrnQHjHJnQ7GcumbjkQpqPAGGbb.

# What is live (checked 31 Oct 2026, 12:30 PM Fiji)

The live website loads each file from a fixed saved version (commit). This copy of main holds exactly those versions,
so main now matches what customers and staff see. Every older branch is kept in the branch `archive/all-branches-20261031`.

## Staff app (cornercafefiji.com/cake-orders-staff)
- Main app bundle: https://corner-cafe-staff-assets.vercel.app/staff-app-complimentary-20261030.js, built from `src/staff.js` (complimentary delivery release, 30 Oct).
- Add-ons loader: `ccordertoolsloader88` since 5 Nov 2026 (see the release above); before that `ccordertoolsloader87` (31 Oct 2026, 2:02 PM). Add-ons from commit eaf7dc8 (same as 087b0a8 except `staff.polish.js` (shell tidy), `staff.pickups.js` and `staff.cake-lead-time.js` 0.4.0 (distinctive colours)); treat orders from 3233aa4. Asset list: `ccAssetManifestAll4` (adds the two analytics workspace files).
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
| `src/staff.demand-rail.locked.css` | 73abc04a |
| `src/staff.demand-rail.locked.js` | 73abc04a |
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
