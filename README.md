# Corner Café Cakes: Service Hub, cake order page and database

Updated 28 October 2026 (clean-up). Contains no customer records and no secret values.

**Start here.** `main` is the one line of work. It holds everything that is live, plus the Vercel host work.
New work branches from `main` and comes back to `main`. The old `preview/*` and `feature/*` branches are history.

## What is live

- **Guest order page**: Webflow page `/order-cake` (page 6aca1629519070a607864b57). Footer loads `dist/app/guest-app.cdf126b4b7.js`
  (commit 947432f3) and `src/guest.seasonal.js` (commit 7dc355ab), both pinned with SRI. Calls Supabase with the public (publishable) key.
- **Staff app (Service Hub)**: Webflow page `/cake-orders-staff` (page 6aca162870735ac2247de4dd). See below.
- **Database**: Supabase project "Corner Cafe Cakes" (ilbrfwxblhidtlsjgxlh, Sydney, Pro plan). The authoritative source for orders,
  customers, payments and history.
- **Email**: Edge Function `send-emails` (Resend). Queue table `email_outbox`, retried every 5 minutes by cron. `email-templates`
  (previews and tests only) imports its code from a pinned commit.
- **Google Sheets**: `sheet-sync` (old sheets into the app), `sheet-backup` and `sheet-mirror` (every order out to the backup sheet).
- **Error tracking**: Sentry project "Corner Cafe cakes staff app".

## How the live staff app is put together

The staff page is assembled in the browser from several pieces. **Every piece is loaded from an exact commit**
(jsDelivr, with raw.githubusercontent.com as fallback), never from `main`. So changing or deleting files on `main` never
changes what staff see. Only editing the Webflow page does.

1. **Base app**: `dist/app/staff-app.d1c119f6f0.js` at commit bd90f95e (Release D), loaded by the page footer with SRI.
2. **Order tools loader** (Webflow registered script `ccordertoolsloader66`): 16 add-ons from `src/` at commit 45a39be5
   (order-tools, analytics-birthday, cake-lead-time, service-tools, seasonal, treat-orders, analytics-focus, polish, ipad,
   flow, analytics-metrics, admin, welcome, answers, pickups, oldentry). Copies of loaders 34 to 66 are in `docs/loaderNN.js`.
3. **Other registered scripts** on the page: Sentry, Birthday Club list and menu item, analytics workspace (commit 8ee47424),
   app install icons (dist/pwa), email templates screen, six small analytics and Today layout scripts from 22 October,
   the asset check (`ccAssetVerify`) and its list of expected file fingerprints (`ccAssetManifestAll`).
4. **Older add-ons** pinned in the page footer: Heartbeat core (3fb6a2e1), customer directory (17e9a139), calendar dashboard
   (fe3704f7), relationship profile (40e1cf19), finish flow (7103cd83), date picker (e414d14d), Daily cake demand (fd6e6fa6,
   protected), analytics insights and seasonal demand (71758a89), new order clarity (0af0f630).

**Important: `build/build.py` does not rebuild the live base app.** Since mid October the base app has been built release by
release on top of the previous built file (see `build/release_d_settings.py`, `build/release_f_fixes.py`). The readable files
in `src/` are the source of each part and are kept accurate, but running `build/build.py` today would produce an older app
without practice mode, old orders, the touch standard and later releases. Make the next base app release the same way:
take the current live file with `git show <commit>:<file>`, apply checked replacements, print the new name and SRI.

### Protected commits

Branch `keep/live-pins` holds every commit the live pages and Edge Functions load (26 on 28 October 2026). **Never delete it.**
When a release pins a new commit, add it to that branch. With it in place, old branches can be deleted safely.

### Protected features

The Daily cake demand rail and the Heartbeat booking curve are never changed by design work (see `docs/HEARTBEAT_PROTECTED.md`).

## Folders

- `src/`: readable source of the staff app, its add-ons, the guest page, the festive page and the unsubscribe page. Edit these.
- `dist/app/`: the built files that are live today (base app, Release F candidate, guest app, email templates screen) and the
  small manifests older build scripts read. Older builds were removed on 28 October 2026; they stay in git history and on
  jsDelivr at their commits.
- `dist/brand`, `dist/pwa`, `dist/catalogue`, `dist/festive`: images, app icons, catalogue and festive assets.
- `dist/staff`, `dist/guest`: copies of the Webflow code blocks from 12 October 2026 (history).
- `build/`: build and release scripts. `release_*.py` are the current pattern; the `staff_*.py` and `footer_*.py` scripts are
  the one-off releases of 17 to 22 October, kept as a record.
- `central/`, `middleware.js`, `vercel.json`, `scripts/`: the Vercel host for central.cornercafefiji.com. **Stale: do not switch
  staff over** until it is rebuilt from the live page (see `docs/CENTRAL-STALE.md`).
- `recovered/`: read-only copies of pinned files that are not in the current tree.
- `supabase/functions/`: Edge Function source as deployed. `supabase/sql/`: every database change, by date. `supabase/schema/`
  and `supabase/snapshot/`: schema-only snapshots (no row data).
- `sheet-sync/`, `google-sheet/`: Apps Scripts for the sheet sync and the backup sheet.
- `test/order-tools/`: the current browser tests (Playwright, mock database). `test/` and `tests/`: earlier tests.
- `docs/`: how-tos that still apply (outage, restore, monitoring, central warning, Heartbeat). `docs/history/`: release notes
  and the Webflow rollback copies, by date.

## Making a change

1. Edit `src/`. For the base app, write a `build/release_<letter>_*.py` patch on top of the live file.
2. Run the tests in `test/order-tools/` against the new file (`LOCAL_DIR` points the tests at local files).
3. Commit to a branch, open a pull request into `main`.
4. Only after the owner says **"deploy"**: update the Webflow page or loader to the new commit, publish, read it back, and add
   the commit to `keep/live-pins`.

Database changes go in as new files in `supabase/sql/` and are applied as migrations. Applied migrations are never edited.

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
- **This repository**: it has to stay public for now (the live pages load files from it). Git history is not a database backup.

## Rollback

- Webflow: restore the previous site backup or re-upload the previous `dist/` files, then publish.
- Database: write a corrective migration. Rolling back page code does not undo database changes. Every change so far has been additive, so older page code still works with the current database.
