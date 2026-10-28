# Staff cleanup publication status — 17 October 2026

Published to cornercafefiji.com and www.cornercafefiji.com at 22:32 Fiji time (2026-10-17T10:32:06.858Z). Webflow publish task: a6aa2dbb-e9a9-4f49-8cc6-757a5f14905a, scope site. Roneel explicitly approved full-site publication after the site's single-page request returned HTTP 400: Invalid parameter: pageId.

The staff page footer loads dist/app/staff-app.36b7d764f4.js pinned to c8fe0b54ec6a28177045acbc2e26495e90a893ff with its SHA-384 integrity fingerprint. The staged footer was read back exactly before publishing. The CDN bundle matches the tested release byte for byte.

All 59 pre-release browser checks passed with invented records, covering desktop, tablet and phone widths, navigation, printing controls and settings saves. The live staff URL returns HTTP 401 access protection, so a signed-in production screen was not inspected in this session. Physical printer output was not tested. No database, live orders, payment records or printer addresses were changed.

The festive page 6aaca8c097146d34bf7f120c was confirmed Draft after publication. The unfinished no-mobile feature is excluded from the released bundle; only the cleanup patch, release artifact, tests, documentation and rollback were uploaded.

Rollback: restore docs/rollback/staff-footer-before-cockpit-cleanup-2026-10-17.html to the staff page footer and publish. No database rollback is needed. dist/staff.footer.html and dist/staff.footer.cleanup.html contain the released loader.
