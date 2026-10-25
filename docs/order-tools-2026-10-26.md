# Order tools: cancel with a reason, paper slips for later pickups (26 October 2026)

## What staff get
- **Cancel order** sits beside the order's main buttons. Before this, it was only inside the History tab under Other actions, where nobody found it.
- Staff tap why: Customer cancelled, Duplicate order, Date or time not available, Deposit not paid, Kitchen cannot make it, Other. Other needs a few words. The reason is saved in `orders.cancel_reason`.
- The existing rules stay as they were: paid orders still need a manager or admin, and the history records who cancelled and why.
- **Old order from a paper slip** is still only for cakes already picked up. Beside its pickup date: "Cake not picked up yet?" and **Switch to New order**. This keeps everything typed and uses the slip date as the day they ordered.
- This morning's future pickup buttons, "Choose pickup date (calendar)" and "Pickup in 2 weeks" (`src/staff.future-pickup.js` at 92e4221), load with it.

## Pieces
- `src/staff.order-tools.js` (commit 2a3a3c94). This is presentation only and uses the app's own buttons and checks.
- Database: `supabase/sql/order_cancel_reason_20261026.sql`, applied live on 26 Oct 2026. It adds `orders.cancel_reason` and `_cancel_reason_code(note)`. `staff_order_action` now also records the reason; nothing else in it changed. This was tested in a rolled-back transaction.
- Webflow staff page (scripts, not page code):
  - `ccOrderToolsLoader2` (footer) loads both files and adds their fingerprints.
  - `ccAssetManifestAll` (header) replaces `ccAssetManifestA` and `ccAssetManifestB`, with the same 23 fingerprints. This keeps the page within Webflow's 15-script limit.

## Checks
- `test/order-tools/test_order_tools.cjs`: 65 of 65 pass on phone, tablet and desktop, with the live app and the file check on.
- `test/run_old_orders.cjs`: 144 of 144 pass with the add-ons.
- `test/run_order_flow.cjs`: the same 2 date-label checks fail with or without the add-ons. They were already failing before this change.

## Rollback
1. Remove `ccOrderToolsLoader2` from the Cake Orders – Staff page and publish. The app goes back to exactly what it was.
2. The database column can stay. The old screen ignores it, and typed cancellations are saved as `other`.

## Live
Published on 26 October 2026 at 11:47 AM Fiji time (cornercafefiji.com and www.cornercafefiji.com, not webflow.io), after Roneel said "deploy". Festive and test pages stayed in draft.
