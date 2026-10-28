# Staff cockpit cleanup — 17 October 2026

This release changes the existing controls and feedback. It does not change the database, payments, order states, guest form, permissions, printer destinations, or paper size.

## Included

- Printing email destinations have clear editable labels and instructions.
- Queued slips and test slips are described as waiting, not already sent.
- Printing status distinguishes test mode, emailing off, and a checked printer; it does not claim physical printing is working.
- A printer test or confirmation is refused while printer settings have unsaved changes.
- Printer settings save refreshes the destinations shown under Order alerts.
- Custom-cake confirmation instructions match the separate Make slip action.
- Collection settings refuse zero booking windows, missing collection times, and notice periods longer than the booking window. Validation releases the Save button.
- A collection-settings save must return the updated location before reporting success.
- Delivery-area failures warn that some areas may have saved and keep the entered values for retry.
- Late printer responses cannot redraw a different Settings session.

## Release isolation

The source templates contain an unfinished no-mobile feature (fc4c0d1) not loaded by the live staff page. A generic source rebuild would include it. For this release, build/staff_bundle.py reproduces the exact published JavaScript from commit 60aae967852e5797ffe5a258f126157056902801, checks byte-for-byte parity, applies build/staff_cleanup.patch without fuzz, and minifies the reviewed changes. The live CSS wrapper is preserved byte for byte. The cleanup patch is retained for later source-template builds; this release does not upload the broader src/staff.js template containing that unfinished feature.

Build: install terser@5.31.0, then run `python3 build/staff_bundle.py`.

## Verification

`test/run_cleanup.cjs` passed 59 browser checks with invented records and all remote requests blocked. Baseline and cleanup were compared at 1366x768, 1180x820, 820x1180, and 390x844 for Today, Orders, Calendar, Customers and Settings. No horizontal page overflow or script errors occurred. Printer draft protection and collection-setting validation/save paths passed. The release contains no CSS changes. Physical printer output and real guest messages were not exercised.

Run the test with Playwright installed; optionally set PLAYWRIGHT_MODULE and CHROMIUM_PATH for the local runtime.

## Rollback

Restore docs/rollback/staff-footer-before-cockpit-cleanup-2026-10-17.html as the staff page footer, read it back and publish the staff page. No database rollback is needed. Do not delete old bundles.

## Still to address separately

- Backend printer verification must bind a successful test to the current saved destination and paper size; the frontend draft guard does not replace this.
- Payment overage handling and server-side validation need a reviewed financial workflow.
- Order pagination above the 400-record query cap.
- Atomic delivery-area and legacy price saves.
- Physical DL printing and independent staff end-to-end acceptance.
