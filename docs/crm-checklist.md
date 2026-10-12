# Customer CRM: requirements checklist

Status words: Implemented and verified / Implemented, awaiting verification / Blocked / Planned.
Phase 1 checked on 12 October 2026: database checks run against the live data in a rolled-back batch with invented customers, and 36 browser checks on the built staff app with invented data. Regression suites: register 34, dashboard 46, amend 23, backup 18, calendar 58, cockpit 41, team 28, scroll 113, plus phase A, phase B and stage 2. All passed.

| Area | Requirement | Status |
|---|---|---|
| Structure | Brands table; Corner Café brand; each location belongs to a brand | Implemented and verified |
| Profiles | Customer number (C-123), name, mobile, second number, email, best way to reach, company, corporate, delivery address, preferences, service notes, created and updated times | Implemented and verified |
| Profiles | Birthday as day and month only, impossible dates refused | Implemented and verified |
| Profiles | Shared mobile numbers allowed (families, offices) | Implemented and verified |
| Profiles | Profile needs a mobile or an email | Implemented and verified |
| Profiles | Archive and merge fields (no delete) | Implemented, awaiting verification (screens in phase 4) |
| Editing | Version check: a save over someone else's change is refused and typing is kept | Implemented and verified |
| Editing | Unsaved typing protected when closing | Implemented and verified |
| Editing | Field-level change history, with who and when (managers) | Implemented and verified |
| Editing | Profile edits never rewrite past orders; open orders change only when staff choose | Implemented and verified |
| Editing | Changing an order's contact never changes the profile | Implemented and verified |
| Editing | Direct table edits closed; only the checked save path | Implemented, awaiting publish (open until the new app is live, so the current app keeps working) |
| Orders | Each order keeps its own contact name, mobile and email | Implemented and verified (all 501 existing orders filled, none changed otherwise) |
| Orders | Separate payer, recipient and collection contact | Planned (columns exist, screens in phase 3) |
| Orders | Guest purchases without a profile | Implemented and verified (sheet orders with no mobile stay without a profile and still count in figures) |
| Orders | Old sheet orders on customer profiles | Implemented and verified (step 2: automatic only for a full Fiji mobile on one profile with the same name; everything else to a manager list with link, new profile, leave, undo) |
| Customers | Add customer without an order, with duplicate check on mobile or email | Implemented and verified (step 1) |
| Editing | Edit Customer with Save and Cancel; unsaved typing needs a second tap to discard | Implemented and verified (step 1) |
| Matching | New order links to a profile only on same mobile and same name; otherwise a new profile flagged for review; never overwrites | Implemented and verified |
| Search | Name, mobile, second number, email, company, C-number, order number | Implemented and verified |
| Consent | Per brand, channel (WhatsApp, SMS, email, call) and exact number or email; history kept, never edited | Implemented and verified |
| Consent | 148 walk-in yes answers: Corner Café, WhatsApp and SMS, needs reconfirming | Implemented and verified |
| Consent | Consent does not follow a new number or email | Implemented and verified |
| Consent | Wording version recorded | Implemented and verified (4 wordings) |
| Security | Roles enforced in the database: edit (manager, front of house), history (manager), marketing permission (manager, front of house, marketing) | Implemented and verified |
| Backup | Copy of every customer, consent and order table before the change | Implemented and verified (schema backup_20261012) |
| Later | Register customers linked to profiles, review list, reconciliation | Planned (phase 2) |
| Profile | Four tabs: Overview, Orders, Notes and follow-ups, Communications; marketing permission kept apart from purchases | Implemented and verified (step 3) |
| Profile | Overview shows next order, open and overdue follow-ups, last note | Implemented and verified (step 3) |
| Notes | Dated notes, enquiries and feedback (happy, mixed, complaint), with channel and optional order | Implemented and verified (step 3) |
| Notes | Internal only: separate tables never read by emails, guest page or kitchen briefs | Implemented and verified (brief printed without note text) |
| Notes | Card numbers, passwords and PINs refused; on-screen reminder about health and allergy details | Implemented and verified (step 3) |
| Notes | Changes need a reason; old wording kept; managers remove from view, never erase | Implemented and verified (step 3) |
| Follow-ups | Assign to a person or anyone, due date, start, done with outcome, no longer needed with reason, reopen, change date or person; every change logged | Implemented and verified (step 3) |
| Follow-ups | Linked to a customer, and optionally an order or a note | Implemented and verified (step 3) |
| Follow-ups | Today page: overdue, due today, next 7 days for me and unassigned; managers can see everyone's | Implemented and verified (step 3) |
| Follow-ups | Order screen shows open follow-ups and note count for that order | Implemented and verified (step 3) |
| Orders | Repeat Order: new draft with today's products and prices; date, message, occasion and dietary asked again; items no longer sold flagged | Implemented and verified (step 3) |
| Security | Notes and follow-ups: write (manager, front of house, marketing), read (plus finance), kitchen none; change own notes only unless manager; no direct table access | Implemented and verified (database rollback test with a temporary front-of-house login) |
| Safety | Double taps cannot create duplicate notes or follow-ups | Implemented and verified (step 3) |
| Duplicates | Manager review list: same mobile, mobile matching the other number, same email (strong); same name only shown separately | Implemented and verified (step 4: 29 pairs found in live data, 8 strong) |
| Duplicates | Merge: manager chooses which profile to keep; orders, old sheet orders, notes and follow-ups move; blank details filled; notes and preferences added, not replaced | Implemented and verified (step 4, database rollback test) |
| Duplicates | Merged profile kept and marked, never erased; orders keep their own contact details | Implemented and verified (step 4) |
| Duplicates | Marketing permission never copied; read through the kept profile and still tied to the number or email it was given for | Implemented and verified (step 4) |
| Duplicates | Undo: moves back exactly what moved; details changed since the merge are kept and reported | Implemented and verified (step 4) |
| Duplicates | Version check: a merge is refused if either profile changed while open | Implemented and verified (step 4) |
| Duplicates | "Not the same person" recorded with a note, removes the pair from the list, can be undone | Implemented and verified (step 4) |
| Filters | Spend, number of orders, last order dates, no order in N days, occasion, cake ordered, first order type, marketing permission, birthday month, corporate, order coming; checked by the database | Implemented and verified (step 4) |
| Groups | Saved groups store the filter, not a fixed list; names unique; version-checked; removed groups are archived | Implemented and verified (step 4) |
| Export | Only people who said yes to the chosen channel on their current number or email; walk-in yes answers left out unless included for reconfirming; every export logged with who, when, filter, channel and counts | Implemented and verified (step 4) |
| Export | The old unrecorded Copy WhatsApp numbers and Export buttons replaced by the recorded export | Implemented and verified (step 4) |
| Security | Duplicates and merge: managers only. Filters: manager, front of house, finance, marketing. Groups and export: manager and marketing. Kitchen: none | Implemented and verified (database test with a temporary login in each role) |
| Known limits | Spend and order counts leave out old sheet orders; orders removed by an admin stay on the merged profile | Open |
| Later | Edge cases, restore drill, staff guide | Planned (phase 5) |
| Never | Sending real campaigns | Not built, by design |
