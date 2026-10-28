# Analytics: one page per tab (20 October 2026)

Published to cornercafefiji.com and www.cornercafefiji.com on 20 October 2026, about 3:15 PM Fiji. Roneel approved the
layout ("Yes, build it"), the use of older sheet orders in pattern charts ("Patterns use all years") and the release
after seeing the preview ("Yes, publish"). The footer saved in Webflow was read back after publishing and is identical
to `test/fixtures/staff-footer.html`; only its staff app loader line changed.

## What changed

Analytics had 5 tabs and 14 sub-tabs. It now has 7 tabs and no sub-tabs:

| Tab | Answers | Headline figures | Main chart | Small charts |
| --- | --- | --- | --- | --- |
| Overview | How are we doing right now? | The Cake Heartbeat, unchanged | | |
| Cake sales | What did we sell, and what is it worth? | Net cake sales, completed orders, average order, still owed | Sales by day, week or month | Sales by channel, busiest pickup days (all years), money collected and owed |
| Cakes | What are people buying? | Cakes sold, top cake, most popular size, slow sellers | Cakes ranked | Sizes, flavours, favourite cake by occasion (all years) |
| Customers | Who orders, and who comes back? | Customers, new, returning, average spend | How often customers come back (all years) | New and returning, how they ordered, top customers |
| Occasions | When do occasion orders come in? | The occasion view, unchanged, with the Booking curve | | One occasion's full report one tap away |
| Planning | What is coming up, and are we ready? | Cakes next 7 days, booked next 30 days, not confirmed, to collect before pickup | Cakes due, next 14 days (confirmed and not) | Cakes per week, largest orders, order stages, when cakes are collected (all years) |
| Data | Is the data complete? | Data readiness, uploads, about the data, modules and datasets | | |

Café sales, Marketing and Website stay hidden until their data arrives. The Insights tab is gone: insights live in
"Today's insights" on Overview, and each tab shows its own "What to do" cards from the same engine.

Every tab has the same shape: four headline figures, one main chart, small charts, What to do, and a closed Details
section holding every table and explanation the old sub-tabs had (Sales and revenue, Profitability, Finance, Products,
Customers, Forecast, Operations, Orders and conversion with the order list, Occasions and seasons). Nothing was removed.
Every figure and bar still opens its orders. One period bar on every tab: Since launch, 7 days, 30 days, 90 days, with
cake, channel, occasion and count-by under More filters.

Period figures count from the launch on 13 October 2026 (Roneel's rule). Charts marked "All years" also use the older
sheet orders: busiest pickup days, favourite cake by occasion, how often customers come back, when cakes are collected,
and (as before) the Occasions view. "Returning" customers are those who bought before, including sheet orders.

## How it is built

`build/staff_analytics_tabs.py` patches the live bundle (`staff-app.3e258cb148.js`, checked by hash) and appends
`src/staff.analytics-tabs.js` and `.css`:

- the module list and section map become the new tabs; the section map also gives each new tab its old sections, so if
  the new pages ever fail the app shows those instead (checked by the guard);
- the occasion view (with the Booking curve), uploads and the occasion report are lifted, unchanged, into functions the
  pages can place;
- a hook hands every tab except Overview to `CCAnalyticsTabs.page()` with the figures the app has already worked out.

The Overview, the Cake Heartbeat, the Daily cake demand rail and the Booking curve are not changed.

## Tests

- `test/run_heartbeat_guard.cjs` (now also opens every other tab: no loading box, nothing undefined, 12-hour times, no
  sideways scroll, the same shape on each tab page, and the fallback): 80 of 80 on the candidate; 62 of 62 on the live page.
- `test/run_analytics_tabs.cjs`: period chips, More filters, Details staying open, taps opening orders, Occasions views,
  links to Data and Orders, older orders shown and hidden, on tablet and phone: 42 of 42.
- Easier forms on the candidate bundle 46 of 46; insight rules 24 of 24; rail contract pass.

All-years charts on real orders (read-only check, before corrections): 388 customers, 334 of them ordered once, 35 twice,
15 three or four times, 4 five times or more. Busiest pickup day Saturday (132 cakes), then Friday (96). Pickup times:
146 before 12 PM, 71 from 12 to 2 PM, 126 from 2 to 5 PM, 142 from 5 PM.

## Release

- Bundle `dist/app/staff-app.2d9f219405.js` at commit `fe30348e315721b8271362d9d40bbee8200c3304`, SRI `sha384-jR/0mQbmRyqTcViIvREhvshR61cVsJEW2Xcl/Kh1geJf3DMQ0HBdttgJXz7V4Zav`.
- Only the staff app loader line of the page footer changes.

## Rollback

Staff page footer loader back to
`f="gh/jrest2025/corner-cafe-cakes@855328b89c15a274ce11e2a32f2525ba990e75d9/dist/app/staff-app.3e258cb148.js"`,
`k="sha384-UhzNDIuwpiTghb4BwgfvmtG/IGuZD/Jr9IN2muzLrHg3CGQIKJWIDze9FtJwVzms"`, then publish.
