# Delete customer — 20 October 2026

## Why

Roneel, 20 October: staff must be able to delete a customer record from the database (for example, customers who have left Fiji). Adding customers already existed; deleting did not.

Decisions (Roneel): past orders are kept for sales figures, shown as "Deleted customer"; managers and admins only (permission `cust.merge`).

## What it does

- Customer profile, at the bottom: **Delete customer** (managers and admins only). Tapping it shows what will happen, an optional reason (Left the country, Duplicate, Asked to be removed, Other), Cancel and **Delete permanently**.
- Customers with open orders (waiting, quoted, awaiting deposit or confirmed) cannot be deleted until those orders are completed or cancelled.
- The database function `customer_delete` deletes the customer row and everything attached (notes, follow-ups, reminders, contact log, consents, favourites, Birthday Club, duplicate decisions, merge history; profiles merged into it). Register links are cleared.
- Orders move to one hidden, archived "Deleted customer" holder (customer number 0), so revenue, analytics and order history are unchanged. Each order gets a history line. The holder is excluded from the customer list, follow-ups, customer numbers, exports and search.
- `customer_deletions` records customer number, who, when, reason and orders kept. The existing audit trigger also keeps a copy of the deleted row in `audit_log`.

## Files

- Database: `supabase/customer_delete_20261020.sql` (not yet applied; needs approval).
- App: `src/staff.customer-delete.js`, `src/staff.customer-delete.css`, `build/staff_customer_delete.py` (base: live release `dist/app/staff-app.flow-clean-20261019.js`, commit 3985975, checked by hash).
- Tests: `test/run_customer_delete.cjs` (32 checks at tablet and phone sizes, including front-of-house not seeing the button, open orders blocking, server refusal, reason sent). Urgent pop-up suite still passes on this bundle.

## Release order

1. Apply the SQL.
2. Point the staff page footer at the new bundle and publish both domains.

Rollback: footer app loader back to `gh/jrest2025/corner-cafe-cakes@3985975ef33d295bb653e1433f3de5b2c5ab7f39/dist/app/staff-app.flow-clean-20261019.js`. The SQL only adds functions, a table and the holder record; deletions themselves cannot be undone.

## Publication — 20 October 2026, about 1:25 AM Fiji

- Database update applied by Roneel in the Supabase SQL editor (after the in-app approval prompt was cancelled twice). Checked: function, deletion log and holder present; only signed-in staff can call it; holder hidden from list and search.
- The staff page had moved on to `staff-app.flow-clean-20261019.js` (linear order steps, commit 3985975) since the Urgent pop-up release; Delete customer was rebuilt on that file so those changes are kept.
- Footer app loader now `gh/jrest2025/corner-cafe-cakes@94c21aa684115d108e7a171b7096b6974abf1c52/dist/app/staff-app.3617ace401.js`. No other footer line changed. Published to cornercafefiji.com and www.cornercafefiji.com.
- Not checked in a live browser from this session (no browser reachable).
