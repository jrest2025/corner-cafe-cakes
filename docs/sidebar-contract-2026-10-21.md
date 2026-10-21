# Shared sidebar contract, version 1, on the Corner Café Service Hub (21 October 2026): PREVIEW, NOT LIVE

This applies the Jack's Restaurants shared sidebar contract, version 1, to the staff app's side menu. Visual only.
Routes, tab keys, permissions, sign-out, Practice mode, the Heartbeat and Daily Cake Demand, and the phone bars do not change.
Live only when Roneel says "deploy".

## What changes

**All screens 760px and wider (computers and tablets)**
- Icons are 2px outline icons in one neutral colour, `rgba(255,255,255,.80)`; the per-item pastel colours are gone.
  The shapes are Lucide-style: house, clipboard list, calendar days, tablet, chef hat, arrows left and right, users,
  chart, receipt, settings and ellipsis.
- Current page: a `rgba(255,255,255,.13)` fill, a bold white label, a white icon and a 3px light sage (#B9CFA7) bar.
- Section labels are uppercase in `rgba(255,255,255,.70)`, with no divider lines.
- The "Service Hub" line is 80% white.
- Footer: initials, name over role, and Sign out as a full-width outline button.
- Practice mode keeps its gold "on" state (now with dark text on the gold).

**Computers with a mouse, 1280px and wider**
- Menu 256px. Folded rail 72px. The saved preference key stays `ccs-navmini`.
- Brand block is about 88 to 110px with a smaller logo, and the fold control is 36px in the top right corner.
- The fold control uses the panel-left-close / panel-left-open icons, with the tooltip "Collapse sidebar" / "Expand sidebar".
- Rows are 44px with 15px names.
- In shorter windows the logo shrinks first.
- Rows go to 40px at 880px tall or less, and to 36px at 800px tall or less.
- The text stays 15px.
- The footer is pinned and only the sections scroll. At 1366 × 768, 1440 × 900, 1512 × 862 and 1920 × 1080 everything fits without scrolling.

**Unchanged**
- Touch tablets keep every touch-standard size: 230px or 256px wide, 60px rows, 19px names, and no fold button.
- The footer on tablets is now pinned, with the sections scrolling.
- The 96px rail at 760 to 1279px on computers.
- Phones: the top bar, the bottom bar (Today, Orders, New order, More), the original icons and the More sheet.

## Files

**`src/staff.sidebar-contract.css`**
- Every rule starts with `html:not(#cc-t1):not(#csc-a) body:not(#cc-t2)`.
- That is one id more than the touch standard's prefix, so the contract wins even though `staff.touch.js` keeps the touch styles last on the page.

**`src/staff.sidebar-contract.js`** (idempotent, re-applied by a MutationObserver after every menu re-render)
- Puts an outline icon (`svg.csc-ic`) in front of each item's own icon, and marks the own icon `csc-orig`.
  CSS shows the outline icon from 760px up and the own icon on phones.
- Labels, `title` and `aria-label` of the items are untouched.
- Sets the fold control's icon, title and aria-label.

**`build/staff_sidebar_contract.py`**
- Layer script. Base: `dist/app/staff-touch-manifest.json` (live).
- Output: the bundle named in `dist/app/staff-sidebar-contract-manifest.json`.

**`test/run_touch.cjs`**
- The "computers" check now expects 256px and 15px when the contract is present, and 248px and 16px otherwise.

## Tests (candidate footer = live footer with only the app loader repointed)

**Passing**
- Heartbeat guard: 80/80.
- `tests/demand-rail-contract.test.cjs`: PASS.
- touch: 76/76.
- practice: 75/75.
- practice guide: 100/100.
- old orders: 144/144.
- order flow: 123/123.
- fit: 220/220. The live bundle fails 33 of these, all "#ccs-side scrolls".
- screen fit: 43/43.

**Failing: `test/run_side_logo.cjs`, 36/39**
- The same 3 checks fail on the live bundle too.
- The test expects the "Service Hub" line at 72% white on phones and upright tablets; the touch standard made it 86%.

**Rows and screens**
- Rows: 44px at 1920 × 1080 and 1440 × 900. 40px when the window is 880px tall or less (1512 × 862). 36px when 800px tall or less (1366 × 768).
- Nothing in the menu scrolls at 1366 × 768, 1440 × 900, 1512 × 862 or 1920 × 1080.
- At 1280 × 720 only the sections scroll; the footer stays pinned.

## Release, only when Roneel says "deploy"

1. Commit and push the branch, then note the commit hash: `<C>`.
2. Make the footer: in the live footer (`test/fixtures/staff-footer.html`), change only the staff app loader line. Set
   `var f="gh/jrest2025/corner-cafe-cakes@<C>/<file from the manifest>"` and `k="<sri from the manifest>"`.
   Nothing else changes. The footer stays at 49,491 characters, under the 50,000 limit.
3. Run `FOOTER=<candidate> BUNDLE=<file> node test/run_heartbeat_guard.cjs` (must be 80/80) and
   `node tests/demand-rail-contract.test.cjs`.
4. Check that jsDelivr serves the file at `<C>` identical to the repository.
5. Save the current live footer as `docs/rollback/staff-footer-before-sidebar-contract-<date>.html`.
6. Paste the new footer into the Webflow staff page (`/cake-orders-staff`) footer custom code.
7. Read it back byte for byte, then publish.
8. Copy the new footer to `test/fixtures/staff-footer.html`.

The page head does not change.

## Rollback

Paste the saved footer back (or set the loader line to commit `7103cd832bedf3751dd0ca98be04e9116424baba`, file
`dist/app/staff-app.f9f4853c95.js`, SRI `sha384-S8xmIAgSh2Yp+9dZwdnPDg08jZtnbt1A5rCfRMZkcHreDGfivF0nugNqO4D0c7J5`),
then publish. There are no database changes.
