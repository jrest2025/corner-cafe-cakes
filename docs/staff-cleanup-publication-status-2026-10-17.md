# Staff cleanup publication status — 17 October 2026

The tested cleanup bundle is saved on main at c8fe0b54ec6a28177045acbc2e26495e90a893ff. All 59 browser checks passed. The published CDN file was downloaded and matched the tested file byte for byte.

Webflow staff page 6aca162870735ac2247de4dd has the new loader staged in its footer and read-back verified. It is not live yet. Webflow returned HTTP 400: Invalid parameter: pageId for the single-page publish request. No full-site publish was attempted.

The festive page 6aaca8c097146d34bf7f120c was confirmed as Draft during the publication check. A full-site publish requires separate authorization because the request scope is wider than this CRM page. Preserve all draft flags and recheck pending site changes before publishing.

The previous live loader remains in docs/rollback/staff-footer-before-cockpit-cleanup-2026-10-17.html. The staged loader is in dist/staff.footer.cleanup.html.
