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
- App: `src/staff.customer-delete.js`, `src/staff.customer-delete.css`, `build/staff_customer_delete.py` (base: live Urgent pop-up release, checked by SRI).
- Tests: `test/run_customer_delete.cjs` (32 checks at tablet and phone sizes, including front-of-house not seeing the button, open orders blocking, server refusal, reason sent). Urgent pop-up suite still passes on this bundle.

## Release order

1. Apply the SQL.
2. Point the staff page footer at the new bundle and publish both domains.

Rollback: footer back to `dist/app/staff-app.4dbb2ab370.js` (SRI sha384-v8NXRZNG1GeLb3NVID/Ars/wM0gNRgACvbYPOsCdI9o0HS2YtedjdPRDNqNoiOZ7). The SQL only adds functions, a table and the holder record; deletions themselves cannot be undone.
