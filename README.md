# Corner Café Cakes: source and recovery package

Snapshot taken 12 October 2026, after the calendar New order panel went live.
Contains no customer records and no secret values.

## System map

- **Guest order page**: Webflow page `/order-cake` (page 6aca1629519070a607864b57), password protected until go-live. Code lives in the page head and footer custom code. It calls Supabase directly with the public (publishable) key.
- **Staff app**: Webflow page `/cake-orders-staff` (page 6aca162870735ac2247de4dd), password protected. Code is split across five places because of Webflow's 50,000-character limit:
  - footer custom code: Supabase library, code part A, and the loader
  - embed element 34260990-dcc0-7f00-ec5b-a57eee89fd5d: app container and code part B
  - embed element ea0a9508-456c-426a-73e3-034f6b77b1c7: code part D
  - embed element c6b640ce-5eb9-6e91-25ed-2e994c1d7f8b: calendar styles and code part E
  - head custom code: main styles and code part C

  The loader joins parts A, B, D, E and C in that order and checks the length and a checksum. If anything is missing it shows "The staff app did not load properly" instead of running a broken app.
  - Four small registered scripts (ccStaffClarity1 to 4) add the clarity styles.
- **Database**: Supabase project "Corner Cafe Cakes" (ilbrfwxblhidtlsjgxlh, Sydney region, Pro plan). It is the authoritative source for orders, customers, payments and history.
- **Email**: Edge Function `send-emails`, using Resend.
  - A database queue (`email_outbox`) is sent on insert, and retried every 5 minutes by a cron job.
  - Test mode sends everything to the test address.
- **Google Sheet sync**: Edge Function `sheet-sync` plus a Google Apps Script (`sheet-sync/Corner-Cafe-cake-sheet-sync.gs`). It brings upcoming orders from the two existing Google Sheets into the app. It stays inactive until the owner sets the shared key.

## Folders

- `src/`: readable source (staff app, guest page, styles). Edit these files, never the files in `dist`.
- `build/build.py`: builds `dist/` from `src/` (minifies with terser and csso, then splits the staff app into five blocks). The working folder is hard-coded on line 2; change it to the folder you run from.
- `build/verify_upload.py`, `build/cmp.py`: compare what Webflow holds with `dist/`.
- `dist/staff/`, `dist/guest/`: exactly what is live in Webflow on 12 October 2026.
  - `guest.head.PENDING-not-live.html` is an approved-later change (guest form clarity styles) that is not live.
- `supabase/functions/`: Edge Function source as deployed.
- `supabase/sql/`: the SQL for the amendment and calendar phases.
- `supabase/schema/`: full schema-only snapshot taken from the live database (all 24 migrations, 42 functions, 29 access policies, tables, indexes, triggers, cron job). No row data.
- `sheet-sync/`: Apps Script and the row parser shared with the sync function.
- `tests/`: mock database and browser test scripts (Playwright).
  - Run: `python3 tests/run_cal.py` and the others against `staff-test.html`.

## Deploying a change

1. Edit `src/`, then run `python3 build/build.py`.
2. Run the tests in `tests/`.
3. Upload the five staff blocks (or the guest head and footer) to Webflow.
4. Read each block back and compare it with `dist/` character for character.
5. Publish only with the owner's approval.

Database changes go in as new migrations. Already-applied migrations are never edited.

## Settings and secrets (names only)

- Edge Function secrets:
  - `RESEND_API_KEY` (email sending)
  - `SHEET_SYNC_SECRET` (Google Sheet sync; the Apps Script holds the same value as `SYNC_KEY`)
  - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (provided by Supabase automatically)
- Database table `app_config`:
  - `test_mode`, `test_email`, `guest_emails`, `from_email`, `reply_to`
  - `function_url`, `staff_app_url`
  - `cron_key` (internal key between the database and the email function)
  - retargeting thresholds
- The public key in the page code is the publishable key. It is safe in a browser; access is controlled by row level security and role checks inside the database functions.

## Backups and recovery

- **Database**: Supabase Pro takes daily backups (7-day retention on Pro). Point-in-time recovery is a paid add-on and has not been confirmed as enabled.
  - Restore from the Supabase dashboard: Database, Backups.
  - Restoring replaces the whole database, so restore to a new project first when only part of the data is needed.
- **Reference photos** (Storage bucket `cake-references`): not covered by database backups.
- **Webflow**: Webflow keeps site backups (Site settings, Backups). The code is also in `dist/` here.
- **This package**: keep it in a private GitHub repository. Git history is not a database backup.

## Rollback

- Webflow: restore the previous site backup or re-upload the previous `dist/` files, then publish.
- Database: write a corrective migration. Rolling back page code does not undo database changes. Every change so far has been additive, so older page code still works with the current database.
