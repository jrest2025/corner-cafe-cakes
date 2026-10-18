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
