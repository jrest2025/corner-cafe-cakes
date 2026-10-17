# Staff dashboard spacing refinement — 17 October 2026

CSS-only refinement over the verified staff cleanup bundle. build/staff_spacing.py preserves every byte of dist/app/staff-app.36b7d764f4.js and appends one scoped stylesheet. No order logic, database, prices, settings values or guest-page code changes.

## Changes

- Balanced 24px horizontal gutters on tablets/laptops, 32px on large desktops, 16px on phones; safe-area insets supported.
- Consistent heading alignment, line spacing, separation of heading/actions and panel padding.
- More space around the sidebar logo and clearer separation of menu sections.
- Dates in compact order cards wrap within their column instead of running into customer names.
- Settings labels and fields have more vertical separation; touch inputs and buttons remain at least 44px tall.
- Phone bottom navigation keeps its clearance; the Counter tablet screen keeps its existing outer padding.

## Verification

115 responsive checks across 1920x1080, 1366x768, 1180x820, 820x1180 and 390x844; Today, Orders, Calendar, Customers, Settings, Kitchen and Analytics checked. No horizontal page overflow or script errors. Gutter symmetry, heading inset, logo clear space and touch control sizes verified. Desktop/tablet/phone screenshots inspected with invented data. The 59 staff-cleanup regression checks are rerun against the styled bundle.

The live staff page requires access authorization (HTTP 401 from unauthenticated requests); signed-in production-screen and physical-device checks remain separate.

## Build and rollback

Build with python3 build/staff_spacing.py. Test with test/run_spacing.cjs and test/run_cleanup.cjs (set STAFF_MANIFEST=dist/app/staff-spacing-manifest.json).

Rollback: restore docs/rollback/staff-footer-before-spacing-2026-10-17.html to the staff page footer and publish. This removes the spacing layer while retaining the earlier control fixes. No database rollback.

## Publication

Published to both Corner Café domains on 17 October 2026 under publish task ea3cb72f-3c8a-4645-baee-cdd1ba681b0f. Footer read-back matched the tested release loader exactly. The pinned CDN bundle matched the local tested artifact byte for byte before publication. The festive page remains Draft. The earlier authorisation for full-site publication applies to this refinement.

Release bundle: dist/app/staff-app.8476a58d2c.js, pinned to c12862ab0c19397edb17a6c4ccaafa0db277b1e5. Both 115 layout and 59 workflow checks passed. Signed-in production inspection was not possible from this unauthenticated session.
