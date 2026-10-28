# New order: typed dates keep their full year (20 October 2026)

Published to cornercafefiji.com and www.cornercafefiji.com on 20 October 2026, about 9:59 AM Fiji. Approved by Roneel.

## Problem

Typing a date into "Other date" on the New order form: the form redrew itself after the first digit of the year, so the
rest of the typing was lost and the date was saved as year 1 or 2 (for example 13 January, year 2). Six historical orders
entered on 20 October between 6:00 and 6:20 AM (CC-1076 to CC-1081) were saved this way. Roneel asked to keep those six
orders exactly as they are (historical data); they were not changed.

## Fix

- Keyboard typing in that field is detected. The form redraws as soon as the four-digit year is complete; an edit to a
  date that is already complete waits until the field is left.
- Picking a date from a calendar (the shared calendar add-on, or a device's own picker) and the quick date buttons update
  the form straight away, as before.
- Past dates stay allowed. No rules, checks or data change.

## Release

- Bundle: `dist/app/staff-app.ff28b5081f.js` at commit `3ba4398f205a12ed9a4998afad2cc3538331043a`
- SRI: `sha384-KqZQAF4T6njZ2OCBzxeIwMYPLmZZ/1Ld9OEz5ehpPzmXfSf0lBVL1TAEZnxV6Jev`
- Built by `build/staff_date_typing.py` on the order list release; tests `test/run_date_typing.cjs` (26 checks; the
  previous live bundle fails 8 of them, reproducing the year-2 dates), plus order list 24, screen fit 43, flow polish 46,
  calendar quiet 22, customer delete 34, urgent pop 85.

## Rollback

Staff page footer loader back to
`f="gh/jrest2025/corner-cafe-cakes@6403907525fb150a9108b025eb2f061aea588ee9/dist/app/staff-app.91dbbb24ee.js"`,
`k="sha384-uQkMIczUcJLEfxi+vqPN3CXk0AHOBGHqZIgfatb3EqRWfMuXRUxVWWE62lA4lg/+"`, then publish.
