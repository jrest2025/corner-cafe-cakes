Corner Cafe staff app asset (8 Nov 2026: laptop fit, preview, not live).
Built with build/build.py from stability/laptop-fit-20261108, commit 446e478 (dist/app/staff-app.c058952802.js), on top of
the live screen fill release (staff-app.c6495c1e4d.js, the build of main byte for byte), so only the laptop fit differs.
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_6JZocS8Puoi4frhrDvL8RBczJe6W (8 Nov, screen fill) back to production.
