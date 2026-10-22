# Cake CRM analytics refinement — additive development branch (22 October 2026)

Status: **development only; NOT integrated into the live app or published.**

## Preserve without alteration
- Overview Cake Heartbeat and Daily Cake Demand rail (green cakes due, dashed purple booked), navigation position, daily cards and refresh.
- Existing lead-time statistics, seasonal booking buildup, Occasions booking curve and customer/report drill-downs.
- Current live sales, product, customer, planning, campaign, and data pages, business rules, historic sheet inclusion, existing orders and row-level security.
- Period rule: commercial KPIs since 13 Oct 2026 unless user selects otherwise; historical pattern charts may include all years and must say so.

## Work completed on this branch
- `src/staff.analytics-expansion.js`: read-only derived metrics for net completed revenue, cake quantities, AOV, in-period repeat-order share, occasion completeness, and booking lead-time distribution.
- `test/staff.analytics-expansion.test.cjs`: representative order fixture checks and guarantees no inputs are mutated.
- Module is intentionally NOT added to the existing Webflow loader or the protected analytics bundle yet.

## Integration before release
1. Identify *verified* order-created-date field in live and imported registers and map it explicitly. Do not substitute fulfillment date or an import-created timestamp for booking date.
2. Add a compact advanced metrics section inside the existing tab layout (not a new competing homepage). Keep the existing four headline figures and chart hierarchy.
3. Sales: preserve current sale recognition and VAT, and show revenue comparison only with consistent statuses/periods.
4. Customers: keep current historical returning definition separate from in-period multiple-order share; never label the latter 'retention'.
5. Occasion: supplement existing curve with category coverage and sales contributions, keeping existing report unchanged.
6. Marketing ROI: only display after campaign attribution AND cost data are confirmed; profit only with costs.
7. Add explicit missing-data states and chart footnotes, with all metrics drillable to matching orders where possible.
8. Run live/candidate heartbeat guard, demand rail contract, analytics tabs tests, responsive tests, and rollback verification. No publish until checks pass.

## Protected contracts
See `docs/HEARTBEAT_PROTECTED.md` and `docs/analytics-tabs-2026-10-20.md`.
