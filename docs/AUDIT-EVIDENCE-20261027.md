# Audit evidence, 27 October 2026 (read-only)

Collected by Claude during the cross-hub audit. Live versions were checked against the production database at 8:40 PM Fiji, read-only. Management report: https://claude.ai/artifact/9FvZEcFup44MF3xaEZKtcK

# Corner Café Cakes CRM / Corner Café Service Hub — audit

Audited 27 October 2026 (read-only). Repository: `jrest2025/corner-cafe-cakes`.

## 0. How releases work, and what is live

### The local clone is not the live code

- `/home/claude/corner-cafe-cakes` is a **shallow, single-commit clone of `main` at `8b16819` (22 Oct)**.
- `main` is **behind the live app by about 125 commits**. All releases from 22 to 27 October were made from side branches and never merged.
- For this audit I made a blobless clone of all branches (scratchpad, `ccfull`) and checked out `origin/preview/admin-console-b-20261027` (`2704d51`, 27 Oct 8:03 PM). This is the branch with the most recent release record.
- Compared with `main`, that branch has 111 files changed (+40,828 / −2,247).
- That branch **deletes** the Vercel `central/` host, `middleware.js` and `vercel.json`, which exist only on `main` and `feature/central-cornercafe-vercel`. The two lines of work have diverged.

### Release mechanism

There is no CI and no version number. Everything is done by hand through the Webflow API, as described in `README.md` under "Deploying a change". There are four release paths.

1. **Main bundle**
   - The Webflow staff page footer has one loader line that pulls `dist/app/staff-app.<sha10>.js` from jsDelivr, pinned to a commit with SRI. Fallback is `fastly.jsdelivr`.
   - Since about 19 October, new bundles have **not** been rebuilt from `src/staff.js`. Instead they are anchored string patches on the minified live bundle. Examples:
     - `build/staff_pickup_guard.py`
     - `build/staff_date_open.py`
     - `build/staff_slip_photo.py`
     - `build/staff_analytics_fix.py`
   - `src/staff.js` was last changed on 20 October (`1b45526`). **The readable source therefore no longer matches the live bundle.**
2. **Add-on loader**
   - A Webflow registered script `ccOrderToolsLoaderNN` fetches 12 `src/staff.*.js` files pinned to a commit, each with an md5 fingerprint (`docs/loader34.js`). The files are about 502 KB of unminified JavaScript.
   - Loader numbers run from 13 to 35 in `docs/order-tools-2026-10-27.md`.
3. **Footer and head add-ons**
   - Further CSS and JS files are pulled straight from `raw.githubusercontent` or jsDelivr at older pinned commits (`test/fixtures/staff-footer.html`): date picker, customer directory v3, relationship profile, finish flow, calendar dashboard, demand rail (locked), seasonal demand, analytics insights, cake lead time.
4. **Database**
   - SQL files are applied by hand (`supabase/sql/*.sql`, some at `supabase/*.sql`).
   - `supabase/snapshot/functions.sql` and `supabase/schema/*` are frozen at 12 October.
   - Later function changes are applied as text-replace migrations (`pg_get_functiondef` then `replace`), for example `order_cancel_reason_20261026.sql` and `seasonal_items_20261026.sql`.
   - **No current, complete schema snapshot exists.**

### Live state, according to the repository records

Webflow itself was not checked, so none of this is verified against the actual page.

- **Main bundle:** `dist/app/staff-app.e0a7470c8a.js` at commit `d2052bd8`, released 27 Oct 7:14 PM (`docs/analytics-audit-2026-10-27.md` §7; `test/fixtures/staff-footer.html` on the release branch).
- **Add-on loader:** `ccOrderToolsLoader34` at commit `1870847c`. Loader 35 (welcome screen) went live at 7:59 PM and was **rolled back at 8:03 PM** at Roneel's request.
- **Email function:** `send-emails` v29 imports `d2052bd8`.

### Which version is "live" depends on where you look

| Where | Bundle shown as live |
|---|---|
| `main` | `staff-app.efbea59dfe.js` (21 Oct, in `test/fixtures`) |
| `central/page/page-footer.html` on `main` | `staff-app.61d3858119.js` (22 Oct pickup guard) |
| Release branch | `staff-app.e0a7470c8a.js` (27 Oct) |

**The Vercel `central/` copy is already stale by six or more releases.** Its build rule says "must equal the live page character for character", so it would fail, or would ship old code, if it were switched over.

### What "Implemented but Unreleased" means here

Nothing on `main` is newer than the live release. Unreleased work lives on branches and draft pull requests:

- `fix/future-pickup-calendar-20261026` (no pull request; superseded)
- `preview/admin-console-b` welcome screen (rolled back)
- #42 WhatsApp
- #41 Today CSS
- #40 analytics cards
- #37 analytics purpose
- #24 heartbeat
- #20 shared navigation
- #3 settings design
- #2 Meta events
- #1 guest selection
- #43 parity plan (docs only)

## Area findings

Status key: **Live** (per release notes; Webflow not checked) / **Unreleased** / **Draft (PR)** / **Missing** / **Not Applicable**. All `src/` paths refer to the release branch.

### 1. Today dashboard and "Needs attention" islands — Live

**What exists**
- Core: `src/staff.js` `todayView()` at about line 734. It shows:
  - a warning panel built from `attnGroups()`, red before amber, three items at most, then "See all"
  - number tiles
  - the week strip
  - a resume card for unfinished work (`resumeCard()`)
- Overlays in `src/staff.flow.js` (loader 32, live 27 Oct 4:37 PM):
  - `actNow()` (about line 385) replaces the islands, the online-order banner and "Waiting on you" with **one "Act now" list, urgent first, each order shown once**
  - Payments sits beside the week
- iPad layout: `src/staff.ipad.js`, which uses measured masonry. Greeting and briefing come from `src/staff.brief.js`.

**Strengths**
- Clear rules: act first, say it once, colour only by meaning.
- Each line opens its order.
- Waiting time is shown on the line.
- `test/order-tools/test_act_now.cjs` checks that no order appears twice.

**Weaknesses**
- Today was re-laid out **four times on 27 October** (loaders 28 to 32). Layers include `todayView` → polish → ipad → flow, plus `staff.islands.js` and `staff.more-islands.js`, which are still on the page.
- Release notes admit the older Today tests "describe the previous Today and still pass without staff.flow.js loaded; to be updated." The test suite does not describe what is live.

### 2. Sidebar and navigation — Live

**What exists**
- `navTabs()` in `src/staff.js` at about line 223 builds a flat list: Today, Needs attention, Orders, Calendar, Counter tablet, Kitchen, Handover, Customers, Analytics, Register, Settings, More. Each item is permission-gated.
- `src/staff.sidebar-contract.js` (live 21 Oct) **moves** the same buttons into six groups at 760px and wider: Overview (Today, Needs attention), Operations (Orders, Counter tablet, Kitchen, Handover), Planning (Calendar), Customers, Insights (Analytics, Register), System (Settings). Empty groups are hidden.
- Phones: a bottom bar (Today, Needs attention, Orders, More). The More sheet (`moreSheet()`, about line 889) has icon tiles (from `staff.flow.js`) including Practice mode, Change password and Sign out.
- Desktop: the signed-in name, role and Sign out sit at the bottom of the sidebar (`shell()`, about line 248).

**Matches the requested order?** Yes on tablet and desktop.

**Gaps**
- **No "Help" item exists anywhere.**
- Account settings are only "Change my password", inside More.
- The phone More sheet repeats Calendar, Kitchen and Customers by design.
- Needs attention is now partly redundant with Today's Act now: same data, two places.
- PR #20 (shared navigation) overlaps the live sidebar contract and is stale (18 Oct). Close it.

### 3. Order creation flow — Live

**Staff guided steps**
- `src/staff.js` steps: `stepCustomer` / `stepCake` / `stepFinish` / `stepWhen` / `stepPay` (about lines 2579–2693).
- Stepper and slip view: `slipStepper()` at about line 2889.
- Submit: `submitOrder()` at about line 3050.
- The server function `staff_create_order` sends an `idempotency_key` (added in `supabase/sql/seasonal_items_20261026.sql:414`).

**Plain words** (`src/staff.order-tools.js`, live 26 Oct)
- "Cake still to come" / "Cake already picked up" replace New order / Old order.
- One tap moves a typed paper slip over to a new order.
- Cancel order now has preset reasons.

**Guest web form**
- `src/guest.js` and `src/guest.seasonal.js`.
- Inline calendar on the date step, live 27 Oct (`build/guest_inline_cal.py`).

**Paper and historical orders**
- `src/staff.old-orders.js`, plus the server function `staff_enter_old_order` in `supabase/old_orders_20261021.sql`.
- The server checks: pickup date must be before today; the slip (order) date must be present; the day they paid must fall between the order date and today; a possible-duplicate check.
- `staff_correct_order` handles corrections, with the full old and new values recorded.

**Future pickup dates (the reported concern) — answer: future dates weeks ahead ARE allowed, client and server.**

*Server:* `_create_order` (`supabase/sql/custom_cake_and_photos.sql:111`; snapshot `functions.sql:81`) rejects:
- dates in the past
- dates beyond `today + locations.max_days_ahead`. The column default is 90; `docs/future-pickup-2026-10-26.md` reports the live value as 90.
- closed dates
- times outside collection hours or off the slot grid

There is no other upper limit.

*Original client (`src/staff.js:2639–2642`):*
- 7 quick-date chips on tablets, 10 elsewhere, plus "Other date" which opened a native date input with `max = today + max_days_ahead`.
- Later dates were *possible* but hidden behind two taps. That is the root of the complaint.

*How it was fixed over time:*
1. 22 Oct, pickup guard (`build/staff_pickup_guard.py`): blocks a year before 2015 or more than 730 days ahead, and blocks a past pickup when the order day is after it. This does not block future dates.
2. 26 Oct, order-tools loader: "Other date" becomes "Later date" and opens the calendar in one tap.
3. 27 Oct 7:14 PM, live bundle `e0a7470c8a` (`build/staff_date_open.py`): new cakes get an **always-open month calendar from today up to `max_days_ahead`**, with month arrows and closed days greyed out. Paper slips keep their own field.

*Separate attempt:* branch `fix/future-pickup-calendar-20261026` (`src/staff.future-pickup.js`, with "Pickup in 2 weeks" and calendar buttons) is unreleased, has no pull request, and is superseded. Delete it.

*Open limits:*
- The 90-day horizon is a setting (Settings → "Furthest ahead (days)", `src/staff.js:4060`). Orders beyond about 3 months (for example weddings) still get "We take cake orders up to 90 days ahead."
- **Not verified on the live page or the real tablet.**

**New risk introduced on 27 October**
- `staff_date_open.py` removes the short-notice questions. For dates inside the lead time it now always sends `rush:{reason:"Booked by staff", approved_by:<staff name>}`.
- In `_create_order`, a staff order with `v_rush` **bypasses the daily capacity limit** (`if v_count >= loc.daily_capacity and not (v_staff and v_rush)`).
- So every short-notice staff order now silently overrides a full day, with no warning or approval. Previously it needed a typed reason and an approver.
- This only matters if `daily_capacity` is set, which I could not verify. The short-notice flag is also no longer visible on slips or summaries.

### 4. Calendar and list views — Live

- **Calendar:** `calendarView()` at `src/staff.js:3208`.
  - Year view (`calYear`, shaded by orders or cakes), Month (`calMonth`), Week (`calWeek`), Day (`calDayView`).
  - A side panel shows the selected day and an order preview (`dayPanel`, `previewPanel`).
  - Filters: Status and Type selects.
  - Occasions and holidays layer: `staff.cal-occ.js`. Quiet slots: `staff.calendar-quiet-slots.css`. Past days faint since 27 Oct.
  - A separate `staff.calendar-dashboard.js` is still loaded from the footer at an old commit.
- **Orders list:** `ordersView()` at about line 548 with tabs, two cards across on wide screens (`staff.flow.js`).
- **Kitchen:** has its own Today, Board and calendar month (`kitCalView`, about line 1870).

**Weakness:** three calendar-style surfaces (staff calendar, kitchen calendar, new-order open calendar), each with its own code.

### 5. Search, filters and finding a record — Live

- `filtered()` at `src/staff.js:477` searches order number, name, and phone digits (3 or more).
- `searchOlder()` goes to the server for orders outside the loaded window. **`loadOrders()` loads only the last 45 days plus open orders, capped at 400 rows**, so older orders depend on that server search.
- Today has a "Find an order" button.
- Customers have their own directory (`staff.customer-directory-v3` from the footer, plus `staff.crm.js`).
- **Dropdowns:** `src/staff.polish.js` (`ddMake` / `ddOpen`, about line 91) turns filters into custom dropdowns with icons and a tick, shown as a bottom sheet on phones. Analytics uses a Section dropdown on phones and tablets.

### 6. Order detail drawer, and whether actions match across screens — Live

- One sheet, `orderSheet()` at `src/staff.js:957`, plus `actionsBox()` at about line 1177. Opened through the single `openOrder(id)` (about line 796).
- Every entry point uses `data-act="open-order"` → `openOrder`: Today, Act now, Needs attention, Orders, Calendar (preview then Open order), Kitchen (opens `kitchenSheet`, which differs by role), search, Register, Customers history.
- **So yes, the actions are the same everywhere**, because there is only one sheet. Focus returns to the opener (`sheetFrom` / `sheetReturn`, about line 828). The back gesture closes the sheet (history state).
- 27 Oct changes (loaders 26–27):
  - four tabs: Cake, Collection/Delivery, Payment, More
  - next step as the main button
  - risky actions behind "More options"
  - Cancel moved beside the main buttons (order-tools)
- The Counter tablet opens the same sheet.

### 7. Customer CRM, consent and delete — Live

**What exists**
- `src/staff.crm.js` (156 KB): workspace, follow-ups, reminders, possible duplicates and merge (`cust.merge`), birthday club.
- `customerSheet()` at `src/staff.js:3618`.
- Consent per channel and per number or email: `consentLine()` at about line 3606, server `staff_set_consent`. It handles "needs reconfirming" and "an earlier yes was for a different number".
- Delete: `supabase/customer_delete_20261020.sql`.
  - Managers and admins only.
  - Blocked while the customer has open orders.
  - Orders move to a "Deleted customer" holder, so revenue stays correct.
  - Notes, consents and so on are purged.
  - The button sits behind More options.

**Strength:** strong privacy design.

**Weakness:** three customer layers (core, `staff.customer-crm.js`, footer `customer-directory-v3` and `relationship-profile`).

### 8. Counter tablet / rapid entry — Live (the group's tablet reference)

- `tabletOn()` / `tabletHome()` at `src/staff.js:3395–3415`.
  - Full screen.
  - One big button, "Start a new cake order", or "Carry on with the unfinished order".
  - After saving, it returns to the tablet home with the order number, and "Write this number on their receipt" when there is no phone.
- New-order draft is kept per login.
- The iPad shell (`src/staff.ipad.js`, live 27 Oct) pins the shell, uses one scroll region, and fixes the 100vh/100dvh document scroll.

**Weakness:** the shell fix arrived only today, after "unstable, glitchy" feedback. It needs time in real use.

### 9. Attention / exception centre — Live

- `attnGroups()` at `src/staff.js:581` defines eight rule groups:
  - overdue
  - due within 3 hours and not ready
  - due today with kitchen not finished
  - unconfirmed and due within 2 days
  - waiting on you
  - balance still to pay
  - allergies to check
  - missing details
  - plus customer concerns (feedback)
- Each group is gated by permission ("Only what your login can act on"). Each order sits in its first matching group, with all reasons listed.
- `attnView()` shows islands with one expanded panel.

**Strength:** truthful, cake-specific rules. Other hubs should copy this model.

### 10. Analytics, KPIs and charts — Live; several drafts

- Core: `staff.dash.js`, `staff.an.js`, `staff.bi.js`, `staff.analytics-tabs.js`, `-workspace`, `-insights`, `-focus`, `-birthday`, `-calm`, plus the shared metric definitions `src/staff.analytics-metrics.js` (`CCCakeMetrics`, stage 2a, 27 Oct).
- Stage 2b fixes went into the bundle on 27 Oct.
- **Protected** (`docs/HEARTBEAT_PROTECTED.md`): Daily Cake Demand rail (`src/staff.demand-rail.locked.js`, pinned at `fd6e6fa`), Cake Heartbeat / Cake Pulse (renamed 27 Oct, title only), Seasonal booking buildup, Booking curve. A guard script runs before each release.
- Audit: `docs/analytics-audit-2026-10-27.md` (defects D1–D15). Still to do: D15 order-date basis, mixed-cake attribution, drill-down explorer, period comparisons, exports.

**Draft pull requests overlap:**
- #24 Heartbeat (dirty, superseded by the live heartbeat)
- #37 analytics purpose (it carries its own bundle `staff-app.46b4c059b1.js` built on an old base, so it cannot be merged safely)
- #40 BI cards

All three should be closed or rebased.

**Tests run:**
- `test/order-tools/test_metrics.cjs`: 18/18 pass (offline).
- `tests/demand-rail-contract.test.cjs`: PASS.

### 11. Settings, staff admin, roles and permissions — Live

- `settingsView()` at `src/staff.js:4053`: hours, lead times, furthest ahead, delivery zones, menu editor, occasions, alerts, print, deleted orders, backup sheet, team, access levels.
- Permissions: `supabase/sql/permissions_v1.sql` / `v2.sql` with permission keys (`ord.view`, `ord.create`, `ord.edit`, `ord.cancel`, …), level and per-user grants, and a server function `has_role`. Client uses `canP(k)`.
- Team admin: `teamView`, `staffSheet`, `levelsView`, plus the `staff-admin` Edge Function.
- Admin console Step A (`src/staff.admin.js`, live 27 Oct 7:45 PM): six groups with live status, search, a path back, explanations behind "i".
- Seasonal items now sit inside Settings.
- PR #3 (settings design document) is superseded by the admin console. Close it.

### 12. Notifications, emails and WhatsApp — emails Live; WhatsApp Draft (#42)

- **Emails:** `supabase/functions/send-emails` (Resend), with an `email_outbox` queue and a 5-minute retry cron. There is a test mode. The kitchen slip PDF with photos goes out by email (v29). An unsubscribe function exists. The order sheet has `mailBox()` (status, hold, resend, at about line 1056).
- **WhatsApp:** today only a `wa.me` link (`waLink`, `src/staff.js:25`), shown as a green button.
- **PR #42:** a single-number Cloud API webhook, admin, inbox and order association. A WIP schema exists. A further 15+ commits sit on the feature branch beyond what the pull request diff shows.
- **In-app alerts:** a toast "New order waiting for review" on silent refresh. Order alert settings exist. No push notifications.

### 13. Errors, validation, saving and busy states, recovery — Live (strong)

`src/staff.js:126–200`:
- `errKind` sorts errors into offline, expired, denied or other, each with plain-language messages.
- An expired session saves the draft and says "the order you were taking is kept".
- `markBusy` shows "Saving…", disables the button and resets after 20 seconds.
- An offline banner appears.
- The phone bottom bar hides while typing.
- The loader fails safely ("The staff app did not load…").
- Server errors carry a field code (`_err(code,msg,field)`).
- A version number on order changes gives optimistic locking (`p_version`).

### 14. Audit trail, change history, corrections, cancellations — Live

- `_log()` events, `write_audit()` trigger, `order_amendments` with revision and from → to per field, reason, kitchen acknowledgement and customer notification (`changeHistory()`, `src/staff.js:2080`).
- `staff_correct_order` handles corrections after handover.
- Soft delete and restore (`admin_delete_order` / `admin_restore_order`, plus a Deleted orders view).
- Cancel reasons (live 26 Oct): five presets plus "other", stored in `orders.cancel_reason` and in the log. Paid orders still need a manager.

### 15. Duplicate order and customer warnings — Live

- Order: `order_possible_duplicates` (same customer, cake and size within 31 days; wider for old orders), called from `staff.old-orders.js:215`.
- Customer: name and phone matches while typing in New order (`slMatches`, `src/staff.js:2990`); a Possible duplicate customers screen with merge (`staff.crm.js:625`).
- **Not verified:** whether the order duplicate check runs on ordinary new orders as well as old-order entry. The call sits in `staff.old-orders.js`.

### 16. Responsive layout, shell, touch sizes and font tokens — Live

- Touch standard: `docs/touch-standard-2026-10-21.md` and `src/staff.touch.css` / `staff.touch-text.css`. Tablet body 20px, phone 18px, sizes taken as `max(old, token)`.
- Later "denser iPad" tokens arrived in `staff.ipad.js`, in line with Roneel's preference.
- Fixed shell on iPad since 27 Oct.
- Tests check for horizontal overflow (`test_ipad` at 1180×820, 1024×768, 820×1180; `test_flow`).

**Weakness — fragile cascade:**
- **5,327 `!important` declarations** in `src/`.
- Specificity hacks such as `:not(#fl0):not(#fl1):not(#fl2) body:not(#fl3) #cc-staff` to "beat the touch standard and polish".
- 39 files using MutationObserver to re-apply changes after renders.
- About 60 CSS/JS layers.

Each new layer must out-rank the last. This is the largest maintainability risk in the app.

### 17. Time display and time entry — Live

- `t12()` (`src/staff.js:18`) and `apFix()`. Time slots are chips labelled in 12-hour form.
- Internal comparisons use 24-hour values (correct).
- Database `times_ampm.sql`; emails use `FMHH12:MI AM`.
- There are no free-typed time inputs (there is no `type="time"` anywhere). Entry is by slot chip only.

### 18. Accessibility — Live (good)

- Focus returns when the sheet closes.
- `aria-modal` / `role="dialog"` (13 places), `aria-current`, `aria-pressed`, `aria-live` on calendar titles.
- The order calendar has a label on each day ("…, closed / past").
- Escape closes the menu and the photo viewer. Keyboard arrows work in the photo viewer.
- A focus-visible ring; `prefers-reduced-motion` in 24 files.
- Channel icons keep their word as a label.

**Not verified:** Escape on the order sheet; a focus trap inside sheets.

### 19. Performance, reliability and tests — mixed

**Size**
- Main bundle about **2.07 MB** minified (`e0a7470c8a`, 2,095,215 bytes), including the practice-mode data.
- Plus about 500 KB of unminified add-ons fetched one by one at runtime.
- Plus more than 10 footer CSS/JS files from raw.githubusercontent / jsDelivr.
- No build-time bundling of the add-ons.
- Each add-on fails safely (logs, and the app "works as before").

**CI**
- **None.** No `.github/`; `actions/runs` total_count = 0.

**Tests**
- About 76 Playwright and Python scripts in `test/` and `tests/`, run by hand. Release notes record pass counts (for example test_admin 122/122).
- The harness hard-codes `/home/claude/corner-cafe-cakes` and needs Playwright, so I did not run it.
- I ran the two offline tests: metrics 18/18 and the demand-rail contract PASS.

**Repository hygiene**
- `dist/` is 145 MB with 177 historical staff bundles.
- 96 branches.
- 20 "temporary Kazumi release transfer" commits on Corner Café branches; the Kazumi app was being released through this public repo.

**Data**
- The reference-photos bucket is not covered by backups (README).
- Point-in-time recovery is not confirmed.

### 20. Task continuity — Live (best in group)

- New-order draft in localStorage per login for 12 hours (`saveDraft` / `loadDraft`, `src/staff.js:2373`).
- "WIP" store for order changes, customer edits and handover notes (`wipPut` / `wipItems` / `resumeCard`, about lines 2397–2457). A resume card appears on Today.
- Discarding shows Undo for 10 seconds.
- Sign-out warns about unfinished work.
- Kitchen stage Undo (`kitStage`, about line 2141).
- Session expiry keeps the draft.
- `confirmDiscard` protects against losing typing in other screens.
- **Limit:** drafts live on one device only, never on the server.

### 21. Practice / training mode — Live

- `src/staff.practice.js`, `-practice-ui.js`, `-practice-guide.js`.
- A pretend day with the real menu (`src/practice/setup-20261021.json`).
- All server calls are answered on the device; real calls are blocked and counted.
- sessionStorage per tab, a gold frame, Start over and Exit, three guided tasks.
- Entry from the sign-in screen and the phone More menu.

### 22. Kitchen slips and handover — Live

- **Kitchen slip:** DL 110×220 mm (`docs/slip-dl-2026-10-20.md`).
  - Final 27 Oct layout (`build/staff_slip_photo.py`): photo beside Cake and Size, larger type, no short-notice tag. Print, PDF (`slip_pdf.js`, shared with the email) and kitchen email all use one layout.
  - Print status per order (`slipBox`, `slipPrinted`).
- **Kitchen screen:**
  - stages Plan → Prep → Bake → Baked → Decorate → To check → Ready
  - Ready needs a quality-check name
  - change-order acknowledgement (`kitchen_ack_amendment`)
  - assigning a staff member
  - Undo on stage moves
- **Handover:** `handoverView()` at `src/staff.js:666`.
  - Built from live orders by shift (morning before 11, afternoon before 4 PM, evening).
  - Notes the next person marks "taken over".
  - The draft note is kept (WIP).

## Five strongest features for other hubs to learn from

1. **Task continuity system** (§20): drafts plus a WIP store per login, a resume card, a 10-second Undo, a sign-out warning, and drafts kept on session expiry. This fully meets the group's "Intelligent Workflow Navigation & Task Continuity" standard.
2. **Permission-filtered, rule-based attention centre** (§9) feeding Today's "Act now": every order once, a reason given, red then amber, each line opens the record.
3. **One order sheet for every entry point** (§6): one `openOrder`, focus restore, back-gesture close, risky actions behind More options. Action parity comes from the structure, not from discipline.
4. **Practice mode** (§21): a real menu, a pretend day, network calls blocked and counted, guided tasks. This is ideal for untrained staff.
5. **Release discipline and safety**:
   - SRI-pinned bundles
   - before and after rollback footers for every release
   - read-back comparison with the live page
   - a protected-feature guard (Heartbeat) and contract test
   - add-ons that fail safely
   - optimistic locking with plain-language errors

## Weaknesses, inconsistencies and redundancy

- **`main` does not represent production.** About 125 commits of released work exist only on preview branches. The `central/` Vercel copy is six or more releases stale and has been deleted on the release line. The two must be reconciled before any switch-over.
- **The readable source is behind the live bundle.** `src/staff.js` was last changed on 20 Oct; the live bundle is patched minified code. Nobody can review or safely rebuild the core from source.
- **Override stacking**: 5,327 `!important`, ID-chain specificity hacks, 39 MutationObservers, about 60 layers. Today alone has five layers.
- **Fast iteration with little soak time**: 27 Oct had more than 12 live releases (loaders 15 to 35 and a bundle release), one of them rolled back within 4 minutes. Existing Today tests are knowingly out of date.
- **Short-notice change** (§3): staff short-notice orders now silently override the daily capacity limit, and the short-notice flag disappeared from slips.
- **No CI, a public repository**, 145 MB of historical `dist/`, 96 branches, and Kazumi release transfers committed here.
- **Overlapping or stale draft pull requests**:

  | Pull request | Recommendation |
  |---|---|
  | #20 shared navigation | Superseded by the live sidebar contract |
  | #24 Heartbeat | Dirty; superseded by Cake Pulse |
  | #37 analytics purpose | Own bundle on an old base |
  | #40 analytics cards | Overlaps the stage 2a/2b analytics work |
  | #41 Today CSS | Superseded by `staff.flow.js` Act now |
  | #3 settings doc | Superseded by the admin console |
  | #1 guest selection | Dirty |
  | #2 Meta events | Needs a decision |
  | #42 WhatsApp | The only substantive one remaining (WIP) |
  | #43 | Plan only |

  Also unreleased with no pull request: `fix/future-pickup-calendar-20261026`.
- **Missing:** a Help entry, account settings beyond the password, push notifications, a server-side draft, analytics drill-down and exports, a current schema snapshot.
- **Data window:** the orders list loads 45 days plus open orders (400 cap). Older orders need server search.

## Corner Café-unique features to protect

1. **Daily Cake Demand rail, Cake Heartbeat / Cake Pulse, Seasonal booking buildup and Booking curve** (`docs/HEARTBEAT_PROTECTED.md`; guard plus contract test).
2. **Paper/old-order backfill** with order date, paid-on date, possible-duplicate check, and corrections after handover with full from → to history.
3. **Deposits and balance flow**: Order completed is locked until the balance is paid; the 2% card surcharge; M-PAiSA; a manager is needed to cancel a paid order.
4. **Kitchen production stages** with a quality-check name, change-order acknowledgement, and the DL kitchen slip with photo (print, PDF and email share one layout).
5. **Counter tablet** with a no-phone receipt-number flow and a draft per login.
6. **Customer consent per channel and per number**, and delete with history preserved ("Deleted customer" holder).
7. **Shift handover**, Birthday Club, Seasonal and treat orders, and the Google Sheet backup mirror.
8. **Guided five-step staff order**, plain-word statuses and next steps, and practice mode.
