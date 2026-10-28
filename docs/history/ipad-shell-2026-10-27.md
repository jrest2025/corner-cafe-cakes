# iPad shell refinement — preview branch `preview/ipad-shell-20261027` (27 Oct 2026)

Status: live 27 Oct 2026, 2:51 PM (loader 28), approved by Roneel after review.

## Root causes found
1. **Page taller than the screen on iPad Safari.** `#cc-staff` has `min-height: 100vh` (src/staff.css) while the app inside is `100dvh` (src/staff.cal.css). On iPad Safari `100vh` is the height with the toolbar hidden, so with the toolbar showing the document is taller than the window and scrolls.
2. **Page scrolling deliberately re-enabled on touch devices.** The page host code `cc-touch-host` (Webflow page head) sets `html{overflow:visible}` / `body{overflow:visible}` for `(hover:none) and (pointer:coarse)`. Together with (1), the whole shell (menu, header) slides and rubber-bands.
3. **Scroll chaining.** The work area (`#ccs-main`) has no `overscroll-behavior`, so a fling at the top/bottom passes to the page; Safari's toolbar then collapses/expands, `100dvh` changes and the whole app resizes mid-scroll (the "glitchy" jump). Same when order details or pop-ups are open: touches on the shade scroll the page underneath.
4. **Nested scroll boxes.** Fit-to-screen rules (src/staff.css `.ccs-minis`, src/staff.viewport.css `.tq-warn`, overview cards, `.fit-long` in src/staff.fit.css) make small panels scroll on their own inside the work area, so a finger on a card scrolls the card instead of the page.
5. **Oversized for a tablet.** The touch standard (src/staff.touch.css) gives tablets phone-scale tokens (20px body, 56px buttons) and a 230–256px menu (src/staff.sidebar-contract.css overrides the older 96px rail), leaving ~540px of work area on a portrait iPad. The menu list itself scrolls on landscape iPads (951px of menu in 414–480px).

## What changed (one new add-on file, plus one line in polish)
- **src/staff.ipad.js** (new). Switches on only for touch tablets `(hover:none) and (pointer:coarse) and (min-width:744px) and (max-width:1400px)` and only when `#cc-staff` is on the page. Computers, laptops, phones and other site pages are untouched.
  - Stable shell: `#cc-staff` pinned to the window (`position:fixed; inset:0`), page `overflow:hidden; overscroll-behavior:none` on this page only (via a class on `html` that only this page sets). Shell height comes from the layout viewport, not `vh`/`dvh`, so Safari's toolbar no longer resizes the app.
  - One scroll region: the work area scrolls (`overflow-y:auto; overscroll-behavior-y:contain`, native momentum); nested panels on Today/overview flattened; no sideways scroll.
  - Adaptive menu: portrait = 84px rail (icon + short label, Menu button opens the full 280px menu over the page with a shade; choosing a screen or tapping the shade closes it; the work area never resizes). Landscape = 216px proportionate menu; on short screens (<900px tall) section names become thin dividers so the whole menu fits without scrolling.
  - Density: tablet tokens tightened (body 17px, labels 16, small 15, headings 21, titles 27; main controls 48px, small controls 44px = Apple's minimum touch size; inputs 48px). Cards, toolbars and filters a step tighter.
  - Order details, customer profile, pop-ups: full window height, scroll on their own with containment; opening/closing them does not move the app.
  - Keyboard / Safari / rotation: `visualViewport` gives the keyboard height → the work area and sheets get bottom room (`--ipad-kb`) and the focused field is brought into view; the page is snapped back to 0 if Safari pans it. Safe-area insets respected. Rotation re-applies portrait/landscape once settled, without animating the shell.
- **src/staff.polish.js**: the "This week" card's `align-self:start` limited to the computer grid layout (it was shrinking the card's width in the tablet column layout).

Files inspected, not changed: src/staff.css, src/staff.touch.css, src/staff.sidebar-contract.css, src/staff.fit.css, src/staff.cal.css, src/staff.viewport.css. They are compiled into the live app bundle and the Webflow footer; changing them means rebuilding and swapping the bundle. The add-on overrides them on tablets only, with higher specificity, so it can be switched off by removing one file from the loader.

## Verification (test/order-tools/test_ipad.cjs — 87 passed, 0 failed)
Viewports 768×1024, 820×1180 (portrait), 1024×768, 1194×834 (landscape), touch emulation:
- Shell pinned, page height = window height, page never scrolls, no horizontal overflow (page and work area).
- Today, Orders, Customers, Kitchen, Calendar, Analytics: work area is the only scroll region; scrolling past the end moves only the work area (menu and shell rectangles unchanged, page scroll 0).
- No controls clipped outside the work area.
- Order details and customer profile: full height, contained scroll, the app underneath does not move; closing restores the exact position.
- Form field focus: field visible, page does not jump. Simulated keyboard (visual viewport −400px): work area gains 400px bottom room, shell stays at top; closing returns to normal.
- Portrait: rail 84px; Menu opens 280px menu over the page without resizing the work area; choosing a screen closes it. Landscape: whole menu fits, no Menu button.
- Rotation both ways: menu switches, no page scroll or sideways overflow.
- Computer 1366×900, laptop 1280×800, phone 390×844: iPad shell stays off.
Also: test_flow 20/20 with the iPad file loaded; test_polish 147/148 with it loaded — the one difference is intended (iPad dropdowns 48px instead of 56px).

Limits of this testing: Chromium emulation, not a real iPad. Safari's collapsing toolbar, the real software keyboard and rubber-band physics can't be reproduced here; they are handled by the code paths above and should be confirmed on an iPad before going live.

## Note on the touch standard
The stored touch standard (21 Oct) set tablets to 20px body text and 56px buttons. This request asks for higher density on iPad, so iPad tokens are 17px / 48px (44px minimum for small controls). Phones are unchanged.

## To go live (after review)
Add `src/staff.ipad.js` (marker `__ccIpad20261027`) to the order-tools loader at the branch commit, register as a new loader version, swap on the staff page, publish. Rollback: swap back to the previous loader.
