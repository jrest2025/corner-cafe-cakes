# Corner Café CRM — Settings inline-management refinement
Date: 18 October 2026
Status: implementation specification; NOT published.

## Scope
Refine existing Settings only, without dashboard customisation, orders, payments or guest checkout changes.
Keep charcoal-grey interface, legible type, distinctive coloured icons, responsive tablet/desktop layout. Avoid green sidebar.

## Existing architecture confirmed
Supabase project Corner Cafe Cakes (ilbrfwxblhidtlsjgxlh); products, product_sizes, product_variants all exist with RLS.
Products fields include code, name, category, description, dietary_info, allergen_info, lead_days, supports_custom, supports_message, image_url and status ('active','hidden','retired'). Sizes have size_inch, serves_label, price, active; flavours are product_variants with name, sort, active.
Manager writes are protected using has_perm('mgmt.settings'). There is a separate tested administrator-only public.admin_remove_setting(text,uuid,text) removal flow, with private audit log and used-record safeguards (see docs/staff-settings-remove-2026-10-18.md).

## UI requirements
Settings landing: Products & prices; Staff & access; Delivery areas; Hours & closed days; Occasions & special dates; Printing & notifications. Each tile uses coloured icon, short title, one concise description; no second removal section.
Each Settings section provides one header, Add button, searchable row/card list, status chips, and inline per-entry actions Edit, Pause/Restore, Remove (only when eligible). Hide Remove entirely from roles lacking administrator access.
Desktop uses compact legible list; tablet uses 44px+ touch targets, large typography, bounded sheet/drawer editor, no horizontal overflow, clear back/cancel. Maintain space from device edges. Icons never replace accessible button names; tooltips and aria-labels required.

## Products & Prices
- Add product: name, unique code, category, description, photo HTTPS URL/upload integration, dietary/allergen fields, custom/message toggles, notice period. Create only on Save after validation; default hidden until at least one valid active priced size exists.
- Edit product: editable fields above, Save/Cancel; server-side uniqueness and permission enforcement; report errors without discarding entries.
- Manage sizes per product: Add size, inch range 4–24 per existing DB rule, serves label, FJ$ price >=0, on sale/off sale. Prevent removing last available size for active product.
- Manage flavours per product: Add, rename, sort, on sale/off sale; prevent deleting one already referenced by orders.
- Status uses existing active/hidden/retired; UI labels On sale / Off sale / Retired. Use reversible off-sale for previously ordered products; do not cascade delete history.
- Show current product count, variant count, active size count and latest changes if already available.
- Avoid a single fake base price: product prices are attached to sizes, not products. Show 'From FJ$ X' using the lowest active size price.
- No editing past order_items price, order total or product snapshot. Existing orders are immutable historical facts.
- Removal requires entry-specific confirmation, checks current identity and references server-side, records audit, then refreshes section. Call existing administrator-only removal API rather than direct DELETE when it supports the given entity.
- For archived products offer Restore and Edit, not Delete History.

## Other sections, same pattern
Staff & access: invite/enable/disable staff, role and access-level management, no deletion of historical actor links.
Delivery: CRUD fees and area names, pause/restore, protect used areas.
Hours: opening/collection slots, notice and capacity, closed-date add/edit/remove with validation.
Occasions: annual and one-off events, archive/restore, date edit/remove only through existing supported flows; preserve historical analytics tags.
Printing: configure recipients and destinations with test action; queued email is not physical print confirmation.

## Safety / acceptance tests (all required pre-release)
1. Non-admin cannot remove; staff without mgmt.settings cannot save by crafted API call.
2. Create/edit/archive/restore product and size/flavour on test fixtures only.
3. Save failure does not falsely report success or clear unsaved edits.
4. Ordered product / used size / used flavour cannot be hard deleted.
5. Historic order totals, line item descriptions, refunds and analytics unchanged.
6. Price appears correctly on staff and guest ordering flow after refresh; no cache stale state.
7. Tablet 768/1024, phone 390, desktop 1440; focus, keyboard escape/cancel, aria labels; minimum tap target 44px.
8. Tests compare Webflow published footer & immutable bundle hashes; run previous 35 removal, 59 regression and 132 alignment checks.
9. Publish only after tests pass and explicit approval. Retain rollback footer and latest bundled asset.

## Implementation notes
Do not recreate tables or loosen RLS. Remove the separate removal UI only after the same safeguards work beside each entry. Existing removal log must remain.
This document is a specification for code work, not proof of implemented functionality or a deployed release.
