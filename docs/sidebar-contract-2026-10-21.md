# Shared sidebar contract on the Corner Café staff app (21 October 2026)

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
- Rows go to 38px at 880px tall or less, and to 36px at 800px tall or less.
- The text stays 15px.
- The footer is pinned and only the sections scroll. At 1366 × 768, 1440 × 900, 1512 × 862 and 1920 × 1080 everything fits without scrolling.

**Unchanged**
- Touch tablets keep every touch-standard size: 230px or 256px wide, 60px rows, 19px names, and no fold button.
- The footer on tablets is now pinned, with the sections scrolling.
- The 96px rail at 760 to 1279px on computers.
- Phones: the top bar, the bottom bar (Today, Orders, New order, More), the original icons and the More sheet.

## Version 2: universal navigation taxonomy (contract section 7)

On screens 760px and wider, the menu shows six sections in this order: Overview, Operations, Planning, Customers,
Insights, System.
- `src/staff.sidebar-contract.js` moves the existing buttons; it never recreates them. Tab keys, handlers, titles and
  aria labels stay as they are.
- Each section is a `div role="group"` named by its own heading. Headings are sentence case in the markup and shown
  uppercase through CSS.
- A section with no visible item (after permissions) is hidden, heading included.
- The app's own headings and the page footer's added headings ("Planning", "Quick service") are hidden, not removed,
  so the footer script stays settled. The observer is guarded: a pass that changes nothing ends the chain, and the
  menu shows 0 mutations while idle for every role and size checked.
- Practice mode stays just above the account footer. Needs attention stays hidden. More stays phone-only.
- Phones put the app's own flat order back, so the bottom bar is unchanged.
- Section headings on computers: 11px, weight 600, letter spacing 0.08em, 12px above, 2px below. In windows 880px tall or less: 8px above, and rows 38px (36px at 800px tall or less).
  Tablets keep the touch standard's 17px headings.

| Old section | New section | Label | Tab key | Shown when (unchanged) | Unchanged |
|---|---|---|---|---|---|
| Service | Overview | Today | `today` | always | yes |
| Service | Overview | Needs attention | `attn` | always, hidden by the page footer | yes (still hidden) |
| Service | Operations | Orders | `orders` | always | yes |
| Quick service | Operations | Service view | `tablet` | `ord.create` | yes (label set by the footer before; now also by the contract) |
| Quick service | Operations | Kitchen | `kitchen` | `kit.view` | yes |
| Quick service | Operations | Handover | `handover` | `ord.view` or `kit.view` | yes |
| Planning | Planning | Calendar | `calendar` | always | yes |
| Customers | Customers | Customers | `customers` | `nav.customers` and `cust.view` | yes |
| Business | Insights | Analytics | `dash` | `mgmt.analytics` or `mgmt.reports` | yes |
| Business | Insights | Register | `register` | `mgmt.reports` | yes |
| Set-up | System | Settings | `settings` | `canSettings()` | yes |
| (no section) | (no section) | More | `more` | phones only | yes |
| (above footer) | (above footer) | Practice mode | (`data-ccp-go`) | always | yes |

Roles checked at 1440 × 900 with the test mock:

| Role | Sections shown |
|---|---|
| Admin and manager | all six |
| Counter (`front_of_house`) | Overview, Operations (Orders, Service view, Kitchen, Handover), Planning |
| Finance | Overview, Operations (Orders, Handover), Planning, Customers |
| Marketing | Overview, Operations (Orders, Handover), Planning, Customers, Insights (Analytics) |
| Kitchen | the kitchen-only screen, unchanged; no sections |


## Release (21 October 2026)

- Roneel said "deploy" at 10:44 PM Fiji time.
- Brand line under the logo: "Service Hub" became "Marketing Central" (shown uppercase). This applies to the side menu
  and the phone top bar only; the sign-in screen and the page title are unchanged.
- The line is one line in the 256px menu and on iPad (17px). It is two lines on the 96px rail and on phones.
- Rebuilt on the live bundle at release time, `dist/app/staff-app.4e62b67276.js` (category colours,
  `dist/app/staff-category-colours-manifest.json`), after merging `main` into this branch.
- Tests on the candidate footer (live footer with only the loader line changed): Heartbeat guard 80/80, demand rail
  PASS, side logo 39/39 (updated for Marketing Central), fit 220/220, touch 76/76, practice 75/75, practice guide
  100/100, brief 22/22.
- Rollback files saved from Webflow before any change:
  `docs/rollback/staff-footer-before-sidebar-contract-2026-10-21.html` (md5 9f1a7b44eaf431744dabd9b9de674eb5) and
  `docs/rollback/staff-head-before-sidebar-contract-2026-10-21.html` (unchanged by this release).

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
- Rows: 44px at 1920 × 1080 and 1440 × 900. 38px when the window is 880px tall or less (1512 × 862). 36px when 800px tall or less (1366 × 768).
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

1. Put back `docs/rollback/staff-footer-before-sidebar-contract-2026-10-21.html` as the staff page footer
   (md5 9f1a7b44eaf431744dabd9b9de674eb5). Its loader line pins commit `67831981bef7dff20b4b3898de1852ed6ae4ad30`,
   file `dist/app/staff-app.4e62b67276.js`.
2. Read it back.
3. Publish to cornercafefiji.com and www.cornercafefiji.com.

There are no database changes.
