# Urgent pop-up fix — 19 October 2026

## Why

Roneel, 19 October: the Today Urgent pop-up text overlapped, and "Open Needs attention for everything" was a redundant link and module.

Cause of the overlap: on phones the shared layer clamps each reason to one line (`-webkit-line-clamp:1`). The pop-up only switched `overflow` to visible, so the clamped box kept its one-line height while the hidden lines drew over the next order.

## What changed

- Today lists every attention order (previously the first 3), so the pop-up shows all of them and the "See all" / "Open Needs attention for everything" links are gone. The Needs attention screen has no remaining entry point (its menu tab was already hidden in the page footer).
- Pop-up rows are a two-line block that grows to fit: order and name; when (red for urgent); what to do. Payment instructions become a "Collect balance first" tag.
- The pop-up scrolls inside itself when the list is long.
- Order logic, counts, permissions, data and sync unchanged.

## Build and tests

`python3 build/staff_urgent_pop.py` (base: live release `dist/app/staff-app.7b79e268a8.js`, checked by SRI).
`test/run_urgent_pop.cjs`: 85 checks at 1920, 1366, 1024, 412 and 360 widths. Existing islands suite: 187 checks (link check updated to expect removal).

## Rollback

Restore the footer loader to `dist/app/staff-app.7b79e268a8.js` at commit f530750, SRI sha384-+zNXU0JhB+yN9DaTEbTp+x4I3xxe85JBYr6ZQ6v8DEZBR20Xb72lzPfNA0VBd56c. No database change.

## Publication

Approved by Roneel 19 October 2026, 18:29 Fiji. Main fast-forwarded to 09c1de8.
Footer app loader pinned to commit 09c1de85ed49898546fdacddae5f551659379959, artifact dist/app/staff-app.4dbb2ab370.js, SRI sha384-v8NXRZNG1GeLb3NVID/Ars/wM0gNRgACvbYPOsCdI9o0HS2YtedjdPRDNqNoiOZ7. Only the loader's file and integrity values changed; footer read-back returned the written content. Published to cornercafefiji.com and www.cornercafefiji.com (not the Webflow subdomain).

Live browser check not done from this session (no browser reachable; CDN not reachable from the workspace). Roneel to confirm on device.
