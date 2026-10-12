# Corner Café cakes: backups and how to restore

Last restore test: 13 October 2026, passed. Results are kept in the database (table restore_drills) and shown in the staff app under Settings, Backup check.

## The four layers

| Layer | What it holds | Protects against | Who restores |
|---|---|---|---|
| Deleted orders | Orders deleted in the app stay in the database, hidden | An order deleted by mistake | An admin, from Settings, Deleted orders, Restore |
| Full copies inside the database | backup_20261013: all 46 tables. backup_20261012: older copy of 11 tables, before the customer changes | A wrong change to some records | The developer, with the steps below |
| Google Sheet copy | One row per order, updated every 5 minutes | Losing the database; reading orders when the app is down | Not linked yet. An admin links it in Settings, Backup to Google Sheet |
| Host backups (Supabase, Pro plan) | The whole database, daily | Losing the database | The account owner, from the Supabase dashboard. Replaces everything, so changes since the backup are lost |

The copies inside the database sit in the same database. They do not protect against losing the database itself. They cannot be reached from the app or the website.

## Restoring records from a copy inside the database

Use this when some records were changed or removed by mistake. It puts back only the rows you name.

1. Work out which rows are affected and when it happened. Use the order history, the customer change history or the audit log.
2. Check the copy is older than the mistake: `select * from backup_20261013.manifest;` (copied_at).
3. Look at the rows in the copy before touching anything, for example:
   `select * from backup_20261013.customers where id in ('…');`
4. In one transaction, put back the rows, listing the columns, for example for a customer that was blanked:
   `update public.customers c set (full_name, phone, email) = (select b.full_name, b.phone, b.email from backup_20261013.customers b where b.id = c.id) where c.id in ('…');`
   For a row that is missing completely: `insert into public.customers select * from backup_20261013.customers where id in ('…');`
5. Check the result, then commit. Anything changed after the copy was taken is lost for those rows, so compare first.

Never restore a whole table from a copy while the app is in use: every change since the copy would be lost.

## How the restore test is done

The test never touches live tables.

1. Make scratch copies of the live customers, orders, order items and marketing permission tables.
2. Take 20 rows out of each scratch copy.
3. Put them back from the backup copy.
4. Compare the scratch copy with live, column by column. Pass means no differences.
5. Check every table's row count in the backup against live.
6. Record the result in restore_drills.

Repeat after any large change to the database, and at least every three months.

## Known gaps

- The Google Sheet copy is not linked, so orders have no copy outside the database host.
- backup_20261012 is missing 16 customer columns, 9 order columns, and has no notes, follow-ups, marketing permission, merges, groups, exports or register. Use backup_20261013.
- New copies inside the database are made by the developer, not from the app.
