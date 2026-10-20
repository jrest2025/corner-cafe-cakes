# Delivery fee breakdown and group booking cross-sell (published 20 Oct 2026, 11:08 PM Fiji)

Why: the guest confirmation showed "Delivery $15, Total $67, To pay $67". The $15 was already inside the $67,
but with no cake price on its own line it read as the fee being missing.

What changed (display only; prices and saving are unchanged):
- Guest emails (received, quote, deposit, confirmed, updated): Cake price, Delivery (area), Total, Paid, To pay.
- Staff new order email: Cake price, Delivery, Total. Unpriced custom requests show "To be priced", never a fee-only total.
- Kitchen slip PDF payment line: "... · Cake $52.00 + Delivery $15.00".
- Order form (bottom bar, side summary, review): "Cake $95 + delivery $15", then the total.
- Cross-sell in confirmed and thank-you emails: group bookings at Cantina and Chefs Catering always first
  (promo_cards with occasions = {"*"}), then one rotating sister restaurant (up to three cards).

Live:
- Email sender `send-emails` v26 is a one-line loader pinned to commit 72fcd30e8cab5297f6ba29c0258301fadf9d6d1a.
- Order page footer: dist/app/guest-app.cae549ce29.js, sha384-vB0ZTqQ73+t4bvmncQkYXNZsYJuiL2uJvycd5/lcuVsJIKcjLaWrygO9WVJ5rFyW.
- promo_cards: new row cantina_groups; chefs_catering_events retitled, link now /get-a-quote (enquire.html would not load).
  Previous rows are in table promo_cards_backup_20261020.

Checks: sample confirmed and staff emails for test order CC-1092 sent to roneel@jacksfiji.com and read back
(Cake price $52, Delivery (Denarau) $15, Total $67, To pay $67 on delivery); tests/run_delivery.py 17/17 on the new form build.

Rollback:
- Emails: redeploy send-emails with the loader pointed at 7e621b09f69c8a499a845508b31dc5fccfc9d0b9 (identical to v25).
- Form: footer back to gh/jrest2025/corner-cafe-cakes@78db316465cfdf7426309afda27bb862f7cce9e1/dist/app/guest-app.51ed2b5408.js,
  sha384-j8PV9u3KTAAat+/t1U5oKKA56zCsV5lyy+Apb+RFRsiaieIFqezRARGArZwhzAHk, then publish both domains.
- Cards: delete cantina_groups and restore chefs_catering_events from promo_cards_backup_20261020.
- The unused test function send-emails-candidate can be deleted in the Supabase dashboard.
