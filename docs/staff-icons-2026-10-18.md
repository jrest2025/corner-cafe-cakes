# Staff CRM coloured icons — 18 October 2026

Seven familiar controls now use compact coloured icons: four Refresh controls, Print on this device, and two repeated Edit buttons. Refresh is teal; edit is amber; print and navigation arrows/close remain grey. Search fields show a blue magnifier and retain useful placeholders. The customer Edit details action keeps text with an amber pencil. Navigation keeps labels and uses distinct icon colours on charcoal. Paid, allergy, warning and favourite colours stay intact.

Accessible names remain available to screen readers. SVGs are decorative; labels and existing contextual aria-labels are preserved. Native hover titles and keyboard-focus tooltips explain icons. Compact controls have minimum 44-pixel targets. No event handlers, APIs, permissions or order/payment logic changed. The build makes seven asserted markup replacements in the exact live charcoal bundle and appends scoped CSS.

Validation: 42 dedicated icon/accessibility/refresh checks at 1920, 1366, 820 and 390 pixels; 132 alignment, 40 desktop viewport-fit, and 47 existing payment/favourite checks. Tests use invented records with remote requests blocked. Production signed-in visual inspection unavailable; publication verification uses exact footer readback, CDN byte comparison and domain publication metadata.

Rollback: restore docs/staff-icons-rollback.footer.html to the staff footer and republish both production domains.
