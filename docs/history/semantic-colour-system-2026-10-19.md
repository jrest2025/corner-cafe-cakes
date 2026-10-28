# Cake CRM semantic colour system — 19 October 2026

This refinement adds one final, scoped presentation layer that reconciles the historical colour and charcoal styles already present in the CRM. It does not introduce new application behaviour.

## Visual language

- Charcoal and cool grey: navigation, headings, borders, ordinary information and inactive states.
- Blue: primary actions, selected controls, information and work progressing normally.
- Green: paid, ready, completed and successful.
- Amber: pending, unpaid, waiting or requiring attention.
- Red: overdue, failed, cancelled, allergy or critical.
- Purple: reminders and customer follow-ups.

Large surfaces stay neutral. Meaning is communicated with restrained badges, icons, narrow card edges and small section accents. Every state retains a visible label or icon, so colour is never the only cue.

## Safety

The layer is CSS-only and scoped to `#cc-staff` / `#ccs-sheet`. It does not change customer or order data, permissions, payments, workflow logic, database calls or print markup. Print keeps a white working surface and existing slip behaviour.

## Verification

Run `node test/run_semantic_colour.cjs`. The test checks semantic mappings, scoping, contrast, forced-colour support and that kitchen-slip selectors are not targeted. `test/semantic-colour-fixture.html` provides invented local records for responsive browser checks across Today, Orders, Calendar, Customers, Dashboard, order details and New Order at desktop, tablet and phone widths.
