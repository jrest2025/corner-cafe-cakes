# Enterprise CRM refinement — 19 October 2026

## Scope

Application-wide review of the staff CRM using invented local records. No live customer, payment, order or kitchen-slip data was read or changed.

Screens reviewed: Today, Needs attention, Orders, order detail, New order, Calendar, Counter tablet, Kitchen, Handover, Customers, Analytics, Register and Settings. The existing shared hospitality, readability, layout, forms, icons, island, status and responsive layers already provide the requested visual system; this pass does not add a competing global override.

## Changes

- The shared custom date picker now supports direct previous/next-year movement.
- Calendar dates use one roving keyboard stop rather than forcing Tab through up to 42 days.
- Arrow keys move by day or week; Home/End move to the start/end of a Monday-first week; Page Up/Down move by month; Shift+Page Up/Down move by year.
- The calendar grid exposes selected dates with `aria-selected`, announces month/year changes, and marks required triggers for assistive technology.
- Analytics merges duplicate display labels before folding small categories, preventing two indistinguishable `Other` slices while preserving totals and drill-down records.

## Validation completed

- JavaScript syntax checks for the date-picker and analytics sources.
- Analytics category regression: unique labels and unchanged total.
- Rendered local CRM at 1440, 1280, 1024, 768 and 390 CSS pixels: no horizontal overflow; main operational text remained 18px in the fixture.
- Rendered custom calendar: direct year controls present, one roving grid stop, Arrow Right moved 20→21 October, and Page Down moved 20 October→20 November.
- Existing date selection, original input value propagation, min/max boundaries, Fiji date handling, Escape close and focus return remained intact in the rendered fixture.

The browser-level automated Playwright suite remains available in `test/run_date_picker.cjs`. In this workspace the standalone browser executable is unavailable, so its new assertions were exercised manually in the in-app browser and are not described as a completed automated run.

## Explicitly unchanged

- Database schema and records
- Authentication and permissions
- Order, payment, confirmation, production, collection and handover logic
- Kitchen-slip content, paper layout and print destinations
- Customer communication and consent rules
