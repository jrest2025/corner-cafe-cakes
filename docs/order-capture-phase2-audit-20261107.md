# Order capture Phase 2: audit (7 November 2026)

Read-only audit for the "Intelligent Order Capture & Operational Interface" brief. Nothing live was changed.

## What is live

- Staff app: `cornercafefiji.com/cake-orders-staff` (Webflow page 6aca162870735ac2247de4dd). Main bundle from Vercel
  `corner-cafe-staff-assets` (`staff-app-complimentary-20261030.js`, built from `src/staff.js`), plus add-ons from
  `ccordertoolsloader88` (commit 42ae8fe) and the footer add-ons listed in `docs/LIVE.md`.
- The brief's files `staff.order-flow.js`, `staff.form-ease.js` and `staff.touch.js` are no longer loaded on their own;
  their behaviour was folded into `src/staff.js`. `staff.ipad.js` and `staff.flow.js` are live through loader 88.
- Four scripts registered on the site on 6 Nov 2026 (`cccakeslipclarity`, `cccakecalendarops`, `cccakestepperclarity`,
  `cccake4ktype`) are not applied to the staff page and have no source in this repository.

## Existing order flow (src/staff.js, interactive Order Slip)

| Stage | Contents | Required |
|---|---|---|
| 1 Customer | Mobile first (finds a returning customer), name, WhatsApp, email, marketing permission, how they ordered, who is taking the order, when they ordered | mobile or "No mobile", name, permission answer, source, taker |
| 2 Cake | Price grid: tap a price for cake and size; flavour for cakes with variants; "Custom cake (not on the list)" | cake, size, flavour |
| 3 Make it yours | Inscription (40 characters), candles (free text), requirements (eggless, gluten-free, dairy-free, vegan, other), allergies, occasion | allergies answer, occasion |
| 4 When is it needed | Pickup or delivery, date and time together, delivery area chips with set fees, Other area and different charge with reason | date, time, area and address for delivery |
| 5 Finish order | Price, payment received (paid in full, deposit, none) | payment answer and amount |

Already in place: live slip preview beside the form on tablets, Back and Next always visible, field-level "what is
missing" messages, draft kept on the device, double-tap key on save (`idempotency_key`), finish screen, kitchen slip
from the same slip layout (`slip_pdf.js`, shared with emails).

## Real catalogue and data (live database, 139 real orders since 13 October 2026)

- 6 cakes, all with approved photos: Chocolate/Mudcake/Mocha (44 orders), Cheesecake (27), Red Velvet (23),
  Vanilla/Piña Colada (23), Black/White Forest (22), Strawberry (6). Custom cakes: 44 (32%).
- Sizes 6, 8, 10, 12 inch with serving labels (none for Cheesecake). 6 inch is 55% of sized orders.
- 7 flavours (variants) on 3 cakes. The stored flavour is often free text ("Mud", "Mud cake", "Mudcake").
- Occasions: 13 in the database; Birthday is 80% of orders.
- Fulfilment: 131 pickup, 8 delivery. Areas Nadi town $10, Denarau $15, Lautoka $30, plus staff-typed areas.
- Source: walk-in 97, phone 33, online 4, social 3, WhatsApp 1, corporate 1. Quantity is 1 on 135 of 139.
- Candles: free text, not structured ("1", "Number 1", "no", "5 0 candle"). No extras catalogue: `order_extras` is
  empty and no candle or extra prices exist.

## Risks found

1. Save is split: `staff_create_order` saves the order, then separate calls record cake requirements, the original
   order date and who took the order. If the connection drops between them, the order exists without those details
   (the app shows a warning toast). Safety-critical requirements should be saved in the same call.
2. Live slip preview shows no money: no delivery fee, total, amount paid or balance, and no occasion line.
3. Cake selection is a price table; the approved photos in the database are not used.
4. Delivery has too little history (8 orders) to sort areas by use; keep the set order.
5. Candles and extras: the brief asks for priced one-tap extras, but none are defined. Building them needs prices
   from the café; nothing should be invented.
6. The base test page (`tests/staff-test.html`) runs `src/staff.js` without the live add-ons, so screen tests do not
   see exactly what staff see.

## Reusable as is

Customer lookup by mobile, consent workflow, taker requirement, occasion list, delivery rules and fees, payment rules,
double-tap key, kitchen slip and emails, order history and audit log.

## Live regression found during this audit (most urgent)

- Since the 3 Nov 2026 10 PM release, the live staff bundle (`staff-app-complimentary-20261030.js` on Vercel) is built
  from `src/staff.js` only. The 30 Oct bundle it replaced was a larger patched build (it starts with practice mode code)
  that also carried the order flow bridge `window.__ccsOf` and "Who is taking this order?" (`order_set_taken_by`).
- `src/staff.js` has neither, so the live app no longer asks who is taking the order. Database check: staff-entered
  orders with a taker name were 10/10 (28 Oct), 37/37 (2 Nov), 5/6 (3 Nov), then 0/3 (4 Nov), 0/3 (5 Nov), 0/1 (6 Nov).
- Add-ons that use the bridge do nothing without it: `staff.order-tools.js` (order date and taker tools) and
  `staff.seasonal.js` (live through loader 88), plus `staff.order-flow.js`, `staff.old-orders.js`, `staff.brief.js`
  and practice mode if they were relied on.
- Fix: put the bridge and the taker question into `src/staff.js` itself, so every build carries them; preview, then
  release on approval. The seven orders without a taker can be filled in by staff.
