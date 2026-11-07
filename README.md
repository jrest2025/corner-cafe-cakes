Corner Cafe staff app asset (7 Nov 2026: interface stability step 1 on top of order capture Phase 2).
Built with build/build.py from stability/step1-safety-20261107, commit 2cee2a7 (dist/app/staff-app.5762825fd0.js). The build of main
(5e3294d, Phase 2) matched the live file (staff-app.c84e319ca8.js) byte for byte, so only this change differs.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_9sxi89AhadDvLsvuCBvVqb3CN9rn (7 Nov, order capture Phase 2) back to production.
