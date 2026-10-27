# Analytics audit — Corner Café Service Hub (27 October 2026)

Phase 1 of the analytics modernisation brief. Read-only: no code, data or settings were changed.
Method: inventory of every Analytics panel (test render), code trace of every metric (bundle + add-ons + registered scripts + database functions), and read-only reconciliation queries against the live database (`register` table, the source behind `dashboard_register`). Live figures below are as of Tuesday 27 October 2026, Fiji time.

## 1. How the Analytics screen is built

- One database function, `dashboard_register`, feeds nearly every panel. It already removes test orders, deleted orders and records waiting for manager review. One row per order (630 usable rows live, from four sources: Staff app, Website, Walk-in sheet, Online sheet).
- **Two separate pipelines read it:**
  - **Overview** (Cake Pulse, Performance snapshot, Today's insights, Daily cake demand, Seasonal booking buildup) — its own calculations, every year on record, ignores the page filters.
  - **Tabs** (Sales & Products, Customers & Occasions, Planning, Data) — main bundle, counts only pickups from the launch date (13 October 2026) unless "show older orders" is on, follows the page filters.
- Several later layers (registered "Business intelligence" card, focus/polish/workspace add-ons) relabel, hide captions or rearrange; they do not change sums.

## 2. Confirmed defects (evidence-backed)

Live numbers are from read-only queries; code references are file:line in the repository.

| # | Defect | Evidence | Live impact today |
|---|---|---|---|
| D1 | **"Completed orders" differs between Overview and Sales.** Overview: app-recorded completions only, last 30 days, all years. Sales: recorded + assumed (old sheet) completions, launch onward. | `seasonal-demand-staging.js:169` vs `staff.dash.js:32,39` | Overview shows **52**; Sales shows **33** for the same "last 30 days". |
| D2 | **"Ordered ahead" uses an average that one outlier dominates.** Overview and Today's insights average booking-to-pickup days with no upper limit; Occasions uses a median capped at 180 days. | `seasonal-demand-staging.js:178-179` vs `staff.oi.js` | Average **17 days** vs median **2 days** (one order booked 338 days ahead). The Overview figure is misleading. |
| D3 | **Three definitions of "returning customer".** Overview: 2+ verified bookings ever (future included). Insights: 2+ active orders. Customers tab: first completed pickup before the period. | `seasonal-demand-staging.js:170-174`, `staff.analytics-insights.js:275`, `staff.analytics-tabs.js:280` | Overview: **8 of 42** returning. Customers tab: **5 of 28**. |
| D4 | **Overview counts pre-launch sheet orders; tabs don't.** Last 30 days spans 28 Sep–27 Oct; the tabs drop everything before 13 Oct. | `staff.dash.js:32` vs Overview reading all years | **23** orders in the window are on the Overview and in no tab. |
| D5 | **Occasions caption claims "every year on record, including sheet orders" but counts launch onward only.** | `staff.oi.js:24` vs caption `staff.analytics-tabs.js:308`, filter text `staff.analytics-focus.js:120` | Wrong label on every view. |
| D6 | **Occasions "Revenue" includes confirmed orders not yet collected.** | `staff.oi.js:12` | Will not match Net cake sales. |
| D7 | **Upcoming value computed three ways.** Overview "Confirmed order value" (confirmed only, refunds kept, no filters), Planning "Booked, next 30 days" (unconfirmed included, refunds removed, filters applied), Cake Pulse (its own). | as listed | Two different "next 30 days" money figures on screen. |
| D8 | **Refunds handled inconsistently.** Net cake sales subtracts refunds; with a cake filter on, values come from price × quantity without refunds; Cakes ranked and Cake Pulse never subtract refunds. "Net" also includes delivery fees. | `staff.dash.js:36,76`; Cake Pulse stable build | 6 live orders carry a delivery fee. |
| D9 | **"Still owed" vs "To collect before pickup" use different status rules** (confirmed/completed only vs any status). | `staff.dash.js:170` vs `staff.analytics-tabs.js:318` | Small today: 1 unconfirmed order owes money. |
| D10 | **Two currency formats** ("FJD 1,206" on Overview, "$720" elsewhere; birthday card shows cents). | `seasonal-demand-staging.js:139`, bundle | Visible inconsistency. |
| D11 | **"Occasion not recorded" on Planning counts past completed orders**, and Planning hides its captions. | `registered-footer.html:12`, `staff.polish.js:886` | Reads as an upcoming problem when it isn't. |
| D12 | **Slow sellers breaks under a cake filter** (share taken of the filtered total, so every other cake is "slow"). | `staff.analytics-tabs.js:244` | Wrong list whenever a cake is filtered. |
| D13 | **"Orders by month" chart and "Peak month" use different data** (chart sums the first 12 occasion rows and ignores the panel's choices). | `staff.analytics-focus.js:128-136`, `staff.oi.js:86` | Chart and headline can disagree. |
| D14 | **Seasonal buildup columns can't add up** ("Cakes due" includes orders without a verified booking date; checkpoint columns don't). | `seasonal-demand-staging.js:66-73` | Row totals never reconcile. |
| D15 | **"Order date" basis is partial** (launch filter and "new customer" still use pickup date). | `staff.dash.js:32`, `staff.analytics-tabs.js:278` | Mixed basis when "Order date" is chosen. |
| D16 | **Key captions hidden** (e.g. "Including VAT" on Net cake sales). | `staff.analytics-focus.js:178` | Reader can't tell what the figure includes. |

## 3. Latent risks (no wrong numbers today)

- **Unpriced orders count as $0 in averages** (`staff.dash.js:79`). Live: 96 active app orders have a $0 value, but none fall in the current completed-sales window, so averages are correct today.
- **Mixed-cake orders are credited to the first cake** (`register` keeps one cake per order). Live: no order has more than one cake line, so no impact yet; it will matter once multi-cake or festive-treat orders arrive.
- **"N of N orders priced" can never show an unpriced app order** because `estimate_total` cannot be empty and $0 counts as priced.
- **UTC date fallbacks** in three files (`seasonal-demand-staging.js:228`, `staff.analytics-insights.js:406`, `staff.cake-lead-time.js:74`); the current loader always passes a Fiji date, so not active.
- **Birthday card "in the next undefined days"** appeared only in the test copy; the live `crm_birthday_comeback` returns `days`. A one-line fallback would make it robust.

## 4. Recommended direction (for decision)

1. **One metrics layer.** A single shared definition for: completed sale, order value (incl./excl. delivery and refunds), returning customer, lead time (median, 0–180 days), amount owed, upcoming booked value — used by the Overview, every tab, insights and exports.
2. **One data scope.** Decide whether Analytics shows the full sheet history or launch onward only, and apply it everywhere (with a visible "Includes sheet history" / "Since launch" label).
3. **Overview follows the page filters** (or is clearly labelled as fixed "Last 30 days").
4. **Executive overview → detail → records.** Every KPI opens its supporting orders (data explorer), with the period, filters and refresh time shown.
5. **Fair comparisons.** Period-over-period change with equal-length periods, partial periods labelled, no % change from a zero base.
6. **Consistency fixes:** one currency format (FJD, no cents), median lead time, priced-only averages with "N unpriced" shown, refunds and delivery handled the same everywhere, Slow sellers and Orders by month fixed.
7. **Automated checks:** tests that compute each metric from fixture records and assert the Overview, tabs and exports agree.

## 5. Decisions needed from the business

1. Analytics scope: **full history (sheets + app)** or **since launch (13 Oct 2026)**?
2. "Sales" figure: **after refunds, including delivery fees and VAT** (as now), or **cake sales only** (excluding delivery)?
3. Returning customer: **ordered before (any earlier order)** — recommended — or **2+ orders ever**?

## 6. Stage 2a — implemented (loader 33, commit bc2779fd) — live 27 Oct 2026, 5:28 PM

Decisions applied (recommended defaults, approved with "proceed"): number cards count pickups from the launch like the tabs (multi-year charts stay all years and say so); sales stay "after refunds, incl. delivery and VAT" with the VAT line visible; returning customer = had a completed sale before the period.

- New shared definitions `CCCakeMetrics` (in `src/seasonal-demand-staging.js`), used by the Overview cards and Today's insights. Fixes D1, D2, D3, D4 (cards), D7 (value after refunds, $0 = not priced, "N not priced yet"), D10 (dollars everywhere), D14 ("(N undated)" on the seasonal table), UTC date fallbacks.
- Add-on label fixes (`src/staff.analytics-focus.js`): D5 (Occasions filter says "since the launch"/"all history"), D6 ("Revenue" → "Order value" on Occasions), D11 ("Past orders with no occasion"), D12 (Slow sellers hidden while one cake is filtered), D16 ("Including VAT" line kept).
- Delivery: `src/staff.analytics-metrics.js` (generated by `build/analytics_metrics_addon.py`) ships the corrected Overview and insights through the order-tools loader and holds them against the older pinned copies in the page footer. The page footer itself is unchanged.
- D13 withdrawn after verification: the Orders by month chart was correct (labels sit under their values).
- Tests: test_metrics 18/18 (hand-made orders with known answers), test_act_now 42/42, test_polish 148/148, test_flow 20/20, test_birthday 39/39, test_analytics_focus 72/75 (3 failures pre-existing: "empty tabs hidden").
- Still to do (stage 2b, main app bundle): D8 refunds in Cakes ranked and with a cake filter, D9 "To collect" status rule, D15 order-date basis, mixed-cake attribution, data explorer (every number opens its orders), period-over-period comparisons, exports.
- Rollback: remove ccOrderToolsLoader33, add ccOrderToolsLoader32 (footer, 1.0.32), publish.
