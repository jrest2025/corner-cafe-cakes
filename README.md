Corner Cafe staff app asset (7 Nov 2026: Order capture Phase 2 — photo cake cards, size buttons, candle buttons,
money on the live slip, one-go save with fall back).
Built with build/build.py from order-capture-phase2-build (dist/app/staff-app.c84e319ca8.js), on top of the order taker
release (staff-app.0dcf4523b7.js, live 7 Nov 2026).
staff-app-complimentary-20261030.js keeps the URL the live site already loads (site script cake_delivery_waiver_release).
Database first: supabase/sql/order_capture_one_save_20261107.sql (additive). The app also works without it (earlier save).
Rollback: promote Vercel deployment dpl_4pox7NwAxHdX4Zc3Y2sR1Yr7Rmsy (7 Nov, order taker) back to production.
