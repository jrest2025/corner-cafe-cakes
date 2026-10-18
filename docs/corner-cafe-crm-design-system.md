# Corner Cafe CRM — approved site-wide visual palette (18 October 2026)

## Visual direction
Use the user's reference image as an accent-colour system, **not** as a requirement to imitate the old application or place saturated tiles everywhere. Modern executive CRM: neutral warm-white workspaces, charcoal navigation, fine borders, disciplined typography, readable charts, restrained semantic colour.

## Colour tokens
| Purpose | Hex | Use |
|---|---|---|
| Brand forest green | #4B6339 | Corner Cafe primary identity, selected primary CTAs |
| Production purple | #955CA1 | Production and calendar workload accents |
| Formulas amber | #FDBB19 | Formula/costing-related navigation and tiles, dark text |
| Inventory lime | #92C83D | Inventory and cake-volume accents |
| Customers magenta | #DA4693 | Customer CRM/segmentation accents |
| Vendors blue | #528DCB | Vendor/supplier and planning accents |
| Compliance slate blue | #9FB9C9 | Compliance and governance accents |
| Reporting turquoise | #62C9D7 | BI/analytics accents |
| Text ink | #273443 | Primary body and headings |
| Muted text | #68768A | Labels |
| Border | #E1E7ED | Dividers and understated card borders |
| Page | #F5F7FA | Canvas |
| Card | #FFFFFF | Panels |

## Application rules
- Accent colours denote **sections and families**, never overwrite operational danger/success/warning status. Green=brand, but use distinct semantic confirmation green for success; red means action/error only.
- Keep typography and geometry unified site-wide; vary only subtle top/side accent strokes, highlighted active tabs, chart series and small icons.
- Calendar should be **full width with no blank detail pane** until the date is selected. When selected, show contextual details without obstructing the grid.
- Month grid: strong date hierarchy, legible cake counts, concise appointment rows, subtle traffic load cue, restrained occasion colours, responsive sizing.
- Summaries and Analytics must be driven by real source records. No invented performance numbers. No long narrative paragraphs within management dashboards.
- Reference: Screenshot submitted 18 October 2026 showing colourful Production, Formulas, Inventory, Customers, Vendors, Compliance and Reports tabs. Its tile saturation is inspiration only; retain Corner Cafe's charcoal/green brand system.

## Implementation
Calendar stylesheet: `src/staff.calendar-dashboard.css`. Read-only month summary enhancer: `src/staff.calendar-dashboard.js`. Loaded by the pinned Webflow staff page footer after the hosted CRM bundle. The base CRM and booking functions remain untouched. To revert, remove the calendar-dashboard asset loader from that footer and republish.

## Calendar month interaction (approved 18 October 2026)
The month grid shows date, order/cake count, holiday and occasion indicators only. Pickup times, cake names and order details belong in the selected-date view, using the existing right-hand panel on desktop and the native sheet on mobile/tablets. Preserve existing order actions and permissions; keep month cells legible and compact.

## Approved Cake Analytics structure — locked 19 October 2026

**Preserve the current visual hierarchy and scope in future refinements.** The user approved the V3 Analytics layout and specifically requested only typography, text, spacing, legibility and responsive polishing without restructuring.

- Executive six-card summary: cakes booked, orders received, estimated booking value, confirmed cakes due, confirmed future order value, and average booking lead time.
- Two large charts: cakes booked by booking date and cakes due by collection date.
- Supporting charts: cake types, booking channels, lead time, weekday demand, upcoming pipeline, occasion mix.
- Wide horizontally scrollable day-by-day cake-demand curve, defaulting to cakes due, with measure and cumulative toggles.
- Expandable selected-day details. Operations and follow-ups stay out of the Analytics section.
- Reporting source remains staff-authorized `dashboard_register` (read-only). Never treat estimated booked value as payments received or completed sales; do not invent numbers or compare incompatible date bases.
- Maintain accessible labels (approximately 12–14px minimum for dense chart text), concise management wording, balanced panel sizes and mobile layouts.
- Preserve the isolated analytics loader, fixed commit references, fallback behaviour, and all other tabs untouched. When refining, test combined script compilation and representative calculation paths before publication.
- Baseline source ref: `0e007cf197d6e76ffa86836f9426946df435a8c4`, additionally snapshotted under `snapshot/approved-cake-analytics-v3-2026-10-19`.

## Windowed Daily Cake Demand release (19 October 2026)
- Preserve the previously approved six KPI cards and eight chart panels. Only the Daily Cake Demand component was changed.
- In the default two-line mode, dashed purple shows cakes on their verified booking date (past through today), and solid green shows scheduled cake collections on pickup date. Upcoming pickup cakes require `confirmed` status; do not count unknown historical statuses as confirmed future obligations.
- Month picker spans historical months through December 2027, but only ~46 days are rendered per selection, preventing the previous 500+-day rendering regression. The 7/30/90-day reporting period controls for other charts remain independent.
- Historical cleaned worksheet `Cake_Orders_Cleaned(1).xlsx` was audited: 578 source submissions (398 Walk-In, 180 Online), 573 analysis_include=Yes, 393 review_required=Yes, nine possible duplicate pairs, and predominantly Unknown source confirmation statuses. Existing Supabase register already contains 398 walk-in and 177 online records, so DO NOT re-import these files blindly.
- Live source remains the staff-authorized `dashboard_register`, not a client-side spreadsheet upload. Keep non-confirmed historical records distinct from confirmed orders or sales.
- Rollback baseline 82263b98ed98e55ea788fae1a826052eaf1cd3d2.
