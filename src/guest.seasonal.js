/* Corner Café website: seasonal treats (festive treats and other limited-time items), 26 October 2026.
 * Two parts: (1) a separate "Festive treats" module above the cake form, for treats on their own (a treat order, T-1001…);
 * (2) the add-on on the cake form's last step, below.
 * Loads before the order form. On the last step ("check and send") it shows the treats on sale for the customer's
 * pickup day, from the Service Hub (Settings > Seasonal items), with photo, size or pack, price and plus or minus.
 * The chosen treats are sent with the cake request; the database checks every price and rule and saves the cake and
 * treats together, or not at all. Counter only items never come to the website. Nothing shows when nothing is on sale.
 * If this file fails to load or errors, the order form works exactly as before. */
(function (win, doc) {
  'use strict';
  if (win.__ccoSeasonal20261026) return;
  win.__ccoSeasonal20261026 = true;
  var URL = 'https://ilbrfwxblhidtlsjgxlh.supabase.co', KEY = 'sb_publishable_4c9NdubC5PYevEOSMYH0ag_mv1LJ76E', TZ = 'Pacific/Fiji';
  var DRAFT = 'cco-draft-v2', CART = 'cco-treats-v1', PHONE = '+679 892 2760';
  var menu = null, setup = null, cart = {}, lastSent = null, removedNote = null, own = null, rootEl = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { n = Number(n || 0); return '$' + (Math.round(n * 100) % 100 ? n.toFixed(2) : String(Math.round(n))); }
  function today() { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()); }
  function addDays(iso, n) { var d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function nice(iso) { var d = new Date(iso + 'T12:00:00Z'); return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); }
  function warn(w, e) { try { console.warn('[Seasonal treats] ' + w, e); } catch (_) {} }
  function draft() { try { var d = JSON.parse(win.localStorage.getItem(DRAFT) || 'null'); return d && d.s ? d : null; } catch (_) { return null; } }
  function pickDate() { var d = draft(); return d && /^\d{4}-\d{2}-\d{2}$/.test(d.s.date || '') ? d.s.date : null; }
  function draftKey() { var d = draft(); return d ? d.key : null; }
  function saveCart() { try { win.localStorage.setItem(CART, JSON.stringify({ key: draftKey(), at: Date.now(), qty: cart })); } catch (_) {} }
  function loadCart() { try { var c = JSON.parse(win.localStorage.getItem(CART) || 'null'); if (c && c.qty && Date.now() - c.at < 864e5 && (!c.key || c.key === draftKey())) cart = c.qty; } catch (_) {} }
  function clearCart() { cart = {}; try { win.localStorage.removeItem(CART); } catch (_) {} }
  function items() { var out = []; ((menu && menu.groups) || []).forEach(function (g) { (g.items || []).forEach(function (i) { out.push(i); }); }); return out; }
  function byId(id) { return items().filter(function (i) { return i.id === id; })[0] || null; }
  function lines() { return Object.keys(cart).filter(function (k) { return cart[k] > 0 && byId(k); }).map(function (k) { return { id: k, quantity: cart[k] }; }); }
  function total() { return lines().reduce(function (s, l) { return s + Number(byId(l.id).price) * l.quantity; }, 0); }
  function why(it, date) {
    if (!date) return null;
    if (it.pickup_from && date < it.pickup_from) return 'Available for pickup from ' + nice(it.pickup_from);
    if (it.pickup_to && date > it.pickup_to) return 'Last pickup ' + nice(it.pickup_to);
    if ((it.blocked || []).indexOf(date) > -1 || (it.sold_out || []).indexOf(date) > -1) return 'Sold out for your pickup day';
    if (it.lead_days && date < addDays(today(), it.lead_days)) return 'Needs ' + it.lead_days + (it.lead_days === 1 ? " day's" : " days'") + ' notice';
    return null;
  }

  // ---------- send the treats with the cake request ----------
  function wrap(client) {
    if (!client || client.__ccoTreats || typeof client.rpc !== 'function') return client;
    var rpc = client.rpc;
    client.rpc = function (fn, args) {
      if (fn === 'submit_online_order' && args && args.p) {
        var l = lines(); lastSent = l.length ? l.map(function (x) { var it = byId(x.id); return { name: it.name, detail: it.detail, quantity: x.quantity, price: it.price }; }) : null;
        if (l.length) args = Object.assign({}, args, { p: Object.assign({}, args.p, { treats: l }) });
      }
      return rpc.call(this, fn, args);
    };
    client.__ccoTreats = true;
    return client;
  }
  function hook() {
    var sb = win.supabase; if (!sb || !sb.createClient || sb.createClient.__ccoTreats) return !!(sb && sb.createClient && sb.createClient.__ccoTreats);
    var orig = sb.createClient;
    var made = function () { return wrap(orig.apply(this, arguments)); };
    made.__ccoTreats = true; made.__orig = orig;
    sb.createClient = made;
    own = orig(URL, KEY, { auth: { persistSession: false } });
    return true;
  }
  if (win.__ccoMock) wrap(win.__ccoMock); else if (!hook()) warn('supabase-js was not ready, so treats are off', null);
  function db() { return win.__ccoMock || own; }

  // ---------- the treats on the last step ----------
  function load() {
    var c = db(); if (!c) return;
    c.rpc('get_order_setup', { p_location: 'corner-cafe' }).then(function (r) { if (r && r.data && r.data.location) { setup = r.data; if (r.data.location.phone) PHONE = r.data.location.phone; T.render(); } }, function () {});
    c.rpc('get_seasonal_menu', { p_channel: 'website' }).then(function (r) {
      if (r && !r.error && r.data && r.data.ok) { menu = r.data; loadCart(); schedule(); T.render(); }
    }, function (e) { warn('menu', e); });
  }
  function style() {
    if (doc.getElementById('cco-treats-style')) return;
    var s = doc.createElement('style'); s.id = 'cco-treats-style';
    s.textContent = [
      '#cc-cake-order .cco-tr{border:1px solid #e4e0da;border-radius:16px;background:#fff;padding:18px 18px 8px;margin:0 0 16px}',
      '#cc-cake-order .cco-tr h3{margin:0;font:700 20px/1.25 Causten,"Figtree",Arial,sans-serif;color:#282720;letter-spacing:-.01em}',
      '#cc-cake-order .cco-tr-sub{margin:4px 0 6px;color:#5a554d;font-size:15px;line-height:1.5}',
      '#cc-cake-order .cco-tr-it{display:flex;align-items:center;gap:14px;padding:12px 0;border-top:1px solid #efece7}',
      '#cc-cake-order .cco-tr-it:first-of-type{border-top:0}',
      '#cc-cake-order .cco-tr-ph{width:72px;height:72px;border-radius:12px;object-fit:cover;background:#f7f5f1;flex:none}',
      '#cc-cake-order .cco-tr-tx{flex:1 1 auto;min-width:0}',
      '#cc-cake-order .cco-tr-tx b{display:block;color:#282720;font-size:16px}',
      '#cc-cake-order .cco-tr-tx small{display:block;color:#69635b;font-size:14px;line-height:1.4}',
      '#cc-cake-order .cco-tr-tx em{display:block;font-style:normal;color:#9a4b12;font-size:14px;font-weight:600}',
      '#cc-cake-order .cco-tr-pr{font-weight:700;color:#282720;flex:none}',
      '#cc-cake-order .cco-tr-st{display:flex;align-items:center;gap:6px;flex:none}',
      '#cc-cake-order .cco-tr-st button{width:48px;height:48px;border-radius:12px;border:1px solid #cfc9bf;background:#fff;color:#282720;font-size:22px;line-height:1;cursor:pointer}',
      '#cc-cake-order .cco-tr-st button:hover:not(:disabled){border-color:#526f43;background:#f4f7f1}',
      '#cc-cake-order .cco-tr-st button:focus-visible{outline:3px solid #526f43;outline-offset:2px}',
      '#cc-cake-order .cco-tr-st button:disabled{opacity:.35;cursor:not-allowed}',
      '#cc-cake-order .cco-tr-st output{min-width:24px;text-align:center;font-weight:700;color:#282720}',
      '#cc-cake-order .cco-tr-it.is-off .cco-tr-ph,#cc-cake-order .cco-tr-it.is-off .cco-tr-tx b{opacity:.55}',
      '#cc-cake-order .cco-tr-sum{display:flex;justify-content:space-between;gap:12px;padding:12px 0 10px;border-top:1px solid #e4e0da;color:#46403a}',
      '#cc-cake-order .cco-tr-sum b{color:#282720}',
      '#cc-cake-order .cco-tr-note{color:#9a4b12;font-weight:600;font-size:14px;margin:6px 0}',
      '#cc-cake-order .cco-tr-done{border:1px solid #cad7c1;background:#f4f7f1;border-radius:14px;padding:14px 16px;margin:14px 0;color:#3f5d34}',
      '@media(max-width:520px){#cc-cake-order .cco-tr{padding:14px 14px 6px}#cc-cake-order .cco-tr-it{flex-wrap:wrap}#cc-cake-order .cco-tr-ph{width:56px;height:56px}#cc-cake-order .cco-tr-tx{flex-basis:calc(100% - 70px)}#cc-cake-order .cco-tr-st{margin-left:auto}}',
      '@media(prefers-reduced-motion:reduce){#cc-cake-order .cco-tr *{transition:none!important}}'
    ].join('\n');
    doc.head.appendChild(s);
  }
  var PAY = { pickup: 'Pay for them when you collect your cake.', deposit: 'We confirm them with your cake. A deposit secures your order.', full: 'We confirm them with your cake. Full payment secures your order.' };
  function html() {
    var date = pickDate(), groups = (menu && menu.groups) || [], h = '';
    groups.forEach(function (g) {
      h += '<h3>' + esc('Add ' + g.name.toLowerCase().replace(/^./, function (c) { return c; })) + '</h3>' +
        '<p class="cco-tr-sub">' + esc([g.message, PAY[g.payment]].filter(Boolean).join(' ')) + '</p>';
      (g.items || []).forEach(function (it) {
        var q = cart[it.id] || 0, w = why(it, date), mx = it.max || 20;
        h += '<div class="cco-tr-it' + (w && !q ? ' is-off' : '') + '">' + (it.image ? '<img class="cco-tr-ph" src="' + esc(it.image) + '" alt="' + esc(it.name) + '" loading="lazy">' : '<span class="cco-tr-ph" aria-hidden="true"></span>') +
          '<div class="cco-tr-tx"><b>' + esc(it.name) + '</b>' + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') + (w ? '<em>' + esc(w) + '</em>' : '') + '</div>' +
          '<span class="cco-tr-pr">' + money(it.price) + '</span>' +
          '<div class="cco-tr-st"><button type="button" data-cco-tr-minus="' + esc(it.id) + '" aria-label="Remove one ' + esc(it.name) + '"' + (q ? '' : ' disabled') + '>−</button>' +
          '<output aria-live="polite" aria-label="' + esc(it.name) + ' quantity">' + q + '</output>' +
          '<button type="button" data-cco-tr-plus="' + esc(it.id) + '" aria-label="Add one ' + esc(it.name) + '"' + (w || q >= mx ? ' disabled' : '') + '>+</button></div></div>';
      });
    });
    if (removedNote) h += '<p class="cco-tr-note" role="status">' + esc(removedNote) + '</p>';
    var t = total();
    h += '<div class="cco-tr-sum"><span>' + (t ? 'Treats added' : 'No treats added') + '</span><b>' + money(t) + '</b></div>';
    return h;
  }
  // Keep only treats that can still be collected on the chosen day
  function tidy() {
    var date = pickDate(), gone = [];
    Object.keys(cart).forEach(function (k) { var it = byId(k); if (cart[k] > 0 && (!it || why(it, date))) { gone.push(it ? it.name : 'An item'); delete cart[k]; } });
    if (gone.length) { removedNote = gone.join(', ') + (gone.length > 1 ? ' are' : ' is') + ' not available for your pickup day, so we took ' + (gone.length > 1 ? 'them' : 'it') + ' off.'; saveCart(); }
  }
  function totalLine(root) {
    var tot = root.querySelector('.cco-total'), t = total(), line = root.querySelector('.cco-tr-total');
    if (!t) { if (line) line.remove(); return; }
    if (!tot) return;
    var cake = null, s = tot.querySelector(':scope > strong') || tot.querySelector('.cco-price strong');
    if (s) cake = Number(String(s.textContent).replace(/[^\d.]/g, ''));
    var txt = cake ? '<span>Total with treats</span><b>' + money(cake + t) + '</b>' : '<span>Treats</span><b>' + money(t) + '</b>';
    if (!line) { line = doc.createElement('div'); line.className = 'cco-tr-sum cco-tr-total'; tot.parentNode.insertBefore(line, tot.nextSibling); }
    if (line.innerHTML !== txt) line.innerHTML = txt;
  }
  function run() {
    var root = rootEl || (rootEl = doc.getElementById('cc-cake-order')); if (!root) return;
    var done = root.querySelector('.cco-done');
    if (done) {
      if (lastSent && !done.querySelector('.cco-tr-done')) {
        var box = doc.createElement('div'); box.className = 'cco-tr-done';
        box.textContent = 'Also on your request: ' + lastSent.map(function (l) { return l.quantity + ' × ' + l.name; }).join(', ') + ' (' + money(lastSent.reduce(function (s, l) { return s + l.price * l.quantity; }, 0)) + ').';
        var after = done.querySelector('.cco-done-cake'); if (after) after.parentNode.insertBefore(box, after.nextSibling);
        clearCart();
      }
      return;
    }
    if (!menu || !items().length) return;
    if (!root.classList.contains('cco-at-review')) return;
    var send = root.querySelector('[data-act="send"]'); if (!send) return;
    var sec = root.querySelector('.cco-tr');
    tidy();
    var h = html();
    if (!sec) {
      sec = doc.createElement('section'); sec.className = 'cco-tr'; sec.setAttribute('aria-label', 'Add treats');
      var at = root.querySelector('.cco-total'); at = at ? at.parentNode === send.parentNode ? at : null : null;
      send.parentNode.insertBefore(sec, at || send);
    }
    if (sec.getAttribute('data-h') !== h) {
      var keep = doc.activeElement && sec.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-cco-tr-plus') ? '[data-cco-tr-plus="' + doc.activeElement.getAttribute('data-cco-tr-plus') + '"]' : '[data-cco-tr-minus="' + doc.activeElement.getAttribute('data-cco-tr-minus') + '"]' : null;
      sec.innerHTML = h; sec.setAttribute('data-h', h);
      var f = keep && sec.querySelector(keep); if (f) { if (f.disabled) { var o = f.parentNode.querySelector('button:not(:disabled)'); if (o) o.focus({ preventScroll: true }); } else f.focus({ preventScroll: true }); }
    }
    totalLine(root);
  }
  var queued = false;
  function schedule() { if (queued) return; queued = true; (win.requestAnimationFrame || setTimeout)(function () { queued = false; try { run(); } catch (e) { warn('show', e); } }); }
  function onClick(e) {
    var b = e.target && e.target.closest && e.target.closest('[data-cco-tr-plus],[data-cco-tr-minus]'); if (!b) return;
    var id = b.getAttribute('data-cco-tr-plus') || b.getAttribute('data-cco-tr-minus'), it = byId(id); if (!it) return;
    var q = cart[id] || 0;
    if (b.hasAttribute('data-cco-tr-plus')) { if (!why(it, pickDate()) && q < (it.max || 20)) q++; } else q = Math.max(0, q - 1);
    if (q) cart[id] = q; else delete cart[id];
    removedNote = null; saveCart(); schedule();
  }
  function start() {
    var root = doc.getElementById('cc-cake-order'); if (!root) return;
    rootEl = root; style(); T.mount(root); load();
    new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) { var t = list[i].target; if (t.closest && t.closest('.cco-tr')) continue; return schedule(); } }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    root.addEventListener('click', onClick);
  }
  // ---------- Festive treats on their own (no cake): a separate module above the cake form ----------
  // Roneel: "a separate module above the cakes section, so customers fill it and request, basic details with items,
  // leave the current cake form separate". Saved as a treat order (T-1001…) for the Treat orders board in the Service Hub.
  // Shows only while the section is On in the Service Hub and something is on sale; otherwise nothing is added to the page.
  var T = (function () {
    var KEYT = 'cct-draft-v1', host = null, st = null;
    function blank() { return { q: {}, open: false, day: null, time: null, name: '', phone: '', note: '', key: null, err: null, msg: null, done: null, sending: false }; }
    function load() { try { var d = JSON.parse(win.localStorage.getItem(KEYT) || 'null'); if (d && d.at && Date.now() - d.at < 3 * 864e5) { var b = blank(); ['q', 'open', 'day', 'time', 'name', 'phone', 'note', 'key'].forEach(function (k) { if (d[k] != null) b[k] = d[k]; }); return b; } } catch (_) {} return blank(); }
    function save() { try { if (st.done) win.localStorage.removeItem(KEYT); else win.localStorage.setItem(KEYT, JSON.stringify({ at: Date.now(), q: st.q, open: st.open, day: st.day, time: st.time, name: st.name, phone: st.phone, note: st.note, key: st.key })); } catch (_) {} }
    function uuid() { try { if (win.crypto && win.crypto.randomUUID) return win.crypto.randomUUID(); } catch (_) {} return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, function () { return (Math.random() * 16 | 0).toString(16); }); }
    function chosen() { return Object.keys(st.q).filter(function (k) { return st.q[k] > 0 && byId(k); }); }
    function count() { return chosen().reduce(function (a, k) { return a + st.q[k]; }, 0); }
    function sum() { return chosen().reduce(function (a, k) { return a + Number(byId(k).price) * st.q[k]; }, 0); }
    function loc() { return (setup && setup.location) || { collection_open: '09:00', collection_close: '21:00', slot_minutes: 60, max_days_ahead: 90 }; }
    function hm(t) { var p = String(t).split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
    function label(m) { var h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12; return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap; }
    function nowMins() { var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()).split(':'); return (+p[0]) * 60 + (+p[1]); }
    function shortDay(iso) { var d = new Date(iso + 'T12:00:00Z'); return { w: d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }), d: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) }; }
    function slots(day) {
      var L = loc(), out = [], step = L.slot_minutes || 60, a = hm(L.collection_open || '09:00'), b = hm(L.collection_close || '21:00'), cut = day === today() ? nowMins() : -1;
      for (var m = Math.ceil(a / step) * step; m <= b; m += step) if (m > cut) out.push(m);
      return out;
    }
    function dayOk(iso) {
      var closed = (setup && setup.closed_dates) || [];
      if (closed.indexOf(iso) > -1 || !slots(iso).length) return false;
      return chosen().every(function (k) { return !why(byId(k), iso); });
    }
    function days(n) {
      var L = loc(), lead = chosen().reduce(function (a, k) { return Math.max(a, byId(k).lead_days || 0); }, 0), out = [], d = addDays(today(), lead), last = addDays(today(), L.max_days_ahead || 90);
      while (d <= last && out.length < n) { if (dayOk(d)) out.push(d); d = addDays(d, 1); }
      return out;
    }
    function payLine(g) { return { pickup: 'Pay when you collect.', deposit: 'We will contact you to confirm and take a deposit.', full: 'We will contact you to confirm and take payment.' }[g && g.payment] || 'Pay when you collect.'; }
    function phoneOk(v) { var d = String(v || '').replace(/\D/g, ''); return d.length >= 7 && d.length <= 15; }
    function checkDay() {
      if (st.day && !dayOk(st.day)) { st.msg = 'Your pickup day was cleared because one of your treats is not available on ' + nice(st.day) + '. Please choose another day.'; st.day = null; st.time = null; }
      if (st.day && st.time != null && slots(st.day).indexOf(st.time) < 0) st.time = null;
    }
    function step(it) {
      var q = st.q[it.id] || 0, mx = it.max || 20, w = st.day ? why(it, st.day) : null, nm = esc(it.name);
      var pic = it.image ? '<img class="cct-ph" src="' + esc(it.image) + '" alt="' + nm + '" loading="lazy">' : '<span class="cct-ph" aria-hidden="true"></span>';
      var ctl = q ? '<div class="cct-st"><button type="button" data-cct-minus="' + esc(it.id) + '" aria-label="Remove one ' + nm + '">−</button><output aria-live="polite" aria-label="' + nm + ' quantity">' + q + '</output><button type="button" data-cct-plus="' + esc(it.id) + '" aria-label="Add one ' + nm + '"' + (q >= mx || w ? ' disabled' : '') + '>+</button></div>'
        : '<button type="button" class="cct-add" data-cct-plus="' + esc(it.id) + '"' + (w ? ' disabled' : '') + '>Add<span class="cct-sr"> ' + nm + '</span></button>';
      return '<div class="cct-card' + (q ? ' is-on' : '') + (w && !q ? ' is-off' : '') + '">' + pic + '<div class="cct-tx"><b>' + nm + '</b>' + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') + '<span class="cct-pr">' + money(it.price) + '</span>' + (w ? '<em>' + esc(w) + '</em>' : '') + '</div>' + ctl + '</div>';
    }
    function errFor(f) { return st.err && st.err.field === f ? '<p class="cct-err" id="cct-e-' + f + '">' + esc(st.err.message) + '</p>' : ''; }
    function details() {
      var dl = days(10), h = '<div class="cct-det" id="cct-det"><h3>Pickup and your details</h3>';
      h += '<div class="cct-f" role="group" aria-labelledby="cct-l-day"><p class="cct-l" id="cct-l-day">Pickup day</p>';
      if (!dl.length) h += '<p class="cct-msg">There are no pickup days for these treats together. Please remove one, or call us on <a href="tel:' + esc(String(PHONE).replace(/[^\d+]/g, '')) + '">' + esc(PHONE) + '</a>.</p>';
      else {
        if (st.day && dl.indexOf(st.day) < 0) dl.push(st.day);
        h += '<div class="cct-chips cct-days">' + dl.map(function (d) { var x = shortDay(d); return '<button type="button" class="cct-chip' + (st.day === d ? ' is-on' : '') + '" data-cct-day="' + d + '" aria-pressed="' + (st.day === d) + '"><span>' + (d === today() ? 'Today' : d === addDays(today(), 1) ? 'Tomorrow' : x.w) + '</span><b>' + x.d + '</b></button>'; }).join('') + '</div>';
        var L = loc(), first = days(1)[0];
        h += '<label class="cct-later">Or pick another day <input type="date" data-cct-k="dayin" min="' + (first || today()) + '" max="' + addDays(today(), L.max_days_ahead || 90) + '" value="' + (st.day || '') + '"></label>';
      }
      h += errFor('date') + '</div>';
      if (st.day) {
        var sl = slots(st.day);
        h += '<div class="cct-f" role="group" aria-labelledby="cct-l-time"><p class="cct-l" id="cct-l-time">Pickup time on ' + esc(nice(st.day)) + '</p><div class="cct-chips cct-times">' +
          sl.map(function (m) { return '<button type="button" class="cct-chip' + (st.time === m ? ' is-on' : '') + '" data-cct-time="' + m + '" aria-pressed="' + (st.time === m) + '">' + label(m) + '</button>'; }).join('') + '</div>' + errFor('time') + '</div>';
      }
      h += '<div class="cct-two"><label class="cct-f"><span class="cct-l">Your name</span><input type="text" data-cct-k="name" autocomplete="name" maxlength="120" value="' + esc(st.name) + '"' + (st.err && st.err.field === 'name' ? ' aria-invalid="true" aria-describedby="cct-e-name"' : '') + '>' + errFor('name') + '</label>' +
        '<label class="cct-f"><span class="cct-l">Mobile number</span><input type="tel" data-cct-k="phone" autocomplete="tel" inputmode="tel" maxlength="20" placeholder="For example 912 3456" value="' + esc(st.phone) + '"' + (st.err && st.err.field === 'phone' ? ' aria-invalid="true" aria-describedby="cct-e-phone"' : '') + '>' + errFor('phone') + '</label></div>';
      h += '<label class="cct-f"><span class="cct-l">Note <i>(optional)</i></span><textarea data-cct-k="note" rows="2" maxlength="300" placeholder="For example, gift wrap or a name tag">' + esc(st.note) + '</textarea></label>';
      if (st.err && ['date', 'time', 'name', 'phone'].indexOf(st.err.field) < 0) h += '<p class="cct-err" role="alert">' + esc(st.err.message) + '</p>';
      h += '<button type="button" class="cct-send" data-cct="send"' + (st.sending ? ' disabled' : '') + '>' + (st.sending ? 'Sending…' : 'Send treat request · ' + money(sum())) + '</button>';
      h += '<p class="cct-fine">We will confirm by phone or WhatsApp. ' + esc(payLine((menu.groups || [])[0])) + '</p></div>';
      return h;
    }
    function doneHtml() {
      var d = st.done;
      return '<div class="cct-done" role="status" tabindex="-1"><p class="cct-k">Request received</p><h2>Thank you, ' + esc(d.name.split(' ')[0]) + '.</h2>' +
        '<p>Your reference is <b>' + esc(d.ref) + '</b>. We will confirm your treats by phone or WhatsApp. ' + esc(d.pay) + '</p>' +
        '<ul>' + d.lines.map(function (l) { return '<li><span>' + l.q + ' × ' + esc(l.name) + '</span><b>' + money(l.price * l.q) + '</b></li>'; }).join('') + '<li class="cct-tot"><span>Total</span><b>' + money(d.total) + '</b></li></ul>' +
        '<p>Pickup: <b>' + esc(nice(d.day)) + ', ' + label(d.time) + '</b> at Corner Café' + (setup && setup.location && setup.location.address ? ', ' + esc(setup.location.address) : '') + '.</p>' +
        '<button type="button" class="cct-ghost" data-cct="again">Order more treats</button></div>';
    }
    function html() {
      var g = (menu.groups || []), title = g.length === 1 ? g[0].name : 'Seasonal treats', h = '<div class="cct-in">';
      if (st.done) return h + doneHtml() + '</div>';
      h += '<div class="cct-head"><p class="cct-k">Now available</p><h2 id="cct-title">' + esc(title) + '</h2><p class="cct-sub">' + esc([g.length === 1 ? g[0].message : '', 'Order them on their own, no cake needed.'].filter(Boolean).join(' ')) + '</p></div>';
      h += '<div class="cct-grid">' + items().map(step).join('') + '</div>';
      var n = count();
      if (st.msg) h += '<p class="cct-msg" role="status">' + esc(st.msg) + '</p>';
      if (n && !st.open) h += '<div class="cct-bar"><span><b>' + n + ' treat' + (n > 1 ? 's' : '') + '</b> · ' + money(sum()) + '</span><button type="button" class="cct-send" data-cct="next">Continue</button></div>';
      if (n && st.open) h += details();
      if (!n) h += '<p class="cct-fine">Ordering a cake too? Use the cake form below and add treats at the last step.</p>';
      return h + '</div>';
    }
    function render(focusSel) {
      if (!host) return;
      var has = menu && items().length;
      if (!has && !st.done) { host.hidden = true; return; }
      if (!st.done) checkDay();
      var a = doc.activeElement, keep = focusSel || (a && host.contains(a) ? keyOf(a) : null), h = html();
      host.hidden = false;
      if (host.getAttribute('data-h') === h) return;
      host.innerHTML = h; host.setAttribute('data-h', h);
      if (keep) { var f = host.querySelector(keep); if (f && f.disabled) f = f.parentNode.querySelector('button:not(:disabled)'); if (f) f.focus({ preventScroll: true }); }
    }
    function keyOf(el) {
      var at = ['data-cct-plus', 'data-cct-minus', 'data-cct-day', 'data-cct-time', 'data-cct-k', 'data-cct'];
      for (var i = 0; i < at.length; i++) if (el.hasAttribute(at[i])) return '[' + at[i] + '="' + el.getAttribute(at[i]) + '"]';
      return null;
    }
    function fail(field, message) { st.err = { field: field, message: message }; render(); var f = host.querySelector(field === 'date' ? '.cct-days button, [data-cct-k="dayin"]' : field === 'time' ? '.cct-times button' : '[data-cct-k="' + field + '"]'); if (f) { f.focus({ preventScroll: true }); try { f.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {} } }
    function send() {
      if (st.sending) return;
      st.err = null;
      if (!count()) return fail('treats', 'Choose at least one treat.');
      if (!st.day) return fail('date', 'Choose a pickup day.');
      if (st.time == null) return fail('time', 'Choose a pickup time.');
      if (String(st.name).trim().length < 2) return fail('name', 'Enter your name.');
      if (!phoneOk(st.phone)) return fail('phone', 'Enter a mobile number, for example 912 3456.');
      var c = db(); if (!c) return fail('send', 'We could not reach the café. Please call us on ' + PHONE + '.');
      st.key = st.key || uuid(); st.sending = true; save(); render();
      var lines = chosen().map(function (k) { return { id: k, quantity: st.q[k] }; }), mm = st.time, hhmm = (Math.floor(mm / 60) < 10 ? '0' : '') + Math.floor(mm / 60) + ':' + (mm % 60 < 10 ? '0' : '') + (mm % 60);
      var snap = { name: String(st.name).trim(), day: st.day, time: st.time, total: sum(), pay: payLine((menu.groups || [])[0]), lines: chosen().map(function (k) { var it = byId(k); return { name: it.name, price: Number(it.price), q: st.q[k] }; }) };
      c.rpc('submit_treat_order', { p: { date: st.day, time: hhmm, name: snap.name, phone: String(st.phone).trim(), note: String(st.note || '').trim(), treats: lines, idempotency_key: st.key } }).then(function (r) {
        st.sending = false;
        var d = r && r.data;
        if (r && r.error) { fail('send', 'We could not send your request. Please check your connection and try again.'); return; }
        if (!d || !d.ok) { fail(d && d.field && ['date', 'time', 'name', 'phone'].indexOf(d.field) > -1 ? d.field : 'send', (d && d.message) || 'Something went wrong. Please try again.'); return; }
        snap.ref = d.reference; snap.total = d.total != null ? Number(d.total) : snap.total;
        st = blank(); st.done = snap; save(); render();
        var box = host.querySelector('.cct-done'); if (box) { box.focus({ preventScroll: true }); try { host.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) {} }
      }, function () { st.sending = false; fail('send', 'We could not send your request. Please check your connection and try again.'); });
    }
    function click(e) {
      var b = e.target.closest && e.target.closest('button'); if (!b || !host.contains(b) || b.disabled) return;
      var id;
      if ((id = b.getAttribute('data-cct-plus'))) { var it = byId(id); if (it && (st.q[id] || 0) < (it.max || 20)) st.q[id] = (st.q[id] || 0) + 1; st.msg = null; }
      else if ((id = b.getAttribute('data-cct-minus'))) { st.q[id] = Math.max(0, (st.q[id] || 0) - 1); if (!st.q[id]) delete st.q[id]; st.msg = null; }
      else if (b.hasAttribute('data-cct-day')) { st.day = b.getAttribute('data-cct-day'); st.time = null; st.msg = null; if (st.err && st.err.field === 'date') st.err = null; }
      else if (b.hasAttribute('data-cct-time')) { st.time = +b.getAttribute('data-cct-time'); if (st.err && st.err.field === 'time') st.err = null; }
      else if (b.getAttribute('data-cct') === 'next') { st.open = true; st.key = st.key || uuid(); save(); render(); var t = host.querySelector('#cct-det'); if (t) { try { t.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) {} var f = t.querySelector('.cct-days button'); if (f) f.focus({ preventScroll: true }); } return; }
      else if (b.getAttribute('data-cct') === 'send') { send(); return; }
      else if (b.getAttribute('data-cct') === 'again') { st = blank(); save(); render(); var g = host.querySelector('.cct-grid button'); if (g) g.focus({ preventScroll: true }); return; }
      else return;
      save(); render();
    }
    function input(e) {
      var k = e.target.getAttribute && e.target.getAttribute('data-cct-k'); if (!k) return;
      if (k === 'dayin') {
        if (e.type !== 'change') return;
        var v = e.target.value;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
          if (dayOk(v) && v >= (days(1)[0] || '9')) { st.day = v; st.time = null; st.err = null; st.msg = null; }
          else st.err = { field: 'date', message: nice(v) + ' is not available for these treats. Please choose another day.' };
          save(); render('[data-cct-k="dayin"]');
        }
        return;
      }
      st[k] = e.target.value;
      if (st.err && st.err.field === k) { st.err = null; var er = host.querySelector('#cct-e-' + k); if (er) er.remove(); e.target.removeAttribute('aria-invalid'); host.setAttribute('data-h', ''); }
      save();
    }
    function css() {
      if (doc.getElementById('cct-style')) return;
      var P = '#cc-treat-order', s = doc.createElement('style'); s.id = 'cct-style';
      s.textContent = [
        P + '{box-sizing:border-box;max-width:100%;margin:0 0 28px;font-family:Causten,"Figtree",Arial,sans-serif;color:#282720}',
        P + ' *{box-sizing:border-box}',
        P + ' .cct-in{border:1px solid #e4e0da;border-radius:18px;background:#fff;padding:22px 22px 18px;min-width:0;overflow:hidden}',
        P + ' .cct-k{margin:0;font:700 12px/1.4 Causten,"Figtree",Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#526f43}',
        P + ' h2{margin:2px 0 0;font:700 26px/1.2 Causten,"Figtree",Arial,sans-serif;letter-spacing:-.01em;color:#282720}',
        P + ' h3{margin:0 0 12px;font:700 20px/1.25 Causten,"Figtree",Arial,sans-serif;color:#282720}',
        P + ' .cct-sub{margin:6px 0 0;color:#5a554d;font-size:16px;line-height:1.5}',
        P + ' .cct-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:12px;margin-top:16px;min-width:0}',
        P + ' .cct-card{display:flex;flex-direction:column;gap:8px;background:#fff;border:1px solid #e4e0da;border-radius:14px;padding:8px 8px 10px;min-width:0}',
        P + ' .cct-card.is-on{border-color:#526f43;box-shadow:0 0 0 1px #526f43}',
        P + ' .cct-card.is-off .cct-ph{opacity:.5}',
        P + ' .cct-ph{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:10px;background:#f1eee9}',
        P + ' .cct-tx b{display:block;font-size:16px;line-height:1.3;color:#282720}',
        P + ' .cct-tx small{display:block;color:#69635b;font-size:14px;line-height:1.35}',
        P + ' .cct-tx em{display:block;font-style:normal;color:#9a4b12;font-size:14px;font-weight:600;line-height:1.35;margin-top:2px}',
        P + ' .cct-pr{display:block;margin-top:4px;font-weight:700}',
        P + ' button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}',
        P + ' button:focus-visible,' + P + ' input:focus-visible,' + P + ' textarea:focus-visible{outline:3px solid #526f43;outline-offset:2px}',
        P + ' .cct-add{min-height:48px;margin-top:auto;border-radius:12px;border:1px solid #526f43;background:#fff;color:#3f5d34;font-weight:700;font-size:16px}',
        P + ' .cct-add:hover:not(:disabled){background:#f4f7f1}',
        P + ' button:disabled{opacity:.4;cursor:not-allowed}',
        P + ' .cct-st{display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:auto}',
        P + ' .cct-st button{width:48px;height:48px;border-radius:12px;border:1px solid #cfc9bf;background:#fff;color:#282720;font-size:22px;line-height:1}',
        P + ' .cct-st output{min-width:24px;text-align:center;font-weight:700;font-size:18px}',
        P + ' .cct-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
        P + ' .cct-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding:12px 14px;border-radius:14px;background:#f4f7f1;border:1px solid #cad7c1;font-size:17px}',
        P + ' .cct-send{min-height:52px;padding:0 24px;border:0;border-radius:12px;background:#526f43;color:#fff;font-weight:700;font-size:17px}',
        P + ' .cct-send:hover:not(:disabled){background:#3f5d34}',
        P + ' .cct-ghost{min-height:48px;padding:0 20px;border-radius:12px;border:1px solid #526f43;background:#fff;color:#3f5d34;font-weight:700;font-size:16px}',
        P + ' .cct-det{margin-top:18px;padding-top:18px;border-top:1px solid #e4e0da;scroll-margin-top:90px}',
        P + ' .cct-det .cct-send{width:100%;margin-top:6px}',
        P + ' .cct-f{display:block;margin:0 0 14px;min-width:0}',
        P + ' .cct-l{display:block;margin:0 0 6px;font-weight:700;font-size:16px;color:#282720}',
        P + ' .cct-l i{font-style:normal;font-weight:400;color:#69635b}',
        P + ' .cct-chips{display:flex;flex-wrap:wrap;gap:8px}',
        P + ' .cct-chip{min-height:48px;min-width:72px;padding:6px 14px;border-radius:12px;border:1px solid #cfc9bf;background:#fff;color:#282720;font-size:16px;font-weight:600;line-height:1.2}',
        P + ' .cct-days .cct-chip{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:84px}',
        P + ' .cct-days .cct-chip span{font-size:13px;font-weight:600;color:#69635b}',
        P + ' .cct-chip:hover{border-color:#526f43}',
        P + ' .cct-chip.is-on{background:#eef3ea;border-color:#526f43;color:#2f4727;box-shadow:0 0 0 1px #526f43}',
        P + ' .cct-chip.is-on span{color:#2f4727}',
        P + ' .cct-later{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin-top:10px;color:#46403a;font-size:15px}',
        P + ' input,' + P + ' textarea{width:100%;min-height:52px;padding:12px 14px;border:1px solid #cfc9bf;border-radius:12px;background:#fff;color:#282720;font-size:16px;line-height:1.4;font-family:inherit}',
        P + ' .cct-later input{width:auto;min-width:180px}',
        P + ' textarea{min-height:72px;resize:vertical}',
        P + ' [aria-invalid="true"]{border-color:#b42318}',
        P + ' .cct-two{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}',
        P + ' .cct-err{margin:6px 0 0;color:#b42318;font-weight:600;font-size:15px}',
        P + ' .cct-msg{margin:12px 0 0;color:#9a4b12;font-weight:600;font-size:15px;line-height:1.45}',
        P + ' .cct-msg a,' + P + ' .cct-fine a{color:#3f5d34;font-weight:700}',
        P + ' .cct-fine{margin:12px 0 0;color:#5a554d;font-size:15px;line-height:1.5}',
        P + ' .cct-done{outline:none}',
        P + ' .cct-done p{font-size:17px;line-height:1.5;color:#46403a;margin:10px 0}',
        P + ' .cct-done ul{list-style:none;margin:12px 0;padding:0;border-top:1px solid #efece7}',
        P + ' .cct-done li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #efece7;font-size:17px}',
        P + ' .cct-done .cct-tot{font-weight:700}',
        '@media(max-width:620px){' + P + ' .cct-two{grid-template-columns:1fr}}',
        '@media(max-width:520px){' + P + ' .cct-in{padding:18px 14px 14px;border-radius:16px}' + P + ' h2{font-size:23px}' + P + ' .cct-grid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:10px;padding-bottom:6px;margin-right:-14px;padding-right:14px}' + P + ' .cct-card{flex:0 0 168px;scroll-snap-align:start}' + P + ' .cct-bar{position:sticky;bottom:10px;z-index:5;box-shadow:0 6px 20px rgba(40,39,32,.12)}' + P + ' .cct-days{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px}' + P + ' .cct-days .cct-chip{flex:0 0 auto}' + P + ' .cct-later input{width:100%}}',
        // Type weight by device: phones lighter and smoothed for small sharp screens; tablets a step heavier for arm's-length reading
        '@media (max-width:759px){' + P + '{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}' + P + ' .cct-sub,' + P + ' .cct-fine,' + P + ' .cct-tx small,' + P + ' input,' + P + ' textarea{font-weight:400}' + P + ' h2{font-weight:650}' + P + ' h3,' + P + ' .cct-tx b,' + P + ' .cct-pr,' + P + ' .cct-l,' + P + ' .cct-add,' + P + ' .cct-send,' + P + ' .cct-ghost,' + P + ' .cct-chip,' + P + ' .cct-done li b,' + P + ' .cct-done p b{font-weight:600}' + P + ' .cct-days .cct-chip span{font-weight:500}}',
        '@media (min-width:760px) and (hover:none) and (pointer:coarse){' + P + ' .cct-sub,' + P + ' .cct-fine,' + P + ' .cct-tx small,' + P + ' .cct-done p,' + P + ' .cct-later,' + P + ' input,' + P + ' textarea{font-weight:500}' + P + ' .cct-tx b,' + P + ' .cct-chip,' + P + ' .cct-l{font-weight:700}' + P + ' .cct-days .cct-chip span{font-weight:600}}',
        '@media(prefers-reduced-motion:reduce){' + P + ' *{scroll-behavior:auto!important;transition:none!important}}'
      ].join('\n');
      doc.head.appendChild(s);
    }
    return {
      mount: function (root) {
        if (host || !root || !root.parentNode) return;
        st = load(); css();
        host = doc.createElement('section'); host.id = 'cc-treat-order'; host.hidden = true; host.setAttribute('aria-labelledby', 'cct-title');
        root.parentNode.insertBefore(host, root);
        host.addEventListener('click', click); host.addEventListener('input', input); host.addEventListener('change', input);
      },
      render: function () { try { render(); } catch (e) { warn('treat order', e); } },
      state: function () { return st; }
    };
  })();

  win.__ccoSeasonal = { treatOrder: function () { return T.state(); }, cart: function () { return cart; }, menu: function () { return menu; } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(window, document);
