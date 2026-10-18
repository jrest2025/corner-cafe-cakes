# Jack's Restaurants — Shared Dashboard Experience Contract
Version 1.0 | 18 October 2026 | Applies to: Universal Reservations Hub, Corner Cafe Cake CRM, Kazumi Reservations

## Intent
Three recognisably different applications, one learned operating model. This specification covers **shared capabilities and their placement**, not just colours. Product-specific capabilities remain independent. No data, permissions or operational process is to be changed merely for visual parity.

## Common information architecture
Use the following semantic destinations and their ordering whenever applicable. One semantic destination must never be given a different name or placed elsewhere solely due to brand.
1. **Today** (home / operational overview) — house icon
2. **Calendar** (all-date view, available on desktop and tablet) — calendar-days icon
3. **Records** (Bookings in reservation systems; Orders in cake CRM) — list icon
4. **Customers** (Guests in reservation systems; Customers in CRM) — users icon, subject to access permissions
5. **Analytics** — chart-column icon, subject to access permissions
6. **Service view** — panels-top-left icon, consistently in the lower operational-navigation group for all three; tablet-first simplified full-screen mode
7. **Settings** — settings icon, in the persistent utility group; admin-only areas respect permission controls
8. **Help** — circle-help icon; **Account** — user-round icon; **Sign out** — log-out icon, grouped at the bottom.

These labels are conceptual standards. Implementation must review existing task routes, role gates and menu ergonomics before renaming or inserting entries. Specialised sections (Kitchen, Grills, Floor, Handover, Waitlist, etc.) appear between Records and Analytics as appropriate; they must not move the common footer controls.

## Common interactions
- Same search placement and search affordance; same primary Add/New record action placement, with context-correct name.
- Clicking a record opens a right-hand detail drawer when sufficient horizontal space exists, otherwise an accessible modal/bottom sheet. Preserve focus, Escape behaviour and unsaved-change confirmation.
- Consistent date controls: Today, previous/next period, date picker, selected date; calendar accessible on laptop/desktop/tablet/phone, with application-specific data.
- Same alert priority hierarchy and semantic status meanings; do not rely on colour alone. Distinguish success, pending, warning, danger and neutral consistently.
- All buttons/fields/taps at least 44 CSS px high where operationally interactive. Keyboard navigation and visible focus states required.
- Primary heading left aligned; actions right aligned; avoid fine print or clipped values; preserve long customer names and dates.
- Side menu may collapse; location/order of shared items remains consistent. Tablet service view must be explicitly enterable/exitable, not inferred only from screen size.
- Staff permissions govern visibility and mutations; no cross-application exposure of restricted records.

## Shared responsive design tokens
- Working-area horizontal gutters: phone (<760px) 16px; tablet/small laptop (760–1279px) 24px; desktop (>=1280px) 32px. Honour safe-area insets.
- Inner card padding: phone 14px, tablet 16px, desktop 20px.
- Working/body text 16–17px; supporting text 15px minimum; primary record details 17–18px; section titles 20px; page titles 23–26px; sidebar labels 16px where expanded.
- Neutral charcoal navigation foundation; white/light working surfaces; restrained brand accents unique to each app. Semantic warning/critical colours must not be overridden by brand colours.
- Use the same icon family, stroke size, baseline, label spacing and active/hover/focus patterns.

## Product-specific scope
- Corner Cafe: cake production, collection/delivery dates, occasions, handover, payments, customer CRM.
- Universal Hub: venue switching, reservations, waitlist, multi-restaurant reporting and service.
- Kazumi: sessions, teppanyaki grill allocation, seating/floor workflow, dining experience controls.
The common Calendar shows the product's own operational date records. Shared destinations must not imply identical underlying data models.

## Implementation and acceptance gates
This document is a **contract, not a deployed UI change**. For each app:
1. Inventory current routes, available shared capabilities, sidebar/footer positions, icon names and role gates; record gaps.
2. Add any missing shared destination with a real functioning route and keyboard/touch access, without breaking existing flows.
3. Align labels, nav order, footer positions and iconography. Keep special-purpose destinations in their own group.
4. Apply spacing, typography, viewport, drawer/modal and state-colour rules using that app's existing styling system. Do not forcibly share CSS assets across independently deployed apps.
5. Test every destination and action by role (admin/manager/staff), each record flow, accessibility and horizontal overflow at 390x844, 768x1024, 1024x768, 1366x768 and 1920x1080; test collapsed navigation.
6. Run each repository's native regression/build suite; confirm versioned deployment bundle and exact live artifact checksum before claiming production.
7. Record before/after captures, tests, rollback method and production status. Do not merge or deploy without appropriate release validation.

## Cross-app parity checklist
| Shared feature | Corner Cafe | Universal Hub | Kazumi |
|---|---|---|---|
| Today / overview | Required | Required | Required |
| Calendar, desktop + tablet | Required | Required | Required |
| Orders / bookings | Orders | Bookings | Bookings |
| Customer / guest records | Customers | Guests | Guests |
| Search + Add | Required | Required | Required |
| Analytics | Role-based | Role-based | Role-based |
| Service view (bottom utility position) | Counter workflow | Host stand | Teppanyaki/service |
| Settings / Help / Account / Sign out | Consistent placement | Consistent placement | Consistent placement |
| Right drawer or modal fallback | Required | Required | Required |
| Shared readable typography / gutters | Required | Required | Required |

Ownership: Jack's Restaurants Marketing / dashboard product owners. Update this contract in all three repositories together whenever a shared destination, design token, interaction pattern or accessibility criterion changes.
