# Staff dashboard-wide theme completion, including order forms — 18 October 2026

Roneel requested the same colour scheme and logical design across all Corner Café dashboard pages, including order forms. This extends the existing dashboard theme into forms and supporting sheets; it does not redesign the public guest website.

Consistent primary blue order actions, muted selected choices, teal completed progress and neutral pending steps. Customer creation uses the existing rose accent. Shared field/label spacing, clear section headings, screen-only order summaries, button shape and focus treatment. Counter-tablet inputs retain 20px text and larger touch targets. Order, amendment, customer and settings form controls share the same visual language.

Preserves native form step order, calculations, validation, permissions, payment handling and allergy/warning/danger semantics. Dietary choice chips are deliberately excluded from the generic selected-choice treatment. Existing print layout and PDF generation are unchanged. No record writes or database changes.

Source: src/staff.forms-theme.css. Build: python3 build/staff_forms_theme.py. Exact output: dist/staff.forms-theme.footer.html. Prior release: docs/rollback/staff-footer-before-forms-theme-2026-10-18.html.

Verification: exact generated loader parses and executes through its onload callback in a simulated DOM, confirming all prior style layers plus the form theme append in order without runtime errors. Existing 13 CRM DOM checks, 15 layout checks and 27 simulated calendar geometry checks pass (55 total). git diff --check passes. Signed-in rendered browser verification remains outstanding.
