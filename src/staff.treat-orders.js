/* Corner Café Service Hub: Treat orders (festive treats ordered without a cake), 26 October 2026.
 * Roneel: a separate Festive treats module on the website, "customers fill it and request, basic details with items".
 * Requests arrive as treat orders (T-1001…). This adds:
 *  - a banner on Today when there are treat requests to confirm or treats to collect this week, with an Open button;
 *  - the Treat orders board: grouped by pickup day with day totals; Confirm, Record payment, Collected, Cancel (with a
 *    reason), Print slip, call and WhatsApp; and New treat order for the counter;
 *  - a "Treat orders" button inside Settings > Seasonal items.
 * Cake orders, Daily Cake Demand and the daily cake limit are not touched. If this file fails, the app works as before. */
(function (win, doc) {
  'use strict';
  if (win.__ccTreatOrders20261026) return;
  win.__ccTreatOrders20261026 = true;
  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', TZ = 'Pacific/Fiji';
  var client = null;
  function db() {
    if (client) return client;
    if (win.__ccsMock) return (client = win.__ccsMock);
    if (!win.supabase || !win.supabase.createClient) return null;
    client = win.supabase.createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'cc-cakes-staff', autoRefreshToken: false, detectSessionInUrl: false } });
    return client;
  }
  function rpc(fn, args) { var c = db(); if (!c) return Promise.reject(new Error('offline')); return c.rpc(fn, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function warn(w, e) { try { console.warn('[Treat orders] ' + w, e); } catch (_) {} }
  function money(n) { n = Number(n || 0); return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n))); }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nice(iso, long) { var d = new Date(iso + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', { weekday: long ? 'long' : 'short', day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC' }); }
  function dayName(iso) { var t = today(); return iso === t ? 'Today' : iso === addDays(t, 1) ? 'Tomorrow' : iso === addDays(t, -1) ? 'Yesterday' : nice(iso, true); }
  function t12(t) { if (!t) return ''; var p = String(t).split(':'), h = +p[0], m = +p[1] || 0; return (h % 12 || 12) + ':' + (m < 10 ? '0' : '') + m + ' ' + (h >= 12 ? 'PM' : 'AM'); }
  function errText(e) { var m = String((e && (e.message || e)) || ''); return /fetch|network|offline/i.test(m) ? 'No internet connection. Try again when connected.' : 'That did not work. Try again.'; }
  function uuid() { try { if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID(); } catch (_) {} return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }
  function phoneDigits(p) { var d = String(p || '').replace(/\D/g, ''); if (d.length === 7) d = '679' + d; return d; }
  function root() { return doc.getElementById('cc-staff'); }
  var METHODS = [['cash', 'Cash'], ['eftpos', 'EFTPOS'], ['mpaisa', 'M-PAiSA'], ['bank_transfer', 'Bank transfer']];
  var REASONS = ['Customer cancelled', 'Could not reach the customer', 'Sold out', 'Duplicate request'];
  var STATUS = { 'new': ['New request', 'is-new'], confirmed: ['Confirmed', 'is-ok'], collected: ['Collected', 'is-done'], cancelled: ['Cancelled', 'is-off'] };

  // ---------- data ----------
  var data = null, at = 0, loading = false, denied = false;
  function load(force) {
    if (denied || loading || (!force && data && Date.now() - at < 60000)) return Promise.resolve(data);
    loading = true;
    return rpc('staff_treat_orders', { p_from: addDays(today(), -14) }).then(function (d) {
      loading = false; at = Date.now();
      if (!d || !d.ok) { if (d && d.error === 'forbidden') denied = true; return null; }
      data = d; schedule(); if (B) draw(); return d;
    }, function (e) { loading = false; at = Date.now(); warn('load', e); if (B) { B.err = errText(e); draw(); } return null; });
  }
  function open() { return ((data && data.orders) || []).filter(function (o) { return o.status === 'new' || o.status === 'confirmed'; }); }
  function counts() {
    var t = today(), wk = addDays(t, 7), o = open();
    return { fresh: o.filter(function (x) { return x.status === 'new'; }).length, week: o.filter(function (x) { return x.pickup_date >= t && x.pickup_date <= wk; }).length,
      late: o.filter(function (x) { return x.pickup_date < t; }).length, today: o.filter(function (x) { return x.pickup_date === t; }).length };
  }

  // ---------- Today banner ----------
  function bannerUi() {
    var main = doc.querySelector('#ccs-main[data-screen="today"]'), box = doc.querySelector('#ccs-main .cc-to-banner');
    if (!main) { if (box) box.remove(); return; }
    load();
    if (!data) return;
    var c = counts();
    if (!c.fresh && !c.week && !c.late) { if (box) box.remove(); return; }
    var bits = [];
    if (c.fresh) bits.push('<b>' + c.fresh + ' new request' + (c.fresh > 1 ? 's' : '') + '</b> to confirm');
    if (c.today) bits.push('<b>' + c.today + '</b> to collect today');
    else if (c.week) bits.push(c.week + ' to collect this week');
    if (c.late) bits.push('<b>' + c.late + ' not collected</b> from earlier days');
    var h = '<div><h3>Treat orders</h3><p>' + bits.join(' · ') + '</p></div><button type="button" class="ccs-btn" data-cc-to="open">Open treat orders</button>';
    if (!box) { box = doc.createElement('section'); box.className = 'cc-to-banner' + (c.fresh ? ' is-new' : ''); box.setAttribute('role', 'status'); var dh = main.querySelector(':scope > .ccs-dash-head'), anchor = main.querySelector(':scope > .ccs-head'); if (dh) { dh.appendChild(box); if (getComputedStyle(dh).display.indexOf('flex') > -1) dh.style.flexWrap = 'wrap'; } else if (anchor && anchor.nextSibling) main.insertBefore(box, anchor.nextSibling); else main.insertBefore(box, main.firstChild); }
    box.className = 'cc-to-banner' + (c.fresh ? ' is-new' : '');
    if (box.getAttribute('data-h') !== h) { box.innerHTML = h; box.setAttribute('data-h', h); }
  }
  // A button inside Settings > Seasonal items
  function settingsUi() {
    var tabs = doc.querySelector('#cc-staff .cc-szx .cc-szm-tabs'); if (!tabs || denied || tabs.querySelector('[data-cc-to="open"]')) return;
    var b = doc.createElement('button'); b.type = 'button'; b.className = 'ccs-chip cc-to-tab'; b.setAttribute('data-cc-to', 'open');
    var c = data ? counts().fresh : 0; b.textContent = 'Treat orders' + (c ? ' (' + c + ' new)' : '');
    tabs.appendChild(b);
  }

  // ---------- the board ----------
  var B = null;  // { view, act, form, msg, err, busy }
  function openBoard(view) {
    var r = root(); if (!r) return;
    B = { view: view || 'todo', act: null, form: null, msg: null, err: null, busy: false };
    var l = doc.getElementById('cc-to');
    if (!l) {
      l = doc.createElement('div'); l.id = 'cc-to'; l.className = 'cc-to'; l.setAttribute('role', 'dialog'); l.setAttribute('aria-modal', 'true'); l.setAttribute('aria-labelledby', 'cc-to-title');
      l.innerHTML = '<div class="cc-to-hd"><h2 id="cc-to-title">Treat orders</h2><div class="cc-to-hda"></div><button type="button" class="ccs-btn ccs-ghost" data-cc-to="close">Close</button></div><div class="cc-to-body"><div class="cc-to-in"></div></div>';
      ['input', 'change'].forEach(function (t) { l.addEventListener(t, function (e) { e.stopPropagation(); onInput(e); }); });
      r.appendChild(l);
    }
    draw(); load(true);
    setTimeout(function () { var x = l.querySelector('[data-cc-to="close"]'); if (x) x.focus(); }, 50);
  }
  function closeBoard() { B = null; var l = doc.getElementById('cc-to'); if (l) l.remove(); schedule(); }
  function list() {
    var t = today(), all = (data && data.orders) || [];
    if (B.view === 'today') return all.filter(function (o) { return o.pickup_date === t && o.status !== 'cancelled'; });
    if (B.view === 'all') return all.slice();
    return all.filter(function (o) { return o.status === 'new' || o.status === 'confirmed'; });
  }
  function itemsLine(o) { return (o.items || []).map(function (i) { return i.quantity + ' × ' + i.name; }).join(', '); }
  function orderHtml(o) {
    var s = STATUS[o.status] || [o.status, ''], bal = Math.max(0, Number(o.total) - Number(o.paid)), live = o.status === 'new' || o.status === 'confirmed';
    var can = data || {}, act = B.act && B.act.id === o.id ? B.act : null;
    var h = '<article class="cc-to-o ' + s[1] + '" data-id="' + esc(o.id) + '"><div class="cc-to-ot"><div class="cc-to-who"><span class="cc-to-time">' + t12(o.pickup_time) + '</span><b>' + esc(o.name) + '</b>' +
      '<span class="cc-to-ref">' + esc(o.reference) + ' · ' + (o.source === 'online' ? 'Website' : 'Counter') + '</span></div><span class="cc-to-pill ' + s[1] + '">' + s[0] + '</span></div>';
    h += '<ul class="cc-to-items">' + (o.items || []).map(function (i) { return '<li><span><b>' + i.quantity + ' ×</b> ' + esc(i.name) + (i.detail ? ' <small>' + esc(i.detail) + '</small>' : '') + '</span><span>' + money(i.price * i.quantity) + '</span></li>'; }).join('') + '</ul>';
    if (o.note) h += '<p class="cc-to-note"><b>Note:</b> ' + esc(o.note) + '</p>';
    h += '<p class="cc-to-money"><span>Total <b>' + money(o.total) + '</b></span><span>Paid <b>' + money(o.paid) + '</b></span>' + (live || bal ? '<span class="' + (bal ? 'is-due' : 'is-paid') + '">' + (bal ? 'To pay <b>' + money(bal) + '</b>' : 'Paid in full') + '</span>' : '') + '</p>';
    if (o.status === 'cancelled' && o.cancel_reason) h += '<p class="cc-to-note">Cancelled: ' + esc(o.cancel_reason) + '</p>';
    if (o.status === 'collected' && o.collected_by_label) h += '<p class="cc-to-meta">Collected · marked by ' + esc(o.collected_by_label) + '</p>';
    else if (o.confirmed_by_label) h += '<p class="cc-to-meta">Confirmed by ' + esc(o.confirmed_by_label) + '</p>';
    if (act) h += actHtml(o, act, bal);
    else {
      h += '<div class="cc-to-acts">';
      if (o.status === 'new' && can.can_edit) h += '<button type="button" class="ccs-btn" data-cc-to="confirm" data-id="' + esc(o.id) + '">Confirm</button>';
      if (live && bal > 0 && can.can_pay) h += '<button type="button" class="ccs-btn' + (o.status === 'new' ? ' ccs-ghost' : '') + '" data-cc-to="pay" data-id="' + esc(o.id) + '">Record payment</button>';
      if (o.status === 'confirmed' && can.can_edit) h += '<button type="button" class="ccs-btn' + (bal > 0 && can.can_pay ? ' ccs-ghost' : '') + '" data-cc-to="collect" data-id="' + esc(o.id) + '">Collected</button>';
      if (o.phone) h += '<a class="ccs-btn ccs-ghost" href="tel:' + esc(String(o.phone).replace(/[^\d+]/g, '')) + '">Call</a><a class="ccs-btn ccs-ghost" target="_blank" rel="noopener" href="https://wa.me/' + phoneDigits(o.phone) + '?text=' + encodeURIComponent('Bula ' + String(o.name).split(' ')[0] + ', this is Corner Café about your treat order ' + o.reference + ' for ' + nice(o.pickup_date, true) + ' at ' + t12(o.pickup_time) + '.') + '">WhatsApp</a>';
      h += '<button type="button" class="ccs-btn ccs-ghost" data-cc-to="print" data-id="' + esc(o.id) + '">Print slip</button>';
      if (live && can.can_edit) h += '<button type="button" class="ccs-btn ccs-ghost cc-to-danger" data-cc-to="cancel" data-id="' + esc(o.id) + '">Cancel order</button>';
      h += '</div>';
    }
    return h + '</article>';
  }
  function actHtml(o, a, bal) {
    var h = '<div class="cc-to-panel">';
    if (a.kind === 'pay') {
      h += '<h4>Record payment</h4><div class="ccs-field"><label class="ccs-label" for="cc-to-amt">Amount paid</label><input class="ccs-input" id="cc-to-amt" type="number" inputmode="decimal" min="0" step="0.01" value="' + esc(a.amount != null ? a.amount : bal.toFixed(2)) + '"><span class="ccs-hint">' + money(bal) + ' still to pay</span></div>' +
        '<p class="ccs-label">How did they pay?</p><div class="cc-to-chips">' + METHODS.map(function (m) { return '<button type="button" class="ccs-chip" data-cc-to="method" data-v="' + m[0] + '" aria-pressed="' + (a.method === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' +
        '<div class="cc-to-acts"><button type="button" class="ccs-btn" data-cc-to="pay-save" data-id="' + esc(o.id) + '"' + (B.busy ? ' disabled' : '') + '>' + (B.busy ? 'Saving…' : 'Save payment') + '</button><button type="button" class="ccs-btn ccs-ghost" data-cc-to="act-close">Back</button></div>';
    } else if (a.kind === 'collect') {
      h += '<h4>' + esc(o.name) + ' still has ' + money(bal) + ' to pay</h4><p>Take the payment first, or mark it collected anyway.</p><div class="cc-to-acts">' +
        (data.can_pay ? '<button type="button" class="ccs-btn" data-cc-to="pay" data-id="' + esc(o.id) + '">Record payment</button>' : '') +
        '<button type="button" class="ccs-btn ccs-ghost" data-cc-to="collect-yes" data-id="' + esc(o.id) + '">Collected without full payment</button><button type="button" class="ccs-btn ccs-ghost" data-cc-to="act-close">Back</button></div>';
    } else if (a.kind === 'cancel') {
      h += '<h4>Cancel ' + esc(o.reference) + '?</h4><p class="ccs-label">Why?</p><div class="cc-to-chips">' + REASONS.map(function (r) { return '<button type="button" class="ccs-chip" data-cc-to="reason" data-v="' + esc(r) + '" aria-pressed="' + (a.reason === r) + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
        '<div class="ccs-field"><label class="ccs-label" for="cc-to-why">Or type the reason</label><input class="ccs-input" id="cc-to-why" type="text" maxlength="200" value="' + esc(REASONS.indexOf(a.reason) < 0 ? a.reason || '' : '') + '"></div>' +
        (Number(o.paid) > 0 ? '<p class="cc-to-warn">' + money(o.paid) + ' was paid. Arrange the refund as usual.</p>' : '') +
        '<div class="cc-to-acts"><button type="button" class="ccs-btn cc-to-dangerfill" data-cc-to="cancel-yes" data-id="' + esc(o.id) + '"' + (B.busy ? ' disabled' : '') + '>Cancel order</button><button type="button" class="ccs-btn ccs-ghost" data-cc-to="act-close">Keep order</button></div>';
    }
    if (B.err) h += '<p class="cc-to-err" role="alert">' + esc(B.err) + '</p>';
    return h + '</div>';
  }
  function boardHtml() {
    if (!data) return loading || !B.err ? '<p class="ccs-loading">Loading…</p>' : '<p class="cc-to-err">' + esc(B.err) + '</p><button type="button" class="ccs-btn" data-cc-to="reload">Try again</button>';
    if (B.form) return formHtml();
    var c = counts(), h = '<div class="cc-to-kpis"><div><span>New requests</span><b>' + c.fresh + '</b></div><div><span>To collect today</span><b>' + c.today + '</b></div><div><span>Next 7 days</span><b>' + c.week + '</b></div>' +
      (c.late ? '<div class="is-late"><span>Not collected</span><b>' + c.late + '</b></div>' : '') + '</div>';
    h += '<div class="cc-to-tabs" role="tablist">' + [['todo', 'To do'], ['today', 'Today'], ['all', 'All, last 2 weeks']].map(function (t) { return '<button type="button" class="ccs-chip" role="tab" data-cc-to="view" data-v="' + t[0] + '" aria-selected="' + (B.view === t[0]) + '" aria-pressed="' + (B.view === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    if (B.msg) h += '<p class="cc-to-ok" role="status">' + esc(B.msg) + '</p>';
    if (B.err && !B.act) h += '<p class="cc-to-err" role="alert">' + esc(B.err) + '</p>';
    var L = list();
    if (!L.length) return h + '<p class="cc-to-empty">' + (B.view === 'today' ? 'No treat orders for today.' : B.view === 'todo' ? 'Nothing to do. New treat requests from the website show here.' : 'No treat orders in the last two weeks.') + '</p>';
    var days = {}; L.forEach(function (o) { (days[o.pickup_date] = days[o.pickup_date] || []).push(o); });
    Object.keys(days).sort().forEach(function (d) {
      var os = days[d], tot = {}, live = os.filter(function (o) { return o.status !== 'cancelled'; });
      live.forEach(function (o) { (o.items || []).forEach(function (i) { tot[i.name] = (tot[i.name] || 0) + i.quantity; }); });
      h += '<section class="cc-to-day' + (d < today() ? ' is-past' : '') + '"><div class="cc-to-dh"><h3>' + esc(dayName(d)) + (d === today() || d === addDays(today(), 1) ? ' <small>' + esc(nice(d, true)) + '</small>' : '') + '</h3>' +
        '<p>' + live.length + ' order' + (live.length === 1 ? '' : 's') + (Object.keys(tot).length ? ' · ' + Object.keys(tot).sort().map(function (k) { return tot[k] + ' × ' + esc(k); }).join(', ') : '') + '</p></div>' + os.map(orderHtml).join('') + '</section>';
    });
    return h;
  }
  function draw() {
    var l = doc.getElementById('cc-to'); if (!l || !B) return;
    var hda = l.querySelector('.cc-to-hda');
    hda.innerHTML = data && data.can_create && !B.form ? '<button type="button" class="ccs-btn" data-cc-to="new">New treat order</button>' : '';
    var host = l.querySelector('.cc-to-in'), body = l.querySelector('.cc-to-body'), top = body.scrollTop, a = doc.activeElement, keep = null;
    if (a && l.contains(a)) keep = a.id ? '#' + a.id : a.getAttribute('data-cc-to') ? '[data-cc-to="' + a.getAttribute('data-cc-to') + '"]' + (a.getAttribute('data-id') ? '[data-id="' + a.getAttribute('data-id') + '"]' : '') + (a.getAttribute('data-v') ? '[data-v="' + a.getAttribute('data-v') + '"]' : '') : null;
    host.innerHTML = boardHtml();
    if (B.top) { body.scrollTop = 0; B.top = false; } else body.scrollTop = top;
    if (keep) { try { var f = l.querySelector(keep); if (f) f.focus({ preventScroll: true }); } catch (_) {} }
  }
  function act(id, action, extra) {
    B.busy = true; B.err = null; draw();
    var a = Object.assign({ p_id: id, p_action: action }, extra || {});
    return rpc('staff_treat_order_action', a).then(function (r) {
      if (!B) return; B.busy = false;
      if (!r || !r.ok) { B.err = (r && r.message) || 'Not saved.'; return draw(); }
      var o = ((data && data.orders) || []).filter(function (x) { return x.id === id; })[0];
      B.act = null; B.msg = (o ? o.reference + ' ' : '') + ({ confirm: 'confirmed.', pay: 'payment saved.', collected: 'marked collected.', cancel: 'cancelled.' }[action] || 'saved.');
      if (o) { o.status = r.status; o.paid = r.paid; }
      draw(); load(true);
    }, function (e) { if (!B) return; B.busy = false; B.err = errText(e); draw(); });
  }
  function printSlip(o) {
    var w = win.open('', '_blank', 'width=420,height=640'); if (!w) { B.err = 'Allow pop-ups to print the slip.'; return draw(); }
    var bal = Math.max(0, Number(o.total) - Number(o.paid));
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(o.reference) + '</title><style>body{font:16px/1.4 Arial,sans-serif;margin:16px;color:#000}h1{font-size:22px;margin:0}h2{font-size:18px;margin:8px 0}table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #000;vertical-align:top}td:last-child{text-align:right}.b{font-weight:700}.big{font-size:20px}</style></head><body>' +
      '<h1>Corner Café · Treat order</h1><p class="big b">' + esc(o.reference) + '</p><h2>' + esc(nice(o.pickup_date, true)) + ', ' + t12(o.pickup_time) + '</h2>' +
      '<p><span class="b">' + esc(o.name) + '</span><br>' + esc(o.phone || '') + '</p><table>' + (o.items || []).map(function (i) { return '<tr><td><span class="b">' + i.quantity + ' ×</span> ' + esc(i.name) + (i.detail ? '<br><small>' + esc(i.detail) + '</small>' : '') + '</td><td>' + money(i.price * i.quantity) + '</td></tr>'; }).join('') +
      '<tr><td class="b">Total</td><td class="b">' + money(o.total) + '</td></tr><tr><td>Paid</td><td>' + money(o.paid) + '</td></tr><tr><td class="b">To pay</td><td class="b">' + money(bal) + '</td></tr></table>' +
      (o.note ? '<p><span class="b">Note:</span> ' + esc(o.note) + '</p>' : '') + '<p>' + (STATUS[o.status] || [o.status])[0] + '</p><script>setTimeout(function(){window.print()},300)<\/script></body></html>');
    w.document.close();
  }

  // ---------- New treat order (counter) ----------
  var menu = null;
  function menuItems() { var out = []; ((menu && menu.groups) || []).forEach(function (g) { (g.items || []).forEach(function (i) { out.push(i); }); }); return out; }
  function mItem(id) { return menuItems().filter(function (i) { return i.id === id; })[0] || null; }
  function fLines() { var F = B.form; return Object.keys(F.q).filter(function (k) { return F.q[k] > 0 && mItem(k); }); }
  function fTotal() { var F = B.form; return fLines().reduce(function (s, k) { return s + Number(mItem(k).price) * F.q[k]; }, 0); }
  function fWhy(it, day) {
    if (!day) return null;
    if (it.pickup_from && day < it.pickup_from) return 'From ' + nice(it.pickup_from);
    if (it.pickup_to && day > it.pickup_to) return 'Last pickup ' + nice(it.pickup_to);
    if ((it.blocked || []).indexOf(day) > -1) return 'Not available that day';
    if (it.left && it.left[day] != null && it.left[day] <= 0) return 'Sold out that day';
    return null;
  }
  function newForm() {
    B.form = { q: {}, day: today(), time: null, name: '', phone: '', note: '', paid: 'none', method: 'cash', key: uuid(), err: null };
    B.top = true; draw();
    rpc('get_seasonal_menu', { p_channel: 'counter' }).then(function (m) { menu = m && m.ok ? m : { groups: [] }; if (B && B.form) draw(); }, function (e) { if (B && B.form) { B.form.err = errText(e); draw(); } });
  }
  function formHtml() {
    var F = B.form, t = today(), h = '<div class="cc-to-form"><h3>New treat order</h3><p class="cc-to-lead">For a customer at the counter or on the phone. It is saved as confirmed.</p>';
    if (!menu) return h + '<p class="ccs-loading">Loading treats…</p></div>';
    var its = menuItems();
    if (!its.length) return h + '<p class="cc-to-empty">No treats are on sale. Switch them on in Settings > Seasonal items.</p><div class="cc-to-acts"><button type="button" class="ccs-btn ccs-ghost" data-cc-to="form-close">Back</button></div></div>';
    h += '<p class="ccs-label">Pickup day</p><div class="cc-to-chips">' + [0, 1, 2, 3, 4, 5, 6].map(function (n) { var d = addDays(t, n); return '<button type="button" class="ccs-chip" data-cc-to="f-day" data-v="' + d + '" aria-pressed="' + (F.day === d) + '">' + (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : esc(nice(d))) + '</button>'; }).join('') + '</div>' +
      '<div class="ccs-field cc-to-later"><label class="ccs-label" for="cc-to-fday">Another day</label><input class="ccs-input" id="cc-to-fday" type="date" min="' + t + '" value="' + esc(F.day || '') + '"></div>';
    h += '<p class="ccs-label">Pickup time</p><div class="cc-to-chips">' + [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(function (hh) { var v = (hh < 10 ? '0' : '') + hh + ':00'; return '<button type="button" class="ccs-chip" data-cc-to="f-time" data-v="' + v + '" aria-pressed="' + (F.time === v) + '">' + t12(v) + '</button>'; }).join('') + '</div>' +
      '<div class="ccs-field cc-to-later"><label class="ccs-label" for="cc-to-ftime">Another time</label><input class="ccs-input" id="cc-to-ftime" type="time" value="' + esc(F.time || '') + '"></div>';
    h += '<p class="ccs-label">Treats</p><div class="cc-to-pick">' + its.map(function (it) {
      var q = F.q[it.id] || 0, w = fWhy(it, F.day), left = it.left && F.day && it.left[F.day] != null ? it.left[F.day] : it.limit;
      return '<div class="cc-to-pi' + (w && !q ? ' is-off' : '') + '">' + (it.image ? '<img src="' + esc(it.image) + '" alt="">' : '<span class="cc-to-ph"></span>') + '<div class="cc-to-pt"><b>' + esc(it.name) + '</b><small>' + money(it.price) + (it.detail ? ' · ' + esc(it.detail) : '') + (left != null && !w ? ' · ' + left + ' left' : '') + '</small>' + (w ? '<em>' + esc(w) + '</em>' : '') + '</div>' +
        '<div class="cc-to-st"><button type="button" data-cc-to="f-minus" data-id="' + esc(it.id) + '" aria-label="Remove one ' + esc(it.name) + '"' + (q ? '' : ' disabled') + '>−</button><output>' + q + '</output><button type="button" data-cc-to="f-plus" data-id="' + esc(it.id) + '" aria-label="Add one ' + esc(it.name) + '"' + (w || (it.max && q >= it.max) ? ' disabled' : '') + '>+</button></div></div>';
    }).join('') + '</div>';
    h += '<div class="cc-to-two"><div class="ccs-field"><label class="ccs-label" for="cc-to-fname">Customer name</label><input class="ccs-input" id="cc-to-fname" type="text" maxlength="120" value="' + esc(F.name) + '"></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="cc-to-fphone">Mobile number</label><input class="ccs-input" id="cc-to-fphone" type="tel" inputmode="tel" maxlength="20" value="' + esc(F.phone) + '"></div></div>' +
      '<div class="ccs-field"><label class="ccs-label" for="cc-to-fnote">Note (optional)</label><input class="ccs-input" id="cc-to-fnote" type="text" maxlength="300" value="' + esc(F.note) + '"></div>';
    var tot = fTotal();
    if (data.can_pay) h += '<p class="ccs-label">Paid now?</p><div class="cc-to-chips"><button type="button" class="ccs-chip" data-cc-to="f-paid" data-v="none" aria-pressed="' + (F.paid === 'none') + '">Pay at pickup</button><button type="button" class="ccs-chip" data-cc-to="f-paid" data-v="full" aria-pressed="' + (F.paid === 'full') + '">Paid in full' + (tot ? ' · ' + money(tot) : '') + '</button></div>' +
      (F.paid === 'full' ? '<div class="cc-to-chips">' + METHODS.map(function (m) { return '<button type="button" class="ccs-chip" data-cc-to="f-method" data-v="' + m[0] + '" aria-pressed="' + (F.method === m[0]) + '">' + m[1] + '</button>'; }).join('') + '</div>' : '');
    if (F.err) h += '<p class="cc-to-err" role="alert">' + esc(F.err) + '</p>';
    h += '<div class="cc-to-acts cc-to-save"><button type="button" class="ccs-btn" data-cc-to="f-save"' + (B.busy ? ' disabled' : '') + '>' + (B.busy ? 'Saving…' : 'Save treat order' + (tot ? ' · ' + money(tot) : '')) + '</button><button type="button" class="ccs-btn ccs-ghost" data-cc-to="form-close">Cancel</button></div></div>';
    return h;
  }
  function fSave() {
    var F = B.form; F.err = null;
    var lines = fLines();
    if (!lines.length) F.err = 'Add at least one treat.';
    else if (!F.day) F.err = 'Choose the pickup day.';
    else if (!F.time) F.err = 'Choose the pickup time.';
    else if (String(F.name).trim().length < 2) F.err = 'Type the customer name.';
    else if (String(F.phone).replace(/\D/g, '').length < 7) F.err = 'Type a mobile number, for example 912 3456.';
    if (F.err) return draw();
    B.busy = true; draw();
    var tot = fTotal();
    rpc('staff_create_treat_order', { p: { date: F.day, time: F.time, name: F.name.trim(), phone: F.phone.trim(), note: F.note.trim(), confirm_now: true, paid: F.paid === 'full' ? tot : 0, method: F.method, idempotency_key: F.key,
      treats: lines.map(function (k) { return { id: k, quantity: F.q[k] }; }) } }).then(function (r) {
      if (!B) return; B.busy = false;
      if (!r || !r.ok) { F.err = (r && r.message) || 'Not saved.'; return draw(); }
      B.form = null; B.view = F.day === today() ? 'today' : 'todo'; B.msg = r.reference + ' saved for ' + nice(F.day, true) + ', ' + t12(F.time) + '.'; B.top = true; menu = null; draw(); load(true);
    }, function (e) { if (!B) return; B.busy = false; F.err = errText(e); draw(); });
  }
  function onInput(e) {
    if (!B) return;
    var id = e.target.id, F = B.form, v = e.target.value;
    if (B.act && id === 'cc-to-amt') B.act.amount = v;
    if (B.act && id === 'cc-to-why') B.act.reason = v;
    if (!F) return;
    if (id === 'cc-to-fname') F.name = v; else if (id === 'cc-to-fphone') F.phone = v; else if (id === 'cc-to-fnote') F.note = v;
    else if (id === 'cc-to-fday' && e.type === 'change' && /^\d{4}-\d{2}-\d{2}$/.test(v)) { F.day = v; draw(); }
    else if (id === 'cc-to-ftime' && e.type === 'change' && /^\d{2}:\d{2}/.test(v)) { F.time = v.slice(0, 5); draw(); }
  }
  function onClick(e) {
    var b = e.target && e.target.closest && e.target.closest('[data-cc-to]'); if (!b || b.disabled) return;
    var a = b.getAttribute('data-cc-to'), id = b.getAttribute('data-id'), v = b.getAttribute('data-v');
    if (a === 'open') { openBoard(); return; }
    if (!B) return;
    var o = ((data && data.orders) || []).filter(function (x) { return x.id === id; })[0];
    if (a === 'close') return closeBoard();
    if (a === 'reload') { B.err = null; draw(); return load(true); }
    if (a === 'view') { B.view = v; B.act = null; B.msg = null; B.err = null; return draw(); }
    if (a === 'act-close') { B.act = null; B.err = null; return draw(); }
    if (a === 'confirm') return act(id, 'confirm');
    if (a === 'pay') { B.msg = null; B.err = null; B.act = { id: id, kind: 'pay', method: null, amount: null }; draw(); var f = doc.getElementById('cc-to-amt'); if (f) f.focus(); return; }
    if (a === 'method') { B.act.method = v; return draw(); }
    if (a === 'pay-save') {
      var amt = Number(String(B.act.amount != null ? B.act.amount : (doc.getElementById('cc-to-amt') || {}).value).replace(/[^\d.]/g, ''));
      if (!(amt > 0)) { B.err = 'Type the amount paid.'; return draw(); }
      if (!B.act.method) { B.err = 'Tap how they paid.'; return draw(); }
      return act(id, 'pay', { p_amount: Math.round(amt * 100) / 100, p_method: B.act.method });
    }
    if (a === 'collect') { if (o && Number(o.total) - Number(o.paid) > 0.005) { B.msg = null; B.err = null; B.act = { id: id, kind: 'collect' }; return draw(); } return act(id, 'collected'); }
    if (a === 'collect-yes') return act(id, 'collected');
    if (a === 'cancel') { B.msg = null; B.err = null; B.act = { id: id, kind: 'cancel', reason: null }; return draw(); }
    if (a === 'reason') { B.act.reason = v; return draw(); }
    if (a === 'cancel-yes') { var why = String(B.act.reason || '').trim(); if (why.length < 2) { B.err = 'Tap or type why it is cancelled.'; return draw(); } return act(id, 'cancel', { p_note: why }); }
    if (a === 'print') { if (o) printSlip(o); return; }
    if (a === 'new') return newForm();
    if (a === 'form-close') { B.form = null; B.top = true; return draw(); }
    var F = B.form; if (!F) return;
    if (a === 'f-day') { F.day = v; return draw(); }
    if (a === 'f-time') { F.time = v; return draw(); }
    if (a === 'f-plus') { var it = mItem(id); if (it && !fWhy(it, F.day)) F.q[id] = (F.q[id] || 0) + 1; return draw(); }
    if (a === 'f-minus') { F.q[id] = Math.max(0, (F.q[id] || 0) - 1); return draw(); }
    if (a === 'f-paid') { F.paid = v; return draw(); }
    if (a === 'f-method') { F.method = v; return draw(); }
    if (a === 'f-save') return fSave();
  }
  function onKey(e) { if (e.key === 'Escape' && B && !B.form && !B.act) { closeBoard(); e.stopPropagation(); } }

  function css() {
    if (doc.getElementById('cc-to-style')) return;
    var s = doc.createElement('style'); s.id = 'cc-to-style';
    s.textContent = [
      '#ccs-main .cc-to-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;border:1px solid #C7D7E8;border-left:6px solid #31597A;border-radius:12px;background:#F5F8FC;padding:14px 16px;margin:0 0 14px}',
      '#ccs-main .ccs-dash-head .cc-to-banner{margin:16px 0 0;flex:0 0 100%;width:100%;order:99}',
      '#ccs-main .cc-to-banner.is-new{border-color:#A6D8B8;border-left-color:#079455;background:#F6FEF9}',
      '#ccs-main .cc-to-banner h3{margin:0 0 4px;font-size:19px;color:#1D2939}#ccs-main .cc-to-banner p{margin:0;color:#344054}',
      '#cc-staff .cc-to{position:fixed;inset:0;z-index:2147482995;background:#fff;display:flex;flex-direction:column;color:#1D2939}',
      '#cc-staff .cc-to-hd{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid #EAECF0}',
      '#cc-staff .cc-to-hd h2{margin:0;font-size:26px;flex:1 1 auto}#cc-staff .cc-to-hda:empty{display:none}',
      '#cc-staff .cc-to-body{overflow:auto;flex:1 1 auto;padding:16px 24px 48px}',
      '#cc-staff .cc-to-in{max-width:980px;margin:0 auto}',
      '#cc-staff .cc-to-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 14px}',
      '#cc-staff .cc-to-kpis div{border:1px solid #DCE3EB;border-radius:12px;padding:12px 14px}#cc-staff .cc-to-kpis span{display:block;color:#475467;font-size:15px}#cc-staff .cc-to-kpis b{font-size:26px}',
      '#cc-staff .cc-to-kpis .is-late{border-color:#FEC84B;background:#FFFCF5}',
      '#cc-staff .cc-to-tabs,#cc-staff .cc-to-chips{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}',
      '#cc-staff .cc-to-day{margin:0 0 20px}',
      '#cc-staff .cc-to-dh{position:sticky;top:-16px;z-index:1;background:#fff;padding:8px 0;border-bottom:2px solid #1D2939;margin-bottom:10px}',
      '#cc-staff .cc-to-dh h3{margin:0;font-size:21px}#cc-staff .cc-to-dh h3 small{font-weight:400;color:#475467;font-size:16px}#cc-staff .cc-to-dh p{margin:2px 0 0;color:#344054}',
      '#cc-staff .cc-to-day.is-past .cc-to-dh{border-bottom-color:#B54708}',
      '#cc-staff .cc-to-o{border:1px solid #DCE3EB;border-left:5px solid #98A2B3;border-radius:12px;padding:12px 16px;margin:0 0 10px}',
      '#cc-staff .cc-to-o.is-new{border-left-color:#079455}#cc-staff .cc-to-o.is-ok{border-left-color:#31597A}#cc-staff .cc-to-o.is-done,#cc-staff .cc-to-o.is-off{opacity:.75}',
      '#cc-staff .cc-to-ot{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}',
      '#cc-staff .cc-to-who b{font-size:20px;margin-right:8px}#cc-staff .cc-to-time{display:inline-block;font-weight:700;color:#1E3A5F;background:#E8EEF7;border-radius:8px;padding:2px 8px;margin-right:8px}',
      '#cc-staff .cc-to-ref{display:block;color:#475467;font-size:15px;margin-top:2px}',
      '#cc-staff .cc-to-pill{flex:none;border-radius:999px;padding:3px 12px;font-size:15px;font-weight:700;background:#F2F4F7;color:#475467}',
      '#cc-staff .cc-to-pill.is-new{background:#ECFDF3;color:#067647}#cc-staff .cc-to-pill.is-ok{background:#E8EEF7;color:#1E3A5F}',
      '#cc-staff .cc-to-items{list-style:none;margin:10px 0 0;padding:0}#cc-staff .cc-to-items li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-top:1px solid #F2F4F7}#cc-staff .cc-to-items small{color:#475467}',
      '#cc-staff .cc-to-note{margin:8px 0 0;background:#FFFAEB;border-radius:8px;padding:6px 10px}',
      '#cc-staff .cc-to-money{display:flex;gap:18px;flex-wrap:wrap;margin:10px 0 0;color:#344054}#cc-staff .cc-to-money .is-due{color:#B54708}#cc-staff .cc-to-money .is-paid{color:#067647;font-weight:700}',
      '#cc-staff .cc-to-meta{margin:6px 0 0;color:#475467;font-size:15px}',
      '#cc-staff .cc-to-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#cc-staff .cc-to-acts a.ccs-btn{text-decoration:none;display:inline-flex;align-items:center;justify-content:center}',
      '#cc-staff .cc-to-danger{color:#B42318!important;border-color:#FDA29B!important}#cc-staff .cc-to-dangerfill{background:#B42318!important;border-color:#B42318!important;color:#fff!important}',
      '#cc-staff .cc-to-panel{margin-top:12px;border:1px solid #C7D7E8;background:#F8FAFC;border-radius:12px;padding:12px 14px}#cc-staff .cc-to-panel h4{margin:0 0 8px;font-size:19px}#cc-staff .cc-to-panel p{margin:0 0 8px}',
      '#cc-staff .cc-to-panel .ccs-field{max-width:320px;margin-bottom:12px}',
      '#cc-staff .cc-to-warn{color:#B54708;font-weight:600}#cc-staff .cc-to-err{color:#B42318;font-weight:600;margin:10px 0 0}#cc-staff .cc-to-ok{color:#067647;font-weight:600;margin:0 0 12px}',
      '#cc-staff .cc-to-empty{color:#475467;padding:24px 0}',
      '#cc-staff .cc-to-form h3{margin:0;font-size:24px}#cc-staff .cc-to-lead{margin:4px 0 16px;color:#475467}',
      '#cc-staff .cc-to-form .ccs-label{display:block;margin:0 0 8px}#cc-staff .cc-to-later{max-width:280px;margin:0 0 16px}',
      '#cc-staff .cc-to-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:0 0 16px}',
      '#cc-staff .cc-to-pi{display:flex;align-items:center;gap:12px;border:1px solid #DCE3EB;border-radius:12px;padding:8px 10px}#cc-staff .cc-to-pi.is-off{opacity:.6}',
      '#cc-staff .cc-to-pi img,#cc-staff .cc-to-ph{width:56px;height:56px;border-radius:10px;object-fit:cover;background:#F2F4F7;flex:none}',
      '#cc-staff .cc-to-pt{flex:1 1 auto;min-width:0}#cc-staff .cc-to-pt b{display:block}#cc-staff .cc-to-pt small{display:block;color:#475467}#cc-staff .cc-to-pt em{display:block;font-style:normal;color:#B54708;font-weight:600}',
      '#cc-staff .cc-to-st{display:flex;align-items:center;gap:6px;flex:none}#cc-staff .cc-to-st button{width:48px;height:48px;border-radius:12px;border:1px solid #98A2B3;background:#fff;font-size:22px;cursor:pointer;color:#1D2939}#cc-staff .cc-to-st button:disabled{opacity:.35}#cc-staff .cc-to-st output{min-width:26px;text-align:center;font-weight:700}',
      '#cc-staff .cc-to-two{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}#cc-staff .cc-to-form .ccs-field{margin-bottom:14px}',
      '#cc-staff .cc-to-tab{margin-left:auto}',
      '@media (hover:none) and (pointer:coarse){#cc-staff .cc-to{font-size:20px}#cc-staff .cc-to-ref,#cc-staff .cc-to-meta,#cc-staff .cc-to-kpis span,#cc-staff .cc-to-pill,#cc-staff .cc-to-items small,#cc-staff .cc-to-pt small{font-size:17px}#cc-staff .cc-to-st button{width:56px;height:56px}#cc-staff .cc-to-dh h3{font-size:24px}#ccs-main .cc-to-banner p{font-size:18px}}',
      '@media (max-width:759px){#cc-staff .cc-to{font-size:18px}#cc-staff .cc-to-hd{padding:12px 16px;flex-wrap:wrap}#cc-staff .cc-to-hd h2{font-size:22px}#cc-staff .cc-to-hda{order:3;flex:1 1 100%}#cc-staff .cc-to-hda .ccs-btn{width:100%}#cc-staff .cc-to-body{padding:12px 16px 40px}#cc-staff .cc-to-ref,#cc-staff .cc-to-meta,#cc-staff .cc-to-kpis span,#cc-staff .cc-to-pill,#cc-staff .cc-to-items small,#cc-staff .cc-to-pt small{font-size:16px}#cc-staff .cc-to-kpis{grid-template-columns:repeat(2,1fr)}#cc-staff .cc-to-kpis b{font-size:22px}#cc-staff .cc-to-two{grid-template-columns:1fr}#cc-staff .cc-to-pick{grid-template-columns:1fr}#cc-staff .cc-to-st button{width:48px;height:48px}#cc-staff .cc-to-acts .ccs-btn{flex:1 1 calc(50% - 8px)}#cc-staff .cc-to-dh{top:-12px}}',
      // Type weight by device: phones lighter and smoothed; tablets a step heavier for arm's-length reading; computers unchanged
      '@media (max-width:759px){#cc-staff .cc-to,#ccs-main .cc-to-banner{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}#cc-staff .cc-to-hd h2,#cc-staff .cc-to-dh h3,#cc-staff .cc-to-form h3,#cc-staff .cc-to-who b,#cc-staff .cc-to-kpis b,#ccs-main .cc-to-banner h3{font-weight:600}#cc-staff .cc-to-time,#cc-staff .cc-to-pill,#cc-staff .cc-to-money b,#cc-staff .cc-to-items li b,#cc-staff .cc-to-pt b,#ccs-main .cc-to-banner p b{font-weight:600}#cc-staff .cc-to-ref,#cc-staff .cc-to-meta,#cc-staff .cc-to-items,#cc-staff .cc-to-dh p,#cc-staff .cc-to-kpis span{font-weight:400}}',
      '@media (min-width:760px) and (hover:none) and (pointer:coarse){#cc-staff .cc-to-ref,#cc-staff .cc-to-meta,#cc-staff .cc-to-items,#cc-staff .cc-to-dh p,#cc-staff .cc-to-kpis span,#cc-staff .cc-to-money,#cc-staff .cc-to-pt small,#cc-staff .cc-to-lead,#ccs-main .cc-to-banner p,#cc-staff .cc-to-note{font-weight:500}#cc-staff .cc-to-pt b,#cc-staff .cc-to-who b,#cc-staff .cc-to-dh h3{font-weight:700}}'
    ].join('\n');
    doc.head.appendChild(s);
  }

  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; try { css(); bannerUi(); settingsUi(); } catch (e) { warn('update', e); } }); }
  function start() {
    var r = root(); if (!r) return setTimeout(start, 300);
    new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) { var n = list[i].target; if (n && n.closest && n.closest('#cc-to,.cc-to-banner')) continue; return schedule(); } })
      .observe(r, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-screen'] });
    doc.addEventListener('click', onClick);
    doc.addEventListener('keydown', onKey, true);
    setInterval(function () { at = 0; if (B && !B.act && !B.form) load(true); else schedule(); }, 120000);
    schedule();
  }
  win.__ccTreatOrders = { open: openBoard, data: function () { return data; }, reload: function () { return load(true); } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
