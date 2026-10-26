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

## Version 2: easier for untrained staff (live 26 Oct 2026, 1:07 PM, after Roneel said "deploy")
Roneel: "make it as user friendly as possible without destroying the underlying logic".
- The order types now read "Cake still to come" (ordering now, or a paper slip for a later pickup) and "Cake already picked up" (typing in an old paper slip). The sheet title, finish screen and the past-date message use the same words.
- Date step: the next 7 days and the two short-notice buttons stay. "Other date" becomes **Later date** and opens the calendar in one tap. The date field is labelled "Pickup date". The extra "Pickup in 2 weeks" and calendar buttons (`src/staff.future-pickup.js`) are no longer loaded, and the date step now fits the tablet screen without scrolling.
- Help text is 17px on tablets and 16px on phones, in the app's own touch-screen text colour. Computers are unchanged. Tap sizes follow the app's touch standard.
- No rule, check or saved field changes.
- Webflow: `ccOrderToolsLoader3` (commit 6f4b57f4) replaces `ccOrderToolsLoader2` in the staff page footer. Rollback: put `ccOrderToolsLoader2` back, or remove the loader entirely, then publish.
- Checks: `test/order-tools/test_order_tools.cjs` passes 74 of 74, with the tablet emulated as a real touch tablet. `test/run_old_orders.cjs` passes 138 of 144; the 6 differences are its checks for the old wording ("New order", "Old order", "Old order from a paper slip", "Old order saved"), which were changed on purpose. `test/run_order_flow.cjs` has the same 2 failures that were already there.

## Version 2.1: "Customer mobile number" (live 26 Oct 2026, 1:21 PM, after Roneel said "deploy")
- The order form label and placeholder "Mobile number" now read "Customer mobile number". This is a text change only.
- Webflow: `ccOrderToolsLoader4` (commit f39c0e95) replaces `ccOrderToolsLoader3`. Rollback: put `ccOrderToolsLoader3` back and publish.
- Checks: `test/order-tools/test_order_tools.cjs` passes 74 of 74. The new label, the Required tag and the typed number were checked on tablet and phone.

## Version 3: friendly wording (live 26 Oct 2026, 1:39 PM, after Roneel said "deploy")
Roneel: "humanise as much as possible".
- About 50 lines on the order form are reworded in everyday language: labels, hints, placeholders, the review step, the restart prompt and the paper slip version. For example: "Customer name", "Writing on the cake", "What are they celebrating?", "Pickup day", "Did they pay anything today?" and "Save this paper slip".
- This is text only. Buttons keep their own data, so no rule, check or saved value changes.
- Not changed, on purpose: the customer permission question (its exact words are the consent) and the slip preview (it mirrors the printed kitchen slip).
- Webflow: `ccOrderToolsLoader5` (commit 6f8d7ba8) replaces `ccOrderToolsLoader4`. Rollback: put `ccOrderToolsLoader4` back and publish.
- Checks: `test/order-tools/test_order_tools.cjs` passes 74 of 74. In `test/run_old_orders.cjs` (128 of 144) and `test/run_order_flow.cjs` (119 of 123), every failure is a check for the old wording, plus the 2 that were already failing. Saving, payments and dates all pass.

## Analytics: Birthday comeback list (live 26 Oct 2026, 3:14 PM, after Roneel said "deploy")
- New card in Analytics > Customers, placed before "What to do":
  - customers whose last birthday cake was about a year ago, with the day coming round in the next 30, 60 or 90 days, who haven't ordered since
  - three numbers: how many, how many can be messaged, and the value of their last cakes
  - a 12-month outlook chart
  - the list itself, with a WhatsApp button (friendly message ready to send) only for customers with WhatsApp permission
- "Check first" means the permission was carried over from the old order sheets and is marked for reconfirming. "Ask first" means there's no permission on record.
- Database: `crm_birthday_comeback(p_days)`, read only (`supabase/sql/crm_birthday_comeback_20261026.sql`, applied 26 Oct 2026). On that day it showed 6 people in the next 60 days, with the outlook rising to about 60 a month in June to August 2027.
- Webflow: `ccOrderToolsLoader6` (commit f3b2e767) loads `staff.order-tools.js` (unchanged) and `staff.analytics-birthday.js`. It replaces `ccOrderToolsLoader5`. Rollback: put `ccOrderToolsLoader5` back and publish.
- Checks: `test/order-tools/test_birthday.cjs` passes 39 of 39 on phone, tablet and desktop. Daily cake demand is untouched.

## Data clean-up list (shown to Roneel, nothing changed)
- 4 paper slips entered on 19–20 Oct have impossible pickup years: CC-1076 (0002-01-09), CC-1077 (0001-01-18), CC-1083 (0002-01-09) and CC-1087 (0002-01-05). The correct dates need to come from the slips. The pickup date guard released on 22 Oct now stops this from happening again.
- 27 old-sheet orders (H-) have no usable size (0, 2, 3, 4 or 50 inch), and all of them have a $0 price. These are legacy sheet records and were not cleaned, by earlier decision. Size charts should show them as "size not recorded".

## Analytics: "By booking time" view 0.3.0 (staged 26 Oct 2026, 4:05 PM, not live)
- Month names no longer overlap. Each name only uses the space up to the next month and is shortened or left out when there's no room.
- A dark tick on each day with cakes, and on upcoming days, shows the usual number of cakes for that weekday: the average of the 8 weeks before, counting empty days as 0.
- An amber dot marks days with short-notice orders a manager said yes to. Tapping a day shows "Usual for a Saturday: 8 cakes", "busier than usual" when it is, and the number of short-notice orders.
- Database: `dashboard_register` now includes `rush` (from `orders.rush_override`) for each record. This is one extra key and nothing else changes (`supabase/sql/dashboard_register_rush_20261026.sql`, applied 26 Oct 2026; 8 such orders on record).
- Loading: the page head still loads 0.2.0 (unchanged). `ccOrderToolsLoader7` (commit ace873bd) also loads 0.3.0, which takes over before Analytics opens. The page code was not edited. Rollback: put `ccOrderToolsLoader6` back and publish.
- Checks: `test/order-tools/test_leadview.cjs` passes 30 of 30 on phone, tablet and desktop, with the live page code and the file check on. Daily cake demand ("Booked and due") is compared with the live version and is unchanged.
