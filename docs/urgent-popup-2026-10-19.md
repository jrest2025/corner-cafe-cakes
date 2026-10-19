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
