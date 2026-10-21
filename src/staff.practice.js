/* Corner Café Service Hub: practice mode (21 October 2026). Roneel: "build a practice mode like you did for kazumi".
 *
 * New staff practise the counter's daily jobs on a pretend café day, as a Counter login. Safety: in practice mode the
 * app never connects to the real system. Every server call is answered on this device from the pretend day, so no
 * order, payment, customer, email, kitchen slip, backup sheet or Analytics figure can change, and any attempt to reach
 * the real system is blocked and counted (CCPractice.blocked). Settings the app keeps on the device (remembered names,
 * drafts) are kept apart while practising and dropped afterwards; the real sign-in is never read or used.
 * Practice lives in this browser tab only (sessionStorage "ccs_practice"): Exit practice, Sign out or closing the tab
 * ends it; Start over resets the day.
 *
 * The pretend day: the staff app's test data (test/mock.js) with invented names, the real menu, prices and delivery
 * areas (src/practice/setup-20261021.json), a Counter login, the Birthday Club on, a few more orders for today, and the
 * daily jobs answered as the real system does: new and old orders, the duplicate check, customer search, payments,
 * confirming, handing over, Change order and Correct this order, the kitchen board and its stages.
 *
 * build/staff_practice.py puts this first in the staff app bundle (it must run before the app starts) and fills in
 * ccPracticeData (the pretend day) and PRACTICE_SETUP (the menu).
 */
(function (global) {
  'use strict';
  var FLAG = 'ccs_practice', VERSION = '2026-10-21-practice-v1';
  function store() { try { return global.sessionStorage; } catch (e) { return null; } }
  function isOn() { var s = store(); try { return !!s && s.getItem(FLAG) === '1'; } catch (e) { return false; } }
  // Start, restart or end practice (this tab only), then load the app again
  function go(on) {
    var s = store();
    try { if (s) { s.clear(); if (on) s.setItem(FLAG, '1'); } } catch (e) {}
    try { global.location.reload(); } catch (e) {}
  }
  var api = global.CCPractice = { version: VERSION, on: isOn(), go: go, blocked: 0, log: [] };
  if (!api.on) return;
  var doc = global.document;
  try { doc.documentElement.classList.add('ccp-on'); } catch (e) {}

  // ---------- 1. No connection to the real system ----------
  // The page footer's guard (src/staff.practice-guard.html) does this first, before anything else on the page loads; this
  // is the same guard for a page without it.
  var G = global.__ccsPracticeGuard;
  if (!G) {
    G = global.__ccsPracticeGuard = { blocked: 0, log: [] };
    var real = function (u) { u = String(u || ''); return /supabase\.(co|in)\b/i.test(u) || /\/(rest|auth|storage|realtime|functions)\/v1\//i.test(u); };
    var stop = function (u) { G.blocked++; G.log.push(String(u || '').slice(0, 160)); };
    var F = global.fetch;
    if (F) global.fetch = function (input) {
      var u = typeof input === 'string' ? input : input && input.url;
      if (real(u)) { stop(u); return Promise.reject(new TypeError('Practice mode: no connection to the real system')); }
      return F.apply(this, arguments);
    };
    var X = global.XMLHttpRequest && global.XMLHttpRequest.prototype, XO = X && X.open;
    if (XO) X.open = function (m, u) { if (real(u)) { stop(u); throw new Error('Practice mode: no connection to the real system'); } return XO.apply(this, arguments); };
    var WS = global.WebSocket;
    if (WS) {
      var PW = function (u, p) { if (real(u)) { stop(u); throw new Error('Practice mode: no connection to the real system'); } return p === undefined ? new WS(u) : new WS(u, p); };
      PW.prototype = WS.prototype; ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { PW[k] = WS[k]; });
      global.WebSocket = PW;
    }
    var NAV = global.navigator, SB = NAV && NAV.sendBeacon;
    if (SB) NAV.sendBeacon = function (u) { if (real(u)) { stop(u); return false; } return SB.apply(NAV, arguments); };
  }
  try { Object.defineProperty(api, 'blocked', { get: function () { return G.blocked; } }); } catch (e) {}
  api.log = G.log;

  // ---------- 2. The device's saved settings stay apart ----------
  // Reads see the device's settings; anything practice saves stays in this tab and is gone when practice ends. The
  // real sign-in (cc-cakes-staff) is hidden from practice.
  (function () {
    var LS; try { LS = global.localStorage; } catch (e) { return; }
    if (!LS || !global.Storage) return;
    var P = global.Storage.prototype, g = P.getItem, s = P.setItem, r = P.removeItem, c = P.clear, k = P.key;
    var L = Object.getOwnPropertyDescriptor(P, 'length'), mem = Object.create(null), gone = Object.create(null), HIDE = { 'cc-cakes-staff': 1 };
    function realKeys() { var out = [], n = L && L.get ? L.get.call(LS) : 0; for (var i = 0; i < n; i++) out.push(k.call(LS, i)); return out; }
    function keys() { var out = realKeys().filter(function (x) { return !(x in gone) && !(x in mem) && !HIDE[x]; }); for (var x in mem) out.push(x); return out; }
    P.getItem = function (key) { if (this !== LS) return g.apply(this, arguments); key = String(key); if (key in mem) return mem[key]; if (key in gone || HIDE[key]) return null; return g.call(LS, key); };
    P.setItem = function (key, v) { if (this !== LS) return s.apply(this, arguments); key = String(key); mem[key] = String(v); delete gone[key]; };
    P.removeItem = function (key) { if (this !== LS) return r.apply(this, arguments); key = String(key); delete mem[key]; gone[key] = 1; };
    P.clear = function () { if (this !== LS) return c.apply(this, arguments); realKeys().forEach(function (x) { gone[x] = 1; }); mem = Object.create(null); };
    P.key = function (i) { if (this !== LS) return k.apply(this, arguments); var a = keys(); return i in a ? a[i] : null; };
    try { if (L && L.configurable) Object.defineProperty(P, 'length', { configurable: true, enumerable: L.enumerable, get: function () { return this === LS ? keys().length : L.get.call(this); } }); } catch (e) {}
    api.kept = function () { return Object.keys(mem); };
  })();

  // ---------- 3. Nothing is printed ----------
  global.print = function () {
    var a = global.__ccsOf;
    try { if (a && a.toast) a.toast('Practice mode: nothing is printed. In the real app this prints.'); } catch (e) {}
    try { doc.body.classList.remove('ccs-printing'); } catch (e) {}
  };

  // ---------- 4. The pretend day ----------
  // A Counter login, exactly as the café's Counter level is set up (21 October 2026)
  global.__role = 'front_of_house'; global.__grants = ['front_of_house']; global.__permv = 2; global.__levelName = 'Counter';
  global.__perms = ['cust.view', 'cust.create', 'cust.edit', 'cust.consent', 'cust.history', 'cust.followup', 'ord.view', 'ord.history', 'ord.create',
    'ord.edit', 'ord.status', 'ord.comms', 'ord.payments', 'kit.view', 'kit.status', 'kit.print'];
  global.__bc = {}; global.__reqOrders = true; global.__oldOrders = true;              // Birthday Club on (as live); custom cakes; an old order
  try { ccPracticeData(); } catch (e) { console.error('[Practice] the pretend day did not load', e); }
  var M = global.__ccsMock, PX = global.__ccsPx;
  if (!M || !PX) {                                        // never fall through to the real system
    global.__ccsMock = { auth: { getSession: function () { return Promise.resolve({ data: { session: null } }); }, signOut: function () { go(false); return Promise.resolve({}); } },
      rpc: function () { return Promise.resolve({ error: { message: 'Practice mode could not start' } }); }, from: function () { return { select: function () { return this; }, then: function (ok) { return Promise.resolve({ error: { message: 'Practice mode could not start' } }).then(ok); } }; } };
    global.supabase = { createClient: function () { return global.__ccsMock; } };
    return;
  }
  // Whatever asks for a connection gets the pretend day
  global.supabase = { createClient: function () { return M; } };
  if (M.auth) M.auth.signOut = function () { go(false); return Promise.resolve({ error: null }); };

  var T = PX.T, add = PX.add, orders = PX.orders, summary = PX.summary, prof = PX.prof, setup = PX.setup;
  var NOW = function () { return new Date().toISOString(); };
  var ME = 'Practice staff';
  // The real menu, prices, delivery areas and hours
  (function () {
    var S = PRACTICE_SETUP;
    Object.keys(S).forEach(function (k) { if (k !== '_note') setup[k] = JSON.parse(JSON.stringify(S[k])); });
    setup.location.today = T;
  })();
  function money(n) { n = Number(n || 0); return Math.round(n * 100) / 100; }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function key(p) { var d = String(p || '').replace(/\D/g, ''); return d.length === 7 ? '679' + d : d; }
  function byId(id) { return orders.filter(function (o) { return o.id === id; })[0] || null; }
  function prodBy(code) { return (setup.products || []).filter(function (p) { return p.code === code; })[0] || null; }
  function prodByName(n) { return (setup.products || []).filter(function (p) { return p.name === n; })[0] || null; }
  function paid(o) { return (o.payments || []).reduce(function (s, p) { return s + (p.kind === 'refund' ? -1 : 1) * Number(p.amount || 0); }, 0); }
  function total(o) { return Number(o.final_total != null ? o.final_total : o.estimate_total || 0); }
  function evId() { api.ev = (api.ev || 5000) + 1; return api.ev; }
  function log(o, kind, detail, by) { (o.order_events = o.order_events || []).push({ id: evId(), at: NOW(), kind: kind, actor_label: by || ME, detail: detail || {} }); }
  function payStatus(o) { var p = paid(o), t = total(o); o.payment_status = p <= 0 ? 'unpaid' : p >= t - 0.005 ? 'paid' : 'deposit_paid'; }
  function fmtD(iso) { return iso ? new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(/,/g, '') : 'None'; }
  function fmtT(t) { if (!t) return ''; var a = String(t).slice(0, 5).split(':').map(Number); return (a[0] % 12 || 12) + ':' + String(a[1]).padStart(2, '0') + (a[0] < 12 ? ' AM' : ' PM'); }
  function fjd(n) { return 'FJD ' + money(n).toFixed(2); }
  function no(msg, field, err) { return { ok: false, error: err || field || 'practice', field: field || null, message: msg }; }
  function shapeOrder(o) {                                // every order carries what the screens expect
    o.is_test = false; o.version = o.version || 1; o.revision = o.revision || 0;
    o.order_events = o.order_events || []; o.payments = o.payments || []; o.order_attachments = o.order_attachments || []; o.order_amendments = o.order_amendments || [];
    o.order_items = o.order_items || [{}]; o.fulfilment_method = o.fulfilment_method || 'collection'; o.delivery_fee = o.delivery_fee || 0;
    o.production_status = o.production_status || 'not_started'; o.brief_version = o.brief_version || 0;
    if (o.customers) { o.contact_name = o.contact_name || o.customers.full_name; o.contact_phone = o.contact_phone || o.customers.phone; o.contact_phone_key = key(o.contact_phone); }
    return o;
  }

  // ---------- 5. A fuller day: more cakes for today, one waiting for its deposit ----------
  (function () {
    if (PX.older && !byId(PX.older.id)) orders.push(Object.assign({ order_events: [], payments: [{ id: 'po6', kind: 'full', method: 'cash', amount: 70, recorded_at: PX.older.required_date + 'T03:00:00Z' }] }, PX.older));
    var nextNo = 120;
    function person(id, name, phone, extra) {
      if (!prof[id]) prof[id] = Object.assign({ id: id, customer_no: ++nextNo, full_name: name, phone: phone, alt_phone: null, email: null, preferred_contact: 'whatsapp', is_corporate: false, company: null, delivery_address: null, birth_day: null, birth_month: null, preferences: null, notes: null, version: 1, review_flag: null, review_note: null, archived_at: null }, extra || {});
      if (!summary.some(function (x) { return x.id === id; })) summary.push({ id: id, full_name: name, phone: phone, customer_no: prof[id].customer_no, orders_count: 1, completed_count: 0, completed_spend: 0, cancelled_count: 0, last_order_at: NOW(), favourite_cake: null, occasions: [], marketing_opt_in: false, first_source: 'walk_in' });
      return { full_name: name, phone: phone, email: (extra && extra.email) || null };
    }
    function item(code, variant, inch, qty, extra) {
      var p = prodBy(code), sz = p && p.sizes.filter(function (s) { return s.inch === inch; })[0];
      return Object.assign({ product_name: p ? p.name : code, variant: variant || null, size_inch: inch, quantity: qty || 1, unit_price: sz ? sz.price : 0, serves_label: sz ? sz.serves : null, finish: 'standard' }, extra || {});
    }
    var ago = new Date(Date.now() - 2 * 864e5).toISOString();
    orders.push(
      { id: 'p1', reference: 'CC-1040', order_status: 'awaiting_deposit', payment_status: 'unpaid', production_status: 'not_started', order_type: 'standard', source: 'phone', created_at: ago, required_date: add(3), required_time: '12:00:00',
        estimate_total: 83, final_total: 83, deposit_required: 40, has_dietary: false, customer_id: 'c21', customers: person('c21', 'Litia Vosa', '912 0021'),
        order_items: [item('black-white-forest', 'Black Forest', 10, 1, { occasion: 'Anniversary', cake_message: 'Happy 25th Anniversary' })],
        order_events: [{ id: 4001, at: ago, kind: 'created', actor_label: 'Mere', detail: { source: 'phone', status: 'awaiting_review' } }, { id: 4002, at: ago, kind: 'awaiting_deposit', actor_label: 'Mere', detail: { final_total: 83, deposit_required: 40, at_counter: true } }] },
      { id: 'p2', reference: 'CC-1041', order_status: 'confirmed', payment_status: 'paid', production_status: 'ready', qc_by: 'Josefa', ready_at: NOW(), brief_version: 1, order_type: 'standard', source: 'walk_in', created_at: ago, required_date: T, required_time: '11:00:00',
        estimate_total: 52, final_total: 52, has_dietary: false, customer_id: 'c22', customers: person('c22', 'Kiran Lal', '912 0022'),
        order_items: [item('strawberry', null, 8, 1, { occasion: 'Birthday', cake_message: 'Happy Birthday Riya', candles: 'Number 6 candle' })],
        payments: [{ id: 'pp2', kind: 'full', method: 'eftpos', amount: 52, recorded_at: ago }],
        order_events: [{ id: 4003, at: ago, kind: 'created', actor_label: 'Mere', detail: { source: 'walk_in', status: 'confirmed' } }, { id: 4004, at: ago, kind: 'payment_recorded', actor_label: 'Mere', detail: { kind: 'full', method: 'eftpos', amount: 52, paid_total: 52 } }] },
      { id: 'p3', reference: 'CC-1042', order_status: 'confirmed', payment_status: 'unpaid', production_status: 'decorating', brief_version: 1, kitchen_assignee: 'Josefa', order_type: 'standard', source: 'whatsapp', created_at: ago, required_date: T, required_time: '16:00:00',
        estimate_total: 38, final_total: 38, has_dietary: false, customer_id: 'c23', customers: person('c23', 'Vika Raturaga', '912 0023'),
        order_items: [item('vanilla-pina-colada', 'Piña Colada', 6, 1, { occasion: 'Graduation', cake_message: 'Well done Vika' })],
        order_events: [{ id: 4005, at: ago, kind: 'created', actor_label: 'Mere', detail: { source: 'whatsapp', status: 'confirmed' } }] },
      { id: 'p4', reference: 'CC-1043', order_status: 'confirmed', payment_status: 'deposit_paid', production_status: 'not_started', brief_version: 1, order_type: 'standard', source: 'walk_in', created_at: ago, required_date: add(1), required_time: '10:00:00',
        estimate_total: 52, final_total: 52, has_dietary: true, customer_id: 'c24', customers: person('c24', 'Sera Lomani', '912 0024'),
        order_items: [item('red-velvet', null, 8, 1, { occasion: 'Birthday', cake_message: 'Happy 40th Sera', dietary: ['Nut allergy'], dietary_note: 'No nuts anywhere: severe allergy', requirements: ['eggless'] })],
        payments: [{ id: 'pp4', kind: 'deposit', method: 'cash', amount: 25, recorded_at: ago }],
        order_events: [{ id: 4006, at: ago, kind: 'created', actor_label: 'Mere', detail: { source: 'walk_in', status: 'confirmed' } }, { id: 4007, at: ago, kind: 'payment_recorded', actor_label: 'Mere', detail: { kind: 'deposit', method: 'cash', amount: 25, paid_total: 25 } }] }
    );
    orders.forEach(shapeOrder);
  })();

  // ---------- 6. The daily jobs, answered as the real system does ----------
  var H = {};
  function cust(p) {                                       // the customer of a new order: a profile, or a new one
    if (p.customer_id && prof[p.customer_id]) { var c = prof[p.customer_id]; return { id: c.id, full_name: c.full_name, phone: c.phone, email: (p.customer && p.customer.email) || c.email || null }; }
    var q = p.customer || {}, name = String(q.name || '').trim(), phone = String(q.phone || '').trim();
    if (name.length < 2) return no('Enter a name for the order.', 'name');
    if (!/^[0-9]{7,15}$/.test(key(phone))) return no('Enter a mobile number, for example 912 3456.', 'phone');
    var same = summary.filter(function (x) { return key(x.phone) === key(phone) && String(x.full_name).toLowerCase() === name.toLowerCase(); })[0];
    if (same) return { id: same.id, full_name: same.full_name, phone: same.phone, email: q.email || null };
    var id = 'c' + (100 + summary.length + Object.keys(prof).length), no_ = 200 + summary.length;
    prof[id] = { id: id, customer_no: no_, full_name: name, phone: phone, alt_phone: null, email: q.email || null, preferred_contact: q.whatsapp === false ? 'phone' : 'whatsapp', is_corporate: false, company: null, delivery_address: null, birth_day: null, birth_month: null, preferences: null, notes: null, version: 1, review_flag: null, review_note: null, archived_at: null };
    summary.push({ id: id, full_name: name, phone: phone, email: q.email || null, customer_no: no_, orders_count: 0, completed_count: 0, completed_spend: 0, cancelled_count: 0, last_order_at: null, favourite_cake: null, occasions: [], marketing_opt_in: !!q.opt_in, first_source: 'walk_in' });
    return { id: id, full_name: name, phone: phone, email: q.email || null };
  }
  function nextRef() { api.ref = (api.ref || 2000) + 1; return { id: 'n' + api.ref, reference: 'CC-' + api.ref }; }
  function makeOrder(p) {
    var req = p.product_code === 'custom-cake', prod = req ? null : prodBy(p.product_code), qty = Math.max(1, Number(p.quantity) || 1), size = null;
    if (!req) {
      if (!prod) return no('Choose a cake from the menu.', 'product');
      size = prod.sizes.filter(function (s) { return s.inch === Number(p.size_inch); })[0];
      if (!size) return no('That size is not offered for ' + prod.name + '.', 'size');
      if (prod.variants.length && prod.variants.indexOf(p.variant) < 0) return no('Choose one: ' + prod.variants.join(', ') + '.', 'variant');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) return no('Choose the date.', 'date');
    if (p.date < '2015-01-01') return no('Check the year of the pickup date.', 'date');
    if (!/^\d{2}:\d{2}/.test(p.time || '')) return no('Choose the time.', 'time');
    var c = cust(p); if (c.ok === false) return c;
    var price = req ? (p.price != null ? money(p.price) : null) : money(size.price * qty);
    var dl = p.delivery && p.delivery.method === 'delivery' ? p.delivery : null, fee = 0;
    if (dl) { var z = (setup.delivery_zones || []).filter(function (x) { return x.name === dl.zone; })[0]; if (!z) return no('Choose a delivery area.', 'zone'); fee = money(z.fee != null ? z.fee : Number(dl.fee) || 0); }
    var est = money((price || 0) + fee), ids = nextRef(), finish = req ? 'custom' : (p.finish === 'custom' ? 'custom' : 'standard');
    var o = shapeOrder({ id: ids.id, reference: ids.reference, idempotency_key: p.idempotency_key || null, order_status: req ? (price != null ? 'awaiting_approval' : 'awaiting_quote') : finish === 'custom' ? 'awaiting_quote' : 'awaiting_review',
      payment_status: 'unpaid', production_status: 'not_started', order_type: finish, source: p.source || 'walk_in', created_at: NOW(), required_date: p.date, required_time: String(p.time).slice(0, 5) + ':00',
      estimate_total: est, final_total: req && price != null ? est : null, deposit_required: null, has_dietary: p.has_dietary === 'yes' || p.has_dietary === true, customer_notes: (p.notes || '').trim() || null,
      rush_override: !!(p.rush && p.rush.reason), rush_reason: p.rush ? p.rush.reason : null, rush_approved_by: p.rush ? p.rush.approved_by : null,
      fulfilment_method: dl ? 'delivery' : 'collection', delivery_zone: dl ? dl.zone : null, delivery_address: dl ? dl.address : null, delivery_fee: fee, delivery_contact: dl ? dl.contact || null : null,
      customer_id: c.id, customers: { full_name: c.full_name, phone: c.phone, email: c.email }, contact_name: c.full_name, contact_phone: c.phone, contact_email: c.email || null, marketing_opt_in: !!(p.customer && p.customer.opt_in),
      occasion_for: p.occasion_for || null, occasion_date: p.occasion_date || null,
      order_items: [{ product_id: req ? null : prod.code, product_name: req ? 'Custom cake' : prod.name, variant: p.variant || null, size_inch: req ? null : size.inch, serves_label: req ? (p.size_note || null) : size.serves,
        unit_price: req ? (price != null ? money(price / qty) : 0) : size.price, quantity: qty, finish: finish, design_description: (p.design || '').trim() || null, cake_message: (p.message || '').trim() || null,
        candles: (p.candles || '').trim() || null, occasion: p.occasion || null, dietary: p.has_dietary === 'yes' ? (p.dietary || []) : [], dietary_note: p.has_dietary === 'yes' ? (p.dietary_note || null) : null, requirements: [], requirements_note: null }] });
    log(o, 'created', { source: o.source, status: o.order_status, estimate: est });
    if (o.rush_override) log(o, 'rush_approved', { reason: o.rush_reason, approved_by: o.rush_approved_by });
    return o;
  }
  function countCustomer(o) { var s = summary.filter(function (x) { return x.id === o.customer_id; })[0]; if (s) { s.orders_count = (s.orders_count || 0) + 1; s.last_order_at = NOW(); } }
  H.staff_create_order = function (a) {
    var p = a.p || {};
    var seen = p.idempotency_key && orders.filter(function (o) { return o.idempotency_key === p.idempotency_key; })[0];
    if (seen) return { ok: true, duplicate: true, order_id: seen.id, reference: seen.reference, status: seen.order_status };
    var o = makeOrder(p); if (o.ok === false) return o;
    if (p.confirm_now && o.order_type === 'standard') {
      var dep = p.deposit_required ? money(p.deposit_required) : null;
      o.final_total = o.estimate_total; o.deposit_required = dep; o.order_status = dep ? 'awaiting_deposit' : 'confirmed'; o.confirmed_at = NOW();
      log(o, dep ? 'awaiting_deposit' : 'confirmed', { final_total: o.final_total, deposit_required: dep, at_counter: true });
    }
    if (p.payment && Number(p.payment.amount) > 0) {
      var amt = money(p.payment.amount);
      o.payments.push({ id: 'pay' + evId(), kind: p.payment.kind || 'deposit', method: p.payment.method || 'cash', amount: amt, recorded_at: NOW(), note: null });
      payStatus(o);
      log(o, 'payment_recorded', { kind: p.payment.kind || 'deposit', method: p.payment.method || 'cash', amount: amt, paid_total: paid(o) });
      if (o.order_status === 'awaiting_deposit' && paid(o) >= Number(o.deposit_required || 0)) { o.order_status = 'confirmed'; log(o, 'confirmed', { final_total: o.final_total, note: 'Deposit received' }); }
    }
    orders.push(o); countCustomer(o);
    return { ok: true, order_id: o.id, reference: o.reference, status: o.order_status, estimate: o.estimate_total, customer_id: o.customer_id, lead_days: 2 };
  };
  H.staff_enter_old_order = function (a) {
    var p = a.p || {}, old = p.old || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) return no('Choose the pickup date from the slip.', 'date');
    if (p.date < '2015-01-01') return no('Check the year of the pickup date.', 'date');
    if (p.date >= T) return no('Old orders are for cakes picked up before today. For today or a later date, use New order and choose the slip date under When did they order.', 'date');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(old.taken_on || '')) return no('Choose the date on the slip (the day they ordered).', 'taken');
    if (old.taken_on < '2015-01-01') return no('Check the year of the order date.', 'taken');
    if (old.taken_on > p.date) return no('The order date must be on or before the pickup date.', 'taken');
    if (['full', 'part', 'none'].indexOf(old.paid) < 0) return no('Choose whether it was paid.', 'payment');
    if (old.paid !== 'none') {
      if (['cash', 'eftpos', 'bank_transfer', 'mpaisa', 'other'].indexOf(old.method) < 0) return no('Choose how they paid.', 'payment');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(old.paid_on || '')) return no('Choose the day they paid.', 'paid_on');
      if (old.paid_on < old.taken_on || old.paid_on > T) return no('The day they paid must be between the order date and today.', 'paid_on');
    }
    var seen = p.idempotency_key && orders.filter(function (o) { return o.idempotency_key === p.idempotency_key; })[0];
    if (seen) return { ok: true, duplicate: true, old: true, order_id: seen.id, reference: seen.reference, status: seen.order_status };
    var o = makeOrder(Object.assign({}, p, { payment: null, rush: null, confirm_now: false })); if (o.ok === false) return o;
    if (o.order_type === 'custom' && o.final_total == null) {
      var sp = Number(old.price); if (!(sp > 0)) return no('Enter the cake price from the slip.', 'price', 'old_order');
      o.final_total = o.estimate_total = money(sp + Number(o.delivery_fee || 0)); o.order_items[0].unit_price = money(sp / o.order_items[0].quantity);
      log(o, 'quoted', { price: money(sp), total: o.final_total });
    }
    var tot = total(o);
    if (!(tot > 0)) return no('Enter the price from the slip.', 'price', 'old_order');
    var pick = p.date + 'T' + o.required_time.slice(0, 5) + ':00+12:00', taken = old.taken_on + 'T12:00:00+12:00';
    if (old.taken_on < T) { o.taken_at = taken; log(o, 'taken_earlier', { at: new Date(taken).toISOString(), text: fmtD(old.taken_on) + ', 12:00 PM' }); }
    if (old.taken_by) { o.taken_by_name = old.taken_by; log(o, 'taken_by', { name: old.taken_by, login: ME, was: null }); }
    o.order_status = 'confirmed'; o.final_total = tot; o.confirmed_at = new Date(taken).toISOString(); log(o, 'confirmed', { final_total: tot, note: 'Old order from a paper slip' });
    var amt = null;
    if (old.paid !== 'none') {
      amt = old.paid === 'full' ? tot : money(old.amount);
      if (!(amt > 0)) return no('Enter the amount they paid.', 'payment', 'old_order');
      if (amt > tot) return no('That is more than the price. Choose Paid in full.', 'payment', 'old_order');
      var kind = amt >= tot ? 'full' : 'deposit';
      o.payments.push({ id: 'pay' + evId(), kind: kind, method: old.method, amount: amt, recorded_at: new Date(old.paid_on + 'T12:00:00+12:00').toISOString(), note: 'Old order from a paper slip: paid on ' + fmtD(old.paid_on) });
      payStatus(o); log(o, 'payment_recorded', { kind: kind, method: old.method, amount: amt, paid_total: amt, paid_on: old.paid_on });
    }
    o.order_status = 'completed'; o.fulfilment_status = o.fulfilment_method === 'delivery' ? 'delivered' : 'collected'; o.production_status = 'ready';
    o.ready_at = o.handed_over_at = o.completed_at = new Date(pick).toISOString(); o.handover_to = o.contact_name; o.hold_thanks = true;
    log(o, 'collected', { method: o.fulfilment_method, to: o.contact_name, on: p.date });
    log(o, 'entered_later', { taken_on: old.taken_on, pickup: p.date, paid: old.paid, paid_on: old.paid === 'none' ? null : old.paid_on, amount: amt, taken_by: old.taken_by || null });
    orders.push(o); countCustomer(o);
    return { ok: true, old: true, order_id: o.id, reference: o.reference, status: 'completed', pickup: p.date, taken_on: old.taken_on, paid: amt || 0, total: tot, paid_on: old.paid === 'none' ? null : old.paid_on };
  };
  H.order_possible_duplicates = function (a) {
    var p = a.p || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) return [];
    var ck = key((p.customer && p.customer.phone) || p.phone || ''), cid = p.customer_id || null, wide = !!p.wide, prod = p.product_code ? prodBy(p.product_code) : null;
    if (!cid && !ck) return [];
    var d0 = Date.parse(p.date + 'T12:00:00Z');
    return orders.filter(function (o) {
      if (o.is_test || ['declined', 'cancelled'].indexOf(o.order_status) > -1) return false;
      if (!((cid && o.customer_id === cid) || (ck && key(o.contact_phone || (o.customers || {}).phone) === ck))) return false;
      var gap = Math.abs(Date.parse(o.required_date + 'T12:00:00Z') - d0) / 864e5, it = o.order_items[0] || {};
      return gap <= 2 || (wide && gap <= 31 && prod && it.product_name === prod.name && Number(it.size_inch || 0) === Number(p.size_inch || 0));
    }).sort(function (x, y) { return Math.abs(Date.parse(x.required_date) - d0) - Math.abs(Date.parse(y.required_date) - d0); }).slice(0, 3).map(function (o) {
      var it = o.order_items[0] || {};
      return { id: o.id, reference: o.reference, date: o.required_date, time: o.required_time, cake: it.variant || it.product_name, size: it.size_inch, total: total(o), status: o.order_status, name: o.contact_name };
    });
  };
  H.staff_search_customers = function (a) {
    var q = String(a.q || '').trim().toLowerCase(), d = q.replace(/\D/g, '');
    return summary.filter(function (x) {
      return (d.length >= 3 && String(x.phone || '').replace(/\D/g, '').indexOf(d) > -1) || (/[a-z]/.test(q) && q.length >= 2 && String(x.full_name || '').toLowerCase().indexOf(q) > -1);
    }).slice(0, 8).map(function (x) { var c = prof[x.id] || {}; return Object.assign({ birth_day: c.birth_day || null, birth_month: c.birth_month || null, archived_at: null, merged_into: null, email: c.email || null }, x); });
  };
  H.order_set_taken = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    var at = new Date(a.p_at); if (isNaN(at)) return no('Check the order date.');
    if (at.toISOString() < '2015-01-01') return { ok: false, message: 'Check the year of the order date.' };
    o.taken_at = at.toISOString();
    var d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Fiji' }).format(at);
    log(o, 'taken_earlier', { at: o.taken_at, text: fmtD(d) + ', 12:00 PM' });
    return { ok: true };
  };
  H.order_set_requirements = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    var it = o.order_items[0], from = (it.requirements || []).slice();
    it.requirements = (a.p_reqs || []).slice(); it.requirements_note = (a.p_note || '').trim() || null;
    log(o, 'requirements', { from: from, to: it.requirements, note: it.requirements_note });
    return { ok: true };
  };
  H.staff_record_payment = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    var amt = money(a.p_amount); if (!(amt > 0)) return no('Enter the amount paid.', 'amount');
    if (a.p_idem && o.payments.some(function (x) { return x.idem === a.p_idem; })) return { ok: true, repeat: true, balance: Math.max(0, money(total(o) - paid(o))) };
    if (paid(o) + amt > total(o) + 0.005) return no('That is more than the amount still to pay (' + fjd(total(o) - paid(o)) + ').', 'amount');
    o.payments.push({ id: 'pay' + evId(), idem: a.p_idem || null, kind: a.p_kind || 'deposit', method: a.p_method || 'cash', amount: amt, reference: a.p_reference || null, recorded_at: NOW(), note: a.p_note || null });
    payStatus(o); o.version++;
    log(o, 'payment_recorded', { kind: a.p_kind || 'deposit', method: a.p_method || 'cash', amount: amt, paid_total: paid(o) });
    if (o.order_status === 'awaiting_deposit' && paid(o) >= Number(o.deposit_required || 0) - 0.005) { o.order_status = 'confirmed'; o.confirmed_at = NOW(); log(o, 'confirmed', { final_total: total(o), note: 'Deposit received' }); }
    return { ok: true, balance: Math.max(0, money(total(o) - paid(o))), paid_total: paid(o), status: o.order_status };
  };
  H.staff_order_action = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    if (a.p_version != null && a.p_version !== o.version) return no('Someone else just updated this order. It has been refreshed, please check it again.', null, 'changed');
    var act = a.p_action, note = (a.p_note || '').trim() || null;
    if (act === 'confirm') {
      if (a.p_final_total != null) o.final_total = money(a.p_final_total);
      if (o.final_total == null) o.final_total = o.estimate_total;
      var dep = a.p_deposit ? money(a.p_deposit) : null;
      o.deposit_required = dep; o.order_status = dep && paid(o) < dep ? 'awaiting_deposit' : 'confirmed'; o.confirmed_at = NOW();
      log(o, o.order_status === 'confirmed' ? 'confirmed' : 'awaiting_deposit', { final_total: o.final_total, deposit_required: dep, note: note });
    } else if (act === 'waive_deposit') {
      o.deposit_required = null; o.order_status = 'confirmed'; o.confirmed_at = NOW(); log(o, 'confirmed', { final_total: total(o), reason: note });
    } else if (act === 'decline') { o.order_status = 'declined'; log(o, 'declined', { note: note });
    } else if (act === 'cancel') { o.order_status = 'cancelled'; log(o, 'cancelled', { note: note, paid_total: paid(o) });
    } else if (act === 'collected') {
      if (o.order_status !== 'confirmed') return no('Only a confirmed order can be handed over.');
      o.order_status = 'completed'; o.fulfilment_status = o.fulfilment_method === 'delivery' ? 'delivered' : 'collected';
      if (o.production_status !== 'ready') { o.production_status = 'ready'; o.ready_at = NOW(); }
      o.handed_over_at = o.completed_at = NOW(); o.handover_to = note || o.contact_name;
      log(o, 'collected', { method: o.fulfilment_method, to: o.handover_to });
    } else if (act === 'note') { log(o, 'note', { note: note });
    } else return no('Not available in practice mode.');
    o.version++; payStatus(o);
    return { ok: true, status: o.order_status, version: o.version };
  };

  // Change order and Correct this order: the real checks and history, in short
  var LABEL = { date: 'Date', time: 'Collection time', cake: 'Cake', size: 'Cake size', quantity: 'Quantity', finish: 'Finish', design: 'Design', message: 'Cake message', candles: 'Candles',
    occasion: 'Occasion', dietary: 'Dietary and allergies', kitchen_notes: 'Kitchen instructions', customer_notes: 'Order notes', method: 'Collection or delivery', zone: 'Delivery area',
    address: 'Delivery address', delivery_contact: 'Who receives it', fee: 'Delivery fee', customer_name: 'Contact name on this order', customer_phone: 'Contact mobile on this order',
    customer_email: 'Contact email on this order', price: 'Order total', deposit_required: 'Deposit required' };
  var KITCHEN = { date: 1, time: 1, cake: 1, size: 1, quantity: 1, finish: 1, design: 1, message: 1, candles: 1, dietary: 1, kitchen_notes: 1, customer_notes: 1, method: 1, zone: 1, address: 1 };
  function amend(a, fix) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    if (a.p_version !== o.version) return no('Someone else updated this order while you had it open. Check the latest details, then make your change again.', null, 'changed');
    if (fix && o.order_status !== 'completed') return no('Only orders that were already handed over are corrected here. Use Change order.', 'status');
    if (!fix && ['completed', 'declined', 'cancelled'].indexOf(o.order_status) > -1) return no('This order is ' + (o.order_status === 'completed' ? 'already handed over' : o.order_status) + ', so it cannot be amended.', 'status');
    if (!fix && (['guest', 'staff', 'other'].indexOf(a.p_requested_by) < 0)) return no('Choose who asked for the change.', 'requested_by');
    if (String(a.p_reason || '').trim().length < 3) return no(fix ? 'Say what is being corrected.' : 'Add a short reason for the change.', 'reason');
    var c = a.p_changes || {}, it = o.order_items[0], ch = [], n = {};
    function put(f, from, to) { if (String(from == null ? '' : from) !== String(to == null ? '' : to)) ch.push({ field: f, label: f === 'time' && (c.method || o.fulfilment_method) === 'delivery' ? 'Delivery time' : LABEL[f], from: from == null || from === '' ? 'None' : String(from), to: to == null || to === '' ? 'None' : String(to), kitchen: !!KITCHEN[f] }); }
    n.date = c.date || o.required_date; n.time = c.time ? String(c.time).slice(0, 5) + ':00' : o.required_time;
    if (n.date !== o.required_date || n.time !== o.required_time) {
      if (fix) { if (n.date < '2015-01-01' || n.date > T) return no('This order was already handed over, so its pickup date is today or earlier. Check the year.', 'date'); }
      else if (n.date < T || (n.date === T && n.time.slice(0, 5) <= new Intl.DateTimeFormat('en-GB', { timeZone: 'Pacific/Fiji', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))) return no('That time has already passed.', 'date');
    }
    put('date', fmtD(o.required_date), fmtD(n.date)); put('time', fmtT(o.required_time), fmtT(n.time));
    var prod = c.product_code ? prodBy(c.product_code) : prodByName(it.product_name), oldName = it.variant || it.product_name;
    n.variant = 'variant' in c ? (c.variant || null) : it.variant; n.size = c.size_inch ? Number(c.size_inch) : it.size_inch; n.qty = c.quantity ? Number(c.quantity) : it.quantity;
    var sz = prod && prod.sizes.filter(function (s) { return s.inch === n.size; })[0];
    if ((c.product_code || c.size_inch) && prod && !sz) return no('That size is not offered for ' + prod.name + '.', 'size');
    var cakeChanged = (c.product_code && prod && prod.name !== it.product_name) || n.variant !== it.variant || n.size !== it.size_inch || n.qty !== it.quantity;
    put('cake', oldName, n.variant || (prod ? prod.name : it.product_name)); if (n.size !== it.size_inch) put('size', it.size_inch + '-inch', n.size + '-inch'); put('quantity', it.quantity, n.qty);
    n.finish = c.finish || it.finish; put('finish', it.finish === 'custom' ? 'Custom design' : 'Standard finish', n.finish === 'custom' ? 'Custom design' : 'Standard finish');
    n.design = 'design' in c ? (String(c.design || '').trim() || null) : it.design_description; put('design', it.design_description, n.design);
    n.message = 'message' in c ? (String(c.message || '').trim() || null) : it.cake_message; put('message', it.cake_message ? '“' + it.cake_message + '”' : null, n.message ? '“' + n.message + '”' : null);
    n.candles = 'candles' in c ? (String(c.candles || '').trim() || null) : it.candles; put('candles', it.candles, n.candles);
    n.occasion = 'occasion' in c ? (c.occasion || null) : it.occasion; put('occasion', it.occasion, n.occasion);
    n.hasdiet = 'has_dietary' in c ? !!c.has_dietary : !!o.has_dietary; n.diet = 'dietary' in c ? (c.dietary || []) : (it.dietary || []); n.dnote = 'dietary_note' in c ? (String(c.dietary_note || '').trim() || null) : it.dietary_note;
    if (!n.hasdiet) { n.diet = []; n.dnote = null; }
    var dt = function (h, d, x) { return h ? ([].concat(d || [], x ? [x] : []).join(', ') || 'Yes') : 'None'; };
    put('dietary', dt(o.has_dietary, it.dietary, it.dietary_note), dt(n.hasdiet, n.diet, n.dnote));
    n.knotes = 'kitchen_notes' in c ? (String(c.kitchen_notes || '').trim() || null) : it.kitchen_notes; put('kitchen_notes', it.kitchen_notes, n.knotes);
    n.cnotes = 'customer_notes' in c ? (String(c.customer_notes || '').trim() || null) : o.customer_notes; put('customer_notes', o.customer_notes, n.cnotes);
    n.method = c.method || o.fulfilment_method; n.zone = n.method === 'delivery' ? ('zone' in c ? c.zone : o.delivery_zone) : null; n.addr = n.method === 'delivery' ? ('address' in c ? c.address : o.delivery_address) : null;
    n.dcontact = n.method === 'delivery' ? ('delivery_contact' in c ? c.delivery_contact : o.delivery_contact) : null;
    var zone = (setup.delivery_zones || []).filter(function (z) { return z.name === n.zone; })[0];
    if (n.method === 'delivery' && !zone) return no('Choose a delivery area.', 'zone');
    n.fee = n.method === 'delivery' ? ('fee' in c && c.fee != null && c.fee !== '' ? money(c.fee) : (o.fulfilment_method === 'delivery' && n.zone === o.delivery_zone ? Number(o.delivery_fee || 0) : Number(zone.fee || 0))) : 0;
    put('method', o.fulfilment_method === 'delivery' ? 'Delivery' : 'Collection from the café', n.method === 'delivery' ? 'Delivery' : 'Collection from the café');
    if (n.method === 'delivery') { put('zone', o.delivery_zone, n.zone); put('address', o.delivery_address, n.addr); put('delivery_contact', o.delivery_contact, n.dcontact); }
    if (n.fee !== Number(o.delivery_fee || 0)) put('fee', fjd(o.delivery_fee || 0), fjd(n.fee));
    n.cname = 'customer_name' in c ? String(c.customer_name || '').trim() : o.contact_name; n.cphone = 'customer_phone' in c ? String(c.customer_phone || '').trim() : o.contact_phone; n.cemail = 'customer_email' in c ? (String(c.customer_email || '').trim().toLowerCase() || null) : o.contact_email;
    if (n.cname.length < 2) return no('Enter the customer name.', 'customer_name');
    put('customer_name', o.contact_name, n.cname); put('customer_phone', o.contact_phone, n.cphone); put('customer_email', o.contact_email, n.cemail);
    var itemsBefore = Number(it.unit_price || 0) * Number(it.quantity || 1), itemsAfter = cakeChanged && sz ? sz.price * n.qty : itemsBefore;
    var before = total(o), after = o.final_total == null ? itemsAfter + n.fee : money(o.final_total - itemsBefore + itemsAfter - Number(o.delivery_fee || 0) + n.fee), setPrice = null;
    if (c.price != null && c.price !== '') {
      if (!(n.finish === 'custom' || it.product_name === 'Custom cake')) return no('Menu cakes use the price list. Only a manager can change this price.', 'price');
      setPrice = money(c.price); after = setPrice;
    }
    if (money(after) !== money(before)) put('price', fjd(before), fjd(after));
    var dep = 'deposit_required' in c ? (Number(c.deposit_required) > 0 ? money(c.deposit_required) : null) : o.deposit_required;
    if ('deposit_required' in c && dep !== o.deposit_required) put('deposit_required', o.deposit_required ? fjd(o.deposit_required) : null, dep ? fjd(dep) : null);
    if (!ch.length) return no('Nothing has changed yet.', null, 'nothing');
    var pd = paid(o), warn = [], kitchen = !fix && o.order_status === 'confirmed' && ch.some(function (x) { return x.kitchen; });
    if (!fix && o.production_status === 'ready' && kitchen) warn.push('This cake is already ready. The kitchen will need to remake or change it.');
    if (pd > after + 0.005) warn.push('FJD ' + money(pd).toFixed(2) + ' has been paid, which is FJD ' + money(pd - after).toFixed(2) + ' more than the new total. A manager must decide on a refund or credit. Nothing is refunded automatically.');
    var ack = kitchen && ['not_started', 'scheduled'].indexOf(o.production_status) < 0, reprint = kitchen && o.brief_version > 0;
    var res = { ok: true, changes: ch, warnings: warn, price_before: money(before), price_after: money(after), paid: money(pd), balance_before: Math.max(0, money(before - pd)), balance_after: Math.max(0, money(after - pd)),
      excess_paid: Math.max(0, money(pd - after)), kitchen_ack_required: ack, needs_reprint: reprint, affects_kitchen: kitchen, time_change_cause: n.date !== o.required_date || n.time !== o.required_time ? (fix ? 'other' : a.p_requested_by === 'guest' ? 'guest_request' : a.p_requested_by === 'staff' ? 'business_delay' : 'other') : null,
      contact_only: ch.every(function (x) { return /^customer_/.test(x.field); }) };
    if (!a.p_commit) return Object.assign({ preview: true }, res);
    if (n.date !== o.required_date || n.time !== o.required_time) { o.original_required_date = o.original_required_date || o.required_date; o.original_required_time = o.original_required_time || o.required_time; }
    o.required_date = n.date; o.required_time = n.time;
    if (prod && c.product_code) { it.product_id = prod.code; it.product_name = prod.name; }
    it.variant = n.variant; it.size_inch = n.size; it.quantity = n.qty; if (cakeChanged && sz) { it.unit_price = sz.price; it.serves_label = sz.serves; }
    it.finish = n.finish; o.order_type = n.finish; it.design_description = n.design; it.cake_message = n.message; it.candles = n.candles; it.occasion = n.occasion;
    o.has_dietary = n.hasdiet; it.dietary = n.diet; it.dietary_note = n.dnote; it.kitchen_notes = n.knotes; o.customer_notes = n.cnotes;
    o.fulfilment_method = n.method; o.delivery_zone = n.zone; o.delivery_address = n.addr; o.delivery_contact = n.dcontact; o.delivery_fee = n.fee;
    o.contact_name = n.cname; o.contact_phone = n.cphone; o.contact_phone_key = key(n.cphone); o.contact_email = n.cemail;
    o.estimate_total = o.final_total == null ? money(after) : itemsAfter + n.fee;
    if (o.final_total != null || setPrice != null) o.final_total = money(after);
    o.deposit_required = dep;
    o.revision = (o.revision || 0) + 1; o.amended_at = NOW(); o.version++; payStatus(o);
    if (ack) o.kitchen_pending = { revision: o.revision, by: ME, changes: ch.filter(function (x) { return x.kitchen; }).map(function (x) { return { label: x.label, from: x.from, to: x.to }; }) };
    o.order_amendments.push({ revision: o.revision, amended_at: NOW(), staff_label: ME, requested_by: fix ? 'other' : a.p_requested_by, reason: String(a.p_reason).trim(), time_change_cause: res.time_change_cause, changes: ch,
      excess_paid: res.excess_paid, kitchen_ack_required: ack, kitchen_ack_at: null, notification_status: 'Practice mode: nobody is contacted.' });
    log(o, fix ? 'corrected' : 'amended', { revision: o.revision, requested_by: fix ? 'other' : a.p_requested_by, reason: String(a.p_reason).trim(), changes: ch, price_before: res.price_before, price_after: res.price_after, kitchen_ack_required: ack });
    return { ok: true, revision: o.revision, reference: o.reference, kitchen_ack_required: ack, needs_reprint: reprint, balance_after: res.balance_after, excess_paid: res.excess_paid };
  }
  H.staff_amend_order = function (a) { return amend(a, false); };
  H.staff_correct_order = function (a) { return amend(a, true); };
  H.staff_set_fulfilment = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    var del = a.p_method === 'delivery', z = del ? (setup.delivery_zones || []).filter(function (x) { return x.name === a.p_zone; })[0] : null;
    if (del && !z) return no('Choose a delivery area.', 'zone');
    var it = o.order_items[0], items = Number(it.unit_price || 0) * Number(it.quantity || 1), fee = del ? money(a.p_fee != null ? a.p_fee : z.fee || 0) : 0;
    o.fulfilment_method = del ? 'delivery' : 'collection'; o.delivery_zone = del ? a.p_zone : null; o.delivery_address = del ? a.p_address : null; o.delivery_contact = del ? a.p_contact : null; o.delivery_fee = fee;
    o.estimate_total = money(items + fee); if (o.final_total != null) o.final_total = o.estimate_total; o.version++; payStatus(o);
    log(o, 'fulfilment', { method: o.fulfilment_method, zone: o.delivery_zone, fee: fee });
    return { ok: true, total: total(o) };
  };
  H.staff_set_candles = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    var v = String(a.p_candles || '').trim() || null; if (v && v.length > 60) return no('Keep the candles to 60 characters.', 'candles');
    var it = o.order_items[0], from = it.candles || null; it.candles = v; o.version++;
    log(o, 'candles_changed', { from: from, to: v });
    return { ok: true, changed: from !== v, brief_needs_reprint: o.brief_version > 0 };
  };

  // The kitchen board: the confirmed cakes from the order list itself, so new practice orders appear there too
  function kitchenRow(o) {
    var r = PX.snap(o), it = o.order_items[0] || {};
    return Object.assign(r, { id: o.id, status: o.order_status, stage: o.production_status || 'not_started', assignee: o.kitchen_assignee || null, brief_version: o.brief_version || 0, brief_changed: false,
      late: o.order_status === 'confirmed' && o.required_date < T, qc_by: o.qc_by || null, ready_at: o.ready_at || null, handed_over_at: o.handed_over_at || null, candles: it.candles || null,
      dietary_note: it.dietary_note || null, kitchen_notes: it.kitchen_notes || null, requirements: it.requirements || [], requirements_note: it.requirements_note || null,
      amend_pending: o.kitchen_pending ? [o.kitchen_pending] : null });
  }
  H.kitchen_board = function (a) {
    var from = a.p_from || T, days = Number(a.p_days) || 7, to = new Date(Date.parse(from + 'T12:00:00Z') + (days - 1) * 864e5).toISOString().slice(0, 10);
    var rows = orders.filter(function (o) {
      return (o.order_status === 'confirmed' && (o.required_date >= from && o.required_date <= to || (!a.p_from && o.required_date < T))) ||
        (o.order_status === 'completed' && o.required_date === T && o.required_date >= from && o.required_date <= to);
    }).sort(function (x, y) { return (x.required_date + x.required_time) < (y.required_date + y.required_time) ? -1 : 1; }).map(kitchenRow);
    return { ok: true, today: T, orders: rows };
  };
  H.kitchen_set_stage = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    if (a.p_stage === 'ready' && String(a.p_name || '').trim().length < 2) return no('Enter the name of the person who checked the cake.', 'qc', 'qc');
    var from = o.production_status; o.production_status = a.p_stage;
    if (a.p_stage === 'ready') { o.qc_by = String(a.p_name).trim(); o.qc_at = o.ready_at = NOW(); } else { o.qc_by = null; o.ready_at = null; }
    o.version++; log(o, 'stage', { from: from, to: a.p_stage, qc_by: a.p_stage === 'ready' ? o.qc_by : null }, a.p_stage === 'ready' ? o.qc_by : ME);
    return { ok: true, stage: a.p_stage };
  };
  H.kitchen_assign = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    o.kitchen_assignee = String(a.p_name || '').trim() || null; log(o, 'assigned', { to: o.kitchen_assignee }); return { ok: true };
  };
  H.kitchen_ack_amendment = function (a) {
    var o = byId(a.p_order); if (!o) return no('Order not found.');
    if (String(a.p_name || '').trim().length < 2) return no('Enter your name.', 'name');
    o.kitchen_pending = null; (o.order_amendments || []).forEach(function (m) { if (m.kitchen_ack_required && !m.kitchen_ack_at) m.kitchen_ack_at = NOW(); });
    log(o, 'kitchen_ack', {}, String(a.p_name).trim()); return { ok: true, count: 1 };
  };
  // Never printed, downloaded or sent; never emailed
  H.staff_print_brief = function () { return no('Practice mode: kitchen slips are not printed, downloaded or sent. In the real app this sends the slip to the kitchen.'); };
  H.staff_send_quote = H.staff_send_update = H.staff_resend_email = function () { return no('Practice mode: nothing is sent to customers. In the real app the customer gets an email.'); };
  H.staff_order_emails = function (a) { var o = byId(a.p_order) || {}; return { ok: true, guest_emails: false, emails: [] }; };

  // Lists and look-ups of orders
  function cell(o, k) { var v = o[k]; return v === undefined && k === 'is_test' ? false : v; }
  function likeRe(p) { return new RegExp('^' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$', 'i'); }
  function test(o, k, op, v) {
    var x = cell(o, k);
    switch (op) {
      case 'eq': return String(x) === String(v); case 'neq': return String(x) !== String(v);
      case 'gte': return x != null && x >= v; case 'lte': return x != null && x <= v; case 'gt': return x != null && x > v; case 'lt': return x != null && x < v;
      case 'in': return (Array.isArray(v) ? v : String(v).replace(/^\(|\)$/g, '').split(',')).map(String).indexOf(String(x)) > -1;
      case 'ilike': case 'like': return likeRe(v).test(String(x == null ? '' : x));
      case 'is': return v === null || v === 'null' ? x == null : String(x) === String(v);
    }
    return true;
  }
  function splitTop(s) { var out = [], d = 0, cur = ''; for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; }
  function ordersQuery() {
    var st = { f: [], head: false, one: false, lim: null, ord: [] }, b;
    b = {
      select: function (cols, o) { if (o && o.head) st.head = true; return b; },
      eq: function (k, v) { st.f.push(function (o) { return test(o, k, 'eq', v); }); return b; }, neq: function (k, v) { st.f.push(function (o) { return test(o, k, 'neq', v); }); return b; },
      gte: function (k, v) { st.f.push(function (o) { return test(o, k, 'gte', v); }); return b; }, lte: function (k, v) { st.f.push(function (o) { return test(o, k, 'lte', v); }); return b; },
      gt: function (k, v) { st.f.push(function (o) { return test(o, k, 'gt', v); }); return b; }, lt: function (k, v) { st.f.push(function (o) { return test(o, k, 'lt', v); }); return b; },
      in: function (k, v) { st.f.push(function (o) { return test(o, k, 'in', v); }); return b; }, is: function (k, v) { st.f.push(function (o) { return test(o, k, 'is', v); }); return b; },
      ilike: function (k, v) { st.f.push(function (o) { return test(o, k, 'ilike', v); }); return b; }, like: function (k, v) { st.f.push(function (o) { return test(o, k, 'like', v); }); return b; },
      or: function (expr) {
        var parts = splitTop(String(expr)).map(function (p) { var m = /^([a-z_]+)\.([a-z]+)\.(.*)$/.exec(p.trim()); return m ? [m[1], m[2], m[3]] : null; }).filter(Boolean);
        st.f.push(function (o) { return parts.some(function (q) { return test(o, q[0], q[1], q[2]); }); }); return b;
      },
      not: function (k, op, v) { st.f.push(function (o) { return !test(o, k, op, v); }); return b; },
      order: function (k, o) { st.ord.push([k, !(o && o.ascending === false)]); return b; }, limit: function (n) { st.lim = n; return b; }, range: function (a, z) { st.rng = [a, z]; return b; },
      single: function () { st.one = true; return b; }, maybeSingle: function () { st.one = true; return b; },
      update: function () { st.write = true; return b; }, insert: function () { st.write = true; return b; }, upsert: function () { st.write = true; return b; }, delete: function () { st.write = true; return b; },
      then: function (ok, bad) {
        var r;
        try {
          if (st.write) r = { data: null, error: null };
          else {
            var rows = orders.filter(function (o) { return st.f.every(function (f) { return f(o); }); });
            st.ord.slice().reverse().forEach(function (q) { rows.sort(function (x, y) { var a = cell(x, q[0]), c = cell(y, q[0]); return a === c ? 0 : (a < c ? -1 : 1) * (q[1] ? 1 : -1); }); });
            if (st.rng) rows = rows.slice(st.rng[0], st.rng[1] + 1); if (st.lim != null) rows = rows.slice(0, st.lim);
            r = st.head ? { count: rows.length, data: null } : { data: st.one ? clone(rows[0] || null) : clone(rows) };
          }
        } catch (e) { r = { error: { message: 'Practice mode: that list could not be loaded' } }; }
        return Promise.resolve(r).then(ok, bad);
      }
    };
    return b;
  }

  // Put it together: practice answers first, the pretend day's own answers for everything else
  var baseRpc = M.rpc, baseFrom = M.from;
  M.rpc = function (fn, args) {
    var h = H[fn];
    if (!h) return baseRpc.call(M, fn, args);
    try { (global.__calls || []).push(['rpc', fn, args]); } catch (e) {}
    var out;
    try { out = h(args || {}); } catch (e) { console.error('[Practice] ' + fn, e); out = no('Practice mode: that did not work. Tap Start over to begin the day again.'); }
    return Promise.resolve({ data: clone(out), error: null });
  };
  M.from = function (t) { return t === 'orders' ? ordersQuery() : baseFrom.call(M, t); };
  api.state = { orders: orders, summary: summary, prof: prof };
})(window);
