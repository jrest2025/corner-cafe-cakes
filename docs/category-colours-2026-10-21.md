# Phase 1b: donut legends keep their names; one fixed colour per channel and occasion (live 21 October 2026)

Live from about 9:40 PM Fiji time, 21 October 2026. Roneel said "deploy" at 9:30 PM. Published to cornercafefiji.com and www.cornercafefiji.com (not the Webflow subdomain).

## What changed
- Donut legends: names no longer disappear in narrow cards (for example "Sales by channel"). In a narrow card the donut sits above its legend, and long names wrap.
- Fixed colours on donuts whose names are all channels or all occasions, the same in every chart and period:
  - Channels: Online Royal Blue, Walk-in Ocean Teal, Phone Amber, WhatsApp Sage, Social media Violet, Corporate Deep Navy, Not recorded grey.
  - Occasions: Birthday Ocean Teal, Anniversary Coral, Mother's Day Violet, Father's Day Royal Blue, Christmas deep sage, Valentine's Day deep coral, Wedding Amber, Corporate event Deep Navy, Baby shower Soft Cyan, Graduation slate blue, Just because light violet, Other and Not specified grey.
- Cake and size donuts keep the ranked palette.

## How
- `src/staff.category-colours.css` (styles) and `src/staff.category-colours.js` (display only: reads each donut's legend names after it is drawn and recolours that donut). No chart code, data or figures changed.
- Build: `python3 build/staff_category_colours.py` appends both to `staff-app.8d2db54212.js`, giving `dist/app/staff-app.4e62b67276.js` (md5 `1d13a640c5f03d955ada9294a48d2c5e`, identical on raw.githubusercontent.com) at commit `67831981bef7dff20b4b3898de1852ed6ae4ad30`.
- Footer: only the app loader line changed. 49,491 characters, md5 `9f1a7b44eaf431744dabd9b9de674eb5`. Live footer checked before writing (md5 `3d89bb33139af52ac9318b4f5f2bbe60`) and read back after saving (identical).

## Not touched
- Heartbeat, Daily cake demand, Seasonal booking buildup, Occasions Booking curve: Overview and Occasions pictures are pixel-identical before and after.

## Checks
Heartbeat guard 80/80 on the published footer; Daily Cake Demand contract pass; Analytics tabs 42/42; Touch 76/76; Semantic colour 18/18; Analytics insights 24/24.

## Rollback
Put back `docs/rollback/staff-footer-before-category-colours-2026-10-21.html` (md5 `3d89bb33139af52ac9318b4f5f2bbe60`), read it back, publish to both custom domains.
