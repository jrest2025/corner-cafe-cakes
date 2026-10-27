# Corner Café Cakes CRM — Cross-Hub Parity Adoption (review only)
27 October 2026 | **Documentation only. Not released.**

## Preserve the cake-operations engine
Corner Café manages cake/customisation, historical paper orders, deposits and balance payments, kitchen production, pickup/delivery, customer CRM and handover. No restaurant booking, grill seating or visitor-capacity rules belong here. Supabase remains the authoritative order/financial/history store; Webflow production publication is separate from Vercel preview hosts.

## Highest-value features to adapt from other hubs
1. **Kazumi/Group availability clarity -> cake fulfilment:** staff New order must support valid future pickup dates (including weeks ahead). Derive permitted dates from café-specific ordering lead times, open dates, pickup/delivery settings and product capacity, not from 15-minute restaurant slots. Review existing date picker and backend validation; don't mark this fixed until source and application agree.
2. **Kazumi accessible Service View -> Corner Café Counter:** keep the large quick-service controls, one clear Add order action, simple exit/focus, with a fixed shell and separately scrolling content on iPad. Preserve staff-taking-order name entry (required at each new order due shared Counter login).
3. **Group Reservations record action parity -> cake orders:** a confirmed order opened from Today, Orders, Calendar, Counter or search should expose the same permitted order actions/statuses, deposits, kitchen/handover and audit history. Reuse existing canonical actions; never let a view bypass payment/role conditions.
4. **Group/Kazumi actionable attention -> cake operation board:** overdue deposit, tomorrow's production, unconfirmed orders, delivery/pickup conflicts and completed-handover exception, with truthful counts and relevant drill-down. Use cake-specific data; do not import general restaurant arrivals KPIs.
5. **Cross-hub Settings usability:** use explicit groups for hours, lead times, product/catalogue, delivery zones/charges, staff rights, communications and device controls. Manual 12-hour timing where operationally relevant; settings mutations must keep local permission checks and history.
6. **Shared drawer/form status conventions:** reuse readable errors, pending-save treatment, alert hierarchy, date navigation and accessible keyboard/focus. Preserve existing guided five-step flow, finish page, duplicate warning, paper-order/backfill and corrections.
7. **Optional messaging integration:** WhatsApp PR #42 is WIP; don't advertise as production, automatically expose cross-hub chats or share marketing consent/telephone configuration.

## Verify before any feature claim
- Check each workflow against its actual Webflow staff/guest loader and corresponding built GitHub artifact; source documentation may be newer than deployed page.
- Audit future pickup against date picker, calendar, order validation, closed dates, 12-hour display and multi-week horizon.
- Check iPad portrait/landscape, overscroll, fixed sidebar/footer, large touch targets and no whole-shell dragging.
- Reconcile draft shared-nav PR #20 and draft dashboard work (#40/#41), rather than replacing the published sidebar contract.
- Later functional checks use invented records and mock data; no production orders, payment, prints or messages for testing without separate authorisation.

## Do not copy
Kazumi Teppanyaki scheduling and grill assignment; Group Reservations venue switching, staff approvals for dining requests, group-marketing customer aggregation. Do not rewrite order, payment, production, fulfilment or consent schemas to achieve visual consistency.

## Release constraints
Plan only here; no code release, database migration, Webflow publication, finance mutation, message send or production deployment. Keep per-app owner approval and rollback discipline.

[Shared audit (review branch)](https://github.com/jrest2025/-jacks-restaurants-fiji.-/blob/docs/service-hub-parity-20261027/docs/SERVICE-HUB-FEATURE-PARITY-20261027.md).
