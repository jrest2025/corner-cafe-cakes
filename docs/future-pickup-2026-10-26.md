# Staff future pickup dates — 26 October 2026

## Report
The counter team takes an order today for pickup two weeks later (e.g. 26 October -> 9 November 2026), but cannot easily select the date in the New order flow.

## Investigation
- Corner Cafe `locations.max_days_ahead` = 90; `get_order_setup('corner-cafe')` returns 90 on 26 October.
- No closure dates between 26 October and 15 November.
- Staff app exposes only its first 7 (tablet) or 10 (other devices) pickup quick dates. The only route to later dates is the `Other date` chip, then a separate date-picker trigger.
- The shared `src/staff.date-picker.js` only enforces the underlying input's `min` and `max`; it should already accept 9 November in New order mode.
- Old order (from an already-collected paper slip) must **not** accept future dates. Do not relax this rule.

## Change
`src/staff.future-pickup.js` is an isolated presentation-only enhancement. In the New order pickup-date step it adds two clearly visible buttons above the existing quick-date choices:

- **Choose pickup date (calendar)** — opens the site's existing `Other date` input and shared calendar with a single tap.
- **Pickup in 2 weeks** — selects the Fiji-local date 14 calendar days from today via the application's existing `data-act=n-date` action, with normal validation and time selection.

The enhancement does not save, submit, change prices, modify orders, change settings, or bypass capacity / closure / kitchen lead-time / date-limit checks. It hides itself in Old order mode and preserves the original date picker as a fallback.

## Verification
Mock browser test, 26 October 2026: Chromium at 390px (phone), 768px (tablet) and 1366px (desktop). Passed selection of 9 November, one-tap calendar opening, form state persisting through redraw, no duplicate controls, no horizontal overflow, and Old order mode staying restricted. This tests the enhancement in isolation, **not** a production order save.

## Release and rollback
Publish by adding a pinned loader for this source file to the **Cake Orders - Staff** page head custom code, then publish that page on `cornercafefiji.com` and `www.cornercafefiji.com`. Keep the existing staff app bundle, date picker, and all database objects unchanged.

Rollback: remove only the `cc-future-pickup-loader-20261026` script from that page head, republish, and verify that the original New order form and calendar remain usable.

## Manual acceptance on the real counter tablet
1. Refresh and sign into the Service Hub. Open **New order**, not Old order.
2. Select **Pickup in 2 weeks**: on 26 October it must show **9 November 2026**.
3. Select a collection time, complete the order using appropriate authorised test procedure, and verify the date on review and stored order.
4. Start a second New order. Choose another future date directly via **Choose pickup date (calendar)**, navigate to the next month and select a date.
5. Switch to Old order and verify future dates remain blocked. Confirm kitchen slip and other existing functions are unaffected.
