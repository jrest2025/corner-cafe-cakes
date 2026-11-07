Corner Cafe staff app asset (7 Nov 2026: interface stability step 2, background refreshes redraw only on change; preview, not live).
Built with build/build.py from stability/step2-redraws-20261107, commit 3027da4 (dist/app/staff-app.0856049e9f.js), on top of live step 1
(staff-app.5762825fd0.js, the build of main 418c76f byte for byte), so only this change differs.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_12As5Ft4GoiEBydr29UHdbPwUstA (7 Nov, stability step 1) back to production.
