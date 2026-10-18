# Screen-first application readability — 18 October 2026

Roneel's screenshot showed operational text reading like fine print, despite substantial unused space. Roneel confirmed this is a screen-based working application and instructed us to proceed.

Replace 12.5px island previews with 15px support text on normal screens and 16px at 1600px and above. Working/body text is 16–17px; primary details 17–18px. Page headings 23–26px; section headings 20px. Apply the hierarchy to order details, next steps, urgency explanations, customer metrics/activity, tables, inputs, pills, calendar summaries and order detail sheets. Sidebar labels are 16px.

Cards and previews wrap and grow; full instructions and cake names remain visible. Calendar fitting continues to measure actual text height and offers View all when fewer summaries fit. Existing responsive gutters and corporate colours remain.

Source: src/staff.readability.css. Build: python3 build/staff_readability.py. Footer: dist/staff.readability.footer.html. Rollback: docs/rollback/staff-footer-before-readability-2026-10-18.html.

Verification: exact generated loader parsed and its onload callback executed in a simulated DOM, confirming all preceding style layers plus readability are appended in the intended order without runtime exceptions. Existing 55 CRM/layout/geometry checks pass. git diff --check passes. No signed-in rendered browser verification was available; these checks do not verify visual layout on the user's screen.
