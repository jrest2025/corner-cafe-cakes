# Screen fit for phones and tablets (20 October 2026)

Published to cornercafefiji.com and www.cornercafefiji.com on 20 October 2026, about 9:07 AM Fiji.

From the screen-by-screen review at 1366, 820, 412 and 360 widths:

- Kitchen on an upright tablet (760 to 1199 pixels): one column, so names, "Needs attention" lines and counts are no longer squeezed.
- Calendar on phones: filters and totals fold behind one "Filters and totals" line with a summary; a blue dot shows when a filter is in use. Empty "Coming up" line hidden. Filters full width when opened.
- Customers on phones: filter, groups and sort fold behind one "Filters and sort" line; the three section tabs fit across.
- Today on phones: a single "Needs attention" card runs full width with names; the repeated count is hidden.
- Kitchen tabs stay on one line on small phones; calendar arrows 44 pixels; week view names wrap to two lines.

Presentation only; no data, rules or actions change.

## Release

- Bundle: `dist/app/staff-app.2a12772f54.js` at commit `73c891380e348bd10ffab827a8a49794b791888b`
- SRI: `sha384-kxZQopTjBN4r7uWilJdv9a1Z553jFoV6MKTdOY7J8Xnd/6utLLuXblGVFrZ8kEQD`
- Built by `build/staff_screen_fit.py` on the flow polish release; tests `test/run_screen_fit.cjs` (43 checks), plus flow polish 46, calendar quiet 22, customer delete 34, urgent pop 85.

## Rollback

Staff page footer loader back to
`f="gh/jrest2025/corner-cafe-cakes@003f92a473eedd55dd31c4a4adb1ce155c17fa3a/dist/app/staff-app.8d34463493.js"`,
`k="sha384-D6L/sUYXTgE60eePgYd3irUkfbhqDX/VlJDQBFrU040gpCKsWyvXMfuwgClewjOg"`, then publish.
