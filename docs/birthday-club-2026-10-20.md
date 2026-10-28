# Birthday Club in the staff app: published 20 October 2026, 8:28 PM Fiji

Roneel asked: "can we build a birthday club into the dashboard for the customers.. we can always call them up and wish
them and offer something". He approved this preview at about 8:20 PM: "Yes, publish it".

## What staff see

- **Customers → Birthday Club** (a fourth section after Customers, Follow-ups and Insights).
  - The offer: a free cupcake with a cake ordered within 2 weeks of the birthday, before or after, once a year.
  - Four numbers: to call this week, members, wished this month, and free cupcakes this year (with the cake order value).
  - Birthdays to call: the next 7 days, today's first, then late ones for up to 3 days. The cards look like the Follow-ups cards.
    - Call and WhatsApp only open the phone; nothing is sent by the system. The WhatsApp message is filled in for before,
      on or after the birthday.
    - One tap records what happened: Wished them, WhatsApp sent, No answer (they stay on the list) or Not interested.
      Each tap also adds a customer note.
  - Done this week, Members (Remove asks first; members who unsubscribed from all offers stay off the call list), Recent.
  - + Add a member: search the customer, choose the day and month, after checking with them.
- **Today**: the This week box ends with "N birthdays to call · names", which opens the Birthday Club. It only shows when
  there is someone to call.
- **New order, Customer step**:
  - Not a member: Join / Not now (optional). Join asks for the birthday (day and month, required) and the customer's OK.
  - Within 2 weeks of the birthday: "Add the free cupcake" (ticked) or "Not this time".
  - A member: shown as a member, with the free cupcake if it is due.
  - The order is saved first. Joining and the cupcake follow, and staff are told if either fails.
- **An open order**: if the customer is a member and the order falls within the window, "Add the free cupcake". The first
  cake's kitchen notes then say "Birthday Club: add 1 free cupcake", and the order's history says
  "Birthday Club: free cupcake added".
- **A customer profile**: "Birthday Club member" with Remove, or "Add to the club".

Nobody can join through the website: that box was taken out at Roneel's request ("remove that on the form .. lets build
the birthday club foundation first"). It is kept on branch `parked/birthday-club-website-20261020`, and
`birthday_club_join_online` is closed to everyone until it comes back.

## What changed

| Where | Before | After |
|---|---|---|
| Staff page footer, app loader (the only line changed) | `@e7a032ecd58c6ebe50148d008a418acfe78ec5fd/dist/app/staff-app.6699cb84d9.js` | `@11d3c84544583bd289fcd7e7daf93e10d61846ef/dist/app/staff-app.0840d32bed.js` (sha384-62wyPMD5/APQGDuykkYEYMmYSzGSFTFmu2JAhsQ9ubhZfVK5rq6GxrMdmyYTxXnY) |
| Database | Birthday Club switched off | Migrations `birthday_club_20261020`, `_fix1`, `_fix2`, `_fix3_no_website`, `_switch_on`: club, joining and the free cupcake on |

Footer read back after saving: identical to the prepared file (md5 671287e409e83b7d5c4fe89b94306aba, 49,611 characters).
The release file is identical on cdn.jsdelivr.net, fastly.jsdelivr.net and raw.githubusercontent.com
(md5 55eb764a5f5f82681eeaac449208a4a4). After switching on, `birthday_club_home` as the Counter login returns the club on,
can call and can add, with no members yet.

Build: `build/staff_birthday_club.py` on the live release. Source: `src/staff.birthday-club.js`, `src/staff.birthday-club.css`.
Database: `supabase/birthday_club_20261020.sql`.

## Checks

- `test/run_birthday_club.cjs`: 109/109. It covers the club switched off, Today, the page on tablets and phones, one-tap
  calls, members, Add a member, New order (Join, the cupcake, Not now, members, failures), profiles and orders, and access
  levels (Counter, Finance, Kitchen).
- Same results as on the live release:
  - Heartbeat guard 80/80, the side logo 39/39 and the kitchen slip 16/16.
  - Form ease 46/46, date typing 26/26, order list 24/24 and urgent pop 85/85.
  - Screen fit 43/43, fit 220/220, calendar occasions 70/70, customer delete 34/34 and analytics tabs 42/42.

## Rollback

1. Staff page footer: put back `docs/rollback/staff-footer-before-birthday-club-2026-10-20.html`. Its only difference is the
   app loader line above. Read it back, then publish to both custom domains.
2. Switch the club off, which keeps members and history:
   `update public.birthday_club_settings set enabled = false, enrollment_enabled = false, rewards_redemption_enabled = false where id;`
   With the club off, the new app shows nothing of it, so step 2 alone hides it.
