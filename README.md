Corner Cafe staff app asset (7 Nov 2026: interface stability steps 2 and 3 together, preview, not live).
Built with build/build.py from stability/step3-today-20261107, commit 0a10bea (dist/app/staff-app.be9bda88b1.js), which contains step 2.
On top of live step 1 (staff-app.5762825fd0.js, the build of main 418c76f byte for byte), so only steps 2 and 3 differ.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_12As5Ft4GoiEBydr29UHdbPwUstA (7 Nov, stability step 1) back to production.
