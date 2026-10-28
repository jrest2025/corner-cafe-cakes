# Old orders from paper slips, duplicate warning, corrections, plain-words history: published 21 October 2026, 11:08 AM Fiji

Roneel, 8:20 AM: "the form shoud allow our staff to renter orders that were taken ealier becasue we are now doing all
the cake entries that were done previously manually". He confirmed the rephrase (real dates, finished in one go, money on
the right day, a duplicate check, corrections with a history), then at 8:51 AM: "Yes warn for duplicates.. yes allow
correctiong for old orders but all orders showu d have a clear audit traiut showing all changes etc". After the pictures
he chose **"Yes, publish it"**.

## What staff see

- **New order starts with a choice:** *New order* (as before) or *Old order: from a paper slip, already picked up*.
- **Old order:**
  - "Who took this order?" (the name on the slip), "When did they order?" (the date on the slip), the pickup date from
    the slip (yesterday or earlier), and on the last step "Was it paid?" (Paid in full, Part paid, Not paid), how, and
    the day they paid (it starts on the pickup day).
  - Not asked: the marketing question (nothing is recorded or sent), the Birthday Club, the "Ask the customer" tips and
    "How did they hear about us?". No date buttons for the coming days and no short notice.
  - Menu cakes use the menu price. A custom design asks for the cake price on the slip. A custom cake request needs
    its price on the Cake step.
  - Stopped before saving: a slip date or pickup date in a year before 2015 (the year 1 and 2 mix-ups), a pickup date
    of today or later (that is a New order), a slip date after the pickup date, a missing payment answer, a part
    payment of the whole price or more, a payment day outside the slip date to today.
  - The slip preview shows the date on the slip and the years. Save says "Save old order".
  - Saved: "Old order saved", the order number, "Picked up" with the day, who ordered and paid when, and "Enter the next
    old order" (opens the next one as an old order) or "Open the order".
- **Is this order already in the system? (every order):** before saving, orders of the same customer (profile or mobile
  number) within 2 days of the pickup date are shown; for an old order also the same cake and size within 31 days.
  Choices: Open CC-…, "It is a different order: save it", "Go back and check". If the check cannot be made, the order
  is saved as normal.
- **Correct this order:** on orders already handed over, for logins that can change orders. The same panel as Change
  order, without "Who asked for the change?"; "What was wrong? (kept in the order history)", Review correction, a check
  with the old and new values, Save correction. The customer is not contacted.
- **Order history in plain words, in the order things happened**, for example "Full payment of $68 recorded (Cash),
  paid Thu 15 Oct 2026", "Old order entered from a paper slip: ordered Mon 12 Oct 2026, taken by Mere, picked up Thu 15
  Oct 2026", "Corrected after it was handed over (Slip says Anna, not Ana): Cake message “…Ana” → “…Anna”". Lines that
  showed internal codes before (requirements, contact changes, test marks, date fixes, short notice, slip printed) now
  read as words.

## Database (migration `old_orders_20261021`, applied 21 October, 10:56 AM)

`supabase/sql/old_orders_20261021.sql`:
- `staff_enter_old_order(p)`: one call, all or nothing. The normal order path (customer, cake, occasion), then the date
  on the slip (noon that day), who took it, confirmed at the price (a custom design priced through `staff_set_quote`),
  the payment saved with the day it was paid (payments can never be changed later), and handed over on the pickup day.
  No kitchen slip, no guest emails, no thank-you email (`hold_thanks`), no short notice.
- `order_possible_duplicates(p)`: the duplicate check above (`wide` for old orders).
- `staff_correct_order(…)`: corrections to handed-over orders through Change order's own checks, logged as
  `corrected` with each field's old and new value. A pickup date can be corrected to any day from 2015 to today.
- New orders refuse a pickup date before 2015, and the order date ("When did they order?") refuses a year before 2015.
- Grants: signed-in staff only (not the public key).

## What changed

| Where | Before | After |
|---|---|---|
| Staff page footer, app loader (one line) | `@8477990309e8f001e8e5f1acc772918176e2dd65/dist/app/staff-app.6501cdd65b.js` | `@605aeac4fd52c3da40d28241ba040aad400e8edb/dist/app/staff-app.2dfb13f213.js` (sha384-tfgNwLzw22b4MeFxWTBk/o55upsJZYyyGQskERwgc+fDB12jS6SIyJ3bqz62CQPA) |

Build: `build/staff_old_orders.py` patches the previous live release (staff-app.6501cdd65b.js) at asserted anchors and
appends `src/staff.old-orders.js` and `src/staff.old-orders.css`. Footer: `build/footer_old_orders.py` (exactly the
loader line changes).

## Verified at release

- **Database:** the three new functions exist, run with the owner's rights, and are not open to the public key; the
  year checks, correction mode, wide duplicate check and slip pricing are in place.
- **Before writing:** the live footer was the one recorded at the Analytics look release (md5
  c1dc568b7b3556296fcf16dea2e3db5c, 49,491 characters).
- **Footer read back after saving:** identical to the prepared file (md5 7651d0d132a67c20c1e1dd5e4750d70e, 49,491
  characters); the page head code unchanged.
- **Release file:** identical on cdn.jsdelivr.net, fastly.jsdelivr.net and raw.githubusercontent.com (md5
  c2638a43517167d6ec4f2920ce5ce372).
- **Published:** to cornercafefiji.com and www.cornercafefiji.com at 11:08 AM (not to the Webflow subdomain). The staff
  page is password protected, so it was checked through the saved footer.

## Checks

- **Old orders screen test** (`test/run_old_orders.cjs`): 144/144, tablet and phone.
- **Heartbeat guard:** 80/80, on the candidate and on the exact footer that was published.
- **Order flow** 123/123 (its first-question check now allows the New/Old choice above "Who is taking this order?"),
  **form ease** 46/46, **date typing** 26/26, **taken date** 34/34, **flow polish** 46/46, **connected journey** 20/20.
- **Birthday Club** 107/109 and **date picker** stop on the same date-dependent checks on the previous live release
  too: not caused by this release.
- **Database, as the Counter login, rolled back:** a menu cake paid in full (picked up and paid on the slip days, the
  history in order, no emails); a custom design priced from the slip and part paid by card; a custom design without a
  price refused with nothing saved; the duplicate check narrow and wide; every refusal above; Change order still refuses
  a handed-over order while Correct this order previews, saves and logs it (no kitchen confirmation, no short notice);
  a correction to a future date or without a reason refused; years before 2015 refused.

## Notes

- **Order numbers CC-1094 to CC-1099 were used up by the database tests** (Postgres does not give numbers back when a
  test is undone). No orders exist under them; the numbering simply continues.
- **The counter tablet needs one refresh.** At 6:24 AM it was still saving with a version from before 20 October (the
  one that cut years to 1 or 2). New orders with a year before 2015 are now refused by the database, so that version
  can no longer save a wrong year.
- The staff page's date boxes open the Corner Café date picker (loaded by the footer), so dates are chosen from a
  calendar rather than typed.

## Rollback

- **App:** put back `docs/rollback/staff-footer-before-old-orders-2026-10-21.html` (the live footer before this
  release, md5 c1dc568b7b3556296fcf16dea2e3db5c). Read it back, then publish to both custom domains.
- **Database:** nothing needs undoing for an app rollback. The previous app does not call the new functions, and the
  year checks only refuse impossible dates. Orders entered as old orders stay as they are (nothing is deleted).
