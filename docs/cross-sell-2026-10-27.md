# Cross-selling in order emails — live 27 Oct 2026, 11:50 PM Fiji (Roneel: "deploy")

- Confirmation and thank-you emails: Corner Café private dining and Chefs Catering for every customer; High Tea card for
  birthday, anniversary, Mother's Day, baby shower, Valentine's and congratulations cakes; one sister restaurant only for
  customers who agreed to offers. No cards for customers whose latest email answer is "no" (form or unsubscribe).
- send-emails v30 → commit 166b08cc. Rollback: point the loader at d2052bd860201d2e4d780fa03b3d1c153d00293e (v29).
- Database (migration email_offers_declined_20261027): email_payload adds offers_declined; unsubscribe_by_order records an
  email "no" when the customer had no live yes. promo_cards: new corner_cafe_high_tea (sort 4).
  Rollback: set is_active=false on corner_cafe_high_tea; the extra payload field is ignored by v29.
