# Needs attention pop-up islands and Order Taken Date — 18 October 2026

## Why

Pull requests #4 and #5 changed `src/staff.js` only. The live page runs a bundle built by overlays on the exact released file, so neither change ever reached staff. This release brings both into the live bundle chain, with the island detail opening as a pop-up (Roneel, 18 October: "it should pop up, that way you are not creating clutter").

## What changed

- Needs attention shows compact icon islands only. Tapping one opens a floating panel just below the islands, over a dimmed working area. The side menu and phone tab bar are never covered. One panel at a time; tapping another island swaps it; Close, Escape, tapping outside or tapping the same island closes it. Opening an order puts the order on top; Escape closes the order first. Leaving the screen closes the panel. Counts and rows use the existing groups, permissions and order buttons unchanged.
- Icons are inline SVG, coloured by meaning: red (overdue, due soon), amber (kitchen, not confirmed, missing details), orange (allergies), blue (balance), purple (customer concerns), slate (waiting on you).
- Inside the panel the full next step is shown (the list view clamps it to two lines and clipped a third).
- Order form: "When did the customer place this order?" Today (default) / Yesterday / Another date. No time-of-day input. Dates are stored as the Fiji calendar day with a noon placeholder. Future dates and dates older than 30 days are refused before anything is saved (30 days matches `order_set_taken`). Choosing today in the picker is treated as Today.

## Build

`python3 build/staff_attn_pop.py` verifies the base is the live release by SRI, then applies asserted replacements and appends `src/staff.attn-pop.css`.

Manifest: `{
  "file": "dist/app/staff-app.2c3db30481.js",
  "sri": "sha384-Hi9bI4jU40Va69eFXt483MdP78VGTxEUOAu7/AcDxR6MCdGlyaz+vTlKnCKJ7U92",
  "bytes": 1136002,
  "base": "dist/app/staff-app.95e84353c2.js",
  "base_sri": "sha384-Fo6HRhF3ZFBnoStTT94v1xcckp+MIql60sMOZ2/9ujls5FNbgWJ3so+SCnrai7nX"
}`

## Tests

- `test/run_attn_pop.cjs`: 107 checks at 1920x1080, 1366x1024, 1024x1366, 390x844, plus keyboard.
- `test/run_taken_date.cjs`: 34 checks, including full mocked orders for Today, Yesterday, Another date, future and older than 30 days.
- Earlier suites against this bundle: settings removal 35, icons 42, charcoal 27, viewport 40, alignment 132, connected journey 20, cleanup 59, visual 47, spacing 115.

Local functional verification with simulated server responses. One script error appears when opening an order with the mock (feedback form photos list missing in mock data); it occurs identically on the live bundle and is not caused by this change.

## Known gaps (not changed here)

- Booking curve: `dashboard_data` measures lead time from `created_at`, not `taken_at`. Back-dated orders therefore still count from the entry day in Analytics. Fix is one line in that database function (`coalesce(o.taken_at, o.created_at)`) and needs approval because it is a live database change. The cake register already uses `taken_at`.
- `order_set_taken` writes an audit event whose text includes the clock time (12:00 PM placeholder). Changing its wording is a database change, left for approval.

## Rollback

Paste `docs/rollback/staff-footer-before-attn-pop-2026-10-18.html` into the staff page footer and publish both domains. Previous bundle: `dist/app/staff-app.95e84353c2.js` at commit 5e125bc, SRI sha384-Fo6HRhF3ZFBnoStTT94v1xcckp+MIql60sMOZ2/9ujls5FNbgWJ3so+SCnrai7nX. No database rollback needed.

## Publication

Approved by Roneel 18 October 2026, 11:31 Fiji. Pull request #6 merged (merge commit 9a2c0d4).
Footer pinned to release commit e39986d0e67232ed93bd87d2542cc769f11dd417, artifact dist/app/staff-app.2c3db30481.js, SRI sha384-Hi9bI4jU40Va69eFXt483MdP78VGTxEUOAu7/AcDxR6MCdGlyaz+vTlKnCKJ7U92. Footer read-back matched exactly. Published to cornercafefiji.com and www.cornercafefiji.com (not the Webflow subdomain).

Live check, signed in as an administrator: the page loaded exactly this file (integrity check passed, so the CDN bytes match). Islands showed 2 Overdue, 1 Due soon, 3 Kitchen not finished, 4 Balance to pay; old summary cards gone. Overdue opened as a pop-up below the islands with both orders; switching to Kitchen not finished showed 3 orders; Escape closed it and unlocked scrolling. The new order form showed the three date options with Today selected and no time box; it was closed without saving. No order was opened, changed or created. One console error came from the separate Sentry monitoring snippet at page load, not from the staff app.

## Phone fix — 18 October 2026, 11:49 Fiji

Live issue reported by Roneel: on phones the islands drew over the bottom-sheet panel. Cause: the rule lifting islands above the backdrop (so desktop users can switch categories) applied at every width. It now applies only above 640px. New checks confirm nothing covers the panel's orders, header or Close button; they fail on the previous bundle and pass on this one.

Release commit 7a0bcd0e7104244c44fbcadd5a99b9027b35d4e0, artifact dist/app/staff-app.2a1e12fa07.js, SRI sha384-9ufXmHYP845e2kZyLrLdaYFq07zxqNEv06HACOT6SwX8/mEOIDrQJbOFYWHi2fpH. Footer read-back matched. Published to both production domains. Live check at 412px phone width, signed in: Balance still to pay opened with all 4 orders, header, Close button and orders not covered by anything.

Rollback: docs/rollback/staff-footer-before-phone-fix-2026-10-18.html (returns to the first release, which has the overlap), or docs/rollback/staff-footer-before-attn-pop-2026-10-18.html (returns to before islands).

## Two panes and centred pop-up — 18 October 2026, 12:05 Fiji

Approved by Roneel 12:01. Desktop and iPad landscape (landscape, at least 1100px wide): islands down the left, the most urgent category open on the right. Narrower screens: pop-up centred horizontally and vertically in the working area, above the phone tab bar.

Release commit fdef88a145dc0eec396ee4d4d7de6572aeaf4a4b, artifact dist/app/staff-app.9e3eaffd00.js, SRI sha384-mo0eb5SSTt57QMlbSZ82YemMmlfUaCNyH0AB18u9pMjNBy62EsQjR6zStLxZ3bcD. 171 island checks, 34 order-date checks, 517 earlier checks passed. Footer read-back matched. Published to both production domains.

Live check, signed in: desktop showed two panes with Overdue (2 orders) open first; switching to Kitchen not finished showed its order. At 412px phone width the pop-up centre matched the screen centre exactly (206, 391 above the tab bar).

Rollback: docs/rollback/staff-footer-before-two-pane-2026-10-18.html (returns to the phone-fixed pop-up release).
