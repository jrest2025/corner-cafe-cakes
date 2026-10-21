# Greeting and daily briefing on Today (21 October 2026)

Roneel, 6:44 PM, sent his brief "Personalised conversational UX and context-aware dashboard intelligence". He chose "Deploy it now, greeting next" and "No name on the counter login". He approved the preview with "deploy" at 7:41 PM.

## What it shows
**Greeting, by Fiji time**
- "Good morning" before 12 PM, "Good afternoon" before 5 PM, otherwise "Good evening".
- Personal logins (managers, admin) get their first name.
- The shared counter and kitchen logins get none: "Good evening!"

**One sentence under the greeting**, from the lists the Today screen has just worked out. For example:
- "1 order needs you urgently, and 2 cakes are due to be handed over today."
- "You're all caught up. Nothing needs your attention right now."
- "We couldn't load your latest information."

**Up to 3 briefing lines, most important first.** Each line uses the app's own actions to open the order or list:
- a website order that came in while the app was open (the app checks every 30 seconds);
- the most urgent order;
- the next handover, with a note if money is still to collect;
- website orders waiting to be checked;
- the busiest day ahead, for managers and the kitchen.

**Kitchen-only logins** see what is still to finish today and what is to start for tomorrow.

**Computers**
- The greeting block keeps the buttons beside it, and the briefing lines sit on one compact row.
- On screens shorter than 900px (most laptops), the lines are left out so Today still fits the screen without scrolling. The sentence still says what matters.

## Nothing invented
- The sentence and lines come only from the same lists the Today screen shows: Needs attention, Due today, Waiting on you, the next 7 days, and payments when the login may see them.
- When orders cannot load, it says so and shows no numbers.
- Nothing is saved, and no business rule, Analytics, Daily Cake Demand or the Heartbeat changes.

## Build
- `build/staff_brief.py` is applied on top of `dist/app/staff-touch-fix-manifest.json`. That is the live touch release with one fix: order names in Needs attention are back on one line, because on the iPad sideways they had wrapped onto four.
- It makes two asserted, read-only changes to the app:
  - the Today screen keeps its lists in `y.__brief`;
  - `window.__ccsOf` gains read-only helpers: `brief`, `state`, `can`, `t12`, `nice` and `addDays`.
- Then it adds `src/staff.brief.js` and `src/staff.brief.css`.

## Tests
- `test/run_brief.cjs`: 22 checks.
  - greeting by time, and the name only on personal logins;
  - the sentence and lines match the screen;
  - lines open the right order;
  - a website order arriving shows first;
  - "all caught up", and "couldn't load" with no numbers.
- Also on this build: touch standard 76/76, Heartbeat guard 80/80, order flow 123/123, practice guide 100/100.
