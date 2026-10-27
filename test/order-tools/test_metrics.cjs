// Shared analytics metric definitions (CCCakeMetrics, src/seasonal-demand-staging.js) and the Overview cards,
// checked against hand-made orders with known answers. No browser needed. Run: node test/order-tools/test_metrics.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '../../src/seasonal-demand-staging.js'), 'utf8');
const ins = fs.readFileSync(path.join(__dirname, '../../src/staff.analytics-insights.js'), 'utf8');
const g = { console, Intl, Date, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseInt, parseFloat };
g.window = g; g.globalThis = g; vm.createContext(g); vm.runInContext(src, g); vm.runInContext(ins, g);
const M = g.CCCakeMetrics;
let n = 0, fails = 0; const check = (s, v, d) => { if (v) { n++; console.log('PASS ' + s); } else { fails++; console.log('FAIL ' + s + (d !== undefined ? ' -> ' + JSON.stringify(d) : '')); } };

// orders in the register payload shape: st status, cp completion, pd pickup, od booked, odok verified, c customer, cv/lv value, ref refunds
const T = '2026-10-27';
const O = (o) => Object.assign({ st: 'completed', cp: 'recorded', pd: '2026-10-20', od: '2026-10-18', odok: true, c: '6799990001', cv: 100, lv: 100, ref: 0, it: [['Cheesecake', 'Cheesecake', 8, 1, 100]] }, o);

check('completed sale: recorded or assumed counts; pending, cancelled and declined do not',
  M.isSale(O({})) && M.isSale(O({ cp: 'assumed', st: 'received' })) && !M.isSale(O({ cp: 'pending', st: 'confirmed' })) && !M.isSale(O({ st: 'cancelled' })) && !M.isSale(O({ st: 'declined' })));
check('order value: final total else estimate, minus refunds', M.value(O({ cv: 120, lv: 90, ref: 20 })) === 100 && M.value(O({ cv: null, lv: 90 })) === 90);
check('order value: $0 or missing is "not priced" (null), never a $0 sale', M.value(O({ cv: 0, lv: 0 })) === null && M.value(O({ cv: null, lv: null })) === null);
check('median ignores one extreme value', M.median([1, 2, 2, 3, 338]) === 2 && M.median([2, 4]) === 3 && M.median([]) === null);
check('lead time: 0–180 days only (a booking 338 days ahead is left out)', M.leadDays(O({ od: '2026-10-18', pd: '2026-10-20' }), T) === 2 && M.leadDays(O({ od: '2025-11-20', pd: '2026-10-24' }), T) === null);
check('lead time: unverified booking dates are left out', M.leadDays(O({ odok: false }), T) === null);
check('money: dollars, no cents, thousands separated', M.money(1206.4) === '$1,206' && M.money(0) === '$0');
check('launch date is 13 October 2026 (same as the tabs)', M.launch === '2026-10-13');

// Overview cards: build them on a tiny dashboard and read the numbers back
const orders = [
  O({ c: 'A001', pd: '2026-10-20', od: '2026-10-18' }),                                     // completed in window, booked 2 days ahead
  O({ c: 'A001', pd: '2026-09-01', od: '2026-08-30' }),                                     // A001 ordered before the window → returning
  O({ c: 'B002', pd: '2026-10-22', od: '2026-10-21', cp: 'assumed', st: 'received' }),      // old-sheet style completion counts as completed
  O({ c: 'C003', pd: '2026-10-25', od: '2025-11-20' }),                                     // booked 339 days ahead: counted, left out of lead time
  O({ c: 'D004', pd: '2026-10-05', od: '2026-10-01' }),                                     // before launch: not in the number cards
  O({ c: 'E005', pd: '2026-11-03', od: '2026-10-26', st: 'confirmed', cp: 'pending', cv: 150, lv: 150, ref: 30 }), // upcoming confirmed, $120 after refund
  O({ c: 'F006', pd: '2026-11-05', od: '2026-10-26', st: 'confirmed', cp: 'pending', cv: 0, lv: 0 }),             // upcoming confirmed, not priced
  O({ c: 'G007', pd: '2026-10-21', od: '2026-10-19', st: 'cancelled', cp: 'pending' })     // cancelled: never counted
];
// minimal DOM for mgrBuild
function el(tag) { return { tagName: tag, className: '', children: [], innerHTML: '', classList: { add() {} }, setAttribute() {}, parentNode: null, insertBefore(a) { this.children.push(a); }, remove() {} }; }
const doc = { createElement: el };
const kpis = el('div'), panels = el('div'), parent = el('div'); kpis.parentNode = parent; panels.parentNode = parent;
const main = el('div'); main.querySelector = (s) => s === '.hb-k-kpis' ? kpis : s === '.hb-k-panels' ? panels : null;
const host = { ownerDocument: doc, querySelector: (s) => s === '.hb-v2' ? main : null };
// mgrBuild is internal; reach it through mount's last step by calling the snapshot via a small shim
const shim = src.replace("global.CCCakeSeasonalStage={", "global.__mgrSnapshot=mgrSnapshot;global.__mgrBuild=mgrBuild;global.CCCakeSeasonalStage={");
const g2 = { console, Intl, Date, Math, JSON, Number, String, Array, Object, isFinite, isNaN, parseInt, parseFloat }; g2.window = g2; g2.globalThis = g2; vm.createContext(g2); vm.runInContext(shim, g2);
const snap = g2.__mgrSnapshot(orders, T, 30);
check('Completed orders: since launch, recorded + assumed, cancelled and pre-launch left out (3)', snap.completed.length === 3, snap.completed.map(o => o.c));
check('Orders received (booked in the last 30 days, pickup since launch): 4 — C003 was booked last year', snap.recent.length === 4, snap.recent.map(o => o.c));
check('Returning customers: only A001 had ordered before the window (1 of 4)', snap.returning === 1 && snap.unique === 4, { returning: snap.returning, unique: snap.unique });
check('Ordered ahead: median of 1, 2, 8, 10 days = 5', snap.medLead === 5, snap.medLead);
check('Confirmed order value: $120 after refund; 1 of 2 priced', snap.knownValue === 120 && snap.priced === 1 && snap.confirmed.length === 2, snap);
check('window reaching before the launch is labelled "since launch"', snap.sinceLaunch === true);
g2.__mgrBuild(host, orders, T);
const cardsHtml = (parent.children[0] || {}).innerHTML || '';
check('cards show dollars (no "FJD"), "not priced yet", "had ordered before" and "median"', /\$120/.test(cardsHtml) && !/FJD/.test(cardsHtml) && /1 not priced yet/.test(cardsHtml) && /had ordered before/.test(cardsHtml) && /median/.test(cardsHtml), cardsHtml.slice(0, 400));

// Today's insights use the same definitions
const res = g.CCCakeInsights.analyse(orders, T, {});
const lead = res.find(x => x.id === 'lead'), unpriced = res.find(x => x.id === 'unpriced');
check('insights: unpriced confirmed order is reported (F006 at $0)', !!unpriced && unpriced.big === '1', unpriced);
check('insights: lead time wording says median (shown only with 8+ orders)', !lead || /median/.test(lead.title), lead);

console.log(n + ' passed, ' + fails + ' failed'); process.exit(fails ? 1 : 0);
