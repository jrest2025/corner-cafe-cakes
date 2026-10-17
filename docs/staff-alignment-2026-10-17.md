# Staff CRM visual alignment — 17 October 2026

CSS-only refinement over the exact released viewport bundle. Logo and Cakes caption centred together in the expanded desktop sidebar; caption centred under the logo at other widths. Panel titles share an 18px bold hierarchy and consistent line height, subtitles sit below their headings, actions remain aligned to the right, and donut charts start on a shared top edge with their legends. Numeric legend columns align right.

Verification: 132 responsive spacing and alignment checks at desktop, tablet and phone sizes; 40 desktop viewport checks including long-list reachability; 59 existing workflow checks. Total 231 passed. Desktop overview fit preserved. Screenshots reviewed. Signed-in production inspection unavailable because the live staff route requires authorization; release is verified through CDN bytes, exact footer read-back and domain publication metadata.

Build: python3 build/staff_alignment.py. Base bundle preserved byte for byte. Rollback: restore docs/rollback/staff-footer-before-alignment-2026-10-17.html and publish.
