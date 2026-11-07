Corner Cafe staff app asset (7 Nov 2026: screen fill, preview, not live).
Built with build/build.py from stability/screen-fill-20261107, commit 268b607 (dist/app/staff-app.c6495c1e4d.js), on top of
the live interface stability step 4 release (staff-app.8756dffbcc.js, the build of main byte for byte), so only the screen fill differs.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_CeA6GKS8Sk6FHJp9RaA61r8iVugu (7 Nov, interface stability step 4) back to production.
