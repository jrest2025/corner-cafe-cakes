# Universal colour and chart-weight tokens, phase 1: Cake CRM Analytics (live 21 October 2026)

Live from about 8:55 PM Fiji time, 21 October 2026. Roneel said "deploy" at 8:48 PM after seeing the before and after pictures. Published to cornercafefiji.com and www.cornercafefiji.com (not the Webflow subdomain).

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

## Release
- App loader now points at commit `1796348b9c9d5a5cd37a9a5e077af3a9588fba4d`, file `dist/app/staff-app.8d2db54212.js` (md5 `f7ecfb9eebf78f5e3c67ccc42a66b21d`, identical on raw.githubusercontent.com).
- Footer built by `build/page_release_colour_harmony_20261021.py`: 49,491 characters, md5 `3d89bb33139af52ac9318b4f5f2bbe60`. Only the app loader line changed. Head unchanged.
- Before writing, the live footer was still the 7:52 PM release (md5 `be57f4389162c01c9d1c6e75f9bbbf75`). Read back after saving: identical to the built file. It is now `test/fixtures/staff-footer.html`.
- Heartbeat guard on the exact published footer: 80/80.

## Rollback
Put back `docs/rollback/staff-footer-before-colour-harmony-2026-10-21.html` as the staff page footer (md5 `be57f4389162c01c9d1c6e75f9bbbf75`), read it back, then publish to both custom domains.

Staff need to refresh the counter tablet once to get the new version.
