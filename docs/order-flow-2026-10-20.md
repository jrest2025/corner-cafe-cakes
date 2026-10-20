# New order that leads the way, and who took the order: candidate, 20 October 2026 (not published)

Roneel, 8:14 PM: "in the order form the person filling the cake order form must enter their name. its a requirement.
because the counter tablet has no specific login." He chose: ask on every New order, on every device; names used before on
that device are one-tap buttons, none picked in advance.

Roneel, 8:34 PM: "refine refine refine.. the order form will powerful should feel fun and easy to fill .. and very very
intuitive .. like if they are taking the order with a customer they should not be looking for buttons and what to press
etc etc .. the flow has to be there". He approved "No hidden menus", "Screen leads the way", "Date and time together",
"Clear finish screen", and "Start on Today" for the order date.

## What staff see

- **Customer step, first: "Who is taking this order?"** (required).
  - Names used before on this device are buttons, newest first, plus the login's own name. Nobody is picked in advance.
  - "+ Add my name" opens a name box (Enter or OK keeps it; "mere" becomes "Mere").
  - Once picked it shrinks to one line ("Taking this order: Mere", with Change).
  - The slip preview's "Order Taken by" line shows the name. Next stays put until a name is chosen.
- **No hidden menus.** Marketing permission, "How did they order?" and "When did they order?" are plain buttons again,
  not "Select · Required" menus. "When did they order?" starts on Today (Yesterday and Another date are one tap away).
- **The screen leads the way.**
  - After each answer, the next unanswered question scrolls into view with a blue outline.
  - When a step is complete its Next button lights up (Save on the last step).
  - Pressing Next with something missing brings that question into view, outlined in red.
  - Every step does this: Customer, Cake, Details (allergies, then the occasion), When (the date, the short-notice
    reason, delivery details, then the time) and Finish (payment, then how they paid or whether the customer agreed).
- **Date and time together.** On phones too, the times sit under the dates on one page; there is no separate "Pickup time"
  page. Picking a time moves on to Finish by itself once everything on the page is done.
- **Finish screen after Save** (tablets, phones and computers):
  - a big tick, the order number and its status;
  - the customer, the pickup or delivery time, and who took the order;
  - what to do next, "Make kitchen slip" (confirmed orders) and "Take another order", plus "Open the order".
  - Orders started from the calendar still go back to the calendar. On the counter tablet, closing it returns to the
    tablet start page. New order (menu or button) while it is open starts the next order.
- **On the order.** Straight after saving, the name is saved on the order (`order_set_taken_by`):
  - the order's Customer box says "Taken by Mere" and its history says "Order taken by Mere";
  - the kitchen slip's "Order Taken by" shows Mere, both printed and emailed (the login's name is used only when no name
    was given, as for older orders).
  - A kitchen slip made straight away waits for the name, for up to 4 seconds.
  - If saving the name fails, staff are told and can tap Try again; the order itself is already saved.
- Also fixed: the Next bar now sits at the very bottom of the order form (the edge of the next question no longer shows
  underneath it), and Start over no longer turns an order into a calendar order.

## What changes

| Where | Change |
|---|---|
| Staff bundle | `build/staff_order_flow.py` on the live release (`staff-app.0840d32bed.js`): add-on `src/staff.order-flow.js` + `.css`, and small asserted patches (listed in the build script) |
| Staff page footer | Two lines (`build/footer_order_flow.py`): the staff app loader, and the compact-entry list emptied (the add-on still hides its repeated hints) |
| Database | Already applied, nothing changes until the app sends a name: migration `taken_by_20261020` (`orders.taken_by_name`, `order_set_taken_by`, the kitchen slip's "Order Taken by") |
| Emails | `send-emails`: the emailed kitchen slip uses the name given, then the login's name as before (deploy with the release) |

## Checks

- `test/run_order_flow.cjs`: 123/123, on a tablet and a phone. Covers:
  - who is taking the order: required, remembered, + Add my name, Change;
  - no hidden menus, Today first;
  - the next question outlined and in view, Next lighting up, Next with something missing;
  - date and time on one page, moving on after the time;
  - the finish screen;
  - the name on the order, in its history and on the slip (which waits for it);
  - a failed save and Try again; unfinished orders keeping the name; Start over; Take another order;
  - a returning customer, delivery, short notice and no payment yet; the Counter login in tablet mode.
- Same results as on the live release:
  - Heartbeat guard 80/80, side logo 39/39, kitchen slip 16/16, analytics tabs 42/42;
  - form ease 46/46, date typing 26/26, order list 24/24, urgent pop 85/85;
  - screen fit 43/43, fit 220/220, calendar occasions 70/70, customer delete 34/34.
  The New order tests now pick a name first; on the live release they do exactly what they did before.

## Rollback

1. Staff page footer: put back `docs/rollback/staff-footer-before-order-flow-2026-10-20.html` (the live footer before
   this release; md5 671287e409e83b7d5c4fe89b94306aba). Read it back, then publish to both custom domains.
2. `send-emails`: redeploy the previous `index.ts` (git history). Older orders have no name, so it makes no difference
   to them either way.
3. The database change can stay: with the previous app, nothing sends a name, and slips show the login's name as before.
