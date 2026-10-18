# Wide screens: island previews and two-column order cards — 18 October 2026

Approved by Roneel 16:54 Fiji. In the two-pane view (desktop and iPad landscape) each island previews its first two orders and "+N more"; the reading pane shows order cards in two columns once it is at least 800px wide, with status pills under the cake details. Handover's pane uses the same card layout. iPad portrait and phones unchanged.

Release commit d0688740cfba72ffe476a53672749b8406c3260d, artifact dist/app/staff-app.39068f51b2.js, SRI sha384-YR2GvV14JOOpg86gP7iLsXsQiyynPYzyXzWz7hWSG1q6271JJD+MnqomB0VqsiUK. Tests: wide 42 (new), fit 220, Needs attention 171, islands 78, calendar 70, viewport 40, alignment 132, spacing 115. Footer read-back matched. Published to both production domains.

Live signed-in check not done: the Chrome extension could not be reached from this session after publishing.

Rollback: docs/rollback/staff-footer-before-wide-2026-10-18.html (returns to the fit-to-screen release).
