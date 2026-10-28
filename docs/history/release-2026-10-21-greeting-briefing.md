# Release: greeting and daily briefing on Today (21 October 2026)

Live at **7:52 PM Fiji time, 21 October 2026**. Roneel said "deploy" at 7:41 PM after seeing the preview. It was published to cornercafefiji.com and www.cornercafefiji.com.

## What went live
- **A greeting by Fiji time** on Today. Personal logins get their first name. The shared counter and kitchen logins get none, for example "Good evening!".
- **One sentence under the greeting**, worked out from what the Today screen already shows.
- **Up to 3 briefing lines**, most important first. Each one opens the order or list it is about.
- **Kitchen-only logins** see what is still to finish today and what to start for tomorrow.
- **A fix to the touch release:** order names in Needs attention are back on one line on the iPad held sideways.
- See docs/history/greeting-briefing-2026-10-21.md for details. Nothing is saved, and no data, business rule, Analytics, Daily Cake Demand or the Heartbeat changed.

## Code
- Commit `897b99e1ed1d1d2de357072fc15d8e867a77e544` (approved, publishing). The candidate was ac35521.
- **Staff app:** `dist/app/staff-app.8d6bea61b9.js`
  - md5 `306716f915288f7a7e3c3db73371cc34`
  - sri `sha384-Xu/Xks6FYcVw3C4lz3YtpfWOY9aUMEEQez4pfY2bldzw7HuI7xY1u8SdJItSVZV8` (`dist/app/staff-brief-manifest.json`)
  - cdn.jsdelivr.net, fastly.jsdelivr.net and raw.githubusercontent.com were all checked by md5 before publishing.
- **Finish step add-on:** unchanged, still pinned at 7103cd8.
- **Page code**, built by build/page_release_brief_20261021.py:
  - **Head:** unchanged, md5 `a71efd33f02f89f634877f15db9b4dfd`.
  - **Footer:** 49,491 characters, md5 `be57f4389162c01c9d1c6e75f9bbbf75`. Only the app loader line changed: its commit, file and sha384 value.
  - The footer was read back from Webflow after writing and is identical to the built file. It is now test/fixtures/staff-footer.html.
- Note: the app loader carries the sha384 value but never sets it on the script it adds, so the browser does not check it. It was the same before this release, and it was left as it is.

## Checks before publishing
These ran on the real page code at this commit:

| Check | Result |
|---|---|
| Heartbeat guard | 80/80 |
| Briefing (test/run_brief.cjs) | 22/22 |

These ran on the same bundle:

| Check | Result |
|---|---|
| Touch standard | 76/76 |
| Order flow | 123/123 |
| Practice guide | 100/100 |
| Practice | 75/75 |
| Old orders | 144/144 |
| Form ease | 46 |
| Date typing | 26 |
| Taken date | 34 |
| Connected journey | 20 |

Not counted: birthday_club (2 checks) and flow_polish (time of day). They fail on the old live version as well.

## Timeline
- **7:41 PM:** Roneel said "deploy".
- **7:51:29 PM:** the new footer was saved in Webflow, after checking that the live head and footer were still the 7:14 PM release.
- **7:52:26 PM:** published. Before publishing, no other page had changes waiting to go out.
- All 5 page scripts are still in place.

## Rollback
Put back docs/rollback/staff-footer-before-brief-2026-10-21.html as the page's footer, then publish.
- Footer md5 `fa59265319d5b7adb6894351a152f22c`
- The head did not change.

Staff need to refresh the counter tablet once to get the new version.
