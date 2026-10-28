# Responsive padding — 18 October 2026

Roneel requested consistent information padding at screen edges throughout the staff dashboard, accounting for screen size.

Outer horizontal working-area padding: 16px below 760px, 24px from 760 to 1279px, 32px at 1280px and above. Device safe-area insets take precedence when larger. This explicitly includes counter-tablet mode, previously excluded by the shared page rule.

Internal card, settings and selected-day panel padding: 14px phone, 16px tablet, 20px desktop. Island-panel headings and content share the same inset. Order-sheet horizontal padding respects device safe areas while retaining existing vertical spacing and bottom-action-bar clearance. Pop-up width and maximum height retain an outer gap. Desktop tables keep overflow inside their own wrapper, and phone table cards retain their existing layout.

The CSS is injected once after the production application bundle loads, so earlier CSS does not supersede it. The order bundle and its SRI, fallback CDN, authentication, permissions and record handling are unchanged. Source: src/staff.padding.css. Rebuild: python3 build/staff_padding.py. Deploy: dist/staff.padding.footer.html.

Verification: loader passes node --check; all 15 existing layout checks pass; git diff --check passes. No browser visual regression checks were available, so rendered desktop/tablet/phone verification remains outstanding.

Rollback: restore docs/rollback/staff-footer-before-padding-2026-10-18.html to the staff page footer and publish. No database rollback.
