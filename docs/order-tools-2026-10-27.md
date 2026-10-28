# Order tools release notes, 27 October 2026

## Refined lines and icons (live 27 Oct 2026, 7:38 AM; includes the 26 Oct polish round)
Roneel: "what can be done to make it feel more refined, like icons, more refined lines"; "website order could just have the website icon instead of the word, walk-ins could show a person walking icon, and so forth."
- Lines: one hairline border colour, one corner size for cards, slim 3px status edges (order cards, Kitchen Next priority and Needs attention, Analytics "What to do", Treat orders), no heavy black outlines or 2px dividers, quiet shadows, a gentle lift only on tappable cards, one navy focus ring, a light press effect.
- Channel: an icon badge in lists instead of the word (globe for Website order, walking person for Walk-in, phone, chat for WhatsApp, share for Social media, building for Corporate). The name is the badge's label for hover and screen readers; the order details keep the words.
- Icons: status tags (hourglass waiting, tick done, warning late or changed, truck delivery, coins money owing, pen custom), Customers number cards (in place of the text arrow), page titles (the sidebar's icon), order date blocks, empty states.
- Numbers: even-width figures so money and counts line up; big numbers lighter (650). Tables: quiet grey header in normal case, hairline rows. Analytics number cards: one navy mark instead of four colours. Stray "·" separators removed.
- Cake Heartbeat and Daily Cake Demand: excluded; computed styles checked identical with and without the change (601 elements).
- Commit c19c61fe. Webflow `ccOrderToolsLoader15` replaces loader 14 (eight files, live file check passed).
- Checks: test_polish.cjs 77 of 77, test_service.cjs 39 of 39, on phone, tablet and computer.
- Rollback: loader 13 (last published) back on the staff page and publish.

## Icons instead of words; Analytics Section dropdown (live 27 Oct 2026, 8:03 AM)
Roneel (with phone screenshots): "if it's delivery then just have the vehicle icon instead of the word delivery, use icons instead of words wherever possible."
- Delivery and collection: a vehicle or bag icon instead of the word, in the order details (next to the date), order lists and Kitchen. Custom: a pen icon. The channel badge (walking person, globe, phone...) is now also in the order details. Each icon keeps its word as a label (hover, long-press, screen readers).
- Order details: Call shows a phone icon and the number; WhatsApp is the chat icon; "Print kitchen slip" is "Print slip" with a printer; icons on the Cake, Delivery, Kitchen, Customer, Feedback, Payment and History tabs.
- Kept as words on purpose: allergy and dietary (safety), payment and order status (Unpaid, Part paid, Confirmed), warning banners.
- Analytics on phones and tablets: one "Section" dropdown (with icons) replaces the two rows of buttons (the five category buttons from the "Cake Analytics Cockpit Navigation" Webflow script and the tab row). Computers keep the rows. Empty sections are not listed.
- Tests now load the scripts registered on the live staff page (sources read from Webflow, `test/fixtures/registered-footer.html`), so they see what staff see. Found in passing: the live page's file check logs "Unlisted add-on file" for the older Analytics workspace script (commit 8ee47424); this was already the case and is not from this release.
- Commit 9fe660dc. Webflow `ccOrderToolsLoader16` replaces loader 15.
- Checks: test_polish.cjs 96 of 96, test_treat_orders.cjs 73 of 73, test_service.cjs 39 of 39, test_seasonal.cjs 158 of 158, on phone, tablet and computer, with the live page scripts.
- Rollback: loader 15 back on the staff page and publish.

## Icon tiles coloured by meaning (live 27 Oct 2026, 8:37 AM)
Roneel (phone screenshot of Today): "are the icons properly coloured?" Answer: no; seven colours (pink, red, amber, brown, blue, purple, teal) with no meaning, two near-identical oranges, colour on zero, solid blocks next to light tints.
- One style: light tint with a thin-line icon in the same colour; no solid blocks.
- Colour by meaning: red urgent or late; amber to do or money owed (To do and Payments to collect now the same amber); green done or ready; navy plain information (Due today, Next 7 days, Booked this week, This week, Coming up, Next priority); grey when the number is 0.
- Today (Needs attention, number cards, section headings) and Kitchen (Next priority, counts, Needs attention, Later this week). Cake Heartbeat and Daily Cake Demand not touched.
- Commit c862899f. Webflow `ccOrderToolsLoader17` replaces loader 16. Checks: test_polish.cjs 99 of 99 with the live page scripts.
- Rollback: loader 16 back on the staff page and publish.

## Icon tiles: deeper, balanced fills (live 27 Oct 2026, 9:00 AM, with phase 1)
Roneel: "now the icons look hidden and blended in"; "needs to follow colour theory, and make the filling a little darker".
- Deeper fills, each colour at the same depth (about 1.4:1 against white, so no colour is louder than another); a thin edge in the same colour; icon colour at least 5:1 against its fill; icons 60% of the tile and slightly bolder (2.2 line).
- Red #F8CFC9 / icon #9E1F14; amber #F7D9A6 / #8A4504; green #BCE6CC / #05603A; navy #CADAEE / #1A4570; grey #D8DEE6 / #3E4A5C.
- Commit d1636afe. Webflow `ccOrderToolsLoader18` replaces loader 17. Checks: test_polish.cjs 99 of 99.
- Rollback: loader 17 back and publish.

## Phase 1: Today and Orders, action first (live 27 Oct 2026, 9:00 AM)
Roneel: "the same philosophy applied across the board"; "proceed and deploy" (phase 1 of 3).
- Rules: what needs action first; weight follows importance; say it once; one card layout (icon left, number, label); colour only means something.
- Today: Needs attention as full-width cards, icon left, number and label on one line, the orders listed under it. Summary row of three slim tiles (Due today, Payments to collect, Next 7 days); a 0 goes grey. "Booked this week" removed from Today (it is in Analytics). An empty "Due today" panel is hidden (the 0 above says it once). Week strip: today in soft navy, empty days blank, all seven days fit (a small count on phones). Next-step labels soft navy instead of black. Customer names in full.
- Orders: tabs with nothing in them go quiet.
- Includes the deeper icon tiles. Commit 8d0a6439. Webflow `ccOrderToolsLoader19` replaces loader 18.
- Checks: test_polish.cjs 105 of 105, test_service.cjs 39 of 39, with the live page scripts.
- Rollback: loader 17 (last published before this) back on the staff page and publish.
- Next: phase 2 (Kitchen and order details), phase 3 (Customers and Analytics).

## Phase 2: Kitchen and order details (live 27 Oct 2026, 9:13 AM)
- Kitchen: Next priority stays the hero; the three counts use the Today summary card (icon left, number, label under); "None left / None waiting / Nothing booked" goes grey. Empty sections were already left out by the app.
- Order details: one warning line, the most serious (red) first; the rest behind "+1 more" (and "Show less"). The next step stays the main button.
- WhatsApp in its own green (Roneel: "message icons, if related to WhatsApp, should have the associated colour"): the WhatsApp button in order details, the WhatsApp channel badge, and WhatsApp on the Treat orders board. Other message icons stay navy.
- Commit 3d23ec0f. Webflow `ccOrderToolsLoader21` replaces loader 19 (loader 20 was an earlier stage of this). Checks: test_polish.cjs 117 of 117, test_service.cjs 39 of 39.
- Rollback: loader 19 back and publish.

## Phase 3: Customers and Analytics (loader 22, commit 5d02434e)

- Customers: "Follow-ups due" action list above the numbers (up to 3 due or late, read-only via `my_followups`; tap opens the customer, "See all" opens Follow-ups). Hidden when nothing is due.
- Customers: number cards in one slim row (icon left, number, label); the "Follow-ups due today" card hides while the list shows it; zero goes grey.
- Customers on phones: section tabs (Customers / Follow-ups / Insights) no longer squash icons into words; they scroll sideways.
- Analytics: number cards use the shared card (icon left, colour by meaning: amber for money owed / not confirmed, navy otherwise, grey for zero). Cake Heartbeat and Daily Cake Demand untouched.
- Treat orders board: status line carries an icon coloured by meaning (to confirm / to pay = amber, late = red, paid / handed over = green, cancelled = grey); summary gets a tile; selected tab is soft navy.
- No data, rules or workflow changes. Festive treats section stays Off.
- Rollback: remove ccOrderToolsLoader22 from the staff page, add ccOrderToolsLoader21 (footer, 1.0.0), publish.

## Analytics: charts over text (loader 23, commit 82185f1c) — live 27 Oct 2026, 10:38 AM

- Customers: "New and returning" split bar becomes a donut; legend taps unchanged.
- Planning: "Largest orders" shows a value bar per order (tap still opens the order); "· 2 cakes" dropped; number-card captions hidden.
- Cakes: "Top cake" card hidden (it repeats the first bar of Cakes ranked); number row becomes three columns.
- Cake sales: "Gross profit appears once cake costs are added" moves behind an "i" (tap to show the note and its link).
- Occasions: Orders, Revenue, Median lead time, Peak month use the shared card with icons; small subtitles hidden.
- Business intelligence block: same cards and icons, captions hidden; "Occasion not recorded" is amber (to do).
- Phones: day charts (Sales by day, Cakes due) keep readable columns and scroll sideways.
- Untouched: data, rules, Overview, Cake Heartbeat, Daily Cake Demand, Festive treats switch (Off).
- Rollback: remove ccOrderToolsLoader23, add ccOrderToolsLoader22 (footer, 1.0.22), publish.

## Cake Heartbeat renamed Cake Pulse (loader 24, commit 864861bd) — live 27 Oct 2026, 11:20 AM

- Title, screen-reader label, loading and error lines read "Cake Pulse". Chart, data, range switch, holiday markers and Daily Cake Demand unchanged.
- Holds through 7 / 30 / 90 day switches (re-applied after each chart render).
- Reservations Hub and Kazumi Service Hub still say "Heartbeat"; to rename separately in those apps.
- Rollback: remove ccOrderToolsLoader24, add ccOrderToolsLoader23 (footer, 1.0.23), publish.

## Channel badge fix (loader 25, commit 5c2d3a99) — live 27 Oct 2026, 12:21 PM

- Channel icons (walk-in, website, WhatsApp...) centred in their circle everywhere, including the Today pop-ups (To do, Due today).
- In Today pop-up rows the badge sits on the right of the row instead of on its own line.
- Badges are soft navy (plain information), WhatsApp keeps its green; slightly bolder strokes so they never blend in.
- "Collect balance first" tag is amber (money owed) instead of blue.
- Rollback: remove ccOrderToolsLoader25, add ccOrderToolsLoader24 (footer, 1.0.24), publish.

## Order details and customer profile flow (loader 26, commit 9e91dd28) — live 27 Oct 2026, 1:22 PM

Order details (every state):
- Top colour strip follows the colour rule and matches the warning: red urgent, amber to do, green completed, grey cancelled (was amber on completed orders, red on amber warnings).
- Payment said once: the Paid / Part paid chip in the header goes; the payment line stays. "To pay" reads amber when money is owed; a cancelled order shows its figures in grey and no "To pay".
- Status dot takes its chip colour (green on Completed).
- Next step first: completed orders lead with Customer feedback; other orders keep it in More options unless a concern is waiting.
- Risky or rare actions behind one "More options" line (closed by default, dangerous last, red outline): Delete order, Cancel order, and Correct this order on finished orders. Duplicate Delete links at the bottom hidden.
- Main buttons (Confirm order, Order completed) solid navy instead of near-black.
- Call row: number on one line; WhatsApp a compact green button beside it.
- Soft lines on the cake card; selected detail tab soft navy; when-tile navy.

Customer profile:
- Mark as favourite becomes a heart in the header (pink when on).
- Number cards: Orders and Collected spend as plain white cards (average moved under the total); Usually orders and Occasions cards hidden (listed just below).
- WhatsApp button green; "+ +" on New order fixed; pink eyebrow and avatar calmed to grey/navy.
- Delete customer behind More options, red outline (was a solid navy main button).

No data, rules or permissions changed. Rollback: remove ccOrderToolsLoader26, add ccOrderToolsLoader25 (footer, 1.0.25), publish.

## Plain words round (loader 27, commit d8f48e55) — superseded by loader 28 (went live together with the iPad shell)

Word list (display only; data and rules unchanged):
- Status: Check order → New (amber) · Needs a price → Needs price (amber) · Waiting for customer → Waiting (navy) · Waiting for deposit → Deposit due (amber) · Confirmed (navy) · Completed → Done (green) · Declined / Cancelled (grey). Kitchen stage chips drop "Kitchen:" and show a chef icon.
- Next step (icon + 2-4 words): Check & confirm · Add price · Waiting on customer · Take deposit · Take $X / Take balance · Take $X, hand over · Hand over · Deliver · Mark completed · Waiting on kitchen · All done.
- Phone list flag: New · Add price · Take deposit · Waiting · To pay · Paid · Due soon · Overdue · Allergy (with icons).
- Kitchen step buttons: Plan · Prep · Bake · Baked · Decorate · To check · Ready (full sentence kept as the tooltip).

Screens:
- Orders cards: status always visible; "Confirmed" gives way to the kitchen stage; payment chip hidden when the next step says it; up to three chips plus +n.
- Today: long greeting sentence, repeated summary cards, backup notice and the follow-ups line removed; week cells show a small count pill and no longer stretch; "Due in …" pill sized to its text.
- Order details: next-step chip only when there is no main button (no "Take $26" twice); completed orders show "All done" first; cake summary card hidden (the Cake tab shows it); four tabs — Cake, Collection/Delivery, Payment, More (Kitchen, Customer, Feedback, History).
- Kitchen: empty week days show only a dash.
- Rollback: remove ccOrderToolsLoader27, add ccOrderToolsLoader26 (footer, 1.0.26), publish.

## Live 27 Oct 2026, 2:51 PM: loader 28 (commit 8d9e0515) = plain words round + iPad shell
- Files: the eight add-ons plus src/staff.ipad.js (marker __ccIpad20261027). Details: docs/ipad-shell-2026-10-27.md.
- Rollback: remove ccOrderToolsLoader28, add ccOrderToolsLoader26 (footer, 1.0.26), publish. (Loader 27 = plain words only, without the iPad shell, if only the iPad part needs undoing.)

## iPad Today layout (loader 29, commit e04c2e71) — live 27 Oct 2026, 3:13 PM
- iPad only (src/staff.ipad.js). Order: header in one row (greeting left, New order / Find an order right) → online-order banner full width, one slim line (title · order · Open; the explanation sentence hidden) → numbers row (Due today, Payments to collect, Next 7 days) → two columns: left Needs attention then Due today; right This week then Waiting on you.
- Landscape columns use a measured masonry (each block spans its own height) so neither column leaves a hole; portrait is one column in the same order.
- Computers and phones unchanged. Tests: test_ipad 91/91 (new Today order and no-gap checks at 1180×820, 1024×768, 820×1180), test_polish 148/148.
- Rollback: remove ccOrderToolsLoader29, add ccOrderToolsLoader28 (footer, 1.0.28), publish.

## One flow on every screen and device (loader 30, commit 8d869027) — live 27 Oct 2026, 4:05 PM
- New add-on src/staff.flow.js (marker __ccFlow20261027). Layout only; data, saving, permissions untouched.
- Today (computers, phones): online-order banner one slim full-width line under the header; phones run header → banner → numbers → Needs attention → Due today → This week → Waiting on you.
- Orders (computers, iPads): search and status tabs on one row; order cards two across on wide screens and iPad landscape.
- Customers: one-line top bar, reminders as a bell with its count; Follow-ups due beside the numbers on wide screens (duplicate "Follow-ups due today" number hidden); table fits narrower screens; phones show the three numbers in one slim row.
- Handover: header first, then the waiting-note line; count tiles in one slim row (5 / 3 / 2 across by width); notes beside the write box on wide screens.
- Kitchen: Today/Board switch and the late-cakes line share one row (computers, iPads). Register: numbers and review tabs share one row (computers, iPad landscape).
- Phone More menu: icon tiles with the words underneath (same icons as the side menu), Practice mode as a tile, password and sign out side by side.
- Tests: test_ipad 86/86, test_polish 148/148, test_flow 20/20 with the new file loaded.
- Rollback: remove ccOrderToolsLoader30, add ccOrderToolsLoader29 (footer, 1.0.29), publish.

## Island alignment and sizing (loader 31, commit 326a4a5a) — live 27 Oct 2026, 4:22 PM
- src/staff.flow.js: number tiles and Needs attention islands share one icon box (40px), number size (26px) and label size (16px), icon left with number over words on computers and iPads; cards sharing a row share a height on computers (Needs attention ↔ This week, Due today ↔ Waiting on you); order names inside islands end with "…" instead of spilling out.
- Tests: test_ipad 86/86, test_polish 148/148 with the file loaded.
- Rollback: remove ccOrderToolsLoader31, add ccOrderToolsLoader30 (footer, 1.0.30), publish.

## Today: Act now (loader 32, commit 01810743) — live 27 Oct 2026, 4:37 PM
- src/staff.flow.js: one "Act now" list (urgent first) built from the app's own attention items, plus any Waiting on you or waiting online order not already listed; replaces the online-order banner, the Needs attention islands and Waiting on you. Waiting time shown on the order's line. Due today and Next 7 days tiles removed (week heading shows "N this week"); Payments to collect beside the week; summary sentence hidden. Same order on computers, iPads and phones.
- Tests: new test_act_now.cjs 42/42 (each order once, nothing overlaps, tapping a line opens the order). The older Today checks in test_ipad/test_polish describe the previous Today and still pass without staff.flow.js loaded; to be updated.
- Rollback: remove ccOrderToolsLoader32, add ccOrderToolsLoader31 (footer, 1.0.31), publish.

## Admin console Step A — live 27 Oct 2026, 7:45 PM (approved: "deploy")
- Registered script `ccOrderToolsLoader34` (footer, 1.0.34) replaces loader 33: the same 11 files (fingerprints unchanged) plus `staff.admin.js` (fingerprint 08ce240e…) at commit 1870847c.
- Settings opens on an overview: six groups with live status, search, Needs attention, group tabs with a path back, longer explanations behind "i". Sections, saving and permissions unchanged.
- Fix on the way: the "i" button works with today's add-ons (the header status is read without the button).
- Checks: test_admin 122/122 (desktop, iPad portrait and landscape, manager, phone).
- Rollback: remove ccOrderToolsLoader34, add ccOrderToolsLoader33 (footer, 1.0.33), publish.

## Welcome screen — live 27 Oct 2026, 7:59 PM (approved: "deploy")
- `ccOrderToolsLoader35` (footer, 1.0.35) replaces loader 34: the same 12 files plus `staff.welcome.js` (fingerprint f1b26ebe…) at commit ff0f0ac2.
- Espresso welcome around the app's own sign-in form: counter scene, Fiji time-of-day greeting and light, show password, Caps Lock note, last email on the device filled in ("Welcome back."), short fade into the app. Sign-in, messages and Practice mode unchanged.
- Checks: test_welcome 17/17 (desktop, iPad, phone: wrong password, sign in, show password, returning staff, Practice mode).
- Rollback: remove ccOrderToolsLoader35, add ccOrderToolsLoader34 (footer, 1.0.34), publish.
- 8:03 PM: rolled back to ccOrderToolsLoader34 at Roneel's request ("looks horrible"). Welcome screen off; Admin console stays.

## Sign-in splash, Marketing Central format (loader 36, 27 Oct 2026, 9:24 PM)

- Approved by Roneel ("deploy", 9:20 PM) after the preview with the meal line and bottom strip removed.
- `ccOrderToolsLoader36` (footer, 1.0.36) replaces loader 34: the same 12 files (fingerprints unchanged) plus
  `staff.signin.js` (fingerprint b55775a4…) at commit e360f8b7. Built by `build/staff_signin.py`; test
  `test/order-tools/test_signin.cjs` 16/16 (desktop, iPad, phone: wrong password, show password, sign-in, Practice mode).
- Espresso room lit from below, motes and steam, the logo brushed in, SERVICE HUB, white card rising; the light follows
  the service by Fiji time without naming it. The app's own sign-in form, sign-in and Practice mode are unchanged.
- Site published to cornercafefiji.com and www.cornercafefiji.com.
- Rollback: remove ccOrderToolsLoader36, add ccOrderToolsLoader34 (footer, 1.0.34), publish.

## Analytics that answer (loader 37, 27 Oct 2026, 9:44 PM)

- Approved by Roneel ("deploy", 9:43 PM) after the preview.
- `ccOrderToolsLoader37` (footer, 1.0.37) replaces loader 36: the same 13 files (fingerprints unchanged) plus
  `staff.answers.js` (fingerprint 765802af…) at commit f57a24c6. Test `test/order-tools/test_answers.cjs` 86/86.
- Each tab's question becomes a plain answer; What to do above the numbers, no "No change needed" cards (Overview
  insights too); number cards compare with the same number of days before, from sheet records until the app has the
  history, and show no comparison when those records are incomplete (walk-in sheet ends 14 Sep 2026) or more than 20%
  unpriced; Business intelligence data checks in Details; Marketing's empty boxes become one line. Daily cake demand
  checked identical.
- Rollback: remove ccOrderToolsLoader37, add ccOrderToolsLoader36 (footer, 1.0.36), publish.

## Cake pickups by day (loader 38, 27 Oct 2026, 10:11 PM)

- Approved by Roneel ("deploy", 10:10 PM) after the preview. Brief: Interactive Daily Pickup Timeline & Booking
  Lead-Time Analytics; decisions: new timeline on Analytics > Cake sales replacing Busiest pickup days (Daily cake
  demand untouched), lead times from verified order dates only.
- `ccOrderToolsLoader38` (footer, 1.0.38) replaces loader 37: the same 14 files (fingerprints unchanged) plus
  `staff.pickups.js` (fingerprint 84a62ce4…) at commit be065ebf. Test `test/order-tools/test_pickups.cjs` 35/35;
  `test_answers.cjs` 86/86 re-run.
- Rollback: remove ccOrderToolsLoader38, add ccOrderToolsLoader37 (footer, 1.0.37), publish.

## Booking-time bars and Performance snapshot hidden (loader 39, 27 Oct 2026, 10:29 PM)

- Approved by Roneel ("deploy", 10:25 PM; "remove ... only this section", 10:27 PM).
- `ccOrderToolsLoader39` (footer, 1.0.39) replaces loader 38: same files, `staff.pickups.js` updated (fingerprint
  62a07f21…) at commit d90e0ef7. Pickups bars split by booking time (same groups and colours as By booking time), usual
  weekday tick, booking-time summary with 30/90/year/all chips, bars scaled to a normal busy day. Overview Performance
  snapshot (heading, 7/30/90 buttons, six number cards) hidden; Popular cake types, Booking channels, Customer mix and
  the By booking time view stay. Test test_pickups 37/37. Checked live in Chrome after publishing.
- Rollback: remove ccOrderToolsLoader39, add ccOrderToolsLoader38 (footer, 1.0.38), publish.

## Overview cards moved to Cake sales (loader 40, 27 Oct 2026, 10:39 PM)

- Approved by Roneel ("deploy", 10:38 PM). `ccOrderToolsLoader40` (footer, 1.0.40) replaces loader 39: same files,
  `staff.pickups.js` updated (fingerprint aa16dae5…) at commit 6f0b3625. Popular cake types, Booking channels and
  Customer mix leave the Overview and sit under the pickups timeline on Cake sales, following that page's period
  buttons, same counting rules, bars open their orders. Test test_pickups 40/40. Checked live in Chrome.
- Rollback: remove ccOrderToolsLoader40, add ccOrderToolsLoader39 (footer, 1.0.39), publish.

## Cake sales simplified (loader 41, 27 Oct 2026, 10:44 PM)

- Approved by Roneel ("deploy", 10:44 PM). `ccOrderToolsLoader41` (footer, 1.0.41) replaces loader 40: same files,
  `staff.pickups.js` updated (fingerprint f64925b0…) at commit e687ad25. On Cake sales, What to do, the four number
  cards and the Gross profit note are hidden; the answer line, Sales by day, pickups timeline, moved cards, Sales by
  channel, Money and Details stay. Test test_pickups 43/43. Checked live in Chrome.
- Rollback: remove ccOrderToolsLoader41, add ccOrderToolsLoader40 (footer, 1.0.40), publish.

## Daily cake demand moved to Cake sales (loader 42, 27 Oct 2026, 10:56 PM)

- Approved by Roneel ("deploy", 10:55 PM). `ccOrderToolsLoader42` (footer, 1.0.42) replaces loader 41: same files,
  `staff.pickups.js` updated (fingerprint a232785e…) at commit d46621b6. The protected Daily cake demand is mounted on
  Cake sales above Sales by day with the same mount calls, orders and date (numbers checked day for day against the
  Overview); on the Overview it is hidden and By booking time shows on its own (switch hidden). Test test_pickups 46/46.
  Checked live in Chrome.
- Rollback: remove ccOrderToolsLoader42, add ccOrderToolsLoader41 (footer, 1.0.41), publish.

## Loader 43 (commit a497acdb) — live 27 Oct 2026, 11:15 PM
- Overview tab removed; Analytics opens on Sales & Products.
- Seasonal booking buildup moved to Planning & Forecasting (same module, same numbers).
- Pickups timeline: two-letter day above a bold date.
- Rollback: remove ccordertoolsloader43, add ccordertoolsloader42 (1.0.42, footer), publish.

## Loader 44 (commit 97a9336f) — live 27 Oct 2026, 11:29 PM
- "Old orders" in the sidebar (under Orders) and first in More on phones; opens the existing Old order (paper slip) form directly. Same form, checks and server function; nothing new saved.
- Loader messages shortened to stay under Webflow's 2,000-character limit.
- Rollback: remove ccordertoolsloader44, add ccordertoolsloader43 (1.0.43, footer), publish.

## Loader 45 (commit 427b3ce9) — live 27 Oct 2026, 11:56 PM
- Settings home: Alerts & printing → Communications (Email templates) opens the email templates window (was hidden by the new Settings home).
- email-templates Edge Function v3 → commit 427b3ce9 (preview matches send-emails v30). Rollback: 7e1aa73b2cd7aa3e894a019d5f38dfc11eccf5b5.
- Rollback (page): remove ccordertoolsloader45, add ccordertoolsloader44 (1.0.44, footer), publish.
- Found, not fixed: the editor preview shows 'Café phone">' before the phone number in the "Questions? … call" line.

## Loader 46 (commit 5a4cdc4e) and email editor 1.0.1 — live 28 Oct 2026, 12:11 AM
- Settings in the Kazumi Service Hub format: menu beside the page on computers and iPads, overview cards with key facts,
  full-word groups (Ordering and availability, Menu and pricing, Calendar, Alerts and communications, People and access,
  Data and safety), one icon per setting. Layout only.
- Email editor: registered script ccemailtemplates2 (dist/app/email-templates.82a1c537ec.js @17dbfb9d, SRI sha384-R0FyBq…)
  replaces ccemailtemplates; fields inside a link address stay as fields (fixed the broken phone link in previews/published templates).
- Rollback: page scripts back to ccemailtemplates 1.0.0 and ccordertoolsloader45 1.0.45, publish.

## Release A (Settings audit) — live 28 Oct 2026, 12:44 AM
- Database migration release_a_20261028 (supabase/sql/release_a_20261028.sql): staff_profiles direct writes removed
  (read kept for staff.users holders), locations max_days_ahead >= notice, active sizes priced above $0, app_config
  rights removed from staff logins, Remove Settings entries no longer runnable by staff.
- Loader 47 (commit af60a5b0): Settings no longer lists Remove Settings entries.
- Rollback: supabase/sql/release_a_20261028_rollback.sql; page scripts back to ccordertoolsloader46 1.0.46, publish.

## Release B (Settings audit) — live 28 Oct 2026, 1:01 AM
- Database migration release_b_20261028: get_order_setup returns `occasions` (Settings, shown on forms); first collection 8:00 AM;
  Baby shower and Graduation shown on forms; Birthday first.
- Staff footer: app bundle staff-app.5d6e1635b4.js @947432f3 (SRI sha384-ULdXgI…); website order page footer: guest-app.cdf126b4b7.js
  @947432f3 (SRI sha384-zIEbGV…). Both read back identical before publishing. Built by build/release_b_occasions.py.
- Loader 48 (commit cc339bf7): 12-hour time fields in Settings collection hours and Change order.
- Checked live: staff list and website list come from Settings; Settings shows 8:00 AM to 9:00 PM.
- Rollback: supabase/sql/release_b_20261028_rollback.sql; footers from docs/rollback/*-before-release-b-2026-10-28.html;
  page scripts back to ccordertoolsloader47 1.0.47; publish.

## Release C (Settings audit) — live 28 Oct 2026, 1:31 AM
- Database migration release_c_20261028: settings_history, settings_restore (put back only when unchanged since; everyday
  settings only), audit on promo_cards, calendar_events, catalogue_items, catalogue_item_options; write_audit keys by code/key too.
  Tested first on a private PostgreSQL copy (caught two bugs, fixed).
- Loader 49 (commit 7e6c822d): Settings > Data and safety > Settings history.
- Checked live: history loads (40 latest, "Show earlier changes"), before/after in plain words, Put back offered on 14 of 40.
- Rollback: supabase/sql/release_c_20261028_rollback.sql; page scripts back to ccordertoolsloader48 1.0.48; publish.

## Release D — payment methods and lead-time groups from Settings (live 28 Oct 2026, 1:57 AM)
- Approved by Roneel ("deploy and then fix", 1:51 AM).
- Database: supabase/sql/release_d_20261028.sql applied (app_config rows payment_methods and lead_bands; get_order_setup returns both; settings_payment_methods_save and settings_lead_bands_save with history rows). Checked live: setup returns 5 methods (Other off) and 5 groups.
- Staff footer: bundle staff-app.d1c119f6f0.js @bd90f95e (SRI sha384-V8nwa4…); written and read back identical (md5 2b3cecff97971c069c6a9dc778374bae).
- `ccordertoolsloader50` (footer, 1.0.50) replaces loader 49: commit bd90f95e, new fingerprints for staff.admin.js and staff.pickups.js.
- Live check: new bundle and loader loaded; payment list and groups come from Settings; Today screen normal.
- Rollback: supabase/sql/release_d_20261028_rollback.sql; staff footer from docs/rollback/staff-footer-before-release-d-2026-10-28.html; remove ccordertoolsloader50, add ccordertoolsloader49 (1.0.49, footer); publish.

## Orders header fix (live 28 Oct 2026, 2:10 AM)
- Approved by Roneel ("deploy", 2:09 AM). Long lists squeezed the heading row to nothing, so the title slid under the search. staff.flow.js: Orders, Customers (follow-ups), Kitchen and Register grids size rows to their content.
- `ccordertoolsloader51` (footer, 1.0.51) replaces loader 50: commit 852b6ca7, new fingerprint for staff.flow.js only.
- Live check: Upcoming list — heading 92px tall, search and tabs below it.
- Rollback: remove ccordertoolsloader51, add ccordertoolsloader50 (1.0.50, footer), publish.

## Release E — two-step sign-in for Admins: PARKED (28 Oct 2026, 2:19 AM)
- Roneel: "lets not do this now". Built and tested as a preview only (commit 931c1573): supabase/sql/release_e_20261028.sql (+ rollback), build/twostep.js appended to src/staff.signin.js, Settings row in src/staff.admin.js, test/order-tools/test_release_e.cjs (14 pass). Nothing applied to the database or the live page. Loader 51 still serves the previous staff.signin.js and staff.admin.js.

## Cake Enquiries, phase 1 — LIVE (28 Oct 2026, 6:17 AM)
- Brief: Corner Cafe Cake CRM enquiry, sales conversion and revenue intelligence (attachment, 2:29 AM). Decisions (Roneel): Enquiries as a tab inside Orders; all staff can record and update; build phase by phase.
- Audit: website orders already pass New / awaiting quote / approval before confirmation (counted from orders later, not duplicated); walk-in, phone and WhatsApp enquiries that never order leave no record; heard_from/campaign on 3 of ~560 orders; decline/cancel reasons free text (1 filled); customer_tasks, duplicate checks and lead-time charts exist.
- Database (not applied): supabase/sql/release_f1_enquiries_20261028.sql (+ rollback). New tables enquiries and enquiry_events only; read for staff, every write through enquiry_* functions with an event row; converting links an order made on the normal New order screen (row lock, one order per enquiry, one enquiry per order). Private Postgres test: walk-in partial, empty refused, customer match, duplicate warning + save anyway, double tap, past date refused, quote, stale edit refused, stage, contact, close with/without reason, reopen, convert, second convert refused, order reuse refused, edit/close after convert refused, returning customer later, list/search, events, non-staff refused, rollback clean.
- Screens: src/staff.enquiries.js (marker __ccEnquiries20261028). Tab and list in Orders, New enquiry beside New order (Orders, Today), detail with stage, quote, log contact, change, not ordered (reason + customer said / our guess), reopen, convert (fills the New order screen through CCOrderFlow.who, links through CCOrderFlow.afterOrder), "Already ordered? Link". Hidden in Practice mode.
- Test: test/order-tools/test_enquiries.cjs 26 pass (desktop, iPad, phone).
- To go live: apply the SQL; loader needs room for one more file (shorten the fetch code), add ['enquiries','__ccEnquiries20261028',<fingerprint>].
- Approved by Roneel ("deploy", 6:12 AM). SQL applied as migration release_f1_enquiries_20261028 (checked: 8 functions, anon has no access, staff cannot write the tables directly, RLS on, 0 rows).
- `ccordertoolsloader52` (footer, 1.0.52) replaces loader 51: commit 0702f06e; fetch code shortened (helper g(), same jsDelivr then GitHub fallback, same marker check and manifest) to fit the 2,000-character limit (1,984); new file staff.enquiries.js; staff.admin.js fingerprint changed (inert Two-step row code, shows nothing without the parked add-on). Tested before going live: all 17 files load.
- Live check: all add-ons loaded, New order hook in place, Enquiries tab reads the real database (0 enquiries), New enquiry opens and closes (nothing saved), order tabs return.
- Rollback: remove ccordertoolsloader52, add ccordertoolsloader51 (1.0.51, footer), publish; database: supabase/sql/release_f1_enquiries_20261028_rollback.sql (copy any real enquiries first).

## Cake Enquiries hidden (28 Oct 2026, 6:35 AM)
- Roneel: worried it would confuse staff; chose "Hide it for now". Staff page back on `ccordertoolsloader51` (1.0.51), published; checked live: no Enquiries tab or button, all other add-ons load.
- Kept for later: the enquiry tables and functions in the database (empty, unused), loader 52 (registered, not applied), src/staff.enquiries.js and its test. To bring it back: apply ccordertoolsloader52 and publish (consider the safeguards discussed: hint to use New order, "is this a confirmed order?" check, one button on Orders only).

## Order card refinements — LIVE (28 Oct 2026, 10:41 AM)
- Approved by Roneel ("deploy", 10:40 AM). staff.flow.js (__ccOrderCard20261028): only the order number under the name; cake detail labels semi-bold #1D2939; Collection box under the cake on the Cake tab (read from the order, the app's own Change button); Collection tab hidden.
- `ccordertoolsloader53` (1.0.53) replaces loader 51 (Enquiries stay hidden): commit 68c30f75, new fingerprints for staff.flow.js and staff.admin.js (inert Two-step row code).
- Test: test/order-tools/test_order_card.cjs 19 pass (computer, iPad, phone); test_flow 20 pass. Live check on CC-1140: CC-1140 only, labels 600, tabs Cake / Payment / More, Collection Sunday 1 November at 4:00 PM.
- Rollback: remove ccordertoolsloader53, add ccordertoolsloader51 (1.0.51, footer), publish.

## Design foundation (enterprise design brief, items 1-3) — LIVE (28 Oct 2026, 11:13 AM)
- Brief: Jack's Enterprise Design System master prompt (10:47 AM). Decisions: Corner Café Service Hub first; Roneel's own text and button sizes stay (brief's 14-16px text and 44px buttons not applied).
- Audit (12 screens x computer / iPad landscape / iPad upright, test data): 11 font weights (up to 800), 15+ near-identical grey borders, ~15 corner sizes, up to 6 shadow styles per screen; headings differ (Kitchen uppercase eyebrow, Register no icon); harsh selections (Handover thick black, Analytics solid teal); Calendar rainbow weekdays and system dropdowns; Analytics 10-12px text and uppercase headings; Settings 12px uppercase group names; actions that look like plain text; iPad upright Orders tabs cut off; boxes inside boxes on Today. No sideways scrolling anywhere.
- Preview (src/staff.polish.js, block __ccDesign20261028): one pass over the app's own style sheets: weights 650-900 -> 600; light neutral greys and line tokens -> #E4E7EC; corners 7->8, 9/11->10, 13-18/22->12; resting shadows -> one quiet shadow (menus, sheets, pop-ups, focus rings kept); headings h1-h6/b/th 600; no eyebrow above page titles; every page title carries its sidebar icon; Handover cards and Analytics categories select in soft navy.
- Measured after: weights 400/500/600 only on every screen; one neutral border colour; shadows one style plus meaningful rings; no sideways scrolling; Calendar, Analytics and Settings items 4-6 not touched.
- Tests: test_polish 148 pass (corner expectation 14px -> 12px), test_flow 20, test_order_card 19, test_ipad 91.
- Approved by Roneel ("deploy", 11:12 AM). `ccordertoolsloader54` (1.0.54) replaces loader 53: commit d91a992e, new fingerprint for staff.polish.js only.
- Live check (real data): Today, Calendar, Register, Kitchen show weights 400/500/600 only, one neutral border grey (#E4E7EC), page title icons (Today keeps its greeting), no sideways scrolling.
- Rollback: remove ccordertoolsloader54, add ccordertoolsloader53 (1.0.53, footer), publish.

## Design brief items 4-8 — LIVE (28 Oct 2026, 11:34 AM)
- src/staff.polish.js: Orders filter tabs become one "Show" dropdown under 900px wide (iPad upright, phones); Calendar Show and Type use the app dropdown; no uppercase in the content (sidebar group names stay); Calendar weekday row neutral, number cards without coloured edges; Settings group names 15px sentence case; ".ccs-link" actions navy and underlined (red ones stay red); text floor 13px in the content (sidebar untouched); Kitchen week strip 13px.
- Not touched: chart axis numbers inside the Heartbeat/Daily cake demand chart (11px, chart standard), the Heartbeat month dropdown.
- Tests: test_polish 148, test_ipad 91, test_flow 20, test_order_card 19.
- Approved by Roneel ("deploy", 11:33 AM). `ccordertoolsloader55` (1.0.55) replaces loader 54: commit 9303fdda, new fingerprint for staff.polish.js only.
- Live check (real data): Calendar Show and Type are app dropdowns, weekday row neutral; Register links navy and underlined; no uppercase in the content; no sideways scrolling.
- Rollback: remove ccordertoolsloader55, add ccordertoolsloader54 (1.0.54, footer), publish.

## Design brief item 9: Today without boxes inside boxes — PREVIEW (28 Oct 2026)
- src/staff.polish.js: on Today, Act now rows, Due today orders and This week day cells lose their own borders and shadows and sit on a soft fill (#F9FAFB, hover #F2F4F7) inside their card; status edges and the selected day keep their colour. No layout or content change.
- Checked computer, iPad landscape, iPad upright, phone: 0 nested bordered boxes, no sideways scrolling, no page errors. Tests: test_polish 148, test_ipad 91; test_act_now 37/42 with the same 5 failures as before this change (the test data's "urgent first" dates have aged; not caused by this change).

## Premium welcome screen — live 28 Oct 2026, 12:41 PM (approved: "deploy")
- `ccordertoolsloader57` (footer, 1.0.57) replaces loader 56: the same 15 files (fingerprints unchanged) at commit d2ffe679, with `staff.welcome.js` (fingerprint 2ea794b6…) in place of `staff.signin.js` (Roneel: "the brown and those illustrations cheapens it").
- Deep forest green panel with the logo, a gold rule and the hub name; warm ivory sign-in; no greeting, no illustrations. Motion: gold frame draws in once, faint light sweep every 11 seconds, logo drifts a few pixels; none with reduced motion.
- Staff page browser title renamed to "Corner Café Marketing & Business Intelligence Hub".
- Checks: test_welcome 17/17 (desktop, iPad, phone: wrong password, sign in, show password, returning staff, Practice mode); every loader file checked against its fingerprint at the commit.
- Rollback: remove ccordertoolsloader57, add ccordertoolsloader56 (footer, 1.0.56), publish.

## Phase 1 of the Kazumi standard — live 28 Oct 2026, 5:28 PM (approved: "deploy")
- `ccordertoolsloader58` (footer, 1.0.58) replaces loader 57: the same 16 files at commit 0efff717; only staff.polish.js changed (fingerprint 7eb7dd28…, block __ccPhase1_20261028).
- Side menu name "Marketing & Business Intelligence Hub" (phone top bar shows the logo only); Orders filter tabs become the Show dropdown whenever they do not fit (iPad landscape included); no New order button on Analytics; main actions (New order, Save and the other filled buttons, the phone bar's New order) in Corner Café deep green #3D5230; selections keep the soft navy.
- Tests: test_flow 20 (main button expectation updated to deep green), test_order_card 19; computer, iPad landscape and upright, phone: no sideways scrolling, no page errors. test_polish crashes before and after this change (test issue, not this change).
- Rollback: remove ccordertoolsloader58, add ccordertoolsloader57 (1.0.57, footer), publish.

## Loader 59 — phase 2 of the Kazumi standard (28 Oct 2026, 5:39 PM Fiji)
- Commit 17e1f9b1a58195fdf73078724d5ea5394750e83c; only `staff.polish.js` changed (fingerprint 42719f9432ec19ab69c200c577a7766d).
- Today "Act now" lines shown as icon chips (amber clock up to 15 min late, red after; navy due date; amber to-dos; grey waiting; red allergies). Full sentence kept as tooltip and for screen readers. Clock on Due today tags.
- Presentation only. Rollback: loader 58 (commit 0efff71).

## Loader 60 — phase 2b, order cards (28 Oct 2026, 5:53 PM Fiji)
- Commit 24af83414ad42dd12b6515b53898b90c4838dae9; only `staff.polish.js` changed (fingerprint f94216e819e306dda7f7139fa1e3f85b).
- Order cards: lateness clock chip and coloured time (amber up to 15 min, red after; phone flag slot), allergy red triangle, "Received …" as italic hint.
- Presentation only. Rollback: loader 59 (commit 17e1f9b).

## Loader 61 — phase 3, Integrations page (28 Oct 2026, 6:27 PM Fiji)
- Commit ee244c222af6b2f214f55465628164010bdc73bb; only `staff.admin.js` changed (fingerprint 489680a4f34de4c9179dec29e366d2c5).
- Settings → Data and safety → Integrations: read-only cards (order database, website orders, customer emails, kitchen printing, Google Sheet backup, WhatsApp) from the existing ops_health, mirror_health and admin_print_settings checks. Managers and admins only; no database change.
- Rollback: loader 60 (commit 24af834).
