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

## Analytics: "By booking time" view 0.3.0 (live 26 Oct 2026, 4:52 PM, after Roneel said "deploy")
- Month names no longer overlap. Each name only uses the space up to the next month and is shortened or left out when there's no room.
- A dark tick on each day with cakes, and on upcoming days, shows the usual number of cakes for that weekday: the average of the 8 weeks before, counting empty days as 0.
- An amber dot marks days with short-notice orders a manager said yes to. Tapping a day shows "Usual for a Saturday: 8 cakes", "busier than usual" when it is, and the number of short-notice orders.
- Database: `dashboard_register` now includes `rush` (from `orders.rush_override`) for each record. This is one extra key and nothing else changes (`supabase/sql/dashboard_register_rush_20261026.sql`, applied 26 Oct 2026; 8 such orders on record).
- Loading: the page head still loads 0.2.0 (unchanged). `ccOrderToolsLoader7` (commit ace873bd) also loads 0.3.0, which takes over before Analytics opens. The page code was not edited. Rollback: put `ccOrderToolsLoader6` back and publish.
- Checks: `test/order-tools/test_leadview.cjs` passes 30 of 30 on phone, tablet and desktop, with the live page code and the file check on. Daily cake demand ("Booked and due") is compared with the live version and is unchanged.

## Seasonal items, step 1 (live 26 Oct 2026, 8:23 PM, after Roneel said "deploy")
Roneel: "special limited time items we punch in and upload in the back end and it automatically appears on the website order form", set up manually by him. Wine is a staff-only add-on at the counter. Treats-only orders are step 2.
- Settings > Seasonal items (managers): add, change, switch On or Off, reorder, remove, photo upload; price, size or pack, heading, website and counter or counter only, on-sale dates, pickup dates, days' notice, daily limit, most per order, blocked pickup days. Heading settings (name, website message, how customers pay), Add a heading, Copy for next year. "What's booked" by pickup day and "Sold so far".
- Counter order, Finish order: Festive treats row and picker; the save button shows the total with treats; Paid in full covers the treats.
- Open order: Festive treats with Add or Change treats; warns about an overpayment and asks for the kitchen slip to be printed again.
- Website order form, last step: treats on sale for the customer's pickup day with photo and plus or minus; sent with the cake request; listed on the thank-you screen.
- Kitchen slip (printed, emailed, downloaded): treats print first in the notes. Emails: a Treats line in the customer and staff emails.
- Database (applied 26 Oct 2026, every item Off, so nothing shows yet): `supabase/sql/seasonal_items_20261026.sql` and the `email_payload` treats key. A cake order and its treats save together or not at all. The daily cake limit and the protected Daily Cake Demand chart are unchanged (treats never make an order of their own). Rolled-back test: all 592 existing slips unchanged; website, sold out, notice, counter-only and paid-in-full rules checked.
- Files: `src/staff.seasonal.js`, `src/guest.seasonal.js` (commit 75b32c53), also `src/staff.service-tools.js` (Cake is ready, online orders waiting).
- Webflow: `ccOrderToolsLoader8` replaces `ccOrderToolsLoader7` (staff page). Website order page footer: one script line added before the form loader (with an integrity hash).
- `send-emails` version 28 (commit d447eafb): the live 22 Oct emails (7e1aa73b) plus the Treats line. Rollback: point the function at 7e1aa73b (version 27).
- Published to cornercafefiji.com and www.cornercafefiji.com (not webflow.io). Festive and test pages stayed in draft.
- Checks: `test/order-tools/test_seasonal.cjs` 102 of 102, `test_guest_seasonal.cjs` 39 of 39, `test_service.cjs` 39 of 39, on phone, tablet and computer; loader 8 loads all five files with the live file check and no warnings.
- Rollback: put `ccOrderToolsLoader7` back on the staff page, remove the guest.seasonal.js line from the order page footer, and publish. Switching every item Off hides treats everywhere straight away without a publish.

## Fix: Seasonal items in the Settings side list (live 26 Oct 2026, 8:32 PM, after Roneel said "deploy")
- On computers and tablets, Settings shows a side list built before Seasonal items is added, so it was missing there. `staff.seasonal.js` now adds its own entry after Cakes and prices (commit 2440fc07).
- Webflow: `ccOrderToolsLoader9` replaces `ccOrderToolsLoader8`. Rollback: put loader 8 back and publish.
- Checks: `test/order-tools/test_seasonal.cjs` 110 of 110.

## Seasonal items: section switch, first-screen treats, Seasonal sales (live 26 Oct 2026, 9:10 PM, after Roneel said "deploy")
Roneel: treats "further ahead in the form", "like the specials module ... turn it on and off as required", and "in the analytics ... Bhavin and executives will want to know how much was sold".
- Section On/Off switch on each heading (database `seasonal_groups.active`, applied; existing headings start On). Off hides every item on the website and at the counter and the database refuses them; each item keeps its own switch.
- Website, first screen: Festive treats panel above the cakes, with photos, Add and plus or minus; picks carry to the last step. "Want treats without a cake? WhatsApp us or call" line until treats-only orders (step 2).
- Analytics > Cake sales: Seasonal sales card (sales value, collected and booked, items sold, share of cake orders with treats, average per order, by item, website or counter, by pickup week). Database `crm_seasonal_sales()` (read only, applied).
- Files at commit 6ef8d4c5. Webflow: `ccOrderToolsLoader10` replaces loader 9; website order page footer points at the new guest.seasonal.js (integrity hash updated).
- Checks: test_seasonal.cjs 125 of 125, test_guest_seasonal.cjs 63 of 63; loader 10 with the live file check, no warnings. Rolled-back database trial: 5 treats, $106, booked, website.
- Rollback: loader 9 back on the staff page and the earlier guest.seasonal.js line (commit 2440fc07 is staff only; website line at 75b32c53), then publish.

## Seasonal items, enterprise layout (live 26 Oct 2026, 9:30 PM, after Roneel said "deploy")
Roneel: "make the seasonal items section enterprise level" (all eight points agreed).
- Computers and tablets: inside Settings beside the side list (no separate screen). Phones: full screen from Settings.
- Overview: on sale now, switched off or not on sale, sold this season, booked still to collect; a Needs attention banner.
- Item table with filters (All, On sale, Off, Counter only, Needs attention); cards on narrow panels. Checks: no photo, no end date, dates passed while On, On while the section is Off, nearly sold out or sold out for an upcoming day.
- Bulk: select items, Switch On, Switch Off, Set dates (empty boxes keep each item's own date). Each item is saved through the same database checks.
- Editor in sections (Details, Photo, Availability, Limits, On sale) with a live preview (website card, counter, kitchen slip) and change history (who, what, when, 12-hour time).
- What's booked: by pickup day against each daily limit (amber from 80%, red when full).
- Typing in this section does not mark Settings "Not saved yet", and a half-typed item survives a Settings redraw.
- Commit 1784e025; Webflow `ccOrderToolsLoader11` replaces loader 10. Checks: test_seasonal.cjs 158 of 158. Rollback: loader 10 back and publish.

## Treat orders: festive treats without a cake (live 26 Oct 2026, 10:27 PM)
Roneel: "make the special items section into a separate module above the cakes section, so customers fill it and request, basic details with items. Leave the current cake form separate."
- Website order page: a separate Festive treats module above the cake form (photos, Add and plus or minus, pickup day chips from the item notice days, pickup times from collection hours in 12-hour format, name, mobile, note). It is saved as a treat order (T-1001…) and shows a thank-you with the reference. The module is hidden while the section is Off or nothing is on sale. A half-filled request comes back after a reload. The first-screen panel is removed; the add-on at the cake form's last step stays.
- Service Hub: a Today banner (new requests, to collect today or this week, not collected); the Treat orders board (To do, Today, All; grouped by pickup day with day totals; Confirm, Record payment, Collected with a check when money is owing, Cancel with a reason and a refund reminder, Print slip, Call, WhatsApp); New treat order for the counter (saved as confirmed, paid now or at pickup); a Treat orders button in Settings > Seasonal items.
- Analytics: Seasonal sales counts treat orders and shows with a cake or treats only.
- Type weight by device on these screens: lighter and smoothed on phones, a step heavier on tablets, computers unchanged.
- Database (applied): `supabase/sql/treat_orders_20261026.sql`. New tables treat_orders, treat_order_items, treat_order_events; each item's daily limit counts cake orders and treat orders together. Cake orders, Daily Cake Demand and the daily cake limit are untouched. Rolled-back trial passed (online order, resend not doubled, wrong slot refused, wine counter only, notice days, shared limit, board actions, counter order, sales totals). Reference counter reset so the first real order is T-1001.
- Commit 13bb4569. Webflow: `ccOrderToolsLoader12` replaces loader 11 (six files, live file check passed); the website order page footer points at the new guest.seasonal.js (integrity sha384-qXdOVftz…).
- Checks: test_treat_orders.cjs 61 of 61, test_guest_seasonal.cjs 82 of 82, test_seasonal.cjs 158 of 158, test_service.cjs 39 of 39, on phone, tablet and computer.
- Not included: no email for treat orders yet (staff see them on the Today banner and the board).
- Rollback: loader 11 back on the staff page, the guest.seasonal.js line back to commit 6ef8d4c5 (integrity sha384-Gtgebv7J…), publish. The database tables can stay; nothing reads them without the new files.

## Calmer Analytics and simpler treat orders (staged 26 Oct 2026, 11:20 PM, not published)
Roneel: "humanise the analytics section, the texts are too much. It has to be sleek yet powerful, so decisions can be made from it." And for treat orders: "powerful engine and slick interface; the more the details, the more staff will get confused."
- Analytics (`src/staff.analytics-focus.js`, new): "What to do now" first on each tab; number cards keep a second line only where it changes the decision (Still owed, Not confirmed, To collect); card subtitles and footnotes behind a small "i" (54px on tablets, 48px on phones); secondary charts moved into Details > More charts (Cake sales: Busiest pickup days, Money; Cakes: Flavours, Favourite cake by occasion; Customers: How they ordered; Planning: Order stages, When cakes are collected; Occasions: month table, booking curve, lead-time table, year on year, what the data shows, data gaps); Occasions filters behind one Filter button, four numbers, a simple orders-by-month chart; tabs with no data hidden; Overview insight cards keep the reason behind "i". Visible words per tab: Cake sales 241 to 155, Cakes 252 to 108, Customers 232 to 154, Occasions 475 to 116, Planning 384 to 260. Figures, calculations, downloads, Cake Heartbeat and Daily Cake Demand unchanged.
- Treat orders board: one summary line; Today (new requests, today's pickups, earlier ones not handed over) and Coming up; each card shows time, name, what to hand over, any note, one plain status line, one next-step button (Confirm, Take payment, Hand over) and More (call, WhatsApp, print slip, cancel, reference and totals); payment is method then Paid (a different amount is optional); "Collected" is now "Hand over"; New treat order in three steps (Treats, Pickup, Customer) with a recap.
- Website treats: three steps (pick treats, pickup day and time, your details) with a recap and Change; More days and Add a note tucked away; summary before sending; thank-you "Vinaka, Mere! We will WhatsApp or call you to confirm."
- Commit 7dc355ab. Webflow: `ccOrderToolsLoader13` replaces loader 12 (seven files, live file check passed); website order page footer points at the new guest.seasonal.js (integrity sha384-cRH5Zzjl…).
- Checks: test_analytics_focus.cjs 75 of 75, test_treat_orders.cjs 73 of 73, test_guest_seasonal.cjs 94 of 94, on phone, tablet and computer.
- Rollback: loader 12 back on the staff page and the guest.seasonal.js line back to commit 13bb4569 (integrity sha384-qXdOVftz…), then publish.
