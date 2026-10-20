# Purpose-led analytics refinement — candidate

User request: make each analytics instrument support a business decision; Daily Cake Demand must remain unchanged.

Changes: action cards precede charts; chart footers explain their use; the money panel separates period payments from today's outstanding balance and explicitly labels overdue money as a subset. Low sales share replaces the misleading Slow sellers label and is unavailable when the selected period has no completed sales. Favourite cake by occasion now labels its percentage as a share of cakes rather than orders. Insight cards disclose their independent date windows.

Only analytics tab presentation and styles change. Overview, Daily Cake Demand, seasonal buildup, and the Occasions booking curve remain unchanged. The candidate is built from the published Service Hub bundle, not the unpublished Marketing candidate on main. Marketing registration compatibility in source is retained.

Build: `python build/staff_analytics_purpose.py`.

Passed: syntax, `node test/run_analytics_purpose.cjs`, `node test/run_analytics_categories.cjs`, `node tests/demand-rail-contract.test.cjs`. The purpose test reverses the two presentation replacements and verifies the entire remaining bundle equals the published base byte for byte.

BLOCKED: `BUNDLE=dist/app/staff-app.46b4c059b1.js node test/run_heartbeat_guard.cjs` cannot launch because Chromium is unavailable. Browser installation failed (invalid/truncated download). No visual/mobile QA claimed. Per HEARTBEAT_PROTECTED.md, do not publish until the full browser guard passes, followed by analytics tab interaction checks. No Webflow code was written or published. Live footer was read on 20 October and still pins e7a032ecd58c6ebe50148d008a418acfe78ec5fd / staff-app.6699cb84d9.js.

Release after verification: pin the candidate bundle to its committed SHA and update only the app loader path and SRI in a freshly read footer. Preserve all other scripts and pins. Read it back and keep live fixtures current. Rollback is the previous Service Hub loader above.
