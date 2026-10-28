# Calmer Analytics (22 October 2026)

Roneel: "reduce the text so the dashboards feel more clean". Presentation only.

- `src/staff.analytics-calm.js`: on Analytics, shortens labels on Daily cake demand (legend, "Holidays:", "Hollow: expected",
  no "Jump to month"), hides one-line descriptions the heading already says (Daily cake demand, Today's insights,
  Performance snapshot, Seasonal booking buildup) and folds the long notes under the demand chart and the Seasonal booking
  buildup into "About this chart". It edits nothing in the protected Daily Cake Demand module; it only changes the
  on-screen labels after the module has drawn.
- `src/staff.cake-lead-time.js` 0.2.0: the "Booked and due / By booking time" switch now sits in the Cake Heartbeat header
  (before, the Analytics layout's CSS order put it at the bottom of the page, away from the chart); the view's note folds
  into "About this chart"; the view keeps the chart's layout order.
- Loader (`dist/lead-view-loader.js`, end of the staff page head) pinned to 595c7f986f3739054a5b8cf227eb0f8e28d8118a and
  now also loads staff.analytics-calm.js.

## Checks
Heartbeat guard 80 of 80, booking time view 35 of 35, protected Daily Cake Demand contract passed (head:
dist/staff.head.calm.html).

## Released live, 22 October 2026, 1:21 PM Fiji (approved by Roneel)
- Live head read first: matched the previous release exactly. Written through the Webflow API, read back and compared
  character for character (identical, 30,213 characters). Published to cornercafefiji.com and www.cornercafefiji.com only.
- Rollback: put back docs/rollback/staff-head-before-calmer-analytics-2026-10-22.html (md5 f568a833cee9f000954ab14856113969) as the staff page head,
  read it back, publish to the same two domains. No database changes.
