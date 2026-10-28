# Cake add-ons: controlled rollout checklist

## Changes in PR #46
- Customer and staff can specify extras against a standard catalogue cake without selecting a custom design.
- Original catalogue pricing remains unchanged on the form; extra requests explicitly require a revised quotation.
- Staff entry does not request immediate confirmation if an add-on is specified.
- The guest and staff payloads include `addon_request` and `addon_details` while preserving descriptions in existing `notes` for compatibility.
- Existing staff deletion shortcut is restored on small screens; backend remains permission-controlled.

## Critical backend work NOT yet implemented
- In `_create_order` / the online and staff submission entrypoints, route `addon_request=true` and nonempty `addon_details` to a quote-needed state, not direct confirmation, under a transaction and record audit. Do not trust client-only flags: validate and normalise server-side.
- Implement an authorised staff quotation action for **standard** cakes with extras, preserving `order_items.unit_price` as the catalogue price, adding itemised charge lines with reason, employee, approval version, and total.
- Existing `staff_set_quote` rejects non-custom cakes. Do not call it on standard-cake requests without a backward-compatible server-side change.
- Preserve the existing email-outbox and email template delivery, ensure the quote displays base price + extras + delivery, and distinguish email **queued** from **sent**.
- Require customer acceptance, store its channel and quotation version, and prevent confirmation if the accepted version no longer matches the current revised total.
- When a confirmed order is repriced, do not silently leave it confirmed without securing revised customer approval. Apply existing paid/production safeguards and kitchen acknowledgment.
- Verify `admin_delete_order` with an authorised admin test fixture, no real customer order deleted. Check `ord.delete` permission and exact-reference/reason validation.

## Deployment gate
- Use an isolated database for integrated tests. No production SQL changes from this pull request.
- Test standard no extras, standard with extras, customer rejection, re-quote, quote email failure, duplicate submissions, payment changes, manager overrides, concurrent amendments, kitchen slip, and archive/restore.
- Verify on a real mobile viewport and iPad.
- Hold merge/deployment until all backend stages are complete and their tests pass.
