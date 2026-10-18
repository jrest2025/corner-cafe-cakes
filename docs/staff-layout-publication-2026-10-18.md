# Dashboard layout publication status — 18 October 2026

PR #13 merged at 73bf5c930ae1a1b39311d220e5e110e91c4b18b3 after Roneel explicitly confirmed the public repository destination, merge and dashboard publication.

Release: dist/app/staff-app.2e90891108.js
SRI: sha384-wbhgJoBtbIVuFKBEAAjKsOX8Hx/dOIbR6iabHstUwv1TMzAU8o+ijuGEKO8gqr2I
CDN response: 1,178,816 bytes; SHA-384 matched the manifest exactly. All 15 local checks passed.

The staff page footer now points to the release commit. A separate read-back matched the intended footer exactly.

NOT LIVE: automatic approval review rejected the full-site publish because it can include unrelated pending site changes. A materially narrower publish with pageId 6aca162870735ac2247de4dd was attempted, but Webflow returned HTTP 400, Invalid parameter: pageId. Publishing remains pending explicit approval for the full-site scope.

Visual testing is outstanding: browser installation failed, and the live cloud browser reached the staff password wall.

Rollback footer: docs/rollback/staff-footer-before-layout-2026-10-18.html.
