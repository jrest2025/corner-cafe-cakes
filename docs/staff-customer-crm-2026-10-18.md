# Customer CRM and shared dashboard palette — 18 October 2026

Roneel requested a lively, professional customer CRM using the supplied purple/amber/lime/pink/blue/turquoise reference, then asked to carry the same scheme tastefully through the other staff areas.

## Customers

Four strong primary metric cards and four softer supporting cards; distinct icons; responsive four/two/one-column layouts. Customer directory, due-today and overdue metrics use existing native actions. All six follow-up/opportunity categories open their corresponding existing lists, including truthful empty lists when counts are zero. Existing record access, permission checks and calculations remain. Recent activity adds customer initials while preserving original customer links and text. Cards take content height rather than stretching into empty white panels.

## Shared dashboard design

Restrained module accents: teal for Today, Handover and Analytics; amber for Needs attention; blue for orders/register; purple for Calendar and Settings; warm orange for Kitchen; pink for Customers. Consistent heading marks, soft metric backgrounds, tab states, table headers and panel shapes. Charcoal sidebar and operational status colours retain their existing meanings. Responsive gutters, safe areas and the calendar viewport correction remain.

## Implementation

Source: src/staff.customer-crm.js, src/staff.customer-crm.css, src/staff.dashboard-theme.css. Build: python3 build/staff_customer_crm.py. Footer: dist/staff.customer-crm.footer.html. The enhancement loads after the exact published staff app and earlier padding/viewport patches, with the same application SRI and CDN fallback. No database change or customer-record write.

## Verification

13 DOM behaviour checks passed using linkedom 0.18.12 (set LINKEDOM_MODULE or install it before running test/run_customer_crm.cjs); 15 existing layout checks and 27 calendar geometry checks passed. Loader syntax and git diff --check passed. No signed-in rendered browser verification was available, so these checks do not establish that every screen is visually correct.

Rollback: restore docs/rollback/staff-footer-before-customer-crm-2026-10-18.html and publish.
