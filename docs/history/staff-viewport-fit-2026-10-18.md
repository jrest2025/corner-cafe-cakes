# Calendar viewport correction — 18 October 2026

The user's 17:23 screenshot showed the calendar heading above the scroll position and the final week below the screen. The layout release had disabled the existing fitter and forced 180px month rows. That increased the calendar beyond the working-area height; additional horizontal padding did not solve it.

Correction: calculate the available grid height from the actual main working area, grid position, bottom padding and week count. At widths 760px and above, fit rows when at least 96px remains per week. Otherwise retain readable scrolling. Each date shows as many summaries as fit, plus View all N orders; full counts and the existing date-selection action remain. Resizing to a taller window restores summaries. Entering the calendar resets the working area's previous scroll position. Device safe areas and the published responsive padding remain.

Source: src/staff.viewport-fit.js and src/staff.viewport-fit.css. Footer rebuilt by python3 build/staff_viewport_fit.py, applied after the existing padding injection. Record handling, permissions, SRI and CDN fallback remain unchanged.

Verification: 27 simulated geometry checks passed at desktop/tablet/phone and short-window sizes, covering five/six weeks, visible-row bounds, full overflow counts, scroll reset and restoration on resize. Existing 15 layout checks passed. Footer JavaScript syntax and git diff --check passed. These are not browser rendering checks; signed-in visual verification remains outstanding.

Rollback: docs/rollback/staff-footer-before-viewport-fit-2026-10-18.html.
