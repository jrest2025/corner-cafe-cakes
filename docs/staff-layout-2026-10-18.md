# Shared dashboard layout refinement — 18 October 2026

Requested by Roneel after reviewing the calendar screenshot, with changes applied to shared staff components.

## Changes

- Shared readable headings, body/hint text, input sizes, focus rings, page gutters and navigation icon alignment.
- Compact calendar controls and occasion strip.
- Calendar uses full width until a date or order is selected. Close details returns that space and restores focus to Today.
- Month summaries show collection/delivery icons, two-line cake descriptions, full descriptions in title text, and a clear View all N orders label for busy days. Selecting the date continues to use the existing day panel and order actions.
- Today and the selected day have different treatments. Month summaries are no longer hidden by the fit-to-window script; the working area may scroll on short screens.
- Existing smaller-screen calendar sheets, permissions, orders, payments and database operations are unchanged.

## Build and verification

`python3 build/staff_layout.py` checks the SRI of the exact live wide-screen release, then performs asserted replacements and loads the new CSS last. Sources: src/staff.layout.js and src/staff.layout.css. Manifest: dist/app/staff-layout-manifest.json.

`node test/run_layout.cjs`: 15 checks passed, covering summaries, labels, overflow count, status mapping, escaping, fallback text, fitting, syntax, integrity and selection/close integration. `git diff --check` passed.

Visual regression tests were NOT run: the local browser executable was unavailable and the official browser download failed. The live cloud-browser visit reached the Corner Café Staff Access password wall, so signed-in desktop/tablet verification is also outstanding. These checks do not establish that every screen is visually correct.

## Recovery

The previous published footer is retained in docs/rollback/staff-footer-before-layout-2026-10-18.html. Restore that footer and republish to return to the prior production bundle; no database rollback is required.

Publication status is recorded separately after deployment.
