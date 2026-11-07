Corner Cafe staff app asset (7 Nov 2026: interface stability step 4, preview, not live).
Built with build/build.py from stability/step4-customers-analytics-20261107, commit c5abdc6 (dist/app/staff-app.8756dffbcc.js), on top of
the live wide-screen New order release (staff-app.07e11bb359.js, the build of main byte for byte), so only step 4 differs.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_4gDzXeadmJM6WsUJK1zRAi9LoT4t (7 Nov, New order on wide screens) back to production.
