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
