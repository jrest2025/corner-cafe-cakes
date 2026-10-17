# Staff visual refinement — 18 October 2026

Reference-inspired visual language adapted to the cake CRM: clearer cards, prominent customer names, soft-blue pickup blocks, cake/clock/calendar symbols, larger payment badges, green paid dollar/tick symbols, amber money-owing symbols, and stronger allergy markers. Written labels remain; decorative SVGs are hidden from assistive technology. Phone paid markers preserve allergy/overdue priority. Desktop overview fit and existing workflow retained. Names unchanged.

## Favourites

A deliberate staff choice, never inferred from spend or repeat orders. The customer profile has a heart toggle. Saved hearts appear beside names in the customer list, CRM cards/activity and order cards/Today where customer IDs exist. The additive customer_favourites table shares the selection across staff devices; loading occurs on sign-in and when entering the customer list. No optimistic success: the frontend checks the returned saved value. Failed saves retain the previous state and show a retry message. Existing staff customer permissions apply. Archived/merged/no-contact profiles cannot be marked.

Schema: supabase/sql/customer_favourites.sql applied as customer_favourites_visual_refinement. RLS enabled; anonymous access revoked; authenticated select/insert/update only. Read requires cust.view; write requires cust.edit and an active unmerged customer. No client delete grant. A security-invoker trigger stamps actor and time server-side. The backend access test performed staff save/remove and checked actor stamping, denied unprivileged read/write and checked anonymous grants; the entire data test was rolled back. No customer was left marked by testing.

Security advisors reviewed. No new favourites-table issue identified; existing unrelated function/extension notices remain outside this visual release. This is not a complete system security audit.

## Verification

47 visual/favourite browser checks at 1920x1080, 1366x768, 820x1180 and 390x844; 132 spacing/alignment checks; 40 desktop viewport checks; 59 existing workflow checks; 20 connected journey checks. 298 browser checks in total, plus the database permission/rollback checks. All use invented data and block remote browser requests. Screenshots inspected, including phone paid markers and narrow desktop summary text.

Build: TERSER_BIN=<terser-5.31.0> python3 build/staff_visual.py. Reproduces and verifies the exact prior live JavaScript before applying narrow replacements and src/staff.visual.js; keeps all released CSS and appends src/staff.visual.css. Broader unfinished source-template features remain excluded.

## Rollback and limits

Restore docs/rollback/staff-footer-before-visual-2026-10-18.html and publish to revert the frontend. Keep the additive favourites table and its data, so a future release can retain staff choices. No order, price, payment, production or consent data migration is included. The existing modal order review remains; this release does not add a floor plan or replace it with a new split-screen workflow. Signed-in live visual inspection, physical printing and independent staff acceptance remain to be completed.
