# Calendar quiet slots and clearer delete refusal — 20 October 2026

Requested by Roneel, 8:06 AM: remove the "New order at …" text in empty calendar day slots (too busy). Published 8:12 AM after approval.

- Empty day slots show a faint + only; the whole row is still one tap to start an order at that time; screen readers and the tooltip keep "New order at 1:00 PM". Week view unchanged.
- Delete customer: a database refusal now shows its reason ("The customer was not deleted. …") instead of blaming the internet connection.

Bundle: `dist/app/staff-app.85f4bb1a9e.js` at commit 82d5f24, built by `build/staff_calendar_quiet.py` on the live delete-customer release (3617ace401). Tests: calendar 14, delete customer 34, Urgent pop-up 85.

Footer: only the app loader changed. Rollback: loader back to `gh/jrest2025/corner-cafe-cakes@94c21aa684115d108e7a171b7096b6974abf1c52/dist/app/staff-app.3617ace401.js`. Not checked in a live browser from this session.

## Booked orders stand out — published 8:27 AM

Roneel, 8:15 AM: booked orders blended into the calendar. Booked day-view cards now have a status tint (blue confirmed, amber needs checking, orange waiting, green completed, grey cancelled), a 6px status edge, a soft shadow and darker name/time; the + under a booked order is hidden. Bundle `dist/app/staff-app.e1af4eff0a.js` at commit 5640417. Tests: calendar 22, delete 34, Urgent 85. Rollback: loader back to `gh/jrest2025/corner-cafe-cakes@82d5f24038099c449d4a5f1e079db700c1673e99/dist/app/staff-app.85f4bb1a9e.js`.
