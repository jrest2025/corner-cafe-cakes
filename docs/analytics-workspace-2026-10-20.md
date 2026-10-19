# Analytics workspace — 20 October 2026

Overview is explicitly excluded. The independent enhancement applies only to Cake orders, Café sales, Marketing, Website, Occasions, Insights and Data. It adds movable information islands, width controls, hide/restore, save/cancel and reset. Layout preferences are scoped to module and subsection and saved on the current browser; they are not synced between devices.

Cake-order sections are separated at their existing report boundaries. Values, filters and drill-down keys are retained. Sales has four primary figures, a separate tax/comparison card, a monthly chart generated from the existing selected-year table, and expandable detail tables. The chart is a selected-year view, not the filtered-period trend. It does not infer coverage or forecast missing months.

The main period selector remains visible; other filters open together. Mobile section navigation uses a select tied to the existing section actions. Desktop cards support dragging by their Move handle; arrow buttons work on keyboard and touch. Width choices collapse into one column on phones.

Café sales, Marketing and Website now have four template islands each, explicit required fields and existing dataset-template download actions. No synthetic chart values are shown. A detected dataset still needs validated report mapping; this change does not implement the pending POS, campaign or web-event analytics calculations.

## Required data

| Dataset | Supplied by | Grain | Required fields | Optional or additional fields |
|---|---|---|---|---|
| Cake orders | Existing cake register | Order, with item quantities | Reference, reliable order date, pickup date, item/size/quantity, value, status, payment status, channel | Stable customer ID, occasion, refunds, campaign ID |
| Cake costs | F&B Costing | Cake and size from an effective date | Cake, size, ingredient cost, packaging cost, cost applies from | Direct labour cost, costed by; agree whether profit includes labour |
| Café daily sales | Finance / POS | Trading day | Business date, gross sales incl. VAT, discounts, refunds, net sales incl. VAT, VAT, transactions | Guests, sales target |
| Café product sales | Finance / POS | Item and trading day | Business date, item code, name, category, quantity, net revenue incl. VAT | Discounts, food cost |
| Campaigns | Marketing | Campaign, platform and day | Date, campaign ID, name, platform, objective, spend | Impressions, reach, clicks, enquiries, orders, attributed revenue, attribution method |
| Website | Website analytics | Day and traffic source | Date, source, sessions | Campaign ID, landing page, form starts, submitted orders; device analysis needs an additional device dimension, absent from the existing upload template |
| Occasion calendar | Settings | Occasion and year | Occasion code, year, start and end dates | Promotion lead days |

Unknown optional fields stay blank, not zero. Revenue from a campaign is not established by overlapping dates; traceable attribution is required. Form submissions are not completed sales. Shared costs, VAT treatment and coverage periods need agreement before profitability and like-for-like comparisons are enabled.

## Verification

- JavaScript syntax and analytics category regression passed.
- 19 DOM checks passed, including unchanged Overview markup, real values and original drill-down keys, save/restore/reset/cancel, independent subsection preferences, corrupt-preference fallback and truthful template states.
- Rendered all seven detail modules at 1440×1000, 1024×900, 768×1024 and 390×844 against invented test records: no horizontal overflow, no islands outside the viewport, no page errors. Move and save controls passed at each width. A separate real pointer-drag check, saved-width restoration and switching back to unmodified Overview also passed.
- Original engine and its backend calls are not rebuilt or replaced by this enhancement.
