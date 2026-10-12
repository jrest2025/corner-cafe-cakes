# Monitoring

## Sentry: errors in the staff app
- Project: corner-cafe-cakes-staff (Jack's Restaurants organisation). Kept apart from the Kazumi website project.
- Loaded on the staff page only, as the registered page script "CakesStaffSentry" (source: src/monitoring/sentry-staff.js).
- Sends: unexpected errors, failed saves that show "Something went wrong", and the "staff app did not load" check.
- Does not send: screen recordings, performance data, staff names, cookies, page addresses with search terms, browser console lines.
- Phone numbers and email addresses are removed from error text before sending. No-internet and expired sign-in errors are ignored.
- Limit: 200 events an hour. Environment is marked "test" until go-live.
- Alert: Sentry's default "Send a notification for high priority issues".

## Better Stack: background jobs
- Every 5 minutes the database runs ops_heartbeat(), which checks ops_health() and calls one Better Stack check-in address per job.
- Healthy: calls the address. Unhealthy: calls the address with /fail. Database or scheduler down: no call, Better Stack alerts on the missed check-in.
- Checks: database (the database and its scheduler are running), sheet_read (both order sheets read in the last 30 minutes with no failure since), email (no failed order email in 24 hours, none stuck over 30 minutes), backup (Google Sheet backup copied in the last 20 minutes; skipped until a sheet is linked).
- Check-in addresses go in app_config under hb_database, hb_sheet_read, hb_email, hb_backup. Only Better Stack addresses are ever called.
