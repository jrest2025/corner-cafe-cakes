# Desktop dashboard viewport correction — 17 October 2026

The Analytics overview overflowed its allotted height even at 1920x1080: the main area scrolled 1424px inside a 1080px viewport. The Today overview also needed main-area scrolling at 1536x864 and 1366x768. The issue was stacked panels with their own minimum heights, not insufficient monitor size.

## Correction

A CSS-only layer arranges the Analytics overview into three height-constrained rows: headline figures, trend plus attention/opportunities, then the four categorical charts. Today puts its alerts and numbers beside each other, keeps the week visible, and gives the order lists the remaining height. Long lists scroll within their own panels. Desktop text is not scaled down, the spacing refinement stays in place, and no metrics, orders or workflow code is changed.

Applies at viewport widths of at least 1280px and heights of at least 760px. Smaller screens keep the existing responsive layout and normal scrolling. Monitor inches do not determine CSS viewport dimensions; browser window size and display scaling do.

## Verification

40 viewport-fit checks passed at 2560x1440, 1920x1080, 1920x900, 1536x864 and 1366x768. Today and Analytics Overview need neither document nor main-area scrolling at these sizes with the fixture data. All main panels stay within the screen. A 30-record overflow case confirms that the final records can be reached inside the panel without increasing page height. Screenshots inspected. The 115 spacing checks and 59 workflow checks also passed against this bundle (214 checks total).

The live staff URL requires access authorization, so signed-in production verification remains unavailable from this session. Expanded filters, detailed reports and unusually large content may still need scrolling; no data is removed to make a screen fit.

## Build and rollback

python3 build/staff_viewport.py preserves the released spacing bundle byte for byte and appends src/staff.viewport.css. The resulting artifact is recorded in dist/app/staff-viewport-manifest.json.

Rollback: restore docs/rollback/staff-footer-before-viewport-2026-10-17.html to the staff page footer and publish. The earlier printing-control fixes and spacing remain.
