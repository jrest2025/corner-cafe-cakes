# Universal colour and chart-weight tokens, phase 1: Cake CRM Analytics (candidate, 21 October 2026)

Not live. Waiting for Roneel to say "deploy".

## What it is
- One token library (`--jr-*` on `#cc-staff`) for all Jack's Restaurants apps: the brief's identity, accent and neutral colours, semantic states (success, warning, error, info, neutral), a ranked categorical order (teal, amber, violet, blue, coral, sage), fixed meanings (New = Royal Blue, Returning = Ocean Teal, pending = light amber) and chart weights.
- Chart weights: primary line 2.25px, comparison line 1.75px dashed, axis 1px, grid 1px (agreed instead of 0.75px), sparkline 1.75px, markers 3px growing to 5px on hover, bar corners 4px, donut ring 14px.
- Corner Café accent: Ocean Teal.

## What changed on Analytics (styles only)
- Headline tiles: white surface, 4px accent edge; up and down pills use success and error.
- Single-series columns and bars: one teal, the peak in deep teal, light amber for "not confirmed".
- Donuts: one ring width, the ranked palette, Other always grey. Both donut systems now use the same palette.
- Heatmaps: one ordered teal scale with readable text at every step.
- Year on year: one hue, latest year strongest (was three unrelated colours).
- Occasion report lines, Overview fallback trend and sparklines: token weights.
- "What to do" cards on the tab pages: semantic tones.

## Not touched (protected)
- The Cake Heartbeat, Daily cake demand rail, Seasonal booking buildup, the Heartbeat's own insight cards and the Occasions Booking curve (svg.oi-curve, .oi-ctab). Before and after pictures of the Heartbeat and the Booking curve are pixel-identical.
- No JavaScript, data, calculation, chart type or axis changes.

## Build
- `python3 build/staff_colour_harmony.py` appends `src/staff.colour-harmony.css` to the live release `staff-app.8d6bea61b9.js`.
- Candidate: `dist/app/staff-app.8d2db54212.js` (`dist/app/staff-colour-harmony-manifest.json`).
- Pictures: `test/shots_colour_harmony.cjs` (BUNDLE, OUT env).

## Checks on the candidate
| Check | Result |
|---|---|
| Heartbeat guard | 80/80 |
| Daily Cake Demand contract | pass |
| Analytics tabs | 42/42 |
| Touch standard | 76/76 |
| Semantic colour | 18/18 |
| Analytics insights | 24/24 |

## Known limits
- Donut colours follow rank within each chart, because the chart code assigns them that way. A fixed colour per channel or occasion needs a small code change (phase 1b).
- Amber, coral and sage fills are below 3:1 against white; every slice and bar keeps its label and value, so colour is never the only cue.
- The app has no dark mode, so no dark variants were needed.

## Release when approved
Change the staff page footer's app loader line to the candidate commit and file, read it back, publish to both custom domains. Rollback: put back the current live footer (`test/fixtures/staff-footer.html`).
