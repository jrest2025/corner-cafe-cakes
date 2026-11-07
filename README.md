Corner Cafe staff app asset (7 Nov 2026: New order on wide screens, preview, not live).
Built with build/build.py from stability/wide-order-form-20261107, commit fd543ac (dist/app/staff-app.07e11bb359.js), on top of live
steps 2 and 3 (staff-app.be9bda88b1.js, the build of main 8e7d67b byte for byte), so only this change differs.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_FuTJQPqrwmjbPoKCf3VYm5VLvwbM (7 Nov, stability steps 2 and 3) back to production.
